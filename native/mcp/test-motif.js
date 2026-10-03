const G = require('D:/RMG/engine/generator.js').RMGGenerator;
const T = require('D:/RMG/engine/theory.js').RMGTheory;

// 1. contour luu vao metadata + giu khi regen
let g = new G.MusicGenerator({ genre: 'touhou', key: 'A', lengthBars: 8, useContour: true, contourPoints: [{ x: 0, y: 0.2 }, { x: 0.5, y: 0.9 }, { x: 1, y: 0.2 }], seed: 3 });
let s = g.generate();
console.log('CONTOUR_META=' + (s.metadata.useContour === true && s.metadata.contourPoints.length === 3));
const leadBefore = s.tracks.lead.notes.map(n => n.midi).join(',');
const r = g.regenerateRegion(s, { fromBar: 4, toBar: 5, tracks: ['lead'], seed: 99 });
// regen khong contour (gia lap bai cu thieu metadata)
const sOld = JSON.parse(JSON.stringify(s));
delete sOld.metadata.useContour; delete sOld.metadata.contourPoints;
const rOld = g.regenerateRegion(sOld, { fromBar: 4, toBar: 5, tracks: ['lead'], seed: 99 });
const sameRange = a => a.filter(n => n.step >= 64 && n.step < 96).map(n => n.midi).join(',');
console.log('CONTOUR_DIFFERS=' + (sameRange(r.notes.lead) !== sameRange(rOld.notes.lead)));

// 2. motif tiling + develop
const scaleNotes = T.getScaleNotes('A', 'touhou_yonanuki', 4, 6);
const motif = [
  { stepOffset: 0, durationSteps: 2, scaleIndex: 4 },
  { stepOffset: 4, durationSteps: 2, scaleIndex: 6 },
  { stepOffset: 8, durationSteps: 4, scaleIndex: 5 }
];
const tiled = g._tileBlueprint(motif, 32, 16);
console.log('TILE_N=' + tiled.length + ' (expect 8: 3+3+2, cat bot o cuoi phrase)');
console.log('TILE_OK=' + (tiled[3].stepOffset === 12 && tiled[6].stepOffset === 24 && tiled[7].stepOffset === 28 && tiled.every(n => n.isDownbeat === (n.stepOffset % 16 === 0 || n.stepOffset % 8 === 0))));
const g2 = new G.MusicGenerator({ genre: 'anime', key: 'C', lengthBars: 8, motifStructure: 'none', seed: 1 });
const s2 = g2.generate();
// gia lap user khoa motif 2 bars dau: lay not co san lam giong
const seedMotif = s2.tracks.lead.notes.filter(n => n.step < 32).slice(0, 4).map(n => {
  let best = 0, bd = 1e9;
  scaleNotes.forEach((m, i) => { const d = Math.abs(m - n.midi); if (d < bd) { bd = d; best = i; } });
  return { stepOffset: n.step, durationSteps: n.duration, scaleIndex: best };
});
const r2 = g2.regenerateRegion(s2, { fromBar: 0, toBar: 7, tracks: ['lead'], leadSeed: seedMotif, seed: 5 });
console.log('MOTIF_REGEN_N=' + r2.notes.lead.length + ' ALL_GE0=' + r2.notes.lead.every(n => n.step >= 0));
// 3. stitch giong merge cu: 2 doan 4 bars -> 8 bars, step dich dung
const seg1 = new G.MusicGenerator({ genre: 'lofi', key: 'F', lengthBars: 4, seed: 10 }).generate();
const seg2 = new G.MusicGenerator({ genre: 'lofi', key: 'F', lengthBars: 4, seed: 11 }).generate();
const max1 = Math.max(...seg1.tracks.lead.notes.map(n => n.step));
const shifted = seg2.tracks.lead.notes.map(n => n.step + 4 * seg2.metadata.stepsPerBar);
console.log('STITCH_MATH=' + (Math.min(...shifted) >= 64) + ' SEG1_MAX=' + max1);
