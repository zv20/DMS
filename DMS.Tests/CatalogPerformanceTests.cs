using System.Diagnostics;
using System.Text.Json;
using DMS.Views;
using Xunit;
using Xunit.Abstractions;

namespace DMS.Tests;

public sealed class CatalogPerformanceTests(ITestOutputHelper output)
{
    [Fact]
    [Trait("Category", "PerformanceBaseline")]
    public async Task MeasureGeneratedCatalogFiltering()
    {
        var databaseResultsPath = Environment.GetEnvironmentVariable("DMS_PERF_RESULTS_PATH");
        if (string.IsNullOrWhiteSpace(databaseResultsPath)) return;

        const int count = 10000;
        const int repetitions = 7;
        var recipes = Enumerable.Range(0, count).Select(i => new RecipeItemViewModel
        {
            Name = $"Recipe {i:D5}", Category = i % 2 == 0 ? "main" : "soup", CategoryDisplay = i % 2 == 0 ? "Main" : "Soup"
        }).ToList();
        var ingredients = Enumerable.Range(0, count).Select(i => new IngredientItemViewModel { Name = $"Ingredient {i:D5}" }).ToList();
        var measurements = new List<object>();

        void Measure(string name, int expectedCount, Func<int> operation)
        {
            Assert.Equal(expectedCount, operation());
            var samples = new double[repetitions];
            for (var i = 0; i < repetitions; i++)
            {
                var clock = Stopwatch.StartNew();
                var actualCount = operation();
                clock.Stop();
                Assert.Equal(expectedCount, actualCount);
                samples[i] = Math.Round(clock.Elapsed.TotalMilliseconds, 3);
            }
            measurements.Add(new { name, expectedCount, warmupRuns = 1, repetitions, milliseconds = samples });
            output.WriteLine($"{name}: {string.Join(", ", samples)} ms");
        }

        Measure("recipes_show_all_and_sort", count, () => CatalogFilter.Recipes(recipes, "", "", "name", true).Count);
        Measure("recipes_category_and_sort", count / 2, () => CatalogFilter.Recipes(recipes, "", "main", "name", true).Count);
        Measure("recipes_search", 1, () => CatalogFilter.Recipes(recipes, "Recipe 00042", "", "name", true).Count);
        Measure("ingredients_search", 1, () => CatalogFilter.Ingredients(ingredients, "Ingredient 00042").Count);

        var path = Path.Combine(Path.GetDirectoryName(Path.GetFullPath(databaseResultsPath))!, "catalog.json");
        Directory.CreateDirectory(Path.GetDirectoryName(path)!);
        await File.WriteAllTextAsync(path, JsonSerializer.Serialize(new
        {
            schemaVersion = 1,
            scope = "Generated in-memory catalog filtering and sorting; excludes database loading, UI rendering and input latency",
            dataset = new { recipes = count, ingredients = count },
            measurements
        }, new JsonSerializerOptions { WriteIndented = true }));
    }
}
