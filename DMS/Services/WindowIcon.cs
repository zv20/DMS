using Microsoft.UI.Xaml;
using Microsoft.Extensions.Logging;
using System.IO;

namespace DMS.Services;

public static class WindowIcon
{
    public static void Apply(Window window)
    {
        try
        {
            window.AppWindow.SetIcon(Path.Combine(AppContext.BaseDirectory, "Assets", "app.ico"));
        }
        catch (Exception ex)
        {
            // An unavailable icon must never prevent the app from starting.
            App.Logger.LogWarning(ex, "Unable to set the window icon");
        }
    }
}
