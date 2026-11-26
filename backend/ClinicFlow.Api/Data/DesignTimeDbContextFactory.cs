using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace ClinicFlow.Api.Data;

/// <summary>
/// Used only by 'dotnet ef migrations add'. Generating migrations doesn't open a connection,
/// so a placeholder connection string is enough. The real one comes from User Secrets at runtime.
/// </summary>
public class DesignTimeDbContextFactory : IDesignTimeDbContextFactory<ClinicDbContext>
{
    public ClinicDbContext CreateDbContext(string[] args) =>
        new(new DbContextOptionsBuilder<ClinicDbContext>()
            .UseMySQL("server=localhost;database=clinicflow_db;user=design-time;password=unused")
            .Options);
}
