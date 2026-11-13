# DMS performance baseline (Windows)

This kit collects a starting point for comparison, not a pass/fail performance
grade. It has two independent parts: automated tests with generated data, and
a guided capture of the real app. Run both on the same Windows machine again
after changes, using the same dataset, build configuration and actions.

## Automatic Windows checks on GitHub

The **Windows tests** workflow runs on branch pushes, pull requests, and manual
dispatch. It compiles the test project and its app dependency in Release x64,
runs the regular tests, runs the generated database benchmark, and measures
process launch to the app's initial navigation signal three times. This signal
is emitted before the initial page finishes loading; it is not a measurement of
fully interactive startup. The first run may create the runner's database, and
later runs reuse it. An experimental UI Automation scenario then loads a
generated database and alternates between Recipes and Ingredients three times.
It checks each page's item count and records time to the first rendering callback
after data loading and list binding, plus process memory at each checkpoint.
The callback does not guarantee that all pixels have appeared or that the page
is fully interactive. The release workflow calls the functional and database
checks before packaging; it skips both experimental UI measurements.
Open the workflow run in GitHub Actions and download its
`performance-*` artifact to see `database.json`, `catalog.json`, `startup.json`
and `navigation.json`. The workflow must be
present in the pushed branch (and Actions enabled for the repository) to run.

Hosted runner hardware and load can vary; use these numbers to identify changes
worth investigating, not as precise comparisons with your own PC. The workflow
does not run the manual capture or measure perceived responsiveness. The
navigation script replaces the DMS data directory and force-stops the app, so
it explicitly runs only on a disposable GitHub-hosted Windows runner.

## Prepare

1. Open `DMS.sln` from the performance checkout in Visual Studio. Select
   **Release** and **x64**, then build the solution. Let background work settle.
2. Open **View > Terminal** and select PowerShell. Run the commands below from
   the repository root (the folder containing `DMS.sln`).
3. Close other heavy applications where practical. Keep the machine plugged in
   and use the same power mode for comparisons. Record anything unusual when
   you share the results.

## 1. Automated generated-data measurements

Paste these commands into the Visual Studio terminal:

```powershell
New-Item -ItemType Directory -Force artifacts/performance-baselines | Out-Null
$env:DMS_PERF_RESULTS_PATH = (Join-Path (Get-Location) 'artifacts/performance-baselines/database.json')
dotnet test DMS.Tests/DMS.Tests.csproj -c Release -p:Platform=x64 --filter "Category=PerformanceBaseline"
Remove-Item Env:DMS_PERF_RESULTS_PATH
```

The test creates a temporary synthetic database, measures repeated service
reads, verifies the results and removes the database. It does not use the
application's own database. The catalog measurement uses 10,000 generated
recipes and ingredients and runs the same in-memory filtering and sorting as the
app. Check that both `database.json` and `catalog.json` exist in
`artifacts/performance-baselines`. These files are overwritten on another run.
The timings exclude UI rendering, data generation and cold startup; filtering
timings also exclude database loading. A normal test run leaves measurements inactive.

## 2. Guided app capture

Start the Release x64 app **without the debugger** (Debug > Start Without
Debugging). Once Menu Planner is open, run in the Visual Studio terminal:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\capture-performance.ps1
```

Follow the prompts, pressing Enter before and after each action. The script
samples process memory once per second. It records how long each guided action
took, including the time it takes you to switch windows and press Enter; these
are rough observations, not precise UI latency measurements. Wait 15 seconds
when prompted so the memory trace includes settled points. Type `q` at a prompt
to end early. If multiple DMS processes are open, close the extras or provide
`-ProcessId <id>` to select the right one.

**The app uses this Windows account's normal DMS data.** The script observes
the process and does not ask you to save edits, but the app may write settings
or automatic backups during normal use. To run against an empty profile, use a
separate disposable Windows account. The guided capture does not generate or
load the synthetic test database. It does not measure startup or exercise
printing, export, large templates, or edits.

## 3. Share the results

The terminal prints the path of a new `ui-*` folder under
`artifacts/performance-baselines`. Share that folder together with
`database.json`, for example by zipping just those items. The files contain
timings, memory samples, OS and processor details, a binary hash and timestamps;
they do not intentionally contain your recipes, templates, paths, or database.
Review them before sharing. If either part fails, share the error text and say
which step failed; do not include application logs or database files.

Also tell us whether the app used an empty or existing dataset, whether the
machine was plugged in, and anything that felt slow. The checked-out Git revision
in the report does not prove which executable was running; use the just-built
Release app for the capture. Captures are ignored by Git and stay local.
