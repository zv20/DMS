<# Measures time to the existing main-window navigation signal, not page load.
   Run only on a disposable GitHub-hosted runner: the script force-stops DMS. #>
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)][string]$Executable,
    [Parameter(Mandatory = $true)][string]$OutputPath
)

$ErrorActionPreference = 'Stop'
if ($env:GITHUB_ACTIONS -ne 'true') { throw 'Run startup measurement only on a disposable GitHub Actions runner.' }
$exe = (Resolve-Path -LiteralPath $Executable).Path
$output = [System.IO.Path]::GetFullPath($OutputPath)
$folder = Join-Path ([System.IO.Path]::GetTempPath()) ('dms-startup-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $folder | Out-Null
$previousReadyFile = $env:DMS_QA_READY_FILE
$samples = @()
try {
    for ($i = 0; $i -lt 3; $i++) {
        $env:DMS_QA_READY_FILE = Join-Path $folder "ready-$i.txt"
        $watch = [System.Diagnostics.Stopwatch]::StartNew()
        $app = Start-Process -FilePath $exe -WorkingDirectory (Split-Path $exe) -PassThru
        try {
            while (-not (Test-Path -LiteralPath $env:DMS_QA_READY_FILE)) {
                $app.Refresh()
                if ($app.HasExited) { throw "DMS exited before reaching its startup signal (exit code $($app.ExitCode))." }
                if ($watch.Elapsed.TotalSeconds -ge 45) { throw 'DMS did not reach its startup signal within 45 seconds.' }
                Start-Sleep -Milliseconds 50
            }
            $watch.Stop()
            $signal = (Get-Content -LiteralPath $env:DMS_QA_READY_FILE -Raw).Trim()
            if ([string]::IsNullOrWhiteSpace($signal) -or $signal -eq 'MenuViewSelected') {
                throw 'The startup signal did not contain a localized value.'
            }
            $samples += [math]::Round($watch.Elapsed.TotalMilliseconds, 1)
        }
        finally {
            $app.Refresh()
            if (-not $app.HasExited) { Stop-Process -Id $app.Id -Force; $app.WaitForExit() }
        }
    }
    New-Item -ItemType Directory -Path (Split-Path $output) -Force | Out-Null
    [pscustomobject]@{
        schemaVersion = 1
        scope = 'Process launch to main-window initial navigation signal; not full page load or interactive readiness.'
        notes = 'First run may create the database; subsequent runs reuse it. Includes an intentional startup delay and polling overhead.'
        milliseconds = $samples
    } | ConvertTo-Json | Set-Content -LiteralPath $output -Encoding UTF8
}
finally {
    $env:DMS_QA_READY_FILE = $previousReadyFile
    Remove-Item -LiteralPath $folder -Recurse -Force -ErrorAction SilentlyContinue
}
