/**
 * RMG Export Engine
 * Generates LMMS Project XML (.mmp), LMMS Clipboard Track Clips,
 * Binary Standard MIDI Files (.mid with Lyric events), and UTAU Project Files (.ust).
 * Author: Rin0suke257
 */

(function(exports) {
  'use strict';

  // wave: 0 sine, 1 triangle, 2 saw, 3 square, 6 white noise
  const ROLE_DEFAULTS = {
    lead:   { osc: [{ wave: 2, vol: 100 }, { wave: 2, vol: 80, fine: 7, pan: -10 }, { wave: 0, vol: 60, coarse: -12, pan: 10 }] },
    pad:    { osc: [{ wave: 2, vol: 70 }, { wave: 2, vol: 70, fine: -6, pan: -12 }, { wave: 0, vol: 55, pan: 12 }] },
    arp:    { osc: [{ wave: 3, vol: 85 }, { wave: 3, vol: 60, fine: 5, pan: -8 }, { wave: 0, vol: 50, pan: 8 }] },
    bass:   { osc: [{ wave: 0, vol: 100, coarse: -12 }, { wave: 1, vol: 70 }, { wave: 3, vol: 40, coarse: -12, pan: 0 }] },
    drums:  { osc: [{ wave: 6, vol: 90 }, { wave: 0, vol: 80, coarse: -24 }, { wave: 3, vol: 30, coarse: -12 }] }
  };

  // Ghi de tung role theo genre (thieu role nao thi dung default)
  const GENRE_INSTRUMENTS = {
    sasakure_uk: {
      lead:  { osc: [{ wave: 3, vol: 100 }, { wave: 3, vol: 75, fine: 6, pan: -10 }, { wave: 1, vol: 60, pan: 10 }] },
      pad:   { osc: [{ wave: 3, vol: 60 }, { wave: 3, vol: 60, fine: -5, pan: -12 }, { wave: 1, vol: 55, pan: 12 }] },
      bass:  { osc: [{ wave: 3, vol: 95, coarse: -12 }, { wave: 3, vol: 60, coarse: -12, fine: 4 }, { wave: 0, vol: 50, coarse: -24 }] }
    },
    chiptune: {
      lead:  { osc: [{ wave: 3, vol: 100 }, { wave: 3, vol: 70, fine: 8, pan: -8 }, { wave: 3, vol: 50, coarse: 12, pan: 8 }] },
      arp:   { osc: [{ wave: 3, vol: 90 }, { wave: 3, vol: 65, fine: -6, pan: -8 }, { wave: 1, vol: 50, pan: 8 }] },
      bass:  { osc: [{ wave: 3, vol: 95, coarse: -12 }, { wave: 1, vol: 60, coarse: -12 }, { wave: 0, vol: 50, coarse: -24 }] },
      drums: { osc: [{ wave: 6, vol: 100 }, { wave: 3, vol: 60, coarse: -24 }, { wave: 3, vol: 30, coarse: -12 }] }
    },
    lofi: {
      lead:  { osc: [{ wave: 0, vol: 95 }, { wave: 1, vol: 65, fine: 4, pan: -8 }, { wave: 0, vol: 55, coarse: -12, pan: 8 }] },
      pad:   { osc: [{ wave: 1, vol: 65 }, { wave: 1, vol: 65, fine: -4, pan: -12 }, { wave: 0, vol: 60, pan: 12 }] },
      arp:   { osc: [{ wave: 1, vol: 80 }, { wave: 0, vol: 60, pan: -8 }, { wave: 0, vol: 45, coarse: -12, pan: 8 }] },
      bass:  { osc: [{ wave: 0, vol: 100, coarse: -12 }, { wave: 0, vol: 60, coarse: -24 }, { wave: 1, vol: 35 }] },
      drums: { osc: [{ wave: 6, vol: 55 }, { wave: 0, vol: 70, coarse: -24 }, { wave: 0, vol: 40, coarse: -12 }] }
    },
    synthwave: {
      lead:  { osc: [{ wave: 2, vol: 95 }, { wave: 2, vol: 85, fine: 9, pan: -12 }, { wave: 0, vol: 55, coarse: -12, pan: 12 }] },
      bass:  { osc: [{ wave: 2, vol: 85 }, { wave: 0, vol: 90, coarse: -12 }, { wave: 0, vol: 50, coarse: -24 }] }
    },
    dark_fantasy: {
      lead:  { osc: [{ wave: 2, vol: 80 }, { wave: 2, vol: 80, fine: -7, pan: -10 }, { wave: 0, vol: 70, pan: 10 }] },
      pad:   { osc: [{ wave: 2, vol: 60 }, { wave: 2, vol: 60, fine: 5, pan: -12 }, { wave: 0, vol: 75, pan: 12 }] },
      bass:  { osc: [{ wave: 0, vol: 100, coarse: -12 }, { wave: 0, vol: 70, coarse: -24 }, { wave: 2, vol: 35 }] }
    },
    epic: {
      lead:  { osc: [{ wave: 2, vol: 90 }, { wave: 1, vol: 70, fine: 5, pan: -10 }, { wave: 0, vol: 65, pan: 10 }] },
      pad:   { osc: [{ wave: 2, vol: 65 }, { wave: 2, vol: 65, fine: -5, pan: -14 }, { wave: 0, vol: 70, pan: 14 }] },
      drums: { osc: [{ wave: 6, vol: 100 }, { wave: 0, vol: 95, coarse: -24 }, { wave: 0, vol: 60, coarse: -12 }] }
    },
    cinematic: {
      lead:  { osc: [{ wave: 2, vol: 85 }, { wave: 1, vol: 70, fine: 4, pan: -10 }, { wave: 0, vol: 70, pan: 10 }] },
      pad:   { osc: [{ wave: 2, vol: 60 }, { wave: 1, vol: 60, fine: -4, pan: -14 }, { wave: 0, vol: 75, pan: 14 }] },
      arp:   { osc: [{ wave: 1, vol: 75 }, { wave: 0, vol: 60, pan: -8 }, { wave: 0, vol: 55, coarse: -12, pan: 8 }] },
      bass:  { osc: [{ wave: 0, vol: 100, coarse: -12 }, { wave: 0, vol: 70, coarse: -24 }, { wave: 2, vol: 35 }] },
      drums: { osc: [{ wave: 6, vol: 90 }, { wave: 0, vol: 90, coarse: -24 }, { wave: 0, vol: 55, coarse: -12 }] }
    },
    cyberpunk: {
      lead:  { osc: [{ wave: 3, vol: 90 }, { wave: 2, vol: 75, fine: -8, pan: -10 }, { wave: 0, vol: 60, coarse: -12, pan: 10 }] },
      bass:  { osc: [{ wave: 0, vol: 100, coarse: -12 }, { wave: 3, vol: 55, coarse: -12 }, { wave: 0, vol: 60, coarse: -24 }] }
    },
    anime: {
      lead:  { osc: [{ wave: 3, vol: 95 }, { wave: 3, vol: 70, fine: 6, pan: -10 }, { wave: 1, vol: 60, pan: 10 }] },
      arp:   { osc: [{ wave: 3, vol: 85 }, { wave: 1, vol: 65, pan: -8 }, { wave: 0, vol: 50, coarse: 12, pan: 8 }] }
    },
    fiery_piano: {
      lead:  { osc: [{ wave: 2, vol: 95 }, { wave: 2, vol: 80, fine: 7, pan: -10 }, { wave: 1, vol: 65, coarse: -12, pan: 10 }] },
      bass:  { osc: [{ wave: 1, vol: 90 }, { wave: 0, vol: 85, coarse: -12 }, { wave: 0, vol: 55, coarse: -24 }] }
    },
    touhou: {
      lead:  { osc: [{ wave: 3, vol: 90 }, { wave: 2, vol: 80, fine: 6, pan: -10 }, { wave: 0, vol: 60, coarse: -12, pan: 10 }] },
      bass:  { osc: [{ wave: 1, vol: 90 }, { wave: 0, vol: 85, coarse: -12 }, { wave: 0, vol: 50, coarse: -24 }] }
    }
  };

  function recipeFor(genreId, role) {
    const g = GENRE_INSTRUMENTS[genreId] || {};
    const base = ROLE_DEFAULTS[role] || ROLE_DEFAULTS.lead;
    const over = g[role];
    if (!over) return base;
    return {
      osc: [0, 1, 2].map(i => Object.assign({ wave: 2, vol: 80, coarse: 0, fine: 0, pan: 0 }, base.osc[i], over.osc[i]))
    };
  }

  function triOscXml(recipe, indent) {
    const pad = indent || '            ';
    let xml = `${pad}<instrument name="tripleoscillator">\n`;
    xml += `${pad}  <tripleoscillator st_sync="0">\n`;
    recipe.osc.forEach((o, i) => {
      xml += `${pad}    <osc${i} coarse="${o.coarse || 0}" fine="${o.fine || 0}" pan="${o.pan || 0}" vol="${o.vol}" wave="${o.wave}"/>\n`;
    });
    xml += `${pad}  </tripleoscillator>\n${pad}</instrument>\n`;
    return xml;
  }

  function mixSoloSet(mix) {
    if (!mix) return null;
    const soloed = Object.keys(mix).filter(k => mix[k] && mix[k].solo);
    return soloed.length ? soloed : null;
  }

  function mixAudible(mix, key, soloSet) {
    if (!mix || !mix[key]) return true;
    if (soloSet) return soloSet.includes(key);
    return !mix[key].muted;
  }

  class Exporter {
    /**
     * Generate complete LMMS Project (.mmp) XML String
     * mix (optional): { trackKey: { volume 0..1, muted, solo, pan -100..100 } }
     * lay tu Synth.getTrackMix() de export dung nhu dang nghe.
     */
    static generateLmmsProject(songData, mix = null, swing = 0) {
      const { metadata, tracks } = songData;
      const bpm = metadata.bpm || 140;
      const lengthBars = metadata.lengthBars || 16;
      const ticksPerStep = 12; // 192 ticks per bar (48 ticks per quarter note / 4 = 12 per 16th step)
      const genreId = metadata.genre || 'touhou';
      const soloSet = mixSoloSet(mix);
      const tsParts = String(metadata.timeSignature || '4/4').split('/');
      const tsNum = Math.max(1, Math.min(12, parseInt(tsParts[0], 10) || 4));
      const tsDen = [2, 4, 8, 16].includes(parseInt(tsParts[1], 10)) ? parseInt(tsParts[1], 10) : 4;

      let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
      xml += `<!DOCTYPE lmms-project>\n`;
      xml += `<lmms-project version="1.0" creator="RMG by Rin0suke257" creatorversion="1.2.2" type="song">\n`;
      xml += `  <head timesig_numerator="${tsNum}" timesig_denominator="${tsDen}" bpm="${bpm}" mastervol="100" masterpitch="0"/>\n`;
      xml += `  <song>\n`;
      xml += `    <trackcontainer width="600" height="300" x="5" y="5" visible="1" minimized="0" type="song">\n`;

      // Track Mapping (vol/pan/mute lay tu mixer, mac dinh giu nhu cu)
      const trackDefs = [
        { key: 'lead', role: 'lead', name: 'RMG Lead', pan: 0, vol: 100, color: '#00f2fe' },
        { key: 'chords', role: 'pad', name: 'RMG Chords', pan: -15, vol: 80, color: '#9b51e0' },
        { key: 'arp', role: 'arp', name: 'RMG Arpeggio', pan: 15, vol: 85, color: '#4facfe' },
        { key: 'bass', role: 'bass', name: 'RMG Bass', pan: 0, vol: 95, color: '#f39c12' },
        { key: 'drums', role: 'drums', name: 'RMG Drums', pan: 0, vol: 100, color: '#e74c3c' }
      ];

      for (const def of trackDefs) {
        const track = tracks[def.key];
        if (!track) continue;
        if (!mixAudible(mix, def.key, soloSet)) continue;

        const m = (mix && mix[def.key]) || {};
        const outVol = Math.max(0, Math.min(100, Math.round((m.volume != null ? m.volume : def.vol / 100) * 100)));
        const outPan = Math.max(-100, Math.min(100, (m.pan != null ? m.pan : def.pan) | 0));
        const recipe = recipeFor(genreId, def.role);

        xml += `      <track name="${def.name}" type="0" muted="0" solo="0">\n`;
        xml += `        <instrumenttrack pan="${outPan}" vol="${outVol}" pitch="0" basenote="57" fxch="0">\n`;
        xml += triOscXml(recipe, '          ');
        xml += `        </instrumenttrack>\n`;

        // Pattern
        xml += `        <pattern pos="0" steps="16" name="${def.name} Clip" muted="0" type="1">\n`;

        for (const note of track.notes) {
          const posTicks = Math.round(note.step * ticksPerStep) + Exporter._swingTicks(note.step, swing, ticksPerStep);
          const lenTicks = Math.max(ticksPerStep, Math.round(note.duration * ticksPerStep));
          const key = note.midi;
          const vol = Math.min(100, Math.round((note.velocity || 90) * (100 / 127)));
          const pan = note.pan || 0;

          xml += `          <note pos="${posTicks}" len="${lenTicks}" key="${key}" vol="${vol}" pan="${pan}"/>\n`;
        }

        xml += `        </pattern>\n`;
        xml += `      </track>\n`;
      }

      xml += `    </trackcontainer>\n`;
      xml += `  </song>\n`;
      xml += `</lmms-project>\n`;

      return xml;
    }

    /**
     * Generate LMMS Clip XML for Clipboard Injection (Ctrl+V into running LMMS)
     */
    static generateLmmsClipboardClip(songData, mix = null) {
      const { tracks } = songData;
      const ticksPerStep = 12;
      const soloSet = mixSoloSet(mix);
      let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
      xml += `<lmms-clipboard type="trackclip">\n`;

      for (const [key, track] of Object.entries(tracks)) {
        if (!track || !track.notes) continue;
        if (!mixAudible(mix, key, soloSet)) continue;
        xml += `  <track name="${track.name}" type="0">\n`;
        xml += `    <pattern pos="0" steps="16" name="${track.name}">\n`;
        for (const note of track.notes) {
          const posTicks = Math.round(note.step * ticksPerStep);
          const lenTicks = Math.max(ticksPerStep, Math.round(note.duration * ticksPerStep));
          const vol = Math.min(100, Math.round((note.velocity || 90) * (100 / 127)));
          xml += `      <note pos="${posTicks}" len="${lenTicks}" key="${note.midi}" vol="${vol}" pan="${note.pan || 0}"/>\n`;
        }
        xml += `    </pattern>\n`;
        xml += `  </track>\n`;
      }

      xml += `</lmms-clipboard>\n`;
      return xml;
    }

    /**
     * Generate Binary Standard MIDI File (Type 1, Multi-Track, PPQ=480) with Lyric Meta Events
     * Returns Uint8Array
     */
    static generateMidiFile(songData, mix = null, swing = 0) {
      const { metadata, tracks } = songData;
      const bpm = metadata.bpm || 140;
      const ppq = 480;
      const ticksPerStep = ppq / 4; // 120 ticks per 16th note step
      const soloSet = mixSoloSet(mix);

      const trackKeys = ['lead', 'chords', 'arp', 'bass', 'drums'];
      const trackChunks = [];

      const channelMap = {
        lead: 0,
        chords: 1,
        arp: 2,
        bass: 3,
        drums: 9
      };

      const programMap = {
        lead: 80,    // Lead 1 (Square) or Synth Lead
        chords: 89,  // Pad 2 (Warm)
        arp: 81,     // Lead 2 (Sawtooth)
        bass: 38,    // Synth Bass 1
        drums: 0
      };

      // 1. Conductor Track (Tempo, Time Signature & Song Title)
      const tempoTrackEvents = [];
      const mpqn = Math.round(60000000 / bpm);
      tempoTrackEvents.push({
        time: 0,
        data: [0xFF, 0x51, 0x03, (mpqn >> 16) & 0xFF, (mpqn >> 8) & 0xFF, mpqn & 0xFF]
      });

      // Time Signature Meta Event
      const ts = metadata.timeSignature || '4/4';
      let tsNum = 4;
      let tsDenomExp = 2; // 2^2 = 4
      if (ts === '7/8') { tsNum = 7; tsDenomExp = 3; } // 2^3 = 8
      else if (ts === '6/8') { tsNum = 6; tsDenomExp = 3; }
      else if (ts === '5/8') { tsNum = 5; tsDenomExp = 3; }

      tempoTrackEvents.push({
        time: 0,
        data: [0xFF, 0x58, 0x04, tsNum, tsDenomExp, 0x18, 0x08]
      });

      const titleBytes = Exporter._strToBytes(metadata.title || 'RMG Music');
      tempoTrackEvents.push({
        time: 0,
        data: [0xFF, 0x03, titleBytes.length, ...titleBytes]
      });
      tempoTrackEvents.push({ time: 0, data: [0xFF, 0x2F, 0x00] });

      trackChunks.push(Exporter._buildTrackChunk(tempoTrackEvents));

      // 2. Note Tracks
      for (const trackKey of trackKeys) {
        const track = tracks[trackKey];
        if (!track || !track.notes) continue;
        if (!mixAudible(mix, trackKey, soloSet)) continue;

        const ch = channelMap[trackKey];
        const prog = programMap[trackKey];
        const rawEvents = [];

        // Track Name
        const nameBytes = Exporter._strToBytes(track.name);
        rawEvents.push({ time: 0, priority: 0, data: [0xFF, 0x03, nameBytes.length, ...nameBytes] });

        // Program Change (Instrument) except drum channel
        if (ch !== 9) {
          rawEvents.push({ time: 0, priority: 0, data: [0xC0 | ch, prog] });
        }

        // Convert note steps to Note On & Off events
        for (const note of track.notes) {
          const sw = Exporter._swingTicks(note.step, swing, ticksPerStep);
          const startTick = Math.round(note.step * ticksPerStep) + sw;
          const endTick = Math.round((note.step + Math.max(1, note.duration)) * ticksPerStep) + sw;
          const key = Math.max(0, Math.min(127, note.midi));
          const vel = Math.max(1, Math.min(127, note.velocity || 90));

          // Lyric Meta Event on Lead Track
          if (trackKey === 'lead' && note.lyric) {
            const lyricBytes = Exporter._strToBytes(note.lyric);
            rawEvents.push({
              time: startTick,
              priority: 0,
              data: [0xFF, 0x05, lyricBytes.length, ...lyricBytes]
            });
          }

          rawEvents.push({
            time: startTick,
            priority: 2,
            data: [0x90 | ch, key, vel]
          });

          rawEvents.push({
            time: endTick,
            priority: 1,
            data: [0x80 | ch, key, 0]
          });
        }

        // Sort events by time ascending, then priority
        rawEvents.sort((a, b) => a.time !== b.time ? a.time - b.time : b.priority - a.priority);

        // End of Track
        const lastTick = rawEvents.length > 0 ? rawEvents[rawEvents.length - 1].time : 0;
        rawEvents.push({ time: lastTick + 480, priority: 0, data: [0xFF, 0x2F, 0x00] });

        trackChunks.push(Exporter._buildTrackChunk(rawEvents));
      }

      // Build Header Chunk: 'MThd', length=6, format=1 (multi-track), numTracks, ppq=480
      const numTracks = trackChunks.length;
      const headerChunk = [
        0x4D, 0x54, 0x68, 0x64, // 'MThd'
        0x00, 0x00, 0x00, 0x06, // Length = 6
        0x00, 0x01,             // Format = 1
        (numTracks >> 8) & 0xFF, numTracks & 0xFF,
        (ppq >> 8) & 0xFF, ppq & 0xFF
      ];

      // Assemble all chunks into single Uint8Array
      let totalLength = headerChunk.length;
      for (const chunk of trackChunks) {
        totalLength += chunk.length;
      }

      const midiBytes = new Uint8Array(totalLength);
      midiBytes.set(headerChunk, 0);

      let offset = headerChunk.length;
      for (const chunk of trackChunks) {
        midiBytes.set(chunk, offset);
        offset += chunk.length;
      }

      return midiBytes;
    }

    /**
     * Build MTrk chunk with delta-time compression
     */
    static _buildTrackChunk(events) {
      const trackData = [];
      let lastTime = 0;

      for (const evt of events) {
        const delta = Math.max(0, evt.time - lastTime);
        lastTime = evt.time;

        const deltaVarLen = Exporter._encodeVarLen(delta);
        trackData.push(...deltaVarLen);
        trackData.push(...evt.data);
      }

      const length = trackData.length;
      const chunkHeader = [
        0x4D, 0x54, 0x72, 0x6B, // 'MTrk'
        (length >> 24) & 0xFF,
        (length >> 16) & 0xFF,
        (length >> 8) & 0xFF,
        length & 0xFF
      ];

      return new Uint8Array([...chunkHeader, ...trackData]);
    }

    /**
     * Encode variable-length quantity for MIDI delta times
     */
    static _encodeVarLen(val) {
      let buffer = val & 0x7F;
      const bytes = [];

      while ((val >>= 7) > 0) {
        buffer <<= 8;
        buffer |= ((val & 0x7F) | 0x80);
      }

      while (true) {
        bytes.push(buffer & 0xFF);
        if (buffer & 0x80) {
          buffer >>= 8;
        } else {
          break;
        }
      }

      return bytes;
    }

    /**
     * Encode AudioBuffer (Web Audio) thanh file WAV 16-bit PCM.
     * audioBuffer: { sampleRate, numberOfChannels, length, getChannelData(i) }
     */
    static encodeWavFile(audioBuffer) {
      const sr = audioBuffer.sampleRate || 44100;
      const nCh = Math.min(2, audioBuffer.numberOfChannels || 1);
      const len = audioBuffer.length || 0;
      const chans = [];
      for (let c = 0; c < nCh; c++) {
        chans.push(audioBuffer.getChannelData(c));
      }
      // Mono -> duplicate lenh trai/phai
      if (nCh === 1) chans.push(chans[0]);

      const dataBytes = len * 2 * 2;
      const buf = new ArrayBuffer(44 + dataBytes);
      const v = new DataView(buf);
      const wstr = (off, s) => { for (let i = 0; i < s.length; i++) v.setUint8(off + i, s.charCodeAt(i)); };
      wstr(0, 'RIFF');
      v.setUint32(4, 36 + dataBytes, true);
      wstr(8, 'WAVE');
      wstr(12, 'fmt ');
      v.setUint32(16, 16, true);
      v.setUint16(20, 1, true);
      v.setUint16(22, 2, true);
      v.setUint32(24, sr, true);
      v.setUint32(28, sr * 2 * 2, true);
      v.setUint16(32, 2 * 2, true);
      v.setUint16(34, 16, true);
      wstr(36, 'data');
      v.setUint32(40, dataBytes, true);
      let off = 44;
      for (let i = 0; i < len; i++) {
        for (let c = 0; c < 2; c++) {
          const s = Math.max(-1, Math.min(1, chans[c][i] || 0));
          v.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
          off += 2;
        }
      }
      return new Uint8Array(buf);
    }

    /**
     * Swing offset (ticks) cho step: tre offbeat 8th (step%4==2).
     */
    static _swingTicks(step, swingPct, ticksPerStep) {
      if (!swingPct || (step % 4) !== 2) return 0;
      return Math.round((swingPct / 100) * ticksPerStep * 2);
    }

    static _strToBytes(str) {
      const bytes = [];
      for (let i = 0; i < str.length; i++) {
        bytes.push(str.charCodeAt(i) & 0xFF);
      }
      return bytes;
    }
  }

  exports.RMGExporter = {
    Exporter
  };

})(typeof window !== 'undefined' ? window : module.exports);
