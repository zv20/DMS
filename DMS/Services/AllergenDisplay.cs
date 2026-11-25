using DMS.Models;

namespace DMS.Services;

internal static class AllergenDisplay
{
    internal static IReadOnlyDictionary<string, string> BuildIconLookup(IEnumerable<Allergen> allergens)
    {
        var icons = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        foreach (var allergen in allergens)
            icons.TryAdd(allergen.Name, allergen.Icon);
        return icons;
    }

    internal static string FormatList(IEnumerable<string> allergens, IReadOnlyDictionary<string, string> icons) =>
        string.Join("  ", allergens.Select(name => $"{(icons.TryGetValue(name, out var icon) ? icon : Icon(name))} {Localization.Allergen(name)}"));

    internal static List<string> Unrepresented(Recipe recipe, IReadOnlyDictionary<string, Ingredient> ingredients)
    {
        var represented = recipe.Ingredients
            .Where(ingredients.ContainsKey)
            .SelectMany(name => ingredients[name].Allergens)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);
        return recipe.Allergens.Where(name => !represented.Contains(name))
            .Distinct(StringComparer.OrdinalIgnoreCase).ToList();
    }

    internal static (List<string> Standard, List<string> WithAllergens) GroupIngredients(Recipe recipe, IReadOnlyDictionary<string, Ingredient> ingredients)
    {
        var standard = new List<string>();
        var withAllergens = new List<string>();
        foreach (var name in recipe.Ingredients)
        {
            if (ingredients.TryGetValue(name, out var ingredient) && ingredient.Allergens.Count > 0)
                withAllergens.Add(name);
            else
                standard.Add(name);
        }
        return (standard, withAllergens);
    }

    internal static string Icon(string name) => name.Trim().ToLowerInvariant() switch
    {
        "глутен" => "🌾", "ракообразни" => "🦐", "яйца" => "🥚", "риба" => "🐟",
        "фъстъци" => "🥜", "соя" => "🫛", "мляко" => "🥛", "ядки" => "🌰",
        "целина" => "🥬", "горчица" => "🟡", "сусам" => "🌾",
        "серен диоксид и сулфити" => "⚗️", "лупина" => "🌸", "мекотели" => "🐚", _ => "⚠️"
    };
}

internal static class IngredientPicker
{
    internal static List<string> Search(IEnumerable<Ingredient> ingredients, IEnumerable<string> selectedIngredients, string? query)
    {
        var selected = selectedIngredients.ToHashSet(StringComparer.OrdinalIgnoreCase);
        return ingredients
            .Where(item => !selected.Contains(item.Name)
                && (string.IsNullOrWhiteSpace(query) || item.Name.Contains(query, StringComparison.OrdinalIgnoreCase)))
            .Select(item => item.Name)
            .ToList();
    }
}
