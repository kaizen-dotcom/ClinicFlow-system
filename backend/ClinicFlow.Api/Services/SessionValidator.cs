using ClinicFlow.Api.Data;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;

namespace ClinicFlow.Api.Services;

/// <summary>
/// Checked on every request, so deactivating an account or changing its password ends its sessions at once.
/// </summary>
public static class SessionValidator
{
    public static async Task ValidateAsync(TokenValidatedContext context)
    {
        var user = context.Principal!;
        var db = context.HttpContext.RequestServices.GetRequiredService<ClinicDbContext>();
        var ct = context.HttpContext.RequestAborted;

        string? hash;
        if (user.IsAdmin())
        {
            hash = await db.Admins.OrderBy(a => a.Id).Select(a => a.PasswordHash).FirstOrDefaultAsync(ct);
        }
        else
        {
            var id = user.UserId();
            hash = await db.Patients.Where(p => p.Id == id && p.Status == PatientStatus.Active)
                .Select(p => p.PasswordHash).FirstOrDefaultAsync(ct);
        }

        if (hash is null || user.FindFirst(TokenService.StampClaim)?.Value != TokenService.Stamp(hash))
            context.Fail("This session has ended. Please log in again.");
    }
}
