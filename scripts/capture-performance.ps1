<#
.SYNOPSIS
Captures process memory and manual interaction timings for an already running DMS.
.DESCRIPTION
Use a Release build without the Visual Studio debugger attached. The script only
observes the selected process, but DMS itself uses the current Windows user's
normal data and can write settings and backups. Use a disposable Windows account
for an isolated run. The scenario does not ask you to save any changes. It does
not include data, file paths, process names, or dumps in the output. Manual
interaction times include human reaction time and are approximate.
.PARAMETER ProcessId
DMS process ID. Required when more than one DMS process is running.
.PARAMETER OutputRoot
Directory in which to create the results folder. Defaults to artifacts.
#>
[CmdletBinding()]
param(
    [int]$ProcessId = 0,
    [string]$OutputRoot = ''
)

$ErrorActionPreference = 'Stop'
if ([string]::IsNullOrWhiteSpace($OutputRoot)) {
    $OutputRoot = Join-Path $PSScriptRoot '..\artifacts\performance-baselines'
}
if ($ProcessId -eq 0) {
    $candidates = @(Get-Process -Name DMS -ErrorAction SilentlyContinue)
    if ($candidates.Count -ne 1) {
        throw "Expected one running DMS process, found $($candidates.Count). Start one instance or specify -ProcessId."
    }
    $ProcessId = $candidates[0].Id
}
$process = Get-Process -Id $ProcessId -ErrorAction Stop
if ($process.ProcessName -ne 'DMS') { throw "Process $ProcessId is not DMS." }
$startedAt = $process.StartTime.ToUniversalTime()
$runPath = Join-Path $OutputRoot ('ui-' + (Get-Date -Format 'yyyyMMdd-HHmmss') + '-' + [guid]::NewGuid().ToString('N').Substring(0, 8))
New-Item -ItemType Directory -Path $runPath -Force | Out-Null
$memoryPath = Join-Path $runPath 'memory.csv'
$timingsPath = Join-Path $runPath 'interactions.csv'
$hash = try { (Get-FileHash -LiteralPath $process.Path -Algorithm SHA256).Hash } catch { $null }
$revision = try { (& git -C (Join-Path $PSScriptRoot '..') rev-parse HEAD 2>$null | Select-Object -First 1) } catch { $null }
[pscustomobject]@{
    captured_at_utc = [DateTime]::UtcNow.ToString('o')
    windows_version = [Environment]::OSVersion.VersionString
    os_architecture = $env:PROCESSOR_ARCHITECTURE
    logical_processors = [Environment]::ProcessorCount
    executable_sha256 = $hash
    checkout_revision = $revision
    process_start_utc = $startedAt.ToString('o')
    notes = 'Checkout revision is not proof of the executable version. Interaction timings include user reaction time. The capture observes the current Windows user data; it does not isolate DMS.'
} | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $runPath 'run.json') -Encoding UTF8

$job = Start-Job -ArgumentList $ProcessId, $startedAt.Ticks, $memoryPath -ScriptBlock {
    param($targetId, $startTicks, $path)
    'timestamp_utc,working_set_bytes,private_bytes,status' | Set-Content -LiteralPath $path -Encoding UTF8
    while ($true) {
        $stamp = [DateTime]::UtcNow.ToString('o')
        $p = Get-Process -Id $targetId -ErrorAction SilentlyContinue
        if ($null -eq $p -or $p.StartTime.ToUniversalTime().Ticks -ne $startTicks) {
            "$stamp,,,exited_or_restarted" | Add-Content -LiteralPath $path -Encoding UTF8
            break
        }
        "$stamp,$($p.WorkingSet64),$($p.PrivateMemorySize64),running" | Add-Content -LiteralPath $path -Encoding UTF8
        Start-Sleep -Seconds 1
    }
}

$steps = @(
    @{ Name = 'open-recipes'; Prompt = 'From Menu Planner, open Recipes and wait until the page is usable.' },
    @{ Name = 'open-ingredients'; Prompt = 'Open Ingredients and wait until the page is usable.' },
    @{ Name = 'open-allergens'; Prompt = 'Open Allergens and wait until the page is usable.' },
    @{ Name = 'open-menu-planner'; Prompt = 'Open Menu Planner and wait until the page is usable.' },
    @{ Name = 'open-template-builder'; Prompt = 'Open Template Builder and wait until the page is usable.' },
    @{ Name = 'return-to-recipes'; Prompt = 'Open Recipes again and wait until the page is usable.' },
    @{ Name = 'repeat-navigation'; Prompt = 'Visit Menu Planner, Template Builder, and Recipes three times; finish on Recipes.' }
)

try {
    $deadline = [DateTime]::UtcNow.AddSeconds(10)
    while (-not (Test-Path -LiteralPath $memoryPath)) {
        if ($job.State -in @('Failed', 'Stopped', 'Completed') -or [DateTime]::UtcNow -ge $deadline) {
            throw 'The memory sampler could not start.'
        }
        Start-Sleep -Milliseconds 200
    }
    Write-Host "DMS uses this Windows account's normal data and may write settings or backups. Use a disposable Windows account for isolation."
    Write-Host 'Do not save changes while following these read-only prompts. You may type q at any prompt to stop.'
    Write-Host 'Allow the app to settle for 15 seconds on Menu Planner before beginning.'
    $stoppedEarly = $false
    foreach ($step in $steps) {
        Write-Host "`n$($step.Prompt)"
        $answer = Read-Host 'Press Enter BEFORE performing this step, or type q to stop'
        if ($answer -eq 'q') { $stoppedEarly = $true; break }
        $current = Get-Process -Id $ProcessId -ErrorAction SilentlyContinue
        if ($null -eq $current -or $current.StartTime.ToUniversalTime() -ne $startedAt) {
            Write-Warning 'The original DMS process exited or restarted. Start a new capture.'
            $stoppedEarly = $true
            break
        }
        $startUtc = [DateTime]::UtcNow
        $watch = [System.Diagnostics.Stopwatch]::StartNew()
        $answer = Read-Host 'Perform the step now, then press Enter when complete (or q to stop)'
        $watch.Stop()
        if ($answer -eq 'q') { $stoppedEarly = $true; break }
        $current = Get-Process -Id $ProcessId -ErrorAction SilentlyContinue
        if ($null -eq $current -or $current.StartTime.ToUniversalTime() -ne $startedAt) {
            Write-Warning 'The original DMS process exited or restarted. This step was not recorded.'
            $stoppedEarly = $true
            break
        }
        [pscustomobject]@{
            scenario = $step.Name
            start_utc = $startUtc.ToString('o')
            end_utc = [DateTime]::UtcNow.ToString('o')
            elapsed_ms = $watch.ElapsedMilliseconds
        } | Export-Csv -LiteralPath $timingsPath -NoTypeInformation -Append -Encoding UTF8
        Write-Host "Recorded $($step.Name)."
    }
    if (-not $stoppedEarly) {
        Write-Host "`nWait 15 seconds on the last page before completing the capture."
        [void](Read-Host 'Press Enter to finish')
    }
}
finally {
    Stop-Job -Job $job -ErrorAction SilentlyContinue
    Receive-Job -Job $job -ErrorAction SilentlyContinue
    Remove-Job -Job $job -Force -ErrorAction SilentlyContinue
    Write-Host "Capture saved to: $runPath"
}
