namespace DMS.Models;

public sealed class Allergen
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Color { get; set; } = "#3498db";
    public string Icon { get; set; } = "⚠️";
}
