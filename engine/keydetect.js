(function (exports) {
  const Theory = (typeof window !== 'undefined' ? window.RMGTheory :
    require('./theory.js').RMGTheory);

  const MAJ_PROF = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
  const MIN_PROF = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];
  const MINOR_SCALES = ['natural_minor', 'harmonic_minor', 'touhou_yonanuki', 'dorian', 'phrygian', 'melodic_minor'];

  function corr(a, b) {
    let ma = 0, mb = 0;
    for (let i = 0; i < 12; i++) { ma += a[i]; mb += b[i]; }
    ma /= 12; mb /= 12;
    let sab = 0, saa = 0, sbb = 0;
    for (let i = 0; i < 12; i++) {
      sab += (a[i] - ma) * (b[i] - mb);
      saa += (a[i] - ma) * (a[i] - ma);
      sbb += (b[i] - mb) * (b[i] - mb);
    }
    if (saa <= 0 || sbb <= 0) return -1;
    return sab / Math.sqrt(saa * sbb);
  }

  function bestMinorScale(key, hist, total) {
    let bestScale = 'natural_minor', bestFit = -1;
    for (const sc of MINOR_SCALES) {
      if (!Theory.SCALES[sc]) continue;
      let s = 0;
      try {
        const pcs = new Set(Theory.getScaleNotes(key, sc, 4, 4).map(m => ((m % 12) + 12) % 12));
        for (let pc = 0; pc < 12; pc++) if (pcs.has(pc)) s += hist[pc];
      } catch (e) { continue; }
      if (s > bestFit) { bestFit = s; bestScale = sc; }
    }
    return { scale: bestScale, fit: total ? bestFit / total : 0 };
  }

  function detectKey(notes) {
    const hist = new Array(12).fill(0);
    const bass = new Array(12).fill(0);
    let total = 0, bassTotal = 0;
    for (const n of (notes || [])) {
      if (n == null || n.midi == null) continue;
      const w = Math.max(0.5, n.duration || 1);
      const pc = (((n.midi % 12) + 12) % 12);
      hist[pc] += w;
      total += w;
      if (n.midi < 52) { bass[pc] += w; bassTotal += w; }
    }
    if (total <= 0) return { key: 'A', scale: 'natural_minor', fit: 0 };
    let bestRoot = 0, bestMode = 'minor', bestScore = -2;
    for (let root = 0; root < 12; root++) {
      const bonus = bassTotal > 0 ? 0.8 * (bass[root] / bassTotal) : 0;
      for (const mode of ['major', 'minor']) {
        const prof = mode === 'major' ? MAJ_PROF : MIN_PROF;
        const rot = [];
        for (let i = 0; i < 12; i++) rot.push(prof[(i - root + 12) % 12]);
        const c = corr(hist, rot) + bonus;
        if (c > bestScore) { bestScore = c; bestRoot = root; bestMode = mode; }
      }
    }
    const key = Theory.NOTE_NAMES[bestRoot];
    if (bestMode === 'major') {
      let s = 0;
      try {
        const pcs = new Set(Theory.getScaleNotes(key, 'major', 4, 4).map(m => ((m % 12) + 12) % 12));
        for (let pc = 0; pc < 12; pc++) if (pcs.has(pc)) s += hist[pc];
      } catch (e) {}
      return { key, scale: 'major', fit: total ? s / total : 0 };
    }
    const bm = bestMinorScale(key, hist, total);
    return { key, scale: bm.scale, fit: bm.fit };
  }

  function keySigToKey(sf, mi, notes) {
    const majRoot = (((sf * 7) % 12) + 12) % 12;
    if (!mi) return { key: Theory.NOTE_NAMES[majRoot], scale: 'major', fit: 1 };
    const root = (majRoot + 9) % 12;
    const key = Theory.NOTE_NAMES[root];
    const hist = new Array(12).fill(0);
    let total = 0;
    for (const n of (notes || [])) {
      if (n == null || n.midi == null) continue;
      const w = Math.max(0.5, n.duration || 1);
      hist[(((n.midi % 12) + 12) % 12)] += w;
      total += w;
    }
    if (total <= 0) return { key, scale: 'natural_minor', fit: 1 };
    const bm = bestMinorScale(key, hist, total);
    return { key, scale: bm.scale, fit: Math.max(0.85, bm.fit) };
  }

  exports.RMGKeyDetect = { detectKey, keySigToKey };
})(typeof window !== 'undefined' ? window : module.exports);
