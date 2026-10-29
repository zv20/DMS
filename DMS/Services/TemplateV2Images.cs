using DMS.Models;
using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Media;
using Microsoft.UI.Xaml.Media.Imaging;
using Windows.Storage.Streams;

namespace DMS.Services;

/// <summary>Shared decorative-image layout and decoding for the native V2 page.</summary>
public static class TemplateV2Images
{
    private const double Margin = 40;
    private const double Gap = 8;
    private const double MinTextWidth = 200;
    public readonly record struct Insets(double Left, double Right, bool Overflowed);
    public sealed record ImageLayer(Canvas Layer, Task ImagesReady);

    /// <summary>
    /// Reserve full-height edge gutters for art. This is intentionally conservative:
    /// text cannot overlap reserved art, even when weekdays resize between weeks.
    /// Invalid or impossible geometry is reported rather than quietly hiding text.
    /// </summary>
    public static Insets GetInsets(IEnumerable<TemplateV2Image>? images)
    {
        var left = 0d; var right = 0d; var invalid = false;
        foreach (var image in images ?? [])
        {
            if (image == null || !ValidGeometry(image)) { invalid = true; continue; }
            if (!image.ReserveTextSpace) continue;
            var rightEdge = image.X + image.Width;
            if (rightEdge <= Margin || image.X >= TemplateV2Layout.PageWidth - Margin) continue;
            if (image.X + image.Width / 2 <= TemplateV2Layout.PageWidth / 2)
                left = Math.Max(left, Math.Max(0, rightEdge - Margin + Gap));
            else
                right = Math.Max(right, Math.Max(0, TemplateV2Layout.PageWidth - Margin - image.X + Gap));
        }
        return new Insets(left, right, invalid || TemplateV2Layout.PageWidth - 2 * Margin - left - right < MinTextWidth);
    }

    public static bool ValidGeometry(TemplateV2Image image) =>
        double.IsFinite(image.X) && double.IsFinite(image.Y) && double.IsFinite(image.Width) && double.IsFinite(image.Height) &&
        image.X >= 0 && image.Y >= 0 && image.Width > 0 && image.Height > 0 &&
        image.X + image.Width <= TemplateV2Layout.PageWidth && image.Y + image.Height <= TemplateV2Layout.PageHeight;

    public static ImageLayer CreateLayer(IEnumerable<TemplateV2Image>? images)
    {
        var canvas = new Canvas { Width = TemplateV2Layout.PageWidth, Height = TemplateV2Layout.PageHeight, IsHitTestVisible = false };
        var loads = new List<Task>();
        foreach (var item in images ?? [])
        {
            if (item == null || !ValidGeometry(item)) continue;
            var picture = new Image { Width = item.Width, Height = item.Height, Stretch = Stretch.Uniform,
                Opacity = double.IsFinite(item.Opacity) ? Math.Clamp(item.Opacity, 0, 1) : 1 };
            Microsoft.UI.Xaml.Automation.AutomationProperties.SetName(picture, item.AltText ?? "");
            Canvas.SetLeft(picture, item.X); Canvas.SetTop(picture, item.Y);
            canvas.Children.Add(picture);
            loads.Add(LoadImageAsync(picture, item.DataUri));
        }
        return new ImageLayer(canvas, Task.WhenAll(loads));
    }

    private static async Task LoadImageAsync(Image target, string? dataUri)
    {
        if (string.IsNullOrEmpty(dataUri) ||
            (!dataUri.StartsWith("data:image/png;base64,", StringComparison.OrdinalIgnoreCase) &&
             !dataUri.StartsWith("data:image/jpeg;base64,", StringComparison.OrdinalIgnoreCase)))
            throw new InvalidOperationException("Unsupported or missing decorative image.");
        if (dataUri.Length > 6_000_000) throw new InvalidOperationException("Decorative image is too large.");
        try
        {
            var bytes = Convert.FromBase64String(dataUri[(dataUri.IndexOf(',') + 1)..]);
            if (bytes.Length > 4 * 1024 * 1024) throw new InvalidOperationException("Decorative image is too large.");
            using var stream = new InMemoryRandomAccessStream();
            using var writer = new DataWriter(stream.GetOutputStreamAt(0));
            writer.WriteBytes(bytes); await writer.StoreAsync(); await writer.FlushAsync(); stream.Seek(0);
            var bitmap = new BitmapImage(); await bitmap.SetSourceAsync(stream); target.Source = bitmap;
        }
        catch (FormatException ex) { throw new InvalidOperationException("Invalid decorative image.", ex); }
    }
}
