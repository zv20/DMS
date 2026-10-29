# Windows debug checklist

Run `DMS` in the x64 Debug configuration from Visual Studio, then tick these off:

- [ ] The DMS logo appears on the startup window and navigation bar; the new DMS icon appears in the window title bar and taskbar.
- [ ] Startup completes without a `Microsoft.ui.xaml.dll` error; open Settings, change EN/BG, restart, and confirm the language is retained.
- [ ] Create, edit, save, close, and reopen one ingredient, allergen, and recipe. Add recipe ingredients and inherited allergens.
- [ ] Create a weekly menu, assign recipes to all four categories, save it, and reopen it.
- [ ] In Template Builder, move and resize header, date, weekday, menu, footer, and an image. Confirm snapping and arrow-key nudging work.
- [ ] Select a text block: test its contextual font, size, color, style, alignment, appearance, and Undo/Redo controls.
- [ ] Edit a header or footer with mixed bold/italic/underline text; save and reopen the template.
- [ ] Select an image: test contain/cover/fill, aspect lock, rotation, description, opacity, and layer order.
- [ ] Test fixed, flexible, and shrink sizing with short and long Bulgarian and English recipes. Compare the canvas and print preview; check the warning when text cannot fit.
- [ ] Copy a weekday text style to all days, then change one day and verify the others retain their style after saving and reopening.
- [ ] Add a free text box, edit and format it, move it, lock its position, and verify it persists and prints. Test image and text layer order.
- [ ] Enable the seven-day template layout after reviewing its rearrangement warning. Add weekend recipes and verify Saturday and Sunday in the canvas, print preview, PDF, PNG, and filenames. Test an older five-day template too.
- [ ] Compare the canvas with Print Preview, PDF export, and PNG export. Check no content is cropped and the saved date range is used in the filename.
- [ ] Run `dotnet test DMS.sln --configuration Debug -p:Platform=x64` after the build succeeds.

Use disposable test data or make a backup before testing import/restore.

## Template Builder V2 and native output

- [ ] Create and save a V2 template, switch away and reopen it. Verify header, three-line footer, colors, font, background image and fixed day heights persist.
- [ ] Confirm a V1 and V2 template cannot overwrite each other by using the same name. Verify unsaved changes are protected when navigating away.
- [ ] Preview a short week and a long week with shrink on and off. Fixed day heights must stay fixed; overflow must disable export.
- [ ] On Print / Export V2, select the same template and week and compare wrapping and placement with the builder preview.
- [ ] Export PNG, then select Microsoft Print to PDF in the PDF print dialog, and print to an A4 printer. Compare all three with the builder and check image quality and margins.
- [ ] Reopen V1 templates and the original print page to confirm they remain separate and unaffected.
- [ ] In V2, verify borderless weekdays, colored bold/underlined allergen ingredients, extended footer and final notice, spacing, and optional title reflection.
- [ ] Add multiple decorative images, adjust position and size, and test reserved text-safe columns. Verify the preview, PNG, PDF, and print agree; confirm invalid geometry/overflow prevents output.
