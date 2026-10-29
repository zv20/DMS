using DMS.Services;
using Xunit;

namespace DMS.Tests;

public sealed class ResponsiveLayoutTests
{
    [Theory]
    [InlineData(390, 5, false, 1)]
    [InlineData(800, 5, false, 3)]
    [InlineData(1300, 5, false, 5)]
    [InlineData(800, 7, true, 4)]
    [InlineData(1600, 7, true, 7)]
    [InlineData(10, 7, true, 1)]
    public void PlannerColumnCountFitsAvailableWidth(double width, int days, bool monthly, int expected)
    {
        Assert.Equal(expected, ResponsiveLayout.PlannerColumns(width, days, monthly));
    }
}
