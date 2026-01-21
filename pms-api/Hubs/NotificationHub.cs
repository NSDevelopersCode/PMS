using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace PMS.API.Hubs
{
    [Authorize]
    public class NotificationHub : Hub
    {
        /// <summary>
        /// Called when a client connects. Adds them to their user-specific group.
        /// </summary>
        public override async Task OnConnectedAsync()
        {
            var userId = Context.User?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            
            if (!string.IsNullOrEmpty(userId))
            {
                await Groups.AddToGroupAsync(Context.ConnectionId, $"user_{userId}");
            }
            
            await base.OnConnectedAsync();
        }

        /// <summary>
        /// Called when a client disconnects. Removes them from their user-specific group.
        /// </summary>
        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            var userId = Context.User?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            
            if (!string.IsNullOrEmpty(userId))
            {
                await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"user_{userId}");
            }
            
            await base.OnDisconnectedAsync(exception);
        }
    }
}
