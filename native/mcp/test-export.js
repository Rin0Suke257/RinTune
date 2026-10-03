const G = require('D:/RMG/engine/generator.js').RMGGenerator;
const E = require('D:/RMG/engine/exporter.js').RMGExporter;
const g = new G.MusicGenerator({ genre: 'lofi', key: 'F', lengthBars: 4, seed: 7 });
const s = g.generate();
const mix = {
  lead: { volume: 0.85, muted: true, solo: false, pan: 0 },
  chords: { volume: 0.5, muted: false, solo: false, pan: -15 },
  arp: { volume: 0.75, muted: false, solo: false, pan: 15 },
  bass: { volume: 0.9, muted: false, solo: false, pan: -40 },
  drums: { volume: 0.95, muted: false, solo: false, pan: 0 }
};
const x1 = E.Exporter.generateLmmsProject(s, mix);
console.log('TRACKS=' + (x1.match(/<track name/g) || []).length + ' (expect 4, lead muted)');
console.log('BASS_PAN40=' + x1.includes('<instrumenttrack pan="-40"'));
console.log('CHORD_VOL50=' + x1.includes('<instrumenttrack pan="-15" vol="50"'));
console.log('LOFI_SINE=' + x1.includes('wave="0"'));
const mid = E.Exporter.generateMidiFile(s, mix);
console.log('MIDI_TRACKS=' + ((mid[10] << 8) | mid[11]) + ' (expect 5: conductor+4)');
