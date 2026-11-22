using System.Text.Json;
using DMS.Models;

namespace DMS.Services;

/// <summary>Creates an editable copy of a native template.</summary>
public static class TemplateConversion
{
    public static string DisplayName(MenuTemplate template)
    {
        if (!template.IsPreset || !SeasonalTemplateDefaults.All.Any(preset => preset.Name == template.Name))
            return template.Name;
        var key = "Preset" + template.Name.Replace(" ", "");
        return Localization.Get(key);
    }

    public static MenuTemplate ToEditableCopy(MenuTemplate source)
    {
        ArgumentNullException.ThrowIfNull(source);
        var copy = JsonSerializer.Deserialize<MenuTemplate>(JsonSerializer.Serialize(source))
            ?? throw new InvalidOperationException("Could not copy the template.");
        if (copy.Document == null) throw new InvalidOperationException("This template is not in the current native format.");
        if (copy.IsPreset)
        {
            if (copy.Document.HeaderText == TemplateDocument.DefaultHeader)
                copy.Document.HeaderText = Localization.Get("String_Text_Weekly_Menu_69fa95");
            if (copy.Document.FooterText == TemplateDocument.PresetFooter)
                copy.Document.FooterText = Localization.Get("PresetAllergenFooter");
        }
        return copy;
    }
}
