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
    public bool LayoutEnabled { get; set; }
    public Dictionary<string, TemplateLayoutElement> LayoutElements { get; set; } = new();
    public List<TemplateImageLayer> ImageLayers { get; set; } = new();
    // Retains an imported browser template intact while its richer layer model
    // is being ported to native WinUI controls.
    public string? LegacyDataJson { get; set; }
}

// Page-relative coordinates in CSS pixels on an A4 page (794 x 1123).
public sealed class TemplateLayoutElement
{
    public double X { get; set; }
    public double Y { get; set; }
    public double Width { get; set; }
    public double Height { get; set; }
    public int ZIndex { get; set; } = 10;
}

public sealed class TemplateImageLayer
{
    public string Id { get; set; } = Guid.NewGuid().ToString("N");
    public string DataUri { get; set; } = string.Empty;
    public double X { get; set; } = 250;
    public double Y { get; set; } = 100;
    public double Width { get; set; } = 200;
    public double Height { get; set; } = 150;
    public int ZIndex { get; set; } = 5;
    public double Opacity { get; set; } = 1;
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
