// Gieo theme game chua lanh 120 bars: Intro 8 - Verse 32 - Chorus 32 - Verse 32 - Outro 16
const os = require("os");
const path = require('path');
const fs = require('fs');
const G = require(__dirname + '/../../engine/generator.js').RMGGenerator;
const E = require(__dirname + '/../../engine/exporter.js').RMGExporter;

const CTX = { genre: 'lofi', key: 'F', scale: 'major', bpm: 75, timeSignature: '4/4', motifStructure: 'smart_adaptive', articulation: 'auto', chaosLevel: 15, density: 65, humanize: true, trackTarget: 'all' };
const PARTS = [
  ['intro', 8, 'none', 2, 0],
  ['verse', 32, 'emotional_wave', 0, 0],
  ['chorus', 32, 'emotional_wave', 0, 0],
  ['verse', 32, 'emotional_wave', 0, 0],
  ['outro', 16, 'none', 0, 2]
];

const segs = PARTS.map(([section, bars, climax, fi, fo]) => {
  const gen = new G.MusicGenerator(Object.assign({}, CTX, { section, lengthBars: bars, climaxCurve: climax, fadeInBars: fi, fadeOutBars: fo, seed: Math.random() }));
  return gen.generate();
});

// stitch giong arranger
let totalBars = 0, cumSteps = 0;
const progression = [];
const first = segs[0];
const tracks = {
  lead: { name: 'Lead Melody', type: 'synth_lead', instrument: first.tracks.lead.instrument, color: '#00f2fe', notes: [] },
  chords: { name: 'Harmony & Chords', type: 'poly_synth', instrument: first.tracks.chords.instrument, color: '#9b51e0', notes: [] },
  arp: { name: 'Arpeggio Ostinato', type: 'pluck_synth', instrument: first.tracks.arp.instrument, color: '#4facfe', notes: [] },
  bass: { name: 'Bassline', type: 'mono_bass', instrument: first.tracks.bass.instrument, color: '#f39c12', notes: [] },
  drums: { name: 'Drums & Percussion', type: 'drum_kit', instrument: 'standard_kit', color: '#e74c3c', notes: [] }
};
for (const s of segs) {
  const spb = s.metadata.stepsPerBar || 16;
  for (const c of s.progression) progression.push(Object.assign({}, c, { bar: c.bar + totalBars }));
  for (const k of Object.keys(tracks)) {
    for (const n of s.tracks[k].notes) tracks[k].notes.push(Object.assign({}, n, { step: n.step + cumSteps }));
  }
  totalBars += s.metadata.lengthBars;
  cumSteps += s.metadata.lengthBars * spb;
}
const noteCount = Object.values(tracks).reduce((a, t) => a + t.notes.length, 0);
const song = {
  metadata: {
    title: 'Cozy_Hometown_Theme', genre: 'lofi', genreName: 'Lofi Hip Hop / Chill',
    key: 'F', scale: 'major', scaleName: 'Major', bpm: 75, timeSignature: '4/4',
    stepsPerBar: 16, lengthBars: totalBars, section: 'merged',
    motifStructure: 'smart_adaptive', articulation: 'auto', climaxCurve: 'emotional_wave',
    chaosLevel: 15, density: 65, fadeInBars: 0, fadeOutBars: 0,
    trackTarget: 'all', isPurePiano: false, useContour: false, contourPoints: null,
    noteCount, seed: Math.random(), createdAt: new Date().toISOString()
  },
  progression, tracks
};

const outDir = path.join(os.homedir(), 'Desktop');
fs.writeFileSync(path.join(outDir, 'Cozy_Hometown_Theme.mid'), Buffer.from(E.Exporter.generateMidiFile(song)));
fs.writeFileSync(path.join(outDir, 'Cozy_Hometown_Theme.mmp'), E.Exporter.generateLmmsProject(song), 'utf8');
const mins = (totalBars * 16 * (60 / 75 / 4)).toFixed(1);
console.log('BARS=' + totalBars + ' NOTES=' + noteCount + ' LENGTH_MIN=' + mins);
console.log('PROG_FIRST8=' + progression.slice(0, 8).map(c => c.symbol + '(' + c.rootName + ')').join(' '));
console.log('TRACKS=' + JSON.stringify(Object.fromEntries(Object.entries(tracks).map(([k, t]) => [k, t.notes.length]))));
console.log('FILES_OK=true');
