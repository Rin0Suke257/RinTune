const fs = require('fs');
const path = require('path');
const os = require('os');
const G = require(__dirname + '/../../engine/generator.js').RMGGenerator;
const T = require(__dirname + '/../../engine/theory.js').RMGTheory;
const M = require(__dirname + '/../../engine/midi.js').RMGMidi;
const E = require(__dirname + '/../../engine/exporter.js').RMGExporter;

function gmProgramToInstrument(prog) {
  if (prog == null) return null;
  const p = prog | 0;
  if (p <= 7) return 'grand_piano_lead';
  if (p <= 15) return 'anime_bell_lead';
  if (p <= 23) return 'pipe_organ_lead';
  if (p <= 31) return 'synth_saw_lead';
  if (p <= 39) return 'sub_saw_bass';
  if (p <= 55) return 'orchestral_strings';
  if (p <= 63) return 'zun_trumpet';
  if (p <= 71) return 'synth_saw_lead';
  if (p <= 79) return 'fusion_bright_grand';
  if (p === 80) return 'square_8bit';
  if (p <= 87) return 'synth_saw_lead';
  if (p <= 95) return 'mellow_epiano';
  if (p <= 103) return 'chiptune_fm_epiano';
  if (p <= 111) return 'anime_bell_lead';
  if (p <= 119) return 'sparkle_arp';
  return 'square_8bit';
}

function degreeToSymbol(semi, isMajor) {
  if (isMajor) {
    const map = { 0: 'I', 1: 'bII', 2: 'ii', 3: 'bIII', 4: 'iii', 5: 'IV', 6: 'bII', 7: 'V', 8: 'bVI', 9: 'vi', 10: 'bVII', 11: 'vii°' };
    return map[semi] || 'I';
  }
  const map = { 0: 'i', 1: 'bII', 2: 'ii', 3: 'bIII', 4: 'III', 5: 'iv', 6: 'bII', 7: 'v', 8: 'bVI', 9: 'VI', 10: 'bVII', 11: 'vii°' };
  return map[semi] || 'i';
}

function buildSongFromMidi(parsed, fileName, ui) {
  const tpq = parsed.ticksPerQuarter || 480;
  const ts = parsed.timeSignature || '4/4';
  const stepsPerBar = ts === '7/8' ? 14 : ts === '6/8' ? 12 : ts === '5/8' ? 10 : 16;
  const ticksPerStep = tpq / 4;
  const pitched = [], drumNotes = [];
  const chanOrder = [];
  for (const t of parsed.tracks) {
    for (const n of t.notes) {
      if (n.channel === 9) drumNotes.push(n);
      else {
        if (!chanOrder.includes(n.channel)) chanOrder.push(n.channel);
        pitched.push(n);
      }
    }
  }
  if (!pitched.length && !drumNotes.length) throw new Error('File MIDI khong co not nhac nao');
  const chanSum = {}, chanCnt = {};
  for (const n of pitched) {
    chanSum[n.channel] = (chanSum[n.channel] || 0) + n.midi;
    chanCnt[n.channel] = (chanCnt[n.channel] || 0) + 1;
  }
  const avgMidiByChan = {};
  for (const ch of Object.keys(chanSum)) avgMidiByChan[ch] = chanSum[ch] / chanCnt[ch];
  const order = ['lead', 'chords', 'arp', 'bass'];
  const chanMap = {};
  const extraRoles = {};
  chanOrder.forEach((ch, i) => {
    if (i < order.length) chanMap[ch] = order[i];
    else {
      const k = 'ch' + ch;
      const avg = avgMidiByChan[ch] || 60;
      chanMap[ch] = k;
      extraRoles[k] = avg >= 72 ? 'stab' : (avg >= 60 ? 'lead' : (avg >= 48 ? 'pad' : 'bass'));
    }
  });
  const chanProg = {};
  for (const t of parsed.tracks) {
    for (const [ch, prog] of Object.entries(t.programs || {})) {
      if (chanProg[ch] == null) chanProg[ch] = prog;
    }
  }
  const repChan = { lead: chanOrder[0], chords: chanOrder[1], arp: chanOrder[2], bass: chanOrder[3] };
  const instFor = (rk, fallback) => {
    const c = repChan[rk];
    if (c != null && chanProg[c] != null) return gmProgramToInstrument(chanProg[c]) || fallback;
    return fallback;
  };
  let midiTitle = '';
  for (const t of parsed.tracks) {
    if (t.name && t.name.length > 3 && !/^track\s*\d+$/i.test(t.name)) { midiTitle = t.name.slice(0, 40); break; }
  }
  const gDef = T.GENRES[ui.genre] || T.GENRES.touhou;
  const mkTrack = (name, type, instrument, color) => ({ name, type, instrument, color, notes: [] });
  const tracks = {
    lead: mkTrack((midiTitle ? midiTitle + ' ' : '') + 'Lead (import)', 'synth_lead', instFor('lead', gDef.leadStyle || 'square_lead'), '#00f2fe'),
    chords: mkTrack('Harmony (import)', 'poly_synth', instFor('chords', 'analog_pad'), '#9b51e0'),
    arp: mkTrack('Arpeggio (import)', 'pluck_synth', instFor('arp', 'sparkle_arp'), '#4facfe'),
    bass: mkTrack('Bassline (import)', 'mono_bass', instFor('bass', 'sub_saw_bass'), '#f39c12'),
    drums: mkTrack('Drums (import)', 'drum_kit', 'standard_kit', '#e74c3c')
  };
  const CHAN_ROLE_META = {
    stab: ['Stab (import)', 'stab_hit', 'leadStyle', '#ff6b81'],
    lead: ['Lead (import)', 'synth_lead', 'leadStyle', '#00f2fe'],
    pad: ['Pad (import)', 'soft_pad', 'analog_pad', '#a29bfe'],
    bass: ['Bass (import)', 'mono_bass', 'sub_saw_bass', '#f39c12']
  };
  const chanOfKey = {};
  for (const ch of chanOrder) chanOfKey[chanMap[ch]] = ch;
  for (const [k2, role] of Object.entries(extraRoles)) {
    const meta = CHAN_ROLE_META[role] || CHAN_ROLE_META.lead;
    const ch = chanOfKey[k2];
    let inst = meta[2];
    if (meta[2] === 'leadStyle') inst = gDef.leadStyle || 'square_lead';
    if (ch != null && chanProg[ch] != null) inst = gmProgramToInstrument(chanProg[ch]) || inst;
    tracks[k2] = mkTrack((midiTitle ? midiTitle + ' ' : '') + meta[0], meta[1], inst, meta[3]);
  }
  let endTick = 0;
  const conv = (n) => {
    endTick = Math.max(endTick, n.startTick + n.durTicks);
    return {
      step: 0,
      duration: Math.max(1, Math.round(n.durTicks / ticksPerStep)),
      midi: Math.max(0, Math.min(127, n.midi)),
      velocity: Math.max(1, Math.min(127, n.velocity || 90))
    };
  };
  const tmpPitched = pitched.map(n => ({ ch: n.channel, c: conv(n), tick: n.startTick }));
  const tmpDrums = drumNotes.map(n => ({ c: conv(n), tick: n.startTick }));
  const totalSteps = Math.max(stepsPerBar, Math.ceil(endTick / ticksPerStep));
  const lengthBars = Math.min(256, Math.max(1, Math.ceil(totalSteps / stepsPerBar)));
  const maxStep = lengthBars * stepsPerBar - 1;
  for (const t of tmpPitched) {
    t.c.step = Math.max(0, Math.min(maxStep, Math.round(t.tick / ticksPerStep)));
    tracks[chanMap[t.ch]].notes.push(t.c);
  }
  for (const t of tmpDrums) {
    t.c.step = Math.max(0, Math.min(maxStep, Math.round(t.tick / ticksPerStep)));
    tracks.drums.notes.push(t.c);
  }
  for (const t of Object.values(tracks)) t.notes.sort((a, b) => a.step - b.step);
  const key = ui.key, scale = ui.scale;
  const isMajor = ['major', 'lydian', 'mixolydian', 'pentatonic_major'].includes(scale);
  const keyPc = T.noteToMidi(T.normalizeNote(key), 4) % 12;
  const bassByBar = {};
  for (const n of tracks.bass.notes) {
    const bar = Math.floor(n.step / stepsPerBar);
    if (bassByBar[bar] == null) bassByBar[bar] = n.midi % 12;
  }
  const fallback = ['i', 'VI', 'VII', 'i'];
  const rawProg = [];
  for (let bar = 0; bar < lengthBars; bar++) {
    const symbol = (bassByBar[bar] != null)
      ? degreeToSymbol(((bassByBar[bar] - keyPc) + 12) % 12, isMajor)
      : fallback[bar % fallback.length];
    const chord = T.resolveChord(symbol, key, scale, 3);
    rawProg.push({ bar, symbol, rootName: chord.rootName, rootMidi: chord.rootMidi, chordType: chord.chordType, notes: chord.notes, quality: chord.quality });
  }
  const progression = T.optimizeVoiceLeading ? T.optimizeVoiceLeading(rawProg, 3) : rawProg;
  const base = String(fileName || 'song.mid').replace(/\.[^.]+$/, '');
  const noteCount = Object.values(tracks).reduce((a, t) => a + t.notes.length, 0);
  const importTrackDefs = Object.keys(tracks).map(k => ({
    key: k,
    role: extraRoles[k] || ({ lead: 'lead', chords: 'chords', arp: 'arp', bass: 'bass', drums: 'drums' }[k] || 'lead')
  }));
  return {
    metadata: {
      title: ('RinTune_Imported_' + base).replace(/[^\w\-]/g, '_').slice(0, 80),
      genre: ui.genre, genreName: gDef.name,
      key, scale, scaleName: (T.SCALES[scale] && T.SCALES[scale].name) || scale,
      bpm: parsed.bpm || 120,
      timeSignature: ts, stepsPerBar, lengthBars,
      section: 'none', motifStructure: 'smart_adaptive',
      articulation: 'auto', climaxCurve: 'none',
      chaosLevel: 30, density: 75,
      fadeInBars: 0, fadeOutBars: 0,
      trackTarget: 'all', isPurePiano: false,
      trackDefs: importTrackDefs,
      useContour: false, contourPoints: null,
      noteCount, seed: Math.random(),
      importedFrom: String(fileName || ''),
      createdAt: new Date().toISOString()
    },
    progression, tracks
  };
}

function detectKey(tracks) {
  const hist = new Array(12).fill(0);
  let total = 0;
  for (const [k, t] of Object.entries(tracks)) {
    if (k === 'drums') continue;
    for (const n of (t.notes || [])) {
      const w = Math.max(1, n.duration || 1);
      hist[n.midi % 12] += w;
      total += w;
    }
  }
  const scales = ['natural_minor', 'harmonic_minor', 'touhou_yonanuki', 'dorian', 'major', 'mixolydian'];
  let best = { root: 0, scale: 'natural_minor', score: -1 };
  for (let root = 0; root < 12; root++) {
    const rootName = T.NOTE_NAMES[root];
    for (const sc of scales) {
      let pcs;
      try { pcs = new Set(T.getScaleNotes(rootName, sc, 4, 4).map(m => ((m % 12) + 12) % 12)); }
      catch (e) { continue; }
      let s = 0;
      for (let pc = 0; pc < 12; pc++) if (pcs.has(pc)) s += hist[pc];
      if (s > best.score) best = { root, scale: sc, score: s };
    }
  }
  return { key: T.NOTE_NAMES[best.root], scale: best.scale, fit: total ? (best.score / total) : 0 };
}

function extractMotif(leadNotes, scaleNotes, spb) {
  const WIN = 2 * spb;
  for (let start = 0; start + WIN <= 8 * spb; start += spb) {
    const win = leadNotes.filter(n => n.step >= start && n.step < start + WIN);
    if (win.length >= 4) {
      return win.slice(0, 24).map(n => {
        let bi = 0, bd = 1e9;
        scaleNotes.forEach((m, i) => {
          const d = Math.abs(m - n.midi);
          if (d < bd) { bd = d; bi = i; }
        });
        return { stepOffset: n.step - start, durationSteps: Math.max(1, n.duration), scaleIndex: bi };
      });
    }
  }
  return [];
}

function stitchSongDatas(songs) {
  let totalBars = 0, cumulativeSteps = 0;
  const mergedProgression = [];
  const first = songs[0];
  const allKeys = [];
  for (const s of songs) for (const k of Object.keys(s.tracks || {})) if (!allKeys.includes(k)) allKeys.push(k);
  const mergedTracks = {};
  for (const k of allKeys) {
    const src = first.tracks[k];
    mergedTracks[k] = { name: (src && src.name) || k, type: (src && src.type) || k, instrument: (src && src.instrument) || 'auto', color: (src && src.color) || '#00f2fe', notes: [] };
  }
  for (const song of songs) {
    const spb = song.metadata.stepsPerBar || 16;
    for (const chord of song.progression) mergedProgression.push(Object.assign({}, chord, { bar: chord.bar + totalBars }));
    for (const [tKey, track] of Object.entries(song.tracks)) {
      if (!mergedTracks[tKey]) continue;
      for (const note of track.notes) mergedTracks[tKey].notes.push(Object.assign({}, note, { step: note.step + cumulativeSteps }));
    }
    const songBars = song.metadata.lengthBars || 8;
    totalBars += songBars;
    cumulativeSteps += songBars * spb;
  }
  for (const t of Object.values(mergedTracks)) for (const n of t.notes) if (n.baseVel == null) n.baseVel = n.velocity;
  return { progression: mergedProgression, tracks: mergedTracks, totalBars, totalSteps: cumulativeSteps };
}

function main() {
  const inFile = process.argv[2];
  const takeName = process.argv[3] || 'TakeA';
  const seedBase = parseInt(process.argv[4] || '20261004', 10);
  if (!inFile || !fs.existsSync(inFile)) {
    console.log('Usage: node cook-from-midi.js <input.mid> [TakeName] [seedBase]');
    process.exit(1);
  }
  const outDir = 'D:/RinTune-App/exports';
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const base = path.basename(inFile).replace(/\.[^.]+$/, '').replace(/[^\w\-]+/g, '_').slice(0, 50);

  const buf = fs.readFileSync(inFile);
  const parsed = M.parseMidiFile(buf);
  const probe = buildSongFromMidi(parsed, path.basename(inFile), { genre: 'touhou', key: 'A', scale: 'natural_minor' });
  const det = detectKey(probe.tracks);
  console.log('DETECT key=' + det.key + ' scale=' + det.scale + ' fit=' + det.fit.toFixed(2) + ' bpm=' + (parsed.bpm || 120));

  const song = buildSongFromMidi(parsed, path.basename(inFile), { genre: 'touhou', key: det.key, scale: det.scale });
  const spb = song.metadata.stepsPerBar || 16;
  const scaleNotes = T.getScaleNotes(det.key, det.scale, 4, 6);
  const motif = extractMotif(song.tracks.lead.notes, scaleNotes, spb);
  if (!motif.length) { console.log('MOTIF_FAIL=true (lead rong hoac qua thua)'); process.exit(2); }
  console.log('MOTIF notes=' + motif.length + ' first=' + motif.slice(0, 6).map(n => n.scaleIndex).join(','));

  const proto = G.MusicGenerator.prototype;
  const loIdx = 0, hiIdx = scaleNotes.length - 1;
  const dev = {
    frag: proto._developMotif(motif, 'fragment', {}),
    id: motif.map(n => Object.assign({}, n)),
    seq2: proto._developMotif(motif, 'sequence', { degrees: 2, lo: loIdx, hi: hiIdx }),
    inv: proto._developMotif(motif, 'inversion', { lo: loIdx, hi: hiIdx }),
    seq_1: proto._developMotif(motif, 'sequence', { degrees: -1, lo: loIdx, hi: hiIdx })
  };
  const parts = [
    { section: 'intro', bars: 4, seed: dev.frag, vn: 'Intro' },
    { section: 'verse', bars: 8, seed: dev.id, vn: 'Verse' },
    { section: 'chorus', bars: 8, seed: dev.seq2, vn: 'Chorus' },
    { section: 'verse', bars: 8, seed: dev.inv, vn: 'Verse 2' },
    { section: 'chorus', bars: 8, seed: dev.seq_1, vn: 'Chorus 2' },
    { section: 'outro', bars: 4, seed: dev.frag, vn: 'Outro' }
  ];
  const bpm = parsed.bpm || 160;
  const segs = parts.map((p, i) => {
    const gen = new G.MusicGenerator({
      genre: 'touhou', key: det.key, scale: det.scale, bpm,
      timeSignature: song.metadata.timeSignature || '4/4',
      lengthBars: p.bars, section: p.section,
      motifStructure: 'smart_adaptive',
      articulation: 'auto', climaxCurve: 'none',
      trackTarget: 'all',
      chaosLevel: 30, density: 75, variation: 0, humanize: true,
      skipFinalHit: true, seedPhrase: p.seed, seed: seedBase + i
    });
    return gen.generate();
  });
  const st = stitchSongDatas(segs);
  const totalBars = st.totalBars;
  const roleOfKey = (k) => String(k).replace(/[0-9]+$/, '');
  const gDef = T.GENRES.touhou;
  const cooked = {
    metadata: {
      title: ('RinTune_Cooked_' + base + '_' + takeName + '_' + totalBars + 'bars').slice(0, 80),
      genre: 'touhou', genreName: gDef.name,
      key: det.key, scale: det.scale,
      scaleName: (T.SCALES[det.scale] && T.SCALES[det.scale].name) || det.scale,
      bpm, timeSignature: song.metadata.timeSignature || '4/4', stepsPerBar: spb,
      lengthBars: totalBars, section: 'merged',
      motifStructure: 'smart_adaptive', articulation: 'auto', climaxCurve: 'none',
      chaosLevel: 30, density: 75,
      fadeInBars: 0, fadeOutBars: 0,
      trackTarget: 'all', isPurePiano: false,
      trackDefs: Object.keys(st.tracks).map(k => ({ key: k, role: roleOfKey(k) })),
      useContour: false, contourPoints: null, loopMode: false,
      noteCount: Object.values(st.tracks).reduce((a, t) => a + t.notes.length, 0),
      seed: seedBase, cookedFrom: path.basename(inFile),
      motifNotes: motif.length, createdAt: new Date().toISOString()
    },
    progression: st.progression,
    tracks: st.tracks
  };
  proto.arrangeFinal(cooked, { finalHit: true });
  let s0 = 0;
  cooked.clips = parts.map((p) => {
    const c = { name: p.vn, lengthBars: p.bars, muted: false, rest: false, tracks: {}, notes: {} };
    for (const k of Object.keys(cooked.tracks)) {
      c.tracks[k] = true;
      c.notes[k] = [];
      for (const n of cooked.tracks[k].notes) {
        if (n.step >= s0 && n.step < s0 + p.bars * spb) {
          const cp = Object.assign({}, n, { step: n.step - s0 });
          delete cp.trans;
          c.notes[k].push(cp);
        }
      }
    }
    s0 += p.bars * spb;
    return c;
  });
  cooked.metadata.noteCount = Object.values(cooked.tracks).reduce((a, t) => a + t.notes.length, 0);

  const ox = { master: 0.75, vel: 1, trimOverlap: true, cc: true, levels: {} };
  const mmp = E.Exporter.generateLmmsProject(cooked, null, 0, null, ox);
  const mid = E.Exporter.generateMidiFile(cooked, null, 0, ox);
  const stem = outDir + '/' + cooked.metadata.title;
  fs.writeFileSync(stem + '.mmp', mmp, 'utf8');
  fs.writeFileSync(stem + '.mid', Buffer.from(mid));
  const rmg = {
    app: 'RinTune', v: 1, savedAt: Date.now(),
    ui: {
      genre: 'touhou', key: det.key, scale: det.scale, bpm,
      timeSignature: cooked.metadata.timeSignature, lengthBars: totalBars,
      section: 'merged', motifStructure: 'smart_adaptive',
      articulation: 'auto', climaxCurve: 'none',
      trackTarget: 'all', chaosLevel: 30, density: 75,
      fadeInBars: 0, fadeOutBars: 0, variation: 0,
      variationTracks: { lead: 100, chords: 100, arp: 100, bass: 100, drums: 100 },
      trackRoles: cooked.metadata.trackDefs
    },
    song: cooked
  };
  fs.writeFileSync(stem + '.rmg', JSON.stringify(rmg));
  console.log('TAKE=' + takeName + ' bars=' + totalBars + ' notes=' + cooked.metadata.noteCount);
  console.log('MMP=' + stem + '.mmp');
  console.log('MID=' + stem + '.mid');
  console.log('RMG=' + stem + '.rmg');
}

main();
