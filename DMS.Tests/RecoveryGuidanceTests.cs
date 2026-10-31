using DMS.Services;
using Xunit;

namespace DMS.Tests;

public sealed class RecoveryGuidanceTests
{
    [Theory]
    [InlineData("en")]
    [InlineData("bg-BG")]
    public void GuidanceIncludesAllLocationsAndPreservationSteps(string language)
    {
        var error = new DatabaseRecoveryRequiredException(@"C:\DMS\dms.db", @"C:\DMS\RestoreBackups\before.db", @"C:\DMS\dms.db.recovery-required");
        var guidance = RecoveryGuidance.Format(error, language);
        Assert.Contains(error.DatabasePath, guidance);
        Assert.Contains(error.RecoveryPath, guidance);
        Assert.Contains(error.MarkerPath, guidance);
        Assert.Contains("-wal", guidance);
        Assert.Contains("-shm", guidance);
    }

    [Fact]
    public void MissingBackupPathPointsToRecoveryFolder()
    {
        var path = Path.Combine(Path.GetTempPath(), "dms", "dms.db");
        var error = new DatabaseRecoveryRequiredException(path, "", path + ".recovery-required");
        Assert.Contains(Path.Combine(Path.GetDirectoryName(path)!, "RestoreBackups"), RecoveryGuidance.Format(error, "en"));
    }
}
