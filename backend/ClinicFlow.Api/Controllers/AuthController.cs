using ClinicFlow.Api.Data;
using ClinicFlow.Api.Dtos;
using ClinicFlow.Api.Security;
using ClinicFlow.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;

namespace ClinicFlow.Api.Controllers;

public class AuthController(ClinicDbContext db, ClinicService clinic, TokenService tokens, IPasswordHasher<object> hasher,
    TimeProvider clock, LoginGuard guard, ILogger<AuthController> logger) : ApiControllerBase
{
    private const string InvalidLogin = "Incorrect email or password.";

    /// <summary>Logs in an admin or a patient.</summary>
    [HttpPost("login")]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimits.Auth)]
    public async Task<ActionResult<AuthResponse>> Login(LoginRequest req, CancellationToken ct)
    {
        var email = req.Email.Trim().ToLowerInvariant();
        var client = RateLimits.Client(HttpContext);
        if (guard.IsLocked(email, client))
        {
            var minutes = (int)guard.Lockout.TotalMinutes;
            Response.Headers.RetryAfter = (minutes * 60).ToString();
            return Error($"Too many failed attempts. Please try again in {minutes} minutes.", 429);
        }

        var admin = await db.Admins.FirstOrDefaultAsync(a => a.Email == email, ct);
        if (admin is not null)
        {
            if (!Verify(admin.PasswordHash, req.Password, () => admin.PasswordHash = hasher.HashPassword(null!, req.Password)))
                return Rejected(email, client);
            guard.Succeeded(email, client);
            await db.SaveChangesAsync(ct);
            return Issue("admin", Roles.Admin, admin.Email, admin.PasswordHash);
        }

        var patient = await db.Patients.FirstOrDefaultAsync(p => p.Email == email, ct);
        if (patient is null)
        {
            guard.SpendVerificationTime(req.Password);
            return Rejected(email, client);
        }
        if (!Verify(patient.PasswordHash, req.Password, () => patient.PasswordHash = hasher.HashPassword(null!, req.Password)))
            return Rejected(email, client);
        guard.Succeeded(email, client);
        if (patient.Status != PatientStatus.Active)
            return Error("This account is inactive. Please contact the clinic.", 403);
        await db.SaveChangesAsync(ct);
        return Issue(patient.Id, Roles.Patient, patient.Email, patient.PasswordHash);
    }

    /// <summary>Patient self-registration; returns a token so the patient is signed in.</summary>
    [HttpPost("register")]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimits.SignUp)]
    public async Task<ActionResult<AuthResponse>> Register(RegisterRequest req, CancellationToken ct)
    {
        if (!Mapping.TryParseDate(req.Dob, out var dob) || dob > DateOnly.FromDateTime(DateTime.Today))
            return Error("Enter a valid date of birth.");
        var r = await clinic.RegisterPatientAsync(req.FullName, req.Email, req.Password, req.Phone, dob, null, null, ct);
        if (!r.Ok) return Fail(r);
        return Issue(r.Value!.Id, Roles.Patient, r.Value.Email, r.Value.PasswordHash);
    }

    /// <summary>
    /// Changes the signed-in user's password. Other sessions are signed out; the response carries a new token
    /// for this one.
    /// </summary>
    [HttpPost("password")]
    [Authorize]
    [EnableRateLimiting(RateLimits.Auth)]
    public async Task<ActionResult<AuthResponse>> ChangePassword(ChangePasswordRequest req, CancellationToken ct)
    {
        if (req.Next == req.Current) return Error("Choose a password different from the current one.");

        if (User.IsAdmin())
        {
            var admin = await db.Admins.OrderBy(a => a.Id).FirstAsync(ct);
            if (!Verify(admin.PasswordHash, req.Current, () => { })) return Error("Current password is incorrect.");
            admin.PasswordHash = hasher.HashPassword(null!, req.Next);
            admin.PasswordUpdatedOn = DateOnly.FromDateTime(clock.GetLocalNow().DateTime);
            await db.SaveChangesAsync(ct);
            return Issue("admin", Roles.Admin, admin.Email, admin.PasswordHash);
        }

        var me = User.UserId();
        var patient = await db.Patients.FirstAsync(p => p.Id == me, ct);
        if (!Verify(patient.PasswordHash, req.Current, () => { })) return Error("Current password is incorrect.");
        patient.PasswordHash = hasher.HashPassword(null!, req.Next);
        await db.SaveChangesAsync(ct);
        return Issue(patient.Id, Roles.Patient, patient.Email, patient.PasswordHash);
    }

    private ActionResult Rejected(string email, string client)
    {
        guard.Failed(email, client);
        // The email is left out of the log: it is personal data, and text chosen by the caller.
        logger.LogWarning("Failed sign-in from {Client}.", client);
        return Error(InvalidLogin, 401);
    }

    private bool Verify(string hash, string password, Action rehash)
    {
        var result = hasher.VerifyHashedPassword(null!, hash, password);
        if (result == PasswordVerificationResult.SuccessRehashNeeded) rehash();
        return result != PasswordVerificationResult.Failed;
    }

    private ActionResult<AuthResponse> Issue(string userId, string role, string email, string passwordHash)
    {
        var (token, expires) = tokens.Create(userId, role, email, passwordHash);
        return new AuthResponse(token, role.ToLowerInvariant(), userId, expires);
    }
}
