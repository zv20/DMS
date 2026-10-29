# DMS Windows installer

The release workflow is configured to produce two unsigned Windows x64 downloads:

- `DMS-Setup-<version>.exe` — the recommended per-user installer. Its default
  path is `%LOCALAPPDATA%\Programs\DMS`, so it does not ask for administrator
  access. The user can tick **Advanced options** to select the folder or create
  a desktop shortcut.
- `DMS-<version>-portable.zip` — the same self-contained app without installation.

The installer is built from `installer/DMS.iss` after the Windows release
workflow has restored packages, built the app, and run all tests. A tag such as
`v2.0.0-beta.3` triggers the workflow. Until a signing certificate is added,
Windows may show an unsigned-app warning; do not describe an unsigned build as
production-ready.

Language selection and browser JSON import are available in the application's
Settings. The installer does not copy an unvalidated data file into the live
database. Check the specific tag's workflow and release assets to verify an
actual release; workflow configuration alone is not evidence of a successful build.
