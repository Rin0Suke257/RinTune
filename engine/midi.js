

(function(exports) {
  'use strict';

  function readVLQ(bytes, pos) {
    let val = 0;
    let b = 0;
    do {
      if (pos >= bytes.length) throw new Error('Loi file MIDI: het du lieu giua chừng (VLQ)');
      b = bytes[pos++];
      val = (val << 7) | (b & 0x7F);
    } while (b & 0x80);
    return { value: val, pos };
  }

  function readU16(bytes, pos) {
    return (bytes[pos] << 8) | bytes[pos + 1];
  }

  function readU32(bytes, pos) {
    return ((bytes[pos] << 24) >>> 0) + (bytes[pos + 1] << 16) + (bytes[pos + 2] << 8) + bytes[pos + 3];
  }

  function bytesToAscii(bytes, pos, len) {
    let s = '';
    for (let i = 0; i < len; i++) {
      const c = bytes[pos + i];
      if (c >= 32 && c < 127) s += String.fromCharCode(c);
    }
    return s;
  }


  function parseTrack(bytes, start, len) {
    const end = start + len;
    let pos = start;
    let tick = 0;
    let running = 0;
    const notes = [];
    const open = {}; // key: channel*128+midi -> stack of {tick, vel}
    let name = '';
    let tempoMpqn = 0;
    let timeSig = null;
    let keySig = null;
    const programs = {};
    const lyrics = []; // [{tick, text}] (meta 0x05 + 0x01 karaoke blocks)

    while (pos < end) {
      const dl = readVLQ(bytes, pos);
      tick += dl.value;
      pos = dl.pos;
      if (pos >= end) break;

      let status = bytes[pos];
      if (status < 0x80) {
        if (!running) throw new Error('Loi file MIDI: running status khong hop le');
        status = running; // khong tien pos (byte nay la data)
      } else {
        pos++;
        if (status !== 0xFF && status !== 0xF0 && status !== 0xF7) running = status;
      }

      const hi = status & 0xF0;
      const ch = status & 0x0F;

      if (status === 0xFF) {
        const mtype = bytes[pos++];
        const ll = readVLQ(bytes, pos);
        pos = ll.pos;
        if (mtype === 0x03 && !name) name = bytesToAscii(bytes, pos, ll.value);
        else if (mtype === 0x05 || mtype === 0x01) {
          const tx = bytesToAscii(bytes, pos, ll.value).trim();
          if (tx) lyrics.push({ tick, text: tx.slice(0, 64) });
        } else if (mtype === 0x51 && ll.value === 3 && !tempoMpqn) {
          tempoMpqn = (bytes[pos] << 16) | (bytes[pos + 1] << 8) | bytes[pos + 2];
        } else if (mtype === 0x58 && ll.value === 4 && !timeSig) {
          timeSig = { num: bytes[pos], denom: Math.pow(2, bytes[pos + 1]) };
        } else if (mtype === 0x59 && ll.value === 2 && !keySig) {
          const sf = bytes[pos] > 127 ? bytes[pos] - 256 : bytes[pos];
          keySig = { sf, mi: bytes[pos + 1] };
        }
        pos += ll.value;
      } else if (status === 0xF0 || status === 0xF7) {
        const ll = readVLQ(bytes, pos);
        pos = ll.pos + ll.value;
      } else if (hi === 0x80 || hi === 0x90) {
        const key = bytes[pos++];
        const vel = bytes[pos++];
        const id = ch * 128 + key;
        if (hi === 0x90 && vel > 0) {
          if (!open[id]) open[id] = [];
          open[id].push({ tick, vel });
        } else {
          const stack = open[id];
          if (stack && stack.length) {
            const on = stack.pop();
            notes.push({ midi: key, channel: ch, startTick: on.tick, durTicks: Math.max(1, tick - on.tick), velocity: on.vel });
          }
        }
      } else if (hi === 0xA0 || hi === 0xB0 || hi === 0xE0) {
        pos += 2; // aftertouch / control / pitch bend: bo qua
      } else if (hi === 0xC0 || hi === 0xD0) {
        if (programs[ch] === undefined) programs[ch] = bytes[pos];
        pos += 1;
      } else {
        throw new Error('Loi file MIDI: status byte la ' + status);
      }
    }

    for (const id of Object.keys(open)) {
      const stack = open[id];
      const ch = Math.floor(id / 128);
      const key = id % 128;
      while (stack && stack.length) {
        const on = stack.pop();
        notes.push({ midi: key, channel: ch, startTick: on.tick, durTicks: 480, velocity: on.vel });
      }
    }

    notes.sort((a, b) => a.startTick - b.startTick);
    return { name, notes, lyrics, tempoMpqn, timeSig, keySig, programs };
  }


  function parseMidiFile(input) {
    const bytes = (input instanceof Uint8Array) ? input : new Uint8Array(input);
    if (bytes.length < 14) throw new Error('File qua nho, khong phai MIDI');
    if (bytes[0] !== 0x4D || bytes[1] !== 0x54 || bytes[2] !== 0x68 || bytes[3] !== 0x64) {
      throw new Error('Khong phai file MIDI (thieu MThd)');
    }
    const headerLen = readU32(bytes, 4);
    const ntracks = readU16(bytes, 10);
    const division = readU16(bytes, 12);
    if (division & 0x8000) throw new Error('MIDI SMPTE time division chua ho tro');
    if (ntracks <= 0 || ntracks > 64) throw new Error('So track MIDI bat thuong: ' + ntracks);

    let pos = 8 + headerLen;
    const tracks = [];
    for (let i = 0; i < ntracks; i++) {
      if (pos + 8 > bytes.length) break;
      if (bytes[pos] !== 0x4D || bytes[pos + 1] !== 0x54 || bytes[pos + 2] !== 0x72 || bytes[pos + 3] !== 0x6B) break;
      const len = readU32(bytes, pos + 4);
      tracks.push(parseTrack(bytes, pos + 8, Math.min(len, bytes.length - pos - 8)));
      pos += 8 + len;
    }
    if (!tracks.length) throw new Error('Khong doc duoc track MIDI nao');

    let mpqn = 0;
    let timeSig = null;
    let keySig = null;
    for (const t of tracks) {
      if (!mpqn && t.tempoMpqn) mpqn = t.tempoMpqn;
      if (!timeSig && t.timeSig) timeSig = t.timeSig;
      if (!keySig && t.keySig) keySig = t.keySig;
      if (mpqn && timeSig && keySig) break;
    }
    return {
      ticksPerQuarter: division || 480,
      bpm: mpqn ? Math.round(60000000 / mpqn) : 120,
      timeSignature: timeSig ? (timeSig.num + '/' + timeSig.denom) : '4/4',
      keySig: keySig || null,
      tracks
    };
  }

  exports.RMGMidi = {
    parseMidiFile
  };

})(typeof window !== 'undefined' ? window : module.exports);
