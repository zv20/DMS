using DMS.Models;

namespace DMS.Services;

/// <summary>Shared menu ordering used by the native template renderer.</summary>
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

    public static bool IsVisibleSlot(string slot, int mealsPerDay)
    {
        if (slot.StartsWith("slot", StringComparison.OrdinalIgnoreCase) && int.TryParse(slot.AsSpan(4), out var number)) return number <= mealsPerDay;
        return slot.ToLowerInvariant() switch
        {
            "breakfast" or "soup" => mealsPerDay >= 1,
            "lunch" or "main" => mealsPerDay >= 2,
            "dinner" or "dessert" => mealsPerDay >= 3,
            "snack" or "other" => mealsPerDay >= 4,
            _ => true
        };
    }

    public static int SlotOrder(string slot) => slot.StartsWith("slot", StringComparison.OrdinalIgnoreCase) && int.TryParse(slot.AsSpan(4), out var number) && number > 0 ? number : slot.ToLowerInvariant() switch
    {
        "breakfast" or "soup" => 1,
        "lunch" or "main" => 2,
        "dinner" or "dessert" => 3,
        _ => 4
    };
}
