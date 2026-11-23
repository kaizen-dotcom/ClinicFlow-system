using ClinicFlow.Api.Data;
using ClinicFlow.Api.Dtos;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace ClinicFlow.Api.Services;

/// <summary>Outcome of a business operation; <see cref="Code"/> maps to an HTTP status.</summary>
public record ServiceResult<T>(T? Value, string? Error, int Code = 200)
{
    public bool Ok => Error is null;
    public static ServiceResult<T> Success(T value) => new(value, null);
    public static ServiceResult<T> Fail(string error, int code = 400) => new(default, error, code);
}

/// <summary>
/// Clinic business rules: slots, booking, appointment status changes, schedules and patient records.
/// Mirrors the Angular ClinicStore so the UI and the server agree.
/// </summary>
public class ClinicService(ClinicDbContext db, TimeProvider clock, IPasswordHasher<object> hasher)
{
    public const string DefaultApprovedNote = "Please arrive 15 minutes before your appointment and bring a valid ID and your current medication list.";
    public const string PendingNote = "Your request is awaiting clinic review. You will be notified once it is approved.";

    private DateTime Now => clock.GetLocalNow().DateTime;
    private DateOnly Today => DateOnly.FromDateTime(Now);

    // ---------------- Availability ----------------

    /// <summary>Bookable slots for a doctor on a date; booked or past slots are marked unavailable.</summary>
    public async Task<List<SlotDto>> GetSlotsAsync(string doctorId, DateOnly date, CancellationToken ct = default)
    {
        var doctor = await db.Doctors.AsNoTracking().FirstOrDefaultAsync(d => d.Id == doctorId, ct);
        if (doctor is null) return [];
        var blocks = await db.ScheduleBlocks.AsNoTracking()
            .Where(b => b.DoctorId == doctorId && b.Date == date).OrderBy(b => b.Start).ToListAsync(ct);
        var taken = (await db.Appointments.AsNoTracking()
            .Where(a => a.DoctorId == doctorId && a.Date == date &&
                        (a.Status == AppointmentStatus.Pending || a.Status == AppointmentStatus.Approved))
            .Select(a => a.Time).ToListAsync(ct)).ToHashSet();
        return BuildSlots(doctor, date, blocks, taken);
    }

    private List<SlotDto> BuildSlots(Doctor doctor, DateOnly date, IEnumerable<ScheduleBlock> blocks, HashSet<TimeOnly> taken)
    {
        var now = Now;
        var slots = new List<SlotDto>();
        foreach (var b in blocks)
        {
            for (var t = b.Start; t.AddMinutes(b.SlotMinutes) <= b.End && t.AddMinutes(b.SlotMinutes) > t; t = t.AddMinutes(b.SlotMinutes))
            {
                var booked = taken.Contains(t);
                var past = date < DateOnly.FromDateTime(now) || (date == DateOnly.FromDateTime(now) && t <= TimeOnly.FromDateTime(now));
                slots.Add(new SlotDto(t.Hhmm(), t.AddMinutes(b.SlotMinutes).Hhmm(), t.To12h(),
                    !booked && !past && doctor.Status == DoctorStatus.Active, booked));
            }
        }
        return slots;
    }

    /// <summary>Upcoming dates on which the doctor has at least one free slot.</summary>
    public async Task<List<string>> GetAvailableDatesAsync(string doctorId, int limit = 10, int horizonDays = 60, CancellationToken ct = default)
    {
        var doctor = await db.Doctors.AsNoTracking().FirstOrDefaultAsync(d => d.Id == doctorId, ct);
        if (doctor is null || doctor.Status != DoctorStatus.Active) return [];
        var to = Today.AddDays(horizonDays);
        var blocks = await db.ScheduleBlocks.AsNoTracking()
            .Where(b => b.DoctorId == doctorId && b.Date >= Today && b.Date <= to).ToListAsync(ct);
        var taken = await db.Appointments.AsNoTracking()
            .Where(a => a.DoctorId == doctorId && a.Date >= Today && a.Date <= to &&
                        (a.Status == AppointmentStatus.Pending || a.Status == AppointmentStatus.Approved))
            .Select(a => new { a.Date, a.Time }).ToListAsync(ct);

        var result = new List<string>();
        foreach (var day in blocks.GroupBy(b => b.Date).OrderBy(g => g.Key))
        {
            var takenToday = taken.Where(x => x.Date == day.Key).Select(x => x.Time).ToHashSet();
            if (BuildSlots(doctor, day.Key, day.OrderBy(b => b.Start), takenToday).Any(s => s.Available)) result.Add(day.Key.Iso());
            if (result.Count >= limit) break;
        }
        return result;
    }

    /// <summary>Schedule blocks plus booked times (no patient data) for a date range — lets the UI draw slots.</summary>
    public async Task<AvailabilityDto> GetAvailabilityAsync(DateOnly from, DateOnly to, CancellationToken ct = default)
    {
        var blocks = await db.ScheduleBlocks.AsNoTracking().Where(b => b.Date >= from && b.Date <= to)
            .OrderBy(b => b.Date).ThenBy(b => b.Start).ToListAsync(ct);
        var busy = await db.Appointments.AsNoTracking()
            .Where(a => a.Date >= from && a.Date <= to && (a.Status == AppointmentStatus.Pending || a.Status == AppointmentStatus.Approved))
            .Select(a => new { a.DoctorId, a.Date, a.Time }).ToListAsync(ct);
        return new AvailabilityDto(
            blocks.Select(b => b.ToDto()).ToList(),
            busy.Select(x => new BusySlotDto(x.DoctorId, x.Date.Iso(), x.Time.Hhmm())).ToList());
    }

    // ---------------- Appointments ----------------

    public IQueryable<Appointment> AppointmentsQuery() =>
        db.Appointments.AsNoTracking().Include(a => a.Patient).Include(a => a.Doctor).Include(a => a.History);

    /// <summary>Creates a booking. Patients' requests start Pending; staff bookings are Approved.</summary>
    public async Task<ServiceResult<Appointment>> CreateAppointmentAsync(string patientId, CreateAppointmentRequest req, bool byStaff, CancellationToken ct = default)
    {
        if (!Mapping.TryParseDate(req.Date, out var date) || !Mapping.TryParseTime(req.Time, out var time))
            return ServiceResult<Appointment>.Fail("Invalid date or time.");
        var patient = await db.Patients.FirstOrDefaultAsync(p => p.Id == patientId, ct);
        if (patient is null || patient.Status != PatientStatus.Active)
            return ServiceResult<Appointment>.Fail("This patient account is not active.");

        var slot = (await GetSlotsAsync(req.DoctorId, date, ct)).FirstOrDefault(s => s.Time == time.Hhmm());
        if (slot is null) return ServiceResult<Appointment>.Fail("This time is not part of the doctor’s schedule.");
        if (!slot.Available) return ServiceResult<Appointment>.Fail("This time is no longer available. Please choose another time.", 409);

        var now = Now;
        var status = byStaff ? AppointmentStatus.Approved : AppointmentStatus.Pending;
        var appt = new Appointment
        {
            PatientId = patientId, DoctorId = req.DoctorId, Date = date, Time = time,
            Duration = (int)(TimeOnly.Parse(slot.End) - time).TotalMinutes,
            Type = req.Type.Trim(), Reason = req.Reason.Trim(), Notes = string.IsNullOrWhiteSpace(req.Notes) ? null : req.Notes.Trim(),
            FirstVisit = req.FirstVisit, Status = status, RequestedOn = now,
            ClinicNote = byStaff ? DefaultApprovedNote : PendingNote,
            History = [new AppointmentEvent { Label = byStaff ? "Booked by clinic" : "Request sent", At = now }]
        };
        appt.RefreshSlotKey();
        db.Appointments.Add(appt);
        try
        {
            await db.SaveChangesAsync(ct);
        }
        catch (DbUpdateException)
        {
            // The unique ActiveSlotKey index caught a simultaneous booking of the same slot.
            db.Entry(appt).State = EntityState.Detached;
            return ServiceResult<Appointment>.Fail("This time was just booked by someone else. Please choose another time.", 409);
        }

        var doctor = await db.Doctors.FindAsync([req.DoctorId], ct);
        await NotifyAsync(appt, doctor, byStaff ? "APPROVAL" : "REQUEST",
            byStaff ? "An appointment was booked for you" : "Appointment request sent",
            byStaff ? "Your visit is confirmed. Please arrive 15 minutes early." : "The clinic will review your request shortly.",
            "view-appointment", ct);
        return ServiceResult<Appointment>.Success(appt);
    }

    public Task<ServiceResult<Appointment>> ApproveAsync(int id, string? note, CancellationToken ct = default) =>
        TransitionAsync(id, [AppointmentStatus.Pending], AppointmentStatus.Approved, "Approved by clinic",
            a => a.ClinicNote = string.IsNullOrWhiteSpace(note) ? DefaultApprovedNote : note.Trim(),
            ("APPROVAL", "Your appointment is approved", "Your visit is confirmed. Please arrive 15 minutes early.", "view-appointment"), ct);

    public Task<ServiceResult<Appointment>> RejectAsync(int id, string? reason, CancellationToken ct = default) =>
        string.IsNullOrWhiteSpace(reason)
            ? Task.FromResult(ServiceResult<Appointment>.Fail("Please give a reason so the patient knows what to do next."))
            : TransitionAsync(id, [AppointmentStatus.Pending], AppointmentStatus.Rejected, "Rejected by clinic",
                a => a.ClinicNote = reason.Trim(),
                ("REJECTION", "Your appointment request was not approved", reason.Trim(), "book"), ct);

    public Task<ServiceResult<Appointment>> CancelAsync(int id, bool byPatient, string? reason, CancellationToken ct = default)
    {
        var by = byPatient ? "patient" : "clinic";
        var note = $"Cancelled by {by}{(string.IsNullOrWhiteSpace(reason) ? "." : ": " + reason.Trim())}";
        return TransitionAsync(id, [AppointmentStatus.Pending, AppointmentStatus.Approved], AppointmentStatus.Cancelled, $"Cancelled by {by}",
            a => a.ClinicNote = note,
            ("CANCELLATION", "Your appointment was cancelled", byPatient ? "Cancelled at your request. You can book a new visit anytime." : note, "book"), ct);
    }

    public Task<ServiceResult<Appointment>> CompleteAsync(int id, string? summary, CancellationToken ct = default) =>
        TransitionAsync(id, [AppointmentStatus.Approved], AppointmentStatus.Completed, "Visit completed",
            a => { a.VisitSummary = string.IsNullOrWhiteSpace(summary) ? null : summary.Trim(); a.ClinicNote = null; },
            ("COMPLETED", "Your visit is complete",
                string.IsNullOrWhiteSpace(summary) ? "Thank you for visiting ClinicFlow." : "Your doctor's notes are now available.", "view-appointment"), ct);

    private async Task<ServiceResult<Appointment>> TransitionAsync(
        int id, AppointmentStatus[] from, AppointmentStatus to, string label, Action<Appointment> apply,
        (string Type, string Title, string Message, string Action) notice, CancellationToken ct)
    {
        var appt = await db.Appointments.Include(a => a.History).Include(a => a.Doctor).FirstOrDefaultAsync(a => a.Id == id, ct);
        if (appt is null) return ServiceResult<Appointment>.Fail("Appointment not found.", 404);
        if (!from.Contains(appt.Status))
            return ServiceResult<Appointment>.Fail($"A {appt.Status.ToString().ToLower()} appointment can’t be {to.ToString().ToLower()}.", 409);

        apply(appt);
        appt.Status = to;
        appt.RefreshSlotKey();
        appt.History.Add(new AppointmentEvent { Label = label, At = Now });
        await db.SaveChangesAsync(ct);
        await NotifyAsync(appt, appt.Doctor, notice.Type, notice.Title, notice.Message, notice.Action, ct);
        return ServiceResult<Appointment>.Success(appt);
    }

    private async Task NotifyAsync(Appointment a, Doctor? doctor, string type, string title, string message, string actionKind, CancellationToken ct)
    {
        db.Notifications.Add(new Notification
        {
            PatientId = a.PatientId, Type = type, Title = title, Message = message, CreatedAt = Now, Read = false,
            Subtitle = $"{doctor?.Name} · {a.Date.Iso()} · {a.Time.To12h()}",
            ActionKind = actionKind,
            ActionAppointmentId = actionKind == "view-appointment" ? a.Id : null,
            ActionDoctorId = actionKind == "book" ? a.DoctorId : null
        });
        await db.SaveChangesAsync(ct);
    }

    // ---------------- Schedules ----------------

    public async Task<ServiceResult<AddAvailabilityResponse>> AddAvailabilityAsync(AddAvailabilityRequest req, CancellationToken ct = default)
    {
        if (!Mapping.TryParseDate(req.Date, out var date) || !Mapping.TryParseTime(req.Start, out var start) || !Mapping.TryParseTime(req.End, out var end))
            return ServiceResult<AddAvailabilityResponse>.Fail("Invalid date or time.");
        if (!await db.Doctors.AnyAsync(d => d.Id == req.DoctorId, ct))
            return ServiceResult<AddAvailabilityResponse>.Fail("Doctor not found.", 404);
        if ((end - start).TotalMinutes < req.SlotMinutes || end <= start)
            return ServiceResult<AddAvailabilityResponse>.Fail("End time must be at least one slot after the start time.");
        if (date < Today) return ServiceResult<AddAvailabilityResponse>.Fail("Choose today or a future date.");
        if (date.IsWeekend()) return ServiceResult<AddAvailabilityResponse>.Fail("The clinic is open Monday to Friday. Choose a weekday.");
        if (start < new TimeOnly(8, 0) || end > new TimeOnly(18, 0)) return ServiceResult<AddAvailabilityResponse>.Fail("Opening hours are 8:00 AM – 6:00 PM.");

        int created = 0, skipped = 0;
        for (var w = 0; w <= req.RepeatWeeks; w++)
        {
            var day = date.AddDays(w * 7);
            var overlaps = await db.ScheduleBlocks.AnyAsync(b => b.DoctorId == req.DoctorId && b.Date == day && b.Start < end && start < b.End, ct);
            if (overlaps) { skipped++; continue; }
            db.ScheduleBlocks.Add(new ScheduleBlock { DoctorId = req.DoctorId, Date = day, Start = start, End = end, SlotMinutes = req.SlotMinutes });
            created++;
        }
        if (created == 0) return ServiceResult<AddAvailabilityResponse>.Fail("These hours overlap existing availability.", 409);
        await db.SaveChangesAsync(ct);
        return ServiceResult<AddAvailabilityResponse>.Success(new AddAvailabilityResponse(created, skipped));
    }

    public async Task<ServiceResult<bool>> RemoveAvailabilityAsync(int blockId, CancellationToken ct = default)
    {
        var block = await db.ScheduleBlocks.FirstOrDefaultAsync(b => b.Id == blockId, ct);
        if (block is null) return ServiceResult<bool>.Fail("Block not found.", 404);
        var booked = await db.Appointments.CountAsync(a => a.DoctorId == block.DoctorId && a.Date == block.Date &&
            a.Time >= block.Start && a.Time < block.End &&
            (a.Status == AppointmentStatus.Pending || a.Status == AppointmentStatus.Approved), ct);
        if (booked > 0) return ServiceResult<bool>.Fail($"This block has {booked} booked appointment(s). Cancel or move them first.", 409);
        db.ScheduleBlocks.Remove(block);
        await db.SaveChangesAsync(ct);
        return ServiceResult<bool>.Success(true);
    }

    // ---------------- Patients ----------------

    public async Task<ServiceResult<Patient>> RegisterPatientAsync(string fullName, string email, string password, string phone,
        DateOnly? dob, string? gender, string? address, CancellationToken ct = default)
    {
        var normalized = email.Trim().ToLowerInvariant();
        if (await db.Patients.AnyAsync(p => p.Email == normalized, ct) || await db.Admins.AnyAsync(a => a.Email == normalized, ct))
            return ServiceResult<Patient>.Fail("An account with this email already exists.", 409);

        var numbers = await db.Patients.Select(p => p.Id).ToListAsync(ct);
        var next = numbers.Select(id => int.TryParse(id.Replace("CF-", ""), out var n) ? n : 0).DefaultIfEmpty(1000).Max() + 1;
        var patient = new Patient
        {
            Id = $"CF-{next}", FullName = fullName.Trim(), Email = normalized, Phone = phone.Trim(), Dob = dob,
            Gender = gender?.Trim() ?? "", Address = address?.Trim() ?? "", RegisteredOn = Today,
            Status = PatientStatus.Active, EmailUpdates = true, PasswordHash = hasher.HashPassword(null!, password)
        };
        db.Patients.Add(patient);
        try
        {
            await db.SaveChangesAsync(ct);
        }
        catch (DbUpdateException)
        {
            db.Entry(patient).State = EntityState.Detached;
            return ServiceResult<Patient>.Fail("An account with this email already exists.", 409);
        }
        return ServiceResult<Patient>.Success(patient);
    }

    public async Task<ServiceResult<Patient>> UpdatePatientAsync(string id, UpdatePatientRequest req, CancellationToken ct = default)
    {
        var p = await db.Patients.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (p is null) return ServiceResult<Patient>.Fail("Patient not found.", 404);
        if (req.Email is not null)
        {
            var email = req.Email.Trim().ToLowerInvariant();
            if (await db.Patients.AnyAsync(x => x.Email == email && x.Id != id, ct) || await db.Admins.AnyAsync(a => a.Email == email, ct))
                return ServiceResult<Patient>.Fail("Another account already uses this email.", 409);
            p.Email = email;
        }
        if (req.Dob is not null)
        {
            if (req.Dob == "") p.Dob = null;
            else if (Mapping.TryParseDate(req.Dob, out var dob)) p.Dob = dob;
            else return ServiceResult<Patient>.Fail("Invalid date of birth.");
        }
        if (!string.IsNullOrWhiteSpace(req.FullName)) p.FullName = req.FullName.Trim();
        if (req.Phone is not null) p.Phone = req.Phone.Trim();
        if (req.Gender is not null) p.Gender = req.Gender.Trim();
        if (req.Address is not null) p.Address = req.Address.Trim();
        if (req.EmailUpdates is bool e) p.EmailUpdates = e;
        await db.SaveChangesAsync(ct);
        return ServiceResult<Patient>.Success(p);
    }
}
