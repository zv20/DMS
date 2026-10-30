# Windows debug checklist

Run `DMS` in the x64 Debug configuration from Visual Studio. Use disposable test
data or make a backup before testing import, restore, conversion or deletion.

## Startup and language

- [ ] Check startup, taskbar icon, EN/BG switching and restart.
- [ ] Try shrinking the main window below 960×640 logical client pixels: native resizing should stop at the scaled minimum (or the monitor work area if smaller). Check 100%, 125%, 150% and 200% scaling, moving between monitors, maximize/restore, minimize/restore, snapping and language reload. Confirm the startup window keeps its separate sizing and the app fits small displays.
- [ ] In Appearance, check Default uses the original orange (#FD7E14), light gray (#F8F9FA) and white palette, and explains why the accent selector is unavailable. Change to Light, Dark and System and verify the saved custom accent is restored. Restart with each theme; check both languages and Windows high contrast.
- [ ] Change the language in Settings and cancel the reload confirmation. Confirm the original language remains selected after reopening Settings and restarting. Confirm a language change, verify the window reloads in the selected language, and restart to verify it persists.
## Data and planner

- [ ] Create and reopen an ingredient, allergen and recipe, and assign four meals to a menu.
- [ ] Resize the app from wide to narrow and short and back. Check navigation, planner headers and weekly/monthly cards with weekends on and off; days should reflow in date order without losing an active edit or save. Verify recipe, ingredient and allergen toolbars and editors, Settings, template builder and Print / Export remain usable in both languages.
- [ ] Back up and restore a disposable SQLite database, and import/export representative JSON including browser data. Verify the pre-import backup, recovery from invalid JSON, and persisted values after restart.

## Template builder

- [ ] Confirm Print / Export is accessed from the planner button, opens in a centered popup for the chosen week, and closes back to the planner. Resize the window and confirm the entire preview fits.
- [ ] Click the canvas header and footer to edit; format, zoom, save, reopen and confirm the values persist. Click outside the canvas or press Escape and confirm its toolbar closes.
- [ ] Open the template builder's File menu and confirm it opens below the button when space permits. Verify New, Saved templates, Save and Delete, including the current-template checkmark, unsaved-change confirmation and disabled Delete for new or preset templates. Check the menu in both languages and with keyboard navigation.
- [ ] Use File → Add image for PNG/JPEG, and cancel the picker once. Select and drag the image at 50%, 100% and 200% zoom; confirm it stays inside the page, Escape cancels a drag and the toolbar follows. Test alignment, dimensions/proportions, transparency, layer order and deletion. Use the image selector for images hidden behind text. Compare Behind text, In front of text and Keep text clear; only clearance should change automatic text layout, and overflow must still block output.
- [ ] Save a template with images and reopen it after restart. Create a SQLite backup and JSON export, delete the disposable template, then restore/import each and verify image bytes, placement, transparency and layers. Verify preview/PNG/PDF/print match without requiring the original source image file. Check an existing full-page background opens as an editable image with its fill and opacity retained.
- [ ] Expand and collapse Canvas settings and Image settings independently. Resize between the right sidebar and bottom-panel layouts; confirm the desktop sidebar spans the page's full height alongside the File/week toolbar, both arrows remain visible, long EN/BG labels wrap and no horizontal scrolling is needed for settings. Confirm zoom controls stay below settings, the canvas has no full-width instruction footer, and errors/overflow warnings remain readable in the settings panel. Confirm day heights are under Canvas settings and image controls are under Image settings. Change font, size and color from a selected block's toolbar, and header reflection from the header toolbar.
- [ ] In a meal toolbar, select ingredients or allergens and change the allergen ingredient color; confirm it applies to all days. Click a page margin to change the page background and text-shrink settings. Check these settings after save/reopen and in Print / Export.
- [ ] Test short and long weeks, hidden empty days, fixed day heights and overflow with shrink on and off.
- [ ] Enable weekend planning in Settings; add Saturday and Sunday meals, and compare the builder, preview, PDF, PNG, printer output and date range. Disable it and verify weekdays only.
- [ ] Test contextual fonts, colors, alignment, allergen emphasis, day spacing and title reflection. Add multiple images and test reserved text-safe columns.
- [ ] Open an older template in the builder. Review the conversion warning, save a copy under a new name, and verify the original remains in the database and backup. Compare the copy carefully; unsupported legacy styling and layout may differ.
- [ ] Check saving under an existing name, saving a separate copy, cancellation, unsaved-change protection, and deleting a disposable saved template.
- [ ] Rename a saved custom template from File, cancel once, and try empty/duplicate names. Verify the existing entry is renamed without losing images or unsaved canvas edits. In Image settings and the image toolbar, rename/delete an image; cancel deletion once and save/reopen to confirm the final name or removal. Verify built-in templates remain protected and deleting an image from one template leaves other saved templates unchanged.
## Print and export

- [ ] Compare the selected template and week in the builder, output preview, PNG, Microsoft Print to PDF and an A4 printer. Check overflow blocks output and files contain the date range.
## Cancellation and automated tests

- [ ] Cancel a file picker and the print dialog, then close and reopen the popup. During export or an active print job, confirm the popup stays open until the operation finishes.
- [ ] Run `dotnet test DMS.sln --configuration Debug -p:Platform=x64` after the build succeeds.

Record the commit, Windows version, date, checks run and observed results separately.
Unchecked items are planned checks, not evidence of a pass.
