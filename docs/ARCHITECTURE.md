# DMS native architecture

This guide describes the WinUI 3 source on `winUI3`. The browser app remains a
behavioral reference; its historical architecture is in [the archive](archive/ARCHITECTURE.md).
Source descriptions here do not establish Windows build or runtime results.

## Application and navigation

`DMS.sln` contains the native `DMS` application and `DMS.Tests` test project.
`DMS/App.xaml.cs` configures services, loads settings and opens the main window.
`DMS/MainWindow.xaml` and `DMS/Services/NavigationService.cs` connect the menu
planner, recipes, ingredients, allergens, template builder and settings pages.
Pages with unsaved edits participate in navigation confirmation.

## Storage and data management

`DMS/Services/DatabaseService.cs` uses `Microsoft.Data.Sqlite`, with a default
database at `%APPDATA%\DMS\dms.db`. It stores recipes, ingredients, allergens,
menu entries and categories, settings and serialized templates. It enables WAL
and foreign keys and tracks schema information. The Settings page displays the
active path and exposes a single full SQLite backup and restore workflow.
SQLite backup uses the database backup API and includes all saved image bytes.

The shared image library stores PNG/JPEG bytes once in SQLite. Saved templates
reference image IDs; the editor hydrates them for preview and output. ZIP data
archives include reference-only template JSON and separate binary image files,
including unused library images. Library deletion lists affected saved templates
and requires confirmation before deleting those templates and the image together.

Browser JSON import handles legacy fields and maps recipe references. Imports
and restores should be tested using disposable data and a separate backup;
feature parity and failure recovery require Windows verification. Browser
files under `index.html`, `js/`, `css/`, `img/` and `data/` remain useful as
reference and may support the separate demo workflow.

## Menu, templates and output

The planner uses date and meal-slot entries and supports weekly and monthly
views. Settings controls whether weekend planning is enabled.
`TemplateBuilderPage` edits a `TemplateDocument` within the saved
`MenuTemplate`. `TemplatePageLayout`, `TemplatePageImages`, and
`TemplateRenderer` produce a native A4 page. The same renderer supplies the
builder and `TemplateOutputPage`, which supports PNG and Windows printing,
including Microsoft Print to PDF. The renderer reports overflow so the output
page can block a document that does not fit.

Older template formats can be opened as approximate editable copies through
`TemplateConversion`; conversion can lose unsupported formatting or geometry.
Validate imported templates before use.

## Localization and appearance

Resources live in `DMS/Strings/en-US` and `DMS/Strings/bg-BG`. Localization
applies the saved preference before constructing the window; changing the
language in Settings prompts before recreating the window. The localization
checker and detailed editing instructions are in [the translations guide](../DMS/Strings/README.md).
Theme and accent selection are managed by `AppearanceService`.

## Build and verification

The release workflow restores, builds and tests on Windows, then creates a
self-contained portable ZIP and Inno Setup installer for a tag or manual run.
Its existence does not imply a particular run succeeded. See
[Windows development](../WINDOWS_DEVELOPMENT.md), [debug checklist](../WINDOWS_DEBUG_CHECKLIST.md),
and [installer guide](../INSTALLER.md) for current commands and checks.
