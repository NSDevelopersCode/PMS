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
    public class AttachmentsController : ControllerBase
    {
        private readonly PmsDbContext _context;
        private readonly IConfiguration _configuration;

        public AttachmentsController(PmsDbContext context, IConfiguration configuration)
        {
            _context = context;
            _configuration = configuration;
        }

        private int GetCurrentUserId() => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        private string GetCurrentUserRole() => User.FindFirstValue(ClaimTypes.Role)!;

        /// <summary>
        /// Download an attachment by ID (authorized users only)
        /// </summary>
        [HttpGet("{id}")]
        public async Task<IActionResult> DownloadAttachment(int id)
        {
            var userId = GetCurrentUserId();
            var userRole = GetCurrentUserRole();

            var attachment = await _context.TicketAttachments
                .Include(a => a.TicketMessage)
                    .ThenInclude(m => m.Ticket)
                .FirstOrDefaultAsync(a => a.Id == id);

            if (attachment == null)
                return NotFound(new { message = "Attachment not found" });

            var ticket = attachment.TicketMessage.Ticket;

            // Access check: Admin can access all, Developer must be assigned, EndUser must be creator
            if (userRole == "Developer" && ticket.AssignedDeveloperId != userId)
                return Forbid();
            if (userRole == "EndUser" && ticket.CreatedByUserId != userId)
                return Forbid();

            // Get file path
            var basePath = _configuration["FileStorage:BasePath"] ?? "D:/PMS-Storage";
            var filePath = Path.Combine(basePath, attachment.StoredFileName);

            if (!System.IO.File.Exists(filePath))
                return NotFound(new { message = "File not found on server" });

            var fileBytes = await System.IO.File.ReadAllBytesAsync(filePath);
            return File(fileBytes, attachment.ContentType, attachment.OriginalFileName);
        }
    }
}
