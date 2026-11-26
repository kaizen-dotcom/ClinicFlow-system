namespace ClinicFlow.Api.Security;

public static class SecurityHeaders
{
    /// <summary>
    /// Tells browsers not to guess content types, frame, or cache API responses (they hold patient data).
    /// </summary>
    public static IApplicationBuilder UseSecurityHeaders(this IApplicationBuilder app) => app.Use((context, next) =>
    {
        context.Response.OnStarting(() =>
        {
            var headers = context.Response.Headers;
            headers.XContentTypeOptions = "nosniff";
            headers.XFrameOptions = "DENY";
            headers.ContentSecurityPolicy = "default-src 'none'; frame-ancestors 'none'";
            headers["Referrer-Policy"] = "no-referrer";
            headers.CacheControl = "no-store";
            return Task.CompletedTask;
        });
        return next(context);
    });
}
