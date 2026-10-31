namespace DMS.Services;

/// <summary>The previous database needs explicit recovery before it may be opened.</summary>
public sealed class DatabaseRecoveryRequiredException : InvalidOperationException
{
    public string DatabasePath { get; }
    public string RecoveryPath { get; }
    public string MarkerPath { get; }

    public DatabaseRecoveryRequiredException(string databasePath, string recoveryPath, string markerPath, Exception? inner = null)
        : base(Instructions(databasePath, recoveryPath, markerPath), inner)
        => (DatabasePath, RecoveryPath, MarkerPath) = (databasePath, recoveryPath, markerPath);

    private static string Instructions(string databasePath, string recoveryPath, string markerPath)
        => $"DMS cannot open its database until it is recovered. Close all DMS windows. " +
           $"First copy the current database and any -wal and -shm files to a safe location: {databasePath}. " +
           $"Then copy the recovery backup over the database: {(string.IsNullOrWhiteSpace(recoveryPath) ? "path unavailable; inspect the RestoreBackups folder" : recoveryPath)}. " +
           $"Remove the old -wal and -shm files only after preserving them, verify the recovered copy, " +
           $"then remove the recovery marker and reopen DMS: {markerPath}.";
}
