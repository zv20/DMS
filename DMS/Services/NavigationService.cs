namespace DMS.Services;

public interface INavigationService
{
    Type? GetPageType(string route);
}

public sealed class NavigationService : INavigationService
{
    public Type? GetPageType(string route) => route switch
    {
        "menu" => typeof(Views.MenuPage),
        "recipes" => typeof(Views.RecipesPage),
        "ingredients" => typeof(Views.IngredientsPage),
        "allergens" => typeof(Views.AllergensPage),
        "templateBuilder" => typeof(Views.TemplateBuilderV2Page),
        "templateV2Output" => typeof(Views.TemplateV2OutputPage),
        "settings" => typeof(Views.SettingsPage),
        _ => null
    };
}
