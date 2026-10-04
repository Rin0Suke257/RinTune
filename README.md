# RinTune Studio — Random Music Generator for LMMS

Windows desktop app (C++ Win32 + WebView2, no Electron) that composes original,
deterministic music and hands it to [LMMS](https://lmms.io) as `.mmp` / `.mid` / clipboard,
plus an MCP server so AI assistants can compose through it.

- Deterministic procedural engine (11 genre DNAs, motifs, harmony, arrangement)
- Piano roll studio: draw/knife/erase, locks, undo/redo, mixer, regions, takes
- Timeline sections, variation engine, seeds (share/daily), SoundFont export
- One-click LMMS handoff (file + clipboard + auto-launch)

## Build (Windows 10/11, VS 2022 C++)

1. `Microsoft.Web.WebView2` NuGet → extract to `native/packages/Microsoft.Web.WebView2`
2. Inno Setup 6 (`ISCC.exe`)
3. Run `native\build-all.bat` → `native\out\Setup_RinTune_2.1.0.exe`

Details: `native/README_NATIVE.md`. Engine tests (Node, no app needed): `native\test-all.bat`.

## Layout

- `index.html` / `renderer.js` / `index.css` — studio UI
- `engine/` — theory, generator, synth (preview), MIDI, exporter
- `native/src/main.cpp` — Win32/WebView2 host + LMMS bridge
- `native/mcp/` — Node MCP server (`server.js`), buildable to single-file `RinTune-MCP.exe`
- `native/installer/` — Inno Setup script (+ Rin mascot wizard art)

License: MIT
