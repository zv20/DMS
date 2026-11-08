# DMS memory capture

This manual scenario collects evidence; it does not assert a pass/fail memory
limit or drive the app automatically. Run it with a test database or avoid
saving changes to real templates. Use the same templates and actions for
before/after comparisons.

1. Open the solution in Visual Studio, select x64, start DMS, and leave it on
   Menu Planner. Open **Debug > Windows > Show Diagnostic Tools**, then select
   **Memory Usage**.
2. In a PowerShell terminal at the repository root, run:

   ```powershell
   powershell -ExecutionPolicy Bypass -File .\scripts\capture-memory.ps1
   ```

   If more than one DMS process exists, pass `-ProcessId 1234` with the intended
   process ID. The script samples working set and private bytes once per second.
3. Follow each prompt. At every checkpoint, click **Take Snapshot** in Visual
   Studio and then press Enter in the terminal. Wait for the snapshot to finish
   before continuing. Keep debugging open to inspect the results.
4. In Visual Studio compare the later snapshots with baseline and with the
   previous round. Inspect retained `TemplateBuilderPage`, image, string, byte
   array, and event-handler instances and their paths to roots. Also compare
   the CSV checkpoints with process memory. Heap snapshots may trigger garbage
   collection and profiling itself changes timing and memory usage.

The output folder under `artifacts/memory-captures/` contains `run.json`,
`memory.csv`, and `checkpoints.csv`. It is ignored by Git. Timestamps are UTC;
the process ID and start time prevent a restarted app from being mistaken for
the same run. If the app restarts, start a new capture.

Optional: if `dotnet-dump` is already installed and on PATH, add `-CaptureDumps`
to collect a full .NET dump at every checkpoint. Dumps can pause the app, use
significant disk space, and contain template contents and other private data.
Keep them local and share them only if you intend to share that data. Analyze
them with `dotnet-dump analyze` or Visual Studio. This does not replace native
heap/graphics profiling; a small managed heap alongside high process memory is
reason to investigate native allocations separately.
