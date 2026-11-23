using System.Text.RegularExpressions;
using ClinicFlow.Api.Data;
using ClinicFlow.Api.Dtos;
using ClinicFlow.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ClinicFlow.Api.Controllers;

[Authorize]
public partial class DoctorsController(ClinicDbContext db, ClinicService clinic) : ApiControllerBase
{
    [HttpGet]
    public async Task<List<DoctorDto>> GetAll(CancellationToken ct) =>
        (await db.Doctors.AsNoTracking().OrderBy(d => d.Name).ToListAsync(ct)).Select(d => d.ToDto()).ToList();

    [HttpGet("{id}")]
    public async Task<ActionResult<DoctorDto>> Get(string id, CancellationToken ct)
    {
        var d = await db.Doctors.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, ct);
        return d is null ? Error("Doctor not found.", 404) : d.ToDto();
    }

    /// <summary>Slots for one date, e.g. GET /api/doctors/amelia-brooks/slots?date=2026-11-25</summary>
    [HttpGet("{id}/slots")]
    public async Task<ActionResult<List<SlotDto>>> Slots(string id, [FromQuery] string date, CancellationToken ct)
    {
        if (!Mapping.TryParseDate(date, out var d)) return Error("Use date=yyyy-MM-dd.");
        return await clinic.GetSlotsAsync(id, d, ct);
    }

    /// <summary>Next dates with at least one free slot.</summary>
    [HttpGet("{id}/available-dates")]
    public Task<List<string>> AvailableDates(string id, [FromQuery] int limit = 10, CancellationToken ct = default) =>
        clinic.GetAvailableDatesAsync(id, Math.Clamp(limit, 1, 60), 60, ct);

    [HttpPost]
    [Authorize(Roles = Roles.Admin)]
    public async Task<ActionResult<DoctorDto>> Create(SaveDoctorRequest req, CancellationToken ct)
    {
        var slug = SlugRegex().Replace(Regex.Replace(req.Name.ToLowerInvariant(), @"^dr\.?\s*", ""), "-").Trim('-');
        if (slug.Length == 0) slug = "doctor";
        var id = slug;
        for (var i = 2; await db.Doctors.AnyAsync(d => d.Id == id, ct); i++) id = $"{slug}-{i}";

        var doctor = new Doctor { Id = id };
        Apply(doctor, req);
        db.Doctors.Add(doctor);
        await db.SaveChangesAsync(ct);
        return CreatedAtAction(nameof(Get), new { id }, doctor.ToDto());
    }

    [HttpPut("{id}")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<ActionResult<DoctorDto>> Update(string id, SaveDoctorRequest req, CancellationToken ct)
    {
        var doctor = await db.Doctors.FirstOrDefaultAsync(d => d.Id == id, ct);
        if (doctor is null) return Error("Doctor not found.", 404);
        Apply(doctor, req);
        await db.SaveChangesAsync(ct);
        return doctor.ToDto();
    }

    private static void Apply(Doctor d, SaveDoctorRequest req)
    {
        d.Name = req.Name.Trim();
        d.Specialty = req.Specialty.Trim();
        d.Title = req.Title?.Trim() ?? "";
        d.Email = req.Email.Trim().ToLowerInvariant();
        d.Phone = req.Phone?.Trim() ?? "";
        d.ExperienceYears = req.ExperienceYears;
        d.Languages = req.Languages?.Trim() ?? "";
        d.Location = req.Location.Trim();
        d.Bio = req.Bio?.Trim() ?? "";
        d.Status = Mapping.ParseDoctorStatus(req.Status);
    }

    [GeneratedRegex("[^a-z0-9]+")]
    private static partial Regex SlugRegex();
}
