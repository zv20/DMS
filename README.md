<p align="center">
  <img src="DMS/Assets/logo.png" alt="DMS logo" width="160">
</p>

# DMS

DMS helps kitchens organize recipes, plan meals and create menus ready to share
or print. It is a Windows desktop app that works offline and keeps your data on
your computer.

**[Download for Windows](https://github.com/zv20/DMS/releases/latest)** ·
[Release notes](CHANGELOG.md)

## What you can do

- Plan weekly and monthly menus, with optional weekend days.
- Manage recipes, ingredients and allergens, including portions and calories.
- Design menus with your own images, fonts and colors, or start with a seasonal template.
- Save menus as PDF, PNG or JPEG, and print them on A4 paper.
- Use the app in English or Bulgarian.

## Install and start

Requires **Windows 11 x64, build 22621 or newer**.

1. Open the [latest release](https://github.com/zv20/DMS/releases/latest).
2. Under **Assets**, download `DMS-Setup-<version>.exe` and run it.
3. Follow the installer, then open **DMS** from the Start menu.

The installer includes the app's runtimes. You can install and use DMS without
Visual Studio, developer tools or build commands.

For a portable copy, download `DMS-<version>-portable.zip`, extract the whole
archive and run `DMS.exe` from the extracted folder.

Start by adding ingredients and recipes, assign recipes in **Menu Planner**,
then use **Print / Export** to create your menu. In **Settings**, use **Create
Backup** to save all your data, including template images. **Restore Backup**
replaces current data with a saved backup.

## Change the code

Clone or download this repository to customize DMS. The app uses WinUI 3, C#
and SQLite; `DMS/` contains the app and `DMS.Tests/` contains its tests.

<details>
<summary>Build, test and package on Windows</summary>

Install the .NET 10 SDK, Python 3 and Visual Studio's .NET desktop and Windows
App SDK tools. Open `DMS.sln` and select x64. From the repository root, run each
command only if the previous one succeeds:

```powershell
dotnet restore DMS.sln -p:Platform=x64
python scripts/check-localization.py
dotnet build DMS.sln --configuration Release --no-restore -p:Platform=x64
dotnet test DMS.sln --configuration Release --no-build -p:Platform=x64
```

Run the app from Visual Studio. To create an EXE installer, install Inno Setup
6.5.2 or later, then run:

```powershell
dotnet publish DMS/DMS.csproj --configuration Release --runtime win-x64 --self-contained true -p:Platform=x64 --output artifacts/DMS-win-x64
$version = ([xml](Get-Content DMS/DMS.csproj -Raw)).Project.PropertyGroup[0].Version
& "${env:ProgramFiles(x86)}\Inno Setup 6\ISCC.exe" installer/DMS.iss "/DMyAppVersion=$version"
```

The installer is written to `artifacts/installer/`. For releases, update
`<Version>` in `DMS/DMS.csproj` and `CHANGELOG.md`, then push a matching
`v<version>` tag. The [release workflow](.github/workflows/winui3-release.yml)
builds, tests and checks installed startup before publishing the installer and
portable ZIP.

English and Bulgarian resources are in `DMS/Strings/`; keep keys and format
placeholders aligned. Data is in `%APPDATA%\DMS\dms.db`, pre-restore copies in
`%APPDATA%\DMS\RestoreBackups`, and logs in Settings or `%APPDATA%\DMS\Logs\dms.log`.

Before release, use disposable data to check edits and restart persistence,
backup/restore with images, language switching, template save/reopen, PDF/image
export and A4 printing in the installed app. Record the revision and results.

</details>

The earlier browser/Electron app is on the [archive branch](https://github.com/zv20/DMS/tree/archive).
Historical guides and migration plans remain in Git history.
