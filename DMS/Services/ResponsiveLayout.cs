namespace DMS.Services;

public static class ResponsiveLayout
{
    public static int PlannerColumns(double width, int maximumColumns, bool monthly)
    {
        if (!monthly || !double.IsFinite(width) || width <= 0) return Math.Max(1, maximumColumns);
        var available = Math.Max(0, width - 32);
        return Math.Clamp((int)((available + 8) / (150d + 8)), 1, Math.Max(1, maximumColumns));
    }
}
