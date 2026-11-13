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
Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes
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
$app = $null
try {
    $app = Start-Process -FilePath $exe -WorkingDirectory (Split-Path $exe) -PassThru
    $deadline = [DateTime]::UtcNow.AddSeconds(45)
    do {
        $app.Refresh()
        if ($app.HasExited) { throw 'DMS exited before initial navigation.' }
        if ([DateTime]::UtcNow -ge $deadline) { throw 'DMS did not start within 45 seconds.' }
        Start-Sleep -Milliseconds 50
    } until ((Test-Path -LiteralPath $env:DMS_QA_READY_FILE) -and $app.MainWindowHandle -ne 0)

    $window = [System.Windows.Automation.AutomationElement]::FromHandle($app.MainWindowHandle)
    if ($null -eq $window) { throw 'Could not access the DMS window through UI Automation.' }
    $samples = @()
    foreach ($iteration in 1..3) {
        foreach ($page in @('recipes', 'ingredients')) {
            $id = if ($page -eq 'recipes') { 'PerformanceNavRecipes' } else { 'PerformanceNavIngredients' }
            $condition = [System.Windows.Automation.PropertyCondition]::new([System.Windows.Automation.AutomationElement]::AutomationIdProperty, $id)
            $item = $window.FindFirst([System.Windows.Automation.TreeScope]::Descendants, $condition)
            if ($null -eq $item) { throw "UI Automation could not find $id." }
            Remove-Item -LiteralPath $env:DMS_QA_PAGE_READY_FILE -Force -ErrorAction SilentlyContinue
            $watch = [System.Diagnostics.Stopwatch]::StartNew()
            $invoke = $item.GetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern)
            $invoke.Invoke()
            $deadline = [DateTime]::UtcNow.AddSeconds(45)
            do {
                $app.Refresh()
                if ($app.HasExited) { throw "DMS exited navigating to $page." }
                if ([DateTime]::UtcNow -ge $deadline) { throw "Timed out waiting for $page to render." }
                Start-Sleep -Milliseconds 50
                $signal = if (Test-Path -LiteralPath $env:DMS_QA_PAGE_READY_FILE) {
                    try { Get-Content -LiteralPath $env:DMS_QA_PAGE_READY_FILE -Raw } catch { '' }
                } else { '' }
            } until ($signal -eq "${page}:1000")
            $watch.Stop()
            $app.Refresh()
            $samples += [pscustomobject]@{ iteration = $iteration; page = $page; item_count = 1000; milliseconds = [math]::Round($watch.Elapsed.TotalMilliseconds, 1); working_set_bytes = $app.WorkingSet64; private_bytes = $app.PrivateMemorySize64 }
        }
    }
    $output = [System.IO.Path]::GetFullPath($OutputPath)
    New-Item -ItemType Directory -Path (Split-Path $output) -Force | Out-Null
    [pscustomobject]@{
        schemaVersion = 1
        scope = 'UI Automation invocation to first rendering callback after database load and list binding; not a guarantee of displayed pixels or complete user interactivity.'
        notes = 'Generated database, 1,000 recipes and 1,000 ingredients; memory sampled after each navigation. Includes up to 50 ms polling overhead.'
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
    Remove-Item -LiteralPath $folder -Recurse -Force -ErrorAction SilentlyContinue
}
