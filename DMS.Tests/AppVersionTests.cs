using DMS.Services;
using Xunit;

namespace DMS.Tests;

public sealed class AppVersionTests
{
    [Fact]
    public void CurrentUsesTheApplicationAssemblyVersion()
    {
        var version = typeof(AppVersion).Assembly.GetName().Version!;
        Assert.Equal($"{version.Major}.{version.Minor}.{version.Build}", AppVersion.Current);
    }
}
