param(
    [Parameter(Mandatory)] [string] $Msi,
    [Parameter(Mandatory)] [string] $Version
)

$ErrorActionPreference = 'Stop'
$msiPath = (Resolve-Path -LiteralPath $Msi).Path
$setupPath = [IO.Path]::ChangeExtension($msiPath, 'exe')
$downloadDir = Join-Path ([IO.Path]::GetTempPath()) ("dms-runtime-" + [guid]::NewGuid())
New-Item -ItemType Directory $downloadDir | Out-Null

try {
    $dotnetVersion = '10.0.15'
    $dotnetUrl = "https://builds.dotnet.microsoft.com/dotnet/Runtime/$dotnetVersion/dotnet-runtime-$dotnetVersion-win-x64.exe"
    $winAppUrl = 'https://download.microsoft.com/download/de664922-b046-432f-bb2a-54aec3c5f1f6/WindowsAppRuntimeInstall-x64.exe'
    $dotnetInstaller = Join-Path $downloadDir "dotnet-runtime-$dotnetVersion-win-x64.exe"
    $winAppInstaller = Join-Path $downloadDir 'WindowsAppRuntimeInstall-x64.exe'

    Invoke-WebRequest -Uri $dotnetUrl -OutFile $dotnetInstaller
    Invoke-WebRequest -Uri $winAppUrl -OutFile $winAppInstaller
    foreach ($path in @($dotnetInstaller, $winAppInstaller)) {
        $signature = Get-AuthenticodeSignature -FilePath $path
        if ($signature.Status -ne 'Valid' -or $signature.SignerCertificate.Subject -notmatch '(^|, )O=Microsoft Corporation(,|$)') {
            throw "Microsoft signature verification failed for $(Split-Path -Leaf $path): $($signature.Status)"
        }
    }

    # Burn hashes the runtime installers at build time and checks the downloads at setup time.
    $bal = Join-Path $env:USERPROFILE '.wix/extensions/WixToolset.Bal.wixext/5.0.2/wixext5/WixToolset.BootstrapperApplications.wixext.dll'
    wix build "$PSScriptRoot/../installer/DMS-Setup.wxs" -ext $bal -ext WixToolset.Netfx.wixext -arch x64 `
        -d "Version=$Version" -d "DmsMsi=$msiPath" -d "DotNetVersion=$dotnetVersion" `
        -d "DotNetInstaller=$dotnetInstaller" -d "DotNetUrl=$dotnetUrl" `
        -d "WinAppInstaller=$winAppInstaller" -d "WinAppUrl=$winAppUrl" -o $setupPath
    if ($LASTEXITCODE -ne 0) { throw "WiX bundle build failed with exit code $LASTEXITCODE." }
    Write-Host "Online setup: $setupPath ($((Get-Item $setupPath).Length) bytes)"
}
finally {
    Remove-Item -LiteralPath $downloadDir -Recurse -Force
}
