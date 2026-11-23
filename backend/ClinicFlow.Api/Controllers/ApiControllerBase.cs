using ClinicFlow.Api.Dtos;
using ClinicFlow.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace ClinicFlow.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public abstract class ApiControllerBase : ControllerBase
{
    /// <summary>Turns a failed ServiceResult into a JSON error with the matching status code.</summary>
    protected ActionResult Fail<T>(ServiceResult<T> r) => StatusCode(r.Code, new ErrorResponse(r.Error!));

    protected ActionResult Error(string message, int code = 400) => StatusCode(code, new ErrorResponse(message));
}
