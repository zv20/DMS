# Interface translations

Edit `en-US/Resources.resw` for English and `bg-BG/Resources.resw` for Bulgarian.
Visual Studio opens these files as name/value tables. You can also edit their XML.

Keep resource names identical in both files. Add new keys to both; remove a key
only after removing its references from XAML and C#. English is the fallback.
XAML `x:Uid` uses keys such as `NavRecipes.Content`. C# uses
`Localization.Get("key")` or `Localization.Format("key", values...)`.
Keep numbered placeholders such as `{0}` unchanged in translations.

Run `python3 scripts/check-localization.py` from the repository root to check
matching keys, placeholders, code references, and XAML resource identifiers.

Settings saves the selected language and rebuilds the window. Startup applies
that preference before constructing the interface. Dates and numbers follow the
chosen culture. User recipe/ingredient names and saved template content are not
translated. Built-in allergen labels and category labels are translated for
display; stored names and category identifiers stay unchanged.

Windows verification: build the solution, switch BG → EN → BG in Settings,
inspect navigation, every page, dialogs and recipe/category/allergen pickers,
then restart and verify the language selection and appearance settings persist.
