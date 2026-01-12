using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PMS.API.Data;
using PMS.API.Models;

namespace PMS.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class TicketsController : ControllerBase
    {
        private readonly PmsDbContext _context;

        public TicketsController(PmsDbContext context)
        {
            _context = context;
        }

        private int GetCurrentUserId() => int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
        private string GetCurrentUserRole() => User.FindFirst(ClaimTypes.Role)?.Value ?? "";

        /// <summary>
        /// Get all tickets (Admin sees all, Developer sees assigned, EndUser sees created)
        /// </summary>
        [HttpGet]
        public async Task<ActionResult<IEnumerable<TicketDto>>> GetTickets()
        {
            var userId = GetCurrentUserId();
            var userRole = GetCurrentUserRole();

            IQueryable<Ticket> query = _context.Tickets
                .Include(t => t.Project)
                .Include(t => t.AssignedDeveloper)
                .Include(t => t.CreatedByUser);

            // Role-based filtering - THIS ENFORCES THE CORE BUSINESS RULE
            if (userRole == "Admin")
            {
                // Admin sees all tickets
            }
            else if (userRole == "Developer")
            {
                // Developer sees ONLY assigned tickets (no spam!)
                query = query.Where(t => t.AssignedDeveloperId == userId);
            }
            else
            {
                // EndUser sees only tickets they created
                query = query.Where(t => t.CreatedByUserId == userId);
            }

            var tickets = await query
                .OrderByDescending(t => t.CreatedAt)
                .Select(t => MapToTicketDto(t))
                .ToListAsync();

            return Ok(tickets);
        }

        /// <summary>
        /// Get ticket by ID (with role-based access check)
        /// </summary>
        [HttpGet("{id}")]
        public async Task<ActionResult<TicketDto>> GetTicket(int id)
        {
            var userId = GetCurrentUserId();
            var userRole = GetCurrentUserRole();

            var ticket = await _context.Tickets
                .Include(t => t.Project)
                .Include(t => t.AssignedDeveloper)
                .Include(t => t.CreatedByUser)
                .FirstOrDefaultAsync(t => t.Id == id);

            if (ticket == null)
                return NotFound(new { message = "Ticket not found" });

            // Access check
            if (userRole == "Developer" && ticket.AssignedDeveloperId != userId)
                return Forbid();
            if (userRole == "EndUser" && ticket.CreatedByUserId != userId)
                return Forbid();

            return Ok(MapToTicketDto(ticket));
        }

        /// <summary>
        /// Create a new ticket (EndUsers and Admins can create)
        /// Status defaults to Open, timestamps recorded
        /// </summary>
        [HttpPost]
        [Authorize(Roles = "EndUser,Admin")]
        public async Task<ActionResult<TicketDto>> CreateTicket([FromBody] CreateTicketDto dto)
        {
            var userId = GetCurrentUserId();

            var project = await _context.Projects.FindAsync(dto.ProjectId);
            if (project == null || !project.IsActive)
                return BadRequest(new { message = "Project not found or inactive" });

            if (!Enum.TryParse<TicketType>(dto.Type, true, out var ticketType))
                return BadRequest(new { message = "Invalid ticket type. Valid: Bug, Feature" });

            if (!Enum.TryParse<TicketPriority>(dto.Priority, true, out var priority))
                return BadRequest(new { message = "Invalid priority. Valid: Low, Medium, High, Critical" });

            var now = DateTime.UtcNow;
            var ticket = new Ticket
            {
                Title = dto.Title,
                Description = dto.Description,
                Type = ticketType,
                Priority = priority,
                Status = TicketStatus.Open, // Always starts Open
                ProjectId = dto.ProjectId,
                CreatedByUserId = userId,
                CreatedAt = now,
                UpdatedAt = now
            };

            _context.Tickets.Add(ticket);
            await _context.SaveChangesAsync();

            // Record history
            await AddHistory(ticket.Id, TicketAction.Created, null, "Open", "Ticket created", userId);

            return Ok(new { message = "Ticket created successfully", ticketId = ticket.Id });
        }

        /// <summary>
        /// Assign ticket to developer (Admin only)
        /// Changes status to InProgress, records assignment time
        /// </summary>
        [HttpPatch("{id}/assign")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> AssignTicket(int id, [FromBody] AssignTicketDto dto)
        {
            var userId = GetCurrentUserId();
            var ticket = await _context.Tickets.FindAsync(id);
            
            if (ticket == null)
                return NotFound(new { message = "Ticket not found" });

            if (ticket.Status == TicketStatus.Closed)
                return BadRequest(new { message = "Cannot assign a closed ticket" });

            var developer = await _context.Users.FindAsync(dto.DeveloperId);
            if (developer == null || developer.Role != UserRole.Developer || !developer.IsActive)
                return BadRequest(new { message = "Invalid or inactive developer" });

            var oldDeveloper = ticket.AssignedDeveloperId;
            var now = DateTime.UtcNow;

            ticket.AssignedDeveloperId = dto.DeveloperId;
            ticket.AssignedAt = now;
            ticket.UpdatedAt = now;
            
            // If first assignment, move to InProgress
            if (ticket.Status == TicketStatus.Open)
            {
                ticket.Status = TicketStatus.InProgress;
                ticket.InProgressAt = now;
            }

            await _context.SaveChangesAsync();

            // Record history
            var action = oldDeveloper == null ? TicketAction.Assigned : TicketAction.Reassigned;
            await AddHistory(ticket.Id, action, oldDeveloper?.ToString(), dto.DeveloperId.ToString(), 
                $"Assigned to {developer.Name}", userId);

            return Ok(new { message = "Ticket assigned successfully" });
        }

        /// <summary>
        /// Update ticket status (Developer can resolve, Admin can do anything)
        /// Enforces valid status transitions
        /// </summary>
        [HttpPatch("{id}/status")]
        [Authorize(Roles = "Developer,Admin")]
        public async Task<IActionResult> UpdateTicketStatus(int id, [FromBody] UpdateTicketStatusDto dto)
        {
            var userId = GetCurrentUserId();
            var userRole = GetCurrentUserRole();

            var ticket = await _context.Tickets.FindAsync(id);
            if (ticket == null)
                return NotFound(new { message = "Ticket not found" });

            // Developers can only update their assigned tickets
            if (userRole == "Developer" && ticket.AssignedDeveloperId != userId)
                return Forbid();

            if (!Enum.TryParse<TicketStatus>(dto.Status, true, out var newStatus))
                return BadRequest(new { message = "Invalid status. Valid: Open, InProgress, Resolved, Closed" });

            // Validate status transitions
            var validationResult = ValidateStatusTransition(ticket.Status, newStatus, userRole);
            if (!validationResult.IsValid)
                return BadRequest(new { message = validationResult.Message });

            var oldStatus = ticket.Status;
            var now = DateTime.UtcNow;

            ticket.Status = newStatus;
            ticket.UpdatedAt = now;

            // Set lifecycle timestamps
            switch (newStatus)
            {
                case TicketStatus.InProgress:
                    ticket.InProgressAt ??= now;
                    break;
                case TicketStatus.Resolved:
                    ticket.ResolvedAt = now;
                    break;
                case TicketStatus.Closed:
                    ticket.ClosedAt = now;
                    break;
            }

            await _context.SaveChangesAsync();
            await AddHistory(ticket.Id, TicketAction.StatusChanged, oldStatus.ToString(), newStatus.ToString(), 
                dto.Comments, userId);

            return Ok(new { message = "Ticket status updated successfully" });
        }

        /// <summary>
        /// Reassign ticket to another developer (Admin only)
        /// </summary>
        [HttpPatch("{id}/reassign")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> ReassignTicket(int id, [FromBody] AssignTicketDto dto)
        {
            var userId = GetCurrentUserId();
            var ticket = await _context.Tickets
                .Include(t => t.AssignedDeveloper)
                .FirstOrDefaultAsync(t => t.Id == id);
            
            if (ticket == null)
                return NotFound(new { message = "Ticket not found" });

            if (ticket.Status == TicketStatus.Closed)
                return BadRequest(new { message = "Cannot reassign a closed ticket" });

            var newDeveloper = await _context.Users.FindAsync(dto.DeveloperId);
            if (newDeveloper == null || newDeveloper.Role != UserRole.Developer || !newDeveloper.IsActive)
                return BadRequest(new { message = "Invalid or inactive developer" });

            var oldDeveloperName = ticket.AssignedDeveloper?.Name ?? "Unassigned";
            var now = DateTime.UtcNow;

            ticket.AssignedDeveloperId = dto.DeveloperId;
            ticket.UpdatedAt = now;

            await _context.SaveChangesAsync();
            await AddHistory(ticket.Id, TicketAction.Reassigned, oldDeveloperName, newDeveloper.Name, 
                "Ticket reassigned", userId);

            return Ok(new { message = "Ticket reassigned successfully" });
        }

        /// <summary>
        /// Close a ticket (Admin only)
        /// </summary>
        [HttpPatch("{id}/close")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> CloseTicket(int id, [FromBody] CloseTicketDto? dto = null)
        {
            var userId = GetCurrentUserId();
            var ticket = await _context.Tickets.FindAsync(id);
            
            if (ticket == null)
                return NotFound(new { message = "Ticket not found" });

            if (ticket.Status == TicketStatus.Closed)
                return BadRequest(new { message = "Ticket is already closed" });

            var oldStatus = ticket.Status;
            var now = DateTime.UtcNow;

            ticket.Status = TicketStatus.Closed;
            ticket.ClosedAt = now;
            ticket.UpdatedAt = now;

            await _context.SaveChangesAsync();
            await AddHistory(ticket.Id, TicketAction.Closed, oldStatus.ToString(), "Closed", 
                dto?.Comments ?? "Ticket closed by admin", userId);

            return Ok(new { message = "Ticket closed successfully" });
        }

        /// <summary>
        /// Get ticket history/audit trail
        /// </summary>
        [HttpGet("{id}/history")]
        public async Task<ActionResult<IEnumerable<TicketHistoryDto>>> GetTicketHistory(int id)
        {
            var userId = GetCurrentUserId();
            var userRole = GetCurrentUserRole();

            var ticket = await _context.Tickets.FindAsync(id);
            if (ticket == null)
                return NotFound(new { message = "Ticket not found" });

            // Access check
            if (userRole == "Developer" && ticket.AssignedDeveloperId != userId)
                return Forbid();
            if (userRole == "EndUser" && ticket.CreatedByUserId != userId)
                return Forbid();

            var history = await _context.TicketHistories
                .Where(h => h.TicketId == id)
                .Include(h => h.ChangedByUser)
                .OrderByDescending(h => h.ChangedAt)
                .Select(h => new TicketHistoryDto
                {
                    Id = h.Id,
                    Action = h.Action.ToString(),
                    OldValue = h.OldValue,
                    NewValue = h.NewValue,
                    Comments = h.Comments,
                    ChangedByUserId = h.ChangedByUserId,
                    ChangedByUserName = h.ChangedByUser.Name,
                    ChangedAt = h.ChangedAt
                })
                .ToListAsync();

            return Ok(history);
        }

        // Helper: Validate status transitions
        private (bool IsValid, string Message) ValidateStatusTransition(TicketStatus current, TicketStatus next, string userRole)
        {
            // Admin can do any transition
            if (userRole == "Admin")
                return (true, "");

            // Developer restrictions
            if (userRole == "Developer")
            {
                // Developer can only: InProgress -> Resolved
                if (current == TicketStatus.Open)
                    return (false, "Developer cannot change Open tickets. Wait for assignment.");
                    
                if (current == TicketStatus.InProgress && next == TicketStatus.Resolved)
                    return (true, "");
                    
                if (current == TicketStatus.Resolved)
                    return (false, "Cannot change status of resolved ticket. Admin must close or reopen.");
                    
                if (current == TicketStatus.Closed)
                    return (false, "Cannot modify closed tickets");

                return (false, $"Invalid transition from {current} to {next}");
            }

            return (false, "Unauthorized to change status");
        }

        // Helper: Add history record
        private async Task AddHistory(int ticketId, TicketAction action, string? oldValue, string? newValue, string? comments, int userId)
        {
            var history = new TicketHistory
            {
                TicketId = ticketId,
                Action = action,
                OldValue = oldValue,
                NewValue = newValue,
                Comments = comments,
                ChangedByUserId = userId,
                ChangedAt = DateTime.UtcNow
            };
            _context.TicketHistories.Add(history);
            await _context.SaveChangesAsync();
        }

        // Helper: Map to DTO
        private static TicketDto MapToTicketDto(Ticket t) => new()
        {
            Id = t.Id,
            Title = t.Title,
            Description = t.Description,
            Type = t.Type.ToString(),
            Status = t.Status.ToString(),
            Priority = t.Priority.ToString(),
            ProjectId = t.ProjectId,
            ProjectName = t.Project.Name,
            AssignedDeveloperId = t.AssignedDeveloperId,
            AssignedDeveloperName = t.AssignedDeveloper?.Name,
            CreatedByUserId = t.CreatedByUserId,
            CreatedByUserName = t.CreatedByUser.Name,
            CreatedAt = t.CreatedAt,
            UpdatedAt = t.UpdatedAt,
            AssignedAt = t.AssignedAt,
            InProgressAt = t.InProgressAt,
            ResolvedAt = t.ResolvedAt,
            ClosedAt = t.ClosedAt
        };

        // Helper: Check if user can access ticket
        private async Task<(Ticket? Ticket, IActionResult? Error)> GetTicketWithAccessCheck(int ticketId)
        {
            var userId = GetCurrentUserId();
            var userRole = GetCurrentUserRole();

            var ticket = await _context.Tickets
                .Include(t => t.Project)
                .Include(t => t.AssignedDeveloper)
                .Include(t => t.CreatedByUser)
                .FirstOrDefaultAsync(t => t.Id == ticketId);

            if (ticket == null)
                return (null, NotFound(new { message = "Ticket not found" }));

            // Access check: Admin can access all, Developer must be assigned, EndUser must be creator
            if (userRole == "Developer" && ticket.AssignedDeveloperId != userId)
                return (null, Forbid());
            if (userRole == "EndUser" && ticket.CreatedByUserId != userId)
                return (null, Forbid());

            return (ticket, null);
        }

        /// <summary>
        /// Get all messages for a ticket
        /// </summary>
        [HttpGet("{id}/messages")]
        public async Task<IActionResult> GetMessages(int id)
        {
            var (ticket, error) = await GetTicketWithAccessCheck(id);
            if (error != null) return error;

            var messages = await _context.TicketMessages
                .Where(m => m.TicketId == id)
                .Include(m => m.Sender)
                .OrderBy(m => m.SentAt)
                .Select(m => new TicketMessageDto
                {
                    Id = m.Id,
                    Message = m.Message,
                    SenderId = m.SenderId,
                    SenderName = m.Sender.Name,
                    SenderRole = m.Sender.Role.ToString(),
                    SentAt = m.SentAt
                })
                .ToListAsync();

            return Ok(messages);
        }

        /// <summary>
        /// Send a message to a ticket (only if not closed)
        /// </summary>
        [HttpPost("{id}/messages")]
        public async Task<IActionResult> SendMessage(int id, [FromBody] SendMessageDto dto)
        {
            var (ticket, error) = await GetTicketWithAccessCheck(id);
            if (error != null) return error;

            // Cannot send messages to closed tickets
            if (ticket!.Status == TicketStatus.Closed)
                return BadRequest(new { message = "Cannot send messages to closed tickets" });

            if (string.IsNullOrWhiteSpace(dto.Message))
                return BadRequest(new { message = "Message cannot be empty" });

            var userId = GetCurrentUserId();
            var message = new TicketMessage
            {
                TicketId = id,
                SenderId = userId,
                Message = dto.Message.Trim(),
                SentAt = DateTime.UtcNow
            };

            _context.TicketMessages.Add(message);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Message sent successfully", messageId = message.Id });
        }
    }

    // DTOs
    public class TicketDto
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string Type { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public string Priority { get; set; } = string.Empty;
        public int ProjectId { get; set; }
        public string ProjectName { get; set; } = string.Empty;
        public int? AssignedDeveloperId { get; set; }
        public string? AssignedDeveloperName { get; set; }
        public int CreatedByUserId { get; set; }
        public string CreatedByUserName { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public DateTime? AssignedAt { get; set; }
        public DateTime? InProgressAt { get; set; }
        public DateTime? ResolvedAt { get; set; }
        public DateTime? ClosedAt { get; set; }
    }

    public class CreateTicketDto
    {
        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string Type { get; set; } = "Bug";
        public string Priority { get; set; } = "Medium";
        public int ProjectId { get; set; }
    }

    public class AssignTicketDto
    {
        public int DeveloperId { get; set; }
    }

    public class UpdateTicketStatusDto
    {
        public string Status { get; set; } = string.Empty;
        public string? Comments { get; set; }
    }

    public class CloseTicketDto
    {
        public string? Comments { get; set; }
    }

    public class TicketHistoryDto
    {
        public int Id { get; set; }
        public string Action { get; set; } = string.Empty;
        public string? OldValue { get; set; }
        public string? NewValue { get; set; }
        public string? Comments { get; set; }
        public int ChangedByUserId { get; set; }
        public string ChangedByUserName { get; set; } = string.Empty;
        public DateTime ChangedAt { get; set; }
    }

    public class TicketMessageDto
    {
        public int Id { get; set; }
        public string Message { get; set; } = string.Empty;
        public int SenderId { get; set; }
        public string SenderName { get; set; } = string.Empty;
        public string SenderRole { get; set; } = string.Empty;
        public DateTime SentAt { get; set; }
    }

    public class SendMessageDto
    {
        public string Message { get; set; } = string.Empty;
    }
}

