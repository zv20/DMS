using Microsoft.Extensions.Logging;
using Microsoft.Data.Sqlite;
using System.IO;
using DMS.Models;

namespace DMS.Services;

public interface IDatabaseService
{
    Task InitializeAsync();
    Task<Recipe?> GetRecipeAsync(int id);
    Task<List<Recipe>> GetAllRecipesAsync();
    Task<int> SaveRecipeAsync(Recipe recipe);
    Task DeleteRecipeAsync(int id);
    Task<Ingredient?> GetIngredientAsync(int id);
    Task<List<Ingredient>> GetAllIngredientsAsync();
    Task<int> SaveIngredientAsync(Ingredient ingredient);
    Task DeleteIngredientAsync(int id);
    Task<Allergen?> GetAllergenAsync(int id);
    Task<List<Allergen>> GetAllAllergensAsync();
    Task<int> SaveAllergenAsync(Allergen allergen);
    Task DeleteAllergenAsync(int id);
    Task<List<MenuEntry>> GetMenuAsync(DateTime start, DateTime end);
    Task SaveMenuEntryAsync(MenuEntry entry);
    Task DeleteMenuEntryAsync(DateTime date, string slot);
    Task<string?> GetMenuCategoryAsync(DateTime date, string slot);
    Task<List<MenuSlotCategory>> GetMenuCategoriesAsync();
    Task SaveMenuCategoryAsync(DateTime date, string slot, string category);
    Task<AppSettings?> GetSettingsAsync();
    Task SaveSettingsAsync(AppSettings settings);
    Task<List<MenuTemplate>> GetAllTemplatesAsync();
    Task SaveTemplateAsync(MenuTemplate template);
    Task RenameTemplateAsync(string currentName, string newName);
    Task DeleteTemplateAsync(string name);
    Task CreateBackupAsync(string destinationPath);
    Task RestoreFromAsync(string sourcePath);
    Task VacuumAsync();
    Task ReindexAsync();
    string GetDatabasePath();
}

public class DatabaseService : IDatabaseService, IDisposable
{
    private readonly ILogger<DatabaseService> _logger;
    private readonly string _dbPath;
    private SqliteConnection? _connection;
    private readonly SemaphoreSlim _initLock = new(1, 1);
    private bool _initialized = false;

    public DatabaseService(ILogger<DatabaseService> logger, string? databasePath = null)
    {
        _logger = logger;
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
        if (_initialized) return;

        await _initLock.WaitAsync();
        try
        {
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
        command.CommandText = @"INSERT OR IGNORE INTO schema_migrations(version) VALUES (1);
                                PRAGMA user_version = 1;";
        await command.ExecuteNonQueryAsync();
    }

    private async Task SeedDefaultsAsync()
    {
        if (_connection == null) return;

        var defaults = new Dictionary<string, string>
        {
            ["language"] = "bg",
            ["theme"] = "default",
            ["version"] = "1.0.0"
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
    public async Task<Recipe?> GetRecipeAsync(int id)
    {
        await InitializeAsync();
        using var cmd = _connection!.CreateCommand();
        cmd.CommandText = "SELECT * FROM recipes WHERE id = @id";
        cmd.Parameters.AddWithValue("@id", id);
        using var reader = await cmd.ExecuteReaderAsync();
        if (await reader.ReadAsync()) return ReadRecipe(reader);
        return null;
    }

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
                throw new InvalidOperationException(
                    "This recipe is assigned to one or more menu entries. Remove or replace those entries before deleting the recipe.");
            }
        }

        using var cmd = _connection!.CreateCommand();
        cmd.CommandText = "DELETE FROM recipes WHERE id = @id";
        cmd.Parameters.AddWithValue("@id", id);
        await cmd.ExecuteNonQueryAsync();
        _logger.LogInformation("Deleted recipe {Id}", id);
    }

    private Recipe ReadRecipe(SqliteDataReader reader)
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
    public async Task<Ingredient?> GetIngredientAsync(int id)
    {
        await InitializeAsync();
        using var cmd = _connection!.CreateCommand();
        cmd.CommandText = "SELECT * FROM ingredients WHERE id = @id";
        cmd.Parameters.AddWithValue("@id", id);
        using var reader = await cmd.ExecuteReaderAsync();
        if (await reader.ReadAsync()) return ReadIngredient(reader);
        return null;
    }

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

    private Ingredient ReadIngredient(SqliteDataReader reader)
    {
        return new Ingredient
        {
            Id = reader.GetInt32(0),
            Name = reader.GetString(1),
            Allergens = System.Text.Json.JsonSerializer.Deserialize<List<string>>(reader.GetString(2)) ?? new()
        };
    }

    // Allergen operations
    public async Task<Allergen?> GetAllergenAsync(int id)
    {
        await InitializeAsync();
        using var cmd = _connection!.CreateCommand();
        cmd.CommandText = "SELECT id, name, color, icon FROM allergens WHERE id = @id";
        cmd.Parameters.AddWithValue("@id", id);
        using var reader = await cmd.ExecuteReaderAsync();
        if (await reader.ReadAsync()) return ReadAllergen(reader);
        return null;
    }

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

    public async Task SaveMenuEntryAsync(MenuEntry entry)
    {
        await InitializeAsync();
        using (var recipeCommand = _connection!.CreateCommand())
        {
            recipeCommand.CommandText = "SELECT COUNT(*) FROM recipes WHERE id = @recipeId";
            recipeCommand.Parameters.AddWithValue("@recipeId", entry.RecipeId);
            if (Convert.ToInt32(await recipeCommand.ExecuteScalarAsync()) == 0)
            {
                throw new InvalidOperationException("The selected recipe no longer exists.");
            }
        }

        using var cmd = _connection!.CreateCommand();
        cmd.CommandText = @"INSERT INTO menu (date, slot, recipe_id) VALUES (@date, @slot, @recipeId)
                           ON CONFLICT(date, slot) DO UPDATE SET recipe_id=@recipeId";
        cmd.Parameters.AddWithValue("@date", entry.Date.ToString("yyyy-MM-dd"));
        cmd.Parameters.AddWithValue("@slot", entry.Slot);
        cmd.Parameters.AddWithValue("@recipeId", entry.RecipeId);
        await cmd.ExecuteNonQueryAsync();
    }

    public async Task DeleteMenuEntryAsync(DateTime date, string slot)
    {
        await InitializeAsync();
        using var cmd = _connection!.CreateCommand();
        cmd.CommandText = "DELETE FROM menu WHERE date = @date AND slot = @slot";
        cmd.Parameters.AddWithValue("@date", date.ToString("yyyy-MM-dd"));
        cmd.Parameters.AddWithValue("@slot", slot);
        await cmd.ExecuteNonQueryAsync();
    }

    public async Task<string?> GetMenuCategoryAsync(DateTime date, string slot)
    {
        await InitializeAsync();
        using var cmd = _connection!.CreateCommand();
        cmd.CommandText = "SELECT category FROM menu_slot_categories WHERE date=@date AND slot=@slot";
        cmd.Parameters.AddWithValue("@date", date.ToString("yyyy-MM-dd"));
        cmd.Parameters.AddWithValue("@slot", slot);
        return await cmd.ExecuteScalarAsync() as string;
    }

    public async Task<List<MenuSlotCategory>> GetMenuCategoriesAsync()
    {
        await InitializeAsync();
        using var cmd = _connection!.CreateCommand();
        cmd.CommandText = "SELECT date, slot, category FROM menu_slot_categories ORDER BY date, slot";
        using var reader = await cmd.ExecuteReaderAsync();
        var result = new List<MenuSlotCategory>();
        while (await reader.ReadAsync()) result.Add(new MenuSlotCategory { Date = DateTime.Parse(reader.GetString(0)), Slot = reader.GetString(1), Category = reader.GetString(2) });
        return result;
    }

    public async Task SaveMenuCategoryAsync(DateTime date, string slot, string category)
    {
        await InitializeAsync();
        using var cmd = _connection!.CreateCommand();
        cmd.CommandText = @"INSERT INTO menu_slot_categories(date, slot, category) VALUES(@date, @slot, @category)
                            ON CONFLICT(date, slot) DO UPDATE SET category=@category";
        cmd.Parameters.AddWithValue("@date", date.ToString("yyyy-MM-dd"));
        cmd.Parameters.AddWithValue("@slot", slot);
        cmd.Parameters.AddWithValue("@category", category);
        await cmd.ExecuteNonQueryAsync();
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
                case "theme": settings.Theme = value; break;
                case "accent_color": settings.AccentColor = value; break;
                case "weekend_planning_enabled": settings.WeekendPlanningEnabled = bool.TryParse(value, out var enabled) && enabled; break;
                case "data_folder": settings.DataFolder = value; break;
            }
        }
        return settings;
    }

    public async Task SaveSettingsAsync(AppSettings settings)
    {
        await InitializeAsync();
        using var cmd = _connection!.CreateCommand();
        cmd.CommandText = "INSERT OR REPLACE INTO settings (key, value) VALUES (@key, @value)";

        var pairs = new[]
        {
            ("language", settings.Language),
            ("theme", settings.Theme),
            ("accent_color", settings.AccentColor),
            ("weekend_planning_enabled", settings.WeekendPlanningEnabled.ToString()),
            ("data_folder", settings.DataFolder ?? "")
        };

        foreach (var (key, value) in pairs)
        {
            cmd.Parameters.Clear();
            cmd.Parameters.AddWithValue("@key", key);
            cmd.Parameters.AddWithValue("@value", value);
            await cmd.ExecuteNonQueryAsync();
        }
    }

    // Templates
    public async Task<List<MenuTemplate>> GetAllTemplatesAsync()
    {
        await InitializeAsync();
        var list = new List<MenuTemplate>();
        using var cmd = _connection!.CreateCommand();
        cmd.CommandText = "SELECT name, data_json, is_preset FROM templates ORDER BY is_preset DESC, name";
        using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            var template = System.Text.Json.JsonSerializer.Deserialize<MenuTemplate>(reader.GetString(1));
            if (template != null)
            {
                template.Name = reader.GetString(0);
                template.IsPreset = reader.GetInt32(2) == 1;
                list.Add(template);
            }
        }
        return list;
    }

    public async Task SaveTemplateAsync(MenuTemplate template)
    {
        await InitializeAsync();
        using var cmd = _connection!.CreateCommand();
        var json = System.Text.Json.JsonSerializer.Serialize(template);
        var now = DateTime.UtcNow.ToString("O");
        cmd.CommandText = @"INSERT INTO templates (name, data_json, is_preset, created_at, updated_at)
                           VALUES (@name, @data, @preset, @now, @now)
                           ON CONFLICT(name) DO UPDATE SET data_json=@data, is_preset=@preset, updated_at=@now";
        cmd.Parameters.AddWithValue("@name", template.Name);
        cmd.Parameters.AddWithValue("@data", json);
        cmd.Parameters.AddWithValue("@preset", template.IsPreset ? 1 : 0);
        cmd.Parameters.AddWithValue("@now", now);
        await cmd.ExecuteNonQueryAsync();
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

        await _initLock.WaitAsync();
        try
        {
            _connection?.Dispose();
            _connection = null;
            _initialized = false;

            File.Copy(sourcePath, _dbPath, overwrite: true);
            DeleteIfPresent($"{_dbPath}-wal");
            DeleteIfPresent($"{_dbPath}-shm");

            _connection = new SqliteConnection($"Data Source={_dbPath};Pooling=False");
            await _connection.OpenAsync();
            await ConfigureConnectionAsync();
            await CreateSchemaAsync();
            _initialized = true;
            _logger.LogInformation("Restored database from {Path}", sourcePath);
        }
        finally
        {
            _initLock.Release();
        }
    }

    private static void DeleteIfPresent(string path)
    {
        if (File.Exists(path)) File.Delete(path);
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
