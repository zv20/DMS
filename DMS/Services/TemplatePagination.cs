using DMS.Models;

namespace DMS.Services;

public static class TemplatePagination
{
    public static List<List<MenuEntry>> Plan(int mealsPerDay, List<MenuEntry> entries, IReadOnlyList<Recipe> recipes, Func<IReadOnlyList<MenuEntry>, bool> fits)
    {
        if (mealsPerDay <= 4 || fits(entries)) return [entries];
        var recipeIds = recipes.Select(recipe => recipe.Id).ToHashSet();
        var printable = entries.Where(entry => recipeIds.Contains(entry.RecipeId)).ToList();
        return printable.Count > 0 && Split(printable, fits) is { Count: > 0 } pages ? pages : [entries];
    }

    /// <summary>Pack slot groups in order, splitting a group only when it cannot fit on an empty page.</summary>
    public static List<List<MenuEntry>>? Split(IReadOnlyList<MenuEntry> entries, Func<IReadOnlyList<MenuEntry>, bool> fits)
    {
        var pages = new List<List<MenuEntry>>();
        var current = new List<MenuEntry>();
        bool Add(IReadOnlyList<MenuEntry> group)
        {
            var candidate = current.Concat(group).ToList();
            if (fits(candidate)) { current = candidate; return true; }
            if (current.Count > 0) { pages.Add(current); current = []; }
            if (!fits(group)) return false;
            current.AddRange(group);
            return true;
        }

        foreach (var group in entries.OrderBy(e => MenuOutputService.SlotOrder(e.Slot)).ThenBy(e => e.Date).GroupBy(e => MenuOutputService.SlotOrder(e.Slot)))
        {
            var groupEntries = group.ToArray();
            if (Add(groupEntries)) continue;
            foreach (var entry in groupEntries)
                if (!Add([entry])) return null;
        }
        if (current.Count > 0) pages.Add(current);
        return pages;
    }
}
