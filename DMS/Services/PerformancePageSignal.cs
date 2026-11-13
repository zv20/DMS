using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Media;
using Microsoft.Extensions.Logging;

namespace DMS.Services;

// Opt-in diagnostic: the signal marks the first rendering callback after the
// page has loaded and bound its items, not a guarantee that pixels are visible.
internal static class PerformancePageSignal
{
    internal static void AfterRender(Page page, string name, int count)
    {
        var path = Environment.GetEnvironmentVariable("DMS_QA_PAGE_READY_FILE");
        if (string.IsNullOrWhiteSpace(path)) return;

        EventHandler<object>? rendered = null;
        RoutedEventHandler? unloaded = null;
        void Detach()
        {
            CompositionTarget.Rendering -= rendered;
            page.Unloaded -= unloaded;
        }
        rendered = (_, _) =>
        {
            Detach();
            Write(name, count);
        };
        unloaded = (_, _) => Detach();
        page.Unloaded += unloaded;
        CompositionTarget.Rendering += rendered;
    }

    internal static void Write(string name, int count)
    {
        var path = Environment.GetEnvironmentVariable("DMS_QA_PAGE_READY_FILE");
        if (string.IsNullOrWhiteSpace(path)) return;
        try { System.IO.File.WriteAllText(path, $"{name}:{count}"); }
        catch (Exception ex) { App.Logger.LogWarning(ex, "Unable to write performance page signal"); }
    }
}
