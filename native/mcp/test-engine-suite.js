const G = require('D:/RMG/engine/generator.js').RMGGenerator;
const E = require('D:/RMG/engine/exporter.js').RMGExporter;
// full generate + region + chord edit + export tren nhieu genre/time signature
for (const [genre, ts] of [['synthwave', '4/4'], ['sasakure_uk', '7/8'], ['lofi', '6/8'], ['anime', '4/4']]) {
  const g = new G.MusicGenerator({ genre, key: 'G', lengthBars: 6, timeSignature: ts, seed: 11 });
  const s = g.generate();
  const r = g.regenerateRegion(s, { fromBar: 1, toBar: 2, tracks: ['bass', 'arp', 'drums', 'lead', 'chords'], seed: 3 });
  const spb = s.metadata.stepsPerBar;
  for (const [k, nn] of Object.entries(r.notes)) {
    const t = s.tracks[k];
    t.notes = t.notes.filter(n => n.step < spb || n.step >= 3 * spb).concat(nn);
  }
  s.progression[0] = g.resolveBarChord('V', 0);
  s.progression = g.retuneProgression(s.progression);
  const mid = E.Exporter.generateMidiFile(s);
  const mmp = E.Exporter.generateLmmsProject(s);
  console.log(genre + '/' + ts + ' notes=' + s.metadata.noteCount + ' midi=' + mid.length + ' mmp=' + mmp.length + ' chord0=' + s.progression[0].symbol + s.progression[0].rootName);
}
console.log('ENGINE_SUITE_OK');
