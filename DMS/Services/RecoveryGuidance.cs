using System.IO;

namespace DMS.Services;

/// <summary>Offline recovery steps that also work before localized resources load.</summary>
public static class RecoveryGuidance
{
    public static string Format(DatabaseRecoveryRequiredException error, string? language)
    {
        ArgumentNullException.ThrowIfNull(error);
        var english = language?.StartsWith("en", StringComparison.OrdinalIgnoreCase) == true;
        var backup = string.IsNullOrWhiteSpace(error.RecoveryPath)
            ? Path.Combine(Path.GetDirectoryName(error.DatabasePath) ?? "", "RestoreBackups")
            : error.RecoveryPath;
        if (english)
        {
            var backupInstruction = string.IsNullOrWhiteSpace(error.RecoveryPath)
                ? "The recovery file could not be identified. Find the correct backup in this folder before continuing:"
                : "Copy this recovery backup over the database file:";
            return "1. Close all DMS windows.\n\n" +
                "2. Preserve a copy of the current database and any matching -wal and -shm files in a safe folder:\n" + error.DatabasePath + "\n\n" +
                "3. " + backupInstruction + "\n" + backup + "\n\n" +
                "4. Only after preserving them, remove the old -wal and -shm files beside the database. Verify the recovery copy.\n\n" +
                "5. Then remove this recovery marker and reopen DMS:\n" + error.MarkerPath;
        }
        var bulgarianBackupInstruction = string.IsNullOrWhiteSpace(error.RecoveryPath)
            ? "Файлът за възстановяване не може да бъде определен. Намерете правилния архив в тази папка, преди да продължите:"
            : "Копирайте този резервен архив върху файла на базата данни:";
        return "1. Затворете всички прозорци на DMS.\n\n" +
            "2. Запазете копие на текущата база данни и на свързаните с нея файлове -wal и -shm на безопасно място:\n" + error.DatabasePath + "\n\n" +
            "3. " + bulgarianBackupInstruction + "\n" + backup + "\n\n" +
            "4. Едва след като ги запазите, премахнете старите файлове -wal и -shm до базата данни. Проверете възстановеното копие.\n\n" +
            "5. След това премахнете този маркер за възстановяване и отворете DMS отново:\n" + error.MarkerPath;
    }
}
