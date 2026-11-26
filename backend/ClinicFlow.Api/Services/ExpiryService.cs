namespace ClinicFlow.Api.Services;

/// <summary>Expires unreviewed requests once their visit time arrives (checked every minute).</summary>
public class ExpiryService(IServiceScopeFactory scopes, ILogger<ExpiryService> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(TimeSpan.FromMinutes(1));
        do
        {
            try
            {
                using var scope = scopes.CreateScope();
                var count = await scope.ServiceProvider.GetRequiredService<ClinicService>().ExpireStaleRequestsAsync(stoppingToken);
                if (count > 0) logger.LogInformation("Expired {Count} unreviewed appointment request(s).", count);
            }
            catch (Exception e) when (e is not OperationCanceledException)
            {
                logger.LogError(e, "Could not expire old appointment requests; will try again.");
            }
        }
        while (await timer.WaitForNextTickAsync(stoppingToken));
    }
}
