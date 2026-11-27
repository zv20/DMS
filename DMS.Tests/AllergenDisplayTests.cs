using DMS.Models;
using DMS.Services;
using Xunit;

namespace DMS.Tests;

public sealed class AllergenDisplayTests
{
    [Fact]
    public void UnrepresentedIncludesManualAndMissingIngredientAllergens()
    {
        var recipe = new Recipe { Ingredients = ["Flour", "Missing"], Allergens = ["Gluten", "Milk", "milk", "Eggs"] };
        var ingredients = new Dictionary<string, Ingredient>(StringComparer.OrdinalIgnoreCase)
        {
            ["flour"] = new() { Name = "flour", Allergens = ["gluten"] }
        };

        Assert.Equal(new[] { "Milk", "Eggs" }, AllergenDisplay.Unrepresented(recipe, ingredients));
    }

    [Fact]
    public void IngredientItemsKeepRecipeOrderAndMarkAllergenIngredients()
    {
        var recipe = new Recipe { Ingredients = ["Flour", "Salt", "Unknown"] };
        var ingredients = new Dictionary<string, Ingredient>(StringComparer.OrdinalIgnoreCase)
        {
            ["flour"] = new() { Name = "flour", Allergens = ["gluten"] },
            ["salt"] = new() { Name = "salt" }
        };

        var items = AllergenDisplay.BuildIngredientItems(recipe, ingredients);

        Assert.Equal(new[] { "Flour", "Salt", "Unknown" }, items.Select(item => item.Name));
        Assert.Equal(new[] { true, false, false }, items.Select(item => item.HasAllergens));
    }

    [Fact]
    public void IngredientSearchMatchesBulgarianNamesIgnoringCaseAndExcludesSelectedIngredients()
    {
        var ingredients = new[]
        {
            new Ingredient { Name = "Масло" },
            new Ingredient { Name = "Сол" }
        };

        var matches = IngredientPicker.Search(ingredients, ["Сол"], "масло");

        Assert.Equal(new[] { "Масло" }, matches);
    }
}
