namespace DMS.Services;

public static class WindowSizePolicy
{
    public const int MinimumClientWidth = 960;
    public const int MinimumClientHeight = 640;

    public static (int Width, int Height) MinimumSize(double scale, int frameWidth, int frameHeight, int workAreaWidth, int workAreaHeight)
    {
        if (!double.IsFinite(scale) || scale <= 0) scale = 1;
        return (Dimension(MinimumClientWidth, scale, frameWidth, workAreaWidth),
            Dimension(MinimumClientHeight, scale, frameHeight, workAreaHeight));
    }

    private static int Dimension(int logicalSize, double scale, int frame, int available)
    {
        var desired = Math.Ceiling(logicalSize * scale) + Math.Max(0, frame);
        return (int)Math.Clamp(desired, 1, available > 0 ? available : int.MaxValue);
    }
}
