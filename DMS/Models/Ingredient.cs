namespace DMS.Models;

public sealed class Ingredient
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public List<string> Allergens { get; set; } = [];
}