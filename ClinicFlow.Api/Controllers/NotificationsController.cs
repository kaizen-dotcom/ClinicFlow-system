using ClinicFlow.Api.Data;
using ClinicFlow.Api.Dtos;
using ClinicFlow.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ClinicFlow.Api.Controllers;

/// <summary>The logged-in patient's notifications.</summary>
[Authorize(Roles = Roles.Patient)]
public class NotificationsController(ClinicDbContext db) : ApiControllerBase
{
    [HttpGet]
    public async Task<List<NotificationDto>> GetAll(CancellationToken ct)
    {
        var me = User.UserId();
        return (await db.Notifications.AsNoTracking().Where(n => n.PatientId == me)
            .OrderByDescending(n => n.CreatedAt).Take(200).ToListAsync(ct)).Select(n => n.ToDto()).ToList();
    }

    [HttpPost("{id:int}/read")]
    public async Task<ActionResult> MarkRead(int id, CancellationToken ct)
    {
        var me = User.UserId();
        var n = await db.Notifications.FirstOrDefaultAsync(x => x.Id == id && x.PatientId == me, ct);
        if (n is null) return Error("Notification not found.", 404);
        n.Read = true;
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpPost("read-all")]
    public async Task<ActionResult> MarkAllRead(CancellationToken ct)
    {
        var me = User.UserId();
        await db.Notifications.Where(n => n.PatientId == me && !n.Read)
            .ExecuteUpdateAsync(s => s.SetProperty(n => n.Read, true), ct);
        return NoContent();
    }
}
