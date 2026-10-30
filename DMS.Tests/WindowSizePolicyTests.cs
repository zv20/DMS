using DMS.Services;
using Xunit;

namespace DMS.Tests;

public sealed class WindowSizePolicyTests
{
    [Theory]
    [InlineData(1, 16, 16, 1920, 1040, 976, 656)]
    [InlineData(1.5, 24, 24, 2560, 1400, 1464, 984)]
    [InlineData(1.25, 20, 20, 1366, 728, 1220, 728)]
    [InlineData(2, 32, 32, 1280, 720, 1280, 720)]
    [InlineData(1, 16, 16, 800, 600, 800, 600)]
    [InlineData(1, -4, -8, 1920, 1040, 960, 640)]
    public void MinimumAccountsForDpiFrameAndUsableScreen(double scale, int frameWidth, int frameHeight, int screenWidth, int screenHeight, int expectedWidth, int expectedHeight)
    {
        var result = WindowSizePolicy.MinimumSize(scale, frameWidth, frameHeight, screenWidth, screenHeight);
        Assert.Equal(expectedWidth, result.Width);
        Assert.Equal(expectedHeight, result.Height);
    }

    [Fact]
    public void MissingDisplayInformationStillProvidesAReadableMinimum()
    {
        Assert.Equal((976, 656), WindowSizePolicy.MinimumSize(double.NaN, 16, 16, 0, 0));
    }
}
