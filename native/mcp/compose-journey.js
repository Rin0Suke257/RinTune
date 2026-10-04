// Hanh Trinh Ve Nha - cinematic D minor 100 BPM, 120 bars, hoa am tu viet
const os = require("os");
const path = require('path');
const fs = require('fs');
const G = require(__dirname + '/../../engine/generator.js').RMGGenerator;
const E = require(__dirname + '/../../engine/exporter.js').RMGExporter;
const T = require(__dirname + '/../../engine/theory.js').RMGTheory;

// Dang ky genre custom theo doan (id 'epic' de giu engine cinematic, progression tu viet)
const PARTS = [
  { section: 'intro', bars: 8, prog: [['i', 'i', 'VI', 'VII']], density: 45, chaos: 12, climax: 'none', artic: 'legato', contour: null, fi: 2, fo: 0 },
  { section: 'verse', bars: 16, prog: [['i', 'VI', 'III', 'VII']], density: 65, chaos: 15, climax: 'emotional_wave', artic: 'legato', contour: [{ x: 0, y: 0.35 }, { x: 0.5, y: 0.55 }, { x: 1, y: 0.4 }], fi: 0, fo: 0 },
  { section: 'verse', bars: 16, prog: [['i', 'VII', 'VI', 'V']], density: 75, chaos: 18, climax: 'crescendo', artic: 'auto', contour: [{ x: 0, y: 0.3 }, { x: 1, y: 0.9 }], fi: 0, fo: 0 },
  { section: 'chorus', bars: 24, prog: [['i', 'VII', 'VI', 'V']], density: 90, chaos: 28, climax: 'climax_explosion', artic: 'auto', contour: [{ x: 0, y: 0.8 }, { x: 0.55, y: 1.0 }, { x: 1, y: 0.7 }], fi: 0, fo: 0 },
  { section: 'verse', bars: 16, prog: [['VI', 'VII', 'i', 'i']], density: 45, chaos: 12, climax: 'none', artic: 'legato', contour: [{ x: 0, y: 0.3 }, { x: 1, y: 0.35 }], fi: 0, fo: 0 },
  { section: 'verse', bars: 16, prog: [['i', 'VI', 'III', 'VII']], density: 70, chaos: 16, climax: 'emotional_wave', artic: 'legato', contour: [{ x: 0, y: 0.45 }, { x: 0.5, y: 0.65 }, { x: 1, y: 0.5 }], fi: 0, fo: 0 },
  { section: 'chorus', bars: 16, prog: [['i', 'VII', 'VI', 'V']], density: 85, chaos: 22, climax: 'emotional_wave', artic: 'auto', contour: [{ x: 0, y: 0.7 }, { x: 0.5, y: 0.9 }, { x: 1, y: 0.75 }], fi: 0, fo: 0 },
  { section: 'outro', bars: 8, prog: [['i', 'i', 'i', 'i']], density: 40, chaos: 10, climax: 'none', artic: 'legato', contour: [{ x: 0, y: 0.5 }, { x: 1, y: 0.15 }], fi: 0, fo: 3 }
];

const segs = PARTS.map((p, idx) => {
  const gid = 'custom_cine_' + idx;
  T.GENRES[gid] = {
    id: 'epic', name: 'Cinematic Custom', description: 'composed',
    defaultBpm: 100, bpmRange: [60, 140], defaultKey: 'D', defaultScale: 'natural_minor',
    allowedScales: ['natural_minor'], drumGroove: 'standard', leadStyle: 'orchestral_strings',
    defaultTimeSignature: '4/4', progressions: p.prog
  };
  const gen = new G.MusicGenerator({
    genre: gid, key: 'D', scale: 'natural_minor', bpm: 100, timeSignature: '4/4',
    lengthBars: p.bars, section: p.section, motifStructure: 'smart_adaptive',
    articulation: p.artic, climaxCurve: p.climax, useContour: !!p.contour,
    contourPoints: p.contour, fadeInBars: p.fi, fadeOutBars: p.fo,
    trackTarget: 'all', chaosLevel: p.chaos, density: p.density,
    humanize: true, seed: Math.random()
  });
  const s = gen.generate();
  delete T.GENRES[gid];
  return { song: s, gen };
});

// stitch
let totalBars = 0, cumSteps = 0;
const progression = [];
const first = segs[0].song;
const tracks = {
  lead: { name: 'Lead Melody', type: 'synth_lead', instrument: first.tracks.lead.instrument, color: '#00f2fe', notes: [] },
  chords: { name: 'Harmony & Chords', type: 'poly_synth', instrument: first.tracks.chords.instrument, color: '#9b51e0', notes: [] },
  arp: { name: 'Arpeggio Ostinato', type: 'pluck_synth', instrument: first.tracks.arp.instrument, color: '#4facfe', notes: [] },
  bass: { name: 'Bassline', type: 'mono_bass', instrument: first.tracks.bass.instrument, color: '#f39c12', notes: [] },
  drums: { name: 'Drums & Percussion', type: 'drum_kit', instrument: 'standard_kit', color: '#e74c3c', notes: [] }
};
for (const { song: s } of segs) {
  const spb = s.metadata.stepsPerBar || 16;
  for (const c of s.progression) progression.push(Object.assign({}, c, { bar: c.bar + totalBars }));
  for (const k of Object.keys(tracks)) {
    for (const n of s.tracks[k].notes) tracks[k].notes.push(Object.assign({}, n, { step: n.step + cumSteps }));
  }
  totalBars += s.metadata.lengthBars;
  cumSteps += s.metadata.lengthBars * spb;
}
const song = {
  metadata: {
    title: 'Hanh_Trinh_Ve_Nha', genre: 'epic', genreName: 'Epic Orchestral (composed)',
    key: 'D', scale: 'natural_minor', scaleName: 'Natural Minor', bpm: 100, timeSignature: '4/4',
    stepsPerBar: 16, lengthBars: totalBars, section: 'merged',
    motifStructure: 'smart_adaptive', articulation: 'auto', climaxCurve: 'emotional_wave',
    chaosLevel: 18, density: 70, fadeInBars: 0, fadeOutBars: 0,
    trackTarget: 'all', isPurePiano: false, useContour: false, contourPoints: null,
    loopMode: false, noteCount: 0, seed: Math.random(), createdAt: new Date().toISOString()
  },
  progression, tracks
};
// arrangement (crash/kick-lock) nhung KHONG final hit - outro tram tu fade
segs[0].gen._arrangeEnsemble(song, { finalHit: false });
song.metadata.noteCount = Object.values(tracks).reduce((a, t) => a + t.notes.length, 0);

const outDir = path.join(os.homedir(), 'Desktop');
fs.writeFileSync(path.join(outDir, 'Hanh_Trinh_Ve_Nha.mid'), Buffer.from(E.Exporter.generateMidiFile(song)));
fs.writeFileSync(path.join(outDir, 'Hanh_Trinh_Ve_Nha.mmp'), E.Exporter.generateLmmsProject(song), 'utf8');
const secs = Math.round(totalBars * 16 * (60 / 100 / 4));
console.log('BARS=' + totalBars + ' NOTES=' + song.metadata.noteCount + ' LENGTH=' + Math.floor(secs / 60) + 'm' + (secs % 60) + 's');
const at = b => progression[b].symbol + '(' + progression[b].rootName + ')';
console.log('ARC: intro[' + at(0) + ' ' + at(4) + '] chorus_start[' + [40, 41, 42, 43].map(at).join(' ') + '] outro[' + [112, 116].map(at).join(' ') + ']');
console.log('TRACKS=' + JSON.stringify(Object.fromEntries(Object.entries(tracks).map(([k, t]) => [k, t.notes.length]))));
console.log('FILES_OK=true');
