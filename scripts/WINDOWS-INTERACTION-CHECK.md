# Windows interaction and printer check

Run this on a Windows desktop with the Release x64 build of DMS. GitHub-hosted
runners cannot reliably exercise real pointer input, system file pickers or a
physical printer. Use a disposable Windows account or a test database: DMS uses
the active account's data and may save window settings or create backups.

1. Open DMS and use the mouse to navigate between Menu Planner, Recipes,
   Ingredients and Template Builder. Search for an existing item and verify the
   visible results. Note any delay or incorrect behavior.
2. With a populated test week, open the output preview. Use the actual PDF and
   PNG save buttons and their Windows file pickers to save files into a temporary
   folder. Open both files and check the page and images appear as expected.
3. Open the print preview and check whether Windows offers a printer. Only send
   a page if an actual printer is connected and the user wants a test page.
   If no printer is available, record that the physical-print check is blocked.
4. Close the app normally. Record Windows version, DMS revision, any errors,
   whether the file pickers worked, and whether a physical page was printed.
   Do not attach real database files, templates, or exported personal menus.

The GitHub checks cover generated image-heavy previews, PDF/PNG structure, and
memory sampling; they do not prove real pointer, picker, printer-driver, or
paper output behavior.
