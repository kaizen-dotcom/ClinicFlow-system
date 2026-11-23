using ClinicFlow.Api.Dtos;
using ClinicFlow.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ClinicFlow.Api.Controllers;

/// <summary>Doctor availability management (admin only). Reading availability is under /api/availability.</summary>
[Authorize(Roles = Roles.Admin)]
public class SchedulesController(ClinicService clinic) : ApiControllerBase
{
    [HttpPost]
    public async Task<ActionResult<AddAvailabilityResponse>> Add(AddAvailabilityRequest req, CancellationToken ct)
    {
        var r = await clinic.AddAvailabilityAsync(req, ct);
        return r.Ok ? r.Value! : Fail(r);
    }

    [HttpDelete("{id:int}")]
    public async Task<ActionResult> Remove(int id, CancellationToken ct)
    {
        var r = await clinic.RemoveAvailabilityAsync(id, ct);
        return r.Ok ? NoContent() : Fail(r);
    }
}
