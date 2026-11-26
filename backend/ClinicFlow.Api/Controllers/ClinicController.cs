using ClinicFlow.Api.Data;
using ClinicFlow.Api.Dtos;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ClinicFlow.Api.Controllers;

/// <summary>The clinic's public name and phone number (set by the administrator under Profile &amp; settings).</summary>
[AllowAnonymous]
public class ClinicController(ClinicDbContext db) : ApiControllerBase
{
    [HttpGet]
    public async Task<ClinicInfoDto> Get(CancellationToken ct) =>
        await db.Admins.AsNoTracking().OrderBy(a => a.Id).Select(a => new ClinicInfoDto(a.ClinicName, a.Phone)).FirstOrDefaultAsync(ct)
        ?? new ClinicInfoDto("ClinicFlow", "");
}
