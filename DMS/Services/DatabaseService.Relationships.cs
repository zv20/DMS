using System.Text.Json;
using DMS.Models;
using Microsoft.Data.Sqlite;

namespace DMS.Services;

public partial class DatabaseService
{
    // Missing catalog entries retain their original names. Rows also retain order
    // and duplicates from databases created before relationships were introduced.
    private void InitializeRelationships()
    {
        using var transaction = _connection!.BeginTransaction();
        using var command = _connection.CreateCommand();
        command.Transaction = transaction;
        command.CommandText = @"CREATE TABLE IF NOT EXISTS recipe_ingredients (
            recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
            position INTEGER NOT NULL, ingredient_id INTEGER REFERENCES ingredients(id) ON DELETE SET NULL,
            saved_name TEXT NOT NULL, PRIMARY KEY(recipe_id, position));
          CREATE TABLE IF NOT EXISTS ingredient_allergens (
            ingredient_id INTEGER NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
            position INTEGER NOT NULL, allergen_id INTEGER REFERENCES allergens(id) ON DELETE SET NULL,
            saved_name TEXT NOT NULL, PRIMARY KEY(ingredient_id, position));
          CREATE TABLE IF NOT EXISTS recipe_additional_allergens (
            recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
            position INTEGER NOT NULL, allergen_id INTEGER REFERENCES allergens(id) ON DELETE SET NULL,
            saved_name TEXT NOT NULL, PRIMARY KEY(recipe_id, position));";
        command.ExecuteNonQuery();
        command.CommandText = "SELECT COUNT(*) FROM schema_migrations WHERE version=4";
        if (Convert.ToInt64(command.ExecuteScalar()) == 0)
        {
            var recipes = new List<(long Id, List<string> Ingredients, List<string> Allergens)>();
            command.CommandText = "SELECT id,ingredients_json,allergens_json FROM recipes";
            using (var reader = command.ExecuteReader())
                while (reader.Read()) recipes.Add((reader.GetInt64(0), ReadNames(reader.GetString(1)), ReadNames(reader.GetString(2))));
            var ingredients = new List<(long Id, List<string> Allergens)>();
            command.CommandText = "SELECT id,allergens_json FROM ingredients";
            using (var reader = command.ExecuteReader())
                while (reader.Read()) ingredients.Add((reader.GetInt64(0), ReadNames(reader.GetString(1))));
            var ingredientCatalog = ReadCatalog("ingredients", transaction);
            var allergenCatalog = ReadCatalog("allergens", transaction);
            foreach (var ingredient in ingredients)
                ReplaceRelations("ingredient_allergens", "ingredient_id", ingredient.Id, "allergen_id", "allergens", ingredient.Allergens, transaction, allergenCatalog);
            foreach (var recipe in recipes)
            {
                ReplaceRelations("recipe_ingredients", "recipe_id", recipe.Id, "ingredient_id", "ingredients", recipe.Ingredients, transaction, ingredientCatalog);
                // Existing records do not identify manually assigned allergens.
                ReplaceRelations("recipe_additional_allergens", "recipe_id", recipe.Id, "allergen_id", "allergens", recipe.Allergens, transaction, allergenCatalog);
            }
            command.CommandText = "INSERT INTO schema_migrations(version) VALUES (4)";
            command.ExecuteNonQuery();
            command.CommandText = "PRAGMA user_version = 4";
            command.ExecuteNonQuery();
        }
        transaction.Commit();
    }

    private static List<string> ReadNames(string json) => JsonSerializer.Deserialize<List<string>>(json) ?? [];

    private Dictionary<string, long> ReadCatalog(string table, SqliteTransaction transaction)
    {
        var catalog = new Dictionary<string, long>(StringComparer.OrdinalIgnoreCase);
        using var command = _connection!.CreateCommand();
        command.Transaction = transaction;
        command.CommandText = $"SELECT id,name FROM {table} ORDER BY name";
        using (var reader = command.ExecuteReader())
            while (reader.Read()) catalog.TryAdd(reader.GetString(1), reader.GetInt64(0));
        return catalog;
    }

    private void ReplaceRelations(string table, string ownerColumn, long ownerId, string targetColumn, string targetTable, IReadOnlyList<string> names, SqliteTransaction transaction, Dictionary<string, long>? catalog = null)
    {
        catalog ??= ReadCatalog(targetTable, transaction);
        using var command = _connection!.CreateCommand();
        command.Transaction = transaction;
        command.CommandText = $"DELETE FROM {table} WHERE {ownerColumn}=@owner";
        command.Parameters.AddWithValue("@owner", ownerId);
        command.ExecuteNonQuery();
        command.CommandText = $"INSERT INTO {table}({ownerColumn},position,{targetColumn},saved_name) VALUES (@owner,@position,@target,@name)";
        var position = command.Parameters.Add("@position", SqliteType.Integer);
        var target = command.Parameters.Add("@target", SqliteType.Integer);
        var savedName = command.Parameters.Add("@name", SqliteType.Text);
        for (var i = 0; i < names.Count; i++)
        {
            var name = names[i] ?? throw new InvalidDataException("A relationship name is missing.");
            position.Value = i;
            target.Value = catalog.TryGetValue(name, out var id) ? id : DBNull.Value;
            savedName.Value = name;
            command.ExecuteNonQuery();
        }
    }

    private Dictionary<long, List<string>> ReadRelations(string table, string ownerColumn, string targetColumn, string targetTable, bool useCurrentNames = true)
    {
        var result = new Dictionary<long, List<string>>();
        using var command = _connection!.CreateCommand();
        var name = useCurrentNames ? "COALESCE(t.name,r.saved_name)" : "r.saved_name";
        command.CommandText = $"SELECT r.{ownerColumn},{name} FROM {table} r LEFT JOIN {targetTable} t ON t.id=r.{targetColumn} ORDER BY r.{ownerColumn},r.position";
        using var reader = command.ExecuteReader();
        while (reader.Read())
        {
            var owner = reader.GetInt64(0);
            if (!result.TryGetValue(owner, out var names)) result[owner] = names = [];
            names.Add(reader.GetString(1));
        }
        return result;
    }
}
