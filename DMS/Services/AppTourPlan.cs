namespace DMS.Services;

public sealed record AppTourStep(string NavigationTag, string TitleKey, string DescriptionKey);

public static class AppTourPlan
{
    public static IReadOnlyList<AppTourStep> Steps { get; } =
    [
        new("menu", "TourMenuTitle", "TourMenuDescription"),
        new("recipes", "TourRecipesTitle", "TourRecipesDescription"),
        new("ingredients", "TourIngredientsTitle", "TourIngredientsDescription"),
        new("templateBuilder", "TourTemplateTitle", "TourTemplateDescription"),
        new("settings", "TourSettingsTitle", "TourSettingsDescription")
    ];
}
