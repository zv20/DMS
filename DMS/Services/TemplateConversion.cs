using System.Text.Json;
using DMS.Models;

namespace DMS.Services;

/// <summary>Creates an editable copy of a native template.</summary>
public static class TemplateConversion
{
    public static MenuTemplate ToEditableCopy(MenuTemplate source)
    {
        ArgumentNullException.ThrowIfNull(source);
        var copy = JsonSerializer.Deserialize<MenuTemplate>(JsonSerializer.Serialize(source))
            ?? throw new InvalidOperationException("Could not copy the template.");
        if (copy.Document == null) throw new InvalidOperationException("This template is not in the current native format.");
        return copy;
    }
}
