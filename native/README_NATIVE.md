# RMG Native - Phan mem that (C++ Win32 + WebView2)

Khong con Electron/Node. `RMG.exe` la chuong trinh C++ chay truc tiep tren Windows,
giu nguyen 100% UI va thuat toan nhac (`index.html`, `index.css`, `engine/*.js`, `renderer.js`).

## Yeu cau

- Windows 10/11 64-bit + Microsoft Edge WebView2 Runtime (co san tren hau het may Win10/11)
- De build: Visual Studio 2022/2026 ban Community + workload "Desktop development with C++"

## Build

Cach 1 (don gian): double-click `native\build.bat`
Cach 2 (Visual Studio): mo `native\RMG.sln` → chon Release/x64 → Build

Ket qua: `native\out\RMG\` gom:

- `RMG.exe` (~400-600KB)
- `index.html`, `index.css`, `engine\`, `assets\`

Copy ca thu muc `out\RMG` la chay duoc (portable, khong can cai dat).

## Kien truc

- `native\src\main.cpp` — thay the `main.js` + `preload.js`:
  cua so Win32 1040x900, nhung WebView2, tiem `window.rmgAPI` (shim JS)
  truoc khi `renderer.js` chay, nhan message tu JS qua `postMessage`.
- Luu file MIDI/MMP: dialog `GetSaveFileNameW` → ghi nhi phan truc tiep.
- Mo LMMS: tim `lmms.exe` (custom → registry App Paths → PATH → duong dan pho bien),
  neu LMMS dang chay thi copy clip XML ra clipboard + focus LMMS + Ctrl+V,
  neu chua chay thi `CreateProcess` mo project `Random_Song.mmp`
  (luu trong `%LOCALAPPDATA%\RMG\projects`).
- `native\res\` — icon + version info + manifest (PerMonitorV2 DPI).
- `native\packages\` — WebView2 SDK (NuGet, da tai san, static link, khong can DLL di kem).
- `native\thirdparty\json.hpp` — parse message JS↔C++ (nlohmann/json).

## Soan nhac that (progression / vung / khoa not)

- **Bam chip hop am** de sua tung bar (37 symbols, label hien ten not theo key/scale),
  Apply tu gieo lai cac be dang chon o toolbar, chay lai voice-leading.
- **Toolbar GIEO LAI VUNG** duoi piano-roll: chon bars + be -> gieo lai cuc bo.
- **Khoa not tay**: not them/keo/sua tu dong vien vang (locked), gieo lai vung
  va sua hop am khong xoa not locked; nut **Mo khoa het** de xa.
- Engine: `MusicGenerator.regenerateRegion / resolveBarChord / retuneProgression`,
  5 ham sinh be ho tro `barStart/barEnd` (vi tri tuyet doi + climax/contour giu nguyen).
- Undo/Redo 30 buoc (nut + Ctrl+Z/Y): snapshot bai + dieu khien, gop nhom keo slider.
- Zoom piano-roll (Vua khit/1x/2x) keo ngang khi bai dai; mixer them pan L/R tung be.
- Export khop mixer: `.mmp` dung recipe tripleoscillator theo genre + vol/pan/mute/solo
  hien tai; `.mid`/clip bo qua be mute (uu tien solo).
- Arp & Bass dac trung theo genre (khong con 1 pattern dung chung): chiptune/sasakure
  chay 1-3-5-8 + fill, lofi thua ngan dai, synthwave 8th don root-octave, dark pedal
  tram, epic quarter pulse, cyberpunk chromatic, anime 8th nay + fill; bass tuong ung
  (rolling/pedal/chay 8th/doom-pop...).
- Arranger 1-click (Pop/Gon/Epic) sinh tung doan roi noi thanh bai 40/32/36 bars.
- Mo file MIDI (.mid) sua tiep: parser rieng (tempo/timeSig/kenh nhac cu),
  key/scale theo thiet lap, tu dung vong hop am tu bass.
- Dan bang phim may tinh (Z-M/Q-U, <-/-> doi quang) + nut REC ghi not khi phat.
- Take moi tung be (xuc xac mixer) + Motif→Bai (not lead khoa 2 bars dau thanh giong).
- Studio tools that su: Select (keo khung chon nhieu not, di chuyen nhom, Del/Ctrl+D/C/V,
  Shift+Arrow dich cao do), Draw, Knife (cat not), Erase + seek sua loi nhay playhead.
- 11 styles (them Cinematic Journey: hoa am Hanh Trinh Ve Nha, engine giong epic).
- Genre DNA rieng tung style: vong hoa am dac trung (7th/maj7/V7...), vai tro be
  (trackProfile: lofi arp thua, chiptune khong pad...), ngu phap melody (rest,
  leap, chromatic theo style).
- Concerto mode: form Tutti-Solo-Dialogue-Cadenza ~104 bars, chuyen key
  (relative major + development), texture piano nghi/dap/doi tau.
- Arp an nhap: cap quãng duoi lead, downbeat chord-tone, chromatic hiem, thua + accent groove.
- Swing toan cuc (phat + xuat MIDI/MMP) + render WAV demo offline.
- Tabs nhieu bai + A/B compare; lich su co favorite/doi ten/loc/batch MIDI/autosave dia/khoi phuc.
- Export hub: thu muc mac dinh, xuat nhanh 1-click, danh sach file da xuat.
- Preview theo instrument (lead du 12 tieng, bass piano/sub) + import giu program MIDI.
- MCP 10 tools (regen vung, sua hop am, arrange) + seed deterministic.
- Finish 1-click, ep style giu melody, seed chia se/daily, help tieng Viet.
- Tabs nhieu bai + A/B compare; swing toan cuc + render WAV demo.
- Menu bar File/Edit/View/Tools/Help + themes (Neon/Midnight/Sakura/custom full
  palette tu sinh + anh nen sau app) + sidebar gap + dock tabs + layout chong tran.
- Custom theme dong bo that: dao ca bo bien + canvas piano-roll/contour theo sang/toi.
- Phim tat day du (Ctrl+N/O/E/B/L/T/Tab/1-5/S, Home, Del...) hien trong menu + Help.
- Project `.rmg` (Ctrl+S) + SoundFont export (GeneralUser GS, Sf2 player)
  + So Seed + version 2.1.0.
- Clip LMMS chuan (MIME application/x-lmms-clipboard + midiclip XML, native
  ghi + verify, chep theo be dang soan); nen manh hon + panel dac + theme
  editor (accent/nen/the) + scrim tuy chinh.
- Bugfix round: Sasakure het am nhi 7/8 (khai 4/4 + reset + khoi phuc tu lich su);
  localStorage tran co trim-retry; merge/load chiu genre da xoa; MMP dung nhi;
  phim dan uu tien hon shortcut tool; import major dung degree; WAV chunk 512KB;
  guard canvas NaN; autosave khi sua not.
- Hit ket bai bat/tat; custom style rieng (editor + card + localStorage);
  dich quang 8va + velocity nhanh cho selection/be dang soan.
- Fade ap truc tiep khong gieo lai (giu not, co baseVel); contour luu vao metadata
  nen gieo vung giu contour; history hien so not live.
- Nhac dung duoc (musicianship): arrangement pass tu dong (crash 8-bar, kick-bass
  lock, lead nghi dau intro, final tutti hit + Picardy cho touhou, che do Loop game),
  melody ky luat (ambitus ~2 octaves, leap smoothing, leading tone), triplet burst
  (touhou) + trill (fiery), ghost note + fill trong, bass Touhou walk len/offbeat,
  bass Fiery stride/10th/tremolo/chromatic.

## MCP Server cho AI (sinh nhac qua AI client)

- Source: `native\mcp\server.js` (Node, dung lai `engine/theory|generator|exporter`).
  Tools: `list_genres`, `list_scales`, `generate_song`, `list_songs`,
  `export_midi`, `export_mmp`, `export_clip`.
- Build 1 file exe doc lap (may khac khong can Node): chay `native\build-mcp.bat`
  (npm install → test → esbuild bundle → Node SEA → postject)
  → ra `native\out\MCP-RMG.exe` (~95MB, gom san Node runtime).
- Test: `node native\mcp\test-mcp.js [duong-dan-exe]` (mac dinh test `server.js`).
- Phat hanh: setup co component tuy chon "MCP Server cho AI",
  cai vao `{app}\mcp\MCP-RMG.exe` + `mcp-config-example.json` (sua `<APPDATA>`
  thanh duong dan that roi gan vao config MCP cua Claude Desktop/opencode).

## Cai dat (Setup)

- Chay `native\installer\RMG.iss` bang Inno Setup 6 (ISCC.exe)
  → ra `native\out\Setup_RMG_2.0.0.exe` (~3MB).
- Setup per-user, khong can quyen admin: cai vao `%LOCALAPPDATA%\RMG`,
  tao shortcut Desktop + Start Menu, co muc go cai dat trong Settings.
- Tu kiem tra WebView2 Runtime, thieu thi hoi mo trang tai Microsoft.
- Khi go cai dat: file app + shortcut bi xoa, lich su/cache giu lai
  trong `%LOCALAPPDATA%\RMG\webview2-data`.

## Luu y

- File Electron cu (`main.js`, `preload.js`, `package.json`) van giu nguyen, khong anh huong ban native.
- Khi phan phoi: chi can thu muc `out\RMG`, khong can `RMG.pdb` (file debug).
- Du lieu WebView2 (cache) nam o `%LOCALAPPDATA%\RMG\webview2-data`, lich su gieo nhac
  luu trong localStorage cua app nhu cu.
