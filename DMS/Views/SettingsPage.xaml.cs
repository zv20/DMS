using L = DMS.Services.Localization;
using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using DMS.Models;
using DMS.Services;
using System.Diagnostics;
using System.IO;

namespace DMS.Views;

public sealed partial class SettingsPage : Page
{
    private readonly SettingsService _settingsService;
    private readonly DatabaseService _databaseService;
    private bool _suppressSettingChanges = true;
    private string _selectedTheme = "default";
    private string _selectedAccent = "blue";
    private bool _selectedWeekend;
    private DiagnosticLogFilter _logFilter = DiagnosticLogFilter.All;
    private int _cardColumns;

    public SettingsPage()
    {
        this.InitializeComponent();
        _settingsService = App.Services.GetRequiredService<SettingsService>();
        _databaseService = App.Services.GetRequiredService<DatabaseService>();
        AppVersionText.Text = $"v{AppVersion.Current}";
        ClassicAccentHint.Text = L.Get("ThemeClassicAccentHint");
        SettingsScrollViewer.SizeChanged += (_, args) => ArrangeCards(args.NewSize.Width);
        Loaded += SettingsPage_Loaded;
    }

    private void ArrangeCards(double width)
    {
        // Leave room for the outer padding and keep each card readable in both languages.
        var available = Math.Max(0, width - 48);
        var columns = available >= 1200 ? 3 : available >= 780 ? 2 : 1;
        if (_cardColumns == columns) return;
        _cardColumns = columns;
        var cards = new[] { LanguageCard, AppearanceCard, PlanningCard, DataCard, DatabaseCard, LogsCard, AboutCard };
        SettingsCards.ColumnDefinitions.Clear();
        SettingsCards.RowDefinitions.Clear();
        for (var i = 0; i < columns; i++)
            SettingsCards.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
        for (var i = 0; i < (cards.Length + columns - 1) / columns; i++)
            SettingsCards.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });
        for (var i = 0; i < cards.Length; i++)
        {
            Grid.SetColumn(cards[i], i % columns);
            Grid.SetRow(cards[i], i / columns);
        }
    }

    private async void SettingsPage_Loaded(object sender, RoutedEventArgs e)
    {
        ArrangeCards(SettingsScrollViewer.ActualWidth);
        try { await LoadSettingsAsync(); }
        catch (Exception ex)
        {
            App.Logger.LogError(ex, "Could not load settings");
            DatabaseInfoText.Text = L.Get("LogViewerSettingsLoadFailed");
            LanguageComboBox.IsEnabled = ThemeComboBox.IsEnabled = AccentColorComboBox.IsEnabled = WeekendPlanningToggle.IsEnabled = false;
        }
        RefreshLogViewer();
    }

    private void RefreshLogViewer()
    {
        try
        {
            var text = App.LogStore.ReadRecent(filter: _logFilter);
            LogViewerText.Text = string.IsNullOrWhiteSpace(text) ? L.Get("LogViewerEmpty") : text;
            LogViewerStatus.Text = App.LogStore.LastWriteFailure == null ? "" : L.Format("LogViewerUnavailable", App.LogStore.LastWriteFailure);
        }
        catch (Exception ex)
        {
            App.Logger.LogError(ex, "Could not read local diagnostic log");
            LogViewerStatus.Text = L.Format("LogViewerUnavailable", ex.Message);
        }
    }

    private void LogViewerRefresh_Click(object sender, RoutedEventArgs e) => RefreshLogViewer();

    private void LogViewerFilter_SelectionChanged(object sender, SelectionChangedEventArgs e)
    {
        var value = (LogViewerFilterComboBox.SelectedItem as ComboBoxItem)?.Tag?.ToString();
        _logFilter = Enum.TryParse<DiagnosticLogFilter>(value, out var filter) ? filter : DiagnosticLogFilter.All;
        RefreshLogViewer();
    }

    private async void LogViewerClear_Click(object sender, RoutedEventArgs e)
    {
        try
        {
            var result = await new ContentDialog
            {
                XamlRoot = XamlRoot,
                Title = L.Get("LogViewerClearTitle"),
                Content = L.Get("LogViewerClearConfirmation"),
                PrimaryButtonText = L.Get("LogViewerClearAction"),
                CloseButtonText = L.Get("Text_Cancel_77dfd2"),
                DefaultButton = ContentDialogButton.Close
            }.ShowAsync();
            if (result != ContentDialogResult.Primary) return;
            App.LogStore.Clear();
            RefreshLogViewer();
        }
        catch (Exception ex)
        {
            App.Logger.LogError(ex, "Could not clear local diagnostic logs");
            LogViewerStatus.Text = L.Format("LogViewerUnavailable", ex.Message);
        }
    }

    private void LogViewerFolder_Click(object sender, RoutedEventArgs e)
    {
        try
        {
            Directory.CreateDirectory(App.LogStore.DirectoryPath);
            Process.Start(new ProcessStartInfo("explorer.exe", $"\"{App.LogStore.DirectoryPath}\"") { UseShellExecute = true });
        }
        catch (Exception ex)
        {
            App.Logger.LogError(ex, "Could not open local diagnostic log folder");
            LogViewerStatus.Text = L.Format("LogViewerUnavailable", ex.Message);
        }
    }

    private async Task LoadSettingsAsync()
    {
        _suppressSettingChanges = true;
        try
        {
            // Language
            var language = _settingsService.GetLanguage();
            LanguageComboBox.SelectedItem = LanguageComboBox.Items.Cast<ComboBoxItem>().FirstOrDefault(i => i.Tag?.ToString() == language) ?? LanguageComboBox.Items[0];

            // Theme (stored in settings)
            var settings = await _databaseService.GetSettingsAsync() ?? new AppSettings();
            _selectedTheme = settings.Theme;
            _selectedAccent = settings.AccentColor;
            _selectedWeekend = settings.WeekendPlanningEnabled;
            ThemeComboBox.SelectedItem = ThemeComboBox.Items.Cast<ComboBoxItem>().FirstOrDefault(i => i.Tag?.ToString() == settings.Theme) ?? ThemeComboBox.Items[0];
            AccentColorComboBox.SelectedItem = AccentColorComboBox.Items.Cast<ComboBoxItem>().FirstOrDefault(i => i.Tag?.ToString() == settings.AccentColor) ?? AccentColorComboBox.Items[0];
            UpdateAccentAvailability(settings.Theme);
            WeekendPlanningToggle.IsOn = settings.WeekendPlanningEnabled;

            // Data folder
            var dbPath = _databaseService.GetDatabasePath();
            DataFolderText.Text = dbPath;

            // Database info
            var dbInfo = new FileInfo(dbPath);
            DatabaseInfoText.Text = L.Format("DatabaseInfo", dbPath, FormatFileSize(dbInfo.Length), dbInfo.LastWriteTime);
        }
        finally
        {
            _suppressSettingChanges = false;
        }
    }

    private async void LanguageComboBox_SelectionChanged(object sender, SelectionChangedEventArgs e)
    {
        if (_suppressSettingChanges) return;
        if (LanguageComboBox.SelectedItem is ComboBoxItem item && item.Tag is string lang)
        {
            var previousLanguage = _settingsService.GetLanguage();
            if (lang == previousLanguage) return;
            LanguageComboBox.IsEnabled = false;
            var saved = false;
            try
            {
                var dialog = new ContentDialog
                {
                    XamlRoot = XamlRoot,
                    Title = L.Get("LanguageReloadTitle"),
                    Content = L.Get("LanguageReloadMessage"),
                    PrimaryButtonText = L.Get("LanguageReloadConfirm"),
                    CloseButtonText = L.Get("Text_Cancel_77dfd2"),
                    DefaultButton = ContentDialogButton.Close
                };
                if (await dialog.ShowAsync() != ContentDialogResult.Primary)
                {
                    RestoreLanguageSelection(previousLanguage);
                    return;
                }
                await _settingsService.SetLanguageAsync(lang);
                saved = true;
                Localization.Apply(lang);
                App.ReloadLanguage();
            }
            catch (Exception ex)
            {
                App.Logger.LogError(ex, "Could not change the application language");
                var rollbackFailed = false;
                if (saved)
                {
                    try { await _settingsService.SetLanguageAsync(previousLanguage); Localization.Apply(previousLanguage); }
                    catch (Exception rollbackError) { rollbackFailed = true; App.Logger.LogError(rollbackError, "Unable to restore the previous language"); }
                }
                RestoreLanguageSelection(_settingsService.GetLanguage());
                LanguageStatus.Text = L.Get(rollbackFailed ? "LogViewerSavedApplyFailed" : "DataSaveFailed");
            }
            finally { LanguageComboBox.IsEnabled = true; }
        }
    }

    private void RestoreLanguageSelection(string language)
    {
        _suppressSettingChanges = true;
        try { LanguageComboBox.SelectedItem = LanguageComboBox.Items.Cast<ComboBoxItem>().FirstOrDefault(i => i.Tag?.ToString() == language); }
        finally { _suppressSettingChanges = false; }
    }

    private async void ThemeComboBox_SelectionChanged(object sender, SelectionChangedEventArgs e)
    {
        if (_suppressSettingChanges) return;
        if (ThemeComboBox.SelectedItem is ComboBoxItem item && item.Tag is string theme)
        {
            ThemeComboBox.IsEnabled = AccentColorComboBox.IsEnabled = false;
            var saved = false;
            try
            {
                var settings = await _databaseService.GetSettingsAsync() ?? new AppSettings();
                settings.Theme = theme;
                await _databaseService.SaveSettingsAsync(settings);
                saved = true;
                _selectedTheme = theme;
                AppearanceService.ApplyTheme(App.CurrentWindow, theme, settings.AccentColor);
                AppearanceStatus.Text = "";
            }
            catch (Exception ex)
            {
                App.Logger.LogError(ex, saved ? "Theme was saved but could not be applied" : "Could not save theme");
                if (!saved)
                {
                    _suppressSettingChanges = true;
                    try { ThemeComboBox.SelectedItem = ThemeComboBox.Items.Cast<ComboBoxItem>().FirstOrDefault(i => i.Tag?.ToString() == _selectedTheme) ?? ThemeComboBox.Items[0]; }
                    finally { _suppressSettingChanges = false; }
                }
                AppearanceStatus.Text = saved ? L.Get("LogViewerSavedApplyFailed") : L.Get("DataSaveFailed");
            }
            finally { ThemeComboBox.IsEnabled = true; UpdateAccentAvailability((ThemeComboBox.SelectedItem as ComboBoxItem)?.Tag?.ToString()); }
        }
    }

    private void UpdateAccentAvailability(string? theme)
    {
        var classic = theme == "default";
        AccentColorComboBox.IsEnabled = !classic;
        ClassicAccentHint.Visibility = classic ? Visibility.Visible : Visibility.Collapsed;
    }

    private async void AccentColorComboBox_SelectionChanged(object sender, SelectionChangedEventArgs e)
    {
        if (_suppressSettingChanges) return;
        if (AccentColorComboBox.SelectedItem is ComboBoxItem item && item.Tag is string accent)
        {
            ThemeComboBox.IsEnabled = AccentColorComboBox.IsEnabled = false;
            var saved = false;
            try
            {
                var settings = await _databaseService.GetSettingsAsync() ?? new AppSettings();
                settings.AccentColor = accent;
                await _databaseService.SaveSettingsAsync(settings);
                saved = true;
                _selectedAccent = accent;
                AppearanceService.ApplyAccent(accent);
                AppearanceStatus.Text = "";
            }
            catch (Exception ex)
            {
                App.Logger.LogError(ex, saved ? "Accent was saved but could not be applied" : "Could not save accent color");
                if (!saved)
                {
                    _suppressSettingChanges = true;
                    try { AccentColorComboBox.SelectedItem = AccentColorComboBox.Items.Cast<ComboBoxItem>().FirstOrDefault(i => i.Tag?.ToString() == _selectedAccent) ?? AccentColorComboBox.Items[0]; }
                    finally { _suppressSettingChanges = false; }
                }
                AppearanceStatus.Text = saved ? L.Get("LogViewerSavedApplyFailed") : L.Get("DataSaveFailed");
            }
            finally { ThemeComboBox.IsEnabled = true; UpdateAccentAvailability((ThemeComboBox.SelectedItem as ComboBoxItem)?.Tag?.ToString()); }
        }
    }

    private async void WeekendPlanningToggle_Toggled(object sender, RoutedEventArgs e)
    {
        if (_suppressSettingChanges) return;
        WeekendPlanningToggle.IsEnabled = false;
        try
        {
            var settings = await _databaseService.GetSettingsAsync() ?? new AppSettings();
            settings.WeekendPlanningEnabled = WeekendPlanningToggle.IsOn;
            await _databaseService.SaveSettingsAsync(settings);
            _selectedWeekend = settings.WeekendPlanningEnabled;
            PlanningStatus.Text = "";
        }
        catch (Exception ex)
        {
            App.Logger.LogError(ex, "Could not save weekend planning setting");
            _suppressSettingChanges = true;
            try { WeekendPlanningToggle.IsOn = _selectedWeekend; }
            finally { _suppressSettingChanges = false; }
            PlanningStatus.Text = L.Get("DataSaveFailed");
        }
        finally { WeekendPlanningToggle.IsEnabled = true; }
    }

    private async void BackupButton_Click(object sender, RoutedEventArgs e)
    {
        if (!BackupButton.IsEnabled) return;
        BackupButton.IsEnabled = RestoreButton.IsEnabled = false;
        DataStatus.Text = "";
        var saved = false;
        try
        {
            var picker = new Windows.Storage.Pickers.FileSavePicker
            {
                SuggestedStartLocation = Windows.Storage.Pickers.PickerLocationId.DocumentsLibrary,
                FileTypeChoices = { { "SQLite Database", new[] { ".db" } } },
                SuggestedFileName = $"DMS_Backup_{DateTime.Now:yyyyMMdd_HHmmss}"
            };
            WinRT.Interop.InitializeWithWindow.Initialize(picker, WinRT.Interop.WindowNative.GetWindowHandle(App.CurrentWindow));
            var file = await picker.PickSaveFileAsync();
            if (file == null) return;
            await _databaseService.CreateBackupAsync(file.Path);
            saved = true;
            DataStatus.Text = L.Get("Text_Database_backup_created_successfully_2b90d0");
            await new ContentDialog { Title = L.Get("Text_Backup_Complete_8b1525"), Content = DataStatus.Text,
                CloseButtonText = L.Get("Text_OK_9ce3bd"), XamlRoot = XamlRoot }.ShowAsync();
        }
        catch (Exception ex)
        {
            App.Logger.LogError(ex, saved ? "Backup was created, but its confirmation could not be displayed" : "Could not create database backup");
            DataStatus.Text = L.Get(saved ? "Text_Database_backup_created_successfully_2b90d0" : "LogViewerBackupFailed");
        }
        finally { BackupButton.IsEnabled = RestoreButton.IsEnabled = true; }
    }

    private async void RestoreButton_Click(object sender, RoutedEventArgs e)
    {
        if (!RestoreButton.IsEnabled) return;
        BackupButton.IsEnabled = RestoreButton.IsEnabled = false;
        DataStatus.Text = "";
        var restored = false;
        try
        {
            var picker = new Windows.Storage.Pickers.FileOpenPicker
            {
                SuggestedStartLocation = Windows.Storage.Pickers.PickerLocationId.DocumentsLibrary,
                FileTypeFilter = { ".db" }
            };
            WinRT.Interop.InitializeWithWindow.Initialize(picker, WinRT.Interop.WindowNative.GetWindowHandle(App.CurrentWindow));
            var file = await picker.PickSingleFileAsync();
            if (file == null) return;
            var confirm = new ContentDialog { Title = L.Get("Text_Restore_Database_04f0a6"), Content = L.Get("RestoreWarning"),
                PrimaryButtonText = L.Get("Text_Restore_3cbe6d"), CloseButtonText = L.Get("Text_Cancel_77dfd2"),
                DefaultButton = ContentDialogButton.Close, XamlRoot = XamlRoot };
            if (await confirm.ShowAsync() != ContentDialogResult.Primary) return;
            await App.RestoreAndReloadAsync(file.Path);
            restored = true;
            return;
        }
        catch (Exception ex)
        {
            App.Logger.LogError(ex, restored ? "Database was restored, but its confirmation could not be displayed" : "Could not restore database backup");
            if (!restored && (ex is DatabaseRecoveryRequiredException || ex.InnerException is AggregateException))
            {
                // The service could not recover automatically. Do not let the
                // user continue writing to an uncertain database in this process.
                try
                {
                    var instructions = ex is DatabaseRecoveryRequiredException recovery ? RecoveryGuidance.Format(recovery, L.Language) : ex.Message;
                    var details = new TextBox { Text = L.Format("LogViewerRecoveryFatalMessage", instructions), IsReadOnly = true,
                        AcceptsReturn = true, TextWrapping = TextWrapping.Wrap, MaxHeight = 300 };
                    await new ContentDialog { Title = L.Get("LogViewerRecoveryFatalTitle"), Content = details,
                        PrimaryButtonText = L.Get("LogViewerCloseApp"), DefaultButton = ContentDialogButton.Primary, XamlRoot = XamlRoot }.ShowAsync();
                }
                finally { App.CurrentWindow.Close(); }
                return;
            }
            DataStatus.Text = L.Get(restored ? "Text_Database_restored_successfully_Reopen_any_active_pages__48a860" : "LogViewerRestoreFailed");
        }
        finally { BackupButton.IsEnabled = RestoreButton.IsEnabled = true; }
    }

    private void OpenDataFolderButton_Click(object sender, RoutedEventArgs e)
    {
        try
        {
            var folder = Path.GetDirectoryName(_databaseService.GetDatabasePath());
            if (string.IsNullOrEmpty(folder) || !Directory.Exists(folder)) throw new DirectoryNotFoundException("The data folder does not exist.");
            Process.Start(new ProcessStartInfo("explorer.exe", $"\"{folder}\"") { UseShellExecute = true });
        }
        catch (Exception ex)
        {
            App.Logger.LogError(ex, "Could not open the data folder");
            DataStatus.Text = L.Get("LogViewerFolderFailed");
        }
    }

    private async void VacuumButton_Click(object sender, RoutedEventArgs e)
    {
        if (!VacuumButton.IsEnabled) return;
        VacuumButton.IsEnabled = ReindexButton.IsEnabled = false;
        DatabaseStatus.Text = "";
        var completed = false;
        try
        {
            var confirmation = new ContentDialog { Title = L.Get("Text_Vacuum_Database_0a823e"),
                Content = L.Get("Text_This_will_optimize_the_database_file_size_Continue_db86eb"),
                PrimaryButtonText = L.Get("Text_Vacuum_5fe15d"), CloseButtonText = L.Get("Text_Cancel_77dfd2"),
                DefaultButton = ContentDialogButton.Close, XamlRoot = XamlRoot };
            if (await confirmation.ShowAsync() != ContentDialogResult.Primary) return;
            await _databaseService.VacuumAsync();
            completed = true;
            DatabaseStatus.Text = L.Get("Text_Database_optimized_successfully_4e0a52");
            await new ContentDialog { Title = L.Get("Text_Vacuum_Complete_43b708"), Content = DatabaseStatus.Text,
                CloseButtonText = L.Get("Text_OK_9ce3bd"), XamlRoot = XamlRoot }.ShowAsync();
        }
        catch (Exception ex)
        {
            App.Logger.LogError(ex, completed ? "Database vacuum completed, but its confirmation failed" : "Database vacuum failed");
            DatabaseStatus.Text = L.Get(completed ? "Text_Database_optimized_successfully_4e0a52" : "LogViewerMaintenanceFailed");
        }
        finally { VacuumButton.IsEnabled = ReindexButton.IsEnabled = true; }
    }

    private async void ReindexButton_Click(object sender, RoutedEventArgs e)
    {
        if (!ReindexButton.IsEnabled) return;
        VacuumButton.IsEnabled = ReindexButton.IsEnabled = false;
        DatabaseStatus.Text = "";
        var completed = false;
        try
        {
            await _databaseService.ReindexAsync();
            completed = true;
            DatabaseStatus.Text = L.Get("Text_Database_indexes_rebuilt_1fdc67");
            await new ContentDialog { Title = L.Get("Text_Reindex_Complete_6eb4e1"), Content = DatabaseStatus.Text,
                CloseButtonText = L.Get("Text_OK_9ce3bd"), XamlRoot = XamlRoot }.ShowAsync();
        }
        catch (Exception ex)
        {
            App.Logger.LogError(ex, completed ? "Database reindex completed, but its confirmation failed" : "Database reindex failed");
            DatabaseStatus.Text = L.Get(completed ? "Text_Database_indexes_rebuilt_1fdc67" : "LogViewerMaintenanceFailed");
        }
        finally { VacuumButton.IsEnabled = ReindexButton.IsEnabled = true; }
    }

    private static string FormatFileSize(long bytes)
    {
        string[] units = { "B", "KB", "MB", "GB" };
        int unit = 0;
        double size = bytes;
        while (size >= 1024 && unit < units.Length - 1)
        {
            size /= 1024;
            unit++;
        }
        return $"{size:0.##} {units[unit]}";
    }
}
