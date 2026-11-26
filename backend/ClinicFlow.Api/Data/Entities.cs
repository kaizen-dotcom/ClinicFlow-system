namespace ClinicFlow.Api.Data;

public enum AppointmentStatus { Pending, Approved, Rejected, Cancelled, Completed, NoShow, Expired }
public enum PatientStatus { Active, Inactive }
public enum DoctorStatus { Active, OnLeave }

public class Admin
{
    public int Id { get; set; }
    public string FullName { get; set; } = "";
    public string Email { get; set; } = "";
    public string Phone { get; set; } = "";
    public string PasswordHash { get; set; } = "";
    public DateOnly PasswordUpdatedOn { get; set; }
    public string ClinicName { get; set; } = "";
}

public class Patient
{
    /// <summary>Clinic patient number, e.g. "CF-1024".</summary>
    public string Id { get; set; } = "";
    public string FullName { get; set; } = "";
    public string Email { get; set; } = "";
    public string Phone { get; set; } = "";
    public DateOnly? Dob { get; set; }
    public string Gender { get; set; } = "";
    public string Address { get; set; } = "";
    public DateOnly RegisteredOn { get; set; }
    public PatientStatus Status { get; set; } = PatientStatus.Active;
    public string PasswordHash { get; set; } = "";
    public bool EmailUpdates { get; set; } = true;
}

public class Doctor
{
    /// <summary>URL-friendly id, e.g. "amelia-brooks".</summary>
    public string Id { get; set; } = "";
    public string Name { get; set; } = "";
    public string Specialty { get; set; } = "";
    public string Title { get; set; } = "";
    public string Email { get; set; } = "";
    public string Phone { get; set; } = "";
    public int ExperienceYears { get; set; }
    public string Languages { get; set; } = "";
    public string Location { get; set; } = "";
    public string Bio { get; set; } = "";
    public DoctorStatus Status { get; set; } = DoctorStatus.Active;
}

/// <summary>A doctor's bookable hours on one date, split into equal slots.</summary>
public class ScheduleBlock
{
    public int Id { get; set; }
    public string DoctorId { get; set; } = "";
    public Doctor? Doctor { get; set; }
    public DateOnly Date { get; set; }
    public TimeOnly Start { get; set; }
    public TimeOnly End { get; set; }
    public int SlotMinutes { get; set; } = 30;
}

public class Appointment
{
    /// <summary>Shown to users as "APT-{Id}".</summary>
    public int Id { get; set; }
    public string PatientId { get; set; } = "";
    public Patient? Patient { get; set; }
    public string DoctorId { get; set; } = "";
    public Doctor? Doctor { get; set; }
    public DateOnly Date { get; set; }
    public TimeOnly Time { get; set; }
    public int Duration { get; set; } = 30;
    public string Type { get; set; } = "";
    public string Reason { get; set; } = "";
    public string? Notes { get; set; }
    public bool FirstVisit { get; set; }
    public AppointmentStatus Status { get; set; }
    public DateTime RequestedOn { get; set; }
    public string? ClinicNote { get; set; }
    public string? VisitSummary { get; set; }

    /// <summary>
    /// "doctorId|date|time" while the appointment is Pending/Approved, otherwise null.
    /// A unique index on this column makes double-booking impossible at the database level
    /// (MySQL has no filtered indexes, and unique indexes allow many NULLs).
    /// </summary>
    public string? ActiveSlotKey { get; set; }

    public List<AppointmentEvent> History { get; set; } = [];

    public bool IsActive => Status is AppointmentStatus.Pending or AppointmentStatus.Approved;

    public static string SlotKey(string doctorId, DateOnly date, TimeOnly time) => $"{doctorId}|{date:yyyy-MM-dd}|{time:HH\\:mm}";

    public void RefreshSlotKey() => ActiveSlotKey = IsActive ? SlotKey(DoctorId, Date, Time) : null;
}

public class AppointmentEvent
{
    public int Id { get; set; }
    public int AppointmentId { get; set; }
    public string Label { get; set; } = "";
    public DateTime At { get; set; }
}

public class Notification
{
    public int Id { get; set; }
    public string PatientId { get; set; } = "";
    /// <summary>APPROVAL, REJECTION, CANCELLATION, REQUEST, COMPLETED, SCHEDULE UPDATE</summary>
    public string Type { get; set; } = "";
    public string Title { get; set; } = "";
    public string Subtitle { get; set; } = "";
    public string Message { get; set; } = "";
    public DateTime CreatedAt { get; set; }
    public bool Read { get; set; }
    /// <summary>view-appointment, view-doctor or book</summary>
    public string ActionKind { get; set; } = "";
    public int? ActionAppointmentId { get; set; }
    public string? ActionDoctorId { get; set; }
}
