// Boss fight theme: Touhou ZUN style, A minor-ish, 175 BPM
const os = require("os");
const path = require('path');
const fs = require('fs');
const G = require(__dirname + '/../../engine/generator.js').RMGGenerator;
const E = require(__dirname + '/../../engine/exporter.js').RMGExporter;

const CTX = { genre: 'touhou', key: 'A', scale: 'touhou_yonanuki', bpm: 175, timeSignature: '4/4', motifStructure: 'smart_adaptive', articulation: 'touhou_fast', chaosLevel: 35, density: 90, humanize: true, trackTarget: 'all' };
const PARTS = [
  ['intro', 8, 'crescendo', 0, 0],
  ['verse', 16, 'emotional_wave', 0, 0],
  ['chorus', 16, 'climax_explosion', 0, 0],
  ['verse', 16, 'full_fire', 0, 0],
  ['chorus', 16, 'climax_explosion', 0, 0],
  ['outro', 8, 'none', 0, 0]
];

const segs = PARTS.map(([section, bars, climax, fi, fo]) => {
  const gen = new G.MusicGenerator(Object.assign({}, CTX, { section, lengthBars: bars, climaxCurve: climax, fadeInBars: fi, fadeOutBars: fo, seed: Math.random() }));
  return gen.generate();
});

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
    title: 'Boss_Fight_Fury', genre: 'touhou', genreName: 'Touhou ZUN Style',
    key: 'A', scale: 'touhou_yonanuki', scaleName: 'Touhou Yonanuki Minor', bpm: 175, timeSignature: '4/4',
    stepsPerBar: 16, lengthBars: totalBars, section: 'merged',
    motifStructure: 'smart_adaptive', articulation: 'touhou_fast', climaxCurve: 'climax_explosion',
    chaosLevel: 35, density: 90, fadeInBars: 0, fadeOutBars: 0,
    trackTarget: 'all', isPurePiano: false, useContour: false, contourPoints: null,
    noteCount, seed: Math.random(), createdAt: new Date().toISOString()
  },
  progression, tracks
};

const outDir = path.join(os.homedir(), 'Desktop');
fs.writeFileSync(path.join(outDir, 'Boss_Fight_Fury.mid'), Buffer.from(E.Exporter.generateMidiFile(song)));
fs.writeFileSync(path.join(outDir, 'Boss_Fight_Fury.mmp'), E.Exporter.generateLmmsProject(song), 'utf8');
const secs = totalBars * 16 * (60 / 175 / 4);
console.log('BARS=' + totalBars + ' NOTES=' + noteCount + ' LENGTH=' + Math.floor(secs / 60) + 'm' + Math.round(secs % 60) + 's');
console.log('PROG_FIRST8=' + progression.slice(0, 8).map(c => c.symbol + '(' + c.rootName + ')').join(' '));
console.log('TRACKS=' + JSON.stringify(Object.fromEntries(Object.entries(tracks).map(([k, t]) => [k, t.notes.length]))));
console.log('FILES_OK=true');
