using System.Security.Cryptography;
using ClinicFlow.Api.Data;
using ClinicFlow.Api.Dtos;
using ClinicFlow.Api.Security;
using ClinicFlow.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ClinicFlow.Api.Controllers;

[Authorize]
public class PatientsController(ClinicDbContext db, ClinicService clinic, IPasswordHasher<object> hasher, LoginGuard guard) : ApiControllerBase
{
    [HttpGet]
    [Authorize(Roles = Roles.Admin)]
    public async Task<List<PatientDto>> GetAll(CancellationToken ct) =>
        (await db.Patients.AsNoTracking().OrderByDescending(p => p.RegisteredOn).ToListAsync(ct)).Select(p => p.ToDto()).ToList();

    /// <summary>The logged-in patient's own record.</summary>
    [HttpGet("me")]
    [Authorize(Roles = Roles.Patient)]
    public Task<ActionResult<PatientDto>> GetMe(CancellationToken ct) => Get(User.UserId(), ct);

    [HttpPut("me")]
    [Authorize(Roles = Roles.Patient)]
    public Task<ActionResult<PatientDto>> UpdateMe(UpdatePatientRequest req, CancellationToken ct) => Update(User.UserId(), req, ct);

    [HttpGet("{id}")]
    public async Task<ActionResult<PatientDto>> Get(string id, CancellationToken ct)
    {
        if (!User.IsAdmin() && id != User.UserId()) return Error("Patient not found.", 404);
        var p = await db.Patients.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, ct);
        return p is null ? Error("Patient not found.", 404) : p.ToDto();
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<PatientDto>> Update(string id, UpdatePatientRequest req, CancellationToken ct)
    {
        if (!User.IsAdmin() && id != User.UserId()) return Error("Patient not found.", 404);
        var r = await clinic.UpdatePatientAsync(id, req, ct);
        return r.Ok ? r.Value!.ToDto() : Fail(r);
    }

    /// <summary>Front-desk registration. Returns a one-time temporary password to give the patient.</summary>
    [HttpPost]
    [Authorize(Roles = Roles.Admin)]
    public async Task<ActionResult<CreatePatientResponse>> Create(CreatePatientRequest req, CancellationToken ct)
    {
        if (!Mapping.TryParseDate(req.Dob, out var dob)) return Error("Enter a valid date of birth.");
        var temporary = NewTemporaryPassword();
        var r = await clinic.RegisterPatientAsync(req.FullName, req.Email, temporary, req.Phone, dob, req.Gender, req.Address, ct);
        if (!r.Ok) return Fail(r);
        return CreatedAtAction(nameof(Get), new { id = r.Value!.Id }, new CreatePatientResponse(r.Value.ToDto(), temporary));
    }

    /// <summary>For a patient who forgot their password: sets a new temporary one and signs them out.</summary>
    [HttpPost("{id}/reset-password")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<ActionResult<TemporaryPasswordResponse>> ResetPassword(string id, CancellationToken ct)
    {
        var p = await db.Patients.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (p is null) return Error("Patient not found.", 404);
        var temporary = NewTemporaryPassword();
        p.PasswordHash = hasher.HashPassword(null!, temporary);
        await db.SaveChangesAsync(ct);
        guard.Forget(p.Email);
        return new TemporaryPasswordResponse(temporary);
    }

    private static string NewTemporaryPassword() => "Cf-" + Convert.ToHexString(RandomNumberGenerator.GetBytes(8)) + "!";

    [HttpPut("{id}/status")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<ActionResult<PatientDto>> SetStatus(string id, SetStatusRequest req, CancellationToken ct)
    {
        var p = await db.Patients.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (p is null) return Error("Patient not found.", 404);
        p.Status = Enum.Parse<PatientStatus>(req.Status);
        await db.SaveChangesAsync(ct);
        return p.ToDto();
    }
}
