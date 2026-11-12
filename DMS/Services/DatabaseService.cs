using Microsoft.Extensions.Logging;
using Microsoft.Data.Sqlite;
using System.IO;
using DMS.Models;

namespace DMS.Services;

public sealed class RecipeInUseException : InvalidOperationException
{
    public RecipeInUseException() : base("This recipe is assigned to one or more menu entries. Remove or replace those entries before deleting the recipe.") { }
}

public partial class DatabaseService : IDisposable
{
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
            _connection = new SqliteConnection($"Data Source={_dbPath};Pooling=False");
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
                ingredients_json TEXT NOT NULL DEFAULT '[]',
                allergens_json TEXT NOT NULL DEFAULT '[]',
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now'))
            )",
            @"CREATE TABLE IF NOT EXISTS ingredients (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                allergens_json TEXT NOT NULL DEFAULT '[]',
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            )",
            @"CREATE TABLE IF NOT EXISTS allergens (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                color TEXT NOT NULL DEFAULT '#3498db',
                icon TEXT NOT NULL DEFAULT '⚠️',
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

        await EnsureAllergenIconColumnAsync();
        // Seed default settings
        await SeedDefaultsAsync();
        await SeedDefaultAllergensAsync();
        await RecordSchemaVersionAsync();
        InitializeTemplateImages();
        if (_seedBuiltInTemplates) SeedSeasonalTemplatePresets();
    }

    private async Task EnsureAllergenIconColumnAsync()
    {
        if (_connection == null) return;
        using var command = _connection.CreateCommand();
        command.CommandText = "ALTER TABLE allergens ADD COLUMN icon TEXT NOT NULL DEFAULT '⚠️'";
        try { await command.ExecuteNonQueryAsync(); }
        catch (SqliteException ex) when (ex.Message.Contains("duplicate column", StringComparison.OrdinalIgnoreCase)) { }
    }

    private async Task SeedDefaultAllergensAsync()
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
            command.CommandText = @"INSERT OR IGNORE INTO allergens (name, color, icon) VALUES (@name, @color, @icon);
                                    UPDATE allergens SET color=@color, icon=@icon WHERE name=@name
                                      AND (color='#3498db' OR color IS NULL OR icon IS NULL OR icon='⚠️');";
            command.Parameters.AddWithValue("@name", allergen.Name);
            command.Parameters.AddWithValue("@icon", allergen.Icon);
            command.Parameters.AddWithValue("@color", allergen.Color);
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
        using var cmd = _connection!.CreateCommand();
        cmd.CommandText = "SELECT * FROM recipes ORDER BY name";
        using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync()) recipes.Add(ReadRecipe(reader));
        return recipes;
    }

    public async Task<int> SaveRecipeAsync(Recipe recipe)
    {
        await InitializeAsync();
        using var cmd = _connection!.CreateCommand();
        var now = DateTime.UtcNow.ToString("O");
        var ingredientsJson = System.Text.Json.JsonSerializer.Serialize(recipe.Ingredients);
        var allergensJson = System.Text.Json.JsonSerializer.Serialize(recipe.Allergens);

        if (recipe.Id == 0)
        {
            cmd.CommandText = @"INSERT INTO recipes (name, category, portion_size, calories, instructions, ingredients_json, allergens_json, created_at, updated_at)
                               VALUES (@name, @category, @portion, @calories, @instructions, @ingredients, @allergens, @now, @now);
                               SELECT last_insert_rowid();";
        }
        else
        {
            cmd.CommandText = @"UPDATE recipes SET name=@name, category=@category, portion_size=@portion, calories=@calories,
                               instructions=@instructions, ingredients_json=@ingredients, allergens_json=@allergens, updated_at=@now
                               WHERE id=@id";
            cmd.Parameters.AddWithValue("@id", recipe.Id);
        }

        cmd.Parameters.AddWithValue("@name", recipe.Name);
        cmd.Parameters.AddWithValue("@category", recipe.Category);
        cmd.Parameters.AddWithValue("@portion", recipe.PortionSize);
        cmd.Parameters.AddWithValue("@calories", recipe.Calories);
        cmd.Parameters.AddWithValue("@instructions", recipe.Instructions ?? "");
        cmd.Parameters.AddWithValue("@ingredients", ingredientsJson);
        cmd.Parameters.AddWithValue("@allergens", allergensJson);
        cmd.Parameters.AddWithValue("@now", now);

        var result = await cmd.ExecuteScalarAsync();
        var id = recipe.Id == 0 ? Convert.ToInt32(result!) : recipe.Id;
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
            Ingredients = System.Text.Json.JsonSerializer.Deserialize<List<string>>(reader.GetString(6)) ?? new(),
            Allergens = System.Text.Json.JsonSerializer.Deserialize<List<string>>(reader.GetString(7)) ?? new()
        };
    }

    // Ingredient operations
    public async Task<List<Ingredient>> GetAllIngredientsAsync()
    {
        await InitializeAsync();
        var list = new List<Ingredient>();
        using var cmd = _connection!.CreateCommand();
        cmd.CommandText = "SELECT * FROM ingredients ORDER BY name";
        using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync()) list.Add(ReadIngredient(reader));
        return list;
    }

    public async Task<int> SaveIngredientAsync(Ingredient ingredient)
    {
        await InitializeAsync();
        using var cmd = _connection!.CreateCommand();
        var allergensJson = System.Text.Json.JsonSerializer.Serialize(ingredient.Allergens);
        var now = DateTime.UtcNow.ToString("O");

        if (ingredient.Id == 0)
        {
            cmd.CommandText = @"INSERT INTO ingredients (name, allergens_json, created_at)
                               VALUES (@name, @allergens, @now);
                               SELECT last_insert_rowid();";
        }
        else
        {
            cmd.CommandText = "UPDATE ingredients SET name=@name, allergens_json=@allergens WHERE id=@id";
            cmd.Parameters.AddWithValue("@id", ingredient.Id);
        }

        cmd.Parameters.AddWithValue("@name", ingredient.Name);
        cmd.Parameters.AddWithValue("@allergens", allergensJson);
        cmd.Parameters.AddWithValue("@now", now);

        var result = await cmd.ExecuteScalarAsync();
        var id = ingredient.Id == 0 ? Convert.ToInt32(result!) : ingredient.Id;
        _logger.LogInformation("Saved ingredient {Id}: {Name}", id, ingredient.Name);
        return id;
    }

    public async Task DeleteIngredientAsync(int id)
    {
        await InitializeAsync();
        using var cmd = _connection!.CreateCommand();
        cmd.CommandText = "DELETE FROM ingredients WHERE id = @id";
        cmd.Parameters.AddWithValue("@id", id);
        await cmd.ExecuteNonQueryAsync();
        _logger.LogInformation("Deleted ingredient {Id}", id);
    }

    private static Ingredient ReadIngredient(SqliteDataReader reader)
    {
        return new Ingredient
        {
            Id = reader.GetInt32(0),
            Name = reader.GetString(1),
            Allergens = System.Text.Json.JsonSerializer.Deserialize<List<string>>(reader.GetString(2)) ?? new()
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

    private Allergen ReadAllergen(SqliteDataReader reader)
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
    public async Task<List<MenuEntry>> GetMenuAsync(DateTime start, DateTime end)
    {
        await InitializeAsync();
        var list = new List<MenuEntry>();
        using var cmd = _connection!.CreateCommand();
        cmd.CommandText = "SELECT * FROM menu WHERE date >= @start AND date <= @end ORDER BY date, slot";
        cmd.Parameters.AddWithValue("@start", start.ToString("yyyy-MM-dd"));
        cmd.Parameters.AddWithValue("@end", end.ToString("yyyy-MM-dd"));
        using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            list.Add(new MenuEntry
            {
                Id = reader.GetInt32(0),
                Date = DateTime.Parse(reader.GetString(1)),
                Slot = reader.GetString(2),
                RecipeId = reader.GetInt32(3)
            });
        }
        return list;
    }

    public async Task<List<MenuSlotCategory>> GetMenuCategoriesAsync(DateTime start, DateTime end)
    {
        await InitializeAsync();
        using var cmd = _connection!.CreateCommand();
        cmd.CommandText = "SELECT date, slot, category FROM menu_slot_categories WHERE date >= @start AND date <= @end ORDER BY date, slot";
        cmd.Parameters.AddWithValue("@start", start.ToString("yyyy-MM-dd"));
        cmd.Parameters.AddWithValue("@end", end.ToString("yyyy-MM-dd"));
        using var reader = await cmd.ExecuteReaderAsync();
        var result = new List<MenuSlotCategory>();
        while (await reader.ReadAsync()) result.Add(new MenuSlotCategory { Date = DateTime.Parse(reader.GetString(0)), Slot = reader.GetString(1), Category = reader.GetString(2) });
        return result;
    }

    /// <summary>Save a slot's category and assignment as one indivisible change.</summary>
    public async Task SaveMenuSlotAsync(DateTime date, string slot, string category, int? recipeId, string? previousSlot = null)
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

        var dateValue = date.ToString("yyyy-MM-dd");
        using (var updateCategory = _connection.CreateCommand())
        {
            updateCategory.Transaction = transaction;
            updateCategory.CommandText = @"INSERT INTO menu_slot_categories(date, slot, category) VALUES(@date, @slot, @category)
                ON CONFLICT(date, slot) DO UPDATE SET category=@category";
            updateCategory.Parameters.AddWithValue("@date", dateValue);
            updateCategory.Parameters.AddWithValue("@slot", slot);
            updateCategory.Parameters.AddWithValue("@category", category);
            updateCategory.ExecuteNonQuery();
        }

        using (var updateMenu = _connection.CreateCommand())
        {
            updateMenu.Transaction = transaction;
            updateMenu.CommandText = recipeId.HasValue
                ? @"INSERT INTO menu(date, slot, recipe_id) VALUES(@date, @slot, @recipe)
                    ON CONFLICT(date, slot) DO UPDATE SET recipe_id=@recipe"
                : "DELETE FROM menu WHERE date=@date AND slot=@slot";
            updateMenu.Parameters.AddWithValue("@date", dateValue);
            updateMenu.Parameters.AddWithValue("@slot", slot);
            if (recipeId.HasValue) updateMenu.Parameters.AddWithValue("@recipe", recipeId.Value);
            updateMenu.ExecuteNonQuery();
        }

        if (!string.IsNullOrWhiteSpace(previousSlot) && !string.Equals(previousSlot, slot, StringComparison.Ordinal))
        {
            using var removePrevious = _connection.CreateCommand();
            removePrevious.Transaction = transaction;
            removePrevious.CommandText = "DELETE FROM menu WHERE date=@date AND slot=@slot";
            removePrevious.Parameters.AddWithValue("@date", dateValue);
            removePrevious.Parameters.AddWithValue("@slot", previousSlot);
            removePrevious.ExecuteNonQuery();
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
            }
        }
        return settings;
    }

    private static List<MealCategory> ParseMealCategories(string value)
    {
        try
        {
            var categories = System.Text.Json.JsonSerializer.Deserialize<List<MealCategory>>(value);
            if (categories is not { Count: > 0 } || categories.Any(c => c == null || string.IsNullOrWhiteSpace(c.Id)) || categories.Select(c => c.Id).Distinct(StringComparer.OrdinalIgnoreCase).Count() != categories.Count)
                throw new InvalidDataException("The saved meal categories are invalid.");
            return categories;
        }
        catch (System.Text.Json.JsonException ex) { throw new InvalidDataException("The saved meal categories are invalid.", ex); }
    }

    private static int ParseMealsPerDay(string value) => int.TryParse(value, out var count) && count is >= 1 and <= 100
        ? count : throw new InvalidDataException("The saved meals per day setting is invalid.");

    public async Task SaveSettingsAsync(AppSettings settings)
    {
        await InitializeAsync();
        using var transaction = _connection!.BeginTransaction();
        using var cmd = _connection.CreateCommand();
        cmd.Transaction = transaction;
        cmd.CommandText = "INSERT OR REPLACE INTO settings (key, value) VALUES (@key, @value)";

        var pairs = new[]
        {
            ("language", settings.Language),
            ("theme", settings.Theme),
            ("accent_color", settings.AccentColor),
            ("weekend_planning_enabled", settings.WeekendPlanningEnabled.ToString()),
            ("meals_per_day", Math.Clamp(settings.MealsPerDay, 1, 100).ToString()),
            ("meal_categories", System.Text.Json.JsonSerializer.Serialize(settings.MealCategories)),
            ("data_folder", settings.DataFolder ?? ""),
            ("recent_template_colors", System.Text.Json.JsonSerializer.Serialize(settings.RecentTemplateColors ?? []))
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
        transaction.Commit();
    }

    // Templates
    public async Task<List<MenuTemplate>> GetAllTemplatesAsync()
    {
        await InitializeAsync();
        var list = new List<MenuTemplate>();
        using (var cmd = _connection!.CreateCommand())
        {
            cmd.CommandText = "SELECT name, data_json, is_preset FROM templates ORDER BY is_preset DESC, name";
            using var reader = cmd.ExecuteReader();
            while (reader.Read())
            {
                var template = System.Text.Json.JsonSerializer.Deserialize<MenuTemplate>(reader.GetString(1));
                if (template?.Document != null)
                {
                    template.Name = reader.GetString(0);
                    template.IsPreset = reader.GetInt32(2) == 1;
                    list.Add(template);
                }
            }
        }
        return list;
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
        var json = System.Text.Json.JsonSerializer.Serialize(stored);
        var now = DateTime.UtcNow.ToString("O");
        cmd.CommandText = @"INSERT INTO templates (name, data_json, is_preset, created_at, updated_at)
                           VALUES (@name, @data, @preset, @now, @now)
                           ON CONFLICT(name) DO UPDATE SET data_json=@data, is_preset=@preset, updated_at=@now";
        cmd.Parameters.AddWithValue("@name", template.Name);
        cmd.Parameters.AddWithValue("@data", json);
        cmd.Parameters.AddWithValue("@preset", template.IsPreset ? 1 : 0);
        cmd.Parameters.AddWithValue("@now", now);
        cmd.ExecuteNonQuery();
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
        string json;
        using (var source = _connection.CreateCommand())
        {
            source.Transaction = transaction;
            source.CommandText = "SELECT data_json, is_preset FROM templates WHERE name = @name";
            source.Parameters.AddWithValue("@name", currentName);
            using var reader = await source.ExecuteReaderAsync();
            if (!await reader.ReadAsync()) throw new InvalidOperationException("The selected template no longer exists.");
            if (reader.GetInt32(1) != 0) throw new InvalidOperationException("Built-in templates cannot be renamed.");
            json = reader.GetString(0);
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
        var template = System.Text.Json.JsonSerializer.Deserialize<MenuTemplate>(json)
            ?? throw new InvalidOperationException("The selected template cannot be read.");
        template.Name = newName;
        using var update = _connection.CreateCommand();
        update.Transaction = transaction;
        update.CommandText = "UPDATE templates SET name = @new, data_json = @json, updated_at = @now WHERE name = @old";
        update.Parameters.AddWithValue("@new", newName);
        update.Parameters.AddWithValue("@json", System.Text.Json.JsonSerializer.Serialize(template));
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
        await InitializeAsync();

        await using var destination = new SqliteConnection($"Data Source={destinationPath};Pooling=False");
        await destination.OpenAsync();
        _connection!.BackupDatabase(destination);
        _logger.LogInformation("Created SQLite backup at {Path}", destinationPath);
    }

    public async Task RestoreFromAsync(string sourcePath)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(sourcePath);
        if (!File.Exists(sourcePath)) throw new FileNotFoundException("The selected backup file no longer exists.", sourcePath);
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
            ValidateRestoreSource(backup);
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

    private static void ValidateRestoreSource(SqliteConnection source)
    {
        // DMS does not create triggers, views, or virtual tables. They can carry
        // behavior supplied by a backup author into later application operations.
        using (var objects = source.CreateCommand())
        {
            objects.CommandText = "SELECT 1 FROM sqlite_schema WHERE type IN ('trigger', 'view') LIMIT 1";
            if (objects.ExecuteScalar() != null)
                throw new InvalidDataException("The selected backup contains unsupported database objects.");
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
                    or "template_image_references|template_image_assets|asset_id|id|no action|restrict"))
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
            if (Convert.ToInt64(version.ExecuteScalar()) > 2)
                throw new InvalidDataException("This backup was created by a newer DMS database version.");
        }

        // Older DMS databases may lack later optional tables or columns; schema
        // initialization can add those after the restore succeeds.
        var required = new Dictionary<string, string[]>
        {
            ["recipes"] = ["id", "name", "category", "portion_size", "calories", "instructions", "ingredients_json", "allergens_json", "created_at", "updated_at"],
            ["ingredients"] = ["id", "name", "allergens_json", "created_at"],
            ["allergens"] = ["id", "name", "color", "created_at"],
            ["menu"] = ["id", "date", "slot", "recipe_id", "created_at"],
            ["templates"] = ["name", "data_json", "is_preset", "created_at", "updated_at"],
            ["settings"] = ["key", "value"]
        };
        foreach (var (table, columns) in required)
        {
            using var command = source.CreateCommand();
            command.CommandText = $"PRAGMA table_info(\"{table}\")";
            using var reader = command.ExecuteReader();
            var found = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            while (reader.Read()) found.Add(reader.GetString(1));
            if (columns.Any(column => !found.Contains(column)))
                throw new InvalidDataException("The selected file is not a supported DMS database backup.");
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
                for (var i = 0; i < 8; i++)
                    if (!string.Equals(reader.GetName(i), required["recipes"][i], StringComparison.OrdinalIgnoreCase))
                        throw new InvalidDataException("The selected backup has an unsupported recipe column order.");
                while (reader.Read())
                {
                    var recipe = ReadRecipe(reader);
                    if (recipe.Ingredients.Any(value => value is null) || recipe.Allergens.Any(value => value is null))
                        throw new InvalidDataException("The selected backup contains an invalid recipe list.");
                }
            }
            using (var ingredients = source.CreateCommand())
            {
                ingredients.CommandText = "SELECT * FROM ingredients ORDER BY name";
                using var reader = ingredients.ExecuteReader();
                for (var i = 0; i < 3; i++)
                    if (!string.Equals(reader.GetName(i), required["ingredients"][i], StringComparison.OrdinalIgnoreCase))
                        throw new InvalidDataException("The selected backup has an unsupported ingredient column order.");
                while (reader.Read())
                {
                    var ingredient = ReadIngredient(reader);
                    if (ingredient.Allergens.Any(value => value is null))
                        throw new InvalidDataException("The selected backup contains an invalid ingredient list.");
                }
            }
        }
        catch (Exception ex) when (ex is System.Text.Json.JsonException or InvalidOperationException
            or InvalidCastException or FormatException or OverflowException)
        {
            throw new InvalidDataException("The selected backup contains unreadable startup data.", ex);
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
