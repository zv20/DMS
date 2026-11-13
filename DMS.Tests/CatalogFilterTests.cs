using DMS.Views;
using Xunit;

namespace DMS.Tests;

public sealed class CatalogFilterTests
{
    [Fact]
    public void RecipeSearchFiltersAndSortsBySelectedFields()
    {
        RecipeItemViewModel[] recipes =
        [
            new() { Name = "Zebra", Category = "main", CategoryDisplay = "Main", PortionSize = "2" },
            new() { Name = "Apple", Category = "MAIN", CategoryDisplay = "Main", PortionSize = "1" },
            new() { Name = "Soup", Category = "soup", CategoryDisplay = "Soup", PortionSize = "3" }
        ];
        Assert.Equal(new[] { "Zebra", "Apple" }, CatalogFilter.Recipes(recipes, "main", "MAIN", "portion", false).Select(x => x.Name));
        Assert.Equal("Apple", Assert.Single(CatalogFilter.Recipes(recipes, "apple", "", "name", true)).Name);
        Assert.Empty(CatalogFilter.Recipes(recipes, "missing", "", "name", true));
    }

    [Fact]
    public void IngredientSearchIsCaseInsensitiveAndKeepsOrder()
    {
        IngredientItemViewModel[] ingredients = [new() { Name = "Milk" }, new() { Name = "Oat milk" }, new() { Name = "Flour" }];
        Assert.Equal(new[] { "Milk", "Oat milk" }, CatalogFilter.Ingredients(ingredients, "MILK").Select(x => x.Name));
        Assert.Equal(3, CatalogFilter.Ingredients(ingredients, "").Count);
    }
}
