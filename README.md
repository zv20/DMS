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

Setup uses Microsoft’s .NET 10 and Windows App Runtime installers. Keep an
internet connection available during setup. If prompted, allow the .NET
runtime installer to make changes to the computer.

If you previously installed DMS using the old Inno Setup installer, uninstall that version
before running the new setup. Your database and backups are stored separately in
`%APPDATA%\DMS`; keep a backup before changing installations. Choose the
language and restore a backup in DMS Settings after installation.

Start by adding ingredients and recipes, assign recipes in **Menu Planner**,
then use **Print / Export** to create your menu. In **Settings**, use **Create
Backup** to save all your data, including template images. **Restore Backup**
replaces current data with a saved backup. DMS also creates a backup when you
close the app and keeps the latest three in the `AutomaticBackups` folder inside
the data folder. Use **Open Data Folder** in Settings to find them. These copies
are on the same computer, so keep a separate manual backup elsewhere as well.
When upgrading an MSI installation, close DMS first. Setup saves a verified
pre-update database backup, including template images, in **Documents\DMS Backups**.
It stops the update if the backup fails. Keep a separate copy on another device.

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

For a repeatable memory investigation, see [memory diagnostics](scripts/MEMORY-DIAGNOSTICS.md).

Run the app from Visual Studio. To build the online setup, run:

```powershell
dotnet publish DMS/DMS.csproj --configuration Release --runtime win-x64 --self-contained false -p:WindowsAppSDKSelfContained=false -p:PublishReadyToRun=false -p:Platform=x64 --output artifacts/DMS-win-x64
$version = ([xml](Get-Content DMS/DMS.csproj -Raw)).Project.PropertyGroup[0].Version
dotnet tool install --global wix --version 5.0.2
wix extension add --global WixToolset.UI.wixext/5.0.2
wix extension add --global WixToolset.Util.wixext/5.0.2
wix extension add --global WixToolset.Bal.wixext/5.0.2
wix extension add --global WixToolset.Netfx.wixext/5.0.2
New-Item -ItemType Directory -Force artifacts/installer
$publishDir = (Resolve-Path artifacts/DMS-win-x64).Path
python scripts/installer-release-notes.py $version artifacts/installer/release-notes.rtf
$releaseNotes = (Resolve-Path artifacts/installer/release-notes.rtf).Path
$msi = "artifacts/installer/DMS-Setup-$version.msi"
wix build installer/DMS.wxs -ext WixToolset.UI.wixext -ext WixToolset.Util.wixext -arch x64 -d "Version=$version" -d "PublishDir=$publishDir" -d "ReleaseNotesFile=$releaseNotes" -o $msi
./scripts/build-online-setup.ps1 -Msi $msi -Version $version
```

The installer is written to `artifacts/installer/`.

After the automatic release workflow is installed on `release`, push or merge
feature work into `test`. The workflow runs Windows tests, prepares the next
patch version, and merges it through a protected pull request. It then builds
and checks the online setup before publishing the matching GitHub release. A newer push to
`test` prevents an older tested commit from being merged.

Add release notes under `## Unreleased` in `CHANGELOG.md`. The workflow turns
that section into the versioned release notes. If there is no such section, it
uses commit subjects since the release branch's common ancestor. To change the
major or minor version, edit `<Version>` in `DMS/DMS.csproj` before pushing to
`test`; for example, `0.2.0` is released as `0.2.0`, and later releases advance
the patch number. The workflow does not automatically change the major or minor
version.

For automatic promotion, enable **Allow GitHub Actions to create and approve pull requests** in repository Actions settings. If publishing fails after promotion, rerun the failed publish job.

English and Bulgarian resources are in `DMS/Strings/`; keep keys and format
placeholders aligned. Data is in `%APPDATA%\DMS\dms.db`, pre-restore copies in
`%APPDATA%\DMS\RestoreBackups`, and logs in Settings or `%APPDATA%\DMS\Logs\dms.log`.

Before release, use disposable data to check edits and restart persistence,
backup/restore with images, language switching, template save/reopen, PDF/image
export and A4 printing in the installed app. Record the revision and results.

</details>
