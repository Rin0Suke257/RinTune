/**
 * RMG MCP Server (stdio)
 * Dung lai engine cua RMG: theory.js + generator.js + exporter.js
 * May khac khong can Node: bundle + Node SEA -> MCP-RMG.exe
 */

const path = require('path');
const fs = require('fs');
const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { z } = require('zod');

const { RMGTheory: Theory } = require('../../engine/theory.js');
const { RMGGenerator: Gen } = require('../../engine/generator.js');
const { RMGExporter: Exp } = require('../../engine/exporter.js');

// Bai nhac da sinh trong session (songId -> songData)
const songs = new Map();

function summarize(songId, song) {
  const tracks = {};
  for (const [k, t] of Object.entries(song.tracks || {})) {
    tracks[k] = t && t.notes ? t.notes.length : 0;
  }
  return {
    songId,
    title: song.metadata.title,
    genre: song.metadata.genre,
    key: song.metadata.key,
    scale: song.metadata.scale,
    bpm: song.metadata.bpm,
    timeSignature: song.metadata.timeSignature || '4/4',
    lengthBars: song.metadata.lengthBars,
    section: song.metadata.section,
    noteCount: song.metadata.noteCount || 0,
    tracks,
    progression: (song.progression || []).map(c => ({ bar: c.bar, symbol: c.symbol, root: c.rootName }))
  };
}

function sanitizeFileName(s) {
  return String(s || 'RMG_Song').replace(/[^\w\-\u00C0-\u1EF9 ]+/g, '').trim().replace(/\s+/g, '_').slice(0, 80) || 'RMG_Song';
}

function getSong(songId) {
  const song = songs.get(songId);
  if (!song) throw new Error('Khong tim thay songId: ' + songId + ' (goi generate_song truoc)');
  return song;
}

function writeSongFile(song, kind) {
  const isMidi = kind === 'midi';
  const ext = isMidi ? '.mid' : '.mmp';
  const base = sanitizeFileName(song.metadata.title);
  const outPath = path.resolve(process.cwd(), base + ext);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  if (isMidi) {
    const bytes = Exp.Exporter.generateMidiFile(song);
    fs.writeFileSync(outPath, Buffer.from(bytes));
  } else {
    const xml = Exp.Exporter.generateLmmsProject(song);
    fs.writeFileSync(outPath, xml, 'utf-8');
  }
  return outPath;
}

const server = new McpServer({ name: 'rmg', version: '2.0.0' });

server.registerTool('list_genres', {
  title: 'Liet ke phong cach nhac',
  description: 'Liet ke cac phong cach (genre) co the sinh trong RMG',
  inputSchema: {}
}, async () => {
  const genres = Object.values(Theory.GENRES).map(g => ({
    id: g.id, name: g.name, description: g.description,
    defaultBpm: g.defaultBpm, bpmRange: g.bpmRange,
    defaultKey: g.defaultKey, defaultScale: g.defaultScale,
    defaultTimeSignature: g.defaultTimeSignature || '4/4'
  }));
  return { content: [{ type: 'text', text: JSON.stringify(genres, null, 2) }] };
});

server.registerTool('list_scales', {
  title: 'Liet ke thang am',
  description: 'Liet ke cac thang am (scale/mode) dung duoc trong RMG',
  inputSchema: {}
}, async () => {
  const scales = Object.entries(Theory.SCALES).map(([id, s]) => ({ id, name: s.name }));
  return { content: [{ type: 'text', text: JSON.stringify(scales, null, 2) }] };
});

server.registerTool('generate_song', {
  title: 'Sinh bai nhac moi',
  description: 'Sinh mot bai nhac ngau nhien theo ly thuyet am nhac, tra ve songId de xuat file',
  inputSchema: {
    genre: z.string().optional().describe('VD: fiery_piano, toureg, touhou, lofi, synthwave, chiptune, cyberpunk, epic, anime, dark_fantasy, sasakure_uk'),
    key: z.string().optional().describe('Not chu: C, C#, D, ... B (mac dinh theo genre)'),
    scale: z.string().optional().describe('ID thang am (xem list_scales, mac dinh theo genre)'),
    bpm: z.number().int().min(30).max(350).optional().describe('Tempo (mac dinh theo genre)'),
    timeSignature: z.enum(['4/4', '7/8', '6/8', '5/8']).optional(),
    lengthBars: z.number().int().min(1).max(64).optional().describe('So bars (1-64)'),
    section: z.enum(['none', 'intro', 'verse', 'chorus', 'outro']).optional(),
    motifStructure: z.string().optional(),
    articulation: z.string().optional(),
    climaxCurve: z.string().optional(),
    chaosLevel: z.number().int().min(0).max(100).optional().describe('Do dot bien %'),
    density: z.number().int().min(20).max(100).optional().describe('Mat do not %'),
    seed: z.number().optional().describe('Seed de tai lap ket qua (bo trong = ngau nhien)')
  }
}, async (a) => {
  const genre = a.genre || 'fiery_piano';
  const gDef = Theory.GENRES[genre] || Theory.GENRES['fiery_piano'];
  const opts = {
    genre,
    key: a.key || gDef.defaultKey,
    scale: a.scale || gDef.defaultScale,
    bpm: a.bpm || gDef.defaultBpm,
    timeSignature: a.timeSignature || gDef.defaultTimeSignature || '4/4',
    lengthBars: a.lengthBars || 8,
    section: a.section || 'none',
    motifStructure: a.motifStructure || 'none',
    articulation: a.articulation || 'auto',
    climaxCurve: a.climaxCurve || 'none',
    chaosLevel: a.chaosLevel !== undefined ? a.chaosLevel : 25,
    density: a.density !== undefined ? a.density : 75,
    trackTarget: 'all',
    humanize: true,
    seed: a.seed !== undefined ? a.seed : Math.random()
  };
  const gen = new Gen.MusicGenerator(opts);
  const song = gen.generate();
  const songId = 'rmg_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
  songs.set(songId, song);
  if (songs.size > 20) { const first = songs.keys().next().value; songs.delete(first); }
  return { content: [{ type: 'text', text: JSON.stringify(summarize(songId, song), null, 2) }] };
});

server.registerTool('list_songs', {
  title: 'Liet ke bai da sinh',
  description: 'Liet ke cac bai nhac da sinh trong session hien tai',
  inputSchema: {}
}, async () => {
  const list = [...songs.entries()].map(([id, s]) => summarize(id, s));
  return { content: [{ type: 'text', text: JSON.stringify(list, null, 2) }] };
});

server.registerTool('export_midi', {
  title: 'Xuat file MIDI',
  description: 'Xuat bai nhac ra file Standard MIDI (.mid) mo duoc trong moi DAW',
  inputSchema: {
    songId: z.string(),
    outPath: z.string().optional().describe('Duong dan file .mid (mac dinh: thu muc hien tai + ten bai)')
  }
}, async (a) => {
  const song = getSong(a.songId);
  let outPath = a.outPath;
  if (!outPath) {
    outPath = path.resolve(process.cwd(), sanitizeFileName(song.metadata.title) + '.mid');
  } else if (!/\.mid$/i.test(outPath)) {
    outPath += '.mid';
  }
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  const bytes = Exp.Exporter.generateMidiFile(song);
  fs.writeFileSync(outPath, Buffer.from(bytes));
  const size = fs.statSync(outPath).size;
  return { content: [{ type: 'text', text: JSON.stringify({ success: true, filePath: outPath, bytes: size }) }] };
});

server.registerTool('export_mmp', {
  title: 'Xuat project LMMS',
  description: 'Xuat bai nhac ra file project LMMS (.mmp) mo truc tiep trong LMMS',
  inputSchema: {
    songId: z.string(),
    outPath: z.string().optional().describe('Duong dan file .mmp (mac dinh: thu muc hien tai + ten bai)')
  }
}, async (a) => {
  const song = getSong(a.songId);
  let outPath = a.outPath;
  if (!outPath) {
    outPath = path.resolve(process.cwd(), sanitizeFileName(song.metadata.title) + '.mmp');
  } else if (!/\.mmp$/i.test(outPath)) {
    outPath += '.mmp';
  }
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, Exp.Exporter.generateLmmsProject(song), 'utf-8');
  const size = fs.statSync(outPath).size;
  return { content: [{ type: 'text', text: JSON.stringify({ success: true, filePath: outPath, bytes: size }) }] };
});

server.registerTool('export_clip', {
  title: 'Lay clip XML cho LMMS',
  description: 'Tra ve XML track-clip de paste (Ctrl+V) truc tiep vao LMMS dang mo',
  inputSchema: { songId: z.string() }
}, async (a) => {
  const song = getSong(a.songId);
  const xml = Exp.Exporter.generateLmmsClipboardClip(song);
  return { content: [{ type: 'text', text: xml }] };
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(err => { console.error('[rmg-mcp] fatal:', err); process.exit(1); });
