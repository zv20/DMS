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

    internal static string Icon(string name) => name.Trim().ToLowerInvariant() switch
    {
        "глутен" => "🌾", "ракообразни" => "🦐", "яйца" => "🥚", "риба" => "🐟",
        "фъстъци" => "🥜", "соя" => "🫛", "мляко" => "🥛", "ядки" => "🌰",
        "целина" => "🥬", "горчица" => "🟡", "сусам" => "🌾",
        "серен диоксид и сулфити" => "⚗️", "лупина" => "🌸", "мекотели" => "🐚", _ => "⚠️"
    };
}
