namespace PMS.API.Models
{
    public enum TicketType
    {
        Bug,
        Feature
    }

    public enum TicketStatus
    {
        Open,
        InProgress,
        Resolved,
        Closed
    }

    public enum TicketPriority
    {
        Low,
        Medium,
        High,
        Critical
    }

    public class Ticket
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; }
        public TicketType Type { get; set; }
        public TicketStatus Status { get; set; } = TicketStatus.Open;
        public TicketPriority Priority { get; set; } = TicketPriority.Medium;
        
        // Lifecycle timestamps (for analytics)
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? AssignedAt { get; set; }
        public DateTime? InProgressAt { get; set; }
        public DateTime? ResolvedAt { get; set; }
        public DateTime? ClosedAt { get; set; }

        // Foreign keys
        public int ProjectId { get; set; }
        public int? AssignedDeveloperId { get; set; }
        public int CreatedByUserId { get; set; }

        // Navigation properties
        public Project Project { get; set; } = null!;
        public User? AssignedDeveloper { get; set; }
        public User CreatedByUser { get; set; } = null!;
    }
}
