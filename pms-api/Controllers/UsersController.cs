using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PMS.API.Data;
using PMS.API.DTOs;

namespace PMS.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize] // Requires authentication for all endpoints
    public class UsersController : ControllerBase
    {
        private readonly PmsDbContext _context;

        public UsersController(PmsDbContext context)
        {
            _context = context;
        }

        /// <summary>
        /// Get all users (Admin only)
        /// </summary>
        [HttpGet]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<IEnumerable<UserDto>>> GetUsers()
        {
            var users = await _context.Users
                .Select(u => new UserDto
                {
                    Id = u.Id,
                    Name = u.Name,
                    Email = u.Email,
                    Role = u.Role.ToString(),
                    IsActive = u.IsActive,
                    CreatedAt = u.CreatedAt
                })
                .ToListAsync();

            return Ok(users);
        }

        /// <summary>
        /// Get user by ID (Admin or the user themselves)
        /// </summary>
        [HttpGet("{id}")]
        public async Task<ActionResult<UserDto>> GetUser(int id)
        {
            var user = await _context.Users.FindAsync(id);

            if (user == null)
            {
                return NotFound(new { message = "User not found" });
            }

            return Ok(new UserDto
            {
                Id = user.Id,
                Name = user.Name,
                Email = user.Email,
                Role = user.Role.ToString(),
                IsActive = user.IsActive,
                CreatedAt = user.CreatedAt
            });
        }

        /// <summary>
        /// Get all developers (Admin only - for ticket assignment)
        /// </summary>
        [HttpGet("developers")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<IEnumerable<UserDto>>> GetDevelopers()
        {
            var developers = await _context.Users
                .Where(u => u.Role == Models.UserRole.Developer && u.IsActive)
                .Select(u => new UserDto
                {
                    Id = u.Id,
                    Name = u.Name,
                    Email = u.Email,
                    Role = u.Role.ToString(),
                    IsActive = u.IsActive,
                    CreatedAt = u.CreatedAt
                })
                .ToListAsync();

            return Ok(developers);
        }

        /// <summary>
        /// Deactivate a user (Admin only)
        /// </summary>
        [HttpPatch("{id}/deactivate")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> DeactivateUser(int id)
        {
            var user = await _context.Users.FindAsync(id);

            if (user == null)
            {
                return NotFound(new { message = "User not found" });
            }

            user.IsActive = false;
            await _context.SaveChangesAsync();

            return Ok(new { message = "User deactivated successfully" });
        }

        /// <summary>
        /// Create a new user (Admin only - for Developer/Admin accounts)
        /// </summary>
        [HttpPost]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> CreateUser([FromBody] CreateUserDto dto)
        {
            // Check if email already exists
            if (await _context.Users.AnyAsync(u => u.Email == dto.Email))
            {
                return BadRequest(new { message = "Email already registered" });
            }

            // Only allow creating Developer or Admin accounts
            if (!Enum.TryParse<Models.UserRole>(dto.Role, true, out var role))
            {
                return BadRequest(new { message = "Invalid role. Valid: Developer, Admin" });
            }

            if (role == Models.UserRole.EndUser)
            {
                return BadRequest(new { message = "EndUsers must register via public signup" });
            }

            var user = new Models.User
            {
                Name = dto.Name,
                Email = dto.Email,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
                Role = role,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            return Ok(new { message = $"{role} created successfully", userId = user.Id });
        }

        /// <summary>
        /// Toggle user active status (Admin only)
        /// </summary>
        [HttpPatch("{id}/status")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> UpdateUserStatus(int id, [FromBody] UpdateUserStatusDto dto)
        {
            var user = await _context.Users.FindAsync(id);

            if (user == null)
            {
                return NotFound(new { message = "User not found" });
            }

            user.IsActive = dto.IsActive;
            await _context.SaveChangesAsync();

            return Ok(new { message = $"User {(dto.IsActive ? "activated" : "deactivated")} successfully" });
        }
    }

    // DTOs for User Management
    public class CreateUserDto
    {
        public string Name { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        public string Role { get; set; } = "Developer";
    }

    public class UpdateUserStatusDto
    {
        public bool IsActive { get; set; }
    }
}
