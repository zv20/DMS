; Per-user DMS setup. Publish the app to artifacts\DMS-win-x64 before compiling.
#ifndef MyAppVersion
  #define MyAppVersion "0.0.1"
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
DisableDirPage=no
DisableReadyPage=yes
OutputDir=..\artifacts\installer
OutputBaseFilename=DMS-Setup-{#MyAppVersion}
SetupIconFile=..\DMS\Assets\app.ico
UninstallDisplayIcon={app}\Assets\app.ico
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
WizardSizePercent=120
WizardImageFile=..\DMS\Assets\logo.png
WizardSmallImageFile=..\DMS\Assets\logo.png
PrivilegesRequired=lowest
UsePreviousTasks=no
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
  AdvancedOptions, DesktopShortcut: TNewCheckBox;
  LanguagePage: TInputOptionWizardPage;
  BackupPage: TInputFileWizardPage;
  BrandLabel, TaglineLabel, HeadingLabel, DescriptionLabel: TNewStaticText;
  NextParent: TWinControl;
  NextLeft, NextTop, NextWidth, NextHeight: Integer;

procedure AdvancedChanged(Sender: TObject);
begin
  if AdvancedOptions.Checked then
    WizardForm.NextButton.Caption := 'Next >'
  else
    WizardForm.NextButton.Caption := 'Install DMS';
end;

procedure InitializeWizard();
begin
  { Keep the built-in wizard controls and accessibility, but make the first
    page a simple branded install screen. The app icon remains in the title bar. }
  NextParent := WizardForm.NextButton.Parent;
  NextLeft := WizardForm.NextButton.Left;
  NextTop := WizardForm.NextButton.Top;
  NextWidth := WizardForm.NextButton.Width;
  NextHeight := WizardForm.NextButton.Height;
  WizardForm.WizardBitmapImage.Parent := WizardForm.WelcomePage;
  WizardForm.WizardBitmapImage.Width := ScaleX(86);
  WizardForm.WizardBitmapImage.Height := ScaleY(86);
  WizardForm.WizardBitmapImage.Left := (WizardForm.WelcomePage.ClientWidth - ScaleX(86)) div 2;
  WizardForm.WizardBitmapImage.Top := ScaleY(3);
  WizardForm.WizardBitmapImage.Stretch := True;
  WizardForm.WelcomeLabel1.Visible := False;
  WizardForm.WelcomeLabel2.Visible := False;

  BrandLabel := TNewStaticText.Create(WizardForm.WelcomePage);
  BrandLabel.Parent := WizardForm.WelcomePage;
  BrandLabel.Caption := 'DMS';
  BrandLabel.AutoSize := False;
  BrandLabel.Alignment := taCenter;
  BrandLabel.Width := WizardForm.WelcomePage.ClientWidth;
  BrandLabel.Height := ScaleY(24);
  BrandLabel.Left := 0;
  BrandLabel.Top := ScaleY(87);
  BrandLabel.Font.Size := 14;
  BrandLabel.Font.Style := [fsBold];
  BrandLabel.Font.Color := $0041250A;

  TaglineLabel := TNewStaticText.Create(WizardForm.WelcomePage);
  TaglineLabel.Parent := WizardForm.WelcomePage;
  TaglineLabel.Caption := 'KITCHEN MENU PLANNING';
  TaglineLabel.AutoSize := False;
  TaglineLabel.Alignment := taCenter;
  TaglineLabel.Width := WizardForm.WelcomePage.ClientWidth;
  TaglineLabel.Height := ScaleY(18);
  TaglineLabel.Left := 0;
  TaglineLabel.Top := ScaleY(109);
  TaglineLabel.Font.Size := 9;
  TaglineLabel.Font.Style := [fsBold];
  TaglineLabel.Font.Color := $00147EFD;

  HeadingLabel := TNewStaticText.Create(WizardForm.WelcomePage);
  HeadingLabel.Parent := WizardForm.WelcomePage;
  HeadingLabel.Caption := 'DMS is ready to install';
  HeadingLabel.AutoSize := False;
  HeadingLabel.Alignment := taCenter;
  HeadingLabel.Width := WizardForm.WelcomePage.ClientWidth;
  HeadingLabel.Height := ScaleY(26);
  HeadingLabel.Left := 0;
  HeadingLabel.Top := ScaleY(132);
  HeadingLabel.Font.Size := 16;
  HeadingLabel.Font.Style := [fsBold];
  HeadingLabel.Font.Color := $0041250A;

  DescriptionLabel := TNewStaticText.Create(WizardForm.WelcomePage);
  DescriptionLabel.Parent := WizardForm.WelcomePage;
  DescriptionLabel.AutoSize := False;
  DescriptionLabel.WordWrap := True;
  DescriptionLabel.Alignment := taCenter;
  DescriptionLabel.Caption := 'Install DMS in the default location, or choose advanced options below.';
  DescriptionLabel.Left := ScaleX(22);
  DescriptionLabel.Top := ScaleY(164);
  DescriptionLabel.Width := WizardForm.WelcomePage.ClientWidth - ScaleX(44);
  DescriptionLabel.Height := ScaleY(32);

  DesktopShortcut := TNewCheckBox.Create(WizardForm.WelcomePage);
  DesktopShortcut.Parent := WizardForm.WelcomePage;
  DesktopShortcut.Caption := 'Create a desktop shortcut';
  DesktopShortcut.Left := ScaleX(22);
  DesktopShortcut.Top := WizardForm.WelcomePage.ClientHeight - ScaleY(54);
  DesktopShortcut.Width := WizardForm.WelcomePage.ClientWidth - ScaleX(44);
  DesktopShortcut.Checked := WizardIsTaskSelected('desktopicon');

  AdvancedOptions := TNewCheckBox.Create(WizardForm.WelcomePage);
  AdvancedOptions.Parent := WizardForm.WelcomePage;
  AdvancedOptions.Caption := 'Advanced options';
  AdvancedOptions.Left := ScaleX(22);
  AdvancedOptions.Top := WizardForm.WelcomePage.ClientHeight - ScaleY(28);
  AdvancedOptions.Width := WizardForm.WelcomePage.ClientWidth - ScaleX(44);
  AdvancedOptions.OnClick := @AdvancedChanged;

  LanguagePage := CreateInputOptionPage(wpSelectTasks, 'DMS language',
    'Choose the application language',
    'Choose a language or keep the existing setting. You can change it in DMS later.', True, False);
  LanguagePage.Add('Keep existing setting or use the default');
  LanguagePage.Add('English');
  LanguagePage.Add('Bulgarian');
  LanguagePage.SelectedValueIndex := 0;

  BackupPage := CreateInputFilePage(LanguagePage.ID, 'Restore a backup',
    'Optionally choose a DMS backup',
    'DMS will validate the backup and ask before replacing existing data when it starts. Leave blank to skip.');
  BackupPage.Add('DMS backup file:', 'DMS database backup (*.db)|*.db|All files (*.*)|*.*', '.db');
end;

procedure CurPageChanged(CurPageID: Integer);
begin
  if CurPageID = wpWelcome then begin
    WizardForm.NextButton.Parent := WizardForm.WelcomePage;
    WizardForm.NextButton.Width := ScaleX(180);
    WizardForm.NextButton.Height := ScaleY(34);
    WizardForm.NextButton.Left := (WizardForm.WelcomePage.ClientWidth - WizardForm.NextButton.Width) div 2;
    WizardForm.NextButton.Top := WizardForm.WelcomePage.ClientHeight - ScaleY(100);
    AdvancedChanged(nil);
  end else begin
    WizardForm.NextButton.Parent := NextParent;
    WizardForm.NextButton.Left := NextLeft;
    WizardForm.NextButton.Top := NextTop;
    WizardForm.NextButton.Width := NextWidth;
    WizardForm.NextButton.Height := NextHeight;
  end;
end;

function ShouldSkipPage(PageID: Integer): Boolean;
begin
  Result := False;
  if PageID = wpSelectTasks then begin
    Result := True;
    exit;
  end;
  if (PageID = wpSelectDir) or
     (PageID = LanguagePage.ID) or (PageID = BackupPage.ID) then
    Result := not AdvancedOptions.Checked;
end;

function NextButtonClick(CurPageID: Integer): Boolean;
var
  BackupPath, RequestPath: String;
begin
  Result := True;
  if CurPageID = wpWelcome then begin
    if DesktopShortcut.Checked then WizardSelectTasks('desktopicon')
    else WizardSelectTasks('!desktopicon');
    exit;
  end;
  if CurPageID <> BackupPage.ID then exit;
  BackupPath := Trim(BackupPage.Values[0]);
  if (BackupPath <> '') and not FileExists(BackupPath) then begin
    MsgBox('The selected backup file could not be found. Choose an existing file or leave the field empty.', mbError, MB_OK);
    Result := False;
    exit;
  end;
  RequestPath := ExpandConstant('{userappdata}\DMS\installer-request.ini');
  if ((LanguagePage.SelectedValueIndex > 0) or (BackupPath <> '')) and FileExists(RequestPath) then begin
    MsgBox('DMS has an earlier setup request waiting to be handled. Open DMS first, then run setup again if needed.', mbError, MB_OK);
    Result := False;
  end;
end;

procedure CurStepChanged(CurStep: TSetupStep);
var
  RequestPath, Language, BackupPath: String;
  Lines: TArrayOfString;
begin
  if (CurStep <> ssPostInstall) or not AdvancedOptions.Checked then exit;
  Language := '';
  if LanguagePage.SelectedValueIndex = 1 then Language := 'en';
  if LanguagePage.SelectedValueIndex = 2 then Language := 'bg';
  BackupPath := Trim(BackupPage.Values[0]);
  if (Language = '') and (BackupPath = '') then exit;
  RequestPath := ExpandConstant('{userappdata}\DMS\installer-request.ini');
  if FileExists(RequestPath) or not ForceDirectories(ExtractFileDir(RequestPath)) then begin
    MsgBox('DMS was installed, but the selected first-run options could not be saved. Open DMS and configure them in Settings.', mbError, MB_OK);
    exit;
  end;
  SetArrayLength(Lines, 3);
  Lines[0] := '[Setup]';
  Lines[1] := 'Language=' + Language;
  Lines[2] := 'Backup=' + BackupPath;
  if not SaveStringsToUTF8File(RequestPath, Lines, False) then
    MsgBox('DMS was installed, but the selected first-run options could not be saved. Open DMS and configure them in Settings.', mbError, MB_OK);
end;
