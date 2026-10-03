/** Test MCP server qua SDK Client (stdio) */
const path = require('path');
const fs = require('fs');
const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');

const SERVER_CMD = process.argv[2] || process.execPath;
const SERVER_ARGS = process.argv[3] ? process.argv.slice(3) : [path.join(__dirname, 'server.js')];

async function main() {
  const transport = new StdioClientTransport({ command: SERVER_CMD, args: SERVER_ARGS });
  const client = new Client({ name: 'rmg-test', version: '1.0.0' });
  await client.connect(transport);

  const tools = await client.listTools();
  console.log('TOOLS=' + tools.tools.map(t => t.name).join(','));

  const gen = await client.callTool({
    name: 'generate_song',
    arguments: { genre: 'touhou', key: 'A', lengthBars: 4, seed: 12345 }
  });
  const summary = JSON.parse(gen.content[0].text);
  console.log('SONG=' + summary.title + ' notes=' + summary.noteCount + ' tracks=' + JSON.stringify(summary.tracks));

  const outDir = path.join(__dirname, 'test-out');
  fs.mkdirSync(outDir, { recursive: true });

  const midi = await client.callTool({
    name: 'export_midi',
    arguments: { songId: summary.songId, outPath: path.join(outDir, 'test.mid') }
  });
  console.log('MIDI=' + midi.content[0].text);
  const head = fs.readFileSync(path.join(outDir, 'test.mid')).subarray(0, 4).toString();
  console.log('MIDI_HEADER=' + head);

  const mmp = await client.callTool({
    name: 'export_mmp',
    arguments: { songId: summary.songId, outPath: path.join(outDir, 'test.mmp') }
  });
  console.log('MMP=' + mmp.content[0].text);
  const xml = fs.readFileSync(path.join(outDir, 'test.mmp'), 'utf8');
  console.log('MMP_OK=' + xml.startsWith('<?xml') + ' HAS_LMMS=' + xml.includes('<lmms-project'));

  const clip = await client.callTool({ name: 'export_clip', arguments: { songId: summary.songId } });
  console.log('CLIP_LEN=' + clip.content[0].text.length);

  await client.close();
  console.log('TEST_DONE');
}

main().catch(e => { console.error('TEST_FAIL:', e); process.exit(1); });
