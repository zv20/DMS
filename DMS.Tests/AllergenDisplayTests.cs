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
    public void IngredientGroupsSeparateIngredientsThatContainAllergens()
    {
        var recipe = new Recipe { Ingredients = ["Flour", "Salt", "Unknown"] };
        var ingredients = new Dictionary<string, Ingredient>(StringComparer.OrdinalIgnoreCase)
        {
            ["flour"] = new() { Name = "flour", Allergens = ["gluten"] },
            ["salt"] = new() { Name = "salt" }
        };

        var groups = AllergenDisplay.GroupIngredients(recipe, ingredients);

        Assert.Equal(new[] { "Salt", "Unknown" }, groups.Standard);
        Assert.Equal(new[] { "Flour" }, groups.WithAllergens);
    }
}
