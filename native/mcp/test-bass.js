const G = require('D:/RMG/engine/generator.js').RMGGenerator;
const g = new G.MusicGenerator({ genre: 'touhou', key: 'A', lengthBars: 8, seed: 100 });
const s = g.generate();
const r1 = g.regenerateRegion(s, { fromBar: 0, toBar: 7, tracks: ['bass'], seed: 1 });
const r2 = g.regenerateRegion(s, { fromBar: 0, toBar: 7, tracks: ['bass'], seed: 2 });
const sig = nn => nn.map(n => n.step + ':' + n.midi + 'x' + n.duration).join(' ');
const a = sig(r1.notes.bass), b = sig(r2.notes.bass);
console.log('BASS_N1=' + r1.notes.bass.length + ' N2=' + r2.notes.bass.length);
console.log('BASS_DIFFERS=' + (a !== b));
for (const genre of ['synthwave', 'lofi', 'dark_fantasy']) {
  const gg = new G.MusicGenerator({ genre, key: 'A', lengthBars: 8, seed: 50 });
  const ss = gg.generate();
  const x1 = gg.regenerateRegion(ss, { fromBar: 0, toBar: 7, tracks: ['bass'], seed: 1 });
  const x2 = gg.regenerateRegion(ss, { fromBar: 0, toBar: 7, tracks: ['bass'], seed: 2 });
  console.log(genre + '_DIFFERS=' + (sig(x1.notes.bass) !== sig(x2.notes.bass)));
}
const t1 = new G.MusicGenerator({ genre: 'touhou', key: 'A', lengthBars: 4, seed: 11 }).generate();
const t2 = new G.MusicGenerator({ genre: 'touhou', key: 'A', lengthBars: 4, seed: 12 }).generate();
console.log('FULL_OK=' + (t1.metadata.noteCount > 0 && t2.metadata.noteCount > 0));
