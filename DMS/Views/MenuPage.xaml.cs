using L = DMS.Services.Localization;
using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.Extensions.DependencyInjection;
using DMS.Models;
using DMS.Services;

namespace DMS.Views;

public sealed partial class MenuPage : Page
{
    private readonly IDatabaseService _database;
    private static readonly string[] Categories = ["soup", "main", "dessert", "other"];
    private static string[] Labels => ["🥣 " + L.Category("soup"), "🍽️ " + L.Category("main"), "🍰 " + L.Category("dessert"), "➕ " + L.Category("other")];
    private DateTime _date = DateTime.Today;
    private bool _monthly = true;
    private bool _busy;
    private bool _weekendPlanningEnabled;
    private bool _compactHeader;
    private List<Recipe> _recipes = [];
    private List<MenuEntry> _entries = [];

    public MenuPage()
    {
        InitializeComponent();
        _database = App.Services.GetRequiredService<IDatabaseService>();
        Loaded += async (_, _) => await RefreshAsync();
    }
    private static DateTime WeekStart(DateTime day) => day.Date.AddDays(-((7 + (int)day.DayOfWeek - 1) % 7));
    private async void Monthly_Click(object sender, RoutedEventArgs e) { _monthly = true; await RefreshAsync(); }
    private async void Weekly_Click(object sender, RoutedEventArgs e) { _monthly = false; await RefreshAsync(); }
    private async void Previous_Click(object sender, RoutedEventArgs e) { _date = _monthly ? _date.AddMonths(-1) : _date.AddDays(-7); await RefreshAsync(); }
    private async void Next_Click(object sender, RoutedEventArgs e) { _date = _monthly ? _date.AddMonths(1) : _date.AddDays(7); await RefreshAsync(); }
    private async void Today_Click(object sender, RoutedEventArgs e) { _date = DateTime.Today; await RefreshAsync(); }

    private void MenuHeader_SizeChanged(object sender, SizeChangedEventArgs e)
    {
        var compact = e.NewSize.Width < 700;
        if (_compactHeader == compact) return;
        _compactHeader = compact;
        MenuHeader.RowDefinitions.Clear();
        if (compact)
        {
            MenuHeader.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });
            MenuHeader.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });
            Grid.SetRow(PeriodLabel, 1); Grid.SetColumn(PeriodLabel, 0); Grid.SetColumnSpan(PeriodLabel, 3);
            PeriodLabel.HorizontalAlignment = HorizontalAlignment.Left;
            PeriodLabel.Margin = new Thickness(0, 8, 0, 0);
        }
        else
        {
            MenuHeader.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });
            Grid.SetRow(PeriodLabel, 0); Grid.SetColumn(PeriodLabel, 1); Grid.SetColumnSpan(PeriodLabel, 1);
            PeriodLabel.HorizontalAlignment = HorizontalAlignment.Center;
            PeriodLabel.Margin = new Thickness();
        }
    }

    private void CalendarScrollViewer_SizeChanged(object sender, SizeChangedEventArgs e) => ResizeCalendarCards();

    private void ResizeCalendarCards()
    {
        if (CalendarGrid.ColumnDefinitions.Count == 0 || CalendarScrollViewer.ActualWidth <= 0) return;
        var columns = CalendarGrid.ColumnDefinitions.Count;
        var width = Math.Max(92, (CalendarScrollViewer.ActualWidth - 32 - ((columns - 1) * 8)) / columns);
        foreach (var card in CalendarGrid.Children.OfType<Border>())
            card.MinHeight = _monthly ? Math.Min(155, width) : 0;
    }
    private void Output_Click(object sender, RoutedEventArgs e)
    {
        try { if (App.CurrentWindow is MainWindow window) window.OpenMenuOutput(_date); }
        catch (Exception ex) { PeriodLabel.Text = L.Format("MenuLoadError", ex.Message); }
    }

    public void FocusOutputButton() => OutputButton.Focus(FocusState.Programmatic);

    private async Task RefreshAsync()
    {
        if (_busy) return;
        _busy = true;
        try
        {
            _weekendPlanningEnabled = (await _database.GetSettingsAsync())?.WeekendPlanningEnabled ?? false;
            _recipes = await _database.GetAllRecipesAsync();
            var first = _monthly ? new DateTime(_date.Year, _date.Month, 1) : WeekStart(_date);
            var start = WeekStart(first);
            var end = _monthly ? first.AddMonths(1).AddDays(-1) : start.AddDays(_weekendPlanningEnabled ? 6 : 4);
            var calendarEnd = _monthly ? start.AddDays(((end - start).Days / 7 + 1) * 7 - 1) : end;
            _entries = await _database.GetMenuAsync(start, calendarEnd);
            PeriodLabel.Text = _monthly ? first.ToString("MMMM yyyy") : $"{start:dd MMM} – {end:dd MMM yyyy}";
            CalendarGrid.Children.Clear();
            CalendarGrid.RowDefinitions.Clear();
            CalendarGrid.ColumnDefinitions.Clear();
            var columns = _weekendPlanningEnabled ? 7 : 5;
            for (var i = 0; i < columns; i++) CalendarGrid.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star), MinWidth = 0 });
            var days = _monthly ? ((end - start).Days / 7 + 1) * 7 : _weekendPlanningEnabled ? 7 : 5;
            var displayedDays = Enumerable.Range(0, days)
                .Select(offset => start.AddDays(offset))
                .Where(day => _weekendPlanningEnabled || day.DayOfWeek is not DayOfWeek.Saturday and not DayOfWeek.Sunday)
                .ToList();
            for (var row = 0; row < (displayedDays.Count + columns - 1) / columns; row++) CalendarGrid.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });
            for (var i = 0; i < displayedDays.Count; i++)
            {
                var day = displayedDays[i];
                var isWeekend = day.DayOfWeek is DayOfWeek.Saturday or DayOfWeek.Sunday;
                var isDisabledWeekend = isWeekend && !_weekendPlanningEnabled;
                var panel = new StackPanel { Spacing = 8 };
                panel.Children.Add(new TextBlock { Text = day.ToString("ddd dd MMM"), FontSize = 14 });
                if (_monthly)
                {
                    var names = isDisabledWeekend
                        ? Enumerable.Empty<string?>()
                        : _entries.Where(e => e.Date.Date == day.Date).Select(e => _recipes.FirstOrDefault(r => r.Id == e.RecipeId)?.Name).Where(n => n != null);
                    var summary = string.Join("\n", names);
                    var button = new Button { Content = new TextBlock { Text = summary.Length > 0 ? summary : L.Get("Text_Plan_menu_0031d0"), TextWrapping = TextWrapping.Wrap }, HorizontalAlignment = HorizontalAlignment.Stretch, MinHeight = 80, IsEnabled = !isDisabledWeekend };
                    button.Click += async (_, _) => { _date = day; _monthly = false; await RefreshAsync(); };
                    panel.Children.Add(button);
                }
                else for (var slot = 0; slot < 4; slot++) panel.Children.Add(await CreateSlotAsync(day, slot));
                var border = new Border { Child = panel, Padding = new Thickness(8), BorderThickness = new Thickness(1), BorderBrush = (Microsoft.UI.Xaml.Media.Brush)Application.Current.Resources["SystemControlForegroundListLowBrush"], CornerRadius = new CornerRadius(4), Opacity = isDisabledWeekend || (_monthly && day.Month != first.Month) ? 0.4 : 1 };
                Grid.SetColumn(border, i % columns);
                Grid.SetRow(border, i / columns);
                CalendarGrid.Children.Add(border);
            }
            ResizeCalendarCards();
        }
        catch (Exception ex) { PeriodLabel.Text = L.Format("MenuLoadError", ex.Message); }
        finally { _busy = false; }
    }

    private async Task<StackPanel> CreateSlotAsync(DateTime day, int index)
    {
        var slot = $"slot{index + 1}";
        string[] oldNames = ["Breakfast", "Lunch", "Dinner", "Snack"];
        var entry = _entries.FirstOrDefault(e => e.Date.Date == day.Date && e.Slot == slot)
            ?? _entries.FirstOrDefault(e => e.Date.Date == day.Date && (e.Slot.Equals(Categories[index], StringComparison.OrdinalIgnoreCase) || e.Slot == oldNames[index]));
        var current = _recipes.FirstOrDefault(r => r.Id == entry?.RecipeId);
        var category = await _database.GetMenuCategoryAsync(day, slot) ?? (current != null && Categories.Contains(current.Category) ? current.Category : Categories[index]);
        var panel = new StackPanel { Spacing = 4, Margin = new Thickness(0, 4, 0, 8) };
        panel.Children.Add(new TextBlock { Text = $"{index + 1}.", FontWeight = Microsoft.UI.Text.FontWeights.SemiBold, FontSize = 12 });
        var select = new ComboBox { ItemsSource = Labels, SelectedIndex = Array.IndexOf(Categories, category), HorizontalAlignment = HorizontalAlignment.Stretch };
        var search = new AutoSuggestBox { PlaceholderText = L.Get("Text_Select_recipe_c2831b"), Text = current?.Name ?? "", FontSize = 13, DisplayMemberPath = "Name", TextMemberPath = "Name" };
        var status = new TextBlock { FontSize = 11, TextWrapping = TextWrapping.Wrap };
        bool saving = false;
        async Task SaveAsync(Recipe? recipe)
        {
            if (saving) return;
            saving = true;
            select.IsEnabled = search.IsEnabled = false;
            try
            {
                await _database.SaveMenuCategoryAsync(day, slot, category);
                if (recipe == null)
                {
                    if (entry != null) await _database.DeleteMenuEntryAsync(day, entry.Slot);
                    entry = null;
                }
                else
                {
                    var replacement = new MenuEntry { Date = day, Slot = slot, RecipeId = recipe.Id };
                    await _database.SaveMenuEntryAsync(replacement);
                    if (entry != null && entry.Slot != slot) await _database.DeleteMenuEntryAsync(day, entry.Slot);
                    entry = replacement;
                }
                status.Text = L.Get("Text_Saved_499dc6");
            }
            catch (Exception ex) { status.Text = L.Format("SaveError", ex.Message); }
            finally { saving = false; select.IsEnabled = search.IsEnabled = true; }
        }
        void Suggest() => search.ItemsSource = _recipes.Where(r => r.Category.Equals(category, StringComparison.OrdinalIgnoreCase) && r.Name.Contains(search.Text.Trim(), StringComparison.OrdinalIgnoreCase)).OrderBy(r => r.Name, StringComparer.CurrentCultureIgnoreCase).ToList();
        search.GotFocus += (_, _) => Suggest();
        search.TextChanged += async (_, args) =>
        {
            if (args.Reason != AutoSuggestionBoxTextChangeReason.UserInput) return;
            Suggest();
            if (string.IsNullOrWhiteSpace(search.Text)) await SaveAsync(null);
        };
        search.SuggestionChosen += async (_, args) => { if (args.SelectedItem is Recipe recipe) await SaveAsync(recipe); };
        select.SelectionChanged += async (_, _) =>
        {
            if (select.SelectedIndex < 0) return;
            category = Categories[select.SelectedIndex];
            search.Text = "";
            await SaveAsync(null);
            Suggest();
        };
        panel.Children.Add(select);
        panel.Children.Add(search);
        var clear = new Button { Content = L.Get("Text_Clear_719ea3"), FontSize = 11, Padding = new Thickness(6, 2, 6, 2) };
        clear.Click += async (_, _) => { search.Text = ""; await SaveAsync(null); };
        panel.Children.Add(clear);
        panel.Children.Add(status);
        return panel;
    }
}
