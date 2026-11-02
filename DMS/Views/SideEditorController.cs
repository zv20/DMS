using DMS.Services;
using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.Extensions.Logging;

namespace DMS.Views;

public interface IUnsavedEditor
{
    Task<bool> CanLeaveAsync();
}

internal sealed class SideEditorController
{
    private readonly Page _page;
    private readonly ColumnDefinition _column;
    private readonly Border _panel;
    private readonly TextBlock _title, _status;
    private readonly Button _save, _cancel, _close;
    private readonly StackPanel _content;
    private bool _dirty, _opening, _saving, _confirming;
    private Func<Task<bool>>? _saveAction;
    public int? EditingId { get; private set; }

    public SideEditorController(Page page, ColumnDefinition column, Border panel, TextBlock title, TextBlock status,
        StackPanel content, Button save, Button cancel, Button close)
    {
        (_page, _column, _panel, _title, _status, _content, _save, _cancel, _close) = (page, column, panel, title, status, content, save, cancel, close);
        _save.Content = Localization.Get("Text_Save_efc007");
        _cancel.Content = Localization.Get("Text_Cancel_77dfd2");
        ToolTipService.SetToolTip(_close, Localization.Get("SideEditorClose"));
        _save.Click += Save_Click;
        _cancel.Click += Close_Click;
        _close.Click += Close_Click;
        _page.SizeChanged += (_, _) => { if (_panel.Visibility == Visibility.Visible) Resize(); };
    }

    public async Task OpenAsync(Func<Task> build)
    {
        if (_opening || _saving || _confirming) return;
        _opening = true;
        try
        {
            if (!await ConfirmDiscardAsync()) return;
            await build();
        }
        catch (Exception ex)
        {
            App.Logger.LogError(ex, "Failed to open side editor on {Page}", _page.GetType().Name);
            _status.Text = Localization.Get("DataEditorOpenFailed");
            Resize();
            _panel.Visibility = Visibility.Visible;
        }
        finally { _opening = false; }
    }

    public void Present(string title, int? id, Func<Task<bool>> saveAction)
    {
        _title.Text = title;
        _status.Text = "";
        EditingId = id;
        _saveAction = saveAction;
        _dirty = false;
        Resize();
        _panel.Visibility = Visibility.Visible;
    }

    public void MarkDirty() => _dirty = true;
    public void SetError(string message) => _status.Text = message;
    private void Resize()
    {
        // A side pane is useful on desktop. On a narrow window it becomes a full-page
        // editor so neither the form nor the list is squeezed into an unusable width.
        var width = _page.ActualWidth;
        _column.Width = new GridLength(width < 720
            ? width
            : Math.Min(420, Math.Max(220, width * 0.55)));
    }

    public void Close()
    {
        _panel.Visibility = Visibility.Collapsed;
        _column.Width = new GridLength(0);
        _content.Children.Clear();
        EditingId = null;
        _saveAction = null;
        _dirty = false;
    }

    public async Task<bool> CanLeaveAsync() => !_opening && !_saving && !_confirming && await ConfirmDiscardAsync();

    private async Task<bool> ConfirmDiscardAsync()
    {
        if (!_dirty) return true;
        if (_confirming) return false;
        _confirming = true;
        try
        {
            var dialog = new ContentDialog { XamlRoot = _page.XamlRoot, Title = Localization.Get("RecipeDiscardTitle"),
                Content = Localization.Get("SideEditorDiscardMessage"), PrimaryButtonText = Localization.Get("RecipeDiscardButton"),
                CloseButtonText = Localization.Get("Text_Cancel_77dfd2"), DefaultButton = ContentDialogButton.Close };
            return await dialog.ShowAsync() == ContentDialogResult.Primary;
        }
        finally { _confirming = false; }
    }

    private async void Close_Click(object sender, RoutedEventArgs e)
    {
        try { if (await CanLeaveAsync()) Close(); }
        catch (Exception ex)
        {
            App.Logger.LogError(ex, "Failed to close side editor on {Page}", _page.GetType().Name);
            _status.Text = Localization.Get("DataDialogFailed");
        }
    }

    private async void Save_Click(object sender, RoutedEventArgs e)
    {
        if (_saving || _opening || _confirming || _saveAction == null) return;
        _saving = true;
        _save.IsEnabled = _cancel.IsEnabled = _close.IsEnabled = false;
        try { if (await _saveAction()) Close(); }
        catch (Exception ex)
        {
            App.Logger.LogError(ex, "Failed to save side editor on {Page}", _page.GetType().Name);
            _status.Text = Localization.Get("DataSaveFailed");
        }
        finally { _save.IsEnabled = _cancel.IsEnabled = _close.IsEnabled = true; _saving = false; }
    }
}
