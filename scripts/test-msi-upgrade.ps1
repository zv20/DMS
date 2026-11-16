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

# GitHub-hosted runner only: discard the fresh-install smoke test's data.
if (Test-Path -LiteralPath $dataDir) { Remove-Item -LiteralPath $dataDir -Recurse -Force }
Install-Msi $PreviousMsi
$exe = Join-Path $installDir 'DMS.exe'
if (!(Test-Path $exe)) { throw 'Previous DMS executable was not installed.' }
$old = Start-Process $exe -WorkingDirectory $installDir -PassThru
try {
    Wait-DmsAppFile $old $database 'Previous DMS database creation'
} finally { Stop-App $old }

$hash = (Get-FileHash $database).Hash
$marker = Join-Path $dataDir 'upgrade-marker.txt'
Set-Content $marker 'existing user data'
Install-Msi $CurrentMsi
if (!(Test-Path $database) -or (Get-FileHash $database).Hash -ne $hash -or (Get-Content $marker -Raw).Trim() -ne 'existing user data') {
    throw 'Upgrade removed or changed existing data.'
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
