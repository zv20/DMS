using DMS.Models;

namespace DMS.Services;

public static class TemplateImagePlacement
{
    public static void Move(TemplateImage image, double x, double y)
    {
        if (!double.IsFinite(x) || !double.IsFinite(y)) return;
        image.X = Math.Clamp(x, 0, Math.Max(0, TemplatePageLayout.PageWidth - image.Width));
        image.Y = Math.Clamp(y, 0, Math.Max(0, TemplatePageLayout.PageHeight - image.Height));
    }

    public static void Resize(TemplateImage image, double value, bool width)
    {
        if (!double.IsFinite(value) || value <= 0) return;
        var ratio = image.Width > 0 && image.Height > 0 ? image.Width / image.Height : 1;
        var w = width ? value : image.LockAspectRatio ? value * ratio : image.Width;
        var h = width ? image.LockAspectRatio ? value / ratio : image.Height : value;
        if (image.LockAspectRatio)
        {
            var scale = Math.Min(1, Math.Min(TemplatePageLayout.PageWidth / w, TemplatePageLayout.PageHeight / h));
            image.Width = Math.Max(1, w * scale);
            image.Height = Math.Max(1, h * scale);
        }
        else
        {
            image.Width = Math.Clamp(w, 1, TemplatePageLayout.PageWidth);
            image.Height = Math.Clamp(h, 1, TemplatePageLayout.PageHeight);
        }
        Move(image, image.X, image.Y);
    }
}
