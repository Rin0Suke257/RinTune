const path = require("path");
const G = require(__dirname + '/../../engine/generator.js').RMGGenerator;
const T = require(__dirname + '/../../engine/theory.js').RMGTheory;
T.GENRES['custom_1'] = {
  id: 'custom_1', name: 'Vina Test', description: 'test',
  defaultBpm: 130, bpmRange: [110, 150], defaultKey: 'G', defaultScale: 'major',
  allowedScales: ['major'], drumGroove: 'standard', leadStyle: 'square_8bit',
  defaultTimeSignature: '4/4', progressions: [['I', 'V', 'vi', 'IV'], ['vi', 'IV', 'I', 'V']]
};
const g = new G.MusicGenerator({ genre: 'custom_1', key: 'G', scale: 'major', bpm: 130, lengthBars: 8, seed: 5 });
const s = g.generate();
console.log('CUSTOM_NOTES=' + s.metadata.noteCount + ' PROG0=' + s.progression[0].symbol + s.progression[0].rootName);
const g2 = new G.MusicGenerator({ genre: 'touhou', key: 'A', lengthBars: 8, finalHit: false, seed: 5 });
const s2 = g2.generate();
const ls = 7 * 16;
const hitLead = s2.tracks.lead.notes.some(n => n.locked && Math.abs(n.step - ls) <= 1);
console.log('FINALHIT_OFF_NOLEAD=' + !hitLead + ' LASTCHIP=' + s2.progression[7].symbol);
const g3 = new G.MusicGenerator({ genre: 'touhou', key: 'A', lengthBars: 8, seed: 5 });
const s3 = g3.generate();
console.log('FINALHIT_ON_LEAD=' + s3.tracks.lead.notes.some(n => n.locked && Math.abs(n.step - ls) <= 1));
