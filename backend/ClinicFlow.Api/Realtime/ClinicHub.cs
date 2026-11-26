using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace ClinicFlow.Api.Realtime;

/// <summary>
/// The live connection each signed-in browser keeps open. The server only sends "changed" (no data); the
/// browser then reloads through the normal API, so each user still receives only what they are allowed to see.
/// </summary>
[Authorize]
public class ClinicHub : Hub
{
    public const string Path = "/hubs/clinic";
    public const string ChangedMessage = "changed";
}
