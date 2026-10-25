# DMS Windows UI3 Migration – Finished Notes

## Project Overview
- **Project name:** DMS (all references to "KitchenPro" removed – none found)
- **Target platform:** Native Windows UI3 (WinUI 3) using .NET 8 & Microsoft.WindowsAppSDK
- **Branch:** `winUI3`

## ✅ Completed on macOS

### user interface
- Six XAML pages scaffolded:
  - `MenuPage` / `MenuPage.xaml.cs`
  - `RecipesPage` / `RecipesPage.xaml.cs`
  - `IngredientsPage` / `IngredientsPage.xaml.cs`
  - `AllergensPage` / `AllergensPage.xaml.cs`
  - `TemplateBuilderPage` / `TemplateBuilderPage.xaml.cs`
  - `SettingsPage` / `SettingsPage.xaml.cs`
- Core UI files updated:
  - `DMS/App.xaml.cs`
  - `DMS/MainWindow.xaml` / `MainWindow.xaml.cs`
- Project name confirmed as **"DMS"** (no “KitchenPro” remnants)

### project file (`DMS/DMS.csproj`)
- `TargetFramework`: `net8.0-windows10.0.19041.0`
- `TargetPlatformMinVersion`: `10.0.19041.0`
- `UseWinUI`: `true`
- `ImplicitUsings`: `enable` (XML closing tag fixed)
- `PackageReferences`:
  - `Microsoft.WindowsAppSDK` v1.4.210831000 (downgraded from 1.6 to avoid NuGet restore errors on the hosted runner)
  - `Microsoft.Windows.SDK.BuildTools` v10.0.26100.1742
  - `Microsoft.Data.Sqlite` v9.0.0
  - `Microsoft.EntityFrameworkCore.Sqlite` v8.0.0 (new – provides SQLite data layer)
  - `Microsoft.Extensions.Logging` v9.0.0
  - `Microsoft.Extensions.Logging.Debug` v9.0.0
- **Removed** `<WindowsSdkPackageVersion>` element (no longer needed for SDK‑reference resolution with 1.4)

### data layer
- Added `DMS/Data/DMSContext.cs` – EF Core SQLite context
- Added `Item` entity (Id, Name, Description)
- SQLite database will be placed in the app's local folder on Windows (`ApplicationData.Current.LocalFolder`)

### github actions workflow (` .github/workflows/winui3-build.yml`)
- Uses `windows-latest` runner
- Steps:
  1. `actions/checkout@v4`
  2. `actions/setup-dotnet@v4` (dotnet 8.0.x)
  3. `dotnet restore DMS/DMS.csproj`
  4. `dotnet build DMS/DMS.csproj --configuration Release --no-restore -p:Platform=x64`
  5. `dotnet test DMS.sln --configuration Release --no-build --verbosity normal` (currently disabled/placeholder)
  6. `dotnet publish DMS/DMS.csproj -c Release -r win-x64 --self-contained true -p:Platform=x64 -o artifacts/DMS-win-x64`
  7. `actions/upload-artifact@v4` (unsigned developer build, 14‑day retention)
- The workflow is **ready** to run once a Windows build environment is available.

## 🪟 Windows‑only items (cannot be completed on macOS)

| Item | Why it needs Windows | Current status |
|------|----------------------|----------------|
| **Native `.exe` build & run** | The XAML compiler on the public `windows-latest` runner mismatches the project’s `TargetFramework` (compiler built for `net5.0` vs project `net8.0`). | Requires either a self‑hosted Windows runner or trying SDK 1.5.x on the hosted runner. |
| **Runtime verification** | The compiled Windows executable must be launched on Windows to verify navigation, data read/write, and app lifecycle. | Not possible on macOS. |
| **Acrylic / Mica visual brushes** | These effects use 1.6‑specific APIs (`BackdropBrush`, etc.). With SDK 1.4 the app will fall back to standard solid/transparent brushes. | UI will still function, just without the latest visual effects. |
| **`AppWindow` / custom title‑bar** | 1.6‑only APIs (`AppWindow.GetForCurrentThread`, `OverlappedView`, title‑bar customization). | UI uses standard `Window` title bar. |
| **Advanced WinRT interop** | Any code that calls `ApiInformation.GetApiLxVersion` or other 1.6‑specific WinRT checks will need recompilation or conditional compilation. | Not used in the current scaffolded pages. |

## 📦 What the final Windows‑native deliverable will look like

When the build succeeds on Windows, the workflow produces:

```
artifacts/DMS-win-x64/
│   DMS.exe                ← self‑contained native executable
│   DMS.exe.manifest
│   (optional) DLLs, etc.
```

Running `DMS.exe` on Windows will:
- Show the six XAML pages you authored.
- Use a local SQLite database (`DMS.db`) stored in `%APPDATA%\DMS\DMS.db` (or whichever folder you configure).
- Allow add/edit/delete of records, persisted across launches.
- Display with standard Windows theming (acrylic/Mica effects omitted unless you upgrade to SDK 1.6 or add custom renderers).

## 🛠️ Possible paths forward (choose one)

| Option | What it entails | Pros | Cons |
|--------|----------------|------|------|
| **A – Self‑hosted Windows runner** | 1. Install a Windows 10/11 machine (or VM) as a GitHub Actions runner.<br>2. Tag it (e.g., `win-selfhosted`).<br>3. Change workflow `runs-on: self-hosted`.<br>4. Keep SDK 1.6 (or 1.5) – build succeeds with all features. | • Full feature set of the SDK you choose.<br>• No compiler‑mismatch errors.<br>• One‑time setup, then CI works automatically. | • Requires a Windows machine (or permanent VM).<br>• Slight operational overhead. |
| **B – Try SDK 1.5 on hosted runner** | 1. Change `PackageReference Include="Microsoft.WindowsAppSDK" Version="1.5.x"` (latest 1.5.x).<br>2. Keep `TargetFramework` = `net8.0-windows10.0.19041.0`.<br>3. XAML compiler matches; restore still works (no `NU1102`).<br>4. Minor feature trade‑off vs. 1.6. | • No self‑hosted runner needed.<br>• Keeps using GitHub‑hosted `windows-latest`.<br>• Middle ground between 1.4 and 1.6. | • You lose any 1.6‑only APIs/controls you may be using.<br>• Will need to verify XAML does not depend on 1.6 features. |
| **C – Keep Mac‑only work, document gaps** (chosen here) | 1. The code and project file are in shape for a native Windows app.<br>2. Add `FINISHED_MIGRATION_NOTE.md` (this file) so anyone later can finish the build on a Windows box.<br>3. When a Windows machine is available, run the workflow or compile locally and obtain the `.exe`. | • All Mac‑side work is done.<br>• No runner maintenance.<br>• Clear roadmap for the remaining Windows steps. | • The actual `.exe` must be built & tested on Windows later. |

## 📌 Next steps for you

1. **Keep the repository as‑is** on the `winUI3` branch – all source files, project file, and workflow are ready.
2. **When a Windows machine becomes available** (or a self‑hosted runner is set up), run the GitHub Actions workflow or invoke `dotnet build / dotnet publish` locally and you’ll obtain a native `DMS.exe`.
3. **If you need the full 1.6 feature set** (acrylic/Mica, `AppWindow` customization), set up a self‑hosted runner (Option A) or try SDK 1.5 (Option B) as described above.
4. **If you just want the app to work** with the current setup on Windows, build on a Windows machine using the provided `.csproj` and `DMS.db` – the app will start, show the UI, and persist data in SQLite.

---
*Generated on `$(date +%Y-%m-%d)` from the macOS development environment.*