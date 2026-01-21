using Microsoft.EntityFrameworkCore;
using PMS.API.Models;

namespace PMS.API.Data
{
    public class PmsDbContext : DbContext
    {
        public PmsDbContext(DbContextOptions<PmsDbContext> options) : base(options)
        {
        }

        public DbSet<User> Users { get; set; }
        public DbSet<Project> Projects { get; set; }
        public DbSet<Ticket> Tickets { get; set; }
        public DbSet<TicketHistory> TicketHistories { get; set; }
        public DbSet<TicketMessage> TicketMessages { get; set; }
        public DbSet<TicketAttachment> TicketAttachments { get; set; }
        public DbSet<Notification> Notifications { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // User configuration
            modelBuilder.Entity<User>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Name).IsRequired().HasMaxLength(100);
                entity.Property(e => e.Email).IsRequired().HasMaxLength(150);
                entity.Property(e => e.PasswordHash).IsRequired().HasMaxLength(255);
                entity.HasIndex(e => e.Email).IsUnique();
                entity.Property(e => e.Role).HasConversion<string>();
            });

            // Project configuration
            modelBuilder.Entity<Project>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Name).IsRequired().HasMaxLength(200);
                entity.Property(e => e.Description).HasMaxLength(1000);
            });

            // Ticket configuration
            modelBuilder.Entity<Ticket>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Title).IsRequired().HasMaxLength(300);
                entity.Property(e => e.Description).HasMaxLength(2000);
                entity.Property(e => e.Type).HasConversion<string>();
                entity.Property(e => e.Status).HasConversion<string>();
                entity.Property(e => e.Priority).HasConversion<string>();

                // Relationships
                entity.HasOne(e => e.Project)
                    .WithMany(p => p.Tickets)
                    .HasForeignKey(e => e.ProjectId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(e => e.AssignedDeveloper)
                    .WithMany(u => u.AssignedTickets)
                    .HasForeignKey(e => e.AssignedDeveloperId)
                    .OnDelete(DeleteBehavior.SetNull);

                entity.HasOne(e => e.CreatedByUser)
                    .WithMany(u => u.CreatedTickets)
                    .HasForeignKey(e => e.CreatedByUserId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            // TicketHistory configuration
            modelBuilder.Entity<TicketHistory>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Action).HasConversion<string>();
                entity.Property(e => e.OldValue).HasMaxLength(500);
                entity.Property(e => e.NewValue).HasMaxLength(500);
                entity.Property(e => e.Comments).HasMaxLength(1000);

                entity.HasOne(e => e.Ticket)
                    .WithMany()
                    .HasForeignKey(e => e.TicketId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(e => e.ChangedByUser)
                    .WithMany()
                    .HasForeignKey(e => e.ChangedByUserId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            // TicketMessage configuration
            modelBuilder.Entity<TicketMessage>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Message).IsRequired().HasMaxLength(2000);

                entity.HasOne(e => e.Ticket)
                    .WithMany()
                    .HasForeignKey(e => e.TicketId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(e => e.Sender)
                    .WithMany()
                    .HasForeignKey(e => e.SenderId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            // TicketAttachment configuration
            modelBuilder.Entity<TicketAttachment>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.OriginalFileName).IsRequired().HasMaxLength(255);
                entity.Property(e => e.StoredFileName).IsRequired().HasMaxLength(500);
                entity.Property(e => e.ContentType).IsRequired().HasMaxLength(100);

                entity.HasOne(e => e.TicketMessage)
                    .WithMany(m => m.Attachments)
                    .HasForeignKey(e => e.TicketMessageId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(e => e.UploadedByUser)
                    .WithMany()
                    .HasForeignKey(e => e.UploadedByUserId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            // Notification configuration
            modelBuilder.Entity<Notification>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Type).HasConversion<string>();
                entity.Property(e => e.Message).IsRequired().HasMaxLength(500);

                entity.HasOne(e => e.User)
                    .WithMany()
                    .HasForeignKey(e => e.UserId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(e => e.RelatedTicket)
                    .WithMany()
                    .HasForeignKey(e => e.RelatedTicketId)
                    .OnDelete(DeleteBehavior.Cascade);
            });
        }
    }
}
