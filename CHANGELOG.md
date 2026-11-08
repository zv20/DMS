# Changelog

## 0.0.10

- Added an option to launch DMS when the installer finishes.

## 0.0.9

- Added a visible MSI setup wizard with installation progress and a completion screen.

## 0.0.8

- Fixed MSI installation being blocked by a leftover entry from the previous EXE installer.

## 0.0.7

- Replaced the EXE installer with a per-user Windows MSI installer. Uninstall the previous EXE installation before installing the MSI; DMS data is stored separately.
- Added automatic backups and improved empty search states.
- Released list data when leaving pages to reduce memory use.

## 0.0.6

- Refreshed the recipe, ingredient, and allergen lists with a more compact look and clearer actions.
- Show meal numbers beside the selected recipes in the weekly and monthly planner.
- Save the main window's last normal size and position before closing.
- Show a helpful message when a recipe, ingredient, or allergen name already exists.
- Improved database backup restore validation.

## 0.0.5

- Added Template Builder undo and redo controls with Ctrl+Z and Ctrl+Y shortcuts.
- Added a canvas-background option for template images, plus compact icon controls for image alignment.
- Set new template canvas zoom to 70% and default day/meal spacing to 1.
- Removed obsolete pre-native template records automatically and prevented them from appearing in Saved Templates.
- Improved print-preview state handling and made protected built-in artwork display a friendly message instead of an error.

## 0.0.4

- Added direct PDF saving from Menu Planner, so exporting no longer requires selecting Microsoft Print to PDF.
- Renamed image export to **Save image** and added a PNG/JPEG format picker.
- Standardized image and PDF suggestions to the selected date range, for example `03-11-2026-05-11-2026`.
- Made recipe portion size a numeric grams field.
- Added an obvious Delete action with confirmation to Saved Templates; built-in templates remain protected.
- Removed the PDF export dependency after review, avoiding vulnerable transitive image packages.

## 0.0.3-a

- Completed the native WinUI 3 cleanup: removed browser/Electron compatibility paths and unused legacy template output code.
- Added four built-in seasonal menu templates and their artwork.
- Improved the template builder with direct block selection, unified color/transparency controls, recent color swatches, and roomier seasonal typography.
- Centered the startup window and saved/restored the main window size and placement.
- Hardened the release tests around built-in preset seeding.
