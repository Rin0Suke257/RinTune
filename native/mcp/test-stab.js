const path = require("path");
const G = require(__dirname + '/../../engine/generator.js').RMGGenerator;
const g = new G.MusicGenerator({ genre: 'fiery_piano', key: 'A', lengthBars: 8, seed: 123 });
const s = g.generate();
const last = s.progression[7];
console.log('LAST_CHIP=' + last.symbol + ' ' + last.rootName + ' rootMidi=' + last.rootMidi);
const near = s.tracks.lead.notes.filter(n => n.step >= 110 && n.step <= 114);
console.log('LEAD_AT_112=' + JSON.stringify(near.map(n => ({ step: n.step, dur: n.duration, midi: n.midi, vel: n.velocity, locked: !!n.locked }))));
