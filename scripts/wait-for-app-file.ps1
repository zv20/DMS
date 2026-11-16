function Wait-DmsAppFile {
    param(
        [System.Diagnostics.Process] $App,
        [string] $Path,
        [string] $Description
    )

    $deadline = (Get-Date).AddSeconds(45)
    while (!(Test-Path -LiteralPath $Path)) {
        $App.Refresh()
        if ($App.HasExited) { throw "$Description failed. DMS exited with code $($App.ExitCode)." }
        if ((Get-Date) -ge $deadline) { throw "$Description timed out after 45 seconds." }
        Start-Sleep -Seconds 1
    }
}
