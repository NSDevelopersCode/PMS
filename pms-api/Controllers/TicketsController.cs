using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using PMS.API.Data;
using PMS.API.Hubs;
using PMS.API.Models;
using PMS.API.Services;

namespace PMS.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class TicketsController : ControllerBase
    {
        private readonly PmsDbContext _context;
        private readonly IHubContext<NotificationHub> _hubContext;
        private readonly IImageCompressionService _imageCompressionService;
        private readonly IConfiguration _configuration;

        // Allowed file extensions and size limits
        private static readonly HashSet<string> AllowedExtensions = new(StringComparer.OrdinalIgnoreCase)
        {
            ".png", ".jpg", ".jpeg", ".pdf", ".txt", ".log", ".json"
        };
        private const long MaxImageSize = 5 * 1024 * 1024; // 5 MB
        private const long MaxOtherFileSize = 2 * 1024 * 1024; // 2 MB

        public TicketsController(
            PmsDbContext context,
            IHubContext<NotificationHub> hubContext,
            IImageCompressionService imageCompressionService,
            IConfiguration configuration)
        {
            _context = context;
            _hubContext = hubContext;
            _imageCompressionService = imageCompressionService;
            _configuration = configuration;
        }

        private int GetCurrentUserId() => int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
        private string GetCurrentUserRole() => User.FindFirst(ClaimTypes.Role)?.Value ?? "";

        /// <summary>
        /// Get all tickets (Admin sees all, Developer sees assigned, EndUser sees created)
        /// By default, archived tickets are excluded. Use includeArchived=true to see them.
        /// </summary>
        [HttpGet]
        public async Task<ActionResult<IEnumerable<TicketDto>>> GetTickets([FromQuery] bool includeArchived = false)
        {
            var userId = GetCurrentUserId();
            var userRole = GetCurrentUserRole();

            IQueryable<Ticket> query = _context.Tickets
                .Include(t => t.Project)
                .Include(t => t.AssignedDeveloper)
                .Include(t => t.CreatedByUser);

            // By default, exclude archived tickets
            if (!includeArchived)
            {
                query = query.Where(t => !t.IsArchived);
            }

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

            // Notify all Admins about new ticket
            var adminIds = await GetAdminUserIds();
            await CreateNotificationsForUsers(adminIds, NotificationType.TicketCreated, 
                $"New ticket created: {ticket.Title}", ticket.Id);

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

            // Notify assigned developer
            await CreateNotification(dto.DeveloperId, NotificationType.TicketAssigned,
                $"Ticket assigned to you: {ticket.Title}", ticket.Id);

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

            // Notify EndUser when ticket is resolved
            if (newStatus == TicketStatus.Resolved)
            {
                await CreateNotification(ticket.CreatedByUserId, NotificationType.TicketResolved,
                    $"Your ticket has been resolved: {ticket.Title}", ticket.Id);
            }

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
        [Authorize(Roles = "Admin,EndUser")]
        public async Task<IActionResult> CloseTicket(int id, [FromBody] CloseTicketDto? dto = null)
        {
            var userId = GetCurrentUserId();
            var userRole = GetCurrentUserRole();
            var ticket = await _context.Tickets.FindAsync(id);
            
            if (ticket == null)
                return NotFound(new { message = "Ticket not found" });

            // EndUser can only close their own tickets
            if (userRole == "EndUser" && ticket.CreatedByUserId != userId)
                return Forbid();

            if (ticket.Status == TicketStatus.Closed)
                return BadRequest(new { message = "Ticket is already closed" });

            var oldStatus = ticket.Status;
            var now = DateTime.UtcNow;

            ticket.Status = TicketStatus.Closed;
            ticket.ClosedAt = now;
            ticket.UpdatedAt = now;

            // Handle optional satisfaction rating
            if (dto?.SatisfactionScore != null)
            {
                if (dto.SatisfactionScore < 1 || dto.SatisfactionScore > 5)
                    return BadRequest(new { message = "Satisfaction score must be between 1 and 5" });
                
                ticket.SatisfactionScore = dto.SatisfactionScore;
                ticket.SatisfactionComment = dto.SatisfactionComment;
                ticket.RatedAt = now;
            }

            var defaultComment = userRole == "Admin" ? "Ticket closed by admin" : "Ticket accepted and closed by user";

            await _context.SaveChangesAsync();
            await AddHistory(ticket.Id, TicketAction.Closed, oldStatus.ToString(), "Closed", 
                dto?.Comments ?? defaultComment, userId);

            // Notify ticket owner that ticket is closed
            await CreateNotification(ticket.CreatedByUserId, NotificationType.TicketClosed,
                $"Your ticket has been closed: {ticket.Title}", ticket.Id);

            return Ok(new { message = "Ticket closed successfully" });
        }

        /// <summary>
        /// Reopen a resolved ticket (EndUser owner or Admin only)
        /// Requires mandatory comment explaining why changes are needed
        /// </summary>
        [HttpPatch("{id}/reopen")]
        [Authorize(Roles = "EndUser,Admin")]
        public async Task<IActionResult> ReopenTicket(int id, [FromBody] ReopenTicketDto dto)
        {
            var userId = GetCurrentUserId();
            var userRole = GetCurrentUserRole();

            if (string.IsNullOrWhiteSpace(dto.Comment))
                return BadRequest(new { message = "Comment is required when reopening a ticket" });

            var ticket = await _context.Tickets
                .Include(t => t.AssignedDeveloper)
                .FirstOrDefaultAsync(t => t.Id == id);
            
            if (ticket == null)
                return NotFound(new { message = "Ticket not found" });

            // Only ticket owner (EndUser) or Admin can reopen
            if (userRole == "EndUser" && ticket.CreatedByUserId != userId)
                return Forbid();

            // Developer cannot reopen their own assigned ticket
            if (ticket.AssignedDeveloperId == userId && userRole != "Admin")
                return BadRequest(new { message = "Developer cannot reopen their own assigned ticket" });

            // Ticket must be in Resolved status
            if (ticket.Status != TicketStatus.Resolved)
                return BadRequest(new { message = "Only resolved tickets can be reopened" });

            var oldStatus = ticket.Status;
            var now = DateTime.UtcNow;

            ticket.Status = TicketStatus.Reopened;
            ticket.ReopenedAt = now;
            ticket.ReopenCount++;
            ticket.UpdatedAt = now;

            await _context.SaveChangesAsync();
            await AddHistory(ticket.Id, TicketAction.Reopened, oldStatus.ToString(), "Reopened", 
                dto.Comment, userId);

            // Notify assigned developer about reopen
            if (ticket.AssignedDeveloperId.HasValue)
            {
                await CreateNotification(ticket.AssignedDeveloperId.Value, NotificationType.TicketReopened,
                    $"Ticket reopened: {ticket.Title}", ticket.Id);
            }
            // Notify all admins about reopen
            var adminIds = await GetAdminUserIds();
            await CreateNotificationsForUsers(adminIds, NotificationType.TicketReopened,
                $"Ticket reopened by user: {ticket.Title}", ticket.Id);

            return Ok(new { message = "Ticket reopened successfully" });
        }

        /// <summary>
        /// Archive a closed ticket (Admin only)
        /// </summary>
        [HttpPatch("{id}/archive")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> ArchiveTicket(int id)
        {
            var userId = GetCurrentUserId();
            var ticket = await _context.Tickets.FindAsync(id);
            
            if (ticket == null)
                return NotFound(new { message = "Ticket not found" });

            if (ticket.Status != TicketStatus.Closed)
                return BadRequest(new { message = "Only closed tickets can be archived" });

            if (ticket.IsArchived)
                return BadRequest(new { message = "Ticket is already archived" });

            var now = DateTime.UtcNow;
            ticket.IsArchived = true;
            ticket.ArchivedAt = now;
            ticket.ArchivedByUserId = userId;
            ticket.UpdatedAt = now;

            await _context.SaveChangesAsync();
            await AddHistory(ticket.Id, TicketAction.Archived, "Active", "Archived", 
                "Ticket archived by admin", userId);

            return Ok(new { message = "Ticket archived successfully" });
        }

        /// <summary>
        /// Unarchive a ticket (Admin only)
        /// </summary>
        [HttpPatch("{id}/unarchive")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> UnarchiveTicket(int id)
        {
            var userId = GetCurrentUserId();
            var ticket = await _context.Tickets.FindAsync(id);
            
            if (ticket == null)
                return NotFound(new { message = "Ticket not found" });

            if (!ticket.IsArchived)
                return BadRequest(new { message = "Ticket is not archived" });

            var now = DateTime.UtcNow;
            ticket.IsArchived = false;
            ticket.ArchivedAt = null;
            ticket.ArchivedByUserId = null;
            ticket.UpdatedAt = now;

            await _context.SaveChangesAsync();
            await AddHistory(ticket.Id, TicketAction.Unarchived, "Archived", "Active", 
                "Ticket unarchived by admin", userId);

            return Ok(new { message = "Ticket unarchived successfully" });
        }

        /// <summary>
        /// Get ticket history/audit trail with role-based filtering
        /// Admin sees all, Developer sees operational events, EndUser sees external-safe events
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

            // Define which actions each role can see
            var allowedActions = userRole switch
            {
                "Admin" => Enum.GetValues<TicketAction>().ToList(), // All actions
                "Developer" => new List<TicketAction>
                {
                    TicketAction.Created, TicketAction.Assigned, TicketAction.Reassigned,
                    TicketAction.StatusChanged, TicketAction.Resolved, TicketAction.Closed,
                    TicketAction.Reopened, TicketAction.AttachmentAdded
                },
                "EndUser" => new List<TicketAction>
                {
                    TicketAction.Created, TicketAction.Assigned, TicketAction.StatusChanged,
                    TicketAction.Resolved, TicketAction.Closed, TicketAction.Reopened,
                    TicketAction.SatisfactionRated
                },
                _ => new List<TicketAction>()
            };

            var history = await _context.TicketHistories
                .Where(h => h.TicketId == id && allowedActions.Contains(h.Action))
                .Include(h => h.ChangedByUser)
                .OrderBy(h => h.ChangedAt) // Chronological: oldest first
                .Select(h => new TicketHistoryDto
                {
                    Id = h.Id,
                    Action = h.Action.ToString(),
                    OldValue = h.OldValue,
                    NewValue = h.NewValue,
                    Comments = h.Comments,
                    ChangedByUserId = h.ChangedByUserId,
                    ChangedByUserName = h.ChangedByUser.Name,
                    ChangedByUserRole = h.ChangedByUser.Role.ToString(),
                    ChangedAt = h.ChangedAt
                })
                .ToListAsync();

            return Ok(history);
        }

        // Helper: Validate status transitions
        private (bool IsValid, string Message) ValidateStatusTransition(TicketStatus current, TicketStatus next, string userRole)
        {
            // Closed tickets cannot transition to anything
            if (current == TicketStatus.Closed)
                return (false, "Cannot modify closed tickets");

            // Admin can do any transition (except from Closed, handled above)
            if (userRole == "Admin")
                return (true, "");

            // Developer restrictions
            if (userRole == "Developer")
            {
                // Developer can: InProgress -> Resolved
                if (current == TicketStatus.InProgress && next == TicketStatus.Resolved)
                    return (true, "");
                
                // Developer can: Reopened -> InProgress (start working on reopened ticket)
                if (current == TicketStatus.Reopened && next == TicketStatus.InProgress)
                    return (true, "");
                    
                if (current == TicketStatus.Open)
                    return (false, "Developer cannot change Open tickets. Wait for assignment.");
                    
                if (current == TicketStatus.Resolved)
                    return (false, "Cannot change status of resolved ticket. Client must close or request changes.");

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

        // Helper: Create notification for a single user
        private async Task CreateNotification(int userId, NotificationType type, string message, int ticketId)
        {
            var notification = new Notification
            {
                UserId = userId,
                Type = type,
                Message = message,
                RelatedTicketId = ticketId,
                IsRead = false,
                CreatedAt = DateTime.UtcNow
            };
            _context.Notifications.Add(notification);
            await _context.SaveChangesAsync();

            // Broadcast via SignalR
            var ticket = await _context.Tickets.FindAsync(ticketId);
            await _hubContext.Clients.Group($"user_{userId}").SendAsync("ReceiveNotification", new
            {
                id = notification.Id,
                type = type.ToString(),
                message = message,
                relatedTicketId = ticketId,
                relatedTicketTitle = ticket?.Title ?? "",
                isRead = false,
                createdAt = notification.CreatedAt
            });
        }

        // Helper: Create notifications for multiple users
        private async Task CreateNotificationsForUsers(IEnumerable<int> userIds, NotificationType type, string message, int ticketId)
        {
            var userIdList = userIds.ToList();
            var notifications = new List<Notification>();
            
            foreach (var userId in userIdList)
            {
                var notification = new Notification
                {
                    UserId = userId,
                    Type = type,
                    Message = message,
                    RelatedTicketId = ticketId,
                    IsRead = false,
                    CreatedAt = DateTime.UtcNow
                };
                _context.Notifications.Add(notification);
                notifications.Add(notification);
            }
            await _context.SaveChangesAsync();

            // Broadcast via SignalR to each user
            var ticket = await _context.Tickets.FindAsync(ticketId);
            for (int i = 0; i < userIdList.Count; i++)
            {
                await _hubContext.Clients.Group($"user_{userIdList[i]}").SendAsync("ReceiveNotification", new
                {
                    id = notifications[i].Id,
                    type = type.ToString(),
                    message = message,
                    relatedTicketId = ticketId,
                    relatedTicketTitle = ticket?.Title ?? "",
                    isRead = false,
                    createdAt = notifications[i].CreatedAt
                });
            }
        }

        // Helper: Get all admin user IDs
        private async Task<List<int>> GetAdminUserIds()
        {
            return await _context.Users
                .Where(u => u.Role == UserRole.Admin && u.IsActive)
                .Select(u => u.Id)
                .ToListAsync();
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
            ReopenedAt = t.ReopenedAt,
            ReopenCount = t.ReopenCount,
            ClosedAt = t.ClosedAt,
            SatisfactionScore = t.SatisfactionScore,
            SatisfactionComment = t.SatisfactionComment,
            RatedAt = t.RatedAt,
            IsArchived = t.IsArchived,
            ArchivedAt = t.ArchivedAt,
            ArchivedByUserId = t.ArchivedByUserId
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
                    SentAt = m.SentAt,
                    Attachments = m.Attachments.Select(a => new AttachmentDto
                    {
                        Id = a.Id,
                        OriginalFileName = a.OriginalFileName,
                        ContentType = a.ContentType,
                        FileSize = a.FileSize
                    }).ToList()
                })
                .ToListAsync();

            return Ok(messages);
        }

        /// <summary>
        /// Send a message to a ticket with optional file attachments
        /// </summary>
        [HttpPost("{id}/messages")]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> SendMessage(int id, [FromForm] SendMessageDto dto, [FromForm] IFormFileCollection? files)
        {
            var (ticket, error) = await GetTicketWithAccessCheck(id);
            if (error != null) return error;

            // Cannot send messages to closed or archived tickets
            if (ticket!.Status == TicketStatus.Closed)
                return BadRequest(new { message = "Cannot send messages to closed tickets" });

            if (ticket.IsArchived)
                return BadRequest(new { message = "Cannot send messages to archived tickets" });

            // Block uploads when ticket is Resolved
            if (files != null && files.Count > 0 && ticket.Status == TicketStatus.Resolved)
                return BadRequest(new { message = "Cannot attach files to resolved tickets" });

            // Either message or files must be provided
            if (string.IsNullOrWhiteSpace(dto.Message) && (files == null || files.Count == 0))
                return BadRequest(new { message = "Message or attachment is required" });

            // Validate files if provided
            if (files != null && files.Count > 0)
            {
                foreach (var file in files)
                {
                    var ext = Path.GetExtension(file.FileName);
                    if (!AllowedExtensions.Contains(ext))
                        return BadRequest(new { message = $"File type '{ext}' is not allowed. Allowed: {string.Join(", ", AllowedExtensions)}" });

                    var isImage = _imageCompressionService.IsImageContentType(file.ContentType);
                    var maxSize = isImage ? MaxImageSize : MaxOtherFileSize;
                    
                    if (file.Length > maxSize)
                        return BadRequest(new { message = $"File '{file.FileName}' exceeds the maximum size of {maxSize / 1024 / 1024}MB" });
                }
            }

            var userId = GetCurrentUserId();
            var now = DateTime.UtcNow;

            // Create message
            var message = new TicketMessage
            {
                TicketId = id,
                SenderId = userId,
                Message = dto.Message?.Trim() ?? "",
                SentAt = now
            };

            _context.TicketMessages.Add(message);
            await _context.SaveChangesAsync();

            // Process attachments
            var attachments = new List<TicketAttachment>();
            if (files != null && files.Count > 0)
            {
                var basePath = _configuration["FileStorage:BasePath"] ?? "D:/PMS-Storage";
                var ticketPath = Path.Combine(basePath, "tickets", id.ToString(), message.Id.ToString());
                Directory.CreateDirectory(ticketPath);

                foreach (var file in files)
                {
                    var isImage = _imageCompressionService.IsImageContentType(file.ContentType);
                    var guid = Guid.NewGuid().ToString();
                    var ext = Path.GetExtension(file.FileName);
                    var storedFileName = $"tickets/{id}/{message.Id}/{guid}{ext}";
                    var fullPath = Path.Combine(basePath, storedFileName);

                    byte[] fileBytes;
                    if (isImage)
                    {
                        // Compress image before saving
                        using var stream = file.OpenReadStream();
                        fileBytes = await _imageCompressionService.CompressImageAsync(stream, file.ContentType);
                    }
                    else
                    {
                        // Save non-image files as-is
                        using var memStream = new MemoryStream();
                        await file.CopyToAsync(memStream);
                        fileBytes = memStream.ToArray();
                    }

                    await System.IO.File.WriteAllBytesAsync(fullPath, fileBytes);

                    var attachment = new TicketAttachment
                    {
                        TicketMessageId = message.Id,
                        OriginalFileName = file.FileName,
                        StoredFileName = storedFileName,
                        FileSize = fileBytes.Length,
                        ContentType = file.ContentType,
                        UploadedByUserId = userId,
                        CreatedAt = now
                    };

                    _context.TicketAttachments.Add(attachment);
                    attachments.Add(attachment);
                }

                await _context.SaveChangesAsync();

                // Log attachment upload to history
                var fileNames = string.Join(", ", attachments.Select(a => a.OriginalFileName));
                await AddHistory(id, TicketAction.AttachmentAdded, null, fileNames, 
                    $"{attachments.Count} file(s) attached", userId);
            }

            return Ok(new 
            { 
                message = "Message sent successfully", 
                messageId = message.Id,
                attachmentCount = attachments.Count,
                attachments = attachments.Select(a => new AttachmentDto
                {
                    Id = a.Id,
                    OriginalFileName = a.OriginalFileName,
                    ContentType = a.ContentType,
                    FileSize = a.FileSize
                })
            });
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
        public DateTime? ReopenedAt { get; set; }
        public int ReopenCount { get; set; }
        public DateTime? ClosedAt { get; set; }
        // Satisfaction rating (optional, on close)
        public int? SatisfactionScore { get; set; }
        public string? SatisfactionComment { get; set; }
        public DateTime? RatedAt { get; set; }
        // Archiving
        public bool IsArchived { get; set; }
        public DateTime? ArchivedAt { get; set; }
        public int? ArchivedByUserId { get; set; }
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
        public int? SatisfactionScore { get; set; }  // Optional: 1-5
        public string? SatisfactionComment { get; set; }  // Optional
    }

    public class ReopenTicketDto
    {
        public string Comment { get; set; } = string.Empty;
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
        public string ChangedByUserRole { get; set; } = string.Empty;
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
        public List<AttachmentDto> Attachments { get; set; } = new();
    }

    public class AttachmentDto
    {
        public int Id { get; set; }
        public string OriginalFileName { get; set; } = string.Empty;
        public string ContentType { get; set; } = string.Empty;
        public long FileSize { get; set; }
    }

    public class SendMessageDto
    {
        public string? Message { get; set; }
    }
}

