using System.Net.Http.Headers;
using System.Net.Http.Json;
using ClinicFlow.Api.Dtos;
using ClinicFlow.Api.Realtime;
using Microsoft.AspNetCore.Http.Connections;
using Microsoft.AspNetCore.SignalR.Client;

namespace ClinicFlow.Api.Tests;

/// <summary>Live updates: signed-in browsers are told about changes; others can't connect.</summary>
public class RealtimeTests : IAsyncLifetime
{
    private readonly ApiFactory _factory = new();

    public Task InitializeAsync() => _factory.SeedAsync();
    public Task DisposeAsync() => _factory.DisposeAsync().AsTask();

    private async Task<string> Token(string email, string password)
    {
        var res = await _factory.CreateClient().PostAsJsonAsync("/api/auth/login", new LoginRequest(email, password));
        return (await res.Content.ReadFromJsonAsync<AuthResponse>())!.Token;
    }

    private HubConnection Connect(string? token) => new HubConnectionBuilder()
        .WithUrl(new Uri(_factory.Server.BaseAddress, ClinicHub.Path), o =>
        {
            o.Transports = HttpTransportType.LongPolling; // the in-memory test server has no real sockets
            o.HttpMessageHandlerFactory = _ => _factory.Server.CreateHandler();
            o.AccessTokenProvider = () => Task.FromResult(token);
        })
        .Build();

    [Fact]
    public async Task A_change_by_one_user_is_announced_to_others()
    {
        await using var patient = Connect(await Token("emma.wilson@example.com", TestData.PatientPassword));
        var announced = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        patient.On(ClinicHub.ChangedMessage, () => announced.TrySetResult());
        await patient.StartAsync();

        var admin = _factory.CreateClient();
        admin.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", await Token(TestData.AdminEmail, TestData.AdminPassword));
        var res = await admin.PutAsJsonAsync("/api/patients/CF-1025/status", new SetStatusRequest("Inactive"));
        res.EnsureSuccessStatusCode();

        await announced.Task.WaitAsync(TimeSpan.FromSeconds(10));
    }

    [Fact]
    public async Task Anonymous_browsers_cannot_connect()
    {
        await using var anonymous = Connect(null);
        await Assert.ThrowsAnyAsync<Exception>(() => anonymous.StartAsync());
    }
}
