namespace DMS.Models;

public sealed class MenuTemplate
{
    public string Name { get; set; } = string.Empty;
    public bool IsPreset { get; set; }
    public string HeaderText { get; set; } = "Weekly Menu";
    public string FooterText { get; set; } = "Prepared with care by DMS";
    public string BackgroundColor { get; set; } = "#FFFFFF";
    // Retains an imported browser template intact while its richer layer model
    // is being ported to native WinUI controls.
    public string? LegacyDataJson { get; set; }
}
