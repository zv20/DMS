namespace DMS.Models;

public sealed class Recipe
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Category { get; set; } = "other";
    public string PortionSize { get; set; } = string.Empty;
    public int Calories { get; set; }
    public string Instructions { get; set; } = string.Empty;
    public List<string> Ingredients { get; set; } = [];
    public List<string> Allergens { get; set; } = [];
}