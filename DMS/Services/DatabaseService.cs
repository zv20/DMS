using Microsoft.Extensions.Logging;
using Microsoft.Data.Sqlite;
using System.Globalization;
using System.IO;
using DMS.Models;

namespace DMS.Services;

public sealed class RecipeInUseException : InvalidOperationException
{
    public RecipeInUseException() : base("This recipe is assigned to one or more menu entries. Remove or replace those entries before deleting the recipe.") { }
}

public sealed class IngredientInUseException : InvalidOperationException;

public partial class DatabaseService : IDisposable
{
    private const string MenuDateFormat = "yyyy-MM-dd";
    private const string MenuSelect = "SELECT id, date, slot, recipe_id FROM menu";
    private const string MenuCategoriesSelect = "SELECT date, slot, category FROM menu_slot_categories";
    private const string UpsertMenu = @"INSERT INTO menu(date, slot, recipe_id) VALUES(@date, @slot, @recipe)
        ON CONFLICT(date, slot) DO UPDATE SET recipe_id=@recipe";
    private const string UpsertMenuCategory = @"INSERT INTO menu_slot_categories(date, slot, category) VALUES(@date, @slot, @category)
        ON CONFLICT(date, slot) DO UPDATE SET category=@category";
    private readonly ILogger<DatabaseService> _logger;
    private readonly bool _seedBuiltInTemplates;
    private readonly string _dbPath;
    private SqliteConnection? _connection;
    private readonly SemaphoreSlim _initLock = new(1, 1);
    private bool _initialized = false;

    public DatabaseService(ILogger<DatabaseService> logger, string? databasePath = null, bool seedBuiltInTemplates = true)
    {
        _logger = logger;
        _seedBuiltInTemplates = seedBuiltInTemplates;
        if (string.IsNullOrWhiteSpace(databasePath))
        {
            var appData = Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData);
            var dmsFolder = Path.Combine(appData, "DMS");
            Directory.CreateDirectory(dmsFolder);
            _dbPath = Path.Combine(dmsFolder, "dms.db");
        }
        else
        {
            var databaseFolder = Path.GetDirectoryName(databasePath)
                ?? throw new ArgumentException("The database path must include a directory.", nameof(databasePath));
            Directory.CreateDirectory(databaseFolder);
            _dbPath = databasePath;
        }
        _logger.LogInformation("Database path: {Path}", _dbPath);
    }

    public async Task InitializeAsync()
    {
        ThrowIfRecoveryRequired();
        if (_initialized) return;

        await _initLock.WaitAsync();
        try
        {
            ThrowIfRecoveryRequired();
            if (_initialized) return;

            // The app owns one long-lived connection. Disabling ADO.NET pooling
            // makes backup/restore and test cleanup release WAL handles promptly
            // on Windows instead of leaving files locked by a pooled connection.
            _connection = new SqliteConnection(new SqliteConnectionStringBuilder { DataSource = _dbPath, Pooling = false }.ToString());
            await _connection.OpenAsync();

            await ConfigureConnectionAsync();
            await CreateSchemaAsync();
            _initialized = true;
            _logger.LogInformation("Database initialized");
        }
        catch
        {
            if (_connection != null)
            {
                await _connection.DisposeAsync();
                _connection = null;
            }
            throw;
        }
        finally
        {
            _initLock.Release();
        }
    }

    private string RecoveryMarkerPath => _dbPath + ".recovery-required";

    private void ThrowIfRecoveryRequired()
    {
        var markerPath = RecoveryMarkerPath;
        if (!File.Exists(markerPath)) return;
        string recoveryPath;
        try { recoveryPath = File.ReadAllText(markerPath).Trim(); }
        catch (IOException) { recoveryPath = ""; }
        catch (UnauthorizedAccessException) { recoveryPath = ""; }
        throw new DatabaseRecoveryRequiredException(_dbPath, recoveryPath, markerPath);
    }

    private void WriteRecoveryMarker(string recoveryPath)
    {
        var created = false;
        try
        {
            using var stream = new FileStream(RecoveryMarkerPath, FileMode.CreateNew, FileAccess.Write, FileShare.Read);
            created = true;
            using (var writer = new StreamWriter(stream, System.Text.Encoding.UTF8, 1024, leaveOpen: true))
            {
                writer.Write(recoveryPath);
                writer.Flush();
            }
            // Make the recovery location durable before touching the live database.
            stream.Flush(flushToDisk: true);
        }
        catch
        {
            // A failed marker write occurs before replacement; remove only the
            // incomplete marker we created, never one owned by another restore.
            if (created) { try { File.Delete(RecoveryMarkerPath); } catch (IOException) { } catch (UnauthorizedAccessException) { } }
            throw;
        }
    }

    private async Task ConfigureConnectionAsync()
    {
        if (_connection == null) return;

        // Foreign-key enforcement is connection-local in SQLite. Keep it enabled
        // before any page can write data so recipe/menu relationships remain valid.
        using var command = _connection.CreateCommand();
        command.CommandText = "PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;";
        await command.ExecuteNonQueryAsync();
    }

    private async Task CreateSchemaAsync()
    {
        if (_connection == null) return;

        var commands = new[]
        {
            @"CREATE TABLE IF NOT EXISTS recipes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                category TEXT NOT NULL,
                portion_size TEXT,
                calories INTEGER,
                instructions TEXT,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now'))
            )",
            @"CREATE TABLE IF NOT EXISTS ingredients (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            )",
            @"CREATE TABLE IF NOT EXISTS menu (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                date TEXT NOT NULL,
                slot TEXT NOT NULL,
                recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE RESTRICT,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                UNIQUE(date, slot)
            )",
            @"CREATE TABLE IF NOT EXISTS menu_slot_categories (
                date TEXT NOT NULL,
                slot TEXT NOT NULL,
                category TEXT NOT NULL,
                PRIMARY KEY(date, slot)
            )",
            @"CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            )",
            @"CREATE TABLE IF NOT EXISTS templates (
                name TEXT PRIMARY KEY,
                data_json TEXT NOT NULL,
                is_preset INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now'))
            )",
            @"CREATE TABLE IF NOT EXISTS schema_migrations (
                version INTEGER PRIMARY KEY,
                applied_at TEXT NOT NULL DEFAULT (datetime('now'))
            )",
            "CREATE INDEX IF NOT EXISTS idx_menu_date ON menu(date)",
            "CREATE INDEX IF NOT EXISTS idx_menu_recipe_id ON menu(recipe_id)"
        };

        foreach (var sql in commands)
        {
            using var cmd = _connection.CreateCommand();
            cmd.CommandText = sql;
            await cmd.ExecuteNonQueryAsync();
        }

        await InitializeAllergensAsync();
        // Seed default settings
        await SeedDefaultsAsync();
        await RecordSchemaVersionAsync();
        InitializeTemplateImages();
        InitializeRelationships();
        InitializeTemplateStorage();
        if (_seedBuiltInTemplates) SeedSeasonalTemplatePresets();
    }

    private async Task InitializeAllergensAsync()
    {
        if (_connection == null) return;
        using var transaction = _connection.BeginTransaction();
        bool exists;
        using (var check = _connection.CreateCommand())
        {
            check.Transaction = transaction;
            check.CommandText = "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='allergens' COLLATE NOCASE";
            exists = Convert.ToInt32(await check.ExecuteScalarAsync()) > 0;
        }
        var addedIcons = false;
        if (!exists)
        {
            using var create = _connection.CreateCommand();
            create.Transaction = transaction;
            create.CommandText = @"CREATE TABLE allergens (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                color TEXT NOT NULL DEFAULT '#3498db',
                icon TEXT NOT NULL DEFAULT '⚠️',
                created_at TEXT NOT NULL DEFAULT (datetime('now')))";
            await create.ExecuteNonQueryAsync();
        }
        else
        {
            using var check = _connection.CreateCommand();
            check.Transaction = transaction;
            check.CommandText = "PRAGMA table_info(allergens)";
            var hasIcon = false;
            using (var reader = await check.ExecuteReaderAsync())
                while (await reader.ReadAsync()) hasIcon |= string.Equals(reader.GetString(1), "icon", StringComparison.OrdinalIgnoreCase);
            if (!hasIcon)
            {
                using var alter = _connection.CreateCommand();
                alter.Transaction = transaction;
                alter.CommandText = "ALTER TABLE allergens ADD COLUMN icon TEXT NOT NULL DEFAULT '⚠️'";
                await alter.ExecuteNonQueryAsync();
                addedIcons = true;
            }
        }
        if (!exists || addedIcons) await SeedDefaultAllergensAsync(transaction, seedDefaults: !exists);
        transaction.Commit();
    }

    private async Task SeedDefaultAllergensAsync(SqliteTransaction transaction, bool seedDefaults)
    {
        if (_connection == null) return;
        var defaults = new (string Name, string Icon, string Color)[]
        {
            ("глутен", "🌾", "#D97706"), ("ракообразни", "🦐", "#DC2626"),
            ("яйца", "🥚", "#EAB308"), ("риба", "🐟", "#0284C7"),
            ("фъстъци", "🥜", "#A16207"), ("соя", "🫛", "#65A30D"),
            ("мляко", "🥛", "#64748B"), ("ядки", "🌰", "#92400E"),
            ("целина", "🥬", "#16A34A"), ("горчица", "🟡", "#CA8A04"),
            ("сусам", "🌾", "#B45309"), ("серен диоксид и сулфити", "⚗️", "#7C3AED"),
            ("лупина", "🌸", "#DB2777"), ("мекотели", "🐚", "#0F766E")
        };
        foreach (var allergen in defaults)
        {
            using var command = _connection.CreateCommand();
            command.Transaction = transaction;
            command.CommandText = seedDefaults
                ? "INSERT INTO allergens (name, color, icon) VALUES (@name, @color, @icon)"
                : "UPDATE allergens SET icon=@icon WHERE name=@name AND icon='⚠️'";
            command.Parameters.AddWithValue("@name", allergen.Name);
            command.Parameters.AddWithValue("@icon", allergen.Icon);
            if (seedDefaults) command.Parameters.AddWithValue("@color", allergen.Color);
            await command.ExecuteNonQueryAsync();
        }
    }

    private async Task RecordSchemaVersionAsync()
    {
        if (_connection == null) return;

        using var command = _connection.CreateCommand();
        command.CommandText = "INSERT OR IGNORE INTO schema_migrations(version) VALUES (1)";
        await command.ExecuteNonQueryAsync();
    }

    private async Task SeedDefaultsAsync()
    {
        if (_connection == null) return;

        var defaults = new Dictionary<string, string>
        {
            ["language"] = "bg",
            ["theme"] = "light"
        };

        foreach (var (key, value) in defaults)
        {
            using var cmd = _connection.CreateCommand();
            cmd.CommandText = "INSERT OR IGNORE INTO settings (key, value) VALUES (@key, @value)";
            cmd.Parameters.AddWithValue("@key", key);
            cmd.Parameters.AddWithValue("@value", value);
            await cmd.ExecuteNonQueryAsync();
        }
    }

    public string GetDatabasePath() => _dbPath;

    // Recipe operations
    public async Task<List<Recipe>> GetAllRecipesAsync()
    {
        await InitializeAsync();
        var recipes = new List<Recipe>();
        using (var cmd = _connection!.CreateCommand())
        {
            cmd.CommandText = "SELECT * FROM recipes ORDER BY name";
            using var reader = await cmd.ExecuteReaderAsync();
            while (await reader.ReadAsync()) recipes.Add(ReadRecipe(reader));
        }
        var ingredients = ReadRelations("recipe_ingredients", "recipe_id", "ingredient_id", "ingredients", useCurrentNames: false);
        var additional = ReadRelations("recipe_additional_allergens", "recipe_id", "allergen_id", "allergens");
        var ingredientAllergens = ReadRelations("ingredient_allergens", "ingredient_id", "allergen_id", "allergens");
        var ingredientIds = new Dictionary<string, long>(StringComparer.OrdinalIgnoreCase);
        using (var command = _connection.CreateCommand())
        {
            command.CommandText = "SELECT id,name FROM ingredients ORDER BY name";
            using var reader = command.ExecuteReader();
            while (reader.Read()) ingredientIds.TryAdd(reader.GetString(1), reader.GetInt64(0));
        }
        foreach (var recipe in recipes)
        {
            recipe.Ingredients = ingredients.GetValueOrDefault(recipe.Id) ?? [];
            recipe.AdditionalAllergens = additional.GetValueOrDefault(recipe.Id) ?? [];
            recipe.Allergens = recipe.Ingredients.Where(ingredientIds.ContainsKey)
                .SelectMany(name => ingredientAllergens.GetValueOrDefault(ingredientIds[name]) ?? [])
                .Concat(recipe.AdditionalAllergens).Distinct(StringComparer.OrdinalIgnoreCase).ToList();
        }
        return recipes;
    }

    public async Task<int> SaveRecipeAsync(Recipe recipe)
    {
        await InitializeAsync();
        using var transaction = _connection!.BeginTransaction();
        using var cmd = _connection.CreateCommand();
        cmd.Transaction = transaction;
        var now = DateTime.UtcNow.ToString("O");
        if (recipe.Id == 0)
        {
            cmd.CommandText = @"INSERT INTO recipes (name, category, portion_size, calories, instructions, created_at, updated_at)
                               VALUES (@name, @category, @portion, @calories, @instructions, @now, @now);
                               SELECT last_insert_rowid();";
        }
        else
        {
            cmd.CommandText = @"UPDATE recipes SET name=@name, category=@category, portion_size=@portion, calories=@calories,
                               instructions=@instructions, updated_at=@now
                               WHERE id=@id";
            cmd.Parameters.AddWithValue("@id", recipe.Id);
        }

        cmd.Parameters.AddWithValue("@name", recipe.Name);
        cmd.Parameters.AddWithValue("@category", recipe.Category);
        cmd.Parameters.AddWithValue("@portion", recipe.PortionSize);
        cmd.Parameters.AddWithValue("@calories", recipe.Calories);
        cmd.Parameters.AddWithValue("@instructions", recipe.Instructions ?? "");
        cmd.Parameters.AddWithValue("@now", now);

        var result = await cmd.ExecuteScalarAsync();
        var id = recipe.Id == 0 ? Convert.ToInt32(result!) : recipe.Id;
        ReplaceRelations("recipe_ingredients", "recipe_id", id, "ingredient_id", "ingredients", recipe.Ingredients, transaction);
        ReplaceRelations("recipe_additional_allergens", "recipe_id", id, "allergen_id", "allergens", recipe.AdditionalAllergens ?? recipe.Allergens, transaction);
        transaction.Commit();
        _logger.LogInformation("Saved recipe {Id}: {Name}", id, recipe.Name);
        return id;
    }

    public async Task DeleteRecipeAsync(int id)
    {
        await InitializeAsync();
        using (var usageCommand = _connection!.CreateCommand())
        {
            usageCommand.CommandText = "SELECT COUNT(*) FROM menu WHERE recipe_id = @id";
            usageCommand.Parameters.AddWithValue("@id", id);
            var assignmentCount = Convert.ToInt32(await usageCommand.ExecuteScalarAsync());
            if (assignmentCount > 0)
            {
                throw new RecipeInUseException();
            }
        }

        using var cmd = _connection!.CreateCommand();
        cmd.CommandText = "DELETE FROM recipes WHERE id = @id";
        cmd.Parameters.AddWithValue("@id", id);
        await cmd.ExecuteNonQueryAsync();
        _logger.LogInformation("Deleted recipe {Id}", id);
    }

    private static Recipe ReadRecipe(SqliteDataReader reader)
    {
        return new Recipe
        {
            Id = reader.GetInt32(0),
            Name = reader.GetString(1),
            Category = reader.GetString(2),
            PortionSize = reader.IsDBNull(3) ? "" : reader.GetString(3),
            Calories = reader.IsDBNull(4) ? 0 : reader.GetInt32(4),
            Instructions = reader.IsDBNull(5) ? "" : reader.GetString(5),
            Ingredients = [], Allergens = []
        };
    }

    // Ingredient operations
    public async Task<List<Ingredient>> GetAllIngredientsAsync()
    {
        await InitializeAsync();
        var list = new List<Ingredient>();
        using (var cmd = _connection!.CreateCommand())
        {
            cmd.CommandText = "SELECT * FROM ingredients ORDER BY name";
            using var reader = await cmd.ExecuteReaderAsync();
            while (await reader.ReadAsync()) list.Add(ReadIngredient(reader));
        }
        var allergens = ReadRelations("ingredient_allergens", "ingredient_id", "allergen_id", "allergens");
        foreach (var ingredient in list) ingredient.Allergens = allergens.GetValueOrDefault(ingredient.Id) ?? [];
        return list;
    }

    public async Task<int> SaveIngredientAsync(Ingredient ingredient)
    {
        await InitializeAsync();
        using var transaction = _connection!.BeginTransaction();
        using var cmd = _connection!.CreateCommand();
        cmd.Transaction = transaction;
        var now = DateTime.UtcNow.ToString("O");

        if (ingredient.Id != 0)
        {
            using var previous = _connection.CreateCommand();
            previous.Transaction = transaction;
            previous.CommandText = "SELECT name FROM ingredients WHERE id=@id";
            previous.Parameters.AddWithValue("@id", ingredient.Id);
            var oldName = await previous.ExecuteScalarAsync() as string;
            if (oldName != null && oldName != ingredient.Name)
            {
                using var candidates = _connection.CreateCommand();
                candidates.Transaction = transaction;
                candidates.CommandText = "SELECT id, name FROM ingredients ORDER BY name";
                var firstMatch = 0L;
                using (var reader = await candidates.ExecuteReaderAsync())
                {
                    while (await reader.ReadAsync())
                    {
                        var candidateId = reader.GetInt64(0);
                        var candidateName = reader.GetString(1);
                        if (firstMatch == 0 && string.Equals(candidateName, oldName, StringComparison.OrdinalIgnoreCase)) firstMatch = candidateId;
                        if (candidateId != ingredient.Id && string.Equals(candidateName, ingredient.Name, StringComparison.OrdinalIgnoreCase))
                            throw new InvalidOperationException("Ingredient name conflicts with another ingredient.");
                    }
                }
                if (firstMatch == ingredient.Id)
                {
                    using var updateRelations = _connection.CreateCommand();
                    updateRelations.Transaction = transaction;
                    updateRelations.CommandText = "UPDATE recipe_ingredients SET saved_name=@new WHERE ingredient_id=@id";
                    updateRelations.Parameters.AddWithValue("@new", ingredient.Name);
                    updateRelations.Parameters.AddWithValue("@id", ingredient.Id);
                    await updateRelations.ExecuteNonQueryAsync();
                }
            }
        }

        if (ingredient.Id == 0)
        {
            cmd.CommandText = @"INSERT INTO ingredients (name, created_at)
                               VALUES (@name, @now);
                               SELECT last_insert_rowid();";
        }
        else
        {
            cmd.CommandText = "UPDATE ingredients SET name=@name WHERE id=@id";
            cmd.Parameters.AddWithValue("@id", ingredient.Id);
        }

        cmd.Parameters.AddWithValue("@name", ingredient.Name);
        cmd.Parameters.AddWithValue("@now", now);

        var result = await cmd.ExecuteScalarAsync();
        var id = ingredient.Id == 0 ? Convert.ToInt32(result!) : ingredient.Id;
        ReplaceRelations("ingredient_allergens", "ingredient_id", id, "allergen_id", "allergens", ingredient.Allergens, transaction);
        transaction.Commit();
        _logger.LogInformation("Saved ingredient {Id}: {Name}", id, ingredient.Name);
        return id;
    }

    public async Task DeleteIngredientAsync(int id)
    {
        await InitializeAsync();
        using var transaction = _connection!.BeginTransaction();
        using (var ingredient = _connection.CreateCommand())
        {
            ingredient.Transaction = transaction;
            ingredient.CommandText = "SELECT 1 FROM recipe_ingredients WHERE ingredient_id=@id LIMIT 1";
            ingredient.Parameters.AddWithValue("@id", id);
            if (await ingredient.ExecuteScalarAsync() != null) throw new IngredientInUseException();
        }
        using var cmd = _connection!.CreateCommand();
        cmd.Transaction = transaction;
        cmd.CommandText = "DELETE FROM ingredients WHERE id = @id";
        cmd.Parameters.AddWithValue("@id", id);
        await cmd.ExecuteNonQueryAsync();
        transaction.Commit();
        _logger.LogInformation("Deleted ingredient {Id}", id);
    }

    private static Ingredient ReadIngredient(SqliteDataReader reader)
    {
        return new Ingredient
        {
            Id = reader.GetInt32(0),
            Name = reader.GetString(1),
            Allergens = []
        };
    }

    // Allergen operations
    public async Task<List<Allergen>> GetAllAllergensAsync()
    {
        await InitializeAsync();
        var list = new List<Allergen>();
        using var cmd = _connection!.CreateCommand();
        cmd.CommandText = "SELECT id, name, color, icon FROM allergens ORDER BY name";
        using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync()) list.Add(ReadAllergen(reader));
        return list;
    }

    public async Task<int> SaveAllergenAsync(Allergen allergen)
    {
        await InitializeAsync();
        using var cmd = _connection!.CreateCommand();
        var now = DateTime.UtcNow.ToString("O");

        if (allergen.Id == 0)
        {
            cmd.CommandText = @"INSERT INTO allergens (name, color, icon, created_at)
                               VALUES (@name, @color, @icon, @now);
                               SELECT last_insert_rowid();";
        }
        else
        {
            cmd.CommandText = "UPDATE allergens SET name=@name, color=@color, icon=@icon WHERE id=@id";
            cmd.Parameters.AddWithValue("@id", allergen.Id);
        }

        cmd.Parameters.AddWithValue("@name", allergen.Name);
        cmd.Parameters.AddWithValue("@color", allergen.Color);
        cmd.Parameters.AddWithValue("@icon", allergen.Icon);
        cmd.Parameters.AddWithValue("@now", now);

        var result = await cmd.ExecuteScalarAsync();
        var id = allergen.Id == 0 ? Convert.ToInt32(result!) : allergen.Id;
        _logger.LogInformation("Saved allergen {Id}: {Name}", id, allergen.Name);
        return id;
    }

    public async Task DeleteAllergenAsync(int id)
    {
        await InitializeAsync();
        using var cmd = _connection!.CreateCommand();
        cmd.CommandText = "DELETE FROM allergens WHERE id = @id";
        cmd.Parameters.AddWithValue("@id", id);
        await cmd.ExecuteNonQueryAsync();
        _logger.LogInformation("Deleted allergen {Id}", id);
    }

    private static Allergen ReadAllergen(SqliteDataReader reader)
    {
        return new Allergen
        {
            Id = reader.GetInt32(0),
            Name = reader.GetString(1),
            Color = reader.GetString(2),
            Icon = reader.IsDBNull(3) ? "⚠️" : reader.GetString(3)
        };
    }

    // Menu operations
    public async Task ClearMenuDayAsync(DateTime date)
    {
        await InitializeAsync();
        using var cmd = _connection!.CreateCommand();
        cmd.CommandText = "DELETE FROM menu WHERE date = @date";
        cmd.Parameters.AddWithValue("@date", date.ToString(MenuDateFormat, CultureInfo.InvariantCulture));
        await cmd.ExecuteNonQueryAsync();
    }

    public async Task<List<MenuEntry>> GetMenuAsync(DateTime start, DateTime end)
    {
        await InitializeAsync();
        var list = new List<MenuEntry>();
        using var cmd = _connection!.CreateCommand();
        cmd.CommandText = MenuSelect + " WHERE date >= @start AND date <= @end ORDER BY date, slot";
        cmd.Parameters.AddWithValue("@start", start.ToString(MenuDateFormat, CultureInfo.InvariantCulture));
        cmd.Parameters.AddWithValue("@end", end.ToString(MenuDateFormat, CultureInfo.InvariantCulture));
        using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync()) list.Add(ReadMenuEntry(reader));
        return list;
    }

    public async Task<List<MenuSlotCategory>> GetMenuCategoriesAsync(DateTime start, DateTime end)
    {
        await InitializeAsync();
        using var cmd = _connection!.CreateCommand();
        cmd.CommandText = MenuCategoriesSelect + " WHERE date >= @start AND date <= @end ORDER BY date, slot";
        cmd.Parameters.AddWithValue("@start", start.ToString(MenuDateFormat, CultureInfo.InvariantCulture));
        cmd.Parameters.AddWithValue("@end", end.ToString(MenuDateFormat, CultureInfo.InvariantCulture));
        using var reader = await cmd.ExecuteReaderAsync();
        var result = new List<MenuSlotCategory>();
        while (await reader.ReadAsync()) result.Add(ReadMenuCategory(reader));
        return result;
    }

    private static MenuEntry ReadMenuEntry(SqliteDataReader reader) => new()
    {
        Id = checked((int)(long)reader.GetValue(0)),
        Date = DateTime.ParseExact((string)reader.GetValue(1), MenuDateFormat, CultureInfo.InvariantCulture),
        Slot = (string)reader.GetValue(2),
        RecipeId = checked((int)(long)reader.GetValue(3))
    };

    private static MenuSlotCategory ReadMenuCategory(SqliteDataReader reader) => new()
    {
        Date = DateTime.ParseExact((string)reader.GetValue(0), MenuDateFormat, CultureInfo.InvariantCulture),
        Slot = (string)reader.GetValue(1),
        Category = (string)reader.GetValue(2)
    };

    /// <summary>Save a slot's category and assignment as one indivisible change.</summary>
    public async Task SaveMenuSlotAsync(DateTime date, string slot, string category, int? recipeId)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(slot);
        ArgumentException.ThrowIfNullOrWhiteSpace(category);
        await InitializeAsync();
        using var transaction = _connection!.BeginTransaction();
        if (recipeId.HasValue)
        {
            using var recipe = _connection.CreateCommand();
            recipe.Transaction = transaction;
            recipe.CommandText = "SELECT COUNT(*) FROM recipes WHERE id=@id";
            recipe.Parameters.AddWithValue("@id", recipeId.Value);
            if (Convert.ToInt32(recipe.ExecuteScalar()) == 0)
                throw new InvalidOperationException("The selected recipe no longer exists.");
        }

        var dateValue = date.ToString(MenuDateFormat, CultureInfo.InvariantCulture);
        using (var updateCategory = _connection.CreateCommand())
        {
            updateCategory.Transaction = transaction;
            updateCategory.CommandText = UpsertMenuCategory;
            updateCategory.Parameters.AddWithValue("@date", dateValue);
            updateCategory.Parameters.AddWithValue("@slot", slot);
            updateCategory.Parameters.AddWithValue("@category", category);
            updateCategory.ExecuteNonQuery();
        }

        using (var updateMenu = _connection.CreateCommand())
        {
            updateMenu.Transaction = transaction;
            updateMenu.CommandText = recipeId.HasValue
                ? UpsertMenu
                : "DELETE FROM menu WHERE date=@date AND slot=@slot";
            updateMenu.Parameters.AddWithValue("@date", dateValue);
            updateMenu.Parameters.AddWithValue("@slot", slot);
            if (recipeId.HasValue) updateMenu.Parameters.AddWithValue("@recipe", recipeId.Value);
            updateMenu.ExecuteNonQuery();
        }

        transaction.Commit();
    }

    // Settings
    public async Task<AppSettings?> GetSettingsAsync()
    {
        await InitializeAsync();
        var settings = new AppSettings();
        using var cmd = _connection!.CreateCommand();
        cmd.CommandText = "SELECT key, value FROM settings";
        using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            var key = reader.GetString(0);
            var value = reader.GetString(1);
            switch (key)
            {
                case "language": settings.Language = value; break;
                case "theme": settings.Theme = value == "default" ? "light" : value; break;
                case "accent_color": settings.AccentColor = value; break;
                case "log_retention_days": settings.LogRetentionDays = int.TryParse(value, out var days) && days is 7 or 14 or 30 or 90 or 180 ? days : 30; break;
                case "weekend_planning_enabled": settings.WeekendPlanningEnabled = bool.TryParse(value, out var enabled) && enabled; break;
                case "meals_per_day": settings.MealsPerDay = ParseMealsPerDay(value); break;
                case "meal_categories":
                    settings.MealCategories = ParseMealCategories(value);
                    break;
                case "data_folder": settings.DataFolder = value; break;
                case "recent_template_colors":
                    try { settings.RecentTemplateColors = System.Text.Json.JsonSerializer.Deserialize<List<string>>(value) ?? []; }
                    catch (System.Text.Json.JsonException) { settings.RecentTemplateColors = []; }
                    break;
                case "window_x": settings.WindowX = int.TryParse(value, out var x) ? x : null; break;
                case "window_y": settings.WindowY = int.TryParse(value, out var y) ? y : null; break;
                case "window_width": settings.WindowWidth = int.TryParse(value, out var width) ? width : null; break;
                case "window_height": settings.WindowHeight = int.TryParse(value, out var height) ? height : null; break;
                case "planner_date": settings.PlannerDate = DateTime.TryParseExact(value, MenuDateFormat, CultureInfo.InvariantCulture, DateTimeStyles.None, out var plannerDate) ? plannerDate : null; break;
                case "planner_monthly": settings.PlannerMonthly = !bool.TryParse(value, out var monthly) || monthly; break;
            }
        }
        reader.Close();
        cmd.CommandText = "SELECT id,name FROM meal_categories ORDER BY position";
        settings.MealCategories = [];
        using (var rows = cmd.ExecuteReader()) while (rows.Read()) settings.MealCategories.Add(new MealCategory { Id=rows.GetString(0), Name=rows.GetString(1) });
        cmd.CommandText = "SELECT color FROM recent_template_colors ORDER BY position";
        settings.RecentTemplateColors = [];
        using (var rows = cmd.ExecuteReader()) while (rows.Read()) settings.RecentTemplateColors.Add(rows.GetString(0));
        return settings;
    }

    private static List<MealCategory> ParseMealCategories(string value)
    {
        try
        {
            var categories = System.Text.Json.JsonSerializer.Deserialize<List<MealCategory>>(value);
            ValidateMealCategories(categories);
            return categories!;
        }
        catch (System.Text.Json.JsonException ex) { throw new InvalidDataException("The saved meal categories are invalid.", ex); }
    }

    private static void ValidateMealCategories(List<MealCategory>? categories)
    {
        if (categories is not { Count: > 0 } || categories.Any(c => c == null || string.IsNullOrWhiteSpace(c.Id)) || categories.Select(c => c.Id).Distinct(StringComparer.OrdinalIgnoreCase).Count() != categories.Count)
            throw new InvalidDataException("The saved meal categories are invalid.");
    }

    private static int ParseMealsPerDay(string value) => int.TryParse(value, out var count) && count is >= 1 and <= 100
        ? count : throw new InvalidDataException("The saved meals per day setting is invalid.");

    public Task SaveSettingsAsync(AppSettings settings) => SaveSettingsAsync(settings, false, false);

    public async Task SavePlannerViewAsync(DateTime date, bool monthly)
    {
        await InitializeAsync();
        using var transaction = _connection!.BeginTransaction();
        using var command = _connection.CreateCommand();
        command.Transaction = transaction;
        command.CommandText = "INSERT OR REPLACE INTO settings (key, value) VALUES (@key, @value)";
        foreach (var (key, value) in new[]
        {
            ("planner_date", date.Date.ToString(MenuDateFormat, CultureInfo.InvariantCulture)),
            ("planner_monthly", monthly.ToString())
        })
        {
            command.Parameters.Clear();
            command.Parameters.AddWithValue("@key", key);
            command.Parameters.AddWithValue("@value", value);
            await command.ExecuteNonQueryAsync();
        }
        transaction.Commit();
    }

    public Task CompleteSetupAsync(AppSettings settings, bool clearPlans) => SaveSettingsAsync(settings, clearPlans, true);

    public async Task<bool> IsSetupCompleteAsync()
    {
        await InitializeAsync();
        using var command = _connection!.CreateCommand();
        command.CommandText = "SELECT value FROM settings WHERE key = 'setup_complete'";
        return string.Equals(await command.ExecuteScalarAsync() as string, "true", StringComparison.OrdinalIgnoreCase);
    }

    public async Task RequestAppTourAsync()
    {
        await InitializeAsync();
        using var command = _connection!.CreateCommand();
        command.CommandText = "INSERT OR REPLACE INTO settings (key, value) VALUES ('app_tour_pending', 'true')";
        await command.ExecuteNonQueryAsync();
    }

    public async Task<bool> TakePendingAppTourAsync()
    {
        await InitializeAsync();
        using var transaction = _connection!.BeginTransaction();
        using var command = _connection.CreateCommand();
        command.Transaction = transaction;
        command.CommandText = "SELECT value FROM settings WHERE key = 'app_tour_pending'";
        if (!string.Equals(await command.ExecuteScalarAsync() as string, "true", StringComparison.OrdinalIgnoreCase))
        {
            transaction.Commit();
            return false;
        }
        command.CommandText = "UPDATE settings SET value = 'false' WHERE key = 'app_tour_pending'";
        await command.ExecuteNonQueryAsync();
        transaction.Commit();
        return true;
    }

    private async Task SaveSettingsAsync(AppSettings settings, bool clearPlans, bool completeSetup)
    {
        ValidateMealCategories(settings.MealCategories);
        await InitializeAsync();
        using var transaction = _connection!.BeginTransaction();
        if (clearPlans)
        {
            using var clear = _connection.CreateCommand();
            clear.Transaction = transaction;
            clear.CommandText = "DELETE FROM menu; DELETE FROM menu_slot_categories";
            await clear.ExecuteNonQueryAsync();
        }
        using var cmd = _connection.CreateCommand();
        cmd.Transaction = transaction;
        cmd.CommandText = "INSERT OR REPLACE INTO settings (key, value) VALUES (@key, @value)";

        var pairs = new[]
        {
            ("language", settings.Language),
            ("theme", settings.Theme),
            ("accent_color", settings.AccentColor),
            ("log_retention_days", settings.LogRetentionDays.ToString()),
            ("weekend_planning_enabled", settings.WeekendPlanningEnabled.ToString()),
            ("meals_per_day", Math.Clamp(settings.MealsPerDay, 1, 100).ToString()),
            ("data_folder", settings.DataFolder ?? "")
            ,("window_x", settings.WindowX?.ToString() ?? "")
            ,("window_y", settings.WindowY?.ToString() ?? "")
            ,("window_width", settings.WindowWidth?.ToString() ?? "")
            ,("window_height", settings.WindowHeight?.ToString() ?? "")
        };

        foreach (var (key, value) in pairs)
        {
            cmd.Parameters.Clear();
            cmd.Parameters.AddWithValue("@key", key);
            cmd.Parameters.AddWithValue("@value", value);
            await cmd.ExecuteNonQueryAsync();
        }
        WriteSettingsLists(settings.MealCategories, settings.RecentTemplateColors ?? [], transaction);
        if (completeSetup)
        {
            cmd.Parameters.Clear();
            cmd.Parameters.AddWithValue("@key", "setup_complete");
            cmd.Parameters.AddWithValue("@value", "true");
            await cmd.ExecuteNonQueryAsync();
        }
        transaction.Commit();
    }

    // Templates
    public async Task<List<MenuTemplate>> GetAllTemplatesAsync()
    {
        await InitializeAsync();
        var names = new List<(string Name, bool Preset)>();
        using (var cmd = _connection!.CreateCommand())
        {
            cmd.CommandText = "SELECT name,is_preset FROM templates ORDER BY is_preset DESC,name";
            using var reader = cmd.ExecuteReader();
            while (reader.Read()) names.Add((reader.GetString(0), reader.GetInt32(1) == 1));
        }
        return names.Select(item => ReadStoredTemplate(item.Name,item.Preset)).ToList();
    }

    private static MenuTemplate? ReadTemplate(SqliteDataReader reader)
    {
        var template = System.Text.Json.JsonSerializer.Deserialize<MenuTemplate>(reader.GetString(1));
        if (template?.Document == null) return null;
        template.Name = reader.GetString(0);
        template.IsPreset = reader.GetInt32(2) == 1;
        return template;
    }

    public async Task HydrateTemplateImagesAsync(MenuTemplate template)
    {
        ArgumentNullException.ThrowIfNull(template);
        await InitializeAsync();
        HydrateTemplateImages(template, new Dictionary<string, string?>(StringComparer.Ordinal));
    }

    public async Task SaveTemplateAsync(MenuTemplate template)
    {
        await InitializeAsync();
        using var transaction = _connection!.BeginTransaction();
        var stored = System.Text.Json.JsonSerializer.Deserialize<MenuTemplate>(System.Text.Json.JsonSerializer.Serialize(template))!;
        var references = ExtractTemplateImages(stored, transaction);
        using var cmd = _connection.CreateCommand();
        cmd.Transaction = transaction;
        var now = DateTime.UtcNow.ToString("O");
        cmd.CommandText = @"INSERT INTO templates (name, is_preset, created_at, updated_at)
                           VALUES (@name, @preset, @now, @now)
                           ON CONFLICT(name) DO UPDATE SET is_preset=@preset, updated_at=@now";
        cmd.Parameters.AddWithValue("@name", template.Name);
        cmd.Parameters.AddWithValue("@preset", template.IsPreset ? 1 : 0);
        cmd.Parameters.AddWithValue("@now", now);
        cmd.ExecuteNonQuery();
        WriteTemplateDocument(stored, transaction);
        ReplaceTemplateImageReferences(template.Name, references, transaction);
        transaction.Commit();
    }

    public async Task RenameTemplateAsync(string currentName, string newName)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(currentName);
        ArgumentException.ThrowIfNullOrWhiteSpace(newName);
        newName = newName.Trim();
        await InitializeAsync();
        using var transaction = _connection!.BeginTransaction();
        using (var source = _connection.CreateCommand())
        {
            source.Transaction = transaction;
            source.CommandText = "SELECT is_preset FROM templates WHERE name = @name";
            source.Parameters.AddWithValue("@name", currentName);
            using var reader = await source.ExecuteReaderAsync();
            if (!await reader.ReadAsync()) throw new InvalidOperationException("The selected template no longer exists.");
            if (reader.GetInt32(0) != 0) throw new InvalidOperationException("Built-in templates cannot be renamed.");
        }
        using (var names = _connection.CreateCommand())
        {
            names.Transaction = transaction;
            names.CommandText = "SELECT name FROM templates WHERE name <> @name";
            names.Parameters.AddWithValue("@name", currentName);
            using var reader = await names.ExecuteReaderAsync();
            while (await reader.ReadAsync())
                if (string.Equals(reader.GetString(0), newName, StringComparison.OrdinalIgnoreCase))
                    throw new InvalidOperationException("A template with this name already exists.");
        }
        using var update = _connection.CreateCommand();
        update.Transaction = transaction;
        update.CommandText = "UPDATE templates SET name = @new, updated_at = @now WHERE name = @old";
        update.Parameters.AddWithValue("@new", newName);
        update.Parameters.AddWithValue("@now", DateTime.UtcNow.ToString("O"));
        update.Parameters.AddWithValue("@old", currentName);
        await update.ExecuteNonQueryAsync();
        transaction.Commit();
    }

    public async Task DeleteTemplateAsync(string name)
    {
        await InitializeAsync();
        using var cmd = _connection!.CreateCommand();
        cmd.CommandText = "DELETE FROM templates WHERE name = @name AND is_preset = 0";
        cmd.Parameters.AddWithValue("@name", name);
        await cmd.ExecuteNonQueryAsync();
    }

    public async Task CreateBackupAsync(string destinationPath)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(destinationPath);
        if (IsArchiveBackup(destinationPath))
        {
            await CreateArchiveBackupAsync(destinationPath);
            return;
        }
        await InitializeAsync();

        await using var destination = new SqliteConnection(new SqliteConnectionStringBuilder { DataSource = destinationPath, Pooling = false }.ToString());
        await destination.OpenAsync();
        _connection!.BackupDatabase(destination);
        _logger.LogInformation("Created SQLite backup at {Path}", destinationPath);
    }

    public async Task RestoreFromAsync(string sourcePath)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(sourcePath);
        if (!File.Exists(sourcePath)) throw new FileNotFoundException("The selected backup file no longer exists.", sourcePath);
        if (IsArchiveBackup(sourcePath))
        {
            await RestoreArchiveAsync(sourcePath);
            return;
        }
        var source = Path.GetFullPath(sourcePath);
        var current = Path.GetFullPath(_dbPath);
        if (string.Equals(source, current, OperatingSystem.IsWindows() ? StringComparison.OrdinalIgnoreCase : StringComparison.Ordinal))
            throw new InvalidOperationException("The selected backup is the current database.");

        // Validate the selected file before opening or changing the live database.
        // Read-only mode avoids accidentally creating a database for a bad path.
        var sourceOptions = new SqliteConnectionStringBuilder { DataSource = source, Mode = SqliteOpenMode.ReadOnly, Pooling = false };
        var snapshotDirectory = Path.Combine(Path.GetTempPath(), "DMS-restore-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(snapshotDirectory);
        try
        {
            await using var sourceConnection = new SqliteConnection(sourceOptions.ToString());
            await sourceConnection.OpenAsync();
            // Validate and restore the same private disk snapshot, even if the
            // selected file changes, without loading the whole database into RAM.
            var snapshotOptions = new SqliteConnectionStringBuilder { DataSource = Path.Combine(snapshotDirectory, "snapshot.db"), Pooling = false };
            await using var backup = new SqliteConnection(snapshotOptions.ToString());
            await backup.OpenAsync();
            sourceConnection.BackupDatabase(backup);
            var sourceImages = BackupHasMigration(sourceConnection, 7)
                ? Path.Combine(Path.GetDirectoryName(source)!, "template-images")
                : null;
            if (sourceImages != null)
            {
                var snapshotImages = Path.Combine(snapshotDirectory, "template-images");
                if (Directory.Exists(sourceImages))
                {
                    Directory.CreateDirectory(snapshotImages);
                    foreach (var file in Directory.EnumerateFiles(sourceImages))
                        File.Copy(file, Path.Combine(snapshotImages, Path.GetFileName(file)));
                }
            }
            ValidateRestoreSource(backup, sourceImages);
            if (sourceImages != null)
            {
                // Copy is additive: the current database continues to have every
                // image it references until the database replacement succeeds.
                CopyDirectory(Path.Combine(snapshotDirectory, "template-images"), TemplateImageDirectory);
            }
            await InitializeAsync();

            await _initLock.WaitAsync();
            try
            {
                var recoveryFolder = Path.Combine(Path.GetDirectoryName(current)!, "RestoreBackups");
                Directory.CreateDirectory(recoveryFolder);
                var recoveryPath = Path.Combine(recoveryFolder, $"before-restore-{DateTime.UtcNow:yyyyMMdd-HHmmss}-{Guid.NewGuid():N}.db");
                var recoveryOptions = new SqliteConnectionStringBuilder { DataSource = recoveryPath, Pooling = false };
                await using var recovery = new SqliteConnection(recoveryOptions.ToString());
                await recovery.OpenAsync();
                _connection!.BackupDatabase(recovery);
                WriteRecoveryMarker(recoveryPath);

                try
                {
                    // SQLite's backup API handles the active WAL and atomically replaces
                    // the destination database without deleting live WAL sidecars.
                    backup.BackupDatabase(_connection);
                    await ConfigureConnectionAsync();
                    await CreateSchemaAsync();
                    // The source snapshot was validated before replacement. Verify
                    // the live database and its copied image files once more before
                    // reporting a successful restore.
                    ValidateRestoreSource(_connection);
                    _initialized = true;
                    File.Delete(RecoveryMarkerPath);
                    _logger.LogInformation("Restored database from {Path}; prior data saved at {RecoveryPath}", source, recoveryPath);
                }
                catch (Exception restoreError)
                {
                    try
                    {
                        recovery.BackupDatabase(_connection);
                        await ConfigureConnectionAsync();
                        await CreateSchemaAsync();
                        _initialized = true;
                        File.Delete(RecoveryMarkerPath);
                    }
                    catch (Exception recoveryError)
                    {
                        _initialized = false;
                        _connection?.Dispose();
                        _connection = null;
                        throw new DatabaseRecoveryRequiredException(_dbPath, recoveryPath, RecoveryMarkerPath, new AggregateException(restoreError, recoveryError));
                    }
                    throw new InvalidOperationException($"Restore failed; the previous database was recovered. A recovery backup is at: {recoveryPath}", restoreError);
                }
            }
            finally
            {
                _initLock.Release();
            }
        }
        finally
        {
            try { Directory.Delete(snapshotDirectory, recursive: true); }
            catch (IOException ex) { _logger.LogWarning(ex, "Could not remove restore snapshot directory {Path}", snapshotDirectory); }
            catch (UnauthorizedAccessException ex) { _logger.LogWarning(ex, "Could not remove restore snapshot directory {Path}", snapshotDirectory); }
        }
    }

    private static void ValidateRestoreSource(SqliteConnection source, string? fileBackedImageRoot = null)
    {
        // DMS does not create triggers, views, or virtual tables. They can carry
        // behavior supplied by a backup author into later application operations.
        using (var objects = source.CreateCommand())
        {
            objects.CommandText = "SELECT 1 FROM sqlite_schema WHERE type IN ('trigger', 'view') LIMIT 1";
            if (objects.ExecuteScalar() != null)
                throw new InvalidDataException("The selected backup contains unsupported database objects.");
        }
        using (var definitions = source.CreateCommand())
        {
            definitions.CommandText = "SELECT sql FROM sqlite_schema WHERE type='table' AND sql IS NOT NULL";
            using var reader = definitions.ExecuteReader();
            while (reader.Read())
            {
                var sql = reader.GetString(0);
                const string conflictClause = @"\bon\s*(?:(?:/\*[\s\S]*?\*/|--[^\r\n]*(?:\r?\n|$))\s*)*conflict\b";
                if (System.Text.RegularExpressions.Regex.IsMatch(sql, conflictClause, System.Text.RegularExpressions.RegexOptions.IgnoreCase | System.Text.RegularExpressions.RegexOptions.CultureInvariant))
                    throw new InvalidDataException("The selected backup contains unsupported conflict rules.");
            }
        }
        using (var tables = source.CreateCommand())
        {
            tables.CommandText = "PRAGMA table_list";
            using var reader = tables.ExecuteReader();
            while (reader.Read())
                if (!string.Equals(reader.GetString(2), "table", StringComparison.OrdinalIgnoreCase))
                    throw new InvalidDataException("The selected backup contains unsupported database objects.");
        }
        // Foreign key actions also execute on later writes. Allow only the
        // relationships owned by DMS, including their update/delete actions.
        using (var keys = source.CreateCommand())
        {
            keys.CommandText = @"SELECT t.name, f.[table], f.[from], f.[to], f.on_update, f.on_delete
                FROM pragma_table_list AS t, pragma_foreign_key_list(t.name) AS f
                WHERE t.schema = 'main' AND t.type = 'table'";
            using var reader = keys.ExecuteReader();
            while (reader.Read())
            {
                var relationship = string.Join("|", Enumerable.Range(0, 6).Select(reader.GetString)).ToLowerInvariant();
                if (relationship is not ("menu|recipes|recipe_id|id|no action|restrict"
                    or "template_image_references|templates|template_name|name|cascade|cascade"
                    or "template_documents|templates|template_name|name|cascade|cascade"
                    or "template_day_layouts|templates|template_name|name|cascade|cascade"
                    or "template_text_styles|templates|template_name|name|cascade|cascade"
                    or "template_block_appearances|templates|template_name|name|cascade|cascade"
                    or "template_image_placements|templates|template_name|name|cascade|cascade"
                    or "template_image_references|template_image_assets|asset_id|id|no action|restrict"
                    or "recipe_ingredients|recipes|recipe_id|id|no action|cascade"
                    or "recipe_ingredients|ingredients|ingredient_id|id|no action|set null"
                    or "ingredient_allergens|ingredients|ingredient_id|id|no action|cascade"
                    or "ingredient_allergens|allergens|allergen_id|id|no action|set null"
                    or "recipe_additional_allergens|recipes|recipe_id|id|no action|cascade"
                    or "recipe_additional_allergens|allergens|allergen_id|id|no action|set null"))
                    throw new InvalidDataException("The selected backup contains unsupported database relationships.");
            }
        }
        using (var check = source.CreateCommand())
        {
            check.CommandText = "PRAGMA integrity_check";
            using var result = check.ExecuteReader();
            if (!result.Read() || !string.Equals(result.GetString(0), "ok", StringComparison.OrdinalIgnoreCase) || result.Read())
                throw new InvalidDataException("The selected database failed its integrity check.");
        }
        using (var version = source.CreateCommand())
        {
            version.CommandText = "PRAGMA user_version";
            if (Convert.ToInt64(version.ExecuteScalar()) > 7)
                throw new InvalidDataException("This backup was created by a newer DMS database version.");
        }

        // Older DMS databases may lack later optional tables or columns; schema
        // initialization can add those after the restore succeeds.
        var relationalOnly = BackupHasMigration(source, 5);
        var normalizedTemplates = BackupHasMigration(source, 6);
        var fileBackedImages = BackupHasMigration(source, 7);
        var required = new Dictionary<string, string[]>
        {
            ["recipes"] = relationalOnly
                ? ["id", "name", "category", "portion_size", "calories", "instructions", "created_at", "updated_at"]
                : ["id", "name", "category", "portion_size", "calories", "instructions", "ingredients_json", "allergens_json", "created_at", "updated_at"],
            ["ingredients"] = relationalOnly ? ["id", "name", "created_at"] : ["id", "name", "allergens_json", "created_at"],
            ["allergens"] = ["id", "name", "color", "created_at"],
            ["menu"] = ["id", "date", "slot", "recipe_id", "created_at"],
            ["templates"] = normalizedTemplates ? ["name", "is_preset", "created_at", "updated_at"] : ["name", "data_json", "is_preset", "created_at", "updated_at"],
            ["settings"] = ["key", "value"]
        };
        if (normalizedTemplates)
        {
            required["template_image_assets"] = fileBackedImages
                ? ["id", "name", "content_type", "relative_path"]
                : ["id", "name", "content_type", "data"];
            required["template_image_references"] = ["template_name", "asset_id"];
            required["template_documents"] = ["template_name", .. DocumentFields.Select(p => p.Name)];
            required["template_day_layouts"] = ["template_name", "position", "height"];
            required["template_text_styles"] = ["template_name", "key", .. StyleFields.Select(p => p.Name)];
            required["template_block_appearances"] = ["template_name", "key", .. AppearanceFields.Select(p => p.Name)];
            required["template_image_placements"] = ["template_name", "position", .. ImageFields.Select(p => p.Name)];
            required["meal_categories"] = ["position", "id", "name"];
            required["recent_template_colors"] = ["position", "color"];
        }
        var hasMenuCategories = BackupHasTable(source, "menu_slot_categories");
        if (hasMenuCategories) required["menu_slot_categories"] = ["date", "slot", "category"];
        var hasRelationships = BackupHasMigration(source, 4);
        if (hasRelationships)
        {
            required["recipe_ingredients"] = ["recipe_id", "position", "ingredient_id", "saved_name"];
            required["ingredient_allergens"] = ["ingredient_id", "position", "allergen_id", "saved_name"];
            required["recipe_additional_allergens"] = ["recipe_id", "position", "allergen_id", "saved_name"];
        }
        foreach (var (table, columns) in required)
        {
            using var command = source.CreateCommand();
            command.CommandText = $"PRAGMA table_info(\"{table}\")";
            using var reader = command.ExecuteReader();
            var found = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            var ordered = new List<string>();
            while (reader.Read())
            {
                var column = reader.GetString(1);
                found.Add(column);
                ordered.Add(column);
            }
            if (columns.Any(column => !found.Contains(column)))
                throw new InvalidDataException("The selected file is not a supported DMS database backup.");
            if (table is "recipes" or "ingredients" &&
                !ordered.Take(columns.Length).SequenceEqual(columns, StringComparer.OrdinalIgnoreCase))
                throw new InvalidDataException("The selected backup has unsupported column ordering.");
        }

        // Recipes do not have unique indexes in any supported DMS schema.
        // A backup-supplied unique constraint can replace another recipe on insert.
        using (var indexes = source.CreateCommand())
        {
            indexes.CommandText = "PRAGMA index_list(\"recipes\")";
            using var reader = indexes.ExecuteReader();
            while (reader.Read())
                if (reader.GetInt64(2) != 0)
                    throw new InvalidDataException("The selected backup contains unsupported recipe constraints.");
        }

        // Startup reads these rows immediately after restore. Use the same
        // readers against the snapshot before replacing the live database.
        try
        {
            using (var settings = source.CreateCommand())
            {
                settings.CommandText = "SELECT key, value FROM settings";
                using var reader = settings.ExecuteReader();
                while (reader.Read())
                {
                    var key = reader.GetString(0);
                    var value = reader.GetString(1);
                    if (key == "meal_categories") ParseMealCategories(value);
                    if (key == "meals_per_day") ParseMealsPerDay(value);
                }
            }
            using (var recipes = source.CreateCommand())
            {
                recipes.CommandText = "SELECT * FROM recipes ORDER BY name";
                using var reader = recipes.ExecuteReader();
                for (var i = 0; i < required["recipes"].Length; i++)
                    if (!string.Equals(reader.GetName(i), required["recipes"][i], StringComparison.OrdinalIgnoreCase))
                        throw new InvalidDataException("The selected backup has an unsupported recipe column order.");
                while (reader.Read())
                {
                    var recipe = ReadRecipe(reader);
                    if (!relationalOnly && (ReadNames(reader.GetString(6)).Any(value => value is null) || ReadNames(reader.GetString(7)).Any(value => value is null)))
                        throw new InvalidDataException("The selected backup contains an invalid recipe list.");
                }
            }
            using (var ingredients = source.CreateCommand())
            {
                ingredients.CommandText = "SELECT * FROM ingredients ORDER BY name";
                using var reader = ingredients.ExecuteReader();
                for (var i = 0; i < required["ingredients"].Length; i++)
                    if (!string.Equals(reader.GetName(i), required["ingredients"][i], StringComparison.OrdinalIgnoreCase))
                        throw new InvalidDataException("The selected backup has an unsupported ingredient column order.");
                while (reader.Read())
                {
                    var ingredient = ReadIngredient(reader);
                    if (!relationalOnly && ReadNames(reader.GetString(2)).Any(value => value is null))
                        throw new InvalidDataException("The selected backup contains an invalid ingredient list.");
                }
            }
            using (var allergens = source.CreateCommand())
            {
                allergens.CommandText = "SELECT COUNT(*) FROM pragma_table_info('allergens') WHERE name='icon' COLLATE NOCASE";
                var icon = Convert.ToInt32(allergens.ExecuteScalar()) > 0 ? "icon" : "NULL";
                allergens.CommandText = $"SELECT id, name, color, {icon} FROM allergens";
                using var reader = allergens.ExecuteReader();
                while (reader.Read()) ReadAllergen(reader);
            }
            using (var templates = source.CreateCommand())
            {
                // Migration 3 removes obsolete template formats from older backups.
                templates.CommandText = "SELECT COUNT(*) FROM schema_migrations WHERE version=3";
                if (!normalizedTemplates && BackupHasTable(source, "schema_migrations") && Convert.ToInt32(templates.ExecuteScalar()) > 0)
                {
                    templates.CommandText = "SELECT name, data_json, is_preset FROM templates";
                    using var reader = templates.ExecuteReader();
                    while (reader.Read())
                        if (ReadTemplate(reader) == null)
                            throw new InvalidDataException("The selected backup contains an unreadable template.");
                }
            }
            using (var links = source.CreateCommand())
            {
                links.CommandText = "PRAGMA foreign_key_check";
                if (links.ExecuteScalar() != null)
                    throw new InvalidDataException("The selected backup contains broken database references.");
                // Legacy menu tables may have no declared foreign key.
                links.CommandText = "SELECT 1 FROM menu m WHERE NOT EXISTS (SELECT 1 FROM recipes r WHERE r.id=m.recipe_id) LIMIT 1";
                if (links.ExecuteScalar() != null)
                    throw new InvalidDataException("The selected backup contains a menu assignment with no matching recipe.");
            }
            using (var menu = source.CreateCommand())
            {
                // Preparing the ordinary write checks its conflict key without writing to the backup.
                menu.CommandText = UpsertMenu;
                menu.Prepare();
                menu.CommandText = MenuSelect;
                using var reader = menu.ExecuteReader();
                while (reader.Read()) ReadMenuEntry(reader);
            }
            if (hasMenuCategories)
            {
                using var categories = source.CreateCommand();
                categories.CommandText = UpsertMenuCategory;
                categories.Prepare();
                categories.CommandText = MenuCategoriesSelect;
                using var reader = categories.ExecuteReader();
                while (reader.Read()) ReadMenuCategory(reader);
            }
            if (!fileBackedImages && BackupHasTable(source, "template_image_assets")) ValidateBackupImageAssets(source);
            if (fileBackedImages) ValidateFileBackedImageAssets(source, fileBackedImageRoot ?? Path.Combine(Path.GetDirectoryName(source.DataSource)!, "template-images"));
            if (hasRelationships) ValidateRelationshipRows(source);
            if (normalizedTemplates) ValidateNormalizedRows(source);
        }
        catch (Exception ex) when (ex is System.Text.Json.JsonException or InvalidOperationException
            or InvalidCastException or FormatException or OverflowException or SqliteException)
        {
            throw new InvalidDataException("The selected backup contains unreadable startup data.", ex);
        }
    }

    private static void ValidateNormalizedRows(SqliteConnection source)
    {
        foreach (var table in new[] { "template_documents", "template_day_layouts", "template_text_styles", "template_block_appearances", "template_image_placements" })
        {
            using var check = source.CreateCommand();
            check.CommandText = $"SELECT 1 FROM {table} c WHERE NOT EXISTS (SELECT 1 FROM templates t WHERE t.name=c.template_name) LIMIT 1";
            if (check.ExecuteScalar() != null) throw new InvalidDataException("The selected backup contains orphaned template rows.");
        }
        using var templates = source.CreateCommand(); templates.CommandText="SELECT name,is_preset FROM templates";
        using var rows = templates.ExecuteReader();
        var names = new List<(string,bool)>(); while(rows.Read()) { var preset=rows.GetInt64(1); if(preset is not (0 or 1)) throw new InvalidDataException("Invalid template preset."); names.Add((rows.GetString(0),preset==1)); } rows.Close();
        foreach (var (name,preset) in names) ReadStoredTemplate(source, name, preset);
        using (var usage = source.CreateCommand())
        {
            usage.CommandText = @"WITH expected AS (
                SELECT d.template_name, d.BackgroundImageAssetId AS asset_id FROM template_documents d
                JOIN template_image_assets a ON a.id=d.BackgroundImageAssetId
                UNION SELECT p.template_name, p.AssetId FROM template_image_placements p
                JOIN template_image_assets a ON a.id=p.AssetId
            ) SELECT 1 FROM (
                SELECT * FROM (SELECT template_name,asset_id FROM expected EXCEPT SELECT template_name,asset_id FROM template_image_references)
                UNION ALL SELECT * FROM (SELECT template_name,asset_id FROM template_image_references EXCEPT SELECT template_name,asset_id FROM expected)
            ) LIMIT 1";
            if (usage.ExecuteScalar() != null) throw new InvalidDataException("The selected backup contains inconsistent template image usage.");
        }
        foreach (var table in new[] { "meal_categories", "recent_template_colors" })
        {
            using var check=source.CreateCommand(); check.CommandText=$"SELECT position FROM {table} ORDER BY position"; using var reader=check.ExecuteReader(); var i=0; while(reader.Read()) if(reader.GetInt32(0)!=i++) throw new InvalidDataException("Invalid settings order.");
        }
        using (var colors = source.CreateCommand()) { colors.CommandText="SELECT color FROM recent_template_colors"; using var reader=colors.ExecuteReader(); while(reader.Read()) _ = reader.GetString(0); }
        using var categories=source.CreateCommand(); categories.CommandText="SELECT id,name FROM meal_categories ORDER BY position"; using var values=categories.ExecuteReader(); var list=new List<MealCategory>(); while(values.Read()) list.Add(new MealCategory { Id=values.GetString(0), Name=values.GetString(1) }); ValidateMealCategories(list);
    }

    private static bool BackupHasTable(SqliteConnection source, string table)
    {
        using var command = source.CreateCommand();
        command.CommandText = "SELECT 1 FROM sqlite_schema WHERE type = 'table' AND name = @name COLLATE NOCASE";
        command.Parameters.AddWithValue("@name", table);
        return command.ExecuteScalar() != null;
    }

    private static bool BackupHasMigration(SqliteConnection source, int version)
    {
        if (!BackupHasTable(source, "schema_migrations")) return false;
        using var command = source.CreateCommand();
        command.CommandText = "SELECT COUNT(*) FROM schema_migrations WHERE version=@version";
        command.Parameters.AddWithValue("@version", version);
        return Convert.ToInt64(command.ExecuteScalar()) > 0;
    }

    private static void ValidateRelationshipRows(SqliteConnection source)
    {
        foreach (var table in new[]
        {
            "recipe_ingredients",
            "ingredient_allergens",
            "recipe_additional_allergens"
        })
        {
            using var command = source.CreateCommand();
            command.CommandText = $"SELECT 1 FROM {table} WHERE position < 0 OR saved_name IS NULL OR length(saved_name)=0 LIMIT 1";
            if (command.ExecuteScalar() != null)
                throw new InvalidDataException("The selected backup contains invalid relationship data.");
        }
    }

    public async Task VacuumAsync()
    {
        await InitializeAsync();
        using var command = _connection!.CreateCommand();
        command.CommandText = "VACUUM";
        await command.ExecuteNonQueryAsync();
        _logger.LogInformation("Vacuumed database");
    }

    public async Task ReindexAsync()
    {
        await InitializeAsync();
        using var command = _connection!.CreateCommand();
        command.CommandText = "REINDEX";
        await command.ExecuteNonQueryAsync();
        _logger.LogInformation("Reindexed database");
    }

    public void Dispose()
    {
        _connection?.Dispose();
        _initLock.Dispose();
    }
}
