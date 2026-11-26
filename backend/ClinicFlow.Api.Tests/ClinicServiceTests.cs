using ClinicFlow.Api.Data;
using ClinicFlow.Api.Dtos;
using ClinicFlow.Api.Services;
using Microsoft.EntityFrameworkCore;

namespace ClinicFlow.Api.Tests;

public class ClinicServiceTests
{
    private static async Task<(string Date, string Time)> FreeSlot(ClinicService clinic, string doctorId = "amelia-brooks")
    {
        var date = (await clinic.GetAvailableDatesAsync(doctorId, 1)).Single();
        var slot = (await clinic.GetSlotsAsync(doctorId, DateOnly.Parse(date))).First(s => s.Available);
        return (date, slot.Time);
    }

    private static CreateAppointmentRequest Request(string date, string time, string doctorId = "amelia-brooks") =>
        new(null, doctorId, date, time, "General consultation", "Check-up", null, false);

    [Fact]
    public async Task Slots_hide_past_times_today()
    {
        var (_, clinic, clock) = await TestDb.CreateAsync();
        clock.Now = clock.Now.AddHours(3); // 10:00
        var today = DateOnly.FromDateTime(clock.Now.DateTime);
        var slots = await clinic.GetSlotsAsync("amelia-brooks", today);
        Assert.All(slots.Where(s => string.CompareOrdinal(s.Time, "10:00") <= 0), s => Assert.False(s.Available));
        Assert.Contains(slots, s => s.Available);
    }

    [Fact]
    public async Task Patient_request_is_pending_and_blocks_the_slot()
    {
        var (db, clinic, _) = await TestDb.CreateAsync();
        var (date, time) = await FreeSlot(clinic);

        var r = await clinic.CreateAppointmentAsync("CF-1024", Request(date, time), byStaff: false);
        Assert.True(r.Ok, r.Error);
        Assert.Equal(AppointmentStatus.Pending, r.Value!.Status);
        Assert.NotNull(r.Value.ActiveSlotKey);

        var second = await clinic.CreateAppointmentAsync("CF-1025", Request(date, time), byStaff: false);
        Assert.False(second.Ok);
        Assert.Equal(409, second.Code);
        Assert.True(await db.Notifications.AnyAsync(n => n.PatientId == "CF-1024" && n.Type == "REQUEST"));
    }

    [Fact]
    public async Task Staff_booking_is_approved()
    {
        var (_, clinic, _) = await TestDb.CreateAsync();
        var (date, time) = await FreeSlot(clinic);
        var r = await clinic.CreateAppointmentAsync("CF-1025", Request(date, time), byStaff: true);
        Assert.Equal(AppointmentStatus.Approved, r.Value!.Status);
    }

    [Fact]
    public async Task Inactive_patients_and_doctors_on_leave_cannot_book()
    {
        var (_, clinic, _) = await TestDb.CreateAsync();
        var (date, time) = await FreeSlot(clinic);
        Assert.False((await clinic.CreateAppointmentAsync("CF-1031", Request(date, time), false)).Ok); // Lucas Taylor is inactive
        Assert.Empty(await clinic.GetAvailableDatesAsync("grace-lewis"));                              // on leave
    }

    [Fact]
    public async Task Approve_notifies_patient_and_reject_needs_reason()
    {
        var (db, clinic, _) = await TestDb.CreateAsync();
        var (date, time) = await FreeSlot(clinic);
        var a = (await clinic.CreateAppointmentAsync("CF-1024", Request(date, time), false)).Value!;

        Assert.False((await clinic.RejectAsync(a.Id, "  ")).Ok);
        Assert.True((await clinic.ApproveAsync(a.Id, null)).Ok);
        Assert.True(await db.Notifications.AnyAsync(n => n.Type == "APPROVAL" && n.ActionAppointmentId == a.Id));

        var rejectAfterApprove = await clinic.RejectAsync(a.Id, "Too late");
        Assert.False(rejectAfterApprove.Ok);
        Assert.Equal(409, rejectAfterApprove.Code);
    }

    [Fact]
    public async Task Cancel_frees_the_slot_and_complete_requires_approval()
    {
        var (_, clinic, _) = await TestDb.CreateAsync();
        var (date, time) = await FreeSlot(clinic);
        var a = (await clinic.CreateAppointmentAsync("CF-1024", Request(date, time), false)).Value!;

        Assert.False((await clinic.CompleteAsync(a.Id, "notes")).Ok);
        var cancelled = await clinic.CancelAsync(a.Id, byPatient: true, "Conflict");
        Assert.True(cancelled.Ok);
        Assert.Null(cancelled.Value!.ActiveSlotKey);
        Assert.Equal("Cancelled by patient: Conflict", cancelled.Value.ClinicNote);

        var slot = (await clinic.GetSlotsAsync("amelia-brooks", DateOnly.Parse(date))).Single(s => s.Time == time);
        Assert.True(slot.Available);
    }

    /// <summary>The nth free slot on the first available date that is after today.</summary>
    private static async Task<(string Date, string Time)> LaterSlot(ClinicService clinic, int n, string doctorId = "sophia-lee")
    {
        var date = (await clinic.GetAvailableDatesAsync(doctorId, 10)).Last();
        var slot = (await clinic.GetSlotsAsync(doctorId, DateOnly.Parse(date))).Where(s => s.Available).ElementAt(n);
        return (date, slot.Time);
    }

    [Fact]
    public async Task Patient_cannot_book_two_visits_at_the_same_time()
    {
        var (_, clinic, _) = await TestDb.CreateAsync();
        var (date, time) = await LaterSlot(clinic, 0);
        Assert.True((await clinic.CreateAppointmentAsync("CF-1025", Request(date, time, "sophia-lee"), false)).Ok);

        var clash = await clinic.CreateAppointmentAsync("CF-1025", Request(date, time, "amelia-brooks"), false);
        Assert.Equal(409, clash.Code);
        Assert.Contains("already have an appointment", clash.Error);
    }

    [Fact]
    public async Task Pending_requests_are_limited_for_patients_but_not_staff()
    {
        var (db, clinic, _) = await TestDb.CreateAsync();
        var already = await db.Appointments.CountAsync(a => a.PatientId == "CF-1027" && a.Status == AppointmentStatus.Pending);
        for (var i = already; i < ClinicService.MaxPendingRequests; i++)
        {
            var (d, t) = await LaterSlot(clinic, i);
            Assert.True((await clinic.CreateAppointmentAsync("CF-1027", Request(d, t, "sophia-lee"), false)).Ok);
        }
        var (date, time) = await LaterSlot(clinic, 0);
        var over = await clinic.CreateAppointmentAsync("CF-1027", Request(date, time, "sophia-lee"), false);
        Assert.Contains("waiting for review", over.Error);
        Assert.True((await clinic.CreateAppointmentAsync("CF-1027", Request(date, time, "sophia-lee"), true)).Ok);
    }

    [Fact]
    public async Task Visits_can_only_be_completed_or_missed_after_they_start()
    {
        var (_, clinic, clock) = await TestDb.CreateAsync();
        var (date, time) = await LaterSlot(clinic, 0);
        var a = (await clinic.CreateAppointmentAsync("CF-1025", Request(date, time, "sophia-lee"), true)).Value!;
        Assert.Equal(409, (await clinic.CompleteAsync(a.Id, null)).Code);
        Assert.Equal(409, (await clinic.MarkNoShowAsync(a.Id, null)).Code);

        clock.Now = new DateTimeOffset(a.Date.ToDateTime(a.Time).AddMinutes(1), TimeSpan.Zero);
        Assert.False((await clinic.CancelAsync(a.Id, byPatient: true, null)).Ok);
        var missed = await clinic.MarkNoShowAsync(a.Id, null);
        Assert.True(missed.Ok, missed.Error);
        Assert.Equal(AppointmentStatus.NoShow, missed.Value!.Status);
        Assert.Null(missed.Value.ActiveSlotKey);
    }

    [Fact]
    public async Task Unreviewed_requests_expire_and_cannot_be_approved()
    {
        var (db, clinic, clock) = await TestDb.CreateAsync();
        var (date, time) = await LaterSlot(clinic, 0);
        var a = (await clinic.CreateAppointmentAsync("CF-1025", Request(date, time, "sophia-lee"), false)).Value!;
        clock.Now = new DateTimeOffset(a.Date.ToDateTime(a.Time).AddMinutes(1), TimeSpan.Zero);
        db.ChangeTracker.Clear();

        Assert.Equal(409, (await clinic.ApproveAsync(a.Id, null)).Code);
        Assert.True(await clinic.ExpireStaleRequestsAsync() >= 1);
        Assert.Equal(AppointmentStatus.Expired, (await db.Appointments.AsNoTracking().SingleAsync(x => x.Id == a.Id)).Status);
        Assert.True(await db.Notifications.AnyAsync(n => n.PatientId == "CF-1025" && n.Type == "EXPIRED"));
        Assert.Equal(0, await clinic.ExpireStaleRequestsAsync());
    }

    [Fact]
    public async Task Reschedule_frees_the_old_slot_and_patient_changes_need_review()
    {
        var (_, clinic, _) = await TestDb.CreateAsync();
        var (date, first) = await LaterSlot(clinic, 0);
        var (_, second) = await LaterSlot(clinic, 1);
        var a = (await clinic.CreateAppointmentAsync("CF-1025", Request(date, first, "sophia-lee"), true)).Value!;

        var moved = await clinic.RescheduleAsync(a.Id, new RescheduleRequest(date, second), byStaff: false);
        Assert.True(moved.Ok, moved.Error);
        Assert.Equal(AppointmentStatus.Pending, moved.Value!.Status);
        var slots = await clinic.GetSlotsAsync("sophia-lee", DateOnly.Parse(date));
        Assert.True(slots.Single(s => s.Time == first).Available);
        Assert.False(slots.Single(s => s.Time == second).Available);

        var back = await clinic.RescheduleAsync(a.Id, new RescheduleRequest(date, first), byStaff: true);
        Assert.Equal(AppointmentStatus.Approved, back.Value!.Status);
        Assert.Equal(409, (await clinic.RescheduleAsync(a.Id, new RescheduleRequest(date, first), true)).Code);
    }

    [Fact]
    public async Task Availability_skips_overlaps_and_booked_blocks_cannot_be_removed()
    {
        var (db, clinic, _) = await TestDb.CreateAsync();
        var (date, time) = await FreeSlot(clinic);

        var overlap = await clinic.AddAvailabilityAsync(new AddAvailabilityRequest("amelia-brooks", date, "10:00", "11:00", 30, 0));
        Assert.False(overlap.Ok);

        await clinic.CreateAppointmentAsync("CF-1024", Request(date, time), false);
        var t = TimeOnly.Parse(time);
        var block = await db.ScheduleBlocks.FirstAsync(b => b.DoctorId == "amelia-brooks" && b.Date == DateOnly.Parse(date) && b.Start <= t && b.End > t);
        Assert.False((await clinic.RemoveAvailabilityAsync(block.Id)).Ok);
    }

    [Fact]
    public async Task Weekend_and_past_availability_is_rejected()
    {
        var (_, clinic, clock) = await TestDb.CreateAsync();
        var today = DateOnly.FromDateTime(clock.Now.DateTime);
        var saturday = today.AddDays(((int)DayOfWeek.Saturday - (int)today.DayOfWeek + 7) % 7);
        Assert.False((await clinic.AddAvailabilityAsync(new AddAvailabilityRequest("amelia-brooks", saturday.Iso(), "09:00", "10:00", 30, 0))).Ok);
        Assert.False((await clinic.AddAvailabilityAsync(new AddAvailabilityRequest("amelia-brooks", today.AddDays(-7).Iso(), "09:00", "10:00", 30, 0))).Ok);
    }

    [Fact]
    public async Task Registration_rejects_duplicate_emails_and_assigns_next_id()
    {
        var (_, clinic, _) = await TestDb.CreateAsync();
        var r = await clinic.RegisterPatientAsync("Ana Cruz", "Ana@Example.com", "Secret123", "+1 555", null, null, null);
        Assert.True(r.Ok);
        Assert.Equal("CF-1033", r.Value!.Id);
        Assert.Equal("ana@example.com", r.Value.Email);
        Assert.NotEqual("Secret123", r.Value.PasswordHash);

        Assert.False((await clinic.RegisterPatientAsync("Dup", "ana@example.com", "Secret123", "1", null, null, null)).Ok);
        Assert.False((await clinic.RegisterPatientAsync("Dup", TestData.AdminEmail, "Secret123", "1", null, null, null)).Ok);
    }
}
