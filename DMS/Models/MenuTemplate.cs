namespace DMS.Models;

public sealed class MenuTemplate
{
    public TemplateDocument? Document { get; set; }
    public string Name { get; set; } = string.Empty;
    public bool IsPreset { get; set; }
    public string HeaderText { get; set; } = "Weekly Menu";
    public string FooterText { get; set; } = "Prepared with care by DMS";
    // Optional structured content. A null value deliberately preserves the original
    // single-string rendering used by browser imports and existing native templates.
    public TemplateRichTextContent? HeaderRichText { get; set; }
    public TemplateRichTextContent? FooterRichText { get; set; }
    public string BackgroundColor { get; set; } = "#FFFFFF";
    // Null keeps the established A4 portrait document unchanged. The native editor
    // can opt in to these settings as its page-setup controls are introduced.
    public TemplatePageSettings? PageSettings { get; set; }
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
    // Seven-day pages are an explicit template choice; old templates remain five-day.
    public bool IncludeWeekend { get; set; }
    public bool ShowIngredients { get; set; } = true;
    public bool ShowCalories { get; set; } = true;
    public bool ShowPortions { get; set; } = true;
    // Embedded bytes keep user-selected images portable in JSON exports and backups.
    public string? BackgroundImageDataUri { get; set; }
    public double BackgroundImageOpacity { get; set; } = 1;
    public bool NativeStyleInitialized { get; set; }
    // Keys identify a weekday and slot, so formatting follows the template across weeks.
    public Dictionary<string, TemplateTextStyle> TextStyles { get; set; } = new();
    // Optional visual chrome for individual canvas objects. An absent key means
    // retain the original transparent, unbordered rendering.
    public Dictionary<string, TemplateBlockAppearance> BlockAppearances { get; set; } = new();
    public bool LayoutEnabled { get; set; }
    public Dictionary<string, TemplateLayoutElement> LayoutElements { get; set; } = new();
    // Disabled by default so existing templates retain their exact saved geometry.
    // When enabled, weekday menu boxes may grow only within the configured bounds.
    public TemplateMenuBlockSizing MenuBlockSizing { get; set; } = new();
    public List<TemplateImageLayer> ImageLayers { get; set; } = new();
    // Additional template-owned text, independent of weekly menu data.
    public List<TemplateTextLayer> TextLayers { get; set; } = new();
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
    public bool IsPositionLocked { get; set; }
}

public sealed class TemplateMenuBlockSizing
{
    public bool Enabled { get; set; }
    public double MinimumHeight { get; set; } = 100;
    public double MaximumHeight { get; set; } = 165;
    // If a menu cannot fit inside MaximumHeight, output remains deterministic and
    // marks the box for the existing layout diagnostic instead of moving other objects.
    public string OverflowBehavior { get; set; } = "warn";
    // Null retains the original Enabled flag for existing saved templates.
    // Explicit modes: fixed, flexible, and shrink.
    public string? Mode { get; set; }
    public double MinimumFontScale { get; set; } = 0.85;
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
    // "fill" preserves the original renderer behaviour. Other values are
    // intentionally restricted by the renderer to contain/cover.
    public string FitMode { get; set; } = "fill";
    // This is an editor constraint; rendering uses the persisted dimensions.
    public bool LockAspectRatio { get; set; }
    public bool IsPositionLocked { get; set; }
    public double RotationDegrees { get; set; }
    public string AltText { get; set; } = string.Empty;
}

/// <summary>An optional, independently positioned text box on the template.</summary>
public sealed class TemplateTextLayer
{
    public string Id { get; set; } = Guid.NewGuid().ToString("N");
    public string Text { get; set; } = string.Empty;
    public double X { get; set; } = 40;
    public double Y { get; set; } = 200;
    public double Width { get; set; } = 300;
    public double Height { get; set; } = 60;
    public int ZIndex { get; set; } = 10;
    public bool IsPositionLocked { get; set; }
    public TemplateTextStyle Style { get; set; } = new();
}

public sealed class TemplatePageSettings
{
    // A4 is the supported printable document size in this migration. The string
    // leaves room for a future explicit page-size picker without schema churn.
    public string Size { get; set; } = "a4";
    public string Orientation { get; set; } = "portrait";
    // A non-printing editor/output guide; fixed-position content is never silently
    // moved by this value.
    public double SafeMargin { get; set; }
}

public sealed class TemplateTextStyle
{
    public string FontFamily { get; set; } = "Arial";
    public double FontSize { get; set; } = 11;
    public string Color { get; set; } = "#000000";
    public bool Bold { get; set; }
    public bool Italic { get; set; }
    public bool Underline { get; set; }
    // Null keeps the legacy alignment rules for existing saved templates.
    public string? Alignment { get; set; }
}

public sealed class TemplateBlockAppearance
{
    public string? BackgroundColor { get; set; }
    public string? BorderColor { get; set; }
    public double BorderThickness { get; set; }
    public double CornerRadius { get; set; }
    public double Padding { get; set; }
    public double Opacity { get; set; } = 1;
}

/// <summary>
/// Safe, serializable rich text for template-owned text. This is intentionally a
/// list of text runs rather than HTML: imported data cannot introduce markup,
/// scripts, links, or CSS beyond the allowed formatting fields below.
/// </summary>
public sealed class TemplateRichTextContent
{
    public List<TemplateRichTextRun> Runs { get; set; } = new();
}

public sealed class TemplateRichTextRun
{
    public string Text { get; set; } = string.Empty;
    // Null means inherit the header/footer element style.
    public string? FontFamily { get; set; }
    public double? FontSize { get; set; }
    public string? Color { get; set; }
    public bool? Bold { get; set; }
    public bool? Italic { get; set; }
    public bool? Underline { get; set; }
}
