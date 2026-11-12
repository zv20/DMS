namespace DMS.Models;

public sealed class AppSettings
{
    public string Language { get; set; } = "bg";
    public string Theme { get; set; } = "light";
    public string AccentColor { get; set; } = "blue";
    public bool WeekendPlanningEnabled { get; set; }
    public int MealsPerDay { get; set; } = 4;
    public List<MealCategory> MealCategories { get; set; } = MealCategory.Defaults();
    public string? DataFolder { get; set; }
    public List<string> RecentTemplateColors { get; set; } = [];
    public int? WindowX { get; set; }
    public int? WindowY { get; set; }
    public int? WindowWidth { get; set; }
    public int? WindowHeight { get; set; }
}
