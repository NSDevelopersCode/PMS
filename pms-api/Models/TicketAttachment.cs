namespace PMS.API.Models
{
    /// <summary>
    /// Represents a file attachment uploaded with a ticket message
    /// </summary>
    public class TicketAttachment
    {
        public int Id { get; set; }
        public int TicketMessageId { get; set; }
        public string OriginalFileName { get; set; } = string.Empty;
        public string StoredFileName { get; set; } = string.Empty;
        public long FileSize { get; set; }
        public string ContentType { get; set; } = string.Empty;
        public int UploadedByUserId { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Navigation properties
        public TicketMessage TicketMessage { get; set; } = null!;
        public User UploadedByUser { get; set; } = null!;
    }
}
