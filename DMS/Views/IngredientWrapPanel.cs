using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Windows.Foundation;

namespace DMS.Views;

/// <summary>A small wrap panel for the recipe editor's ingredient chips.</summary>
public sealed class IngredientWrapPanel : Panel
{
    protected override Size MeasureOverride(Size availableSize)
    {
        var maxWidth = double.IsInfinity(availableSize.Width) ? double.MaxValue : availableSize.Width;
        double x = 0, y = 0, rowHeight = 0, usedWidth = 0;
        foreach (var child in Children)
        {
            child.Measure(new Size(maxWidth, double.PositiveInfinity));
            var size = child.DesiredSize;
            if (x > 0 && x + size.Width > maxWidth)
            {
                usedWidth = Math.Max(usedWidth, x);
                y += rowHeight;
                x = 0;
                rowHeight = 0;
            }
            x += size.Width;
            rowHeight = Math.Max(rowHeight, size.Height);
        }
        return new Size(Math.Max(usedWidth, x), y + rowHeight);
    }

    protected override Size ArrangeOverride(Size finalSize)
    {
        double x = 0, y = 0, rowHeight = 0;
        foreach (var child in Children)
        {
            var size = child.DesiredSize;
            if (x > 0 && x + size.Width > finalSize.Width)
            {
                y += rowHeight;
                x = 0;
                rowHeight = 0;
            }
            child.Arrange(new Rect(x, y, Math.Min(size.Width, finalSize.Width), size.Height));
            x += size.Width;
            rowHeight = Math.Max(rowHeight, size.Height);
        }
        return finalSize;
    }
}
