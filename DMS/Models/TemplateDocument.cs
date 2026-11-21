namespace DMS.Models;

/// <summary>Editable configuration for the constrained A4 weekly document.</summary>
public sealed class TemplateDocument
{
    internal const string DefaultHeader = "Weekly Menu";
    internal const string PresetFooter = "Allergens are highlighted in red.";

    internal TemplateDocument WithText(string header, string footer)
    {
        var copy = (TemplateDocument)MemberwiseClone();
        copy.HeaderText = header;
        copy.FooterText = footer;
        return copy;
    }

    public string HeaderText { get; set; } = DefaultHeader;
    public bool ShowHeaderReflection { get; set; }
    public string FooterText { get; set; } = "";
    public string FooterNoticeText { get; set; } = "";
    public double FontSize { get; set; } = 16;
    public double MinimumFontSize { get; set; } = 14;
    public double MaximumFontSize { get; set; } = 18;
    public bool AllowFontShrink { get; set; } = true;
    public string DayHeadingFormat { get; set; } = "dddd, d MMMM";
    public string DateRangeFormat { get; set; } = "d";
    public bool HideEmptyDays { get; set; } = true;
    public string FontFamily { get; set; } = "Arial";
    public string HeaderColor { get; set; } = "#000000";
    public string BodyColor { get; set; } = "#000000";
    public string AllergenAccentColor { get; set; } = "#C60000";
    public double AllergenAccentOpacity { get; set; } = 1;
    public string FooterColor { get; set; } = "#000000";
    public string BackgroundColor { get; set; } = "#FFFFFF";
    public double BackgroundOpacity { get; set; } = 1;
    public string? BackgroundImageDataUri { get; set; }
    public string? BackgroundImageAssetId { get; set; }
    public double BackgroundImageOpacity { get; set; } = 1;
    public double DaySpacing { get; set; } = 1;
    public double MealLineSpacing { get; set; } = 1;
    public List<TemplateImage> DecorativeImages { get; set; } = new();
    // Null means automatic; an explicit value is retained rather than silently resized.
    public double?[] DayHeights { get; set; } = new double?[7];
    // Keys: header/date/footer, or heading/menu/ingredients with
    // optional :0 through :6 day overrides. Missing values retain defaults.
    public Dictionary<string, TemplateTextStyle> TextStyles { get; set; } = new();
    public Dictionary<string, TemplateBlockAppearance> BlockAppearances { get; set; } = new();

}
