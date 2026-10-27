# Windows development

The WinUI app and tests target .NET 10 and Windows 10 SDK 22621 or later.
The app references Windows App SDK 2.5.1 and uses the self-contained,
unpackaged deployment configuration. Check the project files for exact package
versions. These dependencies have been updated but have not yet been built or
run on Windows after the upgrade.

Install Visual Studio 2026 (18.0 or newer), the .NET desktop development
workload with Windows App SDK tools, and the .NET 10 SDK. Open `DMS.sln`, select
the x64 solution configuration, and restore packages. From a Windows terminal:

```powershell
dotnet restore DMS.sln -p:Platform=x64
dotnet build DMS.sln --configuration Release --no-restore -p:Platform=x64
dotnet test DMS.sln --configuration Release --no-build -p:Platform=x64
dotnet publish DMS/DMS.csproj --configuration Release --runtime win-x64 --self-contained true --no-restore -p:Platform=x64 --output artifacts/DMS-win-x64
```

Before relying on the upgraded app, run it from Visual Studio and the published
output. Check startup and window icons, BG/EN switching and restart, recipe and
ingredient edits, menu assignment, and backup/restore using disposable test
data. Verify any existing database with a backup and a copy first. Check the
Windows build and test results rather than treating the version update as
evidence of compatibility.

The test project currently uses the final xUnit v2 release with the current
Visual Studio adapter; xUnit v3 is a separate framework migration.

## Menu templates and output

The template editor previews a chosen saved week and stores common formatting,
visibility settings, and one embedded PNG/JPEG background image (up to 1 MB).
The planner's Print / Export dialog renders the selected saved week and template
through WebView2. It needs the WebView2 Runtime and supports A4 PDF, print, and
single-page PNG; an overflowing PNG is rejected instead of silently cropped.

This is not complete browser-editor parity. In particular, formatting a text
selection, independently positioned multi-image layers, and several per-section
fonts and border controls remain unimplemented. Imported browser JSON is retained,
but rich HTML is reduced to plain text in the native editor, and image filenames
cannot recover image files that were not included in an export. The output UI
warns when an imported template may need adjustment.

On Windows, exercise five-day menu navigation and category selection; save,
reopen and copy templates; test all supported font, color, alignment and image
options; preview two saved weeks; export PDF and PNG; print with an image; try a
long menu, missing WebView2, malformed/legacy templates, missing images, and a
cancelled file picker. Test light/dark and accent settings after switching
languages and restarting. Use disposable data and verify the database and saved
files. No Windows results have yet been recorded for this implementation.
