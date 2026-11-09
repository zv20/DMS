namespace DMS.Services;

public static class TemplatePreviewSizing
{
    // The full-page limit already accounts for the builder's maximum zoom.
    // Round to buckets so minor resizes do not create many cache variants.
    public static int ForImage(double width, double height, int pageLimit)
    {
        if (pageLimit <= 0) return 0;
        if (!double.IsFinite(width) || !double.IsFinite(height) || width <= 0 || height <= 0) return pageLimit;
        var fraction = Math.Clamp(Math.Max(width / TemplatePageLayout.PageWidth, height / TemplatePageLayout.PageHeight), 0, 1);
        var pixels = Math.Max(Math.Min(pageLimit, 96), (int)Math.Ceiling(pageLimit * fraction));
        return Math.Min(pageLimit, ((pixels + 63) / 64) * 64);
    }
}
