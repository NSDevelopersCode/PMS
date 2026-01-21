namespace PMS.API.Models
{
    public class TicketMessage
    {
        public int Id { get; set; }
        public string Message { get; set; } = string.Empty;
        public DateTime SentAt { get; set; } = DateTime.UtcNow;

        // Foreign keys
        public int TicketId { get; set; }
        public int SenderId { get; set; }

        // Navigation properties
        public Ticket Ticket { get; set; } = null!;
        public User Sender { get; set; } = null!;
        public ICollection<TicketAttachment> Attachments { get; set; } = new List<TicketAttachment>();
    }
}
