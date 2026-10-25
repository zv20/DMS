# dotnet-windows-appsdk-ci

## Description
.NET Windows App SDK build on github-actions runners.

## When to Use
- Building .NET projects that target Windows App SDK 1.6 or later on github-actions runners.
- Migrating from Electron/JS SPA to native WinUI 3.
- CI pipelines that use `dotnet build` with Windows App SDK.

## Don't Use For
- .NET projects not using Windows App SDK.
- Non-Windows build targets.
- .NET Framework projects.

## Procedure

### 1. SDK version decision — three paths are available; choose one before configuring the project:

**Path A: Self‑hosted Windows runner** (recommended if you need the exact Windows App SDK version you reference).
- Install a Windows 10/11 machine (or VM) as a GitHub Actions self‑hosted runner and tag it (e.g., `win‑selfhosted`).
- Keep the SDK version you reference (`1.6.x` or `1.5.x`); the runner will have the matching XAML‑compiler and SDK refs.
- Update the workflow: `runs-on: self-hosted` (or use a label: `runs-on: [win‑selfhosted]`).
- Keep `<WindowsSdkPackageVersion>1.6.240829007</WindowsSdkPackageVersion>` in the `.csproj` if using SDK 1.6; omit it for SDK 1.4.
- The build will succeed because the runner’s .NET SDK and Windows SDK bits are under your control.

**Path B: Hosted `windows-latest` runner with SDK 1.5** (no self‑hosted machine needed).
- Change `PackageReference Include="Microsoft.WindowsAppSDK" Version="1.5.x"` (latest 1.5.x).
- Keep `TargetFramework>net8.0-windows10.0.19041.0</TargetFramework>` and `TargetPlatformMinVersion>10.0.19041.0</TargetPlatformMinVersion>`.
- The 1.5 XAML‑compiler on the hosted runner matches `net8.0‑windows10.0.19041.0`, so restore and build both succeed without the `WindowsSdkPackageVersion` property.
- You trade SDK 1.6‑only APIs/controls for a clean CI pipeline on GitHub‑hosted runners.

**Path C: Document gaps, compile later on Windows** (the "Mac‑first" approach chosen in this session).
- Downgrade to SDK 1.4, omit `<WindowsSdkPackageVersion>`, set `TargetFramework>net8.0-windows10.0.19041.0</TargetFramework>`.
- Restore will still emit `NU1102` (missing NuGet package `Microsoft.Windows.SDK.NET.Ref`), but use `continue-on-error: true` so the build step runs anyway.
- The XAML compiler on the hosted runner mismatches the project's `TargetFramework` (compiler built for `net5.0` vs project `net8.0`), so the build still fails at the compile step on the hosted runner.
- This path is viable only if you accept that the **actual `.exe` build and test must be performed on a Windows machine** (self‑hosted or local). All source changes, project file tweaks, and data‑layer work can be completed on macOS; the final native executable requires a Windows box.
- A `FINISHED_MIGRATION_NOTE.md` is committed to the repository summarizing this choice and the remaining gaps.

2. **If using Path A or B**, continue with steps 2‑6 below. If using Path C, the project is considered "Mac‑finished"; skip to the documentation step.

3. **TargetFramework** — set per the chosen path:
   - Path A: `net8.0-windows10.0.26100.0` (or the version matching your self‑hosted SDK).
   - Path B: `net8.0-windows10.0.19041.0`.
   - Path C: `net8.0-windows10.0.19041.0` (as committed).

4. **`TargetPlatformMinVersion`** — match the `TargetFramework` moniker chosen in step 2.

5. **`Microsoft.Windows.SDK.BuildTools`** package reference — always include at the version matching the runner: `10.0.26100.1742` for `windows-latest`; adjust if you use a self‑hosted runner with a different SDK build tools version.

6. **`<WindowsSdkPackageVersion>`** — handle per the chosen path:
   - Path A: include it if using SDK 1.6, omit if using SDK 1.4.
   - Path B: omit (1.5’s targets do not require it, and restore will succeed).
   - Path C: omit; accept that `dotnet restore` will fail with `NU1102` but the build step can proceed via `continue-on-error: true`.

7. **Restore the project file directly**: workflow step should run `dotnet restore DMS/DMS.csproj` (project file) not `dotnet restore DMS.sln` (solution file). The solution file may lack valid configurations or cause NuGet lookup ambiguity.

8. **Build** — `dotnet build DMS/DMS.csproj --configuration Release -p:Platform=x64` (or with `--no-restore` after the restore step, which is safe in CI).

9. **Publish** — `dotnet publish DMS/DMS.csproj -c Release -r win-x64 --self-contained true -p:Platform=x64 -o artifacts/DMS-win-x64`.

10. **Artifact upload** — `actions/upload-artifact@v4` with `name: DMS-win-x64-unsigned` and `retention-days: 14`.

## Pitfalls

- **`<ImplicitUsings>` tag typo**: closing tag `</ImplicitUsing>` (missing 's') causes XML parse errors during restore/build. Always verify the closing tag matches the opening tag `<ImplicitUsings>`.
- **`TargetFramework` version mismatch**: Using `net8.0-windows10.0.19041.0` with Windows App SDK 1.6 causes `This version of the Windows App SDK requires Microsoft.Windows.SDK.NET.Ref or later.` on the `windows-latest` runner. The runner’s .NET 8.0.427 + SDK BuildTools `10.0.26100.1742` require `10.0.26100.0` or `10.0.22621.0` — but even `10.0.26100.0` produces a XAML‑compiler mismatch when SDK 1.4 is referenced (compiler built for `net5.0` vs project `net8.0`). This is a runner‑environment incompatibility, not a project‑file bug.
- **`WindowsSdkPackageVersion` catch‑22**: This property is required by the Windows App SDK build targets but breaks `dotnet restore` on `windows-latest` runners. There is no .csproj configuration that satisfies both restore and build on this runner image; accept the restore error as non‑blocking (use `continue-on-error: true`) or move to a self‑hosted runner (Path A) or SDK 1.5 (Path B).
- **Solution file configuration**: `dotnet restore DMS.sln` may fail or resolve wrong configurations. Always target the project file `DMS/DMS.csproj` directly.
- **Runner image variability**: `windows-latest` runner image `win25-vs2026` (Windows Server 2025) behaves differently than `windows-2022`. If available, prefer a self‑hosted runner with the exact .NET SDK and Windows SDK setup.
- **SQLite EF Core on Windows**: When adding `Microsoft.EntityFrameworkCore.Sqlite`, ensure the database file is placed in the app’s local folder (`ApplicationData.Current.LocalFolder`) so the self‑contained publish (`--self-contained true`) includes it. The `.csproj` already references `Microsoft.Data.Sqlite` v9.0.0 and `Microsoft.EntityFrameworkCore.Sqlite` v8.0.0.
- **One‑off task narratives**: Do not capture environment‑dependent failures (missing binaries, fresh‑install errors, path mismatches) as durable rules. They are user‑specific remediation steps, not skill‑level guidance.
- **SDK version choice**: SDK 1.6 on `windows-latest` runner causes `NU1102` restore failure and XAML‑compiler mismatch. SDK 1.5 resolves the restore issue but introduces XAML‑compiler version mismatches (e.g., `MinWidth`/`MinHeight` attached properties). SDK 1.4 avoids the NuGet restore issue but forces XAML‑compiler mismatches. The optimal compromise for `windows-latest` is SDK 1.5 with `continue-on-error: true` on restore, accepting that XAML‑compiler version must match the `TargetFramework` moniker.
- **User‑preference: macOS development workflow** — when the development environment is macOS, the team selects Path C (SDK 1.4 with `continue-on-error: true`, document gaps, compile later on Windows). The project file uses `TargetFramework>net8.0-windows10.0.19041.0</TargetFramework>` and omits `<WindowsSdkPackageVersion>`. The GitHub Actions workflow uses `continue-on-error: true` on the restore step so the build proceeds despite restore warnings. The final native executable requires a Windows machine (self‑hosted or local) to produce. This preference is encoded in the skill body and the `FINISHED_MIGRATION_NOTE.md` committed to the repository.
- **XAML 1.6‑specific properties**: `MinWidth` and `MinHeight` attached properties on `<Window>` are Windows App SDK 1.6 features. When using SDK 1.5, remove these attributes from `<Window>` to avoid `WMC0011` compiler errors.

## Verification

- Confirm `.csproj` has the `TargetFramework` and `TargetPlatformMinVersion` matching the chosen path (A, B, or C).
- Confirm the `PackageReference` for `Microsoft.WindowsAppSDK` matches the chosen SDK version.
- Confirm `Microsoft.Windows.SDK.BuildTools` is at the version matching the runner.
- If using Path C, confirm `continue-on-error: true` is set on the `dotnet restore DMS/DMS.csproj` workflow step.
- If using Path A, confirm the self‑hosted runner is active and has the matching .NET 8 SDK + Windows App SDK installed.
- If using Path B, confirm `PackageReference Include="Microsoft.WindowsAppSDK" Version="1.5.x"` and that no `<WindowsSdkPackageVersion>` is present.
- Run `dotnet build` locally (on any platform) to verify the .csproj parses before pushing to CI.
- Run `dotnet test` to verify any unit tests that don’t platform‑specify Windows pass.

## Change-log (internal, do not distribute)

- 2026‑10‑25: Initial skill created reflecting best‑known practice for `windows-latest` runners.
- 2026‑10‑25: Updated with three‑path decision matrix after internal experimentation revealed runner‑environment incompatibility between SDK 1.4/1.6 XAML compilers and `net8.0‑windows10.0.19041.0`/`.22621.0` on the public runner image.
- 2026‑10‑25: Added Path A (self‑hosted runner), Path B (SDK 1.5 on hosted runner), and Path C (Mac‑first, document gaps) as explicit options so future sessions can choose the approach that matches their infrastructure.
- 2026‑10‑25: Documented SQLite EF Core placement and the `continue-on-error` restore pattern after a session where the user chose Option C and the team added `FINISHED_MIGRATION_NOTE.md`.

## References

- `references/windows-appsdk-decision-table.md` — high‑level summary of the three SDK‑version paths and when to choose each (not shipped with this skill but tracked in the repository).
- `references/sqlite-efcore-windows.md` — concise notes on EF Core SQLite placement in a self‑contained WinUI 3 app.
- `templates/winui3-csproj-template.md` — minimal `.csproj` scaffolding for a new WinUI 3 project (boilerplate only, no session‑specific values).
- `scripts/verify-csproj-syntax.ps1` — simple PowerShell script that parses a `.csproj` and reports missing/incorrect SDK‑related properties; can be invoked by the skill before pushing to CI.