using ClinicFlow.Api.Data;
using ClinicFlow.Api.Dtos;
using ClinicFlow.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ClinicFlow.Api.Controllers;

[Authorize(Roles = Roles.Admin)]
public class AdminController(ClinicDbContext db, IPasswordHasher<object> hasher, TimeProvider clock, IWebHostEnvironment env) : ApiControllerBase
{
    [HttpGet("profile")]
    public async Task<ActionResult<AdminProfileDto>> GetProfile(CancellationToken ct)
    {
        var admin = await CurrentAdmin(ct);
        return admin is null ? Error("Admin not found.", 404) : admin.ToDto();
    }

    [HttpPut("profile")]
    public async Task<ActionResult<AdminProfileDto>> UpdateProfile(UpdateAdminRequest req, CancellationToken ct)
    {
        var admin = await CurrentAdmin(ct);
        if (admin is null) return Error("Admin not found.", 404);
        var email = req.Email.Trim().ToLowerInvariant();
        if (await db.Patients.AnyAsync(p => p.Email == email, ct) || await db.Admins.AnyAsync(a => a.Email == email && a.Id != admin.Id, ct))
            return Error("This email is already used by another account.", 409);
        admin.FullName = req.FullName.Trim();
        admin.Email = email;
        admin.Phone = req.Phone.Trim();
        admin.ClinicName = req.ClinicName.Trim();
        await db.SaveChangesAsync(ct);
        return admin.ToDto();
    }

    [HttpPost("password")]
    public async Task<ActionResult<AdminProfileDto>> ChangePassword(ChangePasswordRequest req, CancellationToken ct)
    {
        var admin = await CurrentAdmin(ct);
        if (admin is null) return Error("Admin not found.", 404);
        if (hasher.VerifyHashedPassword(null!, admin.PasswordHash, req.Current) == PasswordVerificationResult.Failed)
            return Error("Current password is incorrect.");
        admin.PasswordHash = hasher.HashPassword(null!, req.Next);
        admin.PasswordUpdatedOn = DateOnly.FromDateTime(clock.GetLocalNow().DateTime);
        await db.SaveChangesAsync(ct);
        return admin.ToDto();
    }

    /// <summary>Restores the demo data. Only available in Development.</summary>
    [HttpPost("reset-demo")]
    public async Task<ActionResult> ResetDemo(CancellationToken ct)
    {
        if (!env.IsDevelopment()) return NotFound();
        await DemoSeeder.ResetAsync(db, clock, ct);
        return NoContent();
    }

    // Single-clinic setup: the admin token's subject is "admin", so the (only) admin row is used.
    private Task<Admin?> CurrentAdmin(CancellationToken ct) => db.Admins.OrderBy(a => a.Id).FirstOrDefaultAsync(ct);
}
