# DMS repository review · 21 November 2026

Reviewed the 155 tracked files at inventory level on `future` (starting revision `9994c33`). Detailed source review focused on SQLite restore and backup, catalog and template readers, error handling, export, logging, setup and release automation. The table records the findings at the starting revision. All five were addressed in the follow-up below. The applied cleanup is listed separately.

## Findings in priority order

| Priority | Trigger and consequence | Suggested change |
| --- | --- | --- |
| High · restore reliability | A current-format backup can pass the restore checks with unreadable template JSON or allergen values. DMS checks those tables' column names, but does not run the ordinary row readers before replacing the live database. A later template or catalog load can fail after restore reported success. A pre-restore copy exists, but recovery then requires another action. See `DMS/Services/DatabaseService.cs:925`, the template reader at line 739 and allergen reader at line 508. | Validate the private snapshot using the production readers before replacement. Cover malformed current-format records and the existing legacy fixture. |
| Medium · planning data integrity | Restore checks foreign-key definitions and SQLite file integrity. Neither check establishes that every menu entry references an existing recipe. An orphan can survive restore and appear as an empty planner slot. See `DatabaseService.cs:945` and `DMS/Views/MenuPage.xaml.cs:264`. | Check foreign-key violations on the snapshot and explicitly check menu-to-recipe links for supported legacy schemas without a declared constraint. |
| Medium · backup path handling | The manual backup passes a picker path directly into a SQLite connection string. A valid Windows filename containing a semicolon can be parsed as multiple options and cause the backup to fail or target another path. Live database initialization uses the same construction. Restore and upgrade already use a builder. See `DMS/Services/DatabaseService.cs:65` and `:836`. | Use SqliteConnectionStringBuilder for both paths. Verify a round trip using a semicolon in a folder or filename. |
| Low · error reporting | Automatic and upgrade backup delete the temporary file in a finally block. If backup and cleanup both fail, the deletion exception can hide the original error. See `DMS/Services/AutomaticBackup.cs:39` and the finally block in `DMS/Services/UpgradeBackup.cs`. | Preserve the primary exception and log a secondary cleanup failure with the temporary path. |
| Low · duplication | All three catalog editors implement the same duplicate-name rule, including blank input, current-record exclusion, trimming, and case comparison. See `DMS/Views/AllergensPage.xaml.cs:143`, `IngredientsPage.xaml.cs:144` and `RecipesPage.xaml.cs:272`. | Share the comparison rule when changing duplicate handling. Keep each editor's warning display and save behavior local. |

## Security and dead-code review

Restore works on a private snapshot, rejects triggers, views and virtual tables, restricts foreign-key actions, and makes a recovery copy before replacement. These controls address different risks from the record-validation gaps above. The setup builder checks Microsoft Authenticode signatures on prerequisite downloads and the bundle uses their build-time hashes. The reviewed folder-launch actions use app-owned paths. Static inspection did not establish remote code execution or an exposed credential. It cannot establish the absence of vulnerabilities.

A repository-wide method-name reference pass checked production C# names against source, XAML, tests and scripts. Its single-occurrence candidates were framework overrides. This is a screening heuristic, not compiler-level reachability analysis. No production class or package was removed on that basis. All 15 bundled template PNGs match named preset definitions. The v1 database fixture is synthetic and supports migration testing. Memory and interaction guides still describe actual scripts or Windows checks. Release history, upgrade support and QA tooling serve current workflows.

## Cleanup applied

- Deleted about 122 MiB of ignored bin/obj output under the retired installer/BackupHelper directory. It contained no source or project file. This frees local disk space only.
- Removed the old standalone Language and Appearance heading keys in both locales. Settings now has a combined heading. Removed the inaccurate Entity Framework Core claim from About.
- Removed duplicate ignore patterns, old bootstrap and archive guidance, and the reference to a separate performance-soak workflow. The existing Windows tests workflow owns both scheduled and manual soaks.
- Completed the README's manual installer recipe with the MSI and bundle commands from the active release workflow. Previously it stopped after preparing release notes.

## Verification and limits

Localization passed with 365 matching English/Bulgarian keys. The release-preparation and previous-version selection checks passed. All 19 tracked XAML, WiX, project, resource and manifest XML files parsed. The fixture's SHA-256 matched its provenance document. No Windows build, xUnit run, UI automation, installer run, or live dependency-advisory check was performed for this audit.

The Codex Security workbench declined to start a managed scan because the checkout did not match its recorded scan history. The security results here come from local static review, including an independent source reviewer. There is no completed workbench scan for this revision.


## Follow-up verification

Restore now validates current-format template and allergen records, checks declared foreign keys and checks menu assignments even on databases without a declared recipe relationship. Existing migration handling is preserved. SQLite connection-string builders now preserve literal live and backup paths. Both backup paths preserve the original exception when temporary-file cleanup fails. The three catalog editors use the same duplicate-name comparison.

Thirty tests from the restore safety, round-trip, automatic backup and upgrade backup suites passed in a temporary .NET 10 macOS harness linking the production database sources, with host logging and display localization substituted. This includes restoring the historical v1 fixture, backing up and restoring through semicolon paths, and rejecting unreadable templates, allergens and orphaned menu entries before replacing the live database. Windows UI behavior, secondary cleanup logging during a simultaneous filesystem failure, and the installer were not exercised in this follow-up.
