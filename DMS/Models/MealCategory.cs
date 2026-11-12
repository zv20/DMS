namespace DMS.Models;

public sealed class MealCategory
{
    public string Id { get; set; } = "";
    // An empty name keeps the translated name of a built-in category.
    public string Name { get; set; } = "";

    public static List<MealCategory> Defaults() =>
    [
        new() { Id = "soup" }, new() { Id = "main" },
        new() { Id = "dessert" }, new() { Id = "other" }
    ];
}
