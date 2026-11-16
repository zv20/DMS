using System.Globalization;
using DMS.Models;

namespace DMS.Services;

/// <summary>Shared meal-slot rules for the planner and menu output.</summary>
public static class MenuOutputService
{
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
        return entries.FirstOrDefault(entry => entry.Slot == slot);
    }

    private static int? NumberedSlot(string slot) =>
        slot.Length > 4 && slot.StartsWith("slot", StringComparison.Ordinal) && slot[4] is >= '1' and <= '9' &&
        int.TryParse(slot.AsSpan(4), NumberStyles.None, CultureInfo.InvariantCulture, out var number)
            ? number : null;

    public static bool IsVisibleSlot(string slot, int mealsPerDay) =>
        NumberedSlot(slot) is int number && number <= mealsPerDay;

    public static int SlotOrder(string slot) => NumberedSlot(slot) ?? int.MaxValue;
}
