
#define AppVersion "2.1.0"

[Setup]
AppId={{8C1B4E2A-7F6C-4D8A-9E21-5C7A0B3D9F43}
AppName=RinTune Studio
AppVersion={#AppVersion}
AppVerName=RinTune Studio v{#AppVersion}
AppPublisher=Rin0suke257
AppPublisherURL=https://github.com
DefaultDirName={localappdata}\RinTune
DefaultGroupName=RinTune Studio
PrivilegesRequired=lowest
OutputDir=..\out
OutputBaseFilename=Setup_RinTune_{#AppVersion}
SetupIconFile=..\res\rmg_icon.ico
UninstallDisplayIcon={app}\RinTune.exe
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
WizardImageFile=..\res\wizard\side.bmp
WizardSmallImageFile=..\res\wizard\small.bmp
CloseApplications=yes
RestartApplications=no
VersionInfoVersion={#AppVersion}
VersionInfoDescription=RinTune Studio Setup
ArchitecturesAllowed=x64compatible
MinVersion=10.0
ShowLanguageDialog=no

[Types]
Name: "full"; Description: "Day du (RinTune + MCP Server cho AI)"
Name: "compact"; Description: "Gon nhe (chi RinTune)"
Name: "custom"; Description: "Tuy chon"; Flags: iscustom

[Components]
Name: "main"; Description: "RinTune Studio"; Types: full compact custom; Flags: fixed
Name: "mcp"; Description: "MCP Server cho AI sinh nhac (+~95MB)"; Types: full

[Files]
Source: "..\out\RinTune\*"; DestDir: "{app}"; Flags: recursesubdirs createallsubdirs ignoreversion; Excludes: "*.pdb"; Components: main
Source: "..\out\RinTune-MCP.exe"; DestDir: "{app}\mcp"; Components: mcp
Source: "..\mcp\mcp-config-example.json"; DestDir: "{app}\mcp"; Components: mcp

[Icons]
Name: "{autoprograms}\RinTune Studio"; Filename: "{app}\RinTune.exe"
Name: "{autodesktop}\RinTune Studio"; Filename: "{app}\RinTune.exe"; Tasks: desktopicon

[InstallDelete]
Type: files; Name: "{autodesktop}\RMG - Random Music Generator.lnk"
Type: files; Name: "{autoprograms}\RMG - Random Music Generator.lnk"
Type: files; Name: "{autodesktop}\RMG - Random Music Generator*.lnk"
Type: files; Name: "{autoprograms}\RMG - Random Music Generator*.lnk"

[Tasks]
Name: "desktopicon"; Description: "Tao shortcut ngoai Desktop"; GroupDescription: "Tuy chon:"

[Run]
Filename: "{app}\RinTune.exe"; Description: "Chay RinTune ngay"; Flags: nowait postinstall skipifsilent unchecked

[Code]
const
  WebView2ClientID = '{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}';
  WebView2Reg = 'SOFTWARE\Microsoft\EdgeUpdate\Clients\' + WebView2ClientID;
  WebView2URL = 'https://go.microsoft.com/fwlink/p/?LinkId=2124703';

function IsWebView2Installed(): Boolean;
var
  Ver: String;
begin
  Result :=
    RegQueryStringValue(HKLM, WebView2Reg, 'pv', Ver) or
    RegQueryStringValue(HKCU, WebView2Reg, 'pv', Ver);
end;

function InitializeSetup(): Boolean;
var
  Res: Integer;
  ErrCode: Integer;
begin
  Result := True;
  if IsWebView2Installed() then Exit;
  Res := MsgBox(
    'Chua thay Microsoft Edge WebView2 Runtime tren may.' + #13#10 +
    'RinTune can no de hien thi giao dien.' + #13#10#13#10 +
    'Yes = Mo trang tai WebView2 roi tiep tuc' + #13#10 +
    'No = Tiep tuc cai dat (mo trang tai sau)' + #13#10 +
    'Cancel = Huy cai dat',
    mbInformation, MB_YESNOCANCEL);
  if Res = IDYES then
    ShellExec('open', WebView2URL, '', '', SW_SHOW, ewNoWait, ErrCode)
  else if Res = IDCANCEL then
    Result := False;
end;
