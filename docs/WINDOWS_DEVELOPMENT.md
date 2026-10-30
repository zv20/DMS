# Windows development

The WinUI app and tests target .NET 10 and Windows 10 SDK 22621 or later.
The app references Windows App SDK 2.5.1 and uses the self-contained,
unpackaged deployment configuration. Check the project files for exact package
versions. Confirm restore, build, test and runtime results for the specific
revision being used; this guide does not certify a build.

Install Visual Studio 2026 (18.0 or newer), the .NET desktop development
workload with Windows App SDK tools, and the .NET 10 SDK. Open `DMS.sln`, select
the x64 solution configuration, and restore packages. From a Windows terminal:

```powershell
dotnet restore DMS.sln -p:Platform=x64
dotnet build DMS.sln --configuration Release --no-restore -p:Platform=x64
dotnet test DMS.sln --configuration Release --no-build -p:Platform=x64
dotnet publish DMS/DMS.csproj --configuration Release --runtime win-x64 --self-contained true --no-restore -p:Platform=x64 --output artifacts/DMS-win-x64
```

Before relying on a build, run it from Visual Studio and the published
output. Check startup and window icons, BG/EN switching and restart, recipe and
ingredient edits, menu assignment, and backup/restore using disposable test
data. Verify any existing database with a backup and a copy first. Check the
Windows build and test results rather than treating the version update as
evidence of compatibility.

The test project currently uses the final xUnit v2 release with the current
Visual Studio adapter; xUnit v3 is a separate framework migration.

## Menu templates and output

Template Builder and Print / Export use the same native WinUI A4 renderer. The
planner button opens a Print / Export popup for the selected date. Output provides a
default template, and saved templates can be selected. Output is blocked if the
page overflows. PDF uses the Windows print dialog: choose Microsoft Print to PDF.
Printer imageable margins may scale the document.

Weekend menus are included when weekend planning is enabled in Settings. Empty
days can be hidden, and fixed day heights are preserved. Test both short and long
weeks: seven full days may exceed the single-page limit and require adjustments.

Browser-era templates can be opened as approximate editable copies and saved
under a new name. Some legacy geometry, rich text, image layers and visibility
options cannot be reproduced; review the copy before printing. The current native
template document is stored under `Document`. Older native templates serialized
under `V2` are not automatically migrated. Preserve backups and verify imports on
a disposable database before relying on them. Legacy HTML rendering code remains
for compatibility regression tests, not as an app output path. See the
[Windows debug checklist](WINDOWS_DEBUG_CHECKLIST.md) for runtime checks.

## Data and language

The default SQLite database is `%APPDATA%\DMS\dms.db`; Settings displays the
actual path. Settings provides SQLite backup and restore and JSON import/export.
Import creates a pre-import SQLite backup in the database folder; restore replaces
the active database. Test these operations with disposable data, and make a
backup before using existing data. When changing language in Settings, the user
can cancel or confirm the window reload; the confirmed language persists.

This guide is not a record of test execution. Record the commit, Windows version,
build/test results and runtime findings separately when validation is performed.
