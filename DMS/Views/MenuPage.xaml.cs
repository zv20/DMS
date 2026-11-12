using L = DMS.Services.Localization;
using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Navigation;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using DMS.Models;
using DMS.Services;

namespace DMS.Views;

public sealed partial class MenuPage : Page, IUnsavedEditor
{
    private readonly DatabaseService _database;
    private static readonly string[] Categories = ["soup", "main", "dessert", "other"];
    private static readonly string[] CategoryIcons = ["🥣", "🍽️", "🍰", "➕"];
    private DateTime _date = DateTime.Today;
    private bool _monthly = true;
    private bool _busy, _refreshPending;
    private bool _hasRenderedView, _renderedMonthly;
    private bool _confirmingDiscard;
    private int _activeSlotSaves, _pendingSlotFailures;
    private DateTime _renderedDate;
    private bool _weekendPlanningEnabled;
    private int _headerLayout = -1;
    private Button? _lastOutputButton;
    private AutoSuggestBox? _activeRecipeSearch;

    public MenuPage()
    {
        InitializeComponent();
        PlannerRoot.AddHandler(UIElement.PointerPressedEvent, new Microsoft.UI.Xaml.Input.PointerEventHandler(PlannerRoot_PointerPressed), true);
        _database = App.Services.GetRequiredService<DatabaseService>();
        UpdateViewButtons();
        Loaded += async (_, _) => await RefreshAsync();
    }

    protected override void OnNavigatedFrom(NavigationEventArgs e)
    {
        _activeRecipeSearch = null;
        CalendarGrid.Children.Clear();
        CalendarGrid.RowDefinitions.Clear();
        CalendarGrid.ColumnDefinitions.Clear();
        base.OnNavigatedFrom(e);
    }
    private void PlannerRoot_PointerPressed(object sender, Microsoft.UI.Xaml.Input.PointerRoutedEventArgs e)
    {
        if (_activeRecipeSearch is not { IsSuggestionListOpen: true } search) return;
        for (var element = e.OriginalSource as DependencyObject; element != null; element = Microsoft.UI.Xaml.Media.VisualTreeHelper.GetParent(element))
            if (element == search) return;
        search.IsSuggestionListOpen = false;
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
        // Grid is a UIElement, not a Control, so it has no IsEnabled property.
        // Keep the planner stable while a slot is being saved by blocking input
        // on its two layout regions instead.
        MenuHeader.IsHitTestVisible = enabled;
        CalendarGrid.IsHitTestVisible = enabled;
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
            Grid.SetRow(OutputActions, layout == 2 ? 2 : 0); Grid.SetColumn(OutputActions, layout == 2 ? 0 : 2);
            Grid.SetColumnSpan(OutputActions, layout == 2 ? 3 : 1);
            OutputActions.HorizontalAlignment = layout == 2 ? HorizontalAlignment.Left : HorizontalAlignment.Stretch;
            OutputActions.Margin = layout == 2 ? new Thickness(0, 8, 0, 0) : new Thickness();
            Grid.SetRow(PeriodLabel, 1); Grid.SetColumn(PeriodLabel, 0); Grid.SetColumnSpan(PeriodLabel, 3);
            PeriodLabel.HorizontalAlignment = HorizontalAlignment.Left;
            PeriodLabel.Margin = new Thickness(0, 8, 0, 0);
        }
        else
        {
            MenuHeader.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });
            Grid.SetColumnSpan(HeaderScroll, 1);
            Grid.SetRow(OutputActions, 0); Grid.SetColumn(OutputActions, 2); Grid.SetColumnSpan(OutputActions, 1);
            OutputActions.HorizontalAlignment = HorizontalAlignment.Stretch; OutputActions.Margin = new Thickness();
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
    private void PrintOutput_Click(object sender, RoutedEventArgs e) => OpenOutput(PrintOutputButton, true);
    private void ExportOutput_Click(object sender, RoutedEventArgs e) => OpenOutput(ExportOutputButton, false);

    private void OpenOutput(Button button, bool print)
    {
        _lastOutputButton = button;
        try { if (App.CurrentWindow is MainWindow window) window.OpenMenuOutput(_date, print); }
        catch (Exception ex) { App.Logger.LogError(ex, "Could not open menu output"); PeriodLabel.Text = L.Get("ActionFailed"); }
    }

    public void FocusOutputButton() => (_lastOutputButton ?? PrintOutputButton).Focus(FocusState.Programmatic);

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
        var categories = monthly
            ? new Dictionary<(DateTime Date, string Slot), string>()
            : (await _database.GetMenuCategoriesAsync(start, calendarEnd))
                .ToDictionary(item => (item.Date.Date, item.Slot), item => item.Category);
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
            panel.Children.Add(new TextBlock { Text = day.ToString("ddd dd MMM"), FontSize = monthly ? 14 : 16, FontWeight = Microsoft.UI.Text.FontWeights.SemiBold, TextWrapping = TextWrapping.Wrap });
            if (monthly)
            {
                var names = isDisabledWeekend
                    ? Enumerable.Empty<string>()
                    : Enumerable.Range(0, 4).Select(index =>
                    {
                        var entry = FindSlotEntry(day, index, entries);
                        var name = recipes.FirstOrDefault(recipe => recipe.Id == entry?.RecipeId)?.Name;
                        return name == null ? null : $"{index + 1}. {name}";
                    }).OfType<string>();
                var summary = string.Join("\n", names);
                var button = new Button { Content = new TextBlock { Text = summary.Length > 0 ? summary : L.Get("Text_Plan_menu_0031d0"), TextWrapping = TextWrapping.Wrap }, HorizontalAlignment = HorizontalAlignment.Stretch, MinHeight = 80, IsEnabled = !isDisabledWeekend, Background = new Microsoft.UI.Xaml.Media.SolidColorBrush(Microsoft.UI.Colors.Transparent), BorderThickness = new Thickness(0), CornerRadius = new CornerRadius(8) };
                button.Click += async (_, _) => await ChangeViewAsync(() => { _date = day; _monthly = false; });
                panel.Children.Add(button);
            }
            else for (var slot = 0; slot < 4; slot++) panel.Children.Add(CreateSlot(day, slot, entries, recipes, categories));
            var card = new Border { Child = panel, Style = (Style)Application.Current.Resources["PlannerDayCardStyle"], Opacity = isDisabledWeekend || (monthly && day.Month != first.Month) ? 0.4 : 1 };
            card.PointerEntered += (_, _) =>
            {
                card.Background = (Microsoft.UI.Xaml.Media.Brush)Application.Current.Resources["DmsAccentSubtleBrush"];
                card.BorderBrush = (Microsoft.UI.Xaml.Media.Brush)Application.Current.Resources["DmsAccentBrush"];
            };
            card.PointerExited += (_, _) =>
            {
                card.ClearValue(Border.BackgroundProperty);
                card.ClearValue(Border.BorderBrushProperty);
            };
            cards.Add(card);
        }
        // A newer request supersedes this snapshot, so the next iteration renders it.
        if (_refreshPending) return;
        _weekendPlanningEnabled = weekend;
        PeriodLabel.Text = period;
        _activeRecipeSearch = null;
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

    private static MenuEntry? FindSlotEntry(DateTime day, int index, IReadOnlyList<MenuEntry> entries)
    {
        string[] oldNames = ["Breakfast", "Lunch", "Dinner", "Snack"];
        return entries.FirstOrDefault(e => e.Date.Date == day.Date && e.Slot == $"slot{index + 1}")
            ?? entries.FirstOrDefault(e => e.Date.Date == day.Date && (e.Slot.Equals(Categories[index], StringComparison.OrdinalIgnoreCase) || e.Slot == oldNames[index]));
    }

    private StackPanel CreateSlot(DateTime day, int index, IReadOnlyList<MenuEntry> entries, IReadOnlyList<Recipe> recipes, IReadOnlyDictionary<(DateTime Date, string Slot), string> categories)
    {
        var slot = $"slot{index + 1}";
        var entry = FindSlotEntry(day, index, entries);
        var current = recipes.FirstOrDefault(r => r.Id == entry?.RecipeId);
        var category = categories.GetValueOrDefault((day.Date, slot)) ?? (current != null && Categories.Contains(current.Category) ? current.Category : Categories[index]);
        var panel = new StackPanel { Spacing = 4, Margin = new Thickness(0, 4, 0, 8) };
        var selectedCategory = category;
        var select = new Button { Width = 36, Height = 32, MinWidth = 0, Padding = new Thickness(0), VerticalAlignment = VerticalAlignment.Top };
        var categoryMenu = new MenuFlyout();
        select.Flyout = categoryMenu;
        var search = new AutoSuggestBox { PlaceholderText = L.Get("Text_Select_recipe_c2831b"), Text = current?.Name ?? "", FontSize = 15, MinWidth = 0, TextMemberPath = "Name", Style = (Style)Application.Current.Resources["PlannerRecipeSuggestStyle"] };
        var status = new TextBlock { FontSize = 12, TextWrapping = TextWrapping.Wrap, Visibility = Visibility.Collapsed };
        var retry = new Button { Content = L.Get("RetryAction"), MinWidth = 0, Visibility = Visibility.Collapsed };
        bool saving = false, hasPending = false;
        Recipe? pendingRecipe = null;
        string pendingCategory = category;
        string DisplayedCategory() => selectedCategory;
        void UpdateCategoryButton(int categoryIndex)
        {
            select.Content = CategoryIcons[categoryIndex];
            var label = L.Category(Categories[categoryIndex]);
            ToolTipService.SetToolTip(select, label);
            Microsoft.UI.Xaml.Automation.AutomationProperties.SetName(select, $"{index + 1}. {label}");
        }
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
                status.Visibility = Visibility.Visible;
            }
            catch (Exception ex)
            {
                App.Logger.LogError(ex, "Could not save meal planner slot {Date} {Slot}", day, slot);
                if (!hasPending) { hasPending = true; _pendingSlotFailures++; }
                pendingRecipe = recipe;
                pendingCategory = requestedCategory;
                retry.Visibility = Visibility.Visible;
                status.Text = L.Get("DataSaveFailed");
                status.Visibility = Visibility.Visible;
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
            catch (Exception ex) { App.Logger.LogError(ex, "Could not load meal suggestions"); status.Text = L.Get("DataLoadFailed"); status.Visibility = Visibility.Visible; }
        }
        search.GotFocus += (_, _) => { _activeRecipeSearch = search; Suggest(); };
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
        for (var categoryIndex = 0; categoryIndex < Categories.Length; categoryIndex++)
        {
            var optionIndex = categoryIndex;
            var item = new MenuFlyoutItem { Text = $"{CategoryIcons[optionIndex]} {L.Category(Categories[optionIndex])}" };
            item.Click += async (_, _) =>
            {
                if (selectedCategory == Categories[optionIndex]) return;
                selectedCategory = Categories[optionIndex];
                UpdateCategoryButton(optionIndex);
                await SaveAsync(null, DisplayedCategory());
                Suggest();
            };
            categoryMenu.Items.Add(item);
        }
        UpdateCategoryButton(Math.Max(0, Array.IndexOf(Categories, selectedCategory)));
        retry.Click += async (_, _) => { if (hasPending) await SaveAsync(pendingRecipe, pendingCategory); };
        var mealRow = new Grid { ColumnSpacing = 6, RowSpacing = 4 };
        mealRow.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });
        mealRow.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star), MinWidth = 0 });
        mealRow.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });
        mealRow.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });
        mealRow.Children.Add(select);
        Grid.SetRow(search, 1);
        Grid.SetColumnSpan(search, 2);
        mealRow.Children.Add(search);
        var clear = new Button { Content = new FontIcon { Glyph = "\uE711", FontSize = 12 }, Width = 32, Height = 32, MinWidth = 0, Padding = new Thickness(0), HorizontalAlignment = HorizontalAlignment.Right, VerticalAlignment = VerticalAlignment.Top };
        ToolTipService.SetToolTip(clear, L.Get("Text_Clear_719ea3"));
        Microsoft.UI.Xaml.Automation.AutomationProperties.SetName(clear, $"{L.Get("Text_Clear_719ea3")} {index + 1}");
        clear.Click += async (_, _) => await SaveAsync(null, DisplayedCategory());
        Grid.SetColumn(clear, 1);
        mealRow.Children.Add(clear);
        panel.Children.Add(mealRow);
        panel.Children.Add(status);
        panel.Children.Add(retry);
        return panel;
    }
}
