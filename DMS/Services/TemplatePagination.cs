namespace DMS.Services;

public static class TemplatePagination
{
    // Each index represents a complete day in the template's week, including
    // an empty day when the template explicitly requests one.
    public static List<int[]> Plan(int[] days, Func<int[], bool> fits)
    {
        if (days.Length <= 1 || fits(days)) return [days];
        var pages = new List<int[]>();
        int[] current = [];
        foreach (var day in days)
        {
            int[] candidate = [.. current, day];
            if (current.Length > 0 && !fits(candidate))
            {
                pages.Add(current);
                current = [day];
            }
            else current = candidate;
        }
        // An oversized day stays on its own page; the renderer reports overflow.
        pages.Add(current);
        return pages;
    }
}
