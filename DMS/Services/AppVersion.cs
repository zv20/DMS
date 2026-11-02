using System.Reflection;

namespace DMS.Services;

/// <summary>Application version derived from the assembly built by DMS.csproj.</summary>
public static class AppVersion
{
    public static string Current
    {
        get
        {
            var version = typeof(AppVersion).Assembly.GetName().Version;
            return version == null ? "0.0.0" : $"{version.Major}.{version.Minor}.{version.Build}";
        }
    }
}
