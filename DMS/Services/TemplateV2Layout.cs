namespace DMS.Services;

public static class TemplateV2Layout
{
    public const double PageWidth = 794;
    public const double PageHeight = 1123;
    public const double DayMinHeight = 64;
    public const double DayMaxHeight = 350;
    public sealed record Result(double[] DayHeights, bool Overflowed);

    /// <summary>Keep explicitly sized blocks unchanged; allocate the remaining height to automatic blocks.</summary>
    public static Result Resolve(double[] requiredHeights, double?[]? fixedHeights, double availableHeight, double minHeight = DayMinHeight, double maxHeight = DayMaxHeight)
    {
        if (requiredHeights.Length != 5) throw new ArgumentException("Exactly five days are required.", nameof(requiredHeights));
        minHeight = double.IsFinite(minHeight) ? Math.Clamp(minHeight, 1, PageHeight) : DayMinHeight;
        maxHeight = double.IsFinite(maxHeight) ? Math.Clamp(maxHeight, minHeight, PageHeight) : DayMaxHeight;
        availableHeight = double.IsFinite(availableHeight) ? Math.Max(0, availableHeight) : 0;
        var heights = new double[5];
        var automatic = new List<int>();
        var required = new double[5];
        for (var i = 0; i < 5; i++)
        {
            required[i] = double.IsFinite(requiredHeights[i]) ? Math.Max(0, requiredHeights[i]) : maxHeight;
            var pinned = fixedHeights != null && i < fixedHeights.Length ? fixedHeights[i] : null;
            if (pinned is double value && double.IsFinite(value) && value > 0) heights[i] = value;
            else { automatic.Add(i); heights[i] = minHeight; }
        }
        var space = Math.Max(0, availableHeight - heights.Sum());
        // Distribute constrained space proportionally to the additional space each
        // day needs, so later weekdays are not starved by earlier weekdays.
        var demand = automatic.Sum(i => Math.Clamp(required[i], minHeight, maxHeight) - minHeight);
        var fraction = demand > 0 ? Math.Min(1, space / demand) : 0;
        foreach (var i in automatic)
        {
            var desired = Math.Clamp(required[i], minHeight, maxHeight);
            heights[i] += (desired - minHeight) * fraction;
        }
        var overflow = heights.Sum() > availableHeight + .5 || Enumerable.Range(0, 5).Any(i => required[i] > heights[i] + .5);
        return new(heights, overflow);
    }
}
