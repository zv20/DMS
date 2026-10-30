using System.IO;

namespace DMS.Services;

/// <summary>One-time choices written by the installer for the next app launch.</summary>
public sealed record InstallerRequest(string? Language, string? Backup)
{
    public static InstallerRequest Read(string path)
    {
        string? language = null, backup = null;
        var inSetup = false;
        foreach (var raw in File.ReadAllLines(path))
        {
            var line = raw.Trim();
            if (line.StartsWith('[') && line.EndsWith(']')) { inSetup = line.Equals("[Setup]", StringComparison.OrdinalIgnoreCase); continue; }
            if (!inSetup) continue;
            var separator = line.IndexOf('=');
            if (separator < 0) continue;
            var key = line[..separator].Trim();
            var value = line[(separator + 1)..].Trim();
            if (key.Equals("Language", StringComparison.OrdinalIgnoreCase) && value is "en" or "bg") language = value;
            if (key.Equals("Backup", StringComparison.OrdinalIgnoreCase) && value.Length > 0) backup = value;
        }
        return new InstallerRequest(language, backup);
    }
}
