namespace DMS.Models;

/// <summary>Editable configuration for the constrained A4 weekly document.</summary>
public sealed class TemplateV2Document
{
    public string HeaderText { get; set; } = "Weekly Menu";
    public string FooterText { get; set; } = "";
    public double FontSize { get; set; } = 16;
    public double MinimumFontSize { get; set; } = 14;
    public double MaximumFontSize { get; set; } = 18;
    public bool AllowFontShrink { get; set; } = true;
    public bool HideEmptyDays { get; set; } = true;
    public string FontFamily { get; set; } = "Arial";
    public string HeaderColor { get; set; } = "#000000";
    public string BodyColor { get; set; } = "#000000";
    public string FooterColor { get; set; } = "#000000";
    public string BackgroundColor { get; set; } = "#FFFFFF";
    public string? BackgroundImageDataUri { get; set; }
    public double BackgroundImageOpacity { get; set; } = 1;
    // Null means automatic; an explicit value is retained rather than silently resized.
    public double?[] DayHeights { get; set; } = new double?[5];
    // Keys: header/date/footer, or heading/menu/ingredients/allergens with
    // optional :0 through :4 weekday overrides. Missing values retain V2 defaults.
    public Dictionary<string, TemplateTextStyle> TextStyles { get; set; } = new();
    public Dictionary<string, TemplateBlockAppearance> BlockAppearances { get; set; } = new();
}
