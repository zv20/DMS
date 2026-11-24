using DMS.Models;
using DMS.Services;
using Microsoft.Data.Sqlite;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace DMS.Tests;

public sealed class DatabaseRestoreSafetyTests : IDisposable
{
    [Fact]
    public async Task RestoreRejectsArchiveWithUnexpectedFilesBeforeReplacingLiveDatabase()
    {
        var archive = PathFor("unsafe.dmsbackup");
        using (var source = Open("archive-source.db"))
        {
            await source.SaveRecipeAsync(new Recipe { Name = "Source", Category = "soup" });
            await source.CreateBackupAsync(archive);
        }
        using (var zip = System.IO.Compression.ZipFile.Open(archive, System.IO.Compression.ZipArchiveMode.Update))
        using (var writer = new StreamWriter(zip.CreateEntry("unexpected.txt").Open()))
            await writer.WriteAsync("unexpected");

        using var current = Open("archive-current.db");
        await current.SaveRecipeAsync(new Recipe { Name = "Original", Category = "soup" });
        await Assert.ThrowsAsync<InvalidDataException>(() => current.RestoreFromAsync(archive));
        Assert.Equal("Original", Assert.Single(await current.GetAllRecipesAsync()).Name);
    }

    [Fact]
    public async Task RestoreRejectsMissingImageUsageBeforeReplacingLiveDatabase()
    {
        var png = Convert.FromBase64String("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/a6sAAAAASUVORK5CYII=");
        using (var source = Open("missing-usage.db"))
        {
            var image = await source.SaveTemplateImageAsync("Art", "image/png", png);
            await source.SaveTemplateAsync(new MenuTemplate { Name = "Template", Document = new TemplateDocument { BackgroundImageAssetId = image.Id } });
        }
        using (var connection = new SqliteConnection($"Data Source={PathFor("missing-usage.db")};Pooling=False"))
        {
            connection.Open(); using var command = connection.CreateCommand();
            command.CommandText = "DELETE FROM template_image_references"; command.ExecuteNonQuery();
        }
        using var current = Open("missing-usage-current.db");
        await current.SaveRecipeAsync(new Recipe { Name = "Original", Category = "soup" });
        await Assert.ThrowsAsync<InvalidDataException>(() => current.RestoreFromAsync(PathFor("missing-usage.db")));
        Assert.Equal("Original", Assert.Single(await current.GetAllRecipesAsync()).Name);
    }

    [Fact]
    public async Task RestoreRejectsNullRequiredTemplateValueBeforeReplacingLiveDatabase()
    {
        using (var source = Open("null-template.db"))
            await source.SaveTemplateAsync(new MenuTemplate { Name = "Template", Document = new TemplateDocument() });
        using (var connection = new SqliteConnection($"Data Source={PathFor("null-template.db")};Pooling=False"))
        {
            connection.Open(); using var command = connection.CreateCommand();
            command.CommandText = "UPDATE template_documents SET HeaderText=NULL";
            command.ExecuteNonQuery();
        }
        using var current = Open("null-template-current.db");
        await current.SaveRecipeAsync(new Recipe { Name = "Original", Category = "soup" });
        await Assert.ThrowsAsync<InvalidDataException>(() => current.RestoreFromAsync(PathFor("null-template.db")));
        Assert.Equal("Original", Assert.Single(await current.GetAllRecipesAsync()).Name);
    }

    private readonly string _folder = Path.Combine(Path.GetTempPath(), "DMS.Restore.Tests", Guid.NewGuid().ToString("N"));
    private string PathFor(string name) => Path.Combine(_folder, name);
    private DatabaseService Open(string name) { Directory.CreateDirectory(_folder); return new(NullLogger<DatabaseService>.Instance, PathFor(name)); }

    [Fact]
    public async Task RestoreHistoricalFixtureAndBackUpToExactSemicolonPath()
    {
        var directory = PathFor("folder;one");
        Directory.CreateDirectory(directory);
        var live = Path.Combine(directory, "live;one.db");
        var backup = Path.Combine(directory, "backup;two.db");
        using (var source = new DatabaseService(NullLogger<DatabaseService>.Instance, live))
        {
            await source.RestoreFromAsync(Path.Combine(AppContext.BaseDirectory, "Fixtures", "v1-cdaa8a2.db"));
            await source.CreateBackupAsync(backup);
        }
        Assert.True(File.Exists(live));
        using var restored = Open("restored.db");
        await restored.RestoreFromAsync(backup);
        Assert.Equal("Fixture bread", Assert.Single(await restored.GetAllRecipesAsync()).Name);
    }

    [Fact]
    public async Task RestorePreservesDeletedDefaultAllergens()
    {
        using (var source = Open("source.db"))
        {
            var allergen = (await source.GetAllAllergensAsync()).Single(item => item.Name == "глутен");
            await source.DeleteAllergenAsync(allergen.Id);
            await source.CreateBackupAsync(PathFor("backup.db"));
        }
        using (var current = Open("current.db"))
        {
            await current.RestoreFromAsync(PathFor("backup.db"));
            Assert.DoesNotContain(await current.GetAllAllergensAsync(), item => item.Name == "глутен");
        }
        using var reopened = Open("current.db");
        Assert.DoesNotContain(await reopened.GetAllAllergensAsync(), item => item.Name == "глутен");
    }

    [Fact]
    public async Task InvalidBackupsLeaveCurrentDataIntact()
    {
        using var current = Open("current.db");
        await current.SaveRecipeAsync(new Recipe { Name = "Keep", Category = "soup" });
        await File.WriteAllTextAsync(PathFor("invalid.db"), "not a database");
        await Assert.ThrowsAnyAsync<Exception>(() => current.RestoreFromAsync(PathFor("invalid.db")));
        using (var other = new SqliteConnection($"Data Source={PathFor("other.db")};Pooling=False"))
        {
            other.Open(); using var command = other.CreateCommand(); command.CommandText = "CREATE TABLE unrelated (id INTEGER)"; command.ExecuteNonQuery();
        }
        await Assert.ThrowsAsync<InvalidDataException>(() => current.RestoreFromAsync(PathFor("other.db")));
        await Assert.ThrowsAsync<InvalidOperationException>(() => current.RestoreFromAsync(PathFor("current.db")));
        Assert.Equal("Keep", Assert.Single(await current.GetAllRecipesAsync()).Name);
        Assert.False(Directory.Exists(PathFor("RestoreBackups")));
    }

    [Fact]
    public async Task NewerDatabaseVersionIsRejectedWithoutChangingCurrentData()
    {
        using (var newer = Open("newer.db")) await newer.InitializeAsync();
        using (var connection = new SqliteConnection($"Data Source={PathFor("newer.db")};Pooling=False"))
        {
            connection.Open(); using var command = connection.CreateCommand(); command.CommandText = "PRAGMA user_version=999"; command.ExecuteNonQuery();
        }
        using var current = Open("current.db");
        await current.SaveRecipeAsync(new Recipe { Name = "Original", Category = "soup" });
        await Assert.ThrowsAsync<InvalidDataException>(() => current.RestoreFromAsync(PathFor("newer.db")));
        Assert.Equal("Original", Assert.Single(await current.GetAllRecipesAsync()).Name);
    }

    [Theory]
    [InlineData("INSERT INTO templates(name) VALUES('Broken')")]
    [InlineData("INSERT INTO recent_template_colors(position,color) VALUES(3,'#123456')")]
    [InlineData("DROP TABLE recent_template_colors; CREATE TABLE recent_template_colors(position INTEGER PRIMARY KEY,color TEXT); INSERT INTO recent_template_colors VALUES(0,NULL)")]
    [InlineData("INSERT INTO templates(name) VALUES('Broken'); INSERT INTO template_documents(template_name) VALUES('Broken')")]
    [InlineData("ALTER TABLE allergens RENAME COLUMN color TO old_color; ALTER TABLE allergens ADD COLUMN color TEXT")]
    [InlineData("PRAGMA foreign_keys=OFF; INSERT INTO menu(date,slot,recipe_id) VALUES('2026-01-01','slot1',-1)")]
    [InlineData("DROP TABLE menu; CREATE TABLE menu(id INTEGER PRIMARY KEY,date TEXT,slot TEXT,recipe_id INTEGER,created_at TEXT, UNIQUE(date,slot)); INSERT INTO menu(date,slot,recipe_id) VALUES('2026-01-01','slot1',-1)")]
    [InlineData("DROP TABLE ingredients; CREATE TABLE ingredients (name TEXT NOT NULL UNIQUE, id INTEGER PRIMARY KEY, allergens_json TEXT NOT NULL DEFAULT '[]', created_at TEXT NOT NULL DEFAULT '')")]
    [InlineData("ALTER TABLE settings RENAME TO old_settings; CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT); INSERT INTO settings SELECT * FROM old_settings; DROP TABLE old_settings; UPDATE settings SET value=NULL WHERE key='language'")]
    [InlineData("INSERT OR REPLACE INTO settings (key, value) VALUES ('meal_categories', 'not-json')")]
    [InlineData("INSERT OR REPLACE INTO settings (key, value) VALUES ('meals_per_day', 'invalid')")]
    public async Task UnreadableStartupDataIsRejectedBeforeReplacingDatabase(string corrupt)
    {
        using (var source = Open("source.db"))
        {
            await source.SaveRecipeAsync(new Recipe { Name = "Source", Category = "soup" });
            await source.SaveIngredientAsync(new Ingredient { Name = "Source ingredient" });
        }
        using (var connection = new SqliteConnection($"Data Source={PathFor("source.db")};Pooling=False"))
        {
            connection.Open(); using var command = connection.CreateCommand();
            command.CommandText = corrupt; command.ExecuteNonQuery();
        }
        using (var current = Open("current.db"))
        {
            await current.SaveRecipeAsync(new Recipe { Name = "Original", Category = "soup" });
            await Assert.ThrowsAsync<InvalidDataException>(() => current.RestoreFromAsync(PathFor("source.db")));
            Assert.Equal("Original", Assert.Single(await current.GetAllRecipesAsync()).Name);
            Assert.False(File.Exists(PathFor("current.db.recovery-required")));
            Assert.False(Directory.Exists(PathFor("RestoreBackups")));
        }
        using var reopened = Open("current.db");
        Assert.Equal("Original", Assert.Single(await reopened.GetAllRecipesAsync()).Name);
    }

    [Fact]
    public async Task RestoreAcceptsLegacyMissingOptionalSchemaAndJsonNull()
    {
        using (var source = Open("legacy.db"))
        {
            await source.SaveRecipeAsync(new Recipe { Name = "Legacy", Category = "soup", Ingredients = ["Flour"] });
            await source.SaveIngredientAsync(new Ingredient { Name = "Flour", Allergens = ["Gluten"] });
        }
        using (var connection = new SqliteConnection($"Data Source={PathFor("legacy.db")};Pooling=False"))
        {
            connection.Open(); using var command = connection.CreateCommand();
            command.CommandText = "DROP TABLE menu_slot_categories; ALTER TABLE allergens DROP COLUMN icon";
            command.ExecuteNonQuery();
        }
        using var current = Open("current.db");
        await current.RestoreFromAsync(PathFor("legacy.db"));
        var recipe = Assert.Single(await current.GetAllRecipesAsync());
        Assert.Equal(new[] { "Flour" }, recipe.Ingredients);
        Assert.Equal(new[] { "Gluten" }, recipe.Allergens);
        Assert.Equal("Flour", Assert.Single(await current.GetAllIngredientsAsync()).Name);
        Assert.NotEmpty(await current.GetAllAllergensAsync());
    }

    [Fact]
    public async Task RestoreRejectsEmptyDatabaseWithReorderedRecipeColumns()
    {
        using (var source = Open("source.db"))
            await source.CreateBackupAsync(PathFor("backup.db"));
        using (var connection = new SqliteConnection($"Data Source={PathFor("backup.db")};Pooling=False"))
        {
            connection.Open();
            using var command = connection.CreateCommand();
            command.CommandText = "DROP TABLE recipes; CREATE TABLE recipes (name TEXT, id INTEGER PRIMARY KEY, category TEXT, portion_size TEXT, calories INTEGER, instructions TEXT, ingredients_json TEXT, allergens_json TEXT, created_at TEXT, updated_at TEXT)";
            command.ExecuteNonQuery();
        }
        using var current = Open("current.db");
        await Assert.ThrowsAsync<InvalidDataException>(() => current.RestoreFromAsync(PathFor("backup.db")));
    }

    [Fact]
    public async Task RestoreRejectsConflictPolicyOnIngredientTable()
    {
        using (var source = Open("source.db"))
            await source.CreateBackupAsync(PathFor("backup.db"));
        using (var connection = new SqliteConnection($"Data Source={PathFor("backup.db")};Pooling=False"))
        {
            connection.Open();
            using var command = connection.CreateCommand();
            command.CommandText = "DROP TABLE ingredients; CREATE TABLE ingredients (id INTEGER PRIMARY KEY, name TEXT UNIQUE ON /* rule */ CONFLICT REPLACE, allergens_json TEXT, created_at TEXT)";
            command.ExecuteNonQuery();
        }
        using var current = Open("current.db");
        await current.SaveRecipeAsync(new Recipe { Name = "Keep", Category = "soup" });
        await Assert.ThrowsAsync<InvalidDataException>(() => current.RestoreFromAsync(PathFor("backup.db")));
        Assert.Equal("Keep", Assert.Single(await current.GetAllRecipesAsync()).Name);
    }

    [Fact]
    public async Task RestoreRejectsUnexpectedUniqueRecipeConstraint()
    {
        using (var source = Open("source.db"))
        {
            await source.SaveRecipeAsync(new Recipe { Name = "Source", Category = "soup" });
            await source.CreateBackupAsync(PathFor("backup.db"));
        }
        using (var connection = new SqliteConnection($"Data Source={PathFor("backup.db")};Pooling=False"))
        {
            connection.Open();
            using var command = connection.CreateCommand();
            command.CommandText = "CREATE UNIQUE INDEX custom_recipe_name ON recipes(name)";
            command.ExecuteNonQuery();
        }
        using var current = Open("current.db");
        await current.SaveRecipeAsync(new Recipe { Name = "Keep", Category = "soup" });
        await Assert.ThrowsAsync<InvalidDataException>(() => current.RestoreFromAsync(PathFor("backup.db")));
        Assert.Equal("Keep", Assert.Single(await current.GetAllRecipesAsync()).Name);
    }

    [Fact]
    public async Task RestoreRejectsNewerBackupMissingRelationshipTables()
    {
        using (var source = Open("source.db"))
            await source.CreateBackupAsync(PathFor("backup.db"));
        using (var connection = new SqliteConnection($"Data Source={PathFor("backup.db")};Pooling=False"))
        {
            connection.Open();
            using var command = connection.CreateCommand();
            command.CommandText = "DROP TABLE recipe_additional_allergens";
            command.ExecuteNonQuery();
        }
        using var current = Open("current.db");
        await current.SaveRecipeAsync(new Recipe { Name = "Keep", Category = "soup" });
        await Assert.ThrowsAsync<InvalidDataException>(() => current.RestoreFromAsync(PathFor("backup.db")));
        Assert.Equal("Keep", Assert.Single(await current.GetAllRecipesAsync()).Name);
    }

    [Fact]
    public async Task RestoreRejectsImageWhoseHashDoesNotMatchItsId()
    {
        var png = Convert.FromBase64String("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/a6sAAAAASUVORK5CYII=");
        using (var source = Open("source.db"))
        {
            await source.SaveTemplateImageAsync("Logo", "image/png", png);
            await source.CreateBackupAsync(PathFor("backup.db"));
        }
        using (var connection = new SqliteConnection($"Data Source={PathFor("backup.db")};Pooling=False"))
        {
            connection.Open();
            using var command = connection.CreateCommand();
            command.CommandText = "UPDATE template_image_assets SET id='invalid-hash' WHERE name='Logo'";
            command.ExecuteNonQuery();
        }
        using var current = Open("current.db");
        await current.SaveRecipeAsync(new Recipe { Name = "Keep", Category = "soup" });
        await Assert.ThrowsAsync<InvalidDataException>(() => current.RestoreFromAsync(PathFor("backup.db")));
        Assert.Equal("Keep", Assert.Single(await current.GetAllRecipesAsync()).Name);
    }

    [Fact]
    public async Task RestoreCreatesUsableRecoveryBackupAndCopiesSavedImages()
    {
        var png = Convert.FromBase64String("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/a6sAAAAASUVORK5CYII=");
        var day = new DateTime(2026, 1, 5);
        string assetId;
        using (var from = Open("source.db"))
        {
            var recipeId = await from.SaveRecipeAsync(new Recipe { Name = "Restored", Category = "soup" });
            await from.SaveMenuSlotAsync(day, "slot1", "soup", recipeId);
            assetId = (await from.SaveTemplateImageAsync("Logo", "image/png", png)).Id;
            await from.SaveTemplateAsync(new MenuTemplate { Name = "Menu", Document = new TemplateDocument { DecorativeImages = [new TemplateImage { AssetId = assetId }] } });
            await from.CreateBackupAsync(PathFor("backup.db"));
        }
        using (var current = Open("current.db"))
        {
            await current.SaveRecipeAsync(new Recipe { Name = "Before", Category = "soup" });
            await current.RestoreFromAsync(PathFor("backup.db"));
            var recipe = Assert.Single(await current.GetAllRecipesAsync());
            Assert.Equal("Restored", recipe.Name);
            Assert.Equal("slot1", Assert.Single(await current.GetMenuAsync(day, day)).Slot);
            Assert.Equal("soup", Assert.Single(await current.GetMenuCategoriesAsync(day, day)).Category);
            await current.SaveMenuSlotAsync(day, "slot1", "main", recipe.Id);
            Assert.Equal("main", Assert.Single(await current.GetMenuCategoriesAsync(day, day)).Category);
            Assert.Equal(png, (await current.GetTemplateImageAsync(assetId))!.Data);
            Assert.Equal(new[] { "Menu" }, await current.GetTemplateImageUsageAsync(assetId));
        }
        var recovery = Assert.Single(Directory.GetFiles(PathFor("RestoreBackups"), "*.db"));
        using var previous = new DatabaseService(NullLogger<DatabaseService>.Instance, recovery);
        Assert.Equal("Before", Assert.Single(await previous.GetAllRecipesAsync()).Name);
    }

    [Fact]
    public async Task RestoreRejectsTriggersAndViewsWithoutChangingCurrentData()
    {
        using var current = Open("current.db");
        await current.SaveRecipeAsync(new Recipe { Name = "Keep", Category = "soup" });
        foreach (var (name, sql) in new[]
        {
            ("trigger.db", "CREATE TRIGGER corrupt AFTER INSERT ON recipes BEGIN DELETE FROM recipes; END"),
            ("view.db", "CREATE VIEW unexpected AS SELECT * FROM recipes"),
            ("foreign-key.db", "ALTER TABLE settings ADD COLUMN recipe_ref INTEGER REFERENCES recipes(id) ON DELETE CASCADE")
        })
        {
            using (var source = Open(name)) await source.InitializeAsync();
            using (var connection = new SqliteConnection($"Data Source={PathFor(name)};Pooling=False"))
            {
                connection.Open(); using var command = connection.CreateCommand(); command.CommandText = sql; command.ExecuteNonQuery();
            }
            await Assert.ThrowsAsync<InvalidDataException>(() => current.RestoreFromAsync(PathFor(name)));
            Assert.Equal("Keep", Assert.Single(await current.GetAllRecipesAsync()).Name);
        }
        Assert.False(Directory.Exists(PathFor("RestoreBackups")));
    }

    [Fact]
    public async Task FailureAfterReplacementRestoresPreviousDatabase()
    {
        using (var source = Open("source.db"))
        {
            await source.SaveRecipeAsync(new Recipe { Name = "Source", Category = "soup" });
        }
        using (var connection = new SqliteConnection($"Data Source={PathFor("source.db")};Pooling=False"))
        {
            connection.Open(); using var command = connection.CreateCommand();
            command.CommandText = "DROP INDEX idx_menu_date; CREATE TABLE idx_menu_date (unexpected INTEGER)";
            command.ExecuteNonQuery();
        }
        using (var current = Open("current.db"))
        {
            await current.SaveRecipeAsync(new Recipe { Name = "Original", Category = "soup" });
            var error = await Assert.ThrowsAsync<InvalidOperationException>(() => current.RestoreFromAsync(PathFor("source.db")));
            Assert.Contains("previous database was recovered", error.Message);
            Assert.Equal("Original", Assert.Single(await current.GetAllRecipesAsync()).Name);
        }
        using var reopened = Open("current.db");
        Assert.Equal("Original", Assert.Single(await reopened.GetAllRecipesAsync()).Name);
        Assert.Single(Directory.GetFiles(PathFor("RestoreBackups"), "*.db"));
    }

    public void Dispose() { if (Directory.Exists(_folder)) Directory.Delete(_folder, true); }
}
