namespace DMS.Models;

public sealed class MenuTemplate
{
    public TemplateDocument? Document { get; set; }
    public string Name { get; set; } = string.Empty;
    public bool IsPreset { get; set; }
}

public sealed class TemplateTextStyle
{
    public string FontFamily { get; set; } = "Arial";
    public double FontSize { get; set; } = 11;
    public string Color { get; set; } = "#000000";
    public double Opacity { get; set; } = 1;
    public bool Bold { get; set; }
    public bool Italic { get; set; }
    public bool Underline { get; set; }
    public string? Alignment { get; set; }
}

public sealed class TemplateBlockAppearance
{
    public string? BackgroundColor { get; set; }
    public string? BorderColor { get; set; }
    public double BorderOpacity { get; set; } = 1;
    public double BorderThickness { get; set; }
    public double CornerRadius { get; set; }
    public double Padding { get; set; }
    public double Opacity { get; set; } = 1;
}
