using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Caching.Memory;

namespace ClinicFlow.Api.Security;

/// <summary>
/// Pauses sign-in after repeated wrong passwords: quickly for one address guessing at one account, and more
/// slowly for an account being guessed from many addresses. Counts are kept in memory (single API instance)
/// and treat unknown emails the same as real ones, so a pause doesn't reveal which accounts exist.
/// </summary>
public sealed class LoginGuard(SecurityOptions options, IPasswordHasher<object> hasher) : IDisposable
{
    private readonly MemoryCache _failures = new(new MemoryCacheOptions { SizeLimit = 50_000 });
    private readonly Lock _gate = new();
    private string? _decoy;

    public TimeSpan Lockout => TimeSpan.FromMinutes(options.LockoutMinutes);

    public bool IsLocked(string email, string client) =>
        Count(PairKey(email, client)) >= options.FailedLoginsPerAddress || Count(email) >= options.FailedLoginsPerAccount;

    public void Failed(string email, string client)
    {
        lock (_gate)
        {
            Add(PairKey(email, client));
            Add(email);
        }
    }

    public void Succeeded(string email, string client)
    {
        _failures.Remove(PairKey(email, client));
        _failures.Remove(email);
    }

    /// <summary>Lifts the account-wide pause, for example after the clinic resets the password.</summary>
    public void Forget(string email) => _failures.Remove(email);

    /// <summary>
    /// Does the same work as a real password check. Used for unknown emails so the response time doesn't show
    /// whether an account exists.
    /// </summary>
    public void SpendVerificationTime(string password) =>
        hasher.VerifyHashedPassword(null!, _decoy ??= hasher.HashPassword(null!, Guid.NewGuid().ToString()), password);

    public void Dispose() => _failures.Dispose();

    private int Count(string key) => _failures.TryGetValue(key, out int n) ? n : 0;

    private void Add(string key) =>
        _failures.Set(key, Count(key) + 1, new MemoryCacheEntryOptions { Size = 1, AbsoluteExpirationRelativeToNow = Lockout });

    private static string PairKey(string email, string client) => $"{email}|{client}";
}
