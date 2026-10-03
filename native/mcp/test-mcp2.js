const path = require('path');
const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');
async function main() {
  const exe = process.argv[2];
  const transport = exe
    ? new StdioClientTransport({ command: exe, args: [] })
    : new StdioClientTransport({ command: process.execPath, args: [path.join(__dirname, 'server.js')] });
  const client = new Client({ name: 'rmg-test2', version: '1.0.0' });
  await client.connect(transport);
  const tools = await client.listTools();
  console.log('TOOLS=' + tools.tools.map(t => t.name).join(','));
  const gen = await client.callTool({ name: 'generate_song', arguments: { genre: 'lofi', key: 'F', lengthBars: 4, seed: 77 } });
  const s = JSON.parse(gen.content[0].text);
  console.log('SONG=' + s.title + ' notes=' + s.noteCount);
  const reg = await client.callTool({ name: 'regenerate_region', arguments: { songId: s.songId, fromBar: 1, toBar: 2, tracks: ['bass'], seed: 5 } });
  console.log('REGEN=' + JSON.parse(reg.content[0].text).noteCount);
  const ch = await client.callTool({ name: 'set_chord', arguments: { songId: s.songId, bar: 1, symbol: 'V7' } });
  console.log('CHORD=' + JSON.parse(ch.content[0].text).progression[0].symbol);
  const arr = await client.callTool({ name: 'arrange_song', arguments: { form: 'compact', genre: 'anime', key: 'G', seed: 3 } });
  const a = JSON.parse(arr.content[0].text);
  console.log('ARR=' + a.lengthBars + 'bars notes=' + a.noteCount);
  await client.close();
  console.log('MCP2_DONE');
}
main().catch(e => { console.error('MCP2_FAIL:', e.message); process.exit(1); });
