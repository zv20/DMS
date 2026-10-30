using System.Globalization;
using Microsoft.Windows.ApplicationModel.Resources;

namespace DMS.Services;

public static class Localization
{
    private static readonly ResourceManager Manager = new();
    public static string Language { get; private set; } = "bg-BG";

    public static void Apply(string language)
    {
        Language = language == "en" ? "en-US" : "bg-BG";
        Microsoft.Windows.Globalization.ApplicationLanguages.PrimaryLanguageOverride = Language;
        var culture = CultureInfo.GetCultureInfo(Language);
        CultureInfo.DefaultThreadCurrentCulture = culture;
        CultureInfo.DefaultThreadCurrentUICulture = culture;
        CultureInfo.CurrentCulture = culture;
        CultureInfo.CurrentUICulture = culture;
    }

    public static string Get(string key)
    {
        var context = Manager.CreateResourceContext();
        context.QualifierValues["Language"] = Language;
        var resource = Manager.MainResourceMap.TryGetValue("Resources/" + key, context);
        if (resource != null) return resource.ValueAsString;
        context.QualifierValues["Language"] = "en-US";
        return Manager.MainResourceMap.TryGetValue("Resources/" + key, context)?.ValueAsString ?? key;
    }

    public static string Format(string key, params object[] values) => string.Format(CultureInfo.CurrentCulture, Get(key), values);

    public static string Category(string category) => category.ToLowerInvariant() switch
    {
        "soup" => Get("Text_Soup_e373ab"),
        "main" => Get("Text_Main_62bce9"),
        "dessert" => Get("Text_Dessert_40f9c1"),
        "other" => Get("Text_Other_6e6a6f"),
        _ => category
    };

    public static string Allergen(string name)
    {
        var key = name.Trim().ToLowerInvariant() switch
        {
            "глутен" => "AllergenGluten", "ракообразни" => "AllergenCrustaceans",
            "яйца" => "AllergenEggs", "риба" => "AllergenFish", "фъстъци" => "AllergenPeanuts",
            "соя" => "AllergenSoy", "мляко" => "AllergenMilk", "ядки" => "AllergenNuts",
            "целина" => "AllergenCelery", "горчица" => "AllergenMustard", "сусам" => "AllergenSesame",
            "серен диоксид и сулфити" => "AllergenSulphites", "лупина" => "AllergenLupin", "мекотели" => "AllergenMolluscs",
            _ => null
        };
        return key == null ? name : Get(key);
    }
}
