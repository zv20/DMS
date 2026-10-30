# DMS

DMS is a local-first menu planning application. The active native Windows app
uses WinUI 3, C# and SQLite. The earlier browser application is available on its separate branch.

Open `DMS.sln` in Visual Studio. The `DMS/` folder contains the app project;
`DMS.Tests/` contains its tests. Release packaging lives in `installer/` and
`.github/workflows/`, and development guides are grouped in `docs/`.

- [Windows development and build](docs/WINDOWS_DEVELOPMENT.md)
- [Windows verification checklist](docs/WINDOWS_DEBUG_CHECKLIST.md)
- [Windows installer and release](docs/INSTALLER.md)
- [Native architecture](docs/ARCHITECTURE.md)
- [Current roadmap and verification boundaries](docs/ROADMAP.md)
- [English and Bulgarian translations](DMS/Strings/README.md)
- [Historical documents](docs/archive/README.md)

Build and runtime status should be supported by dated Windows results; source
checks alone do not establish that the native app has been tested.
