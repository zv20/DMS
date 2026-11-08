<#
.SYNOPSIS
Records DMS process memory and repeatable checkpoints while you use the app.
.DESCRIPTION
Run from a Visual Studio Developer PowerShell after starting DMS. The script
does not click, restart, modify, or force garbage collection in the app.
Use -CaptureDumps to also collect .NET full dumps at each checkpoint. Install
dotnet-dump separately before using that option. Dumps can contain private data.
.PARAMETER ProcessId
The DMS process ID. Required if more than one DMS process is running.
.PARAMETER CaptureDumps
Collect a full .NET dump at each checkpoint using an installed dotnet-dump.
.PARAMETER OutputRoot
Directory for a new run folder. Defaults to the ignored artifacts folder.
#>
[CmdletBinding()]
param(
    [int]$ProcessId = 0,
    [switch]$CaptureDumps,
    [string]$OutputRoot = (Join-Path $PSScriptRoot '..\artifacts\memory-captures')
)

$ErrorActionPreference = 'Stop'
if ($CaptureDumps -and -not (Get-Command dotnet-dump -ErrorAction SilentlyContinue)) {
    throw 'dotnet-dump is not available. Install it first or run without -CaptureDumps.'
}

if ($ProcessId -eq 0) {
    $candidates = @(Get-Process -Name DMS -ErrorAction SilentlyContinue)
    if ($candidates.Count -ne 1) {
        throw "Expected one DMS process, found $($candidates.Count). Start DMS or pass -ProcessId."
    }
    $ProcessId = $candidates[0].Id
}
$process = Get-Process -Id $ProcessId -ErrorAction Stop
if ($process.ProcessName -ne 'DMS') { throw "Process $ProcessId is not DMS." }
$startedAt = $process.StartTime.ToUniversalTime()
$runPath = Join-Path $OutputRoot ('run-' + (Get-Date -Format 'yyyyMMdd-HHmmss') + '-' + [guid]::NewGuid().ToString('N').Substring(0, 8))
New-Item -ItemType Directory -Path $runPath -Force | Out-Null
$csvPath = Join-Path $runPath 'memory.csv'
$checkpointPath = Join-Path $runPath 'checkpoints.csv'
$revision = try { (& git -C (Join-Path $PSScriptRoot '..') rev-parse HEAD 2>$null | Select-Object -First 1) } catch { $null }
[pscustomobject]@{
    CapturedAtUtc = [DateTime]::UtcNow.ToString('o')
    ProcessId = $ProcessId
    ProcessStartUtc = $startedAt.ToString('o')
    ProcessPath = $process.Path
    CheckoutRevision = $revision
    Note = 'Checkout revision is not proof of the loaded binary revision.'
} | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $runPath 'run.json') -Encoding UTF8

$job = Start-Job -ArgumentList $ProcessId, $startedAt.Ticks, $csvPath -ScriptBlock {
    param($targetId, $startTicks, $path)
    'timestamp_utc,pid,working_set_bytes,private_bytes,status' | Set-Content -LiteralPath $path -Encoding UTF8
    while ($true) {
        $stamp = [DateTime]::UtcNow.ToString('o')
        $p = Get-Process -Id $targetId -ErrorAction SilentlyContinue
        if ($null -eq $p -or $p.StartTime.ToUniversalTime().Ticks -ne $startTicks) {
            "$stamp,$targetId,,,exited_or_restarted" | Add-Content -LiteralPath $path -Encoding UTF8
            break
        }
        "$stamp,$targetId,$($p.WorkingSet64),$($p.PrivateMemorySize64),running" | Add-Content -LiteralPath $path -Encoding UTF8
        Start-Sleep -Seconds 1
    }
}

$steps = @(
    @{ Name = '01-baseline'; Prompt = 'Stay on Menu Planner after a fresh app start; wait 15 seconds.' },
    @{ Name = '02-builder'; Prompt = 'Open Template Builder and load an image-heavy saved template.' },
    @{ Name = '03-left-builder'; Prompt = 'Navigate to Recipes and wait 15 seconds.' },
    @{ Name = '04-repeated'; Prompt = 'Repeat the same builder/template and Recipes sequence three times; wait 15 seconds on Recipes.' },
    @{ Name = '05-print-preview'; Prompt = 'Open and close Print/Export; return to Recipes and wait 15 seconds.' }
)

try {
    Write-Host "Recording PID $ProcessId every second. Output: $runPath"
    Write-Host 'Keep DMS running. For Visual Studio heap snapshots, take a snapshot at each checkpoint before pressing Enter.'
    if ($CaptureDumps) { Write-Host 'Full dumps may pause DMS, take disk space, and contain private data.' }
    foreach ($step in $steps) {
        Write-Host "`n$($step.Prompt)"
        $answer = Read-Host "When ready, press Enter for $($step.Name), or type q to stop"
        if ($answer -eq 'q') { break }
        $current = Get-Process -Id $ProcessId -ErrorAction SilentlyContinue
        if ($null -eq $current -or $current.StartTime.ToUniversalTime() -ne $startedAt) {
            Write-Warning 'The original DMS process exited or restarted. Start a new capture for the new process.'
            break
        }
        $dumpStatus = 'not_requested'
        $dumpName = ''
        $checkpointUtc = [DateTime]::UtcNow.ToString('o')
        if ($CaptureDumps) {
            $dumpName = $step.Name + '.dmp'
            & dotnet-dump collect --process-id $ProcessId --type Full --output (Join-Path $runPath $dumpName)
            if ($LASTEXITCODE -eq 0 -and (Test-Path -LiteralPath (Join-Path $runPath $dumpName))) { $dumpStatus = 'collected' }
            else { $dumpStatus = 'failed'; Write-Warning "Dump collection failed for $($step.Name)." }
        }
        [pscustomobject]@{ timestamp_utc = $checkpointUtc; checkpoint = $step.Name; pid = $ProcessId; dump_status = $dumpStatus; dump_file = $dumpName } |
            Export-Csv -LiteralPath $checkpointPath -NoTypeInformation -Append -Encoding UTF8
        Write-Host "Recorded $($step.Name)."
    }
}
finally {
    Stop-Job -Job $job -ErrorAction SilentlyContinue
    Receive-Job -Job $job -ErrorAction SilentlyContinue
    Remove-Job -Job $job -Force -ErrorAction SilentlyContinue
    Write-Host "Capture complete: $runPath"
}
