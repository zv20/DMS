using Microsoft.UI.Windowing;
using Windows.Graphics;

namespace DMS.Services;

internal static class WindowPlacement
{
    internal static void Center(AppWindow window)
    {
        var area = DisplayArea.GetFromWindowId(window.Id, DisplayAreaFallback.Primary)?.WorkArea;
        if (area == null) return;
        var workArea = area.Value;
        window.Move(new PointInt32(workArea.X + Math.Max(0, (workArea.Width - window.Size.Width) / 2), workArea.Y + Math.Max(0, (workArea.Height - window.Size.Height) / 2)));
    }

    internal static void RestoreOrCenter(AppWindow window, Models.AppSettings settings)
    {
        if (settings.WindowX is not int x || settings.WindowY is not int y || settings.WindowWidth is not int width || settings.WindowHeight is not int height)
        {
            Center(window); return;
        }
        var area = DisplayArea.GetFromPoint(new PointInt32(x + width / 2, y + height / 2), DisplayAreaFallback.Primary)?.WorkArea;
        if (area == null || width < 400 || height < 300) { Center(window); return; }
        var workArea = area.Value;
        var safeWidth = Math.Min(width, workArea.Width); var safeHeight = Math.Min(height, workArea.Height);
        window.Resize(new SizeInt32(safeWidth, safeHeight));
        window.Move(new PointInt32(Math.Clamp(x, workArea.X, workArea.X + workArea.Width - safeWidth), Math.Clamp(y, workArea.Y, workArea.Y + workArea.Height - safeHeight)));
    }
}
