const path = require("path");
const G = require(__dirname + '/../../engine/generator.js').RMGGenerator;
const E = require(__dirname + '/../../engine/exporter.js').RMGExporter;
const T = require(__dirname + '/../../engine/theory.js').RMGTheory;
const noTs = Object.entries(T.GENRES).filter(([k, g]) => !g.defaultTimeSignature).map(([k]) => k);
console.log('MISSING_TS=' + JSON.stringify(noTs));
for (const genre of ['touhou', 'fiery_piano', 'lofi', 'sasakure_uk', 'synthwave']) {
  const g = new G.MusicGenerator({ genre, key: 'A', lengthBars: 8, seed: 3 });
  const s = g.generate();
  const last = s.progression[s.progression.length - 1];
  console.log(genre + ' last=' + last.symbol + last.rootName);
}
const g78 = new G.MusicGenerator({ genre: 'sasakure_uk', key: 'A', lengthBars: 4, seed: 3 });
const s78 = g78.generate();
const x78 = E.Exporter.generateLmmsProject(s78);
console.log('MMP78=' + /timesig_numerator="(\d+)" timesig_denominator="(\d+)"/.exec(x78).slice(1).join('/'));
console.log('STEPS78=' + s78.metadata.stepsPerBar);
