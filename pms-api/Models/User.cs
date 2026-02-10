namespace PMS.API.Models
{
    public enum UserRole
    {
        Admin,
        Developer,
        EndUser
    }

    public class User
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string PasswordHash { get; set; } = string.Empty;
        public UserRole Role { get; set; }
        public bool IsActive { get; set; } = true;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        
        // PIN unlock fields
        public string? PinHash { get; set; }
        public bool IsPinEnabled { get; set; } = false;

        // Navigation properties
        public ICollection<Project> CreatedProjects { get; set; } = new List<Project>();
        public ICollection<Ticket> AssignedTickets { get; set; } = new List<Ticket>();
        public ICollection<Ticket> CreatedTickets { get; set; } = new List<Ticket>();
    }
}
