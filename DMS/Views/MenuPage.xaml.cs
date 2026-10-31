using L = DMS.Services.Localization;
using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using DMS.Models;
using DMS.Services;

namespace DMS.Views;

public sealed partial class MenuPage : Page, IUnsavedEditor
{
    private readonly IDatabaseService _database;
    private static readonly string[] Categories = ["soup", "main", "dessert", "other"];
    private static string[] Labels => ["🥣 " + L.Category("soup"), "🍽️ " + L.Category("main"), "🍰 " + L.Category("dessert"), "➕ " + L.Category("other")];
    private DateTime _date = DateTime.Today;
    private bool _monthly = true;
    private bool _busy, _refreshPending;
    private bool _hasRenderedView, _renderedMonthly;
    private bool _confirmingDiscard;
    private int _activeSlotSaves, _pendingSlotFailures;
    private DateTime _renderedDate;
    private bool _weekendPlanningEnabled;
    private int _headerLayout = -1;

    public MenuPage()
    {
        InitializeComponent();
        _database = App.Services.GetRequiredService<IDatabaseService>();
        UpdateViewButtons();
        Loaded += async (_, _) => await RefreshAsync();
    }
    private static DateTime WeekStart(DateTime day) => day.Date.AddDays(-((7 + (int)day.DayOfWeek - 1) % 7));
    private void UpdateViewButtons()
    {
        var accent = (Style)Application.Current.Resources["AccentButtonStyle"];
        MonthlyButton.Style = _monthly ? accent : null;
        WeeklyButton.Style = _monthly ? null : accent;
        Microsoft.UI.Xaml.Automation.AutomationProperties.SetItemStatus(MonthlyButton, _monthly ? L.Get("MenuViewSelected") : "");
        Microsoft.UI.Xaml.Automation.AutomationProperties.SetItemStatus(WeeklyButton, _monthly ? "" : L.Get("MenuViewSelected"));
    }
    private async Task ChangeViewAsync(Action change)
    {
        try
        {
            if (_busy || _activeSlotSaves > 0 || !await ConfirmDiscardAsync()) return;
            change(); UpdateViewButtons(); await RefreshAsync();
        }
        catch (Exception ex)
        {
            App.Logger.LogError(ex, "Could not change the planner view");
            PeriodLabel.Text = L.Get("DataLoadFailed");
        }
    }
    private async void Monthly_Click(object sender, RoutedEventArgs e) => await ChangeViewAsync(() => _monthly = true);
    private async void Weekly_Click(object sender, RoutedEventArgs e) => await ChangeViewAsync(() => _monthly = false);
    private async void Previous_Click(object sender, RoutedEventArgs e) => await ChangeViewAsync(() => _date = _monthly ? _date.AddMonths(-1) : _date.AddDays(-7));
    private async void Next_Click(object sender, RoutedEventArgs e) => await ChangeViewAsync(() => _date = _monthly ? _date.AddMonths(1) : _date.AddDays(7));
    private async void Today_Click(object sender, RoutedEventArgs e) => await ChangeViewAsync(() => _date = DateTime.Today);

    public async Task<bool> CanLeaveAsync() => !_busy && _activeSlotSaves == 0 && await ConfirmDiscardAsync();

    private async Task<bool> ConfirmDiscardAsync()
    {
        if (_pendingSlotFailures == 0) return true;
        if (_confirmingDiscard) return false;
        _confirmingDiscard = true;
        try
        {
            var dialog = new ContentDialog { XamlRoot = XamlRoot, Title = L.Get("RecipeDiscardTitle"),
                Content = L.Get("SideEditorDiscardMessage"), PrimaryButtonText = L.Get("RecipeDiscardButton"),
                CloseButtonText = L.Get("Text_Cancel_77dfd2"), DefaultButton = ContentDialogButton.Close };
            return await dialog.ShowAsync() == ContentDialogResult.Primary;
        }
        finally { _confirmingDiscard = false; }
    }

    private void SetPlannerInteraction()
    {
        var enabled = !_busy && _activeSlotSaves == 0;
        MenuHeader.IsEnabled = enabled;
        CalendarGrid.IsEnabled = enabled;
    }

    private void MenuHeader_SizeChanged(object sender, SizeChangedEventArgs e)
    {
        var layout = e.NewSize.Width < 500 ? 2 : e.NewSize.Width < 700 ? 1 : 0;
        if (_headerLayout == layout) return;
        _headerLayout = layout;
        MenuHeader.RowDefinitions.Clear();
        if (layout > 0)
        {
            MenuHeader.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });
            MenuHeader.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });
            if (layout == 2) MenuHeader.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });
            Grid.SetColumnSpan(HeaderScroll, layout == 2 ? 3 : 1);
            Grid.SetRow(OutputButton, layout == 2 ? 2 : 0); Grid.SetColumn(OutputButton, layout == 2 ? 0 : 2);
            Grid.SetColumnSpan(OutputButton, layout == 2 ? 3 : 1);
            OutputButton.HorizontalAlignment = layout == 2 ? HorizontalAlignment.Left : HorizontalAlignment.Stretch;
            OutputButton.Margin = layout == 2 ? new Thickness(0, 8, 0, 0) : new Thickness();
            Grid.SetRow(PeriodLabel, 1); Grid.SetColumn(PeriodLabel, 0); Grid.SetColumnSpan(PeriodLabel, 3);
            PeriodLabel.HorizontalAlignment = HorizontalAlignment.Left;
            PeriodLabel.Margin = new Thickness(0, 8, 0, 0);
        }
        else
        {
            MenuHeader.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });
            Grid.SetColumnSpan(HeaderScroll, 1);
            Grid.SetRow(OutputButton, 0); Grid.SetColumn(OutputButton, 2); Grid.SetColumnSpan(OutputButton, 1);
            OutputButton.HorizontalAlignment = HorizontalAlignment.Stretch; OutputButton.Margin = new Thickness();
            Grid.SetRow(PeriodLabel, 0); Grid.SetColumn(PeriodLabel, 1); Grid.SetColumnSpan(PeriodLabel, 1);
            PeriodLabel.HorizontalAlignment = HorizontalAlignment.Center;
            PeriodLabel.Margin = new Thickness();
        }
    }

    private void CalendarScrollViewer_SizeChanged(object sender, SizeChangedEventArgs e) => ResizeCalendarCards();

    private void ResizeCalendarCards()
    {
        if (CalendarGrid.Children.Count == 0 || CalendarScrollViewer.ActualWidth <= 0) return;
        var columns = ResponsiveLayout.PlannerColumns(CalendarScrollViewer.ActualWidth, _weekendPlanningEnabled ? 7 : 5, _monthly);
        if (CalendarGrid.ColumnDefinitions.Count != columns || CalendarGrid.RowDefinitions.Count != (CalendarGrid.Children.Count + columns - 1) / columns)
        {
            CalendarGrid.ColumnDefinitions.Clear();
            CalendarGrid.RowDefinitions.Clear();
            for (var i = 0; i < columns; i++) CalendarGrid.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star), MinWidth = 0 });
            for (var row = 0; row < (CalendarGrid.Children.Count + columns - 1) / columns; row++) CalendarGrid.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });
            for (var i = 0; i < CalendarGrid.Children.Count; i++)
            {
                if (CalendarGrid.Children[i] is FrameworkElement card)
                {
                    Grid.SetColumn(card, i % columns);
                    Grid.SetRow(card, i / columns);
                }
            }
        }
        var width = Math.Max(92, (CalendarScrollViewer.ActualWidth - 32 - ((columns - 1) * 8)) / columns);
        foreach (var card in CalendarGrid.Children.OfType<Border>())
            card.MinHeight = _monthly ? Math.Min(155, width) : 0;
    }
    private void Output_Click(object sender, RoutedEventArgs e)
    {
        try { if (App.CurrentWindow is MainWindow window) window.OpenMenuOutput(_date); }
        catch (Exception ex) { App.Logger.LogError(ex, "Could not open menu output"); PeriodLabel.Text = L.Get("ActionFailed"); }
    }

    public void FocusOutputButton() => OutputButton.Focus(FocusState.Programmatic);

    private async Task RefreshAsync()
    {
        if (_busy || _activeSlotSaves > 0) { _refreshPending = true; return; }
        _busy = true;
        SetPlannerInteraction();
        try
        {
            do
            {
                _refreshPending = false;
                try { await RefreshCoreAsync(); }
                catch (Exception ex)
                {
                    App.Logger.LogError(ex, "Could not load the meal planner");
                    if (!_refreshPending)
                    {
                        if (_hasRenderedView) { _date = _renderedDate; _monthly = _renderedMonthly; UpdateViewButtons(); }
                        PeriodLabel.Text = L.Get("DataLoadFailed");
                    }
                }
            } while (_refreshPending);
        }
        finally { _busy = false; SetPlannerInteraction(); }
    }

    private async Task RefreshCoreAsync()
    {
        var monthly = _monthly;
        var date = _date;
        var weekend = (await _database.GetSettingsAsync())?.WeekendPlanningEnabled ?? false;
        var recipes = await _database.GetAllRecipesAsync();
        var first = monthly ? new DateTime(date.Year, date.Month, 1) : WeekStart(date);
        var start = WeekStart(first);
        var end = monthly ? first.AddMonths(1).AddDays(-1) : start.AddDays(weekend ? 6 : 4);
        var calendarEnd = monthly ? start.AddDays(((end - start).Days / 7 + 1) * 7 - 1) : end;
        var entries = await _database.GetMenuAsync(start, calendarEnd);
        var period = monthly ? first.ToString("MMMM yyyy") : $"{start:dd MMM} – {end:dd MMM yyyy}";
        var columns = weekend ? 7 : 5;
        var days = monthly ? ((end - start).Days / 7 + 1) * 7 : weekend ? 7 : 5;
        var displayedDays = Enumerable.Range(0, days)
            .Select(offset => start.AddDays(offset))
            .Where(day => weekend || day.DayOfWeek is not DayOfWeek.Saturday and not DayOfWeek.Sunday)
            .ToList();
        // Construct the new view before replacing the old one. A failed category
        // read leaves the previous calendar visible instead of partially rendered.
        var cards = new List<Border>();
        foreach (var day in displayedDays)
        {
            var isWeekend = day.DayOfWeek is DayOfWeek.Saturday or DayOfWeek.Sunday;
            var isDisabledWeekend = isWeekend && !weekend;
            var panel = new StackPanel { Spacing = 8 };
            panel.Children.Add(new TextBlock { Text = day.ToString("ddd dd MMM"), FontSize = monthly ? 14 : 16, TextWrapping = TextWrapping.Wrap });
            if (monthly)
            {
                var names = isDisabledWeekend
                    ? Enumerable.Empty<string?>()
                    : entries.Where(e => e.Date.Date == day.Date).Select(e => recipes.FirstOrDefault(r => r.Id == e.RecipeId)?.Name).Where(n => n != null);
                var summary = string.Join("\n", names);
                var button = new Button { Content = new TextBlock { Text = summary.Length > 0 ? summary : L.Get("Text_Plan_menu_0031d0"), TextWrapping = TextWrapping.Wrap }, HorizontalAlignment = HorizontalAlignment.Stretch, MinHeight = 80, IsEnabled = !isDisabledWeekend };
                button.Click += async (_, _) => await ChangeViewAsync(() => { _date = day; _monthly = false; });
                panel.Children.Add(button);
            }
            else for (var slot = 0; slot < 4; slot++) panel.Children.Add(await CreateSlotAsync(day, slot, entries, recipes));
            cards.Add(new Border { Child = panel, Padding = new Thickness(8), BorderThickness = new Thickness(1), BorderBrush = (Microsoft.UI.Xaml.Media.Brush)Application.Current.Resources["SystemControlForegroundListLowBrush"], CornerRadius = new CornerRadius(4), Opacity = isDisabledWeekend || (monthly && day.Month != first.Month) ? 0.4 : 1 });
        }
        // A newer request supersedes this snapshot, so the next iteration renders it.
        if (_refreshPending) return;
        _weekendPlanningEnabled = weekend;
        PeriodLabel.Text = period;
        CalendarGrid.Children.Clear();
        CalendarGrid.RowDefinitions.Clear();
        CalendarGrid.ColumnDefinitions.Clear();
        for (var i = 0; i < columns; i++) CalendarGrid.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star), MinWidth = 0 });
        for (var row = 0; row < (cards.Count + columns - 1) / columns; row++) CalendarGrid.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });
        for (var i = 0; i < cards.Count; i++)
        {
            Grid.SetColumn(cards[i], i % columns);
            Grid.SetRow(cards[i], i / columns);
            CalendarGrid.Children.Add(cards[i]);
        }
        _renderedDate = date; _renderedMonthly = monthly; _hasRenderedView = true;
        _pendingSlotFailures = 0;
        ResizeCalendarCards();
    }

    private async Task<StackPanel> CreateSlotAsync(DateTime day, int index, IReadOnlyList<MenuEntry> entries, IReadOnlyList<Recipe> recipes)
    {
        var slot = $"slot{index + 1}";
        string[] oldNames = ["Breakfast", "Lunch", "Dinner", "Snack"];
        var entry = entries.FirstOrDefault(e => e.Date.Date == day.Date && e.Slot == slot)
            ?? entries.FirstOrDefault(e => e.Date.Date == day.Date && (e.Slot.Equals(Categories[index], StringComparison.OrdinalIgnoreCase) || e.Slot == oldNames[index]));
        var current = recipes.FirstOrDefault(r => r.Id == entry?.RecipeId);
        var category = await _database.GetMenuCategoryAsync(day, slot) ?? (current != null && Categories.Contains(current.Category) ? current.Category : Categories[index]);
        var panel = new StackPanel { Spacing = 4, Margin = new Thickness(0, 4, 0, 8) };
        panel.Children.Add(new TextBlock { Text = $"{index + 1}.", FontWeight = Microsoft.UI.Text.FontWeights.SemiBold, FontSize = 14 });
        var select = new ComboBox { ItemsSource = Labels, SelectedIndex = Array.IndexOf(Categories, category), FontSize = 15, HorizontalAlignment = HorizontalAlignment.Stretch };
        var search = new AutoSuggestBox { PlaceholderText = L.Get("Text_Select_recipe_c2831b"), Text = current?.Name ?? "", FontSize = 15, DisplayMemberPath = "Name", TextMemberPath = "Name" };
        var status = new TextBlock { FontSize = 12, TextWrapping = TextWrapping.Wrap };
        var retry = new Button { Content = L.Get("RetryAction"), Visibility = Visibility.Collapsed };
        bool saving = false, hasPending = false;
        Recipe? pendingRecipe = null;
        string pendingCategory = category;
        string DisplayedCategory() => select.SelectedIndex >= 0 ? Categories[select.SelectedIndex] : category;
        void ClearPending()
        {
            if (hasPending) { hasPending = false; _pendingSlotFailures--; }
            retry.Visibility = Visibility.Collapsed;
        }
        async Task SaveAsync(Recipe? recipe, string requestedCategory)
        {
            if (saving || _busy) return;
            saving = true;
            _activeSlotSaves++;
            SetPlannerInteraction();
            // Keep the user's attempted choice visible if the database rejects it.
            search.Text = recipe?.Name ?? "";
            try
            {
                await _database.SaveMenuSlotAsync(day, slot, requestedCategory, recipe?.Id, entry?.Slot);
                category = requestedCategory;
                current = recipe;
                entry = recipe == null ? null : new MenuEntry { Date = day, Slot = slot, RecipeId = recipe.Id };
                ClearPending();
                status.Text = L.Get("Text_Saved_499dc6");
            }
            catch (Exception ex)
            {
                App.Logger.LogError(ex, "Could not save meal planner slot {Date} {Slot}", day, slot);
                if (!hasPending) { hasPending = true; _pendingSlotFailures++; }
                pendingRecipe = recipe;
                pendingCategory = requestedCategory;
                retry.Visibility = Visibility.Visible;
                status.Text = L.Get("DataSaveFailed");
            }
            finally
            {
                saving = false;
                _activeSlotSaves--;
                SetPlannerInteraction();
                if (_activeSlotSaves == 0 && _refreshPending && _pendingSlotFailures == 0) await RefreshAsync();
            }
        }
        void Suggest()
        {
            try
            {
                var displayedCategory = DisplayedCategory();
                search.ItemsSource = recipes.Where(r => r.Category.Equals(displayedCategory, StringComparison.OrdinalIgnoreCase) && r.Name.Contains(search.Text.Trim(), StringComparison.OrdinalIgnoreCase)).OrderBy(r => r.Name, StringComparer.CurrentCultureIgnoreCase).ToList();
            }
            catch (Exception ex) { App.Logger.LogError(ex, "Could not load meal suggestions"); status.Text = L.Get("DataLoadFailed"); }
        }
        search.GotFocus += (_, _) => Suggest();
        search.TextChanged += async (_, args) =>
        {
            if (args.Reason != AutoSuggestionBoxTextChangeReason.UserInput) return;
            // A new search supersedes the failed choice; require a new selection
            // before retrying so Retry cannot save an older, hidden choice.
            if (hasPending) retry.Visibility = Visibility.Collapsed;
            Suggest();
            if (string.IsNullOrWhiteSpace(search.Text)) await SaveAsync(null, DisplayedCategory());
        };
        search.SuggestionChosen += async (_, args) => { if (args.SelectedItem is Recipe recipe) await SaveAsync(recipe, DisplayedCategory()); };
        select.SelectionChanged += async (_, _) =>
        {
            if (select.SelectedIndex < 0) return;
            await SaveAsync(null, DisplayedCategory());
            Suggest();
        };
        retry.Click += async (_, _) => { if (hasPending) await SaveAsync(pendingRecipe, pendingCategory); };
        panel.Children.Add(select);
        panel.Children.Add(search);
        var clear = new Button { Content = L.Get("Text_Clear_719ea3"), FontSize = 11, Padding = new Thickness(6, 2, 6, 2) };
        clear.Click += async (_, _) => await SaveAsync(null, DisplayedCategory());
        panel.Children.Add(clear);
        panel.Children.Add(status);
        panel.Children.Add(retry);
        return panel;
    }
}
