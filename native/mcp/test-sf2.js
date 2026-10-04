const path = require("path");
const fs = require("fs");
const G = require(__dirname + '/../../engine/generator.js').RMGGenerator;
const E = require(__dirname + '/../../engine/exporter.js').RMGExporter;
const g = new G.MusicGenerator({ genre: 'touhou', key: 'A', lengthBars: 4, seed: 12 });
const s = g.generate();
const sf = path.join(process.env.LOCALAPPDATA || '', 'RMG', 'soundfonts', 'GeneralUser-GS.sf2');
if (!fs.existsSync(sf)) {
  console.log('SF2_SKIP=true (no local soundfont)');
  process.exit(0);
}
const x = E.Exporter.generateLmmsProject(s, null, 0, sf);
console.log('SF2_COUNT=' + (x.match(/<instrument name="sf2player">/g) || []).length + ' (expect 5)');
console.log('TRIO_GONE=' + !x.includes('tripleoscillator'));
console.log('SRC_OK=' + x.includes('src="' + sf + '"'));
console.log('DRUM128=' + x.includes('bank="128" patch="0"'));
console.log('LEAD56=' + x.includes('patch="56"'));
console.log('REVERB=' + x.includes('reverbOn="1"'));
const x0 = E.Exporter.generateLmmsProject(s);
console.log('FALLBACK_TRIO=' + (x0.match(/tripleoscillator/g) || []).length + ' (expect >0)');
