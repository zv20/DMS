param(
    [Parameter(Mandatory)] [string] $PreviousMsi,
    [Parameter(Mandatory)] [string] $CurrentMsi
)

$ErrorActionPreference = 'Stop'
if ($env:GITHUB_ACTIONS -ne 'true' -or $env:RUNNER_ENVIRONMENT -ne 'github-hosted') {
    throw 'The MSI upgrade test requires a disposable GitHub-hosted runner.'
}
. "$PSScriptRoot/wait-for-app-file.ps1"
$installDir = Join-Path $env:RUNNER_TEMP 'DMS-upgrade'
$dataDir = Join-Path ([Environment]::GetFolderPath('ApplicationData')) 'DMS'
$database = Join-Path $dataDir 'dms.db'
$log = Join-Path $env:RUNNER_TEMP 'dms-upgrade.log'
$ready = Join-Path $env:RUNNER_TEMP 'dms-upgrade-ready.txt'
$backupDir = Join-Path ([Environment]::GetFolderPath('MyDocuments')) 'DMS Backups'

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

function Get-ProductCode([string] $Path) {
    $installer = New-Object -ComObject WindowsInstaller.Installer
    $msi = $installer.OpenDatabase($Path, 0)
    $view = $msi.OpenView("SELECT ``Value`` FROM ``Property`` WHERE ``Property`` = 'ProductCode'")
    [void]$view.Execute()
    $code = [string]$view.Fetch().StringData(1)
    [void]$view.Close()
    return $code.Trim()
}

Add-Type @'
using System.Runtime.InteropServices;
public static class MsiState {
    [DllImport("msi.dll", CharSet = CharSet.Unicode)]
    public static extern int MsiQueryProductState(string product);
}
'@
$oldCode = Get-ProductCode $PreviousMsi
$newCode = Get-ProductCode $CurrentMsi

# GitHub-hosted runner only: discard the fresh-install smoke test's data.
if (Test-Path -LiteralPath $dataDir) { Remove-Item -LiteralPath $dataDir -Recurse -Force }
Install-Msi $PreviousMsi
$exe = Join-Path $installDir 'DMS.exe'
if (!(Test-Path $exe)) { throw 'Previous DMS executable was not installed.' }
$old = Start-Process $exe -WorkingDirectory $installDir -PassThru
try {
    Wait-DmsAppFile $old $database 'Previous DMS database creation'
    $running = Start-Process msiexec.exe -ArgumentList @('/i', "`"$CurrentMsi`"", '/qn', '/norestart', "INSTALLFOLDER=`"$installDir`"", '/l*v', "`"$log`"") -Wait -PassThru
    if ($running.ExitCode -eq 0 -or [MsiState]::MsiQueryProductState($oldCode) -ne 5) {
        Get-Content $log
        throw 'Upgrade should stop while DMS is running and leave the old version installed.'
    }
} finally { Stop-App $old }

# Verify that a failed backup blocks the upgrade and leaves the old version intact.
if (Test-Path -LiteralPath $backupDir) { Remove-Item -LiteralPath $backupDir -Recurse -Force }
Set-Content -LiteralPath $backupDir -Value 'Block the backup directory'
$failed = Start-Process msiexec.exe -ArgumentList @('/i', "`"$CurrentMsi`"", '/qn', '/norestart', "INSTALLFOLDER=`"$installDir`"", '/l*v', "`"$log`"") -Wait -PassThru
if ($failed.ExitCode -eq 0 -or !(Test-Path $exe) -or !(Test-Path $database) -or [MsiState]::MsiQueryProductState($oldCode) -ne 5 -or !(Select-String -Path $log -Pattern 'CreateUpgradeBackup' -Quiet)) {
    Get-Content $log
    throw 'Upgrade did not stop safely when the backup could not be created.'
}
Remove-Item -LiteralPath $backupDir -Force

python -c "import sqlite3,sys; c=sqlite3.connect(sys.argv[1]); c.execute('CREATE TABLE upgrade_backup_test (value BLOB)'); c.execute('INSERT INTO upgrade_backup_test VALUES (?)',(bytes([1,2,3]),)); c.commit(); c.close()" $database
if ($LASTEXITCODE -ne 0) { throw 'Could not create backup test data.' }
$hash = (Get-FileHash $database).Hash
$marker = Join-Path $dataDir 'upgrade-marker.txt'
Set-Content $marker 'existing user data'
$currentSetup = [IO.Path]::ChangeExtension($CurrentMsi, 'exe')
$setupLog = Join-Path $env:RUNNER_TEMP 'dms-upgrade-setup.log'
$result = Start-Process $currentSetup -ArgumentList @('/quiet', '/norestart', "InstallFolder=`"$installDir`"", '/log', "`"$setupLog`"") -Wait -PassThru
if ($result.ExitCode -ne 0) { Get-Content $setupLog; throw "Setup upgrade failed: $($result.ExitCode)" }
$backup = Get-ChildItem -LiteralPath $backupDir | Where-Object {
    $_.Name -like 'DMS-before-update-*' -and $_.Extension -in @('.db', '.dmsbackup')
} | Select-Object -First 1
if (!$backup) { throw 'Upgrade did not create a backup.' }
$backupDatabase = $backup.FullName
if ($backup.Extension -eq '.dmsbackup') {
    $backupDatabase = Join-Path $env:RUNNER_TEMP 'dms-upgrade-backup.db'
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $archive = [IO.Compression.ZipFile]::OpenRead($backup.FullName)
    try {
        $databaseEntry = $archive.GetEntry('dms.db')
        if (!$databaseEntry) { throw 'The pre-update archive does not contain its database.' }
        [IO.Compression.ZipFileExtensions]::ExtractToFile($databaseEntry, $backupDatabase, $true)
    } finally { $archive.Dispose() }
}
python -c "import sqlite3,sys; c=sqlite3.connect(sys.argv[1]); assert c.execute('PRAGMA integrity_check').fetchone()[0] == 'ok'; assert c.execute('SELECT hex(value) FROM upgrade_backup_test').fetchone()[0] == '010203'; c.close()" $backupDatabase
if ($LASTEXITCODE -ne 0) { throw 'The pre-update backup failed validation.' }
if (!(Test-Path $database) -or (Get-FileHash $database).Hash -ne $hash -or (Get-Content $marker -Raw).Trim() -ne 'existing user data') {
    throw 'Upgrade removed or changed existing data.'
}
$oldState = [MsiState]::MsiQueryProductState($oldCode)
$newState = [MsiState]::MsiQueryProductState($newCode)
Write-Host "Windows Installer product states: old=$oldState new=$newState"
Select-String -Path $log -Pattern 'FindRelatedProducts|RemoveExistingProducts|UPGRADINGPRODUCTCODE|WIX_UPGRADE_DETECTED' | ForEach-Object { Write-Host $_.Line }
if ($oldCode -eq $newCode -or $oldState -ne -1 -or $newState -ne 5) {
    throw "Expected the old MSI to be removed and $Version to be installed (old: $oldCode, new: $newCode)."
}

Remove-Item $ready -Force -ErrorAction SilentlyContinue
$env:DMS_QA_READY_FILE = $ready
$app = Start-Process $exe -WorkingDirectory $installDir -PassThru
try {
    Wait-DmsAppFile $app $ready 'Upgraded DMS main window startup'
} finally { Stop-App $app }
Write-Host "Upgraded $(Split-Path -Leaf $PreviousMsi) to $(Split-Path -Leaf $CurrentMsi), preserved existing data, and started DMS."
