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

Template Builder V2 and Print / Export V2 use a shared native WinUI A4 renderer.
V2 templates are stored separately from V1 selections in the same template database
and included in existing backup/export. The V2 output page prevents printing and
PNG export when the page overflows. PDF uses the Windows print dialog: choose
Microsoft Print to PDF. Native print, PDF and PNG require Windows validation;
printer imageable margins may scale the document. See WINDOWS_DEBUG_CHECKLIST.md.

The template editor previews a chosen saved week and stores formatting and
visibility settings. New templates can use a movable A4 canvas with positioned
text and embedded image layers. Existing flowing templates retain their old layout
until the user enables the canvas. Canvas templates use saved page positions
instead of the output dialog's margin setting.
The planner's Print / Export dialog renders the selected saved week and template
through WebView2. It needs the WebView2 Runtime and supports A4 PDF, print, and
single-page PNG; an overflowing PNG is rejected instead of silently cropped.
The canvas snaps moving objects to guides and supports one-pixel arrow-key nudges
when an object has focus. The output preview checks rendered text for overlaps and
box/page overflow and warns without preventing print. Images may intentionally
overlap text; images outside the page are flagged. Preview documents are supplied
in memory rather than through WebView2's size-limited NavigateToString API. Image
imports are limited to 4 MiB each and 16 MiB of combined encoded image data.

Canvas templates support contextual text formatting, per-block backgrounds and
borders, rich header/footer runs, image fit/rotation/layer controls, bounded menu
auto-fit, and a 50-step visual undo/redo history. Imported browser JSON is
retained, but image filenames cannot recover image files that were not included
in an export. The output UI warns when an imported template may need adjustment.

On Windows, exercise five-day menu navigation and category selection; save,
reopen and copy templates; test all supported font, color, alignment and image
options; move and resize the header, date, day heading, menu, footer and multiple
overlapping images; test snapping, keyboard nudging, overlap and overflow warnings,
including weeks with long recipes; reorder layers; save and reopen the template; compare their
positions with print, PDF and PNG; test a legacy template before and after enabling
the canvas; preview two saved weeks; export PDF and PNG; print with an image; try a
long menu, missing WebView2, malformed/legacy templates, missing images, and a
cancelled file picker. Test light/dark and accent settings after switching
languages and restarting. Use disposable data and verify the database and saved
files. Run `node scripts/test-template-layout-diagnostics.js` for a small mocked
geometry check. No Windows results have yet been recorded for this implementation.
