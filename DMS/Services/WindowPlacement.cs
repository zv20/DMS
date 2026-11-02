using Microsoft.UI.Windowing;
using Windows.Graphics;

namespace DMS.Services;

internal static class WindowPlacement
{
    internal static void Center(AppWindow window)
    {
        var area = DisplayArea.GetFromWindowId(window.Id, DisplayAreaFallback.Primary)?.WorkArea;
        if (area == null) return;
        window.Move(new PointInt32(area.X + Math.Max(0, (area.Width - window.Size.Width) / 2), area.Y + Math.Max(0, (area.Height - window.Size.Height) / 2)));
    }

    internal static void RestoreOrCenter(AppWindow window, Models.AppSettings settings)
    {
        if (settings.WindowX is not int x || settings.WindowY is not int y || settings.WindowWidth is not int width || settings.WindowHeight is not int height)
        {
            Center(window); return;
        }
        var area = DisplayArea.GetFromPoint(new PointInt32(x + width / 2, y + height / 2), DisplayAreaFallback.Primary)?.WorkArea;
        if (area == null || width < 400 || height < 300) { Center(window); return; }
        var safeWidth = Math.Min(width, area.Width); var safeHeight = Math.Min(height, area.Height);
        window.Resize(new SizeInt32(safeWidth, safeHeight));
        window.Move(new PointInt32(Math.Clamp(x, area.X, area.X + area.Width - safeWidth), Math.Clamp(y, area.Y, area.Y + area.Height - safeHeight)));
    }
}
