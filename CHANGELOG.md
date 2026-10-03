# RMG Changelog

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
- App C++ Win32 + WebView2 thay Electron (`RMG.exe` ~600KB)
- Setup Inno per-user + component MCP (`MCP-RMG.exe`)
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
