; DMS per-user Windows installer. Compile after publishing to artifacts\DMS-win-x64.
; The standard wizard remains one-click by default. Ticking Advanced options
; reveals the familiar location and shortcut pages without needing elevation.

#ifndef MyAppVersion
  #define MyAppVersion "2.0.0-beta.2"
#endif

[Setup]
AppId={{62CF39B5-8F17-4242-9DE5-99B3A75219ED}
AppName=DMS
AppVersion={#MyAppVersion}
AppPublisher=DMS
AppPublisherURL=https://github.com/zv20/DMS
DefaultDirName={localappdata}\Programs\DMS
DefaultGroupName=DMS
DisableProgramGroupPage=yes
DisableWelcomePage=no
DisableDirPage=yes
DisableReadyPage=yes
OutputDir=..\artifacts\installer
OutputBaseFilename=DMS-Setup-{#MyAppVersion}
SetupIconFile=..\DMS\Assets\app.ico
UninstallDisplayIcon={app}\Assets\app.ico
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=lowest
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible

[Tasks]
Name: "desktopicon"; Description: "Create a desktop shortcut"; Flags: unchecked

[Files]
Source: "..\artifacts\DMS-win-x64\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{autoprograms}\DMS"; Filename: "{app}\DMS.exe"
Name: "{autodesktop}\DMS"; Filename: "{app}\DMS.exe"; Tasks: desktopicon

[Run]
Filename: "{app}\DMS.exe"; Description: "Launch DMS"; Flags: nowait postinstall skipifsilent

[Code]
var
  AdvancedOptions: TNewCheckBox;

procedure InitializeWizard();
begin
  AdvancedOptions := TNewCheckBox.Create(WizardForm.WelcomePage);
  AdvancedOptions.Parent := WizardForm.WelcomePage.Surface;
  AdvancedOptions.Caption := 'Advanced options (install location and desktop shortcut)';
  AdvancedOptions.Left := ScaleX(12);
  AdvancedOptions.Top := ScaleY(184);
  AdvancedOptions.Width := WizardForm.WelcomePage.SurfaceWidth - ScaleX(24);
end;

function ShouldSkipPage(PageID: Integer): Boolean;
begin
  Result := False;
  if (PageID = wpSelectDir) or (PageID = wpSelectTasks) then
    Result := not AdvancedOptions.Checked;
end;
