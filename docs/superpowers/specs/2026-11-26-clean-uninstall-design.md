# Clean uninstall design

## Intent

Let someone uninstall DMS through the standard Windows MSI experience and
choose whether to remove the app's local data too. A selected clean uninstall
should leave no DMS installation or DMS-owned local data behind.

## Goals

- Show a clear, opt-in "remove my DMS data" choice in the MSI uninstall flow.
- Keep the default uninstall non-destructive to user data.
- When selected, remove `%APPDATA%\DMS`, including its database, images,
  automatic/recovery backups, settings, and diagnostic logs.
- Remove the per-user installation and Start-menu entry through normal MSI
  uninstall behavior.

## Boundaries

- Do not delete manual backups stored outside `%APPDATA%\DMS`, including
  `Documents\DMS Backups`, because they are intended as recovery copies and
  can be moved or shared independently of DMS.
- Do not add an uninstall button inside DMS.
- Do not change upgrade behavior: upgrades retain all data.

## Approaches

1. **In-app uninstall button.** It could collect the data-deletion choice and
   launch Windows uninstall, but would not cover uninstalls started from
   Windows Settings. Rejected at the user's request.
2. **MSI uninstall option (selected).** Add an explicit unchecked checkbox to
   the MSI maintenance/uninstall UI and condition data-folder removal on its
   property. This covers the normal Windows uninstall route and rerunning the
   installer while keeping the choice next to the irreversible action.
3. **Always delete data.** Simplest implementation, but unsafe and contrary to
   the requested user choice.

## Behavior

When the user chooses **Remove** in the MSI maintenance UI, setup displays a
second confirmation page. It explains exactly which folder is affected and has
an unchecked checkbox labelled to permanently remove all DMS data. Continuing
without selecting it uninstalls only DMS. Continuing with it selected removes
the `%APPDATA%\DMS` tree as part of the uninstall transaction. A cancellation
or failed uninstall leaves the data untouched.

The choice is never set during installation, repair, or upgrade.

## Verification

- Add installer-source regression checks for the opt-in property, the removal
  condition, and the upgrade guard.
- Build the installer and inspect its MSI tables/conditions.
- On Windows, manually verify both uninstall paths: default preserves a sample
  data folder; opted-in removal deletes it; neither deletes
  `Documents\DMS Backups`.
