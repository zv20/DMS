# DMS native roadmap

This is an actionable checklist derived from the current WinUI source, not a
record of completed testing. The earlier migration plans are retained under
[`archive/`](archive/). Record dated results separately from instructions.

1. **Establish Windows build evidence.** Restore, build, test and publish the
   current revision on Windows using [Windows development](../WINDOWS_DEVELOPMENT.md).
   Record configuration, revision, results and any failures.
2. **Exercise core data workflows.** Use disposable data for recipe,
   ingredient and allergen changes, menu assignment, restart persistence,
   backup/restore and JSON import/export. Check invalid input and recovery.
3. **Validate planner, template and output.** Run the
   [Windows debug checklist](../WINDOWS_DEBUG_CHECKLIST.md), including long
   menus, weekend days, conversion, page overflow, saved templates, PNG, PDF
   and a physical A4 printer. Repair and retest issues found.
4. **Review browser-to-native parity.** Compare real workflows against the
   browser app on its separate branch. Prioritize confirmed gaps and explicitly review
   legacy template conversion and missing styling before claiming parity.
5. **Harden delivery.** Verify the published app and installer on a clean
   Windows environment, confirm tag-specific CI and release assets, and
   document the signing/distribution decision. Add Windows development checks
   on changes if desired; the existing release workflow runs for tags and
   manual dispatch.
6. **Review unused project files.** The placeholder `DMS/Data/DMSContext.cs`
   and its EF Core package, the copied `DMS/appsettings.json`, and the installer
   concept image appear unused in source searches. Confirm their purpose and
   validate a Windows build and tests before removing project dependencies.

Inspect the actual source and current run evidence before updating this list;
unchecked items do not mean a specific feature is absent or that prior runs
failed.
