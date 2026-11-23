using System.ComponentModel.DataAnnotations;

namespace ClinicFlow.Api.Dtos;

// ---------- Auth ----------
public record LoginRequest([Required, EmailAddress] string Email, [Required] string Password);

public record RegisterRequest(
    [Required, MaxLength(120)] string FullName,
    [Required, EmailAddress, MaxLength(200)] string Email,
    [Required, MinLength(8), MaxLength(100)] string Password,
    [Required, MaxLength(40)] string Phone,
    [Required] string Dob);

public record AuthResponse(string Token, string Role, string UserId, DateTime ExpiresAt);

// ---------- Doctors ----------
public record DoctorDto(string Id, string Name, string Specialty, string Title, string Email, string Phone,
    int ExperienceYears, string Languages, string Location, string Bio, string Status);

public record SaveDoctorRequest(
    [Required, MaxLength(120)] string Name,
    [Required, MaxLength(80)] string Specialty,
    [MaxLength(160)] string? Title,
    [Required, EmailAddress, MaxLength(200)] string Email,
    [MaxLength(40)] string? Phone,
    [Range(0, 70)] int ExperienceYears,
    [MaxLength(120)] string? Languages,
    [Required, MaxLength(80)] string Location,
    [MaxLength(1000)] string? Bio,
    [Required, RegularExpression("Active|On leave")] string Status);

// ---------- Patients ----------
public record PatientDto(string Id, string FullName, string Email, string Phone, string Dob, string Gender, string Address,
    string RegisteredOn, string Status, bool EmailUpdates);

public record UpdatePatientRequest(
    [MaxLength(120)] string? FullName,
    [EmailAddress, MaxLength(200)] string? Email,
    [MaxLength(40)] string? Phone,
    string? Dob,
    [MaxLength(30)] string? Gender,
    [MaxLength(250)] string? Address,
    bool? EmailUpdates);

public record CreatePatientRequest(
    [Required, MaxLength(120)] string FullName,
    [Required, EmailAddress, MaxLength(200)] string Email,
    [Required, MaxLength(40)] string Phone,
    [Required] string Dob,
    [MaxLength(30)] string? Gender,
    [MaxLength(250)] string? Address);

public record CreatePatientResponse(PatientDto Patient, string TemporaryPassword);

public record SetStatusRequest([Required, RegularExpression("Active|Inactive")] string Status);

// ---------- Appointments ----------
public record StatusEventDto(string Label, DateTime Date);

public record AppointmentDto(
    string Id, string PatientId, string Patient, string DoctorId, string Doctor, string Specialty, string Location,
    string Date, string Time, string Start, string End, int Duration, string Type, string Reason, string? Notes,
    bool FirstVisit, string Status, DateTime RequestedOn, string? ClinicNote, string? VisitSummary, List<StatusEventDto> History);

public record CreateAppointmentRequest(
    string? PatientId,   // required when staff book on a patient's behalf; ignored for patients
    [Required] string DoctorId,
    [Required] string Date,
    [Required] string Time,
    [Required, MaxLength(80)] string Type,
    [Required, MaxLength(500)] string Reason,
    [MaxLength(500)] string? Notes,
    bool FirstVisit);

public record NoteRequest([MaxLength(2000)] string? Text);

// ---------- Schedules ----------
public record SlotDto(string Time, string End, string Label, bool Available, bool Booked);

public record ScheduleBlockDto(int Id, string DoctorId, string Date, string Start, string End, int SlotMinutes);

public record BusySlotDto(string DoctorId, string Date, string Time);

public record AvailabilityDto(List<ScheduleBlockDto> Blocks, List<BusySlotDto> Busy);

public record AddAvailabilityRequest(
    [Required] string DoctorId,
    [Required] string Date,
    [Required] string Start,
    [Required] string End,
    [Range(5, 240)] int SlotMinutes,
    [Range(0, 52)] int RepeatWeeks);

public record AddAvailabilityResponse(int Created, int Skipped);

// ---------- Notifications ----------
public record NotificationActionDto(string Kind, string? AppointmentId, string? DoctorId);

public record NotificationDto(string Id, string PatientId, string Type, string Title, string Subtitle, string Message,
    DateTime CreatedAt, bool Read, NotificationActionDto Action);

// ---------- Admin ----------
public record AdminProfileDto(string FullName, string Email, string Phone, string ClinicName, string PasswordUpdatedOn);

public record UpdateAdminRequest(
    [Required, MaxLength(120)] string FullName,
    [Required, EmailAddress, MaxLength(200)] string Email,
    [Required, MaxLength(40)] string Phone,
    [Required, MaxLength(120)] string ClinicName);

public record ChangePasswordRequest([Required] string Current, [Required, MinLength(8), MaxLength(100)] string Next);

public record ErrorResponse(string Error);
