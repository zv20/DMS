# Windows debug checklist

Run `DMS` in the x64 Debug configuration from Visual Studio. Use disposable test
data or make a backup before testing import, restore, conversion or deletion.

- [ ] Check startup, taskbar icon, EN/BG switching and restart.
- [ ] Create and reopen an ingredient, allergen and recipe, and assign four meals to a menu.
- [ ] Confirm the navigation shows one Template Builder and one Print / Export page. Open Print / Export from the planner and verify it uses the chosen week.
- [ ] Click the canvas header and footer to edit; format, zoom, save, reopen and confirm the values persist. Click outside a block and confirm its toolbar closes.
- [ ] Test short and long weeks, hidden empty days, fixed day heights and overflow with shrink on and off.
- [ ] Enable weekend planning in Settings; add Saturday and Sunday meals, and compare the builder, preview, PDF, PNG, printer output and date range. Disable it and verify weekdays only.
- [ ] Test contextual fonts, colors, alignment, allergen emphasis, day spacing and title reflection. Add multiple images and test reserved text-safe columns.
- [ ] Open an older template in the builder. Review the conversion warning, save a copy under a new name, and verify the original remains in the database and backup. Compare the copy carefully; unsupported legacy styling and layout may differ.
- [ ] Check saving under an existing name, saving a separate copy, cancellation, unsaved-change protection, and deleting a disposable saved template.
- [ ] Compare the selected template and week in the builder, output preview, PNG, Microsoft Print to PDF and an A4 printer. Check overflow blocks output and files contain the date range.
- [ ] Run `dotnet test DMS.sln --configuration Debug -p:Platform=x64` after the build succeeds.
