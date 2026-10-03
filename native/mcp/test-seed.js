const G = require('D:/RMG/engine/generator.js').RMGGenerator;
// determinism: cung options + seed -> cung not (cho seed chia se)
function sig(s) {
  const parts = [];
  for (const [k, t] of Object.entries(s.tracks)) {
    for (const n of t.notes) parts.push(k + n.step + ':' + n.midi + 'x' + n.duration + 'v' + n.velocity);
  }
  return parts.sort().join('|');
}
const opts = { genre: 'anime', key: 'G', scale: 'major', bpm: 155, timeSignature: '4/4', lengthBars: 8, section: 'verse', motifStructure: 'none', articulation: 'auto', climaxCurve: 'emotional_wave', chaosLevel: 25, density: 75, humanize: true, loopMode: false, finalHit: true, seed: 20261003 };
const a = new G.MusicGenerator(Object.assign({}, opts)).generate();
const b = new G.MusicGenerator(Object.assign({}, opts)).generate();
console.log('SEED_DETERMINISTIC=' + (sig(a) === sig(b)) + ' notes=' + a.metadata.noteCount);
// khac seed -> khac bai
const c = new G.MusicGenerator(Object.assign({}, opts, { seed: 999 })).generate();
console.log('SEED_DIFFERS=' + (sig(a) !== sig(c)));
