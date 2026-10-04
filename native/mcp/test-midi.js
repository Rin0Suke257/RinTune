const path = require("path");
const G = require(__dirname + '/../../engine/generator.js').RMGGenerator;
const E = require(__dirname + '/../../engine/exporter.js').RMGExporter;
const M = require(__dirname + '/../../engine/midi.js').RMGMidi;
const g = new G.MusicGenerator({ genre: 'anime', key: 'G', lengthBars: 4, timeSignature: '6/8', seed: 21 });
const s = g.generate();
const bytes = E.Exporter.generateMidiFile(s);
const parsed = M.parseMidiFile(bytes);
console.log('BPM=' + parsed.bpm + ' (expect ' + s.metadata.bpm + ') TS=' + parsed.timeSignature + ' TPQ=' + parsed.ticksPerQuarter);
const orig = [];
for (const [k, t] of Object.entries(s.tracks)) {
  for (const n of t.notes) orig.push(k + '|' + n.midi + '|' + (n.step * 120) + '|' + (Math.max(1, n.duration) * 120));
}
orig.sort();
const got = [];
const order = ['lead', 'chords', 'arp', 'bass'];
let pi = 0;
for (const t of parsed.tracks) {
  if (!t.notes.length || t.notes[0].startTick === undefined) continue;
  if (t.notes.length === 0) continue;
  const key = order[pi++] || 'lead';
  for (const n of t.notes) got.push(key + '|' + n.midi + '|' + n.startTick + '|' + n.durTicks);
}
got.sort();
console.log('ORIG=' + orig.length + ' PARSED_PITCHED~=' + got.length);
const origNoDrums = orig.filter(x => !x.startsWith('drums|'));
const gotNoDrums = got.filter(x => !x.startsWith('drums|'));
let match = 0;
const set = new Set(origNoDrums);
for (const x of gotNoDrums) if (set.has(x)) match++;
console.log('PITCHED_MATCH=' + match + '/' + origNoDrums.length);
const key2 = x => x.split('|').slice(0, 3).join('|');
const set2 = new Set(origNoDrums.map(key2));
let match2 = 0;
for (const x of gotNoDrums) if (set2.has(key2(x))) match2++;
console.log('PITCH_ONSET_MATCH=' + match2 + '/' + origNoDrums.length + ' (lech duration do MIDI chong not cung cao do)');
const drums = parsed.tracks.flatMap(t => t.notes.filter(n => n.channel === 9));
console.log('DRUM_NOTES=' + drums.length + ' (expect ' + s.tracks.drums.notes.length + ')');
