using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PMS.API.Data;
using PMS.API.Models;
using System.Security.Claims;

namespace PMS.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class NotificationsController : ControllerBase
    {
        private readonly PmsDbContext _context;

        public NotificationsController(PmsDbContext context)
        {
            _context = context;
        }

        private int GetCurrentUserId()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return int.Parse(userIdClaim ?? "0");
        }

        /// <summary>
        /// Get current user's unread notifications (newest first)
        /// </summary>
        [HttpGet]
        public async Task<ActionResult<IEnumerable<NotificationDto>>> GetNotifications()
        {
            var userId = GetCurrentUserId();

            var notifications = await _context.Notifications
                .Where(n => n.UserId == userId && !n.IsRead) // Only unread
                .Include(n => n.RelatedTicket)
                .OrderByDescending(n => n.CreatedAt)
                .Take(50) // Limit to recent 50
                .Select(n => new NotificationDto
                {
                    Id = n.Id,
                    Type = n.Type.ToString(),
                    Message = n.Message,
                    RelatedTicketId = n.RelatedTicketId,
                    RelatedTicketTitle = n.RelatedTicket.Title,
                    IsRead = n.IsRead,
                    CreatedAt = n.CreatedAt
                })
                .ToListAsync();

            return Ok(notifications);
        }

        /// <summary>
        /// Get unread notification count
        /// </summary>
        [HttpGet("unread-count")]
        public async Task<ActionResult<int>> GetUnreadCount()
        {
            var userId = GetCurrentUserId();
            var count = await _context.Notifications
                .Where(n => n.UserId == userId && !n.IsRead)
                .CountAsync();

            return Ok(new { count });
        }

        /// <summary>
        /// Mark a single notification as read
        /// </summary>
        [HttpPatch("{id}/read")]
        public async Task<IActionResult> MarkAsRead(int id)
        {
            var userId = GetCurrentUserId();
            var notification = await _context.Notifications
                .FirstOrDefaultAsync(n => n.Id == id && n.UserId == userId);

            if (notification == null)
                return NotFound(new { message = "Notification not found" });

            notification.IsRead = true;
            await _context.SaveChangesAsync();

            return Ok(new { message = "Notification marked as read" });
        }

        /// <summary>
        /// Mark all notifications as read
        /// </summary>
        [HttpPatch("read-all")]
        public async Task<IActionResult> MarkAllAsRead()
        {
            var userId = GetCurrentUserId();
            var unreadNotifications = await _context.Notifications
                .Where(n => n.UserId == userId && !n.IsRead)
                .ToListAsync();

            foreach (var notification in unreadNotifications)
            {
                notification.IsRead = true;
            }

            await _context.SaveChangesAsync();

            return Ok(new { message = $"Marked {unreadNotifications.Count} notifications as read" });
        }
    }

    // DTOs
    public class NotificationDto
    {
        public int Id { get; set; }
        public string Type { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
        public int RelatedTicketId { get; set; }
        public string RelatedTicketTitle { get; set; } = string.Empty;
        public bool IsRead { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
