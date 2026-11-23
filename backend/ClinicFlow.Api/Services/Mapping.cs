using ClinicFlow.Api.Data;
using ClinicFlow.Api.Dtos;

namespace ClinicFlow.Api.Services;

public static class Mapping
{
    public const string AppointmentPrefix = "APT-";

    public static string AppointmentRef(int id) => $"{AppointmentPrefix}{id}";

    /// <summary>Parses "APT-1001" (or "1001") into 1001.</summary>
    public static bool TryParseAppointmentRef(string value, out int id)
    {
        var raw = value.StartsWith(AppointmentPrefix, StringComparison.OrdinalIgnoreCase) ? value[AppointmentPrefix.Length..] : value;
        return int.TryParse(raw, out id);
    }

    public static string DoctorStatusText(DoctorStatus s) => s == DoctorStatus.OnLeave ? "On leave" : "Active";
    public static DoctorStatus ParseDoctorStatus(string s) => s == "On leave" ? DoctorStatus.OnLeave : DoctorStatus.Active;

    public static DoctorDto ToDto(this Doctor d) => new(d.Id, d.Name, d.Specialty, d.Title, d.Email, d.Phone,
        d.ExperienceYears, d.Languages, d.Location, d.Bio, DoctorStatusText(d.Status));

    public static PatientDto ToDto(this Patient p) => new(p.Id, p.FullName, p.Email, p.Phone, p.Dob?.Iso() ?? "",
        p.Gender, p.Address, p.RegisteredOn.Iso(), p.Status.ToString(), p.EmailUpdates);

    /// <summary>Requires Patient and Doctor to be loaded.</summary>
    public static AppointmentDto ToDto(this Appointment a) => new(
        AppointmentRef(a.Id), a.PatientId, a.Patient?.FullName ?? "", a.DoctorId, a.Doctor?.Name ?? "", a.Doctor?.Specialty ?? "",
        $"ClinicFlow · {a.Doctor?.Location}", a.Date.Iso(), a.Time.Hhmm(), a.Time.To12h(), a.Time.AddMinutes(a.Duration).To12h(),
        a.Duration, a.Type, a.Reason, a.Notes, a.FirstVisit, a.Status.ToString(), a.RequestedOn, a.ClinicNote, a.VisitSummary,
        a.History.OrderBy(h => h.At).Select(h => new StatusEventDto(h.Label, h.At)).ToList());

    public static ScheduleBlockDto ToDto(this ScheduleBlock b) => new(b.Id, b.DoctorId, b.Date.Iso(), b.Start.Hhmm(), b.End.Hhmm(), b.SlotMinutes);

    public static NotificationDto ToDto(this Notification n) => new(
        n.Id.ToString(), n.PatientId, n.Type, n.Title, n.Subtitle, n.Message, n.CreatedAt, n.Read,
        new NotificationActionDto(n.ActionKind, n.ActionAppointmentId is int id ? AppointmentRef(id) : null, n.ActionDoctorId));

    public static AdminProfileDto ToDto(this Admin a) => new(a.FullName, a.Email, a.Phone, a.ClinicName, a.PasswordUpdatedOn.Iso());

    public static bool TryParseDate(string? s, out DateOnly date) =>
        DateOnly.TryParseExact(s, "yyyy-MM-dd", out date);

    public static bool TryParseTime(string? s, out TimeOnly time) =>
        TimeOnly.TryParseExact(s, ["HH:mm", "HH:mm:ss"], out time);
}
