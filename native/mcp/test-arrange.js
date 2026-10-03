const G = require('D:/RMG/engine/generator.js').RMGGenerator;
const E = require('D:/RMG/engine/exporter.js').RMGExporter;
const T = require('D:/RMG/engine/theory.js').RMGTheory;

let g = new G.MusicGenerator({ genre: 'touhou', key: 'A', lengthBars: 16, seed: 42 });
let s = g.generate();
const spb = 16, lastStep = 15 * spb;
const has = (tr, pred) => s.tracks[tr].notes.some(pred);
console.log('FINAL_CRASH=' + has('drums', n => n.midi === 49 && Math.abs(n.step - lastStep) <= 2));
console.log('FINAL_LEAD_TONIC=' + has('lead', n => n.step === lastStep && (n.midi % 12) === 9)); // A=9
console.log('CRASH_BAR8=' + has('drums', n => n.midi === 49 && Math.abs(n.step - 128) <= 2));
console.log('PICARDY=' + has('lead', n => n.step === lastStep && n.midi % 12 === 1)); // E major 3rd? root A(9)+16=... 9+16=25%12=1
const kicks = new Set(s.tracks.drums.notes.filter(n => n.midi === 36).map(n => Math.round(n.step)));
let unlocked = 0, locked = 0;
for (const n of s.tracks.bass.notes) {
  if (n.locked) continue;
  unlocked++;
  const r = Math.round(n.step);
  if (kicks.has(r) || kicks.has(r - 1) || kicks.has(r + 1)) locked++;
}
console.log('KICKLOCK=' + locked + '/' + unlocked);
const earlyLead = s.tracks.lead.notes.filter(n => !n.locked && n.step < 32).length;
console.log('EARLY_LEAD_UNLOCKED=' + earlyLead);

let g2 = new G.MusicGenerator({ genre: 'lofi', key: 'F', lengthBars: 8, loopMode: true, seed: 42 });
let s2 = g2.generate();
const ls2 = 7 * spb;
const lastBarDrums = s2.tracks.drums.notes.filter(n => Math.floor(n.step / spb) === 7);
console.log('LOOP_NO_FINAL=' + !s2.tracks.drums.notes.some(n => n.midi === 49 && Math.abs(n.step - ls2) <= 2));
console.log('LOOP_HATS_ONLY=' + lastBarDrums.every(n => n.midi === 42 || n.midi === 46));
console.log('LOOP_TONIC=' + s2.progression[7].symbol + s2.progression[7].rootName);
let g3 = new G.MusicGenerator({ genre: 'anime', key: 'C', lengthBars: 8, chaosLevel: 60, seed: 7 });
let s3 = g3.generate();
const mids = s3.tracks.lead.notes.map(n => n.midi);
console.log('AMBITUS=' + (Math.max(...mids) - Math.min(...mids)) + ' (expect <= ~30)');
let g4 = new G.MusicGenerator({ genre: 'touhou', key: 'A', lengthBars: 8, climaxCurve: 'climax_explosion', density: 90, seed: 7 });
let s4 = g4.generate();
const frac = s4.tracks.lead.notes.filter(n => n.step % 1 !== 0).length;
const mid = E.Exporter.generateMidiFile(s4);
const mmp = E.Exporter.generateLmmsProject(s4);
console.log('FRAC_NOTES=' + frac + ' MIDI_OK=' + (mid[0] === 77) + ' MMP_INT_POS=' + !/pos="[0-9]+\.[0-9]+"/.test(mmp));
console.log('ARRANGE_SUITE_DONE');
