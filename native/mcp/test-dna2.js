const G = require('D:/RMG/engine/generator.js').RMGGenerator;
for (const genre of ['fiery_piano', 'touhou', 'lofi', 'synthwave', 'chiptune', 'dark_fantasy', 'epic', 'cyberpunk', 'anime']) {
  const g = new G.MusicGenerator({ genre, key: 'A', lengthBars: 8, seed: 21 });
  const s = g.generate();
  const syms = [...new Set(s.progression.map(c => c.symbol))];
  const lead = s.tracks.lead.notes.slice().sort((a, b) => a.step - b.step);
  let leap = 0;
  for (let i = 1; i < lead.length; i++) leap += Math.abs(lead[i].midi - lead[i - 1].midi);
  const avgLeap = lead.length > 1 ? (leap / (lead.length - 1)).toFixed(1) : '-';
  const counts = Object.fromEntries(Object.entries(s.tracks).map(([k, t]) => [k, t.notes.length]));
  console.log(genre + ' syms=' + syms.length + ' [' + syms.slice(0, 5).join(',') + '] leadN=' + lead.length + ' avgLeap=' + avgLeap + ' ' + JSON.stringify(counts));
}
