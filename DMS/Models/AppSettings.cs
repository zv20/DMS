namespace DMS.Models;

public sealed class AppSettings
{
    public string Language { get; set; } = "bg";
    public string Theme { get; set; } = "default";
    public string? DataFolder { get; set; }
}