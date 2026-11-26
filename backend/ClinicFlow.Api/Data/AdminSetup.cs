using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace ClinicFlow.Api.Data;

/// <summary>
/// Creates the clinic's administrator the first time the API runs against an empty database.
/// Settings come from the "Admin" configuration section (User Secrets or environment variables);
/// once the account exists they are ignored and the profile is edited in the app.
/// </summary>
public static class AdminSetup
{
    public static async Task CreateFirstAdminAsync(IServiceProvider services, IConfiguration config, ILogger logger)
    {
        var db = services.GetRequiredService<ClinicDbContext>();
        if (await db.Admins.AnyAsync()) return;

        var section = config.GetSection("Admin");
        var email = section["Email"]?.Trim().ToLowerInvariant();
        var password = section["Password"];
        if (string.IsNullOrEmpty(email) || password is null || password.Length < 8)
        {
            logger.LogWarning("No administrator account exists. Set 'Admin:Email' and 'Admin:Password' (at least 8 characters) and restart the API (see README.md).");
            return;
        }

        var now = services.GetRequiredService<TimeProvider>().GetLocalNow().DateTime;
        db.Admins.Add(new Admin
        {
            FullName = section["FullName"] ?? "Clinic Administrator",
            Email = email,
            Phone = section["Phone"] ?? "",
            ClinicName = section["ClinicName"] ?? "ClinicFlow Medical Center",
            PasswordHash = services.GetRequiredService<IPasswordHasher<object>>().HashPassword(null!, password),
            PasswordUpdatedOn = DateOnly.FromDateTime(now)
        });
        await db.SaveChangesAsync();
        logger.LogInformation("Created the administrator account {Email}.", email);
    }
}
