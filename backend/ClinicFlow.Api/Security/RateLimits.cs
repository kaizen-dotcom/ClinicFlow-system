using System.Globalization;
using System.Net;
using System.Net.Sockets;
using System.Threading.RateLimiting;
using ClinicFlow.Api.Dtos;
using ClinicFlow.Api.Realtime;
using Microsoft.AspNetCore.RateLimiting;

namespace ClinicFlow.Api.Security;

/// <summary>Limits how much any one client can ask of the API, so a flood can't starve everyone else.</summary>
public static class RateLimits
{
    public const string Auth = "auth";
    public const string SignUp = "signup";

    public static void Configure(RateLimiterOptions o, SecurityOptions s)
    {
        o.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
        o.OnRejected = async (context, ct) =>
        {
            var response = context.HttpContext.Response;
            if (context.Lease.TryGetMetadata(MetadataName.RetryAfter, out var wait))
                response.Headers.RetryAfter = Math.Ceiling(wait.TotalSeconds).ToString(CultureInfo.InvariantCulture);
            await response.WriteAsJsonAsync(new ErrorResponse("Too many requests. Please wait a moment and try again."), ct);
        };

        // Applied to every request; a request must pass all three.
        o.GlobalLimiter = PartitionedRateLimiter.CreateChained(
            PartitionedRateLimiter.Create<HttpContext, string>(ctx =>
                Window(Client(ctx), s.RequestsPer10Seconds, TimeSpan.FromSeconds(10))),

            // Changes cost more than reads: each one is saved and makes every open browser reload.
            PartitionedRateLimiter.Create<HttpContext, string>(ctx =>
                IsWrite(ctx) && !IsLive(ctx)
                    ? Window(Client(ctx), s.WritesPerMinute, TimeSpan.FromMinutes(1))
                    : RateLimitPartition.GetNoLimiter("unlimited")),

            // Live connections stay open for a long time, so they are counted separately.
            PartitionedRateLimiter.Create<HttpContext, string>(ctx =>
            {
                var live = IsLive(ctx);
                return RateLimitPartition.GetConcurrencyLimiter((live ? "live:" : "api:") + Client(ctx), _ => new ConcurrencyLimiterOptions
                {
                    PermitLimit = live ? s.LiveConnections : s.ConcurrentRequests,
                    QueueLimit = live ? 0 : s.ConcurrentRequests,
                    QueueProcessingOrder = QueueProcessingOrder.OldestFirst
                });
            }));

        // Extra, stricter limits on the endpoints attackers target.
        o.AddPolicy(Auth, ctx => Window(Client(ctx), s.AuthAttemptsPerMinute, TimeSpan.FromMinutes(1)));
        o.AddPolicy(SignUp, ctx => Window(Client(ctx), s.SignUpsPerHour, TimeSpan.FromHours(1)));
    }

    /// <summary>
    /// Identifies the caller by network address. One IPv6 user controls a whole /64 block, so the block
    /// is counted rather than the single address.
    /// </summary>
    public static string Client(HttpContext ctx)
    {
        var address = ctx.Connection.RemoteIpAddress;
        if (address is null) return "unknown";
        if (address.IsIPv4MappedToIPv6) address = address.MapToIPv4();
        if (address.AddressFamily != AddressFamily.InterNetworkV6) return address.ToString();
        var bytes = address.GetAddressBytes();
        Array.Clear(bytes, 8, 8);
        return new IPAddress(bytes) + "/64";
    }

    private static RateLimitPartition<string> Window(string key, int limit, TimeSpan window) =>
        RateLimitPartition.GetFixedWindowLimiter(key, _ => new FixedWindowRateLimiterOptions { PermitLimit = limit, Window = window });

    private static bool IsWrite(HttpContext ctx) =>
        !HttpMethods.IsGet(ctx.Request.Method) && !HttpMethods.IsHead(ctx.Request.Method) && !HttpMethods.IsOptions(ctx.Request.Method);

    private static bool IsLive(HttpContext ctx) => ctx.Request.Path.StartsWithSegments(ClinicHub.Path);
}
