using DMS.Models;

namespace DMS.Services;

/// <summary>Shared meal-slot rules for the planner and menu output.</summary>
public static class MenuOutputService
{
    private static readonly (string Category, string Name)[] LegacySlots =
    [
        ("soup", "Breakfast"),
        ("main", "Lunch"),
        ("dessert", "Dinner"),
        ("other", "Snack")
    ];

    internal static DateTime WeekStart(DateTime date) => date.Date.AddDays(-((6 + (int)date.DayOfWeek) % 7));

    internal static async Task<(AppSettings Settings, List<MenuEntry> Entries, List<Recipe> Recipes, List<Ingredient> Ingredients)>
        LoadWeekAsync(DatabaseService database, DateTime monday)
    {
        var settings = await database.GetSettingsAsync() ?? new AppSettings();
        var lastDay = monday.AddDays(settings.WeekendPlanningEnabled ? 6 : 4);
        var entries = (await database.GetMenuAsync(monday, lastDay))
            .Where(entry => IsVisibleSlot(entry.Slot, settings.MealsPerDay)).ToList();
        var recipes = await database.GetAllRecipesAsync();
        var ingredients = await database.GetAllIngredientsAsync();
        return (settings, entries, recipes, ingredients);
    }

    internal static MenuEntry? FindSlotEntry(int index, IEnumerable<MenuEntry> entries)
    {
        var slot = $"slot{index + 1}";
        var entry = entries.FirstOrDefault(item => item.Slot == slot);
        if (entry != null || index < 0 || index >= LegacySlots.Length) return entry;

        // Prefer the canonical slot, then use the same legacy matching as the planner.
        var (category, name) = LegacySlots[index];
        return entries.FirstOrDefault(item =>
            item.Slot.Equals(category, StringComparison.OrdinalIgnoreCase) || item.Slot == name);
    }

    private static int? NumberedSlot(string slot) =>
        slot.StartsWith("slot", StringComparison.OrdinalIgnoreCase) && int.TryParse(slot.AsSpan(4), out var number)
            ? number : null;

    private static int? LegacySlotNumber(string slot)
    {
        for (var index = 0; index < LegacySlots.Length; index++)
        {
            var (category, name) = LegacySlots[index];
            if (slot.Equals(category, StringComparison.OrdinalIgnoreCase) || slot.Equals(name, StringComparison.OrdinalIgnoreCase))
                return index + 1;
        }
        return null;
    }

    public static bool IsVisibleSlot(string slot, int mealsPerDay) =>
        (NumberedSlot(slot) ?? LegacySlotNumber(slot)) is not int number || number <= mealsPerDay;

    public static int SlotOrder(string slot) =>
        NumberedSlot(slot) is int number && number > 0 ? number : LegacySlotNumber(slot) ?? LegacySlots.Length;
}
