using DMS.Models;
using DMS.Services;
using Microsoft.Data.Sqlite;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace DMS.Tests;

public sealed class DatabaseRoundTripTests : IDisposable
{
    [Fact]
    public async Task RecipeKeepsIngredientAndAdditionalAllergenSourcesSeparate()
    {
        using var db = Open("allergen-sources.db");
        var gluten = new Allergen { Name = "Gluten" };
        gluten.Id = await db.SaveAllergenAsync(gluten);
        var nuts = new Allergen { Name = "Nuts" };
        nuts.Id = await db.SaveAllergenAsync(nuts);
        await db.SaveIngredientAsync(new Ingredient { Name = "Flour", Allergens = ["Gluten"] });
        await db.SaveRecipeAsync(new Recipe
        {
            Name = "Bread", Category = "main", Ingredients = ["Flour", "Legacy ingredient"],
            Allergens = ["Gluten", "Nuts"], AdditionalAllergens = ["Nuts"]
        });

        var recipe = Assert.Single(await db.GetAllRecipesAsync());
        Assert.Equal(new[] { "Flour", "Legacy ingredient" }, recipe.Ingredients);
        Assert.Equal(new[] { "Nuts" }, recipe.AdditionalAllergens);
        Assert.Equal(new[] { "Gluten", "Nuts" }, recipe.Allergens);

        gluten.Name = "Wheat";
        await db.SaveAllergenAsync(gluten);
        recipe = Assert.Single(await db.GetAllRecipesAsync());
        Assert.Equal(new[] { "Wheat", "Nuts" }, recipe.Allergens);
    }

    [Fact]
    public async Task BackupAndRestorePreserveAllergenSources()
    {
        using (var source = Open("relationship-source.db"))
        {
            await source.SaveAllergenAsync(new Allergen { Name = "Gluten" });
            await source.SaveAllergenAsync(new Allergen { Name = "Nuts" });
            await source.SaveIngredientAsync(new Ingredient { Name = "Flour", Allergens = ["Gluten"] });
            await source.SaveRecipeAsync(new Recipe
            {
                Name = "Bread", Category = "main", Ingredients = ["Flour"],
                Allergens = ["Gluten", "Nuts"], AdditionalAllergens = ["Nuts"]
            });
            await source.CreateBackupAsync(PathFor("relationship-backup.db"));
        }

        using var restored = Open("relationship-restored.db");
        await restored.RestoreFromAsync(PathFor("relationship-backup.db"));
        var recipe = Assert.Single(await restored.GetAllRecipesAsync());
        Assert.Equal(new[] { "Flour" }, recipe.Ingredients);
        Assert.Equal(new[] { "Nuts" }, recipe.AdditionalAllergens);
        Assert.Equal(new[] { "Gluten", "Nuts" }, recipe.Allergens);
    }

    [Fact]
    public async Task RenamingIngredientUpdatesExistingRecipes()
    {
        using var db = Open("rename.db");
        var ingredient = new Ingredient { Name = "Flour", Allergens = ["gluten"] };
        ingredient.Id = await db.SaveIngredientAsync(ingredient);
        await db.SaveRecipeAsync(new Recipe { Name = "Bread", Category = "main", Ingredients = ["flour"] });
        ingredient.Name = "Whole flour";
        await db.SaveIngredientAsync(ingredient);
        Assert.Equal("Whole flour", Assert.Single(Assert.Single(await db.GetAllRecipesAsync()).Ingredients));
    }

    [Fact]
    public async Task RenamingCaseDistinctIngredientPreservesExistingLookup()
    {
        using var db = Open("case.db");
        var first = await db.SaveIngredientAsync(new Ingredient { Name = "Flour" });
        var second = await db.SaveIngredientAsync(new Ingredient { Name = "flour" });
        await db.SaveRecipeAsync(new Recipe { Name = "Bread", Category = "main", Ingredients = ["flour"] });
        await db.SaveIngredientAsync(new Ingredient { Id = second, Name = "Rice" });
        Assert.Equal("flour", Assert.Single(Assert.Single(await db.GetAllRecipesAsync()).Ingredients));
        await db.SaveIngredientAsync(new Ingredient { Id = first, Name = "Wheat" });
        Assert.Equal("Wheat", Assert.Single(Assert.Single(await db.GetAllRecipesAsync()).Ingredients));
    }

    [Fact]
    public async Task DeletingUsedIngredientIsRejected()
    {
        using var db = Open("delete.db");
        var ingredientId = await db.SaveIngredientAsync(new Ingredient { Name = "Flour" });
        await db.SaveRecipeAsync(new Recipe { Name = "Bread", Category = "main", Ingredients = ["flour"] });
        await Assert.ThrowsAsync<IngredientInUseException>(() => db.DeleteIngredientAsync(ingredientId));
        Assert.Contains(await db.GetAllIngredientsAsync(), ingredient => ingredient.Id == ingredientId);
    }

    private static readonly byte[] Image = Convert.FromBase64String("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/a6sAAAAASUVORK5CYII=");
    private static readonly DateTime Day = new(2026, 1, 5);
    private readonly string _folder = Path.Combine(Path.GetTempPath(), "DMS.RoundTrip.Tests", Guid.NewGuid().ToString("N"));

    private string PathFor(string name) => Path.Combine(_folder, name);
    private DatabaseService Open(string name)
    {
        Directory.CreateDirectory(_folder);
        return new DatabaseService(NullLogger<DatabaseService>.Instance, PathFor(name), seedBuiltInTemplates: false);
    }

    private static async Task PopulateAsync(DatabaseService db)
    {
        await db.SaveIngredientAsync(new Ingredient { Name = "Fixture flour", Allergens = ["глутен"] });
        var recipe = await db.SaveRecipeAsync(new Recipe { Name = "Fixture bread", Category = "main", PortionSize = "120 g", Ingredients = ["Fixture flour"], Allergens = ["глутен"] });
        await db.SaveMenuSlotAsync(Day, "slot1", "main", recipe);
        var image = await db.SaveTemplateImageAsync("Fixture image", "image/png", Image);
        await db.SaveTemplateAsync(new MenuTemplate { Name = "Fixture template", Document = new TemplateDocument { HeaderText = "Fixture menu", DecorativeImages = [new TemplateImage { AssetId = image.Id }] } });
    }

    private static async Task VerifyAsync(DatabaseService db)
    {
        var ingredient = Assert.Single(await db.GetAllIngredientsAsync());
        Assert.Equal("Fixture flour", ingredient.Name);
        Assert.Equal(new[] { "глутен" }, ingredient.Allergens);
        var recipe = Assert.Single(await db.GetAllRecipesAsync());
        Assert.Equal("Fixture bread", recipe.Name);
        Assert.Equal("120 g", recipe.PortionSize);
        Assert.Equal(new[] { ingredient.Name }, recipe.Ingredients);
        Assert.Equal(new[] { "глутен" }, recipe.Allergens);
        var entry = Assert.Single(await db.GetMenuAsync(Day, Day));
        Assert.Equal(recipe.Id, entry.RecipeId);
        Assert.Equal("slot1", entry.Slot);
        Assert.Equal("main", Assert.Single(await db.GetMenuCategoriesAsync(Day, Day)).Category);
        var template = Assert.Single(await db.GetAllTemplatesAsync());
        Assert.Equal("Fixture template", template.Name);
        Assert.Equal("Fixture menu", template.Document!.HeaderText);
        await db.HydrateTemplateImagesAsync(template);
        Assert.Equal("data:image/png;base64," + Convert.ToBase64String(Image), Assert.Single(template.Document.DecorativeImages).DataUri);
    }

    [Fact]
    public async Task RepresentativeDataSurvivesClosingAndReopening()
    {
        using (var db = Open("original.db")) await PopulateAsync(db);
        using var reopened = Open("original.db");
        await VerifyAsync(reopened);
    }

    [Fact]
    public async Task RepresentativeDataSurvivesBackupAndRestoreIntoSeparateDatabase()
    {
        using (var source = Open("source.db"))
        {
            await PopulateAsync(source);
            await source.CreateBackupAsync(PathFor("backup.db"));
        }
        using (var target = Open("target.db")) await target.RestoreFromAsync(PathFor("backup.db"));
        using var reopened = Open("target.db");
        await VerifyAsync(reopened);
    }

    [Fact]
    public async Task HistoricalVersionOneDatabaseUpgradesAndPreservesData()
    {
        Directory.CreateDirectory(_folder);
        File.Copy(Path.Combine(AppContext.BaseDirectory, "Fixtures", "v1-cdaa8a2.db"), PathFor("legacy.db"));
        using (var upgraded = Open("legacy.db"))
        {
            var ingredient = Assert.Single(await upgraded.GetAllIngredientsAsync());
            Assert.Equal("Fixture flour", ingredient.Name);
            Assert.Equal(new[] { "глутен" }, ingredient.Allergens);
            var recipe = Assert.Single(await upgraded.GetAllRecipesAsync());
            Assert.Equal("Fixture bread", recipe.Name);
            Assert.Equal(new[] { ingredient.Name }, recipe.Ingredients);
            Assert.Equal(recipe.Id, Assert.Single(await upgraded.GetMenuAsync(Day, Day)).RecipeId);
            Assert.Equal("main", Assert.Single(await upgraded.GetMenuCategoriesAsync(Day, Day)).Category);
            await upgraded.SaveIngredientAsync(new Ingredient { Name = "Post-upgrade ingredient" });
        }
        using (var connection = new SqliteConnection($"Data Source={PathFor("legacy.db")};Pooling=False"))
        {
            await connection.OpenAsync();
            using var version = connection.CreateCommand();
            version.CommandText = "PRAGMA user_version";
            Assert.True(Convert.ToInt32(await version.ExecuteScalarAsync()) >= 2);
        }
        using var reopened = Open("legacy.db");
        Assert.Contains(await reopened.GetAllIngredientsAsync(), ingredient => ingredient.Name == "Post-upgrade ingredient");
        Assert.Equal("Fixture bread", Assert.Single(await reopened.GetAllRecipesAsync()).Name);
    }

    public void Dispose() { if (Directory.Exists(_folder)) Directory.Delete(_folder, recursive: true); }
}
