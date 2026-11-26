using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.IdentityModel.Tokens;

namespace ClinicFlow.Api.Services;

public static class Roles
{
    public const string Admin = "Admin";
    public const string Patient = "Patient";
}

public class JwtOptions
{
    public string Issuer { get; set; } = "ClinicFlow";
    public string Audience { get; set; } = "ClinicFlow";
    /// <summary>HMAC signing key, at least 32 characters. Keep it in User Secrets / environment variables.</summary>
    public string Key { get; set; } = "";
    public int ExpiryHours { get; set; } = 8;

    public SymmetricSecurityKey SigningKey() => new(Encoding.UTF8.GetBytes(Key));
}

public class TokenService(JwtOptions options, TimeProvider clock)
{
    /// <summary>Claim that ties a token to the password it was issued for.</summary>
    public const string StampClaim = "stamp";

    /// <summary>A fingerprint of the stored password hash; it changes whenever the password does.</summary>
    public static string Stamp(string passwordHash) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(passwordHash)))[..16];

    public (string Token, DateTime ExpiresAt) Create(string userId, string role, string email, string passwordHash)
    {
        var expires = clock.GetUtcNow().UtcDateTime.AddHours(options.ExpiryHours);
        var token = new JwtSecurityToken(
            issuer: options.Issuer,
            audience: options.Audience,
            claims:
            [
                new Claim(JwtRegisteredClaimNames.Sub, userId),
                new Claim(ClaimTypes.Role, role),
                new Claim(JwtRegisteredClaimNames.Email, email),
                new Claim(StampClaim, Stamp(passwordHash))
            ],
            expires: expires,
            signingCredentials: new SigningCredentials(options.SigningKey(), SecurityAlgorithms.HmacSha256));
        return (new JwtSecurityTokenHandler().WriteToken(token), expires);
    }
}

public static class ClaimsExtensions
{
    public static string UserId(this ClaimsPrincipal user) =>
        user.FindFirstValue(JwtRegisteredClaimNames.Sub) ?? user.FindFirstValue(ClaimTypes.NameIdentifier) ?? "";

    public static bool IsAdmin(this ClaimsPrincipal user) => user.IsInRole(Roles.Admin);
}
