namespace DMS.Models;

/// <summary>A decorative image positioned in page-relative A4 logical pixels.</summary>
public sealed class TemplateImage
{
    public string Id { get; set; } = Guid.NewGuid().ToString("N");
    public string DataUri { get; set; } = string.Empty;
    public double X { get; set; } = 594;
    public double Y { get; set; } = 20;
    public double Width { get; set; } = 160;
    public double Height { get; set; } = 160;
    public double Opacity { get; set; } = 1;
    // Reserve a conservative full-height gutter so text cannot be hidden by art.
    public bool ReserveTextSpace { get; set; } = true;
    public string AltText { get; set; } = string.Empty;
}
