const T = require('D:/RMG/engine/theory.js').RMGTheory;
let bad = [];
for (const [id, g] of Object.entries(T.GENRES)) {
  if (!g.trackProfile || !g.leadGrammar) bad.push(id + ':missing DNA');
  for (const tpl of g.progressions) {
    for (const sym of tpl) {
      try {
        const c = T.resolveChord(sym, g.defaultKey, g.defaultScale, 3);
        if (!c.notes || !c.notes.length) bad.push(id + ':' + sym + ':no notes');
      } catch (e) { bad.push(id + ':' + sym + ':throws'); }
    }
  }
}
console.log('GENRES=' + Object.keys(T.GENRES).length);
console.log(bad.length ? 'BAD=' + JSON.stringify(bad) : 'DNA_ALL_VALID');
