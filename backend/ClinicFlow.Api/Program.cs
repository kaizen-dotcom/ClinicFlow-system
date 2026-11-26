using System.Security.Cryptography;
using ClinicFlow.Api.Data;
using ClinicFlow.Api.Dtos;
using ClinicFlow.Api.Realtime;
using ClinicFlow.Api.Security;
using ClinicFlow.Api.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Http.Timeouts;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);
var config = builder.Configuration;

// ---------- Server limits (oversized, slow or too many connections) ----------
var security = config.GetSection("Security").Get<SecurityOptions>() ?? new SecurityOptions();
builder.Services.AddSingleton(security);
builder.Services.AddSingleton<LoginGuard>();
builder.WebHost.ConfigureKestrel(k =>
{
    k.AddServerHeader = false;
    k.Limits.MaxRequestBodySize = security.MaxRequestBodyBytes;
    k.Limits.MaxConcurrentConnections = security.MaxConnections;
    k.Limits.MaxConcurrentUpgradedConnections = security.MaxConnections;
    k.Limits.RequestHeadersTimeout = TimeSpan.FromSeconds(15);
});
builder.Services.AddRequestTimeouts(o => o.DefaultPolicy = new RequestTimeoutPolicy
{
    Timeout = TimeSpan.FromSeconds(security.RequestTimeoutSeconds),
    TimeoutStatusCode = StatusCodes.Status503ServiceUnavailable
});


// ---------- Database (MySQL) ----------
// Set with: dotnet user-secrets set "ConnectionStrings:ClinicFlow" "server=localhost;port=3306;database=clinicflow_db;user=...;password=..."
var connectionString = config.GetConnectionString("ClinicFlow")
    ?? throw new InvalidOperationException(
        "Missing connection string 'ConnectionStrings:ClinicFlow'. Set it with 'dotnet user-secrets set' (see README.md).");
// Live updates. Browsers only listen, so anything large coming from them is refused.
builder.Services.AddSignalR(o => o.MaximumReceiveMessageSize = 4 * 1024);
builder.Services.AddSingleton<ChangeBroadcaster>();
builder.Services.AddDbContext<ClinicDbContext>((services, o) =>
    o.UseMySQL(connectionString).AddInterceptors(services.GetRequiredService<ChangeBroadcaster>()));

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
            ValidAlgorithms = [SecurityAlgorithms.HmacSha256],
            ValidateLifetime = true, ClockSkew = TimeSpan.FromMinutes(1),
            RoleClaimType = System.Security.Claims.ClaimTypes.Role,
            NameClaimType = "sub"
        };
        o.Events = new JwtBearerEvents
        {
            // Browsers can't set headers on WebSocket connections, so the hub receives the token in the query string.
            OnMessageReceived = context =>
            {
                var token = context.Request.Query["access_token"];
                if (!string.IsNullOrEmpty(token) && context.HttpContext.Request.Path.StartsWithSegments(ClinicHub.Path))
                    context.Token = token;
                return Task.CompletedTask;
            },
            OnTokenValidated = SessionValidator.ValidateAsync
        };
    });
builder.Services.AddAuthorization();

// Request limits per client, with stricter ones for sign-in and sign-up (see Security/RateLimits.cs).
builder.Services.AddRateLimiter(o => RateLimits.Configure(o, security));

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
    // Never show internal error details to callers (the error itself is still logged).
    app.UseExceptionHandler(new ExceptionHandlerOptions
    {
        // A refused request (for example one that is too large) keeps its own status code.
        StatusCodeSelector = error => error is BadHttpRequestException bad ? bad.StatusCode : StatusCodes.Status500InternalServerError,
        ExceptionHandler = context => context.Response.WriteAsJsonAsync(new ErrorResponse(
            context.Response.StatusCode < 500 ? "The request was refused." : "Something went wrong. Please try again."))
    });
    app.UseHsts(); // tells browsers to use HTTPS only
    app.UseHttpsRedirection();
}

app.UseSecurityHeaders();
app.UseCors();
app.UseRateLimiter();
app.UseRequestTimeouts();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapHub<ClinicHub>(ClinicHub.Path).DisableRequestTimeout(); // stays open by design
app.MapGet("/api/health", () => Results.Ok(new { status = "ok" }));

app.Run();

public partial class Program;
