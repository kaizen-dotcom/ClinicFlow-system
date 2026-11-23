using ClinicFlow.Api.Data;
using ClinicFlow.Api.Dtos;
using ClinicFlow.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ClinicFlow.Api.Controllers;

/// <summary>
/// Admins see and manage every appointment; patients only see and cancel their own.
/// Appointment ids are "APT-1001" style references.
/// </summary>
[Authorize]
public class AppointmentsController(ClinicService clinic) : ApiControllerBase
{
    [HttpGet]
    public async Task<List<AppointmentDto>> GetAll([FromQuery] string? status, [FromQuery] string? doctorId,
        [FromQuery] string? patientId, CancellationToken ct)
    {
        var q = clinic.AppointmentsQuery();
        var me = User.UserId();
        if (!User.IsAdmin()) q = q.Where(a => a.PatientId == me);
        else if (!string.IsNullOrEmpty(patientId)) q = q.Where(a => a.PatientId == patientId);
        if (Enum.TryParse<AppointmentStatus>(status, true, out var s)) q = q.Where(a => a.Status == s);
        if (!string.IsNullOrEmpty(doctorId)) q = q.Where(a => a.DoctorId == doctorId);
        var list = await q.OrderBy(a => a.Date).ThenBy(a => a.Time).ToListAsync(ct);
        return list.Select(a => a.ToDto()).ToList();
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<AppointmentDto>> Get(string id, CancellationToken ct)
    {
        var a = await Find(id, ct);
        return a is null ? Error("Appointment not found.", 404) : a.ToDto();
    }

    /// <summary>Patients request (Pending); admins book for a patient (Approved, requires patientId).</summary>
    [HttpPost]
    public async Task<ActionResult<AppointmentDto>> Create(CreateAppointmentRequest req, CancellationToken ct)
    {
        var byStaff = User.IsAdmin();
        var patientId = byStaff ? req.PatientId : User.UserId();
        if (string.IsNullOrEmpty(patientId)) return Error("Choose a patient.");

        var r = await clinic.CreateAppointmentAsync(patientId, req, byStaff, ct);
        if (!r.Ok) return Fail(r);
        var created = await clinic.AppointmentsQuery().FirstAsync(a => a.Id == r.Value!.Id, ct);
        return CreatedAtAction(nameof(Get), new { id = Mapping.AppointmentRef(created.Id) }, created.ToDto());
    }

    [HttpPost("{id}/approve")]
    [Authorize(Roles = Roles.Admin)]
    public Task<ActionResult<AppointmentDto>> Approve(string id, NoteRequest req, CancellationToken ct) =>
        Run(id, n => clinic.ApproveAsync(n, req.Text, ct), ct);

    [HttpPost("{id}/reject")]
    [Authorize(Roles = Roles.Admin)]
    public Task<ActionResult<AppointmentDto>> Reject(string id, NoteRequest req, CancellationToken ct) =>
        Run(id, n => clinic.RejectAsync(n, req.Text, ct), ct);

    [HttpPost("{id}/complete")]
    [Authorize(Roles = Roles.Admin)]
    public Task<ActionResult<AppointmentDto>> Complete(string id, NoteRequest req, CancellationToken ct) =>
        Run(id, n => clinic.CompleteAsync(n, req.Text, ct), ct);

    /// <summary>Patients can cancel their own appointments; admins can cancel any.</summary>
    [HttpPost("{id}/cancel")]
    public async Task<ActionResult<AppointmentDto>> Cancel(string id, NoteRequest req, CancellationToken ct)
    {
        var existing = await Find(id, ct);
        if (existing is null) return Error("Appointment not found.", 404);
        return await Run(id, n => clinic.CancelAsync(n, !User.IsAdmin(), req.Text, ct), ct);
    }

    /// <summary>Loads an appointment visible to the current user (patients: own only).</summary>
    private async Task<Appointment?> Find(string id, CancellationToken ct)
    {
        if (!Mapping.TryParseAppointmentRef(id, out var n)) return null;
        var a = await clinic.AppointmentsQuery().FirstOrDefaultAsync(x => x.Id == n, ct);
        return a is null || (!User.IsAdmin() && a.PatientId != User.UserId()) ? null : a;
    }

    private async Task<ActionResult<AppointmentDto>> Run(string id, Func<int, Task<ServiceResult<Appointment>>> action, CancellationToken ct)
    {
        if (!Mapping.TryParseAppointmentRef(id, out var n)) return Error("Appointment not found.", 404);
        var r = await action(n);
        if (!r.Ok) return Fail(r);
        var fresh = await clinic.AppointmentsQuery().FirstAsync(a => a.Id == n, ct);
        return fresh.ToDto();
    }
}
