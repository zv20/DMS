using L = DMS.Services.Localization;
using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Navigation;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using DMS.Models;
using DMS.Services;
using System.Globalization;

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
    private AppSettings? _previewSettings;

    public MenuPage()
    {
        InitializeComponent();
        PlannerRoot.AddHandler(UIElement.PointerPressedEvent, new Microsoft.UI.Xaml.Input.PointerEventHandler(PlannerRoot_PointerPressed), true);
        _database = App.Services.GetRequiredService<DatabaseService>();
        UpdateViewButtons();
        Loaded += async (_, _) =>
        {
            await RestorePlannerViewAsync();
            await RefreshAsync();
        };
    }

    internal void SetSetupPreview(AppSettings settings, bool monthly)
    {
        _previewSettings = settings;
        _monthly = monthly;
        IsHitTestVisible = false;
        UpdateViewButtons();
        if (IsLoaded) _ = RefreshAsync();
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
            change(); UpdateViewButtons(); await RefreshAsync(); await PersistPlannerViewAsync();
        }
        catch (Exception ex)
        {
            App.Logger.LogError(ex, "Could not change the planner view");
            PeriodLabel.Text = L.Get("DataLoadFailed");
        }
    }

    private async Task RestorePlannerViewAsync()
    {
        if (_previewSettings != null) return;
        try
        {
            var settings = await _database.GetSettingsAsync();
            if (settings?.PlannerDate is not { } date) return;
            _date = date;
            _monthly = settings.PlannerMonthly;
            UpdateViewButtons();
        }
        catch (Exception ex)
        {
            App.Logger.LogWarning(ex, "Could not restore the last meal planner view");
        }
    }

    private async Task PersistPlannerViewAsync()
    {
        if (_previewSettings != null) return;
        try { await _database.SavePlannerViewAsync(_date, _monthly); }
        catch (Exception ex) { App.Logger.LogWarning(ex, "Could not save the last meal planner view"); }
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
            return await EditorDialogs.ConfirmDiscardAsync(XamlRoot);
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
        // Weekly days share grid rows, so resizing must not reposition individual cells.
        if (!_monthly) return;
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
        var settings = _previewSettings ?? await _database.GetSettingsAsync() ?? new AppSettings();
        var weekend = settings.WeekendPlanningEnabled;
        var recipes = _previewSettings == null ? await _database.GetAllRecipesAsync() :
            settings.MealCategories.Select((category, index) => new Recipe
            {
                Id = index + 1,
                Category = category.Id,
                Name = L.Language == "en-US" ? $"Example meal {index + 1}" : $"Примерно ястие {index + 1}"
            }).ToList();
        var first = monthly ? new DateTime(date.Year, date.Month, 1) : MenuOutputService.WeekStart(date);
        var start = MenuOutputService.WeekStart(first);
        var end = monthly ? first.AddMonths(1).AddDays(-1) : start.AddDays(weekend ? 6 : 4);
        var calendarEnd = monthly ? start.AddDays(((end - start).Days / 7 + 1) * 7 - 1) : end;
        var entries = _previewSettings == null ? await _database.GetMenuAsync(start, calendarEnd) :
            Enumerable.Range(0, (calendarEnd - start).Days + 1)
                .SelectMany(offset => Enumerable.Range(0, Math.Min(settings.MealsPerDay, recipes.Count))
                    .Select(slot => new MenuEntry { Date = start.AddDays(offset), Slot = $"slot{slot + 1}", RecipeId = recipes[slot].Id }))
                .ToList();
        var entriesByDay = entries.ToLookup(entry => entry.Date.Date);
        var recipesById = recipes.ToDictionary(recipe => recipe.Id);
        var ingredientByName = monthly ? new Dictionary<string, Ingredient>(StringComparer.OrdinalIgnoreCase) :
            (await _database.GetAllIngredientsAsync()).GroupBy(item => item.Name, StringComparer.OrdinalIgnoreCase)
                .ToDictionary(group => group.Key, group => group.First(), StringComparer.OrdinalIgnoreCase);
        var recipesByCategory = monthly ? null : recipes
            .GroupBy(recipe => recipe.Category, StringComparer.OrdinalIgnoreCase)
            .ToDictionary(group => group.Key,
                group => new Lazy<MenuRecipeSuggestion[]>(() => group.OrderBy(recipe => recipe.Name, StringComparer.CurrentCultureIgnoreCase)
                    .Select(recipe => new MenuRecipeSuggestion(recipe, ingredientByName)).ToArray()),
                StringComparer.OrdinalIgnoreCase);
        var categories = monthly
            ? new Dictionary<(DateTime Date, string Slot), string>()
            : (_previewSettings == null ? await _database.GetMenuCategoriesAsync(start, calendarEnd) : new List<MenuSlotCategory>())
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
        var weeklyCells = new List<List<UIElement>>();
        foreach (var day in displayedDays)
        {
            var dayEntries = entriesByDay[day];
            var panel = new StackPanel { Spacing = 8 };
            panel.Children.Add(new TextBlock { Text = day.ToString("dddd d", CultureInfo.CurrentCulture), FontSize = monthly ? 14 : 16, FontWeight = Microsoft.UI.Text.FontWeights.SemiBold, TextWrapping = TextWrapping.Wrap });
            if (monthly)
            {
                var names = Enumerable.Range(0, settings.MealsPerDay).Select(index =>
                {
                    var entry = MenuOutputService.FindSlotEntry(index, dayEntries);
                    return entry != null && recipesById.TryGetValue(entry.RecipeId, out var recipe)
                        ? $"{index + 1}. {recipe.Name}" : null;
                }).OfType<string>();
                var summary = string.Join("\n", names);
                var button = new Button { Content = new TextBlock { Text = summary.Length > 0 ? summary : L.Get("Text_Plan_menu_0031d0"), TextWrapping = TextWrapping.Wrap }, HorizontalAlignment = HorizontalAlignment.Stretch, MinHeight = 80, Background = new Microsoft.UI.Xaml.Media.SolidColorBrush(Microsoft.UI.Colors.Transparent), BorderThickness = new Thickness(0), CornerRadius = new CornerRadius(8) };
                button.Click += async (_, _) => await ChangeViewAsync(() => { _date = day; _monthly = false; });
                panel.Children.Add(button);
            }
            else
            {
                var cells = new List<UIElement> { panel.Children[0] };
                panel.Children.Clear();
                for (var slot = 0; slot < settings.MealsPerDay; slot++)
                {
                    var entry = MenuOutputService.FindSlotEntry(slot, dayEntries);
                    var recipe = entry == null ? null : recipesById.GetValueOrDefault(entry.RecipeId);
                    cells.Add(CreateSlot(day, slot, recipe, recipesByCategory!, categories, settings.MealCategories));
                }
                var clearDay = new Button { Content = L.Get("PlannerClearDay"), HorizontalAlignment = HorizontalAlignment.Stretch };
                Microsoft.UI.Xaml.Automation.AutomationProperties.SetName(clearDay, $"{L.Get("PlannerClearDay")} {day:D}");
                clearDay.Click += async (_, _) => await ClearDayAsync(day);
                cells.Add(clearDay);
                weeklyCells.Add(cells);
            }
            var card = new Border { Child = monthly ? panel : null, Style = (Style)Application.Current.Resources["PlannerDayCardStyle"], Opacity = monthly && day.Month != first.Month ? 0.4 : 1 };
            AttachDayHover(card, card);
            cards.Add(card);
        }
        // A newer request supersedes this snapshot, so the next iteration renders it.
        if (_refreshPending) return;
        _weekendPlanningEnabled = weekend;
        CalendarGrid.ColumnSpacing = monthly ? 8 : 2;
        CalendarGrid.RowSpacing = monthly ? 8 : 0;
        PeriodLabel.Text = period;
        _activeRecipeSearch = null;
        CalendarGrid.Children.Clear();
        CalendarGrid.RowDefinitions.Clear();
        CalendarGrid.ColumnDefinitions.Clear();
        for (var i = 0; i < columns; i++) CalendarGrid.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star), MinWidth = 0 });
        var rowCount = monthly ? (cards.Count + columns - 1) / columns : settings.MealsPerDay + 2;
        for (var row = 0; row < rowCount; row++) CalendarGrid.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });
        for (var i = 0; i < cards.Count; i++)
        {
            Grid.SetColumn(cards[i], i % columns);
            Grid.SetRow(cards[i], monthly ? i / columns : 0);
            if (!monthly) Grid.SetRowSpan(cards[i], rowCount);
            CalendarGrid.Children.Add(cards[i]);
        }
        if (!monthly)
        {
            for (var dayIndex = 0; dayIndex < weeklyCells.Count; dayIndex++)
            {
                for (var row = 0; row < weeklyCells[dayIndex].Count; row++)
                {
                    var cell = (FrameworkElement)weeklyCells[dayIndex][row];
                    cell.Margin = row == 0 ? new Thickness(10, 10, 10, 0) :
                        row == rowCount - 1 ? new Thickness(10, 0, 10, 10) : new Thickness(10, 4, 10, 8);
                    Grid.SetColumn(cell, dayIndex);
                    Grid.SetRow(cell, row);
                    AttachDayHover(cell, cards[dayIndex]);
                    CalendarGrid.Children.Add(cell);
                }
            }
        }
        _renderedDate = date; _renderedMonthly = monthly; _hasRenderedView = true;
        PerformancePageSignal.AfterRender(this, "menu", recipes.Count);
        _pendingSlotFailures = 0;
        ResizeCalendarCards();
    }

    private async Task ClearDayAsync(DateTime day)
    {
        if (_busy || _activeSlotSaves > 0 || !await ConfirmDiscardAsync()) return;
        _busy = true;
        SetPlannerInteraction();
        var cleared = false;
        try
        {
            if (!await EditorDialogs.ConfirmAsync(XamlRoot, L.Get("PlannerClearDay"),
                L.Format("PlannerClearDayConfirm", day.ToString("D")), "PlannerClearDay")) return;
            await _database.ClearMenuDayAsync(day);
            cleared = true;
        }
        catch (Exception ex)
        {
            App.Logger.LogError(ex, "Could not clear planner day {Date}", day);
            var error = new ContentDialog { XamlRoot = XamlRoot, Title = L.Get("DataSaveFailed"), CloseButtonText = L.Get("OutputClose") };
            await error.ShowAsync();
        }
        finally { _busy = false; SetPlannerInteraction(); }
        if (cleared) await RefreshAsync();
    }

    private static void AttachDayHover(UIElement target, Border card)
    {
        target.PointerEntered += (_, _) =>
        {
            card.Background = (Microsoft.UI.Xaml.Media.Brush)Application.Current.Resources["DmsAccentSubtleBrush"];
            card.BorderBrush = (Microsoft.UI.Xaml.Media.Brush)Application.Current.Resources["DmsAccentBrush"];
        };
        target.PointerExited += (_, _) =>
        {
            card.ClearValue(Border.BackgroundProperty);
            card.ClearValue(Border.BorderBrushProperty);
        };
    }

    private static void InvalidateRecipeTextBox(DependencyObject element)
    {
        if (element is TextBox textBox) { textBox.InvalidateMeasure(); return; }
        for (var i = 0; i < Microsoft.UI.Xaml.Media.VisualTreeHelper.GetChildrenCount(element); i++)
            InvalidateRecipeTextBox(Microsoft.UI.Xaml.Media.VisualTreeHelper.GetChild(element, i));
    }

    private StackPanel CreateSlot(DateTime day, int index, Recipe? current, IReadOnlyDictionary<string, Lazy<MenuRecipeSuggestion[]>> recipesByCategory, IReadOnlyDictionary<(DateTime Date, string Slot), string> categories, IReadOnlyList<MealCategory> mealCategories)
    {
        var slot = $"slot{index + 1}";
        var selectedCategory = categories.GetValueOrDefault((day.Date, slot)) ?? (current != null && mealCategories.Any(c => c.Id == current.Category) ? current.Category : mealCategories[Math.Min(index, mealCategories.Count - 1)].Id);
        var panel = new StackPanel { Spacing = 4, VerticalAlignment = VerticalAlignment.Top };
        var select = new Button { Width = 36, Height = 32, MinWidth = 0, Padding = new Thickness(0), VerticalAlignment = VerticalAlignment.Top };
        var categoryMenu = new MenuFlyout();
        select.Flyout = categoryMenu;
        var search = new AutoSuggestBox { PlaceholderText = L.Get("Text_Select_recipe_c2831b"), Text = current?.Name ?? "", FontSize = 15, MinWidth = 0, TextMemberPath = "Name", ItemTemplate = (DataTemplate)Resources["PlannerRecipeSuggestionTemplate"], Style = (Style)Application.Current.Resources["PlannerRecipeSuggestStyle"] };
        ToolTipService.SetToolTip(search, current?.Name ?? "");
        search.SizeChanged += (_, args) =>
        {
            if (Math.Abs(args.NewSize.Width - args.PreviousSize.Width) < 0.5) return;
            search.DispatcherQueue.TryEnqueue(() =>
            {
                InvalidateRecipeTextBox(search);
                search.InvalidateMeasure();
            });
        };
        var status = new TextBlock { FontSize = 12, TextWrapping = TextWrapping.Wrap, Visibility = Visibility.Collapsed };
        var retry = new Button { Content = L.Get("RetryAction"), MinWidth = 0, Visibility = Visibility.Collapsed };
        bool saving = false, hasPending = false;
        Recipe? pendingRecipe = null;
        var pendingCategory = selectedCategory;
        void UpdateCategoryButton(int categoryIndex)
        {
            var selected = mealCategories[categoryIndex];
            var builtInIndex = string.IsNullOrWhiteSpace(selected.Name) ? Array.FindIndex(Categories, key => key.Equals(selected.Id, StringComparison.OrdinalIgnoreCase)) : -1;
            select.Content = builtInIndex >= 0 ? CategoryIcons[builtInIndex] : "🍴";
            var label = L.Category(selected);
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
            ToolTipService.SetToolTip(search, recipe?.Name ?? "");
            try
            {
                await _database.SaveMenuSlotAsync(day, slot, requestedCategory, recipe?.Id);
                App.Logger.LogInformation("Saved meal planner slot {Date} {Slot}", day, slot);
                current = recipe;
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
                var recipes = recipesByCategory.GetValueOrDefault(selectedCategory)?.Value ?? Array.Empty<MenuRecipeSuggestion>();
                var query = search.Text.Trim();
                search.ItemsSource = query.Length == 0 ? recipes :
                    Array.FindAll(recipes, recipe => recipe.Name.Contains(query, StringComparison.OrdinalIgnoreCase));
            }
            catch (Exception ex) { App.Logger.LogError(ex, "Could not load meal suggestions"); status.Text = L.Get("DataLoadFailed"); status.Visibility = Visibility.Visible; }
        }
        search.GotFocus += (_, _) => { _activeRecipeSearch = search; Suggest(); };
        search.KeyDown += async (_, args) =>
        {
            if (args.Key != Windows.System.VirtualKey.Back || current == null || search.Text != current.Name) return;
            args.Handled = true;
            await SaveAsync(null, selectedCategory);
        };
        SearchPicker.ReopenOnClick(search, Suggest);
        search.TextChanged += async (_, args) =>
        {
            if (args.Reason != AutoSuggestionBoxTextChangeReason.UserInput) return;
            // A new search supersedes the failed choice; require a new selection
            // before retrying so Retry cannot save an older, hidden choice.
            if (hasPending) retry.Visibility = Visibility.Collapsed;
            Suggest();
            if (string.IsNullOrWhiteSpace(search.Text)) await SaveAsync(null, selectedCategory);
        };
        search.SuggestionChosen += async (_, args) => { if (args.SelectedItem is MenuRecipeSuggestion suggestion) await SaveAsync(suggestion.Recipe, selectedCategory); };
        categoryMenu.Opening += (_, _) =>
        {
            if (categoryMenu.Items.Count != 0) return;
            for (var categoryIndex = 0; categoryIndex < mealCategories.Count; categoryIndex++)
            {
                var optionIndex = categoryIndex;
                var option = mealCategories[optionIndex];
                var builtInIndex = string.IsNullOrWhiteSpace(option.Name) ? Array.FindIndex(Categories, key => key.Equals(option.Id, StringComparison.OrdinalIgnoreCase)) : -1;
                var item = new MenuFlyoutItem { Text = $"{(builtInIndex >= 0 ? CategoryIcons[builtInIndex] : "🍴")} {L.Category(option)}" };
                item.Click += async (_, _) =>
                {
                    if (selectedCategory == option.Id) return;
                    selectedCategory = option.Id;
                    UpdateCategoryButton(optionIndex);
                    await SaveAsync(null, selectedCategory);
                    Suggest();
                };
                categoryMenu.Items.Add(item);
            }
        };
        UpdateCategoryButton(Math.Max(0, mealCategories.ToList().FindIndex(c => c.Id == selectedCategory)));
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
        panel.Children.Add(mealRow);
        panel.Children.Add(status);
        panel.Children.Add(retry);
        return panel;
    }
}

public sealed class MenuRecipeSuggestion
{
    public Recipe Recipe { get; }
    public string Name => Recipe.Name;
    public IReadOnlyList<IngredientDisplayItem> IngredientItems { get; }

    public MenuRecipeSuggestion(Recipe recipe, IReadOnlyDictionary<string, Ingredient> ingredients)
    {
        Recipe = recipe;
        IngredientItems = AllergenDisplay.BuildIngredientItems(recipe, ingredients);
    }
}

public sealed class InlineRecipeIngredients : TextBlock
{
    private IReadOnlyList<IngredientDisplayItem>? _items;

    public IReadOnlyList<IngredientDisplayItem>? Items
    {
        get => _items;
        set
        {
            _items = value;
            Inlines.Clear();
            if (value == null) return;
            foreach (var (item, index) in value.Select((item, index) => (item, index)))
            {
                if (index > 0) Inlines.Add(new Microsoft.UI.Xaml.Documents.Run { Text = ", " });
                var run = new Microsoft.UI.Xaml.Documents.Run { Text = item.Name };
                if (item.HasAllergens) run.Foreground = (Microsoft.UI.Xaml.Media.Brush)Application.Current.Resources["DmsAccentBrush"];
                Inlines.Add(run);
            }
        }
    }
}
