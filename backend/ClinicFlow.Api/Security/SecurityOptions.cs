namespace ClinicFlow.Api.Security;

/// <summary>
/// Abuse limits. The defaults suit a single clinic; override any of them in the "Security" configuration
/// section (for example the environment variable Security__WritesPerMinute).
/// </summary>
public class SecurityOptions
{
    // Per client address (everyone behind the same router or proxy shares one allowance).
    public int RequestsPer10Seconds { get; set; } = 150;
    public int WritesPerMinute { get; set; } = 60;
    public int ConcurrentRequests { get; set; } = 40;
    public int LiveConnections { get; set; } = 100;
    public int AuthAttemptsPerMinute { get; set; } = 10;
    public int SignUpsPerHour { get; set; } = 10;

    // Password guessing.
    public int FailedLoginsPerAddress { get; set; } = 5;
    public int FailedLoginsPerAccount { get; set; } = 20;
    public int LockoutMinutes { get; set; } = 15;

    // Server-wide.
    public int MaxRequestBodyBytes { get; set; } = 64 * 1024;
    public int MaxConnections { get; set; } = 1000;
    public int RequestTimeoutSeconds { get; set; } = 30;
}
