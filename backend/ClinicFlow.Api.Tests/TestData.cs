using ClinicFlow.Api.Data;
using ClinicFlow.Api.Services;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace ClinicFlow.Api.Tests;

/// <summary>Sample records used only by the automated tests (in-memory database).</summary>
public static class TestData
{
    public const string AdminEmail = "admin@clinicflow.com";
    public const string AdminPassword = "Admin@123";
    public const string PatientPassword = "Patient@123";

    public static async Task SeedIfEmptyAsync(ClinicDbContext db, TimeProvider clock, CancellationToken ct = default)
    {
        if (await db.Admins.AnyAsync(ct)) return;
        await SeedAsync(db, clock, ct);
    }

    private static async Task SeedAsync(ClinicDbContext db, TimeProvider clock, CancellationToken ct)
    {
        var hasher = new PasswordHasher<object>();
        var now = clock.GetLocalNow().DateTime;
        var today = DateOnly.FromDateTime(now);
        var d0 = today.AddWeekdays(0);

        db.Admins.Add(new Admin
        {
            FullName = "Reynier Forth", Email = AdminEmail, Phone = "+1 (212) 555-0148",
            PasswordHash = hasher.HashPassword(null!, AdminPassword), PasswordUpdatedOn = today.AddDays(-27),
            ClinicName = "ClinicFlow Medical Center"
        });

        Doctor Doc(string id, string name, string specialty, string title, int years, string languages, string room, string bio,
                   DoctorStatus status = DoctorStatus.Active) => new()
        {
            Id = id, Name = name, Specialty = specialty, Title = title, ExperienceYears = years, Languages = languages,
            Location = room, Bio = bio, Status = status,
            Email = $"{id[0]}.{id.Split('-')[1]}@clinicflow.com", Phone = $"+1 (212) 555-01{name.Length:00}"
        };

        var doctors = new[]
        {
            Doc("amelia-brooks", "Dr. Amelia Brooks", "General medicine", "MD · Board-certified family physician", 12, "English · Spanish", "Room 204",
                "Thoughtful, preventive care for adults and families. Specializing in routine check-ups, chronic condition management, and helping you feel confident about your health."),
            Doc("daniel-kim", "Dr. Daniel Kim", "Cardiology", "MD · Interventional cardiologist", 10, "English · Korean", "Room 108",
                "Focused on heart health, preventive screening, and personalized care plans for patients with long-term cardiovascular concerns."),
            Doc("maya-patel", "Dr. Maya Patel", "Dentistry", "DDS · Cosmetic and restorative dentist", 8, "English · Hindi", "Room 105",
                "Provides restorative, preventive, and cosmetic dental care with a gentle approach tailored to each patient’s smile goals."),
            Doc("james-carter", "Dr. James Carter", "Dermatology", "MD · Dermatology specialist", 9, "English", "Room 302",
                "Helps patients treat acne, rashes, and skin conditions with evidence-based dermatology care and long-term skin health planning."),
            Doc("sophia-lee", "Dr. Sophia Lee", "Pediatrics", "MD · Pediatrician", 11, "English · Mandarin", "Room 210",
                "Compassionate pediatric care for infants, children, and adolescents with preventive visits and family-centered treatment plans."),
            Doc("noah-williams", "Dr. Noah Williams", "Orthopedics", "MD · Orthopedic surgeon", 14, "English", "Room 115",
                "Treats bone, joint, and sports injuries with a focus on mobility restoration, pain management, and surgical recovery planning."),
            Doc("grace-lewis", "Dr. Grace Lewis", "General medicine", "MD · Internal medicine", 7, "English · French", "Room 206",
                "Internal medicine physician focused on adult preventive care and managing long-term conditions.", DoctorStatus.OnLeave)
        };
        db.Doctors.AddRange(doctors);

        // One shared hash for all demo patients keeps seeding fast (demo data only).
        var patientHash = hasher.HashPassword(null!, PatientPassword);
        Patient Pat(string id, string name, string email, string phone, string dob, string gender, int registeredDaysAgo,
                    PatientStatus status = PatientStatus.Active, string address = "") => new()
        {
            Id = id, FullName = name, Email = email, Phone = phone, Dob = DateOnly.Parse(dob), Gender = gender, Address = address,
            RegisteredOn = today.AddDays(-registeredDaysAgo), Status = status, PasswordHash = patientHash, EmailUpdates = true
        };
        db.Patients.AddRange(
            Pat("CF-1024", "Emma Wilson", "emma.wilson@example.com", "+1 (555) 014-2086", "1992-03-14", "Female", 50, address: "24 Oak Street, Springfield"),
            Pat("CF-1025", "James Anderson", "j.anderson@example.com", "+1 (555) 013-4410", "1985-07-02", "Male", 40),
            Pat("CF-1026", "Olivia Martin", "olivia.m@example.com", "+1 (555) 019-2231", "1998-11-21", "Female", 33),
            Pat("CF-1027", "Liam Johnson", "liam.j@example.com", "+1 (555) 017-8890", "1979-01-09", "Male", 28),
            Pat("CF-1028", "Sophia Davis", "sophia.d@example.com", "+1 (555) 012-6674", "2001-05-30", "Female", 21),
            Pat("CF-1029", "Noah Garcia", "noah.g@example.com", "+1 (555) 018-3321", "1990-09-17", "Male", 15),
            Pat("CF-1030", "Isabella Brown", "isabella.b@example.com", "+1 (555) 011-9045", "1995-02-25", "Female", 9),
            Pat("CF-1031", "Lucas Taylor", "lucas.t@example.com", "+1 (555) 016-7712", "1988-12-03", "Male", 6, PatientStatus.Inactive),
            Pat("CF-1032", "Mia Thompson", "mia.t@example.com", "+1 (555) 015-5528", "2003-08-14", "Female", 2));

        // Weekday availability from 3 weeks ago to 6 weeks ahead for every active doctor.
        var hours = new Dictionary<string, (string, string)[]>
        {
            ["maya-patel"] = [("10:00", "13:00"), ("14:00", "17:00")],
            ["daniel-kim"] = [("09:00", "12:00"), ("13:00", "15:00")]
        };
        foreach (var doc in doctors.Where(d => d.Status == DoctorStatus.Active))
        {
            for (var day = today.AddDays(-21); day <= today.AddDays(42); day = day.AddDays(1))
            {
                if (day.IsWeekend()) continue;
                foreach (var (start, end) in hours.GetValueOrDefault(doc.Id, [("09:00", "12:00"), ("13:00", "16:00")]))
                    db.ScheduleBlocks.Add(new ScheduleBlock
                    {
                        DoctorId = doc.Id, Date = day, Start = TimeOnly.Parse(start), End = TimeOnly.Parse(end), SlotMinutes = 30
                    });
            }
        }

        var nextId = 1000;
        Appointment Appt(string patientId, string doctorId, DateOnly date, string time, string type, AppointmentStatus status,
                         string reason, string? notes = null, string? clinicNote = null, string? summary = null, bool firstVisit = false)
        {
            var t = TimeOnly.Parse(time);
            var requested = date.AddDays(-7).ToDateTime(new TimeOnly(10, 15));
            var history = new List<AppointmentEvent> { new() { Label = "Request sent", At = requested } };
            if (status is not (AppointmentStatus.Pending or AppointmentStatus.Rejected))
                history.Add(new() { Label = "Approved by clinic", At = requested.AddDays(1).Date.AddHours(8.67) });
            if (status == AppointmentStatus.Rejected)
                history.Add(new() { Label = "Rejected by clinic", At = requested.AddDays(1).Date.AddHours(11.08) });
            if (status == AppointmentStatus.Cancelled)
                history.Add(new() { Label = clinicNote?.Contains("patient") == true ? "Cancelled by patient" : "Cancelled by clinic", At = date.AddDays(-2).ToDateTime(new TimeOnly(18, 30)) });
            if (status == AppointmentStatus.Completed)
                history.Add(new() { Label = "Visit completed", At = date.ToDateTime(t.AddMinutes(30)) });

            var a = new Appointment
            {
                Id = ++nextId, PatientId = patientId, DoctorId = doctorId, Date = date, Time = t, Duration = 30, Type = type,
                Reason = reason, Notes = notes, FirstVisit = firstVisit, Status = status, RequestedOn = requested, VisitSummary = summary,
                ClinicNote = clinicNote ?? status switch
                {
                    AppointmentStatus.Approved => "Please arrive 15 minutes before your appointment and bring a valid ID and your current medication list.",
                    AppointmentStatus.Pending => "Your request is awaiting clinic review. You will be notified once it is approved.",
                    _ => null
                },
                History = history
            };
            a.RefreshSlotKey();
            return a;
        }

        var emma = new[]
        {
            Appt("CF-1024", "amelia-brooks", today.AddWeekdays(2), "09:00", "General consultation", AppointmentStatus.Approved, "Routine check-up and preventive care.", "Allergic to penicillin."),
            Appt("CF-1024", "daniel-kim", today.AddWeekdays(4), "10:30", "Follow-up visit", AppointmentStatus.Pending, "Follow-up on blood pressure results.", "Taking lisinopril 10 mg daily."),
            Appt("CF-1024", "james-carter", today.AddWeekdays(-11), "14:00", "Specialist consultation", AppointmentStatus.Rejected, "Recurring rash on forearms.",
                clinicNote: "Dr. Carter is unavailable at this time. Please choose another available slot.", firstVisit: true),
            Appt("CF-1024", "maya-patel", today.AddWeekdays(-13), "11:00", "Routine check-up", AppointmentStatus.Cancelled, "Six-month dental check-up.",
                clinicNote: "Cancelled by patient: schedule conflict."),
            Appt("CF-1024", "amelia-brooks", today.AddWeekdays(-15), "09:00", "General consultation", AppointmentStatus.Completed, "Persistent cough for two weeks.", "Allergic to penicillin.",
                summary: "Mild upper respiratory infection. Advised rest and fluids; no antibiotics needed. Return if symptoms persist beyond 10 days."),
            Appt("CF-1024", "daniel-kim", today.AddWeekdays(-25), "10:00", "Specialist consultation", AppointmentStatus.Completed, "Annual heart health screening.",
                summary: "ECG normal. Blood pressure slightly elevated (138/88). Continue current medication; follow-up in 4 weeks.", firstVisit: true)
        };
        db.Appointments.AddRange(emma);
        db.Appointments.AddRange(
            // Pending requests for the admin to review
            Appt("CF-1025", "daniel-kim", today.AddWeekdays(1), "13:30", "Follow-up visit", AppointmentStatus.Pending, "Chest tightness after exercise."),
            Appt("CF-1026", "maya-patel", today.AddWeekdays(3), "10:00", "Routine check-up", AppointmentStatus.Pending, "Dental cleaning."),
            Appt("CF-1032", "sophia-lee", today.AddWeekdays(2), "14:00", "General consultation", AppointmentStatus.Pending, "Vaccination for younger sibling.", firstVisit: true),
            // Today's schedule
            Appt("CF-1027", "amelia-brooks", d0, "09:00", "General consultation", AppointmentStatus.Approved, "Annual physical."),
            Appt("CF-1028", "daniel-kim", d0, "09:30", "Follow-up visit", AppointmentStatus.Approved, "Medication review."),
            Appt("CF-1029", "amelia-brooks", d0, "10:00", "General consultation", AppointmentStatus.Approved, "Sore throat and fever."),
            Appt("CF-1030", "maya-patel", d0, "10:30", "Routine check-up", AppointmentStatus.Approved, "Tooth sensitivity."),
            // History for reports
            Appt("CF-1025", "amelia-brooks", today.AddWeekdays(-3), "09:30", "General consultation", AppointmentStatus.Completed, "Back pain.", summary: "Muscle strain. Rest, stretching and ibuprofen as needed."),
            Appt("CF-1026", "james-carter", today.AddWeekdays(-4), "13:00", "Specialist consultation", AppointmentStatus.Completed, "Acne treatment.", summary: "Started topical retinoid. Review in 8 weeks."),
            Appt("CF-1027", "noah-williams", today.AddWeekdays(-5), "10:00", "Specialist consultation", AppointmentStatus.Completed, "Knee pain after running.", summary: "Patellar tendinopathy. Physiotherapy referral."),
            Appt("CF-1028", "sophia-lee", today.AddWeekdays(-6), "14:30", "Routine check-up", AppointmentStatus.Completed, "Child wellness visit.", summary: "Healthy growth. Next visit in 6 months."),
            Appt("CF-1029", "maya-patel", today.AddWeekdays(-7), "11:30", "Routine check-up", AppointmentStatus.Completed, "Dental check-up.", summary: "No cavities. Cleaning done."),
            Appt("CF-1030", "daniel-kim", today.AddWeekdays(-8), "10:00", "Specialist consultation", AppointmentStatus.Completed, "Palpitations.", summary: "Holter monitor ordered."),
            Appt("CF-1031", "amelia-brooks", today.AddWeekdays(-9), "15:00", "General consultation", AppointmentStatus.Cancelled, "Headache.", clinicNote: "Cancelled by clinic: doctor unavailable."),
            Appt("CF-1032", "noah-williams", today.AddWeekdays(-10), "13:30", "Specialist consultation", AppointmentStatus.Rejected, "Wrist injury.", clinicNote: "Please visit urgent care for acute injuries."));

        Notification Note(string type, string title, string subtitle, string message, DateTime at, bool read, string kind, int? apptId = null, string? doctorId = null) => new()
        {
            PatientId = "CF-1024", Type = type, Title = title, Subtitle = subtitle, Message = message, CreatedAt = at, Read = read,
            ActionKind = kind, ActionAppointmentId = apptId, ActionDoctorId = doctorId
        };
        db.Notifications.AddRange(
            Note("APPROVAL", "Your appointment is approved", $"Dr. Amelia Brooks · {emma[0].Date.Iso()} · 09:00 AM",
                "Your visit is confirmed. Please arrive 15 minutes early.", now.Date.AddDays(-1).AddHours(9.33), false, "view-appointment", emma[0].Id),
            Note("SCHEDULE UPDATE", "New times available with Dr. Amelia Brooks", "General medicine",
                "Additional morning appointments are now open for booking.", now.Date.AddDays(-1).AddHours(8.75), false, "view-doctor", doctorId: "amelia-brooks"),
            Note("REJECTION", "Your appointment request was not approved", $"Dr. James Carter · {emma[2].Date.Iso()} · 02:00 PM",
                "The doctor is unavailable. Please choose another date.", emma[2].Date.AddDays(-6).ToDateTime(new TimeOnly(10, 15)), true, "book", doctorId: "james-carter"),
            Note("CANCELLATION", "Your appointment was cancelled", $"Dr. Maya Patel · {emma[3].Date.Iso()} · 11:00 AM",
                "Cancelled at your request. You can book a new visit anytime.", emma[3].Date.AddDays(-2).ToDateTime(new TimeOnly(18, 30)), true, "book", doctorId: "maya-patel"));

        await db.SaveChangesAsync(ct);
    }
}
