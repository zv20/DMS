# Changelog

## Unreleased

- Improve planner recipe and ingredient selection, including remembered list view preferences.
- Strengthen backup image integrity checks and automatic-backup finalization.
- Add an opt-in clean-uninstall choice that can also remove local DMS data.

## 0.1.8

- Store template images as verified files beside the database instead of SQLite BLOBs, reducing database size while preserving existing templates.
- Create portable DMS backup archives containing the database, template images, and validation manifest; keep legacy database backups restorable.
- Harden automatic backup finalization on Windows.

## 0.1.7

- Keep each day’s meals together across template preview, print, PDF and image export.
- Choose localized day headings and date ranges, and use eight additional fonts offline.
- Gain canvas space with a settings dropdown and floating zoom controls. Select template blocks by keyboard.
- Show localized preset titles, names and artwork labels while preserving custom text.
- Simplify Settings and improve navigation contrast and accessibility.
- Validate more backup data before restore and handle special characters in backup filenames.

## 0.1.6

- Skip caching an installed .NET runtime
- Keep downloaded prerequisites out of release assets

## 0.1.5

- Download Microsoft runtimes with DMS setup

## 0.1.4

- Fix Windows build and installer warnings
- Keep navigation icons visible in compact pane
- Add separate diagnostics retention and activity logging
- Simplify test and release workflows

## 0.1.3

- Adjust navigation pane width when opened

## 0.1.2

- Added a collapsible side navigation panel controlled by the title-bar menu button.
- Reduced the title-bar height to give more space to the planner.
- Removed unused resources and consolidated shared catalog status handling.
- Automated patch releases after Windows tests and installer checks pass.

## 0.1.1

- Improved the installer to identify updates and show release history.
- Added an automatic, verified backup before updating an existing installation.
- Stop updates when DMS is open or the backup cannot be created.

## 0.1.0

- Added four simple seasonal menu templates.
- Added seven kid-friendly templates for the seasons, Christmas, Easter, and rainy days.

## 0.0.16

- Added a first-run setup with live planner previews for language, appearance, meal count, categories, and weekends.
- Added an option in Settings to run setup again.
- Added a backup warning and confirmation before changing meals per day clears saved menu plans.
- Made saved meal categories removable in Settings.

## 0.0.15

- Kept the selected recipe, ingredient, or allergen highlighted while its editor is open.
- Adjusted weekly planner recipe suggestions to fit within the window.
- Simplified template output so ingredients containing allergens are highlighted without a separate allergen list.
- Strengthened backup restore validation and added limits for template images.
- Improved the safety of installer upgrade checks and simplified shared application code.

## 0.0.14

- Moved navigation to the top, with highlighted selection and a compact icon layout for narrower windows.
- Opened Settings sections by default.
- Improved the weekly planner with aligned meal rows, more space for recipe names, and a confirmed action to clear a day.
- Added Backspace support for clearing a selected meal.

## 0.0.13

- Improved the Windows build and test pipeline, including automated checks for database recovery, performance, packaging, and installation upgrades.
- Added performance measurements for startup, navigation, image-heavy templates, and menu exports.
- Fixed Visual Studio solution platform mappings for Windows development.

## 0.0.12

- Made meal categories and the number of meals per day configurable, with additional pages for larger menus when needed.
- Refreshed the planner, settings, and lists, including clearer day borders, theme-colored hover states, and separate print and export actions.
- Improved the weekly planner layout and recipe selection at narrow window sizes.
- Added searchable ingredient and allergen pickers and improved dropdown dismissal.
- Added selectable allergen icons and a color picker, and improved the Template Builder color picker with transparency and recent colors.
- Simplified diagnostic log filters and settings navigation.
- Preserved deleted default allergens across app restarts and updates.
- Strengthened backup restore validation and improved planning and print resource handling.

## 0.0.11

- Reduced memory use when browsing and editing templates with images.
- Released page previews, image resources, and event handlers when they are no longer needed.
- Improved Template Builder undo history and added a guided memory diagnostic capture for developers.
- Improved template and menu planner performance.

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
