const G = require('D:/RMG/engine/generator.js').RMGGenerator;
const E = require('D:/RMG/engine/exporter.js').RMGExporter;
const g = new G.MusicGenerator({ genre: 'touhou', key: 'A', lengthBars: 4, seed: 8 });
const s = g.generate();
for (const t of ['lead', 'bass', 'drums']) {
  const c = E.Exporter.generateLmmsMidiClip(s, t);
  const head = c.xml.split('\n')[0];
  console.log(t + ' count=' + c.count +
    ' tag=' + head.startsWith('<midiclip') +
    ' posneg=' + head.includes('pos="-1"') +
    ' type1=' + head.includes('type="1"'));
}
const c = E.Exporter.generateLmmsMidiClip(s, 'lead');
const notes = (c.xml.match(/<note /g) || []).length;
console.log('NOTES_MATCH=' + (notes === c.count));
console.log('INT_TICKS=' + !/pos="[0-9]+\.[0-9]+"/.test(c.xml));
console.log('VOL_RANGE=' + !/vol="(0|1[0-9][0-9]|[1-9][0-9]?[0-9])"/.test('x'));
const vols = [...c.xml.matchAll(/vol="(\d+)"/g)].map(m => +m[1]);
console.log('VOL_MINMAX=' + Math.min(...vols) + '-' + Math.max(...vols));
const empty = E.Exporter.generateLmmsMidiClip({ metadata: { stepsPerBar: 16, lengthBars: 4 }, tracks: { lead: { name: 'L', notes: [] } } }, 'lead');
console.log('EMPTY_OK=' + (empty.count === 0 && empty.xml.includes('<midiclip')));
