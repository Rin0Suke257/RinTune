const G = require('D:/RMG/engine/generator.js').RMGGenerator;
const E = require('D:/RMG/engine/exporter.js').RMGExporter;
// arp fit: downbeat phai la chord tone + cap 93
for (const genre of ['touhou', 'fiery_piano', 'synthwave', 'lofi']) {
  const g = new G.MusicGenerator({ genre, key: 'A', lengthBars: 8, density: 90, chaosLevel: 60, seed: 4 });
  const s = g.generate();
  const spb = 16;
  let badDown = 0, over = 0, total = 0;
  for (const n of s.tracks.arp.notes) {
    total++;
    if (n.midi > 93) over++;
    if (n.step % spb === 0) {
      const bar = Math.floor(n.step / spb);
      const pcs = s.progression[bar].notes.map(x => ((x % 12) + 12) % 12);
      if (!pcs.includes(((n.midi % 12) + 12) % 12)) badDown++;
    }
  }
  console.log(genre + ' arpN=' + total + ' over93=' + over + ' badDownbeat=' + badDown);
}
// swing ticks
const g = new G.MusicGenerator({ genre: 'lofi', key: 'F', lengthBars: 2, seed: 1 });
const s = g.generate();
const m0 = E.Exporter.generateMidiFile(s, null, 0);
const m30 = E.Exporter.generateMidiFile(s, null, 30);
console.log('SWING_DIFFERS=' + !Buffer.from(m0).equals(Buffer.from(m30)) + ' SAME_LEN=' + (m0.length === m30.length));
// wav encode voi mock buffer
const mock = {
  sampleRate: 44100, numberOfChannels: 2, length: 4410,
  getChannelData: (c) => { const a = new Float32Array(4410); for (let i = 0; i < 4410; i++) a[i] = Math.sin(i * 0.1) * (c ? 0.5 : 1); return a; }
};
const wav = E.Exporter.encodeWavFile(mock);
console.log('WAV_HDR=' + String.fromCharCode(...wav.slice(0, 4)) + ' SIZE=' + wav.length + ' (expect ' + (44 + 4410 * 4) + ')');
console.log('RIFF_OK=' + (wav[0] === 82 && wav[8] === 87));
