const path = require("path");
const G = require(__dirname + '/../../engine/generator.js').RMGGenerator;
const proto = G.MusicGenerator.prototype;
const origFit = proto._fitArp;
let calls = [];
proto._fitArp = function (track, prog, spb) {
  calls.push({ n: track.notes.length, spb, hasProg: !!prog });
  return origFit.call(this, track, prog, spb);
};
const g = new G.MusicGenerator({ genre: 'fiery_piano', key: 'A', lengthBars: 8, density: 90, chaosLevel: 60, seed: 4 });
const s = g.generate();
console.log('FIT_CALLS=' + JSON.stringify(calls));
const bad = s.tracks.arp.notes.filter(n => {
  if (n.step % 16 !== 0) return false;
  const pcs = s.progression[Math.floor(n.step / 16)].notes.map(x => ((x % 12) + 12) % 12);
  return !pcs.includes(((n.midi % 12) + 12) % 12);
});
console.log('BAD=' + JSON.stringify(bad.map(n => ({ step: n.step, midi: n.midi }))));
