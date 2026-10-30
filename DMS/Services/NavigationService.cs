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
        "templateBuilder" => typeof(Views.TemplateBuilderPage),
        "settings" => typeof(Views.SettingsPage),
        _ => null
    };
}
