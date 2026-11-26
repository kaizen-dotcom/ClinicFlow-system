using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using ClinicFlow.Api.Dtos;
using Microsoft.AspNetCore.Hosting;

namespace ClinicFlow.Api.Tests;

/// <summary>Abuse protection: request limits, password guessing, oversized input and response headers.</summary>
public class SecurityTests : IAsyncLifetime
{
    private readonly ApiFactory _factory = new();

    public Task InitializeAsync() => _factory.SeedAsync();
    public Task DisposeAsync() => _factory.DisposeAsync().AsTask();

    private static Task<HttpResponseMessage> Login(HttpClient client, string email, string password) =>
        client.PostAsJsonAsync("/api/auth/login", new LoginRequest(email, password));

    private HttpClient Limited(string setting, int value) =>
        _factory.WithWebHostBuilder(b => b.UseSetting($"Security:{setting}", value.ToString())).CreateClient();

    [Fact]
    public async Task Repeated_wrong_passwords_pause_sign_in_even_with_the_right_one()
    {
        var client = _factory.CreateClient();
        for (var i = 0; i < 5; i++)
            Assert.Equal(HttpStatusCode.Unauthorized, (await Login(client, TestData.AdminEmail, "wrong")).StatusCode);

        var res = await Login(client, TestData.AdminEmail, TestData.AdminPassword);
        Assert.Equal(HttpStatusCode.TooManyRequests, res.StatusCode);
        Assert.NotNull(res.Headers.RetryAfter);
        // Other accounts are unaffected.
        Assert.Equal(HttpStatusCode.OK, (await Login(client, "emma.wilson@example.com", TestData.PatientPassword)).StatusCode);
    }

    [Fact]
    public async Task Unknown_emails_are_paused_the_same_way()
    {
        var client = _factory.CreateClient();
        for (var i = 0; i < 5; i++) await Login(client, "nobody@example.com", "wrong");
        Assert.Equal(HttpStatusCode.TooManyRequests, (await Login(client, "nobody@example.com", "wrong")).StatusCode);
    }

    [Fact]
    public async Task A_successful_sign_in_clears_earlier_mistakes()
    {
        var client = _factory.CreateClient();
        for (var i = 0; i < 4; i++) await Login(client, TestData.AdminEmail, "wrong");
        (await Login(client, TestData.AdminEmail, TestData.AdminPassword)).EnsureSuccessStatusCode();
        Assert.Equal(HttpStatusCode.Unauthorized, (await Login(client, TestData.AdminEmail, "wrong")).StatusCode);
    }

    [Fact]
    public async Task A_flood_of_requests_is_refused_with_a_readable_message()
    {
        var client = Limited("RequestsPer10Seconds", 3);
        for (var i = 0; i < 3; i++) (await client.GetAsync("/api/health")).EnsureSuccessStatusCode();

        var res = await client.GetAsync("/api/health");
        Assert.Equal(HttpStatusCode.TooManyRequests, res.StatusCode);
        Assert.NotNull(res.Headers.RetryAfter);
        Assert.StartsWith("Too many requests", (await res.Content.ReadFromJsonAsync<ErrorResponse>())!.Error);
    }

    [Fact]
    public async Task Changes_have_their_own_limit_and_reads_continue()
    {
        var client = Limited("WritesPerMinute", 1);
        await Login(client, "a@example.com", "wrong");
        Assert.Equal(HttpStatusCode.TooManyRequests, (await Login(client, "b@example.com", "wrong")).StatusCode);
        (await client.GetAsync("/api/health")).EnsureSuccessStatusCode();
    }

    [Fact]
    public async Task Sign_ups_from_one_address_are_limited()
    {
        var client = Limited("SignUpsPerHour", 1);
        Task<HttpResponseMessage> Register(string email) => client.PostAsJsonAsync("/api/auth/register",
            new RegisterRequest("Ana Cruz", email, "Secret123", "+1 555", "1990-01-01"));

        (await Register("one@example.com")).EnsureSuccessStatusCode();
        Assert.Equal(HttpStatusCode.TooManyRequests, (await Register("two@example.com")).StatusCode);
    }

    [Fact]
    public async Task Oversized_input_is_rejected()
    {
        var client = _factory.CreateClient();
        Assert.Equal(HttpStatusCode.BadRequest, (await Login(client, TestData.AdminEmail, new string('x', 5000))).StatusCode);

        var auth = (await (await Login(client, "emma.wilson@example.com", TestData.PatientPassword))
            .Content.ReadFromJsonAsync<AuthResponse>())!;
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", auth.Token);
        var mine = (await client.GetFromJsonAsync<List<AppointmentDto>>("/api/appointments"))!;
        var res = await client.PostAsJsonAsync($"/api/appointments/{mine[0].Id}/cancel", new NoteRequest(new string('x', 600)));
        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
    }

    [Fact]
    public async Task Responses_carry_security_headers()
    {
        var res = await _factory.CreateClient().GetAsync("/api/health");
        Assert.Equal("nosniff", res.Headers.GetValues("X-Content-Type-Options").Single());
        Assert.Equal("DENY", res.Headers.GetValues("X-Frame-Options").Single());
        Assert.True(res.Headers.CacheControl!.NoStore);
    }

    [Fact]
    public async Task Unsigned_tokens_are_refused()
    {
        static string Encode(string json) =>
            Convert.ToBase64String(Encoding.UTF8.GetBytes(json)).TrimEnd('=').Replace('+', '-').Replace('/', '_');
        // An "admin" token with algorithm "none" and no signature.
        var forged = Encode("""{"alg":"none"}""") + "." + Encode("""{"sub":"admin","iss":"ClinicFlow","aud":"ClinicFlow"}""") + ".";

        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", forged);
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/patients")).StatusCode);
    }
}
