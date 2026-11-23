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
        Assert.False((await clinic.RegisterPatientAsync("Dup", DemoSeeder.AdminEmail, "Secret123", "1", null, null, null)).Ok);
    }
}
