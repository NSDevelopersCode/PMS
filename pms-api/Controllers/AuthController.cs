using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;
using PMS.API.DTOs;
using PMS.API.Services;

namespace PMS.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly IAuthService _authService;

        public AuthController(IAuthService authService)
        {
            _authService = authService;
        }

        /// <summary>
        /// Register a new user
        /// </summary>
        [HttpPost("register")]
        public async Task<ActionResult<AuthResponseDto>> Register([FromBody] RegisterDto registerDto)
        {
            var result = await _authService.RegisterAsync(registerDto);
            
            if (!result.Success)
            {
                return BadRequest(result);
            }

            return Ok(result);
        }

        /// <summary>
        /// Login with email and password
        /// </summary>
        [HttpPost("login")]
        public async Task<ActionResult<AuthResponseDto>> Login([FromBody] LoginDto loginDto)
        {
            var result = await _authService.LoginAsync(loginDto);
            
            if (!result.Success)
            {
                return Unauthorized(result);
            }

            return Ok(result);
        }

        /// <summary>
        /// Verify password for screen unlock (requires valid JWT)
        /// </summary>
        [HttpPost("verify-password")]
        [Authorize]
        public async Task<IActionResult> VerifyPassword([FromBody] VerifyPasswordDto dto)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out var userId))
            {
                return Unauthorized(new { success = false, message = "Invalid token" });
            }

            var isValid = await _authService.VerifyPasswordAsync(userId, dto.Password);
            
            if (!isValid)
            {
                return BadRequest(new { success = false, message = "Invalid password" });
            }

            return Ok(new { success = true, message = "Password verified" });
        }

        /// <summary>
        /// Change user password (requires valid JWT)
        /// </summary>
        [HttpPost("change-password")]
        [Authorize]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordDto dto)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out var userId))
            {
                return Unauthorized(new { success = false, message = "Invalid token" });
            }

            // Validate new password
            if (string.IsNullOrEmpty(dto.NewPassword) || dto.NewPassword.Length < 8)
            {
                return BadRequest(new { success = false, message = "New password must be at least 8 characters" });
            }

            // Verify current password
            var isValid = await _authService.VerifyPasswordAsync(userId, dto.CurrentPassword);
            if (!isValid)
            {
                return BadRequest(new { success = false, message = "Current password is incorrect" });
            }

            // Check new password is different
            if (dto.CurrentPassword == dto.NewPassword)
            {
                return BadRequest(new { success = false, message = "New password must be different from current password" });
            }

            // Update password
            var result = await _authService.ChangePasswordAsync(userId, dto.NewPassword);
            if (!result)
            {
                return BadRequest(new { success = false, message = "Failed to change password" });
            }

            return Ok(new { success = true, message = "Password changed successfully" });
        }

        /// <summary>
        /// Setup 4-digit PIN for screen unlock (requires valid JWT and current password)
        /// </summary>
        [HttpPost("setup-pin")]
        [Authorize]
        public async Task<IActionResult> SetupPin([FromBody] SetupPinDto dto)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out var userId))
            {
                return Unauthorized(new { success = false, message = "Invalid token" });
            }

            var (success, message) = await _authService.SetupPinAsync(userId, dto.CurrentPassword, dto.Pin);
            
            if (!success)
            {
                return BadRequest(new { success = false, message });
            }

            return Ok(new { success = true, message });
        }

        /// <summary>
        /// Verify PIN for screen unlock (requires valid JWT)
        /// </summary>
        [HttpPost("verify-pin")]
        [Authorize]
        public async Task<IActionResult> VerifyPin([FromBody] VerifyPinDto dto)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out var userId))
            {
                return Unauthorized(new { success = false, message = "Invalid token" });
            }

            var isValid = await _authService.VerifyPinAsync(userId, dto.Pin);
            
            if (!isValid)
            {
                return BadRequest(new { success = false, message = "Invalid PIN" });
            }

            return Ok(new { success = true, message = "PIN verified" });
        }

        /// <summary>
        /// Disable PIN for screen unlock (requires valid JWT and current password)
        /// </summary>
        [HttpPost("disable-pin")]
        [Authorize]
        public async Task<IActionResult> DisablePin([FromBody] DisablePinDto dto)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out var userId))
            {
                return Unauthorized(new { success = false, message = "Invalid token" });
            }

            var (success, message) = await _authService.DisablePinAsync(userId, dto.CurrentPassword);
            
            if (!success)
            {
                return BadRequest(new { success = false, message });
            }

            return Ok(new { success = true, message });
        }

        /// <summary>
        /// Get PIN status (enabled/disabled) for current user
        /// </summary>
        [HttpGet("pin-status")]
        [Authorize]
        public async Task<IActionResult> GetPinStatus()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out var userId))
            {
                return Unauthorized(new { success = false, message = "Invalid token" });
            }

            var isPinEnabled = await _authService.GetPinStatusAsync(userId);
            
            return Ok(new { success = true, isPinEnabled });
        }
    }

    public class VerifyPasswordDto
    {
        public string Password { get; set; } = string.Empty;
    }

    public class ChangePasswordDto
    {
        public string CurrentPassword { get; set; } = string.Empty;
        public string NewPassword { get; set; } = string.Empty;
    }

    public class SetupPinDto
    {
        public string CurrentPassword { get; set; } = string.Empty;
        public string Pin { get; set; } = string.Empty;
    }

    public class VerifyPinDto
    {
        public string Pin { get; set; } = string.Empty;
    }

    public class DisablePinDto
    {
        public string CurrentPassword { get; set; } = string.Empty;
    }
}
