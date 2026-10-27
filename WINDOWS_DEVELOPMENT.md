# Windows development

The WinUI app and tests target .NET 10 and Windows 10 SDK 22621 or later.
The app references Windows App SDK 2.5.1 and uses the self-contained,
unpackaged deployment configuration. Check the project files for exact package
versions. These dependencies have been updated but have not yet been built or
run on Windows after the upgrade.

Install Visual Studio 2026 (18.0 or newer), the .NET desktop development
workload with Windows App SDK tools, and the .NET 10 SDK. Open `DMS.sln`, select
the x64 solution configuration, and restore packages. From a Windows terminal:

```powershell
dotnet restore DMS.sln -p:Platform=x64
dotnet build DMS.sln --configuration Release --no-restore -p:Platform=x64
dotnet test DMS.sln --configuration Release --no-build -p:Platform=x64
dotnet publish DMS/DMS.csproj --configuration Release --runtime win-x64 --self-contained true --no-restore -p:Platform=x64 --output artifacts/DMS-win-x64
```

Before relying on the upgraded app, run it from Visual Studio and the published
output. Check startup and window icons, BG/EN switching and restart, recipe and
ingredient edits, menu assignment, and backup/restore using disposable test
data. Verify any existing database with a backup and a copy first. Check the
Windows build and test results rather than treating the version update as
evidence of compatibility.

The test project currently uses the final xUnit v2 release with the current
Visual Studio adapter; xUnit v3 is a separate framework migration.
