using System.Diagnostics;
using System.Runtime.InteropServices;

var showDialogs = args.Length > 0 && int.TryParse(args[0], out var uiLevel) && (uiLevel & 7) >= 4 && OperatingSystem.IsWindows();
try
{
    if (Process.GetProcessesByName("DMS").Any())
        throw new InvalidOperationException("Close DMS before updating, then try again.");

    var appData = Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData);
    var documents = Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments);
    if (string.IsNullOrWhiteSpace(appData) || string.IsNullOrWhiteSpace(documents))
        throw new InvalidOperationException("Windows could not locate the DMS data or Documents folder.");
    var backup = UpgradeBackup.Create(Path.Combine(appData, "DMS", "dms.db"), Path.Combine(documents, "DMS Backups"));
    if (showDialogs && backup != null)
        MessageBox(IntPtr.Zero, $"Your pre-update backup was saved to:\n\n{backup}", "DMS backup complete", 0x40);
    return 0;
}
catch (Exception ex)
{
    if (showDialogs)
        MessageBox(IntPtr.Zero, $"DMS could not create the pre-update backup. The update was stopped.\n\n{ex.Message}", "DMS update", 0x10);
    return 1;
}

[DllImport("user32.dll", CharSet = CharSet.Unicode, EntryPoint = "MessageBoxW")]
static extern int MessageBox(IntPtr window, string text, string caption, uint type);
