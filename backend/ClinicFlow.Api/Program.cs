using System.Security.Cryptography;
using System.Threading.RateLimiting;
using ClinicFlow.Api.Data;
using ClinicFlow.Api.Dtos;
using ClinicFlow.Api.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);
var config = builder.Configuration;

// ---------- Database (MySQL) ----------
// Set with: dotnet user-secrets set "ConnectionStrings:ClinicFlow" "server=localhost;port=3306;database=clinicflow_db;user=...;password=..."
var connectionString = config.GetConnectionString("ClinicFlow")
    ?? throw new InvalidOperationException(
        "Missing connection string 'ConnectionStrings:ClinicFlow'. Set it with 'dotnet user-secrets set' (see README.md).");
builder.Services.AddDbContext<ClinicDbContext>(o => o.UseMySQL(connectionString));

// ---------- Auth (JWT) ----------
var jwt = config.GetSection("Jwt").Get<JwtOptions>() ?? new JwtOptions();
if (string.IsNullOrEmpty(jwt.Key))
{
    if (!builder.Environment.IsDevelopment())
        throw new InvalidOperationException("Missing 'Jwt:Key' (at least 32 characters). Set it as a secret/environment variable.");
    // Development fallback: random key per run (users simply log in again after a restart).
    jwt.Key = Convert.ToBase64String(RandomNumberGenerator.GetBytes(48));
}
if (jwt.Key.Length < 32) throw new InvalidOperationException("'Jwt:Key' must be at least 32 characters.");

builder.Services.AddSingleton(jwt);
builder.Services.AddSingleton(TimeProvider.System);
builder.Services.AddSingleton<IPasswordHasher<object>, PasswordHasher<object>>();
builder.Services.AddSingleton<TokenService>();
builder.Services.AddScoped<ClinicService>();
// Tests control the clock and database themselves, so the background job is left out there.
if (!builder.Environment.IsEnvironment("Testing")) builder.Services.AddHostedService<ExpiryService>();

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(o =>
    {
        o.MapInboundClaims = false;
        o.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true, ValidIssuer = jwt.Issuer,
            ValidateAudience = true, ValidAudience = jwt.Audience,
            ValidateIssuerSigningKey = true, IssuerSigningKey = jwt.SigningKey(),
            ValidateLifetime = true, ClockSkew = TimeSpan.FromMinutes(1),
            RoleClaimType = System.Security.Claims.ClaimTypes.Role,
            NameClaimType = "sub"
        };
        o.Events = new JwtBearerEvents { OnTokenValidated = SessionValidator.ValidateAsync };
    });
builder.Services.AddAuthorization();

// Slow down password guessing: 10 login/register attempts per minute per IP.
builder.Services.AddRateLimiter(o =>
{
    o.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    o.AddPolicy("auth", ctx => RateLimitPartition.GetFixedWindowLimiter(
        ctx.Connection.RemoteIpAddress?.ToString() ?? "unknown",
        _ => new FixedWindowRateLimiterOptions { PermitLimit = 10, Window = TimeSpan.FromMinutes(1) }));
});

// ---------- CORS (Angular dev server) ----------
var allowedOrigins = config.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? ["https://localhost:4200"];
builder.Services.AddCors(o => o.AddDefaultPolicy(p => p.WithOrigins(allowedOrigins).AllowAnyHeader().AllowAnyMethod()));

// ---------- MVC ----------
builder.Services.AddControllers()
    .ConfigureApiBehaviorOptions(o =>
    {
        // Validation errors come back as { "error": "..." } like every other error.
        o.InvalidModelStateResponseFactory = ctx =>
        {
            var first = ctx.ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage).FirstOrDefault(m => !string.IsNullOrEmpty(m));
            return new BadRequestObjectResult(new ErrorResponse(first ?? "Invalid request."));
        };
    });
builder.Services.AddOpenApi();

var app = builder.Build();

// ---------- Database setup ----------
if (app.Environment.IsDevelopment())
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<ClinicDbContext>();
    await db.Database.MigrateAsync();
    await AdminSetup.CreateFirstAdminAsync(scope.ServiceProvider, app.Configuration, app.Logger);
}

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}
else
{
    app.UseHsts(); // tells browsers to use HTTPS only
    app.UseHttpsRedirection();
}

app.UseCors();
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapGet("/api/health", () => Results.Ok(new { status = "ok" }));

app.Run();

public partial class Program;
