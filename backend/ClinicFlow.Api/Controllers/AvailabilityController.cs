using ClinicFlow.Api.Dtos;
using ClinicFlow.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ClinicFlow.Api.Controllers;

/// <summary>Schedule blocks and booked times (no patient details) so the UI can show open slots.</summary>
[Authorize]
public class AvailabilityController(ClinicService clinic) : ApiControllerBase
{
    [HttpGet]
    public async Task<ActionResult<AvailabilityDto>> Get([FromQuery] string from, [FromQuery] string to, CancellationToken ct)
    {
        if (!Mapping.TryParseDate(from, out var f) || !Mapping.TryParseDate(to, out var t) || t < f)
            return Error("Use from=yyyy-MM-dd&to=yyyy-MM-dd.");
        if (t.DayNumber - f.DayNumber > 370) return Error("The range can be at most one year.");
        return await clinic.GetAvailabilityAsync(f, t, ct);
    }
}
