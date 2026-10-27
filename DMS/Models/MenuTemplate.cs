namespace DMS.Models;

public sealed class MenuTemplate
{
    public string Name { get; set; } = string.Empty;
    public bool IsPreset { get; set; }
    public string HeaderText { get; set; } = "Weekly Menu";
    public string FooterText { get; set; } = "Prepared with care by DMS";
    public string BackgroundColor { get; set; } = "#FFFFFF";
    public string TemplateStyle { get; set; } = "compact";
    public string FontFamily { get; set; } = "Arial";
    public double HeaderFontSize { get; set; } = 24;
    public double MealFontSize { get; set; } = 11;
    public double FooterFontSize { get; set; } = 9;
    public string HeaderColor { get; set; } = "#D2691E";
    public string HeaderAlignment { get; set; } = "center";
    public bool HeaderBold { get; set; } = true;
    public bool HeaderItalic { get; set; }
    public bool HeaderUnderline { get; set; }
    public string FooterAlignment { get; set; } = "center";
    public bool ShowHeader { get; set; } = true;
    public bool ShowFooter { get; set; } = true;
    public bool ShowDateRange { get; set; } = true;
    public bool ShowIngredients { get; set; } = true;
    public bool ShowCalories { get; set; } = true;
    public bool ShowPortions { get; set; } = true;
    // Embedded bytes keep user-selected images portable in JSON exports and backups.
    public string? BackgroundImageDataUri { get; set; }
    public double BackgroundImageOpacity { get; set; } = 1;
    public bool NativeStyleInitialized { get; set; }
    // Keys identify a weekday and slot, so formatting follows the template across weeks.
    public Dictionary<string, TemplateTextStyle> TextStyles { get; set; } = new();
    // Retains an imported browser template intact while its richer layer model
    // is being ported to native WinUI controls.
    public string? LegacyDataJson { get; set; }
}

public sealed class TemplateTextStyle
{
    public string FontFamily { get; set; } = "Arial";
    public double FontSize { get; set; } = 11;
    public string Color { get; set; } = "#000000";
    public bool Bold { get; set; }
    public bool Italic { get; set; }
    public bool Underline { get; set; }
}
