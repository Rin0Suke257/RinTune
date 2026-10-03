

const path = require('path');
const fs = require('fs');
const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { z } = require('zod');

const { RMGTheory: Theory } = require('../../engine/theory.js');
const { RMGGenerator: Gen } = require('../../engine/generator.js');
const { RMGExporter: Exp } = require('../../engine/exporter.js');

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
  return String(s || 'RinTune_Song').replace(/[^\w\-\u00C0-\u1EF9 ]+/g, '').trim().replace(/\s+/g, '_').slice(0, 80) || 'RinTune_Song';
}

function getSong(songId) {
  const song = songs.get(songId);
  if (!song) throw new Error('Khong tim thay songId: ' + songId + ' (goi generate_song truoc)');
  return song;
}

function storeSong(song) {
  const songId = 'rmg_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
  songs.set(songId, song);
  if (songs.size > 20) { const first = songs.keys().next().value; songs.delete(first); }
  return songId;
}

function generatorFromSong(song, seed) {
  const md = song.metadata;
  return new Gen.MusicGenerator({
    genre: md.genre, key: md.key, scale: md.scale, bpm: md.bpm,
    timeSignature: md.timeSignature || '4/4', lengthBars: md.lengthBars,
    section: md.section || 'none', motifStructure: md.motifStructure || 'none',
    articulation: md.articulation || 'auto', climaxCurve: md.climaxCurve || 'none',
    fadeInBars: md.fadeInBars || 0, fadeOutBars: md.fadeOutBars || 0,
    trackTarget: 'all',
    chaosLevel: md.chaosLevel != null ? md.chaosLevel : 25,
    density: md.density != null ? md.density : 75,
    humanize: true,
    seed: seed !== undefined ? seed : Math.random()
  });
}

function spliceRegen(song, result) {
  const spb = song.metadata.stepsPerBar || 16;
  const fromStep = result.fromBar * spb;
  const toStep = (result.toBar + 1) * spb;
  let added = 0, removed = 0;
  for (const [tKey, newNotes] of Object.entries(result.notes)) {
    const track = song.tracks[tKey];
    if (!track) continue;
    if (!track.notes) track.notes = [];
    const kept = [];
    for (const n of track.notes) {
      if (n.locked || n.step < fromStep || n.step >= toStep) kept.push(n);
      else removed++;
    }
    track.notes = kept.concat(newNotes);
    added += newNotes.length;
  }
  song.metadata.noteCount = Object.values(song.tracks).reduce((a, t) => a + (t.notes ? t.notes.length : 0), 0);
  return { added, removed };
}

function stitchSongs(songs) {
  let totalBars = 0, cumSteps = 0;
  const progression = [];
  const first = songs[0];
  const tracks = {
    lead: { name: 'Lead Melody', type: 'synth_lead', instrument: first.tracks.lead.instrument, color: '#00f2fe', notes: [] },
    chords: { name: 'Harmony & Chords', type: 'poly_synth', instrument: first.tracks.chords.instrument, color: '#9b51e0', notes: [] },
    arp: { name: 'Arpeggio Ostinato', type: 'pluck_synth', instrument: first.tracks.arp.instrument, color: '#4facfe', notes: [] },
    bass: { name: 'Bassline', type: 'mono_bass', instrument: first.tracks.bass.instrument, color: '#f39c12', notes: [] },
    drums: { name: 'Drums & Percussion', type: 'drum_kit', instrument: 'standard_kit', color: '#e74c3c', notes: [] }
  };
  for (const s of songs) {
    const spb = s.metadata.stepsPerBar || 16;
    for (const c of s.progression) progression.push(Object.assign({}, c, { bar: c.bar + totalBars }));
    for (const k of Object.keys(tracks)) {
      for (const n of s.tracks[k].notes) tracks[k].notes.push(Object.assign({}, n, { step: n.step + cumSteps }));
    }
    totalBars += s.metadata.lengthBars || 8;
    cumSteps += (s.metadata.lengthBars || 8) * spb;
  }
  return { progression, tracks, totalBars };
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

const server = new McpServer({ name: 'rintune', version: '2.0.0' });

server.registerTool('list_genres', {
  title: 'Liet ke phong cach nhac',
  description: 'Liet ke cac phong cach (genre) co the sinh trong RinTune',
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
  description: 'Liet ke cac thang am (scale/mode) dung duoc trong RinTune',
  inputSchema: {}
}, async () => {
  const scales = Object.entries(Theory.SCALES).map(([id, s]) => ({ id, name: s.name }));
  return { content: [{ type: 'text', text: JSON.stringify(scales, null, 2) }] };
});

server.registerTool('generate_song', {
  title: 'Sinh bai nhac moi',
  description: 'Sinh mot bai nhac ngau nhien theo ly thuyet am nhac, tra ve songId de xuat file',
  inputSchema: {
    genre: z.string().optional().describe('VD: fiery_piano, touhou, lofi, synthwave, chiptune, cyberpunk, epic, anime, dark_fantasy, sasakure_uk, cinematic'),
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
  const songId = storeSong(song);
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

server.registerTool('regenerate_region', {
  title: 'Gieo lai mot vung bars',
  description: 'Gieo lai cac bars chi dinh (giu not locked), tra ve tom tat moi',
  inputSchema: {
    songId: z.string(),
    fromBar: z.number().int().min(1).describe('Bar bat dau (1-based)'),
    toBar: z.number().int().min(1).optional().describe('Bar ket thuc (mac dinh = fromBar)'),
    tracks: z.array(z.enum(['lead', 'chords', 'arp', 'bass', 'drums'])).optional().describe('Be can gieo (mac dinh pitched)'),
    seed: z.number().optional()
  }
}, async (a) => {
  const song = getSong(a.songId);
  const total = song.metadata.lengthBars;
  const from = Math.max(0, Math.min(total - 1, (a.fromBar | 0) - 1));
  const to = Math.max(from, Math.min(total - 1, a.toBar == null ? from : (a.toBar | 0) - 1));
  const gen = generatorFromSong(song, a.seed);
  const res = gen.regenerateRegion(song, { fromBar: from, toBar: to, tracks: a.tracks, seed: a.seed });
  const stat = spliceRegen(song, res);
  return { content: [{ type: 'text', text: JSON.stringify(Object.assign({ bars: [res.fromBar + 1, res.toBar + 1] }, stat, summarize(a.songId, song)), null, 2) }] };
});

server.registerTool('set_chord', {
  title: 'Sua hop am 1 bar',
  description: 'Doi hop am 1 bar roi gieo lai be hoa am bar do (giu not locked)',
  inputSchema: {
    songId: z.string(),
    bar: z.number().int().min(1).describe('Bar can sua (1-based)'),
    symbol: z.string().describe('VD: i, VI, VII, V, Imaj7, ii7'),
    tracks: z.array(z.enum(['lead', 'chords', 'arp', 'bass', 'drums'])).optional().describe('Mac dinh chords/arp/bass'),
    seed: z.number().optional()
  }
}, async (a) => {
  const song = getSong(a.songId);
  const bar = Math.max(0, Math.min(song.metadata.lengthBars - 1, (a.bar | 0) - 1));
  const gen = generatorFromSong(song, a.seed);
  song.progression[bar] = gen.resolveBarChord(a.symbol, bar);
  song.progression = gen.retuneProgression(song.progression);
  const res = gen.regenerateRegion(song, { fromBar: bar, toBar: bar, tracks: a.tracks || ['chords', 'arp', 'bass'], seed: a.seed });
  const stat = spliceRegen(song, res);
  return { content: [{ type: 'text', text: JSON.stringify(Object.assign({ bar: bar + 1, chord: song.progression[bar].symbol }, stat, summarize(a.songId, song)), null, 2) }] };
});

server.registerTool('arrange_song', {
  title: 'Dung bai hoan chinh 1-click',
  description: 'Sinh tung doan theo form (pop/compact/epic/concerto) roi noi thanh bai dai',
  inputSchema: {
    form: z.enum(['pop_standard', 'compact', 'epic_journey', 'concerto']).optional().describe('Mac dinh pop_standard'),
    genre: z.string().optional(),
    key: z.string().optional(),
    scale: z.string().optional(),
    bpm: z.number().int().min(30).max(350).optional(),
    seed: z.number().optional()
  }
}, async (a) => {
  const FORMS = {
    pop_standard: [['intro', 4], ['verse', 8], ['chorus', 8], ['verse', 8], ['chorus', 8], ['outro', 4]],
    compact: [['verse', 8], ['chorus', 8], ['verse', 8], ['chorus', 8]],
    epic_journey: [['intro', 4], ['verse', 8], ['chorus', 8], ['bridge', 8], ['chorus', 8], ['outro', 4]],
    concerto: [['intro', 8], ['verse', 16], ['chorus', 16], ['verse', 16], ['chorus', 16], ['outro', 8]]
  };
  const form = FORMS[a.form || 'pop_standard'];
  const genre = a.genre || 'fiery_piano';
  const gDef = Theory.GENRES[genre] || Theory.GENRES['fiery_piano'];
  const segs = form.map(([section, bars], idx) => {
    const gen = new Gen.MusicGenerator({
      genre, key: a.key || gDef.defaultKey, scale: a.scale || gDef.defaultScale,
      bpm: a.bpm || gDef.defaultBpm, timeSignature: gDef.defaultTimeSignature || '4/4',
      lengthBars: bars, section, motifStructure: 'none', articulation: 'auto',
      climaxCurve: 'none', fadeInBars: 0, fadeOutBars: 0, trackTarget: 'all',
      chaosLevel: 25, density: 75, humanize: true, skipFinalHit: true,
      seed: a.seed !== undefined ? a.seed + idx : Math.random()
    });
    return gen.generate();
  });
  const st = stitchSongs(segs);
  const firstMd = segs[0].metadata;
  const song = {
    metadata: {
      title: `RinTune_Arranged_${a.form || 'pop_standard'}_${firstMd.key}_${st.totalBars}Bars`,
      genre, genreName: gDef.name, key: firstMd.key, scale: firstMd.scale,
      scaleName: firstMd.scaleName, bpm: firstMd.bpm, timeSignature: firstMd.timeSignature,
      stepsPerBar: firstMd.stepsPerBar, lengthBars: st.totalBars, section: 'merged',
      motifStructure: 'none', articulation: 'auto', climaxCurve: 'none',
      chaosLevel: 25, density: 75, fadeInBars: 0, fadeOutBars: 0,
      trackTarget: 'all', isPurePiano: false, useContour: false, contourPoints: null,
      loopMode: false, noteCount: 0, seed: Math.random(), createdAt: new Date().toISOString()
    },
    progression: st.progression, tracks: st.tracks
  };
  Gen.MusicGenerator.prototype.arrangeFinal(song, { finalHit: true });
  song.metadata.noteCount = Object.values(song.tracks).reduce((x, t) => x + t.notes.length, 0);
  const songId = storeSong(song);
  return { content: [{ type: 'text', text: JSON.stringify(summarize(songId, song), null, 2) }] };
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(err => { console.error('[rintune-mcp] fatal:', err); process.exit(1); });
