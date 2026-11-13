namespace DMS.Views;

internal static class CatalogFilter
{
    public static List<RecipeItemViewModel> Recipes(IEnumerable<RecipeItemViewModel> recipes, string query, string category, string sort, bool ascending)
    {
        string SortKey(RecipeItemViewModel item) => sort switch
        {
            "category" => item.CategoryDisplay,
            "portion" => item.PortionSize,
            "allergens" => item.AllergensDisplay,
            _ => item.Name
        };
        var items = recipes.Where(recipe =>
            (category.Length == 0 || recipe.Category.Equals(category, StringComparison.OrdinalIgnoreCase)) &&
            (query.Length == 0 || recipe.Name.Contains(query, StringComparison.CurrentCultureIgnoreCase) || recipe.CategoryDisplay.Contains(query, StringComparison.CurrentCultureIgnoreCase)));
        return (ascending ? items.OrderBy(SortKey, StringComparer.CurrentCultureIgnoreCase) : items.OrderByDescending(SortKey, StringComparer.CurrentCultureIgnoreCase)).ToList();
    }

    public static List<IngredientItemViewModel> Ingredients(IEnumerable<IngredientItemViewModel> ingredients, string query) =>
        ingredients.Where(ingredient => query.Length == 0 || ingredient.Name.Contains(query, StringComparison.OrdinalIgnoreCase)).ToList();
}
