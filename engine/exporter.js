

(function(exports) {
  'use strict';

  const ROLE_EXPORT = {
    lead:   { role: 'lead', name: 'RinTune Lead', pan: 0, vol: 100, color: '#00f2fe' },
    stab:   { role: 'lead', name: 'RinTune Stab', pan: 10, vol: 95, color: '#ff6b81' },
    chords: { role: 'pad', name: 'RinTune Chords', pan: -15, vol: 80, color: '#9b51e0' },
    pad:    { role: 'pad', name: 'RinTune Pad', pan: -10, vol: 75, color: '#a29bfe' },
    arp:    { role: 'arp', name: 'RinTune Arp', pan: 15, vol: 85, color: '#4facfe' },
    bass:   { role: 'bass', name: 'RinTune Bass', pan: 0, vol: 95, color: '#f39c12' },
    drums:  { role: 'drums', name: 'RinTune Drums', pan: 0, vol: 100, color: '#e74c3c' },
    perc:   { role: 'drums', name: 'RinTune Perc', pan: -12, vol: 85, color: '#fdcb6e' }
  };

  function roleOfExportKey(key) {
    return String(key || '').replace(/[0-9]+$/, '');
  }

  const ROLE_DEFAULTS = {
    lead:   { osc: [{ wave: 2, vol: 100 }, { wave: 2, vol: 80, fine: 7, pan: -10 }, { wave: 0, vol: 60, coarse: -12, pan: 10 }] },
    stab:   { osc: [{ wave: 2, vol: 100 }, { wave: 2, vol: 85, fine: 8, pan: 10 }, { wave: 0, vol: 55, coarse: -12, pan: -10 }] },
    pad:    { osc: [{ wave: 2, vol: 70 }, { wave: 2, vol: 70, fine: -6, pan: -12 }, { wave: 0, vol: 55, pan: 12 }] },
    arp:    { osc: [{ wave: 3, vol: 85 }, { wave: 3, vol: 60, fine: 5, pan: -8 }, { wave: 0, vol: 50, pan: 8 }] },
    bass:   { osc: [{ wave: 0, vol: 100, coarse: -12 }, { wave: 1, vol: 70 }, { wave: 3, vol: 40, coarse: -12, pan: 0 }] },
    drums:  { osc: [{ wave: 6, vol: 90 }, { wave: 0, vol: 80, coarse: -24 }, { wave: 3, vol: 30, coarse: -12 }] },
    perc:   { osc: [{ wave: 6, vol: 80 }, { wave: 0, vol: 70, coarse: -24 }, { wave: 3, vol: 25, coarse: -12 }] }
  };

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

  const GM_PROGRAMS = {
    grand_piano_lead: [0, 0], mellow_epiano: [0, 4], fusion_bright_grand: [0, 1],
    chiptune_fm_epiano: [0, 5], sparkle_arp: [0, 46], anime_bell_lead: [0, 9],
    pipe_organ_lead: [0, 19], orchestral_strings: [0, 48], zun_trumpet: [0, 56],
    synth_saw_lead: [0, 81], square_8bit: [0, 80], distorted_lead: [0, 29],
    sub_saw_bass: [0, 38], analog_pad: [0, 89], standard_kit: [128, 0]
  };

  function gmFor(instrument, isDrums) {
    if (isDrums) return { bank: 128, patch: 0 };
    const p = GM_PROGRAMS[instrument];
    if (p) return { bank: p[0], patch: p[1] };
    return { bank: 0, patch: 81 }; // saw lead fallback
  }

  function xmlEscape(s) {    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function sf2InstrumentXml(src, bank, patch, isDrums, indent) {    const pad = indent || '          ';
    const verb = isDrums ? ' reverbOn="0"' : ' reverbOn="1"';
    return `${pad}<instrument name="sf2player">\n` +
      `${pad}  <sf2player src="${xmlEscape(src)}" bank="${bank}" patch="${patch}" gain="1"${verb}/>\n` +
      `${pad}</instrument>\n`;
  }

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

  function mixSoloSet(mix) {    if (!mix) return null;
    const soloed = Object.keys(mix).filter(k => mix[k] && mix[k].solo);
    return soloed.length ? soloed : null;
  }

  function mixAudible(mix, key, soloSet) {
    if (!mix || !mix[key]) return true;
    if (soloSet) return soloSet.includes(key);
    return !mix[key].muted;
  }

  function normOpts(opts) {
    const o = opts || {};
    return {
      master: (o.master != null ? o.master : 1),
      vel: (o.vel != null ? o.vel : 1),
      trimOverlap: !!o.trimOverlap,
      cc: o.cc !== false,
      levels: (o.levels && typeof o.levels === 'object') ? o.levels : {}
    };
  }

  function levelOf(opts, key) {
    const v = opts.levels[key];
    return (v == null ? 1 : v);
  }

  function trimNotes(notes) {
    const out = notes.map(n => Object.assign({}, n)).sort((a, b) => a.step - b.step);
    const q = (s) => Math.round(s * 4) / 4;
    const lastIdx = {};
    const deduped = [];
    for (const n of out) {
      const k = q(n.step) + '|' + n.midi;
      if (k in lastIdx) {
        const prev = deduped[lastIdx[k]];
        prev.velocity = Math.max(prev.velocity || 0, n.velocity || 0);
        prev.duration = Math.max(prev.duration || 0, n.duration || 0);
        continue;
      }
      lastIdx[k] = deduped.length;
      deduped.push(n);
    }
    const lastNote = {};
    for (const n of deduped) {
      const k = n.midi;
      const prev = lastNote[k];
      if (prev && n.step > prev.step && n.step < prev.step + Math.max(0.5, prev.duration || 1)) {
        prev.duration = Math.max(0.5, n.step - prev.step);
      }
      lastNote[k] = n;
    }
    return deduped;
  }

  class Exporter {

    static generateLmmsProject(songData, mix = null, swing = 0, soundfont = null, opts = null) {
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
      xml += `<lmms-project version="1.0" creator="RinTune Studio by Rin0suke257" creatorversion="1.2.2" type="song">\n`;
      xml += `  <head timesig_numerator="${tsNum}" timesig_denominator="${tsDen}" bpm="${bpm}" mastervol="100" masterpitch="0"/>\n`;
      xml += `  <song>\n`;
      xml += `    <trackcontainer width="600" height="300" x="5" y="5" visible="1" minimized="0" type="song">\n`;

      const trackDefs = Object.keys(tracks).map(k => {
        const base = ROLE_EXPORT[roleOfExportKey(k)] || ROLE_EXPORT.lead;
        const t = tracks[k] || {};
        return {
          key: k, role: base.role,
          name: t.name || (k === roleOfExportKey(k) ? base.name : base.name + ' ' + k.replace(roleOfExportKey(k), '')),
          pan: base.pan, vol: base.vol, color: t.color || base.color
        };
      });
      const ox = normOpts(opts);

      for (const def of trackDefs) {
        const track = tracks[def.key];
        if (!track) continue;
        if (!mixAudible(mix, def.key, soloSet)) continue;
        const lvl = levelOf(ox, def.key);
        if (lvl <= 0) continue;

        const m = (mix && mix[def.key]) || {};
        const outVol = Math.max(0, Math.min(100, Math.round((m.volume != null ? m.volume : def.vol / 100) * 100 * ox.master * lvl)));
        const outPan = Math.max(-100, Math.min(100, (m.pan != null ? m.pan : def.pan) | 0));
        const recipe = recipeFor(genreId, def.role);

        xml += `      <track name="${def.name}" type="0" muted="0" solo="0">\n`;
        xml += `        <instrumenttrack pan="${outPan}" vol="${outVol}" pitch="0" basenote="57" fxch="0">\n`;
        if (soundfont) {
          const isDr = (def.role === 'drums');
          const gp = gmFor(track.instrument, isDr);
          xml += sf2InstrumentXml(soundfont, gp.bank, gp.patch, isDr, '          ');
        } else {
          xml += triOscXml(recipe, '          ');
        }
        xml += `        </instrumenttrack>\n`;

        const clips = Array.isArray(songData.clips) && songData.clips.length ? songData.clips : null;
        const spb = metadata.stepsPerBar || 16;
        const finalStart = Math.max(0, ((metadata.lengthBars || 8) - 1)) * spb;
        if (clips) {
          let emitted = 0;
          let startBar = 0;
          for (const c of clips) {
            const clipBars = Math.max(1, c.lengthBars | 0 || 1);
            let cNotes = (c.notes && c.notes[def.key]) || [];
            if (c.muted || c.rest) {
              cNotes = [];
            } else if (c.tracks && c.tracks[def.key] === false) {
              const base = startBar * spb;
              cNotes = cNotes.filter(n => (n.step + base) >= finalStart);
            }
            if (cNotes.length > 0) {
              const posBase = startBar * (metadata.stepsPerBar || 16) * ticksPerStep;
              xml += `        <pattern pos="${posBase}" steps="${clipBars * (metadata.stepsPerBar || 16)}" name="${def.name} - ${String(c.name || 'Part').replace(/"/g, '')}" muted="0" type="1">\n`;
              const list = ox.trimOverlap ? trimNotes(cNotes) : cNotes;
              for (const note of list) {
                const posTicks = Math.round(note.step * ticksPerStep) + Exporter._swingTicks(note.step, swing, ticksPerStep);
                const lenTicks = Math.max(ticksPerStep, Math.round(note.duration * ticksPerStep));
                const key = note.midi;
                const vol = Math.min(100, Math.round((note.velocity || 90) * (100 / 127) * ox.vel));
                const pan = note.pan || 0;
                xml += `          <note pos="${posTicks}" len="${lenTicks}" key="${key}" vol="${vol}" pan="${pan}"/>\n`;
              }
              xml += `        </pattern>\n`;
              emitted++;
            }
            startBar += clipBars;
          }
          if (!emitted) {
            xml += `        <pattern pos="0" steps="16" name="${def.name} Clip" muted="0" type="1">\n`;
            xml += `        </pattern>\n`;
          }
        } else {
          xml += `        <pattern pos="0" steps="16" name="${def.name} Clip" muted="0" type="1">\n`;

          const list = ox.trimOverlap ? trimNotes(track.notes) : track.notes;
          for (const note of list) {
            const posTicks = Math.round(note.step * ticksPerStep) + Exporter._swingTicks(note.step, swing, ticksPerStep);
            const lenTicks = Math.max(ticksPerStep, Math.round(note.duration * ticksPerStep));
            const key = note.midi;
            const vol = Math.min(100, Math.round((note.velocity || 90) * (100 / 127) * ox.vel));
            const pan = note.pan || 0;

            xml += `          <note pos="${posTicks}" len="${lenTicks}" key="${key}" vol="${vol}" pan="${pan}"/>\n`;
          }

          xml += `        </pattern>\n`;
        }
        xml += `      </track>\n`;
      }

      xml += `    </trackcontainer>\n`;
      xml += `  </song>\n`;
      xml += `</lmms-project>\n`;

      return xml;
    }


    static generateLmmsClipboardClip(songData, mix = null, opts = null) {
      const { tracks } = songData;
      const ox = normOpts(opts);
      const ticksPerStep = 12;
      const soloSet = mixSoloSet(mix);
      let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
      xml += `<lmms-clipboard type="trackclip">\n`;

      for (const [key, track] of Object.entries(tracks)) {
        if (!track || !track.notes) continue;
        if (!mixAudible(mix, key, soloSet)) continue;
        if (levelOf(ox, key) <= 0) continue;
        xml += `  <track name="${track.name}" type="0">\n`;
        xml += `    <pattern pos="0" steps="16" name="${track.name}">\n`;
        const list = ox.trimOverlap ? trimNotes(track.notes) : track.notes;
        for (const note of list) {
          const posTicks = Math.round(note.step * ticksPerStep);
          const lenTicks = Math.max(ticksPerStep, Math.round(note.duration * ticksPerStep));
          const vol = Math.min(100, Math.round((note.velocity || 90) * (100 / 127) * ox.vel * levelOf(ox, key)));
          xml += `      <note pos="${posTicks}" len="${lenTicks}" key="${note.midi}" vol="${vol}" pan="${note.pan || 0}"/>\n`;
        }
        xml += `    </pattern>\n`;
        xml += `  </track>\n`;
      }

      xml += `</lmms-clipboard>\n`;
      return xml;
    }


    static generateLmmsMidiClip(songData, trackKey, opts = null) {
      const ox = normOpts(opts);
      const ticksPerStep = 12;
      const track = songData.tracks ? songData.tracks[trackKey] : null;
      const lvl = levelOf(ox, trackKey);
      const notes = (track && track.notes ? (ox.trimOverlap ? trimNotes(track.notes) : track.notes.slice()) : []).sort((a, b) => a.step - b.step);
      const spb = (songData.metadata && songData.metadata.stepsPerBar) || 16;
      const bars = (songData.metadata && songData.metadata.lengthBars) || 8;
      const totalSteps = bars * spb;
      const safeName = String((track && track.name) || trackKey).replace(/[<>&"]/g, '');
      let xml = `<midiclip type="1" name="RinTune ${safeName}" autoresize="1" off="0" muted="0" steps="${totalSteps}" len="${totalSteps * ticksPerStep}" pos="-1">\n`;
      for (const note of notes) {
        const posTicks = Math.round(note.step * ticksPerStep);
        const lenTicks = Math.max(ticksPerStep, Math.round(note.duration * ticksPerStep));
        const vol = Math.max(1, Math.min(100, Math.round((note.velocity || 90) * (100 / 127) * ox.vel * lvl)));
        const key = Math.max(0, Math.min(127, note.midi));
        xml += `  <note key="${key}" vol="${vol}" pan="${note.pan || 0}" len="${lenTicks}" pos="${posTicks}" type="0"/>\n`;
      }
      xml += `</midiclip>`;
      return { xml, count: notes.length };
    }


    static generateMidiFile(songData, mix = null, swing = 0, opts = null) {
      const { metadata, tracks } = songData;
      const ox = normOpts(opts);
      const bpm = metadata.bpm || 140;
      const ppq = 480;
      const ticksPerStep = ppq / 4; // 120 ticks per 16th note step
      const soloSet = mixSoloSet(mix);

      const trackKeys = Object.keys(tracks);
      const trackChunks = [];

      const ROLE_CHANNEL = { lead: 0, stab: 4, chords: 1, pad: 5, arp: 2, bass: 3, drums: 9, perc: 10 };
      const ROLE_PROGRAM = { lead: 80, stab: 81, chords: 89, pad: 89, arp: 81, bass: 38, drums: 0, perc: 0 };
      const usedChannels = new Set();
      const channelMap = {};
      const programMap = {};
      for (const k of trackKeys) {
        const role = roleOfExportKey(k);
        let ch = ROLE_CHANNEL[role] != null ? ROLE_CHANNEL[role] : -1;
        if (ch < 0 || (usedChannels.has(ch) && role !== 'drums' && role !== 'perc')) {
          ch = [0, 1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 12, 13, 14, 15].find(c => !usedChannels.has(c));
          if (ch == null) ch = 0;
        }
        usedChannels.add(ch);
        channelMap[k] = ch;
        programMap[k] = ROLE_PROGRAM[role] != null ? ROLE_PROGRAM[role] : 80;
      }

      const tempoTrackEvents = [];
      const mpqn = Math.round(60000000 / bpm);
      tempoTrackEvents.push({
        time: 0,
        data: [0xFF, 0x51, 0x03, (mpqn >> 16) & 0xFF, (mpqn >> 8) & 0xFF, mpqn & 0xFF]
      });

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

      const titleBytes = Exporter._strToBytes(metadata.title || 'RinTune Music');
      tempoTrackEvents.push({
        time: 0,
        data: [0xFF, 0x03, titleBytes.length, ...titleBytes]
      });
      tempoTrackEvents.push({ time: 0, data: [0xFF, 0x2F, 0x00] });

      trackChunks.push(Exporter._buildTrackChunk(tempoTrackEvents));

      for (const trackKey of trackKeys) {
        const track = tracks[trackKey];
        if (!track || !track.notes) continue;
        if (!mixAudible(mix, trackKey, soloSet)) continue;
        if (levelOf(ox, trackKey) <= 0) continue;

        const ch = channelMap[trackKey];
        const prog = programMap[trackKey];
        const rawEvents = [];
        const lvl = levelOf(ox, trackKey);

        const nameBytes = Exporter._strToBytes(track.name);
        rawEvents.push({ time: 0, priority: 0, data: [0xFF, 0x03, nameBytes.length, ...nameBytes] });

        if (ch !== 9) {
          rawEvents.push({ time: 0, priority: 0, data: [0xC0 | ch, prog] });
        }

        const trackPan = Math.max(0, Math.min(127, Math.round(64 + ((track.notes[0] && track.notes[0].pan) || 0) * 0.64)));
        if (ox.cc) rawEvents.push({ time: 0, priority: 3, data: [0xB0 | ch, 10, trackPan] });
        const zones = (metadata.sectionMap && metadata.sectionMap.length)
          ? metadata.sectionMap
          : [{ name: 'verse', from: 0, bars: metadata.lengthBars || 8, energy: 0.8 }];
        const spb = metadata.stepsPerBar || 16;
        const ccScale = Math.max(0.2, Math.min(1.3, ox.master * lvl));
        for (const z of zones) {
          const zt = (z.from || 0) * spb * ticksPerStep;
          const vol = Math.max(0, Math.min(127, Math.round(70 + (z.energy != null ? z.energy : 0.8) * 57) * ccScale));
          if (ox.cc) rawEvents.push({ time: zt, priority: 3, data: [0xB0 | ch, 7, vol] });
        }
        if (metadata.fadeInBars > 0 && ox.cc) {
          const fz = zones[0] || { energy: 0.8 };
          const v0 = Math.max(0, Math.min(127, Math.round(70 + (fz.energy != null ? fz.energy : 0.8) * 57) * ccScale));
          rawEvents.push({ time: 0, priority: 3, data: [0xB0 | ch, 7, 40] });
          rawEvents.push({ time: Math.round(metadata.fadeInBars * spb * ticksPerStep / 2), priority: 3, data: [0xB0 | ch, 7, Math.round((40 + v0) / 2)] });
        }
        if (metadata.fadeOutBars > 0 && ox.cc) {
          const totalSteps = (metadata.lengthBars || 8) * spb;
          const fStart = Math.max(0, totalSteps - metadata.fadeOutBars * spb) * ticksPerStep;
          rawEvents.push({ time: Math.round(fStart), priority: 3, data: [0xB0 | ch, 7, 80] });
          rawEvents.push({ time: Math.round(totalSteps * ticksPerStep), priority: 3, data: [0xB0 | ch, 7, 30] });
        }

        const list = ox.trimOverlap ? trimNotes(track.notes) : track.notes;
        for (const note of list) {
          const sw = Exporter._swingTicks(note.step, swing, ticksPerStep);
          const startTick = Math.round(note.step * ticksPerStep) + sw;
          const endTick = Math.round((note.step + Math.max(1, note.duration)) * ticksPerStep) + sw;
          const key = Math.max(0, Math.min(127, note.midi));
          const vel = Math.max(1, Math.min(127, Math.round((note.velocity || 90) * ox.vel * lvl)));

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

        rawEvents.sort((a, b) => a.time !== b.time ? a.time - b.time : b.priority - a.priority);

        const lastTick = rawEvents.length > 0 ? rawEvents[rawEvents.length - 1].time : 0;
        rawEvents.push({ time: lastTick + 480, priority: 0, data: [0xFF, 0x2F, 0x00] });

        trackChunks.push(Exporter._buildTrackChunk(rawEvents));
      }

      const numTracks = trackChunks.length;
      const headerChunk = [
        0x4D, 0x54, 0x68, 0x64, // 'MThd'
        0x00, 0x00, 0x00, 0x06, // Length = 6
        0x00, 0x01,             // Format = 1
        (numTracks >> 8) & 0xFF, numTracks & 0xFF,
        (ppq >> 8) & 0xFF, ppq & 0xFF
      ];

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


    static encodeWavFile(audioBuffer) {
      const sr = audioBuffer.sampleRate || 44100;
      const nCh = Math.min(2, audioBuffer.numberOfChannels || 1);
      const len = audioBuffer.length || 0;
      const chans = [];
      for (let c = 0; c < nCh; c++) {
        chans.push(audioBuffer.getChannelData(c));
      }
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
