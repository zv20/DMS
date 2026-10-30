# DMS

DMS is a local-first menu planning application. The active native Windows app
uses WinUI 3, C# and SQLite. The earlier browser application is available on its separate branch.

Open `DMS.sln` in Visual Studio with the .NET 10 SDK and Windows App SDK tools,
then select the x64 configuration. `DMS/` contains the app, `DMS.Tests/`
contains tests, and `installer/` contains the installer configuration.

From a Windows terminal:

```powershell
dotnet restore DMS.sln -p:Platform=x64
dotnet build DMS.sln --configuration Release --no-restore -p:Platform=x64
dotnet test DMS.sln --configuration Release --no-build -p:Platform=x64
dotnet publish DMS/DMS.csproj --configuration Release --runtime win-x64 --self-contained true -p:Platform=x64 --output artifacts/DMS-win-x64
& "${env:ProgramFiles(x86)}\Inno Setup 6\ISCC.exe" installer/DMS.iss
```

Install Inno Setup 6.5.2 or later before the last command. The installer EXE is written to
`artifacts/installer/`.

App data is stored in `%APPDATA%\DMS`. Use Settings to create and restore a
full database backup. The release workflow in `.github/workflows/` builds the
Windows installer and portable package.

English and Bulgarian resources are in `DMS/Strings/`. Keep resource keys and
format placeholders aligned, and run `python3 scripts/check-localization.py`
after editing them.
