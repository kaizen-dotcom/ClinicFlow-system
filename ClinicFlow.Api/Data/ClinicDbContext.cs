using Microsoft.EntityFrameworkCore;

namespace ClinicFlow.Api.Data;

public class ClinicDbContext(DbContextOptions<ClinicDbContext> options) : DbContext(options)
{
    public DbSet<Admin> Admins => Set<Admin>();
    public DbSet<Patient> Patients => Set<Patient>();
    public DbSet<Doctor> Doctors => Set<Doctor>();
    public DbSet<ScheduleBlock> ScheduleBlocks => Set<ScheduleBlock>();
    public DbSet<Appointment> Appointments => Set<Appointment>();
    public DbSet<AppointmentEvent> AppointmentEvents => Set<AppointmentEvent>();
    public DbSet<Notification> Notifications => Set<Notification>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        b.Entity<Admin>(e =>
        {
            e.Property(x => x.FullName).HasMaxLength(120);
            e.Property(x => x.Email).HasMaxLength(200);
            e.Property(x => x.Phone).HasMaxLength(40);
            e.Property(x => x.PasswordHash).HasMaxLength(200);
            e.Property(x => x.ClinicName).HasMaxLength(120);
            e.HasIndex(x => x.Email).IsUnique();
        });

        b.Entity<Patient>(e =>
        {
            e.Property(x => x.Id).HasMaxLength(16);
            e.Property(x => x.FullName).HasMaxLength(120);
            e.Property(x => x.Email).HasMaxLength(200);
            e.Property(x => x.Phone).HasMaxLength(40);
            e.Property(x => x.Gender).HasMaxLength(30);
            e.Property(x => x.Address).HasMaxLength(250);
            e.Property(x => x.PasswordHash).HasMaxLength(200);
            e.Property(x => x.Status).HasConversion<string>().HasMaxLength(16);
            e.HasIndex(x => x.Email).IsUnique();
        });

        b.Entity<Doctor>(e =>
        {
            e.Property(x => x.Id).HasMaxLength(64);
            e.Property(x => x.Name).HasMaxLength(120);
            e.Property(x => x.Specialty).HasMaxLength(80);
            e.Property(x => x.Title).HasMaxLength(160);
            e.Property(x => x.Email).HasMaxLength(200);
            e.Property(x => x.Phone).HasMaxLength(40);
            e.Property(x => x.Languages).HasMaxLength(120);
            e.Property(x => x.Location).HasMaxLength(80);
            e.Property(x => x.Bio).HasMaxLength(1000);
            e.Property(x => x.Status).HasConversion<string>().HasMaxLength(16);
        });

        b.Entity<ScheduleBlock>(e =>
        {
            e.HasOne(x => x.Doctor).WithMany().HasForeignKey(x => x.DoctorId).OnDelete(DeleteBehavior.Cascade);
            e.HasIndex(x => new { x.DoctorId, x.Date });
        });

        b.Entity<Appointment>(e =>
        {
            e.Property(x => x.Type).HasMaxLength(80);
            e.Property(x => x.Reason).HasMaxLength(500);
            e.Property(x => x.Notes).HasMaxLength(500);
            e.Property(x => x.ClinicNote).HasMaxLength(500);
            e.Property(x => x.VisitSummary).HasMaxLength(2000);
            e.Property(x => x.Status).HasConversion<string>().HasMaxLength(16);
            e.Property(x => x.ActiveSlotKey).HasMaxLength(100);
            e.HasIndex(x => x.ActiveSlotKey).IsUnique();
            e.HasIndex(x => new { x.DoctorId, x.Date });
            e.HasIndex(x => x.PatientId);
            e.HasOne(x => x.Patient).WithMany().HasForeignKey(x => x.PatientId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.Doctor).WithMany().HasForeignKey(x => x.DoctorId).OnDelete(DeleteBehavior.Restrict);
            e.HasMany(x => x.History).WithOne().HasForeignKey(x => x.AppointmentId).OnDelete(DeleteBehavior.Cascade);
            e.Ignore(x => x.IsActive);
        });

        b.Entity<AppointmentEvent>(e => e.Property(x => x.Label).HasMaxLength(80));

        b.Entity<Notification>(e =>
        {
            e.Property(x => x.PatientId).HasMaxLength(16);
            e.Property(x => x.Type).HasMaxLength(30);
            e.Property(x => x.Title).HasMaxLength(160);
            e.Property(x => x.Subtitle).HasMaxLength(200);
            e.Property(x => x.Message).HasMaxLength(500);
            e.Property(x => x.ActionKind).HasMaxLength(30);
            e.Property(x => x.ActionDoctorId).HasMaxLength(64);
            e.HasIndex(x => new { x.PatientId, x.CreatedAt });
            e.HasOne<Patient>().WithMany().HasForeignKey(x => x.PatientId).OnDelete(DeleteBehavior.Cascade);
        });
    }
}
