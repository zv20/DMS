# DMS → Native Windows (WinUI 3) Migration Plan

> **Historical reference:** This document describes an earlier project state. For current guidance, see [native architecture](../ARCHITECTURE.md), [roadmap](../ROADMAP.md), and [Windows development](../../WINDOWS_DEVELOPMENT.md).


**App:** DMS — kitchen/restaurant menu planner  
**Current:** Vanilla JS SPA, no framework, no build step, open `index.html` in browser (v14.8, branch `beta`)  
**Target:** Native Windows desktop app — WinUI 3 (Windows App SDK) + C# + XAML  
**Repo:** `zv20/DMS`, active branch `winUI3`
**Constraint:** WinUI 3 compiles only on Windows (Visual Studio 2022 + Windows App SDK workload). This Mac can author C#/XAML and design, but build/test/package must run on a Windows machine. The current project targets Windows SDK 22621, so its first native validation must be on Windows 11 or the supported target must be deliberately lowered.

## Current implementation snapshot

The native project is no longer an empty scaffold. It has a WinUI shell, navigation, SQLite-backed CRUD pages for recipes, ingredients, allergens, a weekly menu, settings, and a basic template editor. It also has a Windows GitHub Actions workflow.

The following are implemented in source but **not yet Windows-validated**: SQLite schema initialization and maintenance, browser/native JSON import, JSON export, SQLite backup/restore, menu recipe assignment, and native page navigation. The browser implementation remains the behavioral specification until every workflow below is verified.

Known parity gaps remain: monthly planning and saved-menu history; the rich five-layer template builder and its six presets; native print/PDF/image output; immediate BG/EN localization; configurable accent/theme behavior; a test project; and installer/runtime evidence. Do not describe this branch as release-ready until the Windows validation checklist is completed.

---

## Goal

Replace the browser-delivered HTML/CSS/JS front end with a native Windows UI while preserving all business workflows: recipes/ingredients/allergens CRUD, weekly/monthly menu planning, template builder with image layers, BG/EN i18n, local-first storage, A4/Windows printing, and backup/restore.

## Why WinUI 3 instead of Electron

The existing `WINDOWS_MIGRATION_PLAN.md` proposes Electron. WinUI 3 is the native alternative:

| Concern | Electron | WinUI 3 (Windows App SDK) |
|---|---|---|
| UI | Chromium-rendered HTML/CSS | Native Windows controls (XAML) |
| Runtime | Bundles Chrome (~100+ MB) | Uses OS WinUI framework (smaller) |
| Printing | `window.print()` / html2canvas | Native `PrintDocument` + printer dialogs |
| File access | File System API (Chromium only) | `StorageFolder`/file pickers + SQLite, any drive |
| OS integration | Limited | Notifications, taskbar, jump lists, file associations |
| Build | Cross-platform (works on Mac) | Windows only (Visual Studio 2022) |

Trade-off accepted: we lose cross-platform builds; we gain a truly native Windows app. The web codebase is not deleted — it stays as the reference implementation and source of truth for business rules until the cutover.

---

## What carries over (source of truth)

- Business logic and data schema: recipes, ingredients, allergens, menu (date-keyed meals), settings, templates (JSON shape in `store.js`/`storage-adapter.js`)
- i18n keys and translations (`js/i18n.js`, BG default / EN) — ported to WinUI `.resw` resource files
- Template presets (`js/template-presets.js`, 6 presets)
- Assets: `img/logo.png`
- Versioning discipline (manual `?v=14.8`-style bumps)

## What gets replaced

| Web layer | WinUI 3 replacement |
|---|---|
| `index.html` + CSS layout | `MainWindow.xaml` + `NavigationView` + XAML `Page`s |
| JS modules (`store.js`, `render.js`, `ui.js`, …) | C# view-models/services + code-behind |
| File System API / IndexedDB | SQLite (Microsoft.Data.Sqlite) in `%APPDATA%\DMS` + optional `StorageFolder` picker |
| `html2canvas` + `jsPDF` | WinUI printing (`PrintDocument`, `PrintManager`) + PDF export |
| DOM `data-i18n` translation | `.resw` resource strings + `x:Uid` |
| Browser splash/header/nav | XAML chrome: title bar, `NavigationView`, content frame |

---

## Phases

### Phase 0 — Environment & Discovery (Windows)
**Deliverable:** Windows build machine ready; blank WinUI 3 solution compiles and runs an empty window.

1. Provision Windows 10/11 VM or physical machine.
2. Install Visual Studio 2022 (Community) with **"Desktop development with C++"** and **"Universal Windows Platform development"** workloads; install the **Windows App SDK** (WinUI 3) templates.
3. Create a blank **WinUI 3 Desktop (Unpackaged or Packaged)** app project in C#. Confirm `dotnet build` / VS produces `DMS.exe` and a window opens.
4. Decide packaged (MSIX, `LocalFolder` is app-container isolated) vs unpackaged (plain `.exe`, SQLite path fully under our control). Recommendation: **unpackaged** for phase 1–7 (easier file paths, matches current "user picks a folder" model), revisit MSIX for Phase 8.
5. Add NuGet packages: `Microsoft.Data.Sqlite`, `CommunityToolkit.WinUI` (optional helpers).
6. Verify the existing `DMS.sln`, `DMS/DMS.csproj`, `App.xaml`, and `MainWindow.xaml` project on that machine; do not create a second scaffold.

### Phase 1 — Shell & Navigation
**Deliverable:** App launches to a native window with header, navigation, and empty page frames matching the current SPA layout.

1. `App.xaml.cs` — `OnLaunched` → create `MainWindow`, set title `Детско меню / DMS`.
2. `MainWindow.xaml` — top bar (logo, clock, language switcher, sync indicator), `NavigationView` with items: Menu Planner, Recipes, Ingredients, Allergens, Settings, Template Builder; `Frame` for page content.
3. XAML `Page`s (stubs): `MenuPage`, `RecipesPage`, `IngredientsPage`, `AllergensPage`, `SettingsPage`, `TemplateBuilderPage`.
4. Navigation service mapping `ui.navigateTo(pageId)` → `Frame.Navigate(typeof(Page))`.
5. Window chrome: splash screen on first launch (show logo while data loads), close splash on ready.
6. Verify: app opens, switching nav items swaps pages, no crashes.

### Phase 2 — Data Layer (SQLite)
**Deliverable:** Local-first SQLite storage in `%APPDATA%\DMS` with full CRUD replacing `storage-adapter.js`/`store.js`.

1. Folder layout under `%APPDATA%\DMS`: `data/`, `backups/`, `exports/`, `documents/`, `logs/` (matches existing migration plan).
2. C# models: `Recipe`, `Ingredient`, `Allergen`, `MenuEntry`, `AppSettings`, `MenuTemplate` — mirror current JSON schema.
3. `DatabaseService` (SQLite): init schema on first run, migrations for schema versioning.
4. `Repository` layer per entity: `Save`, `GetAll`, `GetById`, `Delete`, `ExportAll`, `ImportAll`.
5. `SettingsService`: language (bg/en default bg), theme, storage path, last-opened folder.
6. Seed: on first run with empty DB, optionally import from the existing web `data/*.json` if present (one-time migration path).
7. Verify: add/edit/delete persists across app restarts.

### Phase 3 — Core CRUD Pages (XAML)
**Deliverate:** Working Menu Planner, Recipes, Ingredients, Allergens pages with full validation.

For each page, build XAML UI + C# code-behind (or MVVM view-model):

1. **RecipesPage** — table with sort, search filter, category filter (Soup/Main/Dessert/Other), Add/Edit/Delete modals. Fields: name, category, portion, calories, ingredients, allergens (auto + manual), instructions.
2. **IngredientsPage** — list, search, Add/Edit modal with allergen combobox.
3. **AllergensPage** — list with color picker, Add/Edit/Delete.
4. **MenuPage** — weekly + monthly calendar view, meal slots per day, add/clear meals, month navigation (`←`/`→`), current month header.
5. Shared: combobox/autocomplete widget, modal dialog pattern, tag-container for ingredients/allergens, busy/sync indicator.
6. Reuse translation keys from `i18n.js` (BG/EN).

### Phase 4 — Settings & Data Management
**Deliverate:** Settings page with language switch, storage folder change, export/import backup.

1. Language switcher (BG default / EN) persisted to SQLite + applied immediately.
2. Theme switch (default/dark/teal) via `RequestedTheme` / `ResourceDictionary`.
3. **Change Storage Folder** — `FolderPicker`, update active data path.
4. **Export Data** — write all tables to a single `.json` backup, save-file picker.
5. **Import Data** — file open picker, validate JSON, import into SQLite (with pre-import backup).
6. Storage info banner showing active backend (SQLite path).

### Phase 5 — Template Builder
**Deliverate:** XAML-based template designer with live preview, replacing the DOM/CSS builder.

1. Sidebar with 4 accordion steps: Background (up to 5 image layers), Header, Weekly Menu, Footer.
2. Preview panel (800px wide) rendering the template with current settings.
3. Image library: upload, select, delete background images (`WriteableBitmap`, `StorageFile`).
4. Save/Load/Delete named templates; 6 built-in presets ported from `template-presets.js`.
5. Font/color/alignment controls bound to preview.
6. Note: pixel-perfect print layout requires careful XAML measure/arrange; iterate against printed output.

### Phase 6 — Printing & PDF Export
**Deliverate:** Print current menu to any Windows printer; export PDF.

1. `PrintService` using `Windows.Graphics.Printing.PrintManager` + `PrintDocument` with custom print template XAML (A4 portrait, margins).
2. "Print Menu" → system print dialog → print → (auto-close equivalent: return to app).
3. "Save as PDF" — print to **Microsoft Print to PDF** or generate via a PDF library; save-file picker.
4. "Save as Image" — render preview panel to `RenderTargetBitmap` → save PNG.
5. Print audit log entry per print job.

### Phase 7 — Localization & Hardening
**Deliverate:** BG/EN localized app, error handling, logging.

1. `.resw` resource files (`Strings/en/Resources.resw`, `Strings/bg/Resources.resw`) with all UI strings from `i18n.js`.
2. All XAML uses `x:Uid`; all C# user-visible strings loaded from resources.
3. Try/catch boundaries around file/DB/print operations with user-visible error dialogs.
4. `logs/` append-only file log.
5. Manual regression pass (no automated tests exist in web either): CRUD × 3 languages, print, backup/restore, template save/load.

### Phase 8 — Packaging & Release
**Deliverate:** Installable Windows app.

1. App icon, publisher name, version, `Package.appxmanifest` (if MSIX).
2. MSIX package via Windows Application Packaging Project, or continue as standalone `.exe` + installer (Inno Setup / WiX) if unpackaged.
3. Code-signing certificate (internal or public CA).
4. Build pipeline (GitHub Actions self-hosted Windows runner, or Azure Pipelines) building on `main` push.
5. Release notes, installer distribution.

---

## Definition of Done

DMS installs and runs as a native Windows app (WinUI 3), retains data reliably across restarts/upgrades in `%APPDATA%\DMS`, supports responsive templates, prints correct A4 documents via Windows printers, exports/imports backups, switches BG ↔ EN, remains local-first, and has a documented path to MSIX packaging and future sync/multi-terminal support.

---

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| **WinUI 3 needs Windows** — can't compile on this Mac | Author C#/XAML here; do all builds/tests/releases on a Windows VM/machine. |
| **File System API → SQLite** changes save semantics | Keep a "choose folder" option via `FolderPicker`; expose the data path in Settings so users can back up the folder manually. |
| **html2canvas/jsPDF → native print** may shift layout | Build the print template XAML carefully; iterate with real printer/PDF output; keep pixel tolerances loose. |
| **Template builder complexity** (78 KB monolith ported) | Port incrementally step-by-step (Background → Header → Menu → Footer), preview after each. |
| **No automated tests** | Manual regression checklist per phase; add unit tests for `DatabaseService`/`Repository` as we go. |
| **Two migration plans (Electron vs WinUI 3)** | Mark `WINDOWS_MIGRATION_PLAN.md` (Electron) as superseded; this document is the active plan. |

---

## Suggested next step

Provision the Windows machine and complete Phase 0 (blank WinUI 3 solution that opens a window). Once that compiles, we can port the data layer (Phase 2) and pages one at a time, keeping the existing web SPA as the reference until cutover.
