using DMS.Models;
using DMS.Services;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.UI;
using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Media;
using Windows.Foundation;
using L = DMS.Services.Localization;

namespace DMS.Views;

/// <summary>Experimental five-day A4 scaffold. It does not modify existing templates or output.</summary>
public sealed partial class TemplateBuilderV2Page : Page
{
    private readonly IDatabaseService _database;
    private int _generation;
    private bool _ready;
    private const double ContentWidth = 714;
    private const double DayAreaHeight = 1123 - 80 - 60 - 36 - 40;
    private const double DayGaps = 24;
    private const double MinimumDayHeight = 95;
    private const double MaximumDayHeight = 260;
    // At 96 DIP per inch, 14 DIP is approximately 10.5 pt on A4.
    private const double MaximumFont = 16;
    private const double MinimumFont = 14;

    public TemplateBuilderV2Page()
    {
        InitializeComponent();
        _database = App.Services.GetRequiredService<IDatabaseService>();
        PageTitle.Text = L.Get("TplV2Title");
        WeekPicker.Header = L.Get("TplPreview");
        HeaderText.Text = L.Get("String_Text_Weekly_Menu_69fa95");
        FooterText.Text = L.Get("String_Text_Prepared_with_care_by_DMS_082a78");
        WeekPicker.Date = DateTimeOffset.Now;
        _ready = true;
        Loaded += async (_, _) => await LoadWeekAsync();
    }

    private async void WeekPicker_DateChanged(CalendarDatePicker sender, CalendarDatePickerDateChangedEventArgs args)
    {
        if (_ready) await LoadWeekAsync();
    }

    private async Task LoadWeekAsync()
    {
        var generation = ++_generation;
        var day = WeekPicker.Date?.DateTime.Date ?? DateTime.Today;
        var monday = day.AddDays(-((7 + (int)day.DayOfWeek - 1) % 7));
        try
        {
            var entries = await _database.GetMenuAsync(monday, monday.AddDays(4));
            var recipes = await _database.GetAllRecipesAsync();
            var ingredients = await _database.GetAllIngredientsAsync();
            if (generation != _generation) return;
            DateText.Text = $"{monday:d} – {monday.AddDays(4):d}";
            RenderDays(monday, entries, recipes, ingredients);
        }
        catch (Exception ex)
        {
            if (generation == _generation) StatusText.Text = L.Format("MenuLoadError", ex.Message);
        }
    }

    private void RenderDays(DateTime monday, IReadOnlyList<MenuEntry> entries, IReadOnlyList<Recipe> recipes, IReadOnlyList<Ingredient> ingredients)
    {
        var byId = recipes.GroupBy(r => r.Id).ToDictionary(g => g.Key, g => g.First());
        var byName = ingredients.GroupBy(i => i.Name, StringComparer.OrdinalIgnoreCase).ToDictionary(g => g.Key, g => g.First(), StringComparer.OrdinalIgnoreCase);
        var days = Enumerable.Range(0, 5).Select(offset => entries.Where(entry => entry.Date.Date == monday.AddDays(offset) && byId.ContainsKey(entry.RecipeId))
            .OrderBy(entry => MenuOutputService.SlotOrder(entry.Slot)).Select(entry => (Slot: MenuOutputService.SlotOrder(entry.Slot), Recipe: byId[entry.RecipeId])).ToList()).ToArray();

        // Measure the actual WinUI text with wrapping at the A4 content width.
        // Allocate bounded space to each day and reduce fonts only to the legible floor.
        StackPanel[] panels = [];
        double[] needed = [];
        double[] heights = [];
        var available = DayAreaHeight - DayGaps;
        for (var font = MaximumFont; font >= MinimumFont; font -= .5)
        {
            panels = Enumerable.Range(0, 5).Select(index => BuildDay(monday.AddDays(index), days[index], byName, font)).ToArray();
            needed = panels.Select(panel => { panel.Measure(new Size(ContentWidth - 20, double.PositiveInfinity)); return panel.DesiredSize.Height + 16; }).ToArray();
            heights = AllocateHeights(needed, available);
            if (needed.Zip(heights, (n, h) => n <= h + .5).All(fits => fits)) break;
        }

        DaysGrid.Children.Clear();
        DaysGrid.RowDefinitions.Clear();
        var overflow = false;
        for (var i = 0; i < 5; i++)
        {
            DaysGrid.RowDefinitions.Add(new RowDefinition { Height = new GridLength(heights[i]) });
            var doesOverflow = needed[i] > heights[i] + .5;
            overflow |= doesOverflow;
            var scroller = new ScrollViewer { Content = panels[i], VerticalScrollBarVisibility = doesOverflow ? ScrollBarVisibility.Auto : ScrollBarVisibility.Disabled, HorizontalScrollMode = ScrollMode.Disabled };
            var border = new Border { Child = scroller, BorderThickness = new Thickness(1), BorderBrush = new SolidColorBrush(doesOverflow ? Colors.Red : Colors.LightGray), Padding = new Thickness(8), CornerRadius = new CornerRadius(4) };
            Grid.SetRow(border, i);
            DaysGrid.Children.Add(border);
        }
        StatusText.Text = L.Get(overflow ? "TplV2Overflow" : "TplV2ScaffoldNote");
    }

    private static double[] AllocateHeights(double[] needed, double available)
    {
        var result = needed.Select(value => Math.Clamp(value, MinimumDayHeight, MaximumDayHeight)).ToArray();
        var excess = Math.Max(0, result.Sum() - available);
        var adjustable = result.Sum(value => value - MinimumDayHeight);
        if (excess > 0 && adjustable > 0)
            for (var i = 0; i < result.Length; i++) result[i] -= Math.Min(excess, adjustable) * (result[i] - MinimumDayHeight) / adjustable;
        return result;
    }

    private static StackPanel BuildDay(DateTime day, List<(int Slot, Recipe Recipe)> entries, Dictionary<string, Ingredient> ingredients, double font)
    {
        var panel = new StackPanel { Spacing = 2 };
        panel.Children.Add(new TextBlock { Text = day.ToString("dddd, d MMMM"), FontSize = font + 1, FontWeight = Microsoft.UI.Text.FontWeights.SemiBold, Foreground = new SolidColorBrush(Colors.Black), TextWrapping = TextWrapping.Wrap });
        foreach (var (slot, recipe) in entries)
        {
            panel.Children.Add(new TextBlock { Text = $"{slot}. {recipe.Name}", FontSize = font, Foreground = new SolidColorBrush(Colors.Black), TextWrapping = TextWrapping.Wrap });
            if (recipe.Ingredients.Count > 0)
                panel.Children.Add(new TextBlock { Text = string.Join(", ", recipe.Ingredients), FontSize = font, Foreground = new SolidColorBrush(Colors.DimGray), TextWrapping = TextWrapping.Wrap });
            var allergens = recipe.Allergens.Concat(recipe.Ingredients.SelectMany(name => ingredients.TryGetValue(name, out var item) ? item.Allergens : []))
                .Distinct(StringComparer.OrdinalIgnoreCase).Select(L.Allergen).ToList();
            if (allergens.Count > 0) panel.Children.Add(new TextBlock { Text = "⚠ " + string.Join(", ", allergens), FontSize = font, Foreground = new SolidColorBrush(Colors.Black), TextWrapping = TextWrapping.Wrap });
        }
        return panel;
    }
}
