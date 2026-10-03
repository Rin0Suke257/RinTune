const G = require('D:/RMG/engine/generator.js').RMGGenerator;
const genres = ['touhou', 'fiery_piano', 'sasakure_uk', 'lofi', 'synthwave', 'chiptune', 'dark_fantasy', 'epic', 'cyberpunk', 'anime'];
for (const genre of genres) {
  const g = new G.MusicGenerator({ genre, key: 'A', lengthBars: 4, seed: 42 });
  const s = g.generate();
  const bar0 = t => s.tracks[t].notes.filter(n => n.step < 16).map(n => n.step + ':' + n.midi + 'x' + n.duration).join(' ');
  console.log('=== ' + genre + ' notes=' + s.metadata.noteCount);
  console.log('  bass: ' + bar0('bass'));
  console.log('  arp:  ' + bar0('arp'));
}
// region regen van chay voi pattern moi
const g2 = new G.MusicGenerator({ genre: 'synthwave', key: 'A', lengthBars: 8, seed: 5 });
const s2 = g2.generate();
const r = g2.regenerateRegion(s2, { fromBar: 2, toBar: 3, tracks: ['bass', 'arp'], seed: 9 });
const ok = Object.values(r.notes).flat().every(n => n.step >= 32 && n.step < 64);
console.log('REGION_OK=' + ok + ' bassN=' + r.notes.bass.length + ' arpN=' + r.notes.arp.length);
