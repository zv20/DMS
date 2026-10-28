# DMS Windows installer

The release workflow produces two unsigned Windows x64 downloads:

- `DMS-Setup-<version>.exe` — the recommended per-user installer. Its default
  path is `%LOCALAPPDATA%\Programs\DMS`, so it does not ask for administrator
  access. The user can tick **Advanced options** to select the folder or create
  a desktop shortcut.
- `DMS-<version>-portable.zip` — the same self-contained app without installation.

The installer is built from `installer/DMS.iss` after the Windows release
workflow has restored packages, built the app, and run all tests. A tag such as
`v2.0.0-beta.1` triggers the workflow. Until a signing certificate is added,
Windows may show an unsigned-app warning; do not describe an unsigned build as
production-ready.

Language selection and importing browser JSON backups remain first-run app
features because they need the application's migration and validation logic.
The installer intentionally does not copy an unvalidated data file into the
user's live database.
