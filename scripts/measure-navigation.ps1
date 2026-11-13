<# Only for a disposable GitHub-hosted runner: replaces that runner's DMS data. #>
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)][string]$Executable,
    [Parameter(Mandatory = $true)][string]$Database,
    [Parameter(Mandatory = $true)][string]$OutputPath
)
$ErrorActionPreference = 'Stop'
if ($env:GITHUB_ACTIONS -ne 'true' -or $env:RUNNER_ENVIRONMENT -ne 'github-hosted') {
    throw 'Navigation measurement requires a disposable GitHub-hosted runner.'
}
$exe = (Resolve-Path -LiteralPath $Executable).Path
$databasePath = (Resolve-Path -LiteralPath $Database).Path
$folder = Join-Path $env:RUNNER_TEMP ('dms-navigation-' + [guid]::NewGuid().ToString('N'))
$dataFolder = Join-Path ([Environment]::GetFolderPath('ApplicationData')) 'DMS'
New-Item -ItemType Directory -Path $folder -Force | Out-Null
Remove-Item -LiteralPath $dataFolder -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Path $dataFolder -Force | Out-Null
Copy-Item -LiteralPath $databasePath -Destination (Join-Path $dataFolder 'dms.db')
$env:DMS_QA_READY_FILE = Join-Path $folder 'startup.txt'
$env:DMS_QA_PAGE_READY_FILE = Join-Path $folder 'page.txt'
$env:DMS_QA_NAVIGATION_FILE = Join-Path $folder 'navigate.txt'
$env:DMS_QA_WEEK_DATE = '2026-01-05'
$env:DMS_QA_PDF_PATH = Join-Path $folder 'generated.pdf'
$app = $null
try {
    $app = Start-Process -FilePath $exe -WorkingDirectory (Split-Path $exe) -PassThru
    $deadline = [DateTime]::UtcNow.AddSeconds(45)
    do {
        $app.Refresh()
        if ($app.HasExited) { throw 'DMS exited before initial navigation.' }
        if ([DateTime]::UtcNow -ge $deadline) { throw 'DMS did not start within 45 seconds.' }
        Start-Sleep -Milliseconds 50
    } until (Test-Path -LiteralPath $env:DMS_QA_READY_FILE)
    $samples = [System.Collections.Generic.List[object]]::new()
    function Measure-Step([string]$page, [int]$iteration, [string]$expectedPattern) {
            Remove-Item -LiteralPath $env:DMS_QA_PAGE_READY_FILE -Force -ErrorAction SilentlyContinue
            $watch = [System.Diagnostics.Stopwatch]::StartNew()
            $command = Join-Path $folder 'command.tmp'
            [System.IO.File]::WriteAllText($command, $page)
            Move-Item -LiteralPath $command -Destination $env:DMS_QA_NAVIGATION_FILE
            $deadline = [DateTime]::UtcNow.AddSeconds(45)
            do {
                $app.Refresh()
                if ($app.HasExited) { throw "DMS exited navigating to $page." }
                if ([DateTime]::UtcNow -ge $deadline) { throw "Timed out waiting for $page to render." }
                Start-Sleep -Milliseconds 50
                $signal = if (Test-Path -LiteralPath $env:DMS_QA_PAGE_READY_FILE) {
                    try { Get-Content -LiteralPath $env:DMS_QA_PAGE_READY_FILE -Raw } catch { '' }
                } else { '' }
            } until ($signal -match $expectedPattern)
            $watch.Stop()
            $app.Refresh()
            $samples.Add([pscustomobject]@{ iteration = $iteration; scenario = $page; signal = $signal; milliseconds = [math]::Round($watch.Elapsed.TotalMilliseconds, 1); working_set_bytes = $app.WorkingSet64; private_bytes = $app.PrivateMemorySize64 })
    }
    Start-Sleep -Seconds 15
    $app.Refresh()
    $baseline = [pscustomobject]@{ working_set_bytes = $app.WorkingSet64; private_bytes = $app.PrivateMemorySize64 }
    foreach ($iteration in 1..20) {
        foreach ($page in @('recipes', 'ingredients', 'templateBuilder')) {
            $expected = if ($page -eq 'templateBuilder') { '^templateBuilder:1$' } else { "^${page}:1000$" }
            Measure-Step $page $iteration $expected
        }
        Start-Sleep -Seconds 2
    }
    Start-Sleep -Seconds 15
    $app.Refresh()
    $settled = [pscustomobject]@{ working_set_bytes = $app.WorkingSet64; private_bytes = $app.PrivateMemorySize64 }
    Measure-Step 'output' 1 '^output:[1-9][0-9]*$'
    Measure-Step 'pdf' 1 '^pdf:[1-9][0-9]*$'
    $pdfBytes = [System.IO.File]::ReadAllBytes($env:DMS_QA_PDF_PATH)
    if ($pdfBytes.Length -lt 100 -or [System.Text.Encoding]::ASCII.GetString($pdfBytes, 0, 5) -ne '%PDF-') { throw 'Generated PDF is invalid or empty.' }
    $output = [System.IO.Path]::GetFullPath($OutputPath)
    New-Item -ItemType Directory -Path (Split-Path $output) -Force | Out-Null
    [pscustomobject]@{
        schemaVersion = 1
        scope = 'Navigation and preview: test command to first rendering callback after data load and binding. PDF: test command through rendering, PDF creation and file write. Excludes actual mouse input and does not guarantee displayed pixels or complete interactivity.'
        notes = 'Generated database, 1,000 recipes and ingredients, populated week and default template; 20 cycles with pauses. Includes command and response polling overhead. PDF output bypasses the file picker and does not test a physical printer.'
        settled_before_navigation = $baseline
        settled_after_navigation = $settled
        samples = $samples
    } | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $output -Encoding UTF8
}
finally {
    if ($null -ne $app) {
        $app.Refresh()
        if (-not $app.HasExited) { Stop-Process -Id $app.Id -Force; $app.WaitForExit() }
    }
    Remove-Item Env:DMS_QA_READY_FILE -ErrorAction SilentlyContinue
    Remove-Item Env:DMS_QA_PAGE_READY_FILE -ErrorAction SilentlyContinue
    Remove-Item Env:DMS_QA_NAVIGATION_FILE -ErrorAction SilentlyContinue
    Remove-Item Env:DMS_QA_WEEK_DATE -ErrorAction SilentlyContinue
    Remove-Item Env:DMS_QA_PDF_PATH -ErrorAction SilentlyContinue
    Remove-Item -LiteralPath $folder -Recurse -Force -ErrorAction SilentlyContinue
}
