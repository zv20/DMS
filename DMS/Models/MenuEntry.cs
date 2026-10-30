namespace DMS.Models;

public sealed class MenuEntry
{
    public int Id { get; set; }
    public DateTime Date { get; set; }
    public string Slot { get; set; } = string.Empty;
    public int RecipeId { get; set; }
}