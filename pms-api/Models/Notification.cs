using System.ComponentModel.DataAnnotations;

namespace PMS.API.Models
{
    public enum NotificationType
    {
        TicketCreated,
        TicketAssigned,
        TicketResolved,
        TicketReopened,
        TicketClosed
    }

    public class Notification
    {
        public int Id { get; set; }

        [Required]
        public int UserId { get; set; }

        [Required]
        public NotificationType Type { get; set; }

        [Required]
        [MaxLength(500)]
        public string Message { get; set; } = string.Empty;

        public int RelatedTicketId { get; set; }

        public bool IsRead { get; set; } = false;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Navigation properties
        public User User { get; set; } = null!;
        public Ticket RelatedTicket { get; set; } = null!;
    }
}
