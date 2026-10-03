# RinTune Changelog

## Unreleased - Q3: Ky luat thua
- Lead hat day (>=5 not/bar) thi chords/arp chi giu downbeat (pad/note tru);
  bass + drums giu lam nen

## Unreleased - Q2: Hoa am co chuc nang
- Cadence V–I / V–VI (deceptive) o bien doan, at thuong VII→v (modal
  mixture), lead ve leading-tone truoc doan moi

## Unreleased - Q1: Motif-first
- Motif chat (buoc nho + 1 leap + ket on dinh + khoang tho), B derive tu A,
  bien tau sequence/inversion/fragment theo slot, mutation khoa theo vi tri
  motif (cau lap lai giai giong nhau, thich nghi theo hop am)

## Unreleased - Phase 1: Arrangement sections that
- Bai tu chia Intro/Verse/Break/Chorus/Outro theo do dai (break co drum
  dropout that), be vao/ra + velocity theo tung doan, tu slice thanh clips
  tren timeline (giua lai not tay 🔒)

## Unreleased - Linh vat Rin
- Rin cui chao o 3 trang thai trong (lich su, so seed, file xuat)
- Modal tam biet khi bam Thoat (O lai / Tam biet, du lieu giu nguyen)

## Unreleased - Bo song ngu (ve Viet thuan)
- Go sach i18n (khung + tu dien + nut VI/EN), app Viet 100% nhu cu

## Unreleased - Song ngu Viet/Anh + subtitle + installer Rin
- Song ngữ VI/EN toàn app (menu, panel, toast, help): nút VI/EN trên menubar,
  nhớ lựa chọn; thiếu key tự rớt về tiếng Việt
- Subtitle gọn: "Thuật toán sinh nhạc thông minh"
- Installer: ảnh linh vật Rin lên wizard cài/gỡ, tự xóa shortcut tên RMG cũ;
  gỡ cài đặt chỉ xóa app + shortcut, không đụng dữ liệu người dùng

## Unreleased - Doi ten RinTune Studio + sach code
- Doi ten san pham RMG -> RinTune Studio (title, exe, installer, xuat file);
  giu tuong thich file `.rmg` cu + du lieu `%LOCALAPPDATA%\RMG`
- Xoa ghi chu (comment) trong toan bo ma nguon, giu license ben thu ba

## Unreleased - Timeline Clips + Takes + Fill
- Timeline 1 hàng đoạn (Intro/Verse/Chorus...): bấm chọn, kéo dời, tách/
  gộp/nhân đôi/xóa/mute/đổi tên, đúp = đặt vùng gieo lại; soạn nốt ở piano roll  (tracks phẳng flatten từ clips, phát nhạc/xuất không đổi)
- Khoảng lặng ☕: chèn đoạn trống N bars (breakdown/breath); gieo/soạn nốt
  vào đó tự thành đoạn thường
- Bè trong đoạn: toggle Lead/Chords/Arp/Bass/Drums từng đoạn để build/drop
  năng lượng (verse thưa, chorus bùng)
- Chuyển đoạn tự động: fill + crash biên đoạn theo Variation, deterministic
  theo seed (V<25% thì thôi)
- Arranger 1-click và ghép lịch sử xuất ra clips giữ cấu trúc đoạn
- Khay take (audition): gieo tới 4 takes, nghe từng take, giữ bản ưng
  hoặc trả về bản gốc (1 undo duy nhất cho cả phiên)
- Fill trống 3 biến thể (snare/tom/kick+snare) + crash đôi khi trễ 1 step
- Preset variation 1 chạm: An toàn 20 / Cân bằng 70 / Điên 100

## Unreleased - Variation (Biến tấu)
- Gieo lại vùng/take dice giờ khác nhau thật: chords (đảo inversion +
  rhythm + tension 9th + chiều strum), arp (dịch octave giữ pitch-class +
  tỉa nốt yếu), bass (dịch octave cả bar + ornament), drums (rớt/thêm kick,
  pickup, anticipation, hat mở/đóng)
- Slider 🎲 Biến Tấu tổng 0-100% + tỉ lệ từng bè (Lead/Chords/Arp/Bass/
  Drums): 0% giữ khung, 100% đảo mạnh; mặc định 70% = hành vi cũ
- Variation lưu theo seed/project/history/undo — cùng seed + cùng variation
  ra cùng bài

## v2.1.0 - Sound that + Projects
- Project files `.rmg` (Save/Save-nhanh/Ctrl+S/Open, luu ca settings)
- Export SoundFont GeneralUser GS (~30MB, tai 1 lan): `.mmp` dung Sf2 player
  (piano/strings/brass/drums that) thay tripleosc
- So Seed (luu/nap/xoa seed co ten), seed chia se deterministic
- Version 2.1.0 + nut kiem tra cap nhat (can GitHub repo de co kenh that)
- Version 2.1.0 + nut kiem tra cap nhat (can GitHub repo)
- Version 2.1.0 + nut kiem tra cap nhat (can GitHub repo)

## v2.0.0 (chua phat hanh) - Native + Studio
- App C++ Win32 + WebView2 thay Electron (`RinTune.exe` ~600KB)
- Setup Inno per-user + component MCP (`RinTune-MCP.exe`)
- MCP server: 7 tools sinh/xuat nhac cho AI
- Soan nhac: progression editor, gieo lai vung, khoa not, undo/redo 30 buoc,
  piano-roll zoom, mixer pan, studio tools (Select/Draw/Knife/Erase),
  copy/paste/duplicate/transpose selection, octave/velocity nhanh
- Dan phim may tinh + REC, MIDI import (cả lyric) + MIDI export, MMP/LMMS,
  WAV demo offline, swing toan cuc
- Arranger 1-click (Pop/Gon/Epic/Concerto tutti-solo-cadenza), song tabs,
  A/B compare, lich su fav/doi ten/loc/batch/autosave/khoi phuc
- Nhac dung duoc: arrangement pass (crash/kick-lock/final hit/Picardy/loop),
  melody ky luat, triplet/trill, groove ghost/fill, bass dac trung 11 styles
- Custom style (editor + trich tu bai) + bai trong workspace
- 11 styles (them Cinematic Journey)
