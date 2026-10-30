using DMS.Services;
using Xunit;

namespace DMS.Tests;

public sealed class InstallerRequestTests
{
    [Fact]
    public void ReadsInstallerChoicesAndPreservesUnicodeBackupPath()
    {
        var path = Path.GetTempFileName();
        try
        {
            File.WriteAllText(path, "[Setup]\nLanguage=bg\nBackup=C:\\Архиви\\меню=db.db\n");
            var request = InstallerRequest.Read(path);
            Assert.Equal("bg", request.Language);
            Assert.Equal("C:\\Архиви\\меню=db.db", request.Backup);
        }
        finally { File.Delete(path); }
    }

    [Fact]
    public void IgnoresOtherSectionsAndUnsupportedLanguages()
    {
        var path = Path.GetTempFileName();
        try
        {
            File.WriteAllText(path, "[Other]\nBackup=ignored.db\n[Setup]\nLanguage=fr\nBackup=\n");
            var request = InstallerRequest.Read(path);
            Assert.Null(request.Language);
            Assert.Null(request.Backup);
        }
        finally { File.Delete(path); }
    }
}
