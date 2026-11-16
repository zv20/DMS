function Get-DmsCaptureProcess([int] $ProcessId) {
    if ($ProcessId -eq 0) {
        $candidates = @(Get-Process -Name DMS -ErrorAction SilentlyContinue)
        if ($candidates.Count -ne 1) {
            throw "Expected one running DMS process, found $($candidates.Count). Start one instance or specify -ProcessId."
        }
        $ProcessId = $candidates[0].Id
    }
    $process = Get-Process -Id $ProcessId -ErrorAction Stop
    if ($process.ProcessName -ne 'DMS') { throw "Process $ProcessId is not DMS." }
    return $process
}

function Start-DmsMemorySampler {
    param(
        [int] $ProcessId,
        [long] $StartTicks,
        [string] $Path,
        [switch] $IncludeProcessId
    )

    Start-Job -ArgumentList $ProcessId, $StartTicks, $Path, $IncludeProcessId.IsPresent -ScriptBlock {
        param($targetId, $startTicks, $path, $includePid)
        $pidColumn = if ($includePid) { ',pid' } else { '' }
        $pidValue = if ($includePid) { ",$targetId" } else { '' }
        "timestamp_utc$pidColumn,working_set_bytes,private_bytes,status" | Set-Content -LiteralPath $path -Encoding UTF8
        while ($true) {
            $stamp = [DateTime]::UtcNow.ToString('o')
            $p = Get-Process -Id $targetId -ErrorAction SilentlyContinue
            if ($null -eq $p -or $p.StartTime.ToUniversalTime().Ticks -ne $startTicks) {
                "${stamp}${pidValue},,,exited_or_restarted" | Add-Content -LiteralPath $path -Encoding UTF8
                break
            }
            "$stamp$pidValue,$($p.WorkingSet64),$($p.PrivateMemorySize64),running" | Add-Content -LiteralPath $path -Encoding UTF8
            Start-Sleep -Seconds 1
        }
    }
}
