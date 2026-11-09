using DMS.Services;
using Xunit;

namespace DMS.Tests;

public class TemplatePreviewSizingTests
{
    [Fact]
    public void SmallArtworkUsesSmallerDecodeAndFullPageKeepsFullLimit()
    {
        Assert.Equal(448, TemplatePreviewSizing.ForImage(200, 200, 1600));
        Assert.Equal(1600, TemplatePreviewSizing.ForImage(794, 1123, 1600));
        Assert.Equal(0, TemplatePreviewSizing.ForImage(200, 200, 0));
    }

    [Fact]
    public void TallAndInvalidGeometryAreHandledConservatively()
    {
        Assert.Equal(1600, TemplatePreviewSizing.ForImage(10, 1123, 1600));
        Assert.Equal(1600, TemplatePreviewSizing.ForImage(double.NaN, 10, 1600));
        Assert.InRange(TemplatePreviewSizing.ForImage(5, 5, 256), 1, 256);
    }
}
