using System.Diagnostics;
using System.Text.Json;
using DMS.Services;
using Microsoft.Data.Sqlite;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;
using Xunit.Abstractions;

namespace DMS.Tests;

// Opt-in only: regular test runs should not perform performance measurements.
public sealed class PerformanceBaselineTests(ITestOutputHelper output)
{
    [Fact]
    [Trait("Category", "PerformanceBaseline")]
    public async Task MeasureGeneratedDatabaseReads()
    {
        var resultsPath = Environment.GetEnvironmentVariable("DMS_PERF_RESULTS_PATH");
        if (string.IsNullOrWhiteSpace(resultsPath))
        {
            output.WriteLine("Performance baseline not requested; set DMS_PERF_RESULTS_PATH to run it.");
            return;
        }

        const int catalogSize = 1000;
        const int days = 365;
        const int slots = 4;
        const int repetitions = 7;
        var start = new DateTime(2026, 1, 1);
        var folder = Path.Combine(Path.GetTempPath(), "DMS.Performance", Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(folder);
        try
        {
            var path = Path.Combine(folder, "generated.db");
            var measurements = new List<object>();
            using (var database = new DatabaseService(NullLogger<DatabaseService>.Instance, path, seedBuiltInTemplates: false))
            {
                await database.InitializeAsync();
                // Load deterministic synthetic data outside the measured region.
                using (var connection = new SqliteConnection($"Data Source={path};Pooling=False"))
                {
                    await connection.OpenAsync();
                    using var transaction = connection.BeginTransaction();
                    using var command = connection.CreateCommand();
                    command.Transaction = transaction;
                    command.CommandText = "INSERT INTO recipes (id, name, category, ingredients_json, allergens_json) VALUES ($id, $name, 'main', '[\"Ingredient 0001\",\"Ingredient 0002\"]', '[\"milk\"]'); INSERT INTO ingredients (name, allergens_json) VALUES ($ingredient, '[\"milk\"]')";
                    var id = command.Parameters.Add("$id", SqliteType.Integer);
                    var name = command.Parameters.Add("$name", SqliteType.Text);
                    var ingredient = command.Parameters.Add("$ingredient", SqliteType.Text);
                    for (var i = 1; i <= catalogSize; i++)
                    {
                        id.Value = i;
                        name.Value = $"Recipe {i:D4}";
                        ingredient.Value = $"Ingredient {i:D4}";
                        await command.ExecuteNonQueryAsync();
                    }
                    command.Parameters.Clear();
                    command.CommandText = "INSERT INTO menu (date, slot, recipe_id) VALUES ($date, $slot, $recipe); INSERT INTO menu_slot_categories (date, slot, category) VALUES ($date, $slot, 'main')";
                    var date = command.Parameters.Add("$date", SqliteType.Text);
                    var slot = command.Parameters.Add("$slot", SqliteType.Text);
                    var recipe = command.Parameters.Add("$recipe", SqliteType.Integer);
                    for (var day = 0; day < days; day++)
                        for (var s = 1; s <= slots; s++)
                        {
                            date.Value = start.AddDays(day).ToString("yyyy-MM-dd", System.Globalization.CultureInfo.InvariantCulture);
                            slot.Value = $"slot{s}";
                            recipe.Value = (day * slots + s - 1) % catalogSize + 1;
                            await command.ExecuteNonQueryAsync();
                        }
                    transaction.Commit();
                }

                async Task Measure(string name, int expectedCount, Func<Task<int>> operation)
                {
                    Assert.Equal(expectedCount, await operation()); // warmup, not timed
                    var samples = new double[repetitions];
                    for (var i = 0; i < samples.Length; i++)
                    {
                        var clock = Stopwatch.StartNew();
                        var count = await operation();
                        clock.Stop();
                        Assert.Equal(expectedCount, count);
                        samples[i] = Math.Round(clock.Elapsed.TotalMilliseconds, 3);
                    }
                    measurements.Add(new { name, expectedCount, warmupRuns = 1, repetitions, milliseconds = samples });
                    output.WriteLine($"{name}: {string.Join(", ", samples.Select(x => x.ToString("F3", System.Globalization.CultureInfo.InvariantCulture)))} ms");
                }

                await Measure("load_all_recipes", catalogSize, async () => (await database.GetAllRecipesAsync()).Count);
                await Measure("load_all_ingredients", catalogSize, async () => (await database.GetAllIngredientsAsync()).Count);
                await Measure("load_week_menu", 7 * slots, async () => (await database.GetMenuAsync(start, start.AddDays(6))).Count);
                await Measure("load_year_menu", days * slots, async () => (await database.GetMenuAsync(start, start.AddDays(days - 1))).Count);
                await Measure("load_week_categories", 7 * slots, async () => (await database.GetMenuCategoriesAsync(start, start.AddDays(6))).Count);
                var uiDatabasePath = Environment.GetEnvironmentVariable("DMS_PERF_UI_DATABASE_PATH");
                if (!string.IsNullOrWhiteSpace(uiDatabasePath))
                {
                    Directory.CreateDirectory(Path.GetDirectoryName(Path.GetFullPath(uiDatabasePath))!);
                    await database.CreateBackupAsync(Path.GetFullPath(uiDatabasePath));
                }
            }

            var result = new
            {
                schemaVersion = 1,
                scope = "Generated SQLite data; warm database service reads, excluding UI and data generation",
                dataset = new { recipes = catalogSize, ingredients = catalogSize, menuDays = days, slotsPerDay = slots },
                measurements
            };
            var fullPath = Path.GetFullPath(resultsPath);
            Directory.CreateDirectory(Path.GetDirectoryName(fullPath)!);
            await File.WriteAllTextAsync(fullPath, JsonSerializer.Serialize(result, new JsonSerializerOptions { WriteIndented = true }));
        }
        finally
        {
            Directory.Delete(folder, recursive: true);
        }
    }
}
