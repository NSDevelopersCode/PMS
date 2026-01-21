namespace PMS.API.Models
{
    public enum TicketAction
    {
        Created,
        Assigned,
        StatusChanged,
        Reassigned,
        PriorityChanged,
        Resolved,
        Closed,
        Reopened,
        Archived,
        Unarchived,
        AttachmentAdded
    }

    /// <summary>
    /// Audit trail for ticket changes - enables analytics and reporting
    /// </summary>
    public class TicketHistory
    {
        public int Id { get; set; }
        public int TicketId { get; set; }
        public TicketAction Action { get; set; }
        public string? OldValue { get; set; }
        public string? NewValue { get; set; }
        public string? Comments { get; set; }
        public int ChangedByUserId { get; set; }
        public DateTime ChangedAt { get; set; } = DateTime.UtcNow;

        // Navigation properties
        public Ticket Ticket { get; set; } = null!;
        public User ChangedByUser { get; set; } = null!;
    }
}
