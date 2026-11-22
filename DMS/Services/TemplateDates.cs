using System.Globalization;

namespace DMS.Services;

internal static class TemplateDates
{
    internal static readonly string[] DayFormats = ["dddd, d MMMM", "dddd", "dddd d", "d dddd", "%d"];
    internal static readonly string[] RangeFormats = ["d", "d MMMM", "d MMMM yyyy", "dd.MM.yyyy", "dddd", "dddd d", "d dddd", "%d"];

    internal static string Day(DateTime date, string format, CultureInfo culture) =>
        date.ToString(DayFormats.Contains(format) ? format : DayFormats[0], culture);

    internal static string Range(DateTime first, DateTime last, string format, CultureInfo culture)
    {
        if (!RangeFormats.Contains(format)) format = RangeFormats[0];
        var start = first.ToString(format, culture);
        return first == last ? start : $"{start} – {last.ToString(format, culture)}";
    }
}
