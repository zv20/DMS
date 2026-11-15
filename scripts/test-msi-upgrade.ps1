param(
    [Parameter(Mandatory)] [string] $PreviousMsi,
    [Parameter(Mandatory)] [string] $CurrentMsi,
    [Parameter(Mandatory)] [string] $Version
)

$ErrorActionPreference = 'Stop'
$installDir = Join-Path $env:RUNNER_TEMP 'DMS-upgrade'
$dataDir = Join-Path ([Environment]::GetFolderPath('ApplicationData')) 'DMS'
$database = Join-Path $dataDir 'dms.db'
$log = Join-Path $env:RUNNER_TEMP 'dms-upgrade.log'
$ready = Join-Path $env:RUNNER_TEMP 'dms-upgrade-ready.txt'

function Install-Msi([string] $Path) {
    $result = Start-Process msiexec.exe -ArgumentList @('/i', "`"$Path`"", '/qn', '/norestart', "INSTALLFOLDER=`"$installDir`"", '/l*v', "`"$log`"") -Wait -PassThru
    if ($result.ExitCode -ne 0) { Get-Content $log; throw "MSI installation failed: $($result.ExitCode)" }
}

function Stop-App($App) {
    $App.Refresh()
    if (!$App.HasExited) {
        [void]$App.CloseMainWindow()
        if (!$App.WaitForExit(10000)) { Stop-Process -Id $App.Id -Force; $App.WaitForExit() }
    }
}

# GitHub-hosted runner only: discard the fresh-install smoke test's data.
if (Test-Path $dataDir) { Remove-Item $dataDir -Recurse -Force }
Install-Msi $PreviousMsi
$exe = Join-Path $installDir 'DMS.exe'
if (!(Test-Path $exe)) { throw 'Previous DMS executable was not installed.' }
$old = Start-Process $exe -WorkingDirectory $installDir -PassThru
try {
    $deadline = (Get-Date).AddSeconds(45)
    while ((Get-Date) -lt $deadline -and !(Test-Path $database)) {
        $old.Refresh()
        if ($old.HasExited) { throw "Previous DMS exited: $($old.ExitCode)" }
        Start-Sleep -Seconds 1
    }
    if (!(Test-Path $database)) { throw 'Previous DMS did not create its database.' }
} finally { Stop-App $old }

$hash = (Get-FileHash $database).Hash
$marker = Join-Path $dataDir 'upgrade-marker.txt'
Set-Content $marker 'existing user data'
Install-Msi $CurrentMsi
if (!(Test-Path $database) -or (Get-FileHash $database).Hash -ne $hash -or (Get-Content $marker -Raw).Trim() -ne 'existing user data') {
    throw 'Upgrade removed or changed existing data.'
}
$entries = @(Get-ItemProperty 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*' -ErrorAction SilentlyContinue | Where-Object { $_.DisplayName -eq 'DMS' -and $_.WindowsInstaller -eq 1 })
if ($entries.Count -ne 1 -or $entries[0].DisplayVersion -ne $Version) {
    throw "Expected one installed DMS MSI at version $Version; found: $($entries | Out-String)"
}

Remove-Item $ready -Force -ErrorAction SilentlyContinue
$env:DMS_QA_READY_FILE = $ready
$app = Start-Process $exe -WorkingDirectory $installDir -PassThru
try {
    $deadline = (Get-Date).AddSeconds(45)
    while ((Get-Date) -lt $deadline -and !(Test-Path $ready)) {
        $app.Refresh()
        if ($app.HasExited) { throw "Upgraded DMS exited: $($app.ExitCode)" }
        Start-Sleep -Seconds 1
    }
    if (!(Test-Path $ready)) { throw 'Upgraded DMS did not reach its main window.' }
} finally { Stop-App $app }
Write-Host "Upgraded 0.0.12 to $Version, preserved existing data, and started DMS."
