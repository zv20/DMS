using DMS.Services;
using Xunit;

namespace DMS.Tests;

public sealed class AppTourPlanTests
{
    [Fact]
    public void StepsCoverTheFiveCoreAreasInNavigationOrder()
    {
        var steps = AppTourPlan.Steps;

        Assert.Equal(["menu", "recipes", "ingredients", "templateBuilder", "settings"], steps.Select(step => step.NavigationTag));
        Assert.Equal(5, steps.Count);
    }
}
