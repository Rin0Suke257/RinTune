const path = require("path");
const G = require(__dirname + '/../../engine/generator.js').RMGGenerator;
let hits = 0, tried = 0;
for (const seed of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) {
  const g = new G.MusicGenerator({ genre: 'touhou', key: 'A', lengthBars: 8, climaxCurve: 'climax_explosion', density: 90, seed });
  const s = g.generate();
  const n = s.tracks.lead.notes.filter(x => x.step % 1 !== 0).length;
  tried++;
  if (n > 0) hits++;
}
console.log('TRIPLET_SEEDS_HIT=' + hits + '/' + tried);
