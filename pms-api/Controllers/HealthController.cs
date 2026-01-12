using Microsoft.AspNetCore.Mvc;

namespace PMS.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class HealthController : ControllerBase
    {
        [HttpGet]
        public IActionResult Get()
        {
            return Ok(new { status = "PMS API is running" });
        }
    }
}
