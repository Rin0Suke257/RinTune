/** Demo: AI client noi vao MCP-RMG da cai dat, sinh + xuat nhac that */
const os = require("os");
const path = require('path');
const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');

async function main() {
  const mcpExe = path.join(process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local'), 'RinTune', 'mcp', 'RinTune-MCP.exe');
  const transport = new StdioClientTransport({
    command: mcpExe, args: []
  });
  const client = new Client({ name: 'rmg-ai-demo', version: '1.0.0' });
  await client.connect(transport);

  const genres = await client.callTool({ name: 'list_genres', arguments: {} });
  console.log('GENRES_OK=' + JSON.parse(genres.content[0].text).length);

  // AI chon: Lofi Chill, key F, 8 bars, chorus nhe
  const gen = await client.callTool({
    name: 'generate_song',
    arguments: { genre: 'lofi', key: 'F', lengthBars: 8, section: 'chorus', bpm: 85 }
  });
  const s = JSON.parse(gen.content[0].text);
  console.log('SONG=' + s.title);
  console.log('NOTES=' + s.noteCount + ' TRACKS=' + JSON.stringify(s.tracks));

  const desk = path.join(os.homedir(), 'Desktop', 'RMG_AI_Demo');
  const midi = await client.callTool({ name: 'export_midi', arguments: { songId: s.songId, outPath: desk + '.mid' } });
  const mmp = await client.callTool({ name: 'export_mmp', arguments: { songId: s.songId, outPath: desk + '.mmp' } });
  console.log('MIDI=' + midi.content[0].text);
  console.log('MMP=' + mmp.content[0].text);

  await client.close();
  console.log('DEMO_DONE');
}
main().catch(e => { console.error('DEMO_FAIL:', e.message); process.exit(1); });
