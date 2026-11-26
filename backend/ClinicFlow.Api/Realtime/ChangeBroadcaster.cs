using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore.Diagnostics;

namespace ClinicFlow.Api.Realtime;

/// <summary>
/// Tells every connected browser to reload after anything is saved to the database, whether it came from a
/// request or from a background job. (Bulk updates that bypass SaveChanges are not announced.)
/// </summary>
public class ChangeBroadcaster(IHubContext<ClinicHub> hub, ILogger<ChangeBroadcaster> logger) : SaveChangesInterceptor
{
    public override async ValueTask<int> SavedChangesAsync(SaveChangesCompletedEventData eventData, int result,
        CancellationToken cancellationToken = default)
    {
        if (result > 0)
        {
            try
            {
                // Not tied to the request's cancellation: the data is already saved.
                await hub.Clients.All.SendAsync(ClinicHub.ChangedMessage, CancellationToken.None);
            }
            catch (Exception e)
            {
                // A failed announcement must never fail the save; browsers also check periodically.
                logger.LogWarning(e, "Could not announce a change to connected browsers.");
            }
        }
        return result;
    }
}
