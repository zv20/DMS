namespace DMS.Services;

public static class ResponsiveLayout
{
    public static int PlannerColumns(double width, int maximumColumns, bool monthly)
    {
        if (!double.IsFinite(width) || width <= 0) return Math.Max(1, maximumColumns);
        var available = Math.Max(0, width - 32);
        var minimumCardWidth = monthly ? 150d : 230d;
        return Math.Clamp((int)((available + 8) / (minimumCardWidth + 8)), 1, Math.Max(1, maximumColumns));
    }
}
