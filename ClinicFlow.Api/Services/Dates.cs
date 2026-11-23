namespace ClinicFlow.Api.Services;

public static class Dates
{
    public static bool IsWeekend(this DateOnly d) => d.DayOfWeek is DayOfWeek.Saturday or DayOfWeek.Sunday;

    /// <summary>Moves n weekdays (n may be negative; n = 0 returns the same or next weekday).</summary>
    public static DateOnly AddWeekdays(this DateOnly d, int n)
    {
        while (d.IsWeekend()) d = d.AddDays(1);
        var step = n < 0 ? -1 : 1;
        for (var left = Math.Abs(n); left > 0;)
        {
            d = d.AddDays(step);
            if (!d.IsWeekend()) left--;
        }
        return d;
    }

    public static DateOnly StartOfWeek(this DateOnly d) =>
        d.AddDays(d.DayOfWeek == DayOfWeek.Sunday ? -6 : 1 - (int)d.DayOfWeek);

    public static string To12h(this TimeOnly t) => t.ToString("hh:mm tt", System.Globalization.CultureInfo.InvariantCulture);

    public static string Iso(this DateOnly d) => d.ToString("yyyy-MM-dd");

    public static string Hhmm(this TimeOnly t) => t.ToString("HH:mm");
}
