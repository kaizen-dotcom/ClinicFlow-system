using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using ClinicFlow.Api.Data;
using ClinicFlow.Api.Dtos;

namespace ClinicFlow.Api.Tests;

/// <summary>End-to-end checks through HTTP: authentication, roles and data isolation.</summary>
public class ApiTests : IAsyncLifetime
{
    private readonly ApiFactory _factory = new();

    public Task InitializeAsync() => _factory.SeedAsync();
    public Task DisposeAsync() => _factory.DisposeAsync().AsTask();

    private async Task<HttpClient> LoginAs(string email, string password)
    {
        var client = _factory.CreateClient();
        var res = await client.PostAsJsonAsync("/api/auth/login", new LoginRequest(email, password));
        res.EnsureSuccessStatusCode();
        var auth = (await res.Content.ReadFromJsonAsync<AuthResponse>())!;
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", auth.Token);
        return client;
    }

    private Task<HttpClient> Admin() => LoginAs(TestData.AdminEmail, TestData.AdminPassword);
    private Task<HttpClient> Emma() => LoginAs("emma.wilson@example.com", TestData.PatientPassword);

    [Fact]
    public async Task Wrong_password_is_rejected_with_a_generic_message()
    {
        var res = await _factory.CreateClient().PostAsJsonAsync("/api/auth/login", new LoginRequest(TestData.AdminEmail, "nope"));
        Assert.Equal(HttpStatusCode.Unauthorized, res.StatusCode);
        Assert.Equal("Incorrect email or password.", (await res.Content.ReadFromJsonAsync<ErrorResponse>())!.Error);
    }

    [Fact]
    public async Task Inactive_patient_cannot_log_in()
    {
        var res = await _factory.CreateClient().PostAsJsonAsync("/api/auth/login", new LoginRequest("lucas.t@example.com", TestData.PatientPassword));
        Assert.Equal(HttpStatusCode.Forbidden, res.StatusCode);
    }

    [Fact]
    public async Task Anonymous_requests_are_unauthorized()
    {
        var res = await _factory.CreateClient().GetAsync("/api/appointments");
        Assert.Equal(HttpStatusCode.Unauthorized, res.StatusCode);
    }

    [Fact]
    public async Task Patients_only_see_their_own_appointments_and_cannot_approve()
    {
        var emma = await Emma();
        var mine = (await emma.GetFromJsonAsync<List<AppointmentDto>>("/api/appointments"))!;
        Assert.NotEmpty(mine);
        Assert.All(mine, a => Assert.Equal("CF-1024", a.PatientId));

        var admin = await Admin();
        var all = (await admin.GetFromJsonAsync<List<AppointmentDto>>("/api/appointments"))!;
        var someoneElses = all.First(a => a.PatientId != "CF-1024" && a.Status == "Pending");

        Assert.Equal(HttpStatusCode.NotFound, (await emma.GetAsync($"/api/appointments/{someoneElses.Id}")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await emma.PostAsJsonAsync($"/api/appointments/{someoneElses.Id}/approve", new NoteRequest(null))).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await emma.GetAsync("/api/patients")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await emma.GetAsync("/api/patients/CF-1025")).StatusCode);
    }

    [Fact]
    public async Task Full_flow_request_approve_notify()
    {
        var emma = await Emma();
        var date = (await emma.GetFromJsonAsync<List<string>>("/api/doctors/amelia-brooks/available-dates?limit=1"))!.Single();
        var slot = (await emma.GetFromJsonAsync<List<SlotDto>>($"/api/doctors/amelia-brooks/slots?date={date}"))!.First(s => s.Available);

        var create = await emma.PostAsJsonAsync("/api/appointments",
            new CreateAppointmentRequest(null, "amelia-brooks", date, slot.Time, "General consultation", "Check-up", null, false));
        Assert.Equal(HttpStatusCode.Created, create.StatusCode);
        var appt = (await create.Content.ReadFromJsonAsync<AppointmentDto>())!;
        Assert.Equal("Pending", appt.Status);
        Assert.StartsWith("APT-", appt.Id);

        // Same slot again -> conflict
        var again = await emma.PostAsJsonAsync("/api/appointments",
            new CreateAppointmentRequest(null, "amelia-brooks", date, slot.Time, "General consultation", "Check-up", null, false));
        Assert.Equal(HttpStatusCode.Conflict, again.StatusCode);

        var admin = await Admin();
        var approved = await admin.PostAsJsonAsync($"/api/appointments/{appt.Id}/approve", new NoteRequest(null));
        Assert.Equal("Approved", (await approved.Content.ReadFromJsonAsync<AppointmentDto>())!.Status);

        var notes = (await emma.GetFromJsonAsync<List<NotificationDto>>("/api/notifications"))!;
        Assert.Contains(notes, n => n.Type == "APPROVAL" && n.Action.AppointmentId == appt.Id);
    }

    [Fact]
    public async Task Changing_the_password_ends_other_sessions()
    {
        var current = await Emma();
        var other = await Emma();

        var wrong = await current.PostAsJsonAsync("/api/auth/password", new ChangePasswordRequest("nope", "NewSecret123"));
        Assert.Equal(HttpStatusCode.BadRequest, wrong.StatusCode);
        var res = await current.PostAsJsonAsync("/api/auth/password", new ChangePasswordRequest(TestData.PatientPassword, "NewSecret123"));
        var auth = (await res.Content.ReadFromJsonAsync<AuthResponse>())!;

        Assert.Equal(HttpStatusCode.Unauthorized, (await other.GetAsync("/api/patients/me")).StatusCode);
        current.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", auth.Token);
        Assert.Equal(HttpStatusCode.OK, (await current.GetAsync("/api/patients/me")).StatusCode);
        await LoginAs("emma.wilson@example.com", "NewSecret123");
    }

    [Fact]
    public async Task Deactivation_and_password_reset_take_effect_immediately()
    {
        var emma = await Emma();
        var admin = await Admin();
        Assert.Equal(HttpStatusCode.Forbidden, (await emma.PostAsync("/api/patients/CF-1025/reset-password", null)).StatusCode);

        await admin.PutAsJsonAsync("/api/patients/CF-1024/status", new SetStatusRequest("Inactive"));
        Assert.Equal(HttpStatusCode.Unauthorized, (await emma.GetAsync("/api/appointments")).StatusCode);
        await admin.PutAsJsonAsync("/api/patients/CF-1024/status", new SetStatusRequest("Active"));

        var reset = await admin.PostAsync("/api/patients/CF-1024/reset-password", null);
        var temporary = (await reset.Content.ReadFromJsonAsync<TemporaryPasswordResponse>())!.TemporaryPassword;
        Assert.Equal(HttpStatusCode.Unauthorized, (await emma.GetAsync("/api/appointments")).StatusCode);
        await LoginAs("emma.wilson@example.com", temporary);
    }

    [Fact]
    public async Task Register_then_login_works_and_validation_errors_are_readable()
    {
        var client = _factory.CreateClient();
        var bad = await client.PostAsJsonAsync("/api/auth/register", new RegisterRequest("Ana", "not-an-email", "short", "1", "1990-01-01"));
        Assert.Equal(HttpStatusCode.BadRequest, bad.StatusCode);
        Assert.False(string.IsNullOrEmpty((await bad.Content.ReadFromJsonAsync<ErrorResponse>())!.Error));

        var ok = await client.PostAsJsonAsync("/api/auth/register", new RegisterRequest("Ana Cruz", "ana@example.com", "Secret123", "+1 555", "1990-01-01"));
        Assert.Equal(HttpStatusCode.OK, ok.StatusCode);
        var login = await LoginAs("ana@example.com", "Secret123");
        var me = (await login.GetFromJsonAsync<PatientDto>("/api/patients/me"))!;
        Assert.Equal("Ana Cruz", me.FullName);
    }
}
