namespace DMS.Services;

/// <summary>Shared menu ordering used by the native template renderer.</summary>
public static class MenuOutputService
{
    public static int SlotOrder(string slot) => slot.ToLowerInvariant() switch
    {
        "breakfast" => 1,
        "lunch" => 2,
        "dinner" => 3,
        _ => 4
    };
}
