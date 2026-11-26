using ClinicFlow.Api.Data;
using ClinicFlow.Api.Realtime;
using ClinicFlow.Api.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace ClinicFlow.Api.Tests;

/// <summary>A clock fixed at Wednesday 25 Nov 2026, 07:00 (UTC as local time) so slot rules are predictable.</summary>
public class FixedClock(DateTimeOffset? now = null) : TimeProvider
{
    public DateTimeOffset Now { get; set; } = now ?? new DateTimeOffset(2026, 11, 25, 7, 0, 0, TimeSpan.Zero);
    public override DateTimeOffset GetUtcNow() => Now;
    public override TimeZoneInfo LocalTimeZone => TimeZoneInfo.Utc;
}

public static class TestDb
{
    /// <summary>A fresh in-memory database seeded with sample data, plus a ClinicService using it.</summary>
    public static async Task<(ClinicDbContext Db, ClinicService Clinic, FixedClock Clock)> CreateAsync()
    {
        var db = new ClinicDbContext(new DbContextOptionsBuilder<ClinicDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);
        var clock = new FixedClock();
        await TestData.SeedIfEmptyAsync(db, clock);
        db.ChangeTracker.Clear();
        return (db, new ClinicService(db, clock, new PasswordHasher<object>()), clock);
    }
}

/// <summary>Runs the real API in memory with an in-memory database instead of MySQL.</summary>
public class ApiFactory : WebApplicationFactory<Program>
{
    private readonly string _dbName = Guid.NewGuid().ToString();
    public FixedClock Clock { get; } = new();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        builder.UseSetting("ConnectionStrings:ClinicFlow", "server=unused");
        builder.UseSetting("Jwt:Key", "test-signing-key-that-is-at-least-32-characters-long");
        builder.ConfigureServices(services =>
        {
            services.RemoveAll<DbContextOptions<ClinicDbContext>>();
            services.RemoveAll<IDbContextOptionsConfiguration<ClinicDbContext>>();
            services.AddDbContext<ClinicDbContext>((provider, o) =>
                o.UseInMemoryDatabase(_dbName).AddInterceptors(provider.GetRequiredService<ChangeBroadcaster>()));
            services.RemoveAll<TimeProvider>();
            services.AddSingleton<TimeProvider>(Clock);
            // Tokens are issued with the fixed test clock, so don't compare their expiry with the real time.
            services.PostConfigure<JwtBearerOptions>(JwtBearerDefaults.AuthenticationScheme,
                o => o.TokenValidationParameters.ValidateLifetime = false);
        });
    }

    public async Task SeedAsync()
    {
        using var scope = Services.CreateScope();
        await TestData.SeedIfEmptyAsync(scope.ServiceProvider.GetRequiredService<ClinicDbContext>(), Clock);
    }
}
