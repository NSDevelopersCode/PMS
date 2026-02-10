using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using PMS.API.Data;
using PMS.API.DTOs;
using PMS.API.Models;

namespace PMS.API.Services
{
    public interface IAuthService
    {
        Task<AuthResponseDto> RegisterAsync(RegisterDto registerDto);
        Task<AuthResponseDto> LoginAsync(LoginDto loginDto);
        Task<bool> VerifyPasswordAsync(int userId, string password);
        Task<bool> ChangePasswordAsync(int userId, string newPassword);
        string GenerateJwtToken(User user);
        
        // PIN methods
        Task<(bool success, string message)> SetupPinAsync(int userId, string currentPassword, string pin);
        Task<bool> VerifyPinAsync(int userId, string pin);
        Task<(bool success, string message)> DisablePinAsync(int userId, string currentPassword);
        Task<bool> GetPinStatusAsync(int userId);
    }

    public class AuthService : IAuthService
    {
        private readonly PmsDbContext _context;
        private readonly IConfiguration _configuration;

        public AuthService(PmsDbContext context, IConfiguration configuration)
        {
            _context = context;
            _configuration = configuration;
        }

        public async Task<AuthResponseDto> RegisterAsync(RegisterDto registerDto)
        {
            // Check if email already exists
            if (await _context.Users.AnyAsync(u => u.Email == registerDto.Email))
            {
                return new AuthResponseDto
                {
                    Success = false,
                    Message = "Email already registered"
                };
            }

            // SECURITY: Public registration always creates EndUser
            // Admin/Developer accounts must be created by Admin via UsersController
            var user = new User
            {
                Name = registerDto.Name,
                Email = registerDto.Email,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(registerDto.Password),
                Role = UserRole.EndUser,  // Always EndUser - enforced server-side
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            var token = GenerateJwtToken(user);

            return new AuthResponseDto
            {
                Success = true,
                Message = "Registration successful",
                Token = token,
                User = MapToUserDto(user)
            };
        }

        public async Task<AuthResponseDto> LoginAsync(LoginDto loginDto)
        {
            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.Email == loginDto.Email);

            if (user == null)
            {
                return new AuthResponseDto
                {
                    Success = false,
                    Message = "Invalid email or password"
                };
            }

            if (!BCrypt.Net.BCrypt.Verify(loginDto.Password, user.PasswordHash))
            {
                return new AuthResponseDto
                {
                    Success = false,
                    Message = "Invalid email or password"
                };
            }

            if (!user.IsActive)
            {
                return new AuthResponseDto
                {
                    Success = false,
                    Message = "Account is deactivated"
                };
            }

            var token = GenerateJwtToken(user);

            return new AuthResponseDto
            {
                Success = true,
                Message = "Login successful",
                Token = token,
                User = MapToUserDto(user)
            };
        }

        public string GenerateJwtToken(User user)
        {
            var jwtSettings = _configuration.GetSection("JwtSettings");
            var secretKey = jwtSettings["SecretKey"] ?? throw new InvalidOperationException("JWT SecretKey not configured");
            var issuer = jwtSettings["Issuer"];
            var audience = jwtSettings["Audience"];
            var expirationMinutes = int.Parse(jwtSettings["ExpirationMinutes"] ?? "60");

            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey));
            var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var claims = new[]
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim(ClaimTypes.Name, user.Name),
                new Claim(ClaimTypes.Email, user.Email),
                new Claim(ClaimTypes.Role, user.Role.ToString())
            };

            var token = new JwtSecurityToken(
                issuer: issuer,
                audience: audience,
                claims: claims,
                expires: DateTime.UtcNow.AddMinutes(expirationMinutes),
                signingCredentials: credentials
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }

        public async Task<bool> VerifyPasswordAsync(int userId, string password)
        {
            var user = await _context.Users.FindAsync(userId);
            if (user == null || !user.IsActive)
                return false;

            return BCrypt.Net.BCrypt.Verify(password, user.PasswordHash);
        }

        public async Task<bool> ChangePasswordAsync(int userId, string newPassword)
        {
            var user = await _context.Users.FindAsync(userId);
            if (user == null || !user.IsActive)
                return false;

            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(newPassword);
            await _context.SaveChangesAsync();
            return true;
        }

        // PIN methods
        public async Task<(bool success, string message)> SetupPinAsync(int userId, string currentPassword, string pin)
        {
            var user = await _context.Users.FindAsync(userId);
            if (user == null || !user.IsActive)
                return (false, "User not found or inactive");

            // Verify current password
            if (!BCrypt.Net.BCrypt.Verify(currentPassword, user.PasswordHash))
                return (false, "Invalid password");

            // Validate PIN format (4 digits)
            if (string.IsNullOrEmpty(pin) || pin.Length != 4 || !pin.All(char.IsDigit))
                return (false, "PIN must be exactly 4 digits");

            // Hash and store PIN
            user.PinHash = BCrypt.Net.BCrypt.HashPassword(pin);
            user.IsPinEnabled = true;
            await _context.SaveChangesAsync();
            return (true, "PIN setup successful");
        }

        public async Task<bool> VerifyPinAsync(int userId, string pin)
        {
            var user = await _context.Users.FindAsync(userId);
            if (user == null || !user.IsActive || !user.IsPinEnabled || string.IsNullOrEmpty(user.PinHash))
                return false;

            return BCrypt.Net.BCrypt.Verify(pin, user.PinHash);
        }

        public async Task<(bool success, string message)> DisablePinAsync(int userId, string currentPassword)
        {
            var user = await _context.Users.FindAsync(userId);
            if (user == null || !user.IsActive)
                return (false, "User not found or inactive");

            // Verify current password
            if (!BCrypt.Net.BCrypt.Verify(currentPassword, user.PasswordHash))
                return (false, "Invalid password");

            // Disable PIN
            user.PinHash = null;
            user.IsPinEnabled = false;
            await _context.SaveChangesAsync();
            return (true, "PIN disabled successfully");
        }

        public async Task<bool> GetPinStatusAsync(int userId)
        {
            var user = await _context.Users.FindAsync(userId);
            return user?.IsPinEnabled ?? false;
        }

        private static UserDto MapToUserDto(User user)
        {
            return new UserDto
            {
                Id = user.Id,
                Name = user.Name,
                Email = user.Email,
                Role = user.Role.ToString(),
                IsActive = user.IsActive,
                CreatedAt = user.CreatedAt
            };
        }
    }
}
