const G = require('D:/RMG/engine/generator.js').RMGGenerator;
const E = require('D:/RMG/engine/exporter.js').RMGExporter;
const g = new G.MusicGenerator({ genre: 'epic', key: 'D', scale: 'natural_minor', bpm: 120, lengthBars: 16, seed: 11 });
const s = g.generate();
const before = Object.fromEntries(Object.entries(s.tracks).map(([k, t]) => [k, t.notes.length]));
// solo bars 0-3, dialogue 4-7, cadenza 8-11, tutti 12-15
g.applyTexture(s, [
  { fromBar: 0, toBar: 3, texture: 'solo' },
  { fromBar: 4, toBar: 7, texture: 'dialogue' },
  { fromBar: 8, toBar: 11, texture: 'cadenza' },
  { fromBar: 12, toBar: 15, texture: 'tutti' }
]);
const after = Object.fromEntries(Object.entries(s.tracks).map(([k, t]) => [k, t.notes.length]));
console.log('BEFORE=' + JSON.stringify(before));
console.log('AFTER=' + JSON.stringify(after));
// solo range: drums bars0-3 phai het
const spb = 16;
const soloDrums = s.tracks.drums.notes.filter(n => n.step < 64).length;
console.log('SOLO_DRUMS_GONE=' + (soloDrums === 0));
// cadenza range: chi lead
const cadOther = ['drums', 'bass', 'arp', 'chords'].reduce((a, k) => a + s.tracks[k].notes.filter(n => n.step >= 128 && n.step < 192).length, 0);
const cadLead = s.tracks.lead.notes.filter(n => n.step >= 128 && n.step < 192).length;
console.log('CADENZA_LEAD_ONLY=' + (cadOther === 0 && cadLead > 0));
// tutti range nguyen (so voi before ti le)
console.log('NOTECOUNT_SYNC=' + (s.metadata.noteCount === Object.values(s.tracks).reduce((a, t) => a + t.notes.length, 0)));
// pure piano: texture bo qua
const gp = new G.MusicGenerator({ genre: 'epic', key: 'D', lengthBars: 4, trackTarget: 'pure_piano', seed: 1 });
const sp = gp.generate();
const n0 = sp.metadata.noteCount;
gp.applyTexture(sp, [{ fromBar: 0, toBar: 3, texture: 'cadenza' }]);
console.log('PIANO_UNTOUCHED=' + (sp.metadata.noteCount === n0));
// export van chay
const mid = E.Exporter.generateMidiFile(s);
console.log('MIDI_OK=' + (mid[0] === 77 && mid[1] === 84));
