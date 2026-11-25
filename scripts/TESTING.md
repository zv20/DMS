# Testing on Windows

Use a Release x64 build. Run PowerShell commands from the repository root.

## Check the installed app

Use a disposable Windows account or test database. DMS writes settings and backups during normal use.

1. Use the mouse to navigate the planner and catalogs. Search for an ingredient, edit a recipe, and assign it to a meal. Close and reopen DMS to verify the changes persisted.
2. Switch languages. Save and reopen a template containing images. Back up the test database, restore it, and verify the week and artwork.
3. Preview a populated week. Use the Windows file pickers to export PDF and PNG. Open the files and compare them to the preview. For a multi-page week, check that each day’s meals stay together.
4. Open print preview. If a printer is available and a test page is wanted, check the A4 paper output. Record the app revision, Windows version, any failures, and whether a physical page was printed.

## Measure performance

The [Windows tests workflow](../.github/workflows/windows-checks.yml) runs during release, weekly, or on manual dispatch. Its `performance-*` artifact contains database, catalog, startup and navigation measurements. The navigation check exercises populated previews and validates generated PDF and PNG files. It replaces the runner’s DMS data directory, so run it only through the disposable hosted runner.

To measure database reads and catalog filtering locally with generated data:

```powershell
New-Item -ItemType Directory -Force artifacts/performance-baselines | Out-Null
$env:DMS_PERF_RESULTS_PATH = Join-Path (Get-Location) 'artifacts/performance-baselines/database.json'
try {
    dotnet test DMS.Tests/DMS.Tests.csproj -c Release -p:Platform=x64 --filter "Category=PerformanceBaseline"
} finally {
    Remove-Item Env:DMS_PERF_RESULTS_PATH
}
```

See `database.json` and `catalog.json` in that folder. For a guided UI capture, start DMS without the debugger, open Menu Planner, and run:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\capture-performance.ps1
```

Follow the prompts. Timings include your input. Compare runs on the same machine with the same dataset and build configuration. Results are in `artifacts/performance-baselines/ui-*`.

## Investigate memory growth

Start DMS under the Visual Studio debugger. Open **Debug > Windows > Show Diagnostic Tools > Memory Usage** and run:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\capture-memory.ps1
```

Take a snapshot at each prompt before pressing Enter. Compare later snapshots with the baseline and inspect paths to roots for retained pages, images and event handlers. Compare those snapshots with `memory.csv` and `checkpoints.csv` under `artifacts/memory-captures/`. Both capture scripts accept `-ProcessId` when multiple DMS processes are open. The memory script can also collect full dumps with `-CaptureDumps` if `dotnet-dump` is installed. Dumps can contain private menu data.
