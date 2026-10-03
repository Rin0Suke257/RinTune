

(function(exports) {
  'use strict';

  const Theory = (typeof window !== 'undefined' ? window.RMGTheory : require('./theory.js').RMGTheory);

  class RandomContext {
    constructor(seed = Math.random()) {
      this.seed = typeof seed === 'number' ? seed : this._hashString(String(seed));
    }

    _hashString(str) {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        hash = (hash << 5) - hash + str.charCodeAt(i);
        hash |= 0;
      }
      return (Math.abs(hash) % 1000000) / 1000000;
    }
    next() {
      this.seed = (this.seed * 9301 + 49297) % 233280;
      return this.seed / 233280;
    }

    range(min, max) {
      return min + this.next() * (max - min);
    }

    rangeInt(min, max) {
      return Math.floor(this.range(min, max + 1));
    }

    choice(arr) {
      if (!arr || arr.length === 0) return null;
      return arr[this.rangeInt(0, arr.length - 1)];
    }

    chance(probability) {
      return this.next() < probability;
    }
  }

  const PHRASE_RHYTHMS = {
    '1bar': [
      [4, 4, 4, 4],
      [6, 2, 4, 4],
      [4, 2, 2, 4, 4],
      [2, 2, 4, 2, 2, 4],
      [8, 4, 4],
      [4, 8, 4],
      [3, 1, 4, 3, 1, 4],
      [2, 2, 2, 2, 4, 4],
      [12, 4],
      [16]
    ],
    '2bars': [
      [6, 2, 4, 4, 8, 8],
      [4, 4, 4, 4, 6, 2, 8],
      [2, 2, 2, 2, 4, 4, 8, 4, 4],
      [4, 2, 2, 8, 4, 4, 8],
      [3, 1, 4, 3, 1, 4, 4, 4, 8],
      [8, 8, 4, 4, 8],
      [4, 4, 8, 4, 4, 8]
    ],
    '4bars': [
      [6, 2, 4, 4, 8, 8, 6, 2, 4, 4, 16],
      [4, 4, 4, 4, 6, 2, 8, 4, 2, 2, 4, 4, 16],
      [3, 1, 4, 3, 1, 4, 8, 8, 3, 1, 4, 3, 1, 4, 16]
    ]
  };

  class MusicGenerator {

    _vChance(base, V) {
      const v = (V == null ? 0.7 : V);
      return this.rng.chance(Math.max(0, Math.min(0.95, base * (v / 0.7))));
    }


    _variant(n, V) {
      const v = (V == null ? 0.7 : V);
      if (n <= 1 || v <= 0) return 0;
      if (this.rng.range(0, 1) > v) return 0;
      return this.rng.rangeInt(0, n - 1);
    }


    _resolveVariation(src) {
      const norm = (v) => {
        if (v == null || isNaN(v)) return 0.7;
        return Math.max(0, Math.min(1, v));
      };
      if (src == null) {
        const g = norm(this.options.variation);
        return { lead: g, chords: g, arp: g, bass: g, drums: g };
      }
      if (typeof src === 'number') {
        const g = norm(src);
        return { lead: g, chords: g, arp: g, bass: g, drums: g };
      }
      const g = (src.global != null) ? norm(src.global) : 1;
      const ch = (k) => (src[k] != null ? norm(src[k]) * g : 0.7 * g);
      return { lead: ch('lead'), chords: ch('chords'), arp: ch('arp'), bass: ch('bass'), drums: ch('drums') };
    }


    _varyArp(track, spb, V) {
      if (!track || !track.notes) return track;
      for (const n of track.notes) {
        const isDown = (n.step % spb) === 0;
        if (isDown) {
          if (n.midi - 12 >= 42 && this._vChance(0.30, V)) n.midi -= 12;
        } else {
          if (this._vChance(0.35, V)) {
            if (this.rng.chance(0.5) && n.midi + 12 <= 93) n.midi += 12;
            else if (n.midi - 12 >= 40) n.midi -= 12;
          } else if (this._vChance(0.12, V)) {
            n._dropMe = true;
          }
        }
      }
      if (track.notes.some(n => n._dropMe)) {
        track.notes = track.notes.filter(n => !n._dropMe);
      } else {
        for (const n of track.notes) delete n._dropMe;
      }
      return track;
    }


    _varyDrums(track, spb, V, startBar, endBar) {
      if (!track || !track.notes) return track;
      const at = (step, midi) => track.notes.some(n => n.step === step && n.midi === midi);
      const KICK = 36, SNARE = 38;
      for (let bar = startBar; bar <= endBar; bar++) {
        const bs = bar * spb;
        if (this._vChance(0.5, V)) {
          const cands = track.notes.filter(n => n.midi === KICK && n.step >= bs && n.step < bs + spb && (n.step % spb) !== 0);
          if (cands.length) {
            const victim = cands[this.rng.rangeInt(0, cands.length - 1)];
            track.notes.splice(track.notes.indexOf(victim), 1);
          }
        }
        if (this._vChance(0.4, V)) {
          const slots = [2, 6, 7, 10, 11, 14].filter(s => s < spb);
          const free = slots.filter(s => !at(bs + s, KICK) && !at(bs + s, SNARE));
          if (free.length) {
            const s = free[this.rng.rangeInt(0, free.length - 1)];
            track.notes.push({ step: bs + s, duration: 1, midi: KICK, velocity: 100, pan: 0 });
          }
        }
        if (this._vChance(0.5, V)) {
          const hats = track.notes.filter(n => (n.midi === 42 || n.midi === 46) && n.step >= bs && n.step < bs + spb && (n.step % spb) !== 0);
          if (hats.length) {
            const h = hats[this.rng.rangeInt(0, hats.length - 1)];
            const r = this.rng.range(0, 1);
            if (r < 0.45) h.midi = (h.midi === 42 ? 46 : 42); // doi mo/dong
            else track.notes.splice(track.notes.indexOf(h), 1); // rot 1 hat
          }
        }
        if (this._vChance(0.45, V)) {
          const ps = bs + spb - 2;
          if (!at(ps, 36) && !at(ps, 38)) {
            track.notes.push({ step: ps, duration: 1, midi: 36, velocity: 95, pan: 0 });
          }
        }
        if (this._vChance(0.35, V)) {
          const cands = track.notes.filter(n => n.midi === 36 && n.step >= bs && n.step < bs + spb && (n.step % spb) !== 0 && !at(n.step - 1, 36));
          if (cands.length) {
            cands[this.rng.rangeInt(0, cands.length - 1)].step -= 1;
          }
        }
      }
      track.notes.sort((a, b) => a.step - b.step);
      return track;
    }

    constructor(options = {}) {
      this.options = Object.assign({
        genre: 'touhou',
        key: 'A',
        scale: 'touhou_yonanuki',
        bpm: 165,
        lengthBars: 8,
        section: 'none',            // 'none', 'intro', 'verse', 'chorus', 'outro', 'merged'
        motifStructure: 'smart_adaptive', // 'smart_adaptive', '4bars_aabb', '8bars_abab', 'qa_question_answer', '4bars_abac', '2bars_abab', '2bars_aaba', '1bar_ostinato', 'none'
        articulation: 'auto',       // 'auto', 'legato', 'staccato', 'balanced', 'touhou_fast'
        climaxCurve: 'climax_explosion', // 'climax_explosion', 'crescendo', 'emotional_wave', 'full_fire'
        timeSignature: options.timeSignature || (Theory.GENRES[options.genre || 'touhou'] ? Theory.GENRES[options.genre || 'touhou'].defaultTimeSignature : '4/4') || '4/4',
        useContour: false,          // Interactive Melody Contour Envelope Enable flag
        contourPoints: null,        // Array of { x: 0..1, y: 0..1 }
        fadeInBars: 0,              // 0 to 8 bars
        fadeOutBars: 0,             // 0 to 8 bars
        trackTarget: 'all',         // 'all', 'lead', 'bass', 'chords', 'arp', 'drums'
        chaosLevel: 20,
        density: 75,
        humanize: true,
        seed: Math.random()
      }, options);

      this.options.lengthBars = Math.max(1, Math.min(256, parseInt(this.options.lengthBars, 10) || 8));
      this.options.bpm = Math.max(30, Math.min(350, parseInt(this.options.bpm, 10) || 165));
      this.options.fadeInBars = Math.max(0, Math.min(16, parseInt(this.options.fadeInBars, 10) || 0));
      this.options.fadeOutBars = Math.max(0, Math.min(16, parseInt(this.options.fadeOutBars, 10) || 0));

      this.rng = new RandomContext(this.options.seed);
    }

    _getStepsPerBar(timeSignature) {
      if (timeSignature === '7/8') return 14;
      if (timeSignature === '6/8') return 12;
      if (timeSignature === '5/8') return 10;
      return 16; // 4/4
    }

    _zoneAt(bar, zoneMap) {
      if (!zoneMap || !zoneMap.length) return { name: 'verse', from: 0, to: 1e9, energy: 0.8 };
      for (const z of zoneMap) {
        if (bar >= z.from && bar < z.from + z.bars) return z;
      }
      return zoneMap[zoneMap.length - 1];
    }

    _zoneMapFor(lengthBars, section, seed) {
      const one = (name, from, bars, energy) => ({ name, from, bars, energy });
      if (section && section !== 'none' && section !== 'merged') {
        const e = { intro: 0.55, verse: 0.8, chorus: 1.0, bridge: 0.85, outro: 0.6 }[section] || 0.8;
        return [one(section, 0, lengthBars, e)];
      }
      const N = Math.max(1, lengthBars | 0);
      if (N <= 2) return [one('verse', 0, N, 0.8)];
      if (N <= 4) return [one('intro', 0, 1, 0.55), one('verse', 1, N - 1, 0.8)];
      const intro = 2, outro = Math.min(2, Math.max(1, Math.floor(N * 0.15)));
      const mid = N - intro - outro;
      const peakBars = Math.max(1, Math.round(mid * 0.45));
      const wantBreak = mid >= 6 ? 2 : (mid >= 5 ? 1 : 0);
      const verseBars = Math.max(1, mid - peakBars - wantBreak);
      const breakBars = mid - verseBars - peakBars;
      const zones = [one('intro', 0, intro, 0.55)];
      let cur = intro;
      const v1 = Math.ceil(verseBars / 2);
      zones.push(one('verse', cur, v1, 0.8));
      cur += v1;
      if (breakBars > 0) {
        zones.push(one('break', cur, breakBars, 0.45));
        cur += breakBars;
      }
      if (verseBars - v1 > 0) {
        zones.push(one('verse', cur, verseBars - v1, 0.85));
        cur += verseBars - v1;
      }
      zones.push(one('chorus', cur, N - cur - outro, 1.0));
      cur = N - outro;
      zones.push(one('outro', cur, outro, 0.6));
      return zones.filter(z => z.bars > 0);
    }

    _gateP(zoneName, trackKey) {
      const G = {
        intro: { lead: 0.5, chords: 0.6, arp: 0, bass: 1, drums: 1 },
        verse: { lead: 1, chords: 1, arp: 0.7, bass: 1, drums: 1 },
        chorus: { lead: 1, chords: 1, arp: 1, bass: 1, drums: 1 },
        bridge: { lead: 1, chords: 0.8, arp: 0.5, bass: 1, drums: 1 },
        break: { lead: 1, chords: 0.6, arp: 0, bass: 0.4, drums: 0 },
        outro: { lead: 0.7, chords: 0.8, arp: 0, bass: 0.8, drums: 0.5 }
      };
      const z = G[zoneName] || G.verse;
      return (z[trackKey] == null ? 1 : z[trackKey]);
    }

    _gateOpen(zoneName, trackKey, seed) {
      const p = this._gateP(zoneName, trackKey);
      if (p >= 1) return true;
      if (p <= 0) return false;
      return this._hash01(String(seed) + '|' + zoneName + '|' + trackKey) < p;
    }

    _hash01(str) {
      let h = 2166136261;
      for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 16777619);
      }
      return (h >>> 0) / 4294967296;
    }

    _resolveZoneGates(zoneMap, seed) {
      for (const z of zoneMap) {
        z.tracks = {};
        for (const k of ['lead', 'chords', 'arp', 'bass', 'drums']) {
          z.tracks[k] = this._gateOpen(z.name, k, seed);
        }
      }
      return zoneMap;
    }

    _zoneVel(zoneName) {
      return { intro: 0.88, verse: 1.0, chorus: 1.08, bridge: 1.02, break: 0.8, outro: 0.92 }[zoneName] || 1;
    }

    _applyZoneVelocity(tracks, zoneMap, stepsPerBar) {
      if (!zoneMap || !zoneMap.length) return;
      for (const t of tracks) {
        if (!t || !t.notes) continue;
        for (const n of t.notes) {
          const bar = Math.floor(n.step / stepsPerBar);
          const z = this._zoneAt(bar, zoneMap);
          n.velocity = Math.max(30, Math.min(127, Math.round(n.velocity * this._zoneVel(z.name))));
        }
      }
    }

    _trackNotes(t) {
      if (!t) return null;
      return Array.isArray(t) ? t : t.notes;
    }

    _applyZoneArrangement(tracks, progression, zoneMap, stepsPerBar) {
      if (!zoneMap || !zoneMap.length || !progression || !progression.length) return;
      const spb = stepsPerBar || 16;
      const barOf = s => Math.floor(s / spb);
      const gated = (bar, k) => {
        const z = this._zoneAt(bar, zoneMap);
        return !!(z.tracks && z.tracks[k] === false);
      };
      for (const k of ['lead', 'arp', 'drums']) {
        const arr = this._trackNotes(tracks[k]);
        if (!arr) continue;
        const kept = arr.filter(n => !gated(barOf(n.step), k));
        if (Array.isArray(tracks[k])) tracks[k] = kept;
        else tracks[k].notes = kept;
      }
      for (const k of ['bass', 'chords']) {
        const t = tracks[k];
        const arr = this._trackNotes(t);
        if (!arr) continue;
        const touched = new Set();
        const kept = arr.filter(n => {
          const b = barOf(n.step);
          if (gated(b, k)) { touched.add(b); return false; }
          return true;
        });
        for (const b of touched) {
          const chord = progression[b] || progression[0];
          if (!chord) continue;
          const bs = b * spb;
          if (k === 'bass') {
            const root = (chord.rootMidi != null ? chord.rootMidi : 48) % 12;
            kept.push({ step: bs, duration: spb, midi: 36 + root, velocity: 85, pan: 0 });
          } else {
            const tones = (chord.voicedNotes || chord.notes || []).map(m => {
              let x = m;
              while (x < 48) x += 12;
              while (x > 72) x -= 12;
              return x;
            });
            for (const m of tones) kept.push({ step: bs, duration: spb, midi: m, velocity: 78, pan: -15 });
          }
        }
        kept.sort((a, b2) => a.step - b2.step);
        if (Array.isArray(t)) tracks[k] = kept;
        else t.notes = kept;
      }
    }

    generate() {
      const { genre, key, lengthBars, bpm, timeSignature, chaosLevel, density, section, motifStructure, articulation, climaxCurve, useContour, contourPoints, fadeInBars, fadeOutBars, trackTarget, humanize } = this.options;
      const genreDef = Theory.GENRES[genre] || Theory.GENRES['touhou'];
      const scaleKey = this.options.scale || genreDef.defaultScale;
      const activeTimeSig = timeSignature || genreDef.defaultTimeSignature || '4/4';
      const stepsPerBar = this._getStepsPerBar(activeTimeSig);

      const progression = this._generateChordProgression(genreDef, key, scaleKey, lengthBars, section);

      const leadScaleNotes = Theory.getScaleNotes(key, scaleKey, 4, 6);
      const bassScaleNotes = Theory.getScaleNotes(key, scaleKey, 2, 3);
      const arpScaleNotes  = Theory.getScaleNotes(key, scaleKey, 4, 6);

      let velocityBoost = 0;
      let densityMod = density;
      if (section === 'chorus') {
        velocityBoost = 15;
        densityMod = Math.min(100, density + 15);
      } else if (section === 'intro') {
        velocityBoost = -12;
        densityMod = Math.max(30, density - 20);
      } else if (section === 'outro') {
        velocityBoost = -15;
        densityMod = Math.max(30, density - 25);
      }

      const isPurePiano = (trackTarget === 'pure_piano');
      const VV = this._resolveVariation(this.options.variation);
      const zoneMap = this._resolveZoneGates(this._zoneMapFor(lengthBars, section, this.options.seed), this.options.seed);
      const prof = genreDef.trackProfile || {};
      const profW = k => {
        if (isPurePiano) return 1;
        const v = prof[k];
        return (v == null ? 1 : v);
      };
      const grammar = Object.assign(
        { rest: 0, leapSemis: 9, chromatic: true },
        genreDef.leadGrammar || {}
      );

      const leadTrack = (trackTarget === 'all' || trackTarget === 'lead' || isPurePiano) ? this._generatePhraseBasedLead({
        progression,
        scaleNotes: leadScaleNotes,
        key,
        scaleKey,
        genreDef,
        lengthBars,
        timeSignature: activeTimeSig,
        stepsPerBar,
        section,
        motifStructure,
        articulation,
        climaxCurve,
        useContour,
        contourPoints,
        chaosLevel,
        density: Math.max(0, Math.min(100, densityMod * profW('lead'))),
        velocityBoost,
        humanize,
        grammar,
        variation: VV,
        zoneMap,
        songSeed: this.options.seed
      }) : { name: 'Lead Melody', type: 'synth_lead', instrument: genreDef.leadStyle, color: '#00f2fe', notes: [] };

      if (isPurePiano) {
        leadTrack.name = 'Piano Tay Phải (RH Melody & Runs)';
        leadTrack.type = 'piano_track';
        leadTrack.instrument = 'grand_piano_lead';
      }

      const chordTrack = (!isPurePiano && (trackTarget === 'all' || trackTarget === 'chords')) ? this._generateChordTrack({
        progression,
        genreDef,
        lengthBars,
        timeSignature: activeTimeSig,
        stepsPerBar,
        section,
        climaxCurve,
        density: Math.max(0, Math.min(100, densityMod * profW('chords'))),
        velocityBoost,
        humanize,
        variation: VV,
        zoneMap
      }) : { name: 'Harmony & Chords', type: 'poly_synth', instrument: 'analog_pad', color: '#9b51e0', notes: [] };

      const arpTrack = (trackTarget === 'all' || trackTarget === 'arp' || isPurePiano) ? this._generateArpTrack({
        progression,
        scaleNotes: arpScaleNotes,
        genreDef,
        lengthBars,
        timeSignature: activeTimeSig,
        stepsPerBar,
        section,
        climaxCurve,
        density: Math.max(0, Math.min(100, densityMod * profW('arp'))),
        velocityBoost,
        humanize,
        variation: VV,
        zoneMap
      }) : { name: 'Arpeggio Ostinato', type: 'pluck_synth', instrument: 'sparkle_arp', color: '#4facfe', notes: [] };

      if (isPurePiano) {
        arpTrack.name = 'Piano Tay Trái (LH Sweeping Waves)';
        arpTrack.type = 'piano_track';
        arpTrack.instrument = 'grand_piano_lead';
      }

      const bassTrack = (trackTarget === 'all' || trackTarget === 'bass' || isPurePiano) ? this._generateBassTrack({
        progression,
        scaleNotes: bassScaleNotes,
        genreDef,
        lengthBars,
        timeSignature: activeTimeSig,
        stepsPerBar,
        section,
        climaxCurve,
        density: Math.max(0, Math.min(100, densityMod * profW('bass'))),
        chaosLevel,
        velocityBoost,
        humanize,
        variation: VV,
        zoneMap
      }) : { name: 'Bassline', type: 'mono_bass', instrument: 'sub_saw_bass', color: '#f39c12', notes: [] };

      if (isPurePiano) {
        bassTrack.name = 'Piano Tay Trái (LH Deep Bass & Octaves)';
        bassTrack.type = 'piano_track';
        bassTrack.instrument = 'grand_piano_lead';
      }

      const drumTrack = (!isPurePiano && (trackTarget === 'all' || trackTarget === 'drums')) ? this._generateDrumTrack({
        genreDef,
        lengthBars,
        timeSignature: activeTimeSig,
        stepsPerBar,
        section,
        climaxCurve,
        density: Math.max(0, Math.min(100, densityMod * profW('drums'))),
        chaosLevel,
        velocityBoost,
        humanize,
        variation: VV,
        zoneMap
      }) : { name: 'Drums & Percussion', type: 'drum_kit', instrument: 'standard_kit', color: '#e74c3c', notes: [] };

      this._applyZoneArrangement(
        { lead: leadTrack, chords: chordTrack, arp: arpTrack, bass: bassTrack, drums: drumTrack },
        progression, zoneMap, stepsPerBar
      );
      this._applyZoneVelocity([leadTrack, chordTrack, arpTrack, bassTrack, drumTrack], zoneMap, stepsPerBar);

      const arrangedSong = {
        metadata: {
          lengthBars, stepsPerBar, section, key, genre: genreDef.id, scale: scaleKey,
          loopMode: !!this.options.loopMode, isPurePiano, climaxCurve
        },
        progression,
        tracks: {
          lead: leadTrack,
          chords: chordTrack,
          arp: arpTrack,
          bass: bassTrack,
          drums: drumTrack
        }
      };
      this._arrangeEnsemble(arrangedSong, { finalHit: !this.options.skipFinalHit && this.options.finalHit !== false });

      this._applyFadeDynamics([leadTrack, chordTrack, arpTrack, bassTrack, drumTrack], lengthBars, fadeInBars, fadeOutBars, stepsPerBar);

      const totalNotesCount = leadTrack.notes.length + chordTrack.notes.length + arpTrack.notes.length + bassTrack.notes.length + drumTrack.notes.length;

      return {
        metadata: {
          title: `RinTune_${genreDef.name.replace(/[^a-zA-Z0-9]/g, '_')}_${key}_${Math.floor(this.options.seed * 10000)}`,
          genre: genreDef.id,
          genreName: genreDef.name,
          key,
          scale: scaleKey,
          scaleName: Theory.SCALES[scaleKey] ? Theory.SCALES[scaleKey].name : scaleKey,
          bpm,
          timeSignature: activeTimeSig,
          stepsPerBar,
          lengthBars,
          section,
          motifStructure,
          articulation,
          climaxCurve,
          chaosLevel,
          density,
          fadeInBars,
          fadeOutBars,
          variation: VV,
          sectionMap: zoneMap,
          useContour: !!useContour,
          contourPoints: contourPoints || null,
          loopMode: !!this.options.loopMode,
          isPurePiano,
          trackTarget,
          noteCount: totalNotesCount,
          seed: this.options.seed,
          createdAt: new Date().toISOString()
        },
        progression,
        tracks: {
          lead: leadTrack,
          chords: chordTrack,
          arp: arpTrack,
          bass: bassTrack,
          drums: drumTrack
        }
      };
    }


    resolveBarChord(symbol, bar) {
      const key = this.options.key || 'A';
      const genreDef = Theory.GENRES[this.options.genre] || Theory.GENRES['touhou'];
      const scaleKey = this.options.scale || genreDef.defaultScale;
      const chord = Theory.resolveChord(symbol, key, scaleKey, 3);
      return {
        bar,
        symbol,
        rootName: chord.rootName,
        rootMidi: chord.rootMidi,
        chordType: chord.chordType,
        notes: chord.notes,
        quality: chord.quality
      };
    }


    retuneProgression(progression) {
      if (Theory.optimizeVoiceLeading) return Theory.optimizeVoiceLeading(progression, 3);
      return progression;
    }

    _fadeMultiplierForStep(step, totalBars, fadeInBars, fadeOutBars, stepsPerBar) {
      let m = 1.0;
      const fadeInSteps = fadeInBars * stepsPerBar;
      const totalSteps = totalBars * stepsPerBar;
      if (fadeInBars > 0 && step < fadeInSteps) {
        m *= Math.max(0.1, step / fadeInSteps);
      }
      if (fadeOutBars > 0 && step >= totalSteps - fadeOutBars * stepsPerBar) {
        m *= Math.max(0.05, (totalSteps - step) / (fadeOutBars * stepsPerBar));
      }
      return m;
    }


    regenerateRegion(song, spec = {}) {
      const md = song.metadata || {};
      const totalBars = md.lengthBars || 8;
      const stepsPerBar = md.stepsPerBar || 16;
      const fromBar = Math.max(0, Math.min(totalBars - 1, (spec.fromBar | 0) || 0));
      const toBar = Math.max(fromBar, Math.min(totalBars - 1, spec.toBar == null ? fromBar : (spec.toBar | 0)));
      const wanted = (spec.tracks && spec.tracks.length) ? spec.tracks : ['lead', 'chords', 'arp', 'bass'];
      const genreDef = Theory.GENRES[md.genre] || Theory.GENRES['touhou'];
      const scaleKey = md.scale || genreDef.defaultScale;
      const section = md.section || 'none';
      const chaosLevel = (md.chaosLevel == null ? 20 : md.chaosLevel);
      const densityBase = (md.density == null ? 75 : md.density);

      let velocityBoost = 0;
      let densityMod = densityBase;
      if (section === 'chorus') { velocityBoost = 15; densityMod = Math.min(100, densityMod + 15); }
      else if (section === 'intro') { velocityBoost = -12; densityMod = Math.max(30, densityMod - 20); }
      else if (section === 'outro') { velocityBoost = -15; densityMod = Math.max(30, densityMod - 25); }

      const VV = this._resolveVariation(spec.variation != null ? spec.variation : (md.variation != null ? md.variation : this.options.variation));
      const gateSeed = (md.seed != null ? md.seed : this.options.seed);
      const zoneMap = this._resolveZoneGates(this._zoneMapFor(totalBars, section, gateSeed), gateSeed);

      const baseCtx = {
        progression: song.progression,
        genreDef,
        key: md.key || 'A',
        scaleKey,
        scaleNotes: Theory.getScaleNotes(md.key || 'A', scaleKey, 4, 6),
        lengthBars: totalBars,
        timeSignature: md.timeSignature || '4/4',
        stepsPerBar,
        section,
        motifStructure: md.motifStructure || 'none',
        articulation: md.articulation || 'auto',
        climaxCurve: md.climaxCurve || 'none',
        useContour: !!md.useContour,
        contourPoints: md.contourPoints || null,
        seedPhrase: spec.leadSeed || null,
        chaosLevel,
        density: densityMod,
        velocityBoost,
        humanize: true,
        grammar: Object.assign({ rest: 0, leapSemis: 9, chromatic: true }, genreDef.leadGrammar || {}),
        variation: VV,
        zoneMap,
        songSeed: (md.seed != null ? md.seed : this.options.seed),
        barStart: fromBar,
        barEnd: toBar
      };

      const prevRng = this.rng;
      this.rng = new RandomContext(spec.seed !== undefined ? spec.seed : Math.random());
      const out = {};
      try {
        if (wanted.includes('lead')) out.lead = this._generatePhraseBasedLead(baseCtx).notes;
        if (wanted.includes('chords')) out.chords = this._generateChordTrack(baseCtx).notes;
        if (wanted.includes('arp')) {
          out.arp = this._generateArpTrack(Object.assign({}, baseCtx, {
            scaleNotes: Theory.getScaleNotes(md.key || 'A', scaleKey, 4, 6)
          })).notes;
        }
        if (wanted.includes('bass')) {
          out.bass = this._generateBassTrack(Object.assign({}, baseCtx, {
            scaleNotes: Theory.getScaleNotes(md.key || 'A', scaleKey, 2, 3)
          })).notes;
        }
        if (wanted.includes('drums')) out.drums = this._generateDrumTrack(baseCtx).notes;
      } finally {
        this.rng = prevRng;
      }

      this._applyZoneArrangement(out, song.progression, zoneMap, stepsPerBar);
      this._applyZoneVelocity(Object.values(out).map(notes => ({ notes })), zoneMap, stepsPerBar);

      const fadeInBars = md.fadeInBars || 0;
      const fadeOutBars = md.fadeOutBars || 0;
      if (fadeInBars > 0 || fadeOutBars > 0) {
        for (const k of Object.keys(out)) {
          for (const n of out[k]) {
            const m = this._fadeMultiplierForStep(n.step, totalBars, fadeInBars, fadeOutBars, stepsPerBar);
            if (m < 1.0) n.velocity = Math.max(25, Math.min(127, Math.round(n.velocity * m)));
          }
        }
      }
      return { fromBar, toBar, notes: out };
    }


    _arrangeEnsemble(song, opts = {}) {
      const md = song.metadata;
      const totalBars = md.lengthBars;
      const spb = md.stepsPerBar || 16;
      const section = md.section || 'none';
      const loopMode = !!md.loopMode;
      const isPiano = !!md.isPurePiano;
      const drums = song.tracks.drums.notes;
      const bass = song.tracks.bass.notes;

      for (let bar = 8; bar < totalBars; bar += 8) {
        const s = bar * spb;
        if (!drums.some(n => n.midi === 49 && Math.abs(n.step - s) <= 2)) {
          drums.push({ step: s, duration: 8, midi: 49, velocity: 110, pan: 15, locked: true });
        }
      }

      if (!isPiano && bass.length && drums.length) {
        const kickSteps = new Set();
        for (const n of drums) {
          if (n.midi === 36) kickSteps.add(Math.round(n.step));
        }
        if (kickSteps.size) {
          for (const n of bass) {
            if (n.locked) continue;
            const r = Math.round(n.step);
            if (!kickSteps.has(r)) {
              if (kickSteps.has(r - 1)) n.step = r - 1;
              else if (kickSteps.has(r + 1)) n.step = r + 1;
            }
          }
        }
      }

      if ((section === 'intro' || section === 'none') && !isPiano && !loopMode) {
        const lead = song.tracks.lead.notes;
        for (let i = lead.length - 1; i >= 0; i--) {
          const n = lead[i];
          if (n.locked || n.step >= 2 * spb) continue;
          if ((n.step % spb) !== 0 && this.rng.chance(0.5)) lead.splice(i, 1);
        }
      }

      this.arrangeFinal(song, opts);
    }


    arrangeFinal(song, opts = {}) {
      const md = song.metadata;
      const totalBars = md.lengthBars;
      const spb = md.stepsPerBar || 16;
      const loopMode = !!md.loopMode;
      const lastBar = totalBars - 1;
      const lastStep = lastBar * spb;

      if (loopMode) {
        const tonic = Theory.resolveChord('i', md.key || 'A', md.scale || 'natural_minor', 3);
        const last = song.progression[lastBar];
        if (last) {
          last.symbol = 'i';
          last.rootName = tonic.rootName;
          last.rootMidi = tonic.rootMidi;
          last.chordType = tonic.chordType;
          last.notes = tonic.notes;
          last.quality = tonic.quality;
        }
        song.tracks.drums.notes = song.tracks.drums.notes.filter(n => {
          if (Math.floor(n.step / spb) !== lastBar) return true;
          return n.midi === 42 || n.midi === 46;
        });
      } else if (!opts.skipFinalHit && opts.finalHit !== false && totalBars >= 2) {
        const tonic = Theory.resolveChord('i', md.key || 'A', md.scale || 'natural_minor', 3);
        const lastEntry = song.progression[lastBar];
        if (lastEntry) {
          lastEntry.symbol = 'i';
          lastEntry.rootName = tonic.rootName;
          lastEntry.rootMidi = tonic.rootMidi;
          lastEntry.chordType = tonic.chordType;
          lastEntry.notes = tonic.notes;
          lastEntry.quality = tonic.quality;
        }
        const lastChord = song.progression[lastBar] || song.progression[0];
        const root = lastChord.rootMidi;
        const picardy = (md.genre === 'touhou');
        const drums = song.tracks.drums.notes;
        const hasCrash = drums.some(n => n.midi === 49 && Math.abs(n.step - lastStep) <= 2);
        const hasStab = song.tracks.lead.notes.some(n => n.locked && Math.abs(n.step - lastStep) <= 1 && n.velocity >= 115);
        if (!hasStab) {
          song.tracks.lead.notes.push({ step: lastStep, duration: spb, midi: root + 24, velocity: 120, pan: 0, locked: true });
          if (picardy) {
            song.tracks.lead.notes.push({ step: lastStep, duration: spb, midi: root + 16, velocity: 110, pan: 10, locked: true });
          }
          for (const m of (lastChord.voicedNotes || lastChord.notes)) {
            song.tracks.chords.notes.push({ step: lastStep, duration: spb, midi: m, velocity: 100, pan: -15, locked: true });
          }
          song.tracks.bass.notes.push({ step: lastStep, duration: spb, midi: root - 12, velocity: 115, pan: 0, locked: true });
        }
        if (!hasCrash) {
          drums.push({ step: lastStep, duration: 8, midi: 49, velocity: 120, pan: 15, locked: true });
          drums.push({ step: lastStep, duration: 2, midi: 36, velocity: 120, pan: 0, locked: true });
        }
      }

      md.noteCount = Object.values(song.tracks).reduce((acc, t) => acc + (t.notes ? t.notes.length : 0), 0);
    }


    applyTexture(song, ranges) {
      if (!song || !song.tracks) return song;
      if (song.metadata && song.metadata.isPurePiano) return song; // piano solo giu nguyen
      const spb = (song.metadata && song.metadata.stepsPerBar) || 16;
      const T = song.tracks;
      for (const r of (ranges || [])) {
        if (!r || !r.texture || r.texture === 'tutti') continue;
        const fromStep = r.fromBar * spb;
        const toStep = (r.toBar + 1) * spb;
        const inRange = n => n.step >= fromStep && n.step < toStep;
        const keepDownbeat = arr => arr.filter(n => !inRange(n) || (n.step % spb) === 0);

        if (r.texture === 'solo') {
          if (T.drums && T.drums.notes) T.drums.notes = T.drums.notes.filter(n => !inRange(n));
          if (T.bass && T.bass.notes) T.bass.notes = keepDownbeat(T.bass.notes);
          if (T.arp && T.arp.notes) T.arp.notes = keepDownbeat(T.arp.notes);
        } else if (r.texture === 'dialogue') {
          for (let bar = r.fromBar; bar <= r.toBar; bar++) {
            const bs = bar * spb, be = bs + spb;
            const inBar = n => n.step >= bs && n.step < be;
            if ((bar - r.fromBar) % 2 === 0) {
              if (T.drums && T.drums.notes) T.drums.notes = T.drums.notes.filter(n => !inBar(n));
              const f = arr => arr.filter(n => !inBar(n) || (n.step % spb) === 0);
              if (T.bass && T.bass.notes) T.bass.notes = f(T.bass.notes);
              if (T.arp && T.arp.notes) T.arp.notes = f(T.arp.notes);
            } else {
              if (T.lead && T.lead.notes) {
                T.lead.notes = T.lead.notes.filter(n => !inBar(n) || (n.step % spb) === 0);
              }
            }
          }
        } else if (r.texture === 'cadenza') {
          for (const k of ['drums', 'bass', 'arp', 'chords']) {
            if (T[k] && T[k].notes) T[k].notes = T[k].notes.filter(n => !inRange(n));
          }
        }
      }
      if (song.metadata) {
        song.metadata.noteCount = Object.values(T).reduce((acc, t) => acc + (t.notes ? t.notes.length : 0), 0);
      }
      return song;
    }

    _generateChordProgression(genreDef, key, scaleKey, totalBars, section) {
      let template = this.rng.choice(genreDef.progressions) || ['i', 'VI', 'VII', 'i'];

      if (section === 'intro') {
        template = ['i', 'i', 'VI', 'VII'];
      } else if (section === 'outro') {
        template = ['VI', 'VII', 'i', 'i'];
      }

      const resolvedList = [];
      let templateIndex = 0;

      for (let bar = 0; bar < totalBars; bar++) {
        const symbol = template[templateIndex % template.length];
        const chord = Theory.resolveChord(symbol, key, scaleKey, 3);
        resolvedList.push({
          bar,
          symbol,
          rootName: chord.rootName,
          rootMidi: chord.rootMidi,
          chordType: chord.chordType,
          notes: chord.notes,
          quality: chord.quality
        });
        templateIndex++;
      }

      if (totalBars >= 2) {
        const tonic = Theory.resolveChord('i', key, scaleKey, 3);
        resolvedList[totalBars - 1] = {
          bar: totalBars - 1,
          symbol: 'i',
          rootName: tonic.rootName,
          rootMidi: tonic.rootMidi,
          chordType: tonic.chordType,
          notes: tonic.notes,
          quality: tonic.quality
        };
      }

      return Theory.optimizeVoiceLeading(resolvedList, 3);
    }


    _getClimaxFactor(bar, totalBars, climaxCurve) {
      if (!climaxCurve || climaxCurve === 'none' || climaxCurve === 'flat') {
        return 0.7; // Natural balanced flat dynamics across all bars
      }
      const progress = bar / Math.max(1, totalBars - 1); // 0.0 at bar 0, 1.0 at last bar

      if (climaxCurve === 'crescendo') {
        return Math.pow(progress, 1.4); // Smooth powerful exponential rise
      } else if (climaxCurve === 'climax_explosion') {
        if (progress < 0.6) {
          return 0.4 + (progress / 0.6) * 0.4; // 0.4 -> 0.8
        } else if (progress <= 0.85) {
          return 1.0; // 100% MAXIMUM EXPLOSION!
        } else {
          return 0.85 - ((progress - 0.85) / 0.15) * 0.25; // Release to 0.6
        }
      } else if (climaxCurve === 'emotional_wave') {
        return 0.5 + 0.5 * Math.sin(progress * Math.PI * 3.0);
      } else if (climaxCurve === 'full_fire') {
        return 1.0;
      } else {
        return 0.7;
      }
    }


    _getContourValueAtStep(globalStep, totalSteps, points) {
      if (!points || points.length === 0) return 0.5;
      if (points.length === 1) return points[0].y;

      const progress = Math.max(0, Math.min(1, globalStep / Math.max(1, totalSteps - 1)));
      const sorted = [...points].sort((a, b) => a.x - b.x);

      if (progress <= sorted[0].x) return sorted[0].y;
      if (progress >= sorted[sorted.length - 1].x) return sorted[sorted.length - 1].y;

      for (let i = 0; i < sorted.length - 1; i++) {
        const p1 = sorted[i];
        const p2 = sorted[i + 1];
        if (progress >= p1.x && progress <= p2.x) {
          const range = p2.x - p1.x;
          const t = range === 0 ? 0 : (progress - p1.x) / range;
          return p1.y + (p2.y - p1.y) * t;
        }
      }
      return sorted[sorted.length - 1].y;
    }

    _tileBlueprint(src, phraseSteps, stepsPerBar = 16) {
      if (!src || src.length === 0) return [];
      const clean = src
        .filter(n => n && n.durationSteps > 0)
        .map(n => ({ stepOffset: n.stepOffset | 0, durationSteps: n.durationSteps | 0, scaleIndex: n.scaleIndex | 0 }))
        .sort((a, b) => a.stepOffset - b.stepOffset);
      if (clean.length === 0) return [];
      const motifLen = Math.max(...clean.map(n => n.stepOffset + n.durationSteps));
      if (motifLen <= 0) return [];
      const out = [];
      for (let base = 0; base < phraseSteps; base += motifLen) {
        for (const n of clean) {
          const off = base + n.stepOffset;
          if (off >= phraseSteps) break;
          out.push({
            stepOffset: off,
            durationSteps: Math.min(n.durationSteps, phraseSteps - off),
            scaleIndex: n.scaleIndex,
            isDownbeat: (off % stepsPerBar === 0 || off % (stepsPerBar / 2) === 0)
          });
        }
      }
      return out;
    }


    _generatePhraseBasedLead(ctx) {
      const { progression, scaleNotes, key, scaleKey, genreDef, lengthBars, timeSignature = '4/4', stepsPerBar = 16, section, motifStructure, articulation, climaxCurve, useContour, contourPoints, chaosLevel, density, velocityBoost, humanize } = ctx;
      const grammar = Object.assign({ rest: 0, leapSemis: 9, chromatic: true }, ctx.grammar || genreDef.leadGrammar || {});
      const notes = [];
      const rootMidi = Theory.noteToMidi(key, 4);

      const phraseBarLen = lengthBars >= 4 ? 2 : 1;
      const phraseSteps = phraseBarLen * stepsPerBar;
      const totalSteps = lengthBars * stepsPerBar;

      const phraseA = ctx.seedPhrase
        ? this._tileBlueprint(ctx.seedPhrase, phraseSteps, stepsPerBar)
        : this._composeSeedPhrase(phraseSteps, scaleNotes, genreDef, density, chaosLevel, stepsPerBar, timeSignature);
      const loIdx = 0;
      const hiIdx = scaleNotes.length - 1;
      const phraseB = ctx.seedPhrase
        ? this._composeSeedPhrase(phraseSteps, scaleNotes, genreDef, density, chaosLevel, stepsPerBar, timeSignature)
        : this._developMotif(phraseA, 'sequence', { degrees: (this.rng.chance(0.5) ? 2 : -2), lo: loIdx, hi: hiIdx });

      let form = motifStructure;
      if (form === 'smart_adaptive') {
        if (lengthBars <= 4) form = '2bars_abab';
        else if (lengthBars <= 8) form = '4bars_aabb';
        else form = '8bars_abab';
      }

      const isFieryPiano = (genreDef.id === 'fiery_piano' || genreDef.id === 'touhou' || genreDef.id === 'sasakure_uk');
      const isSasakure = (genreDef.id === 'sasakure_uk');
      const mutationChance = chaosLevel / 100; // 0.0 to 1.0
      const Vl = (ctx.variation && ctx.variation.lead != null) ? ctx.variation.lead : 0.7;

      let currentBar = Math.max(0, ctx.barStart || 0);
      const endBar = (ctx.barEnd == null || ctx.barEnd < 0) ? (lengthBars - 1) : Math.min(lengthBars - 1, ctx.barEnd);
      let prevLeadMidi = null;
      while (currentBar <= endBar) {
        const remainingBars = lengthBars - currentBar;
        const currentPhraseBars = Math.min(remainingBars, phraseBarLen);
        const phraseStartStep = currentBar * stepsPerBar;
        const phraseIndex = Math.floor(currentBar / phraseBarLen);

        const climaxFactor = this._getClimaxFactor(currentBar, lengthBars, climaxCurve);
        const isPeakClimax = (climaxFactor >= 0.88);

        let activeBlueprint = phraseA;
        let transposeDegree = 0;
        let isVariation = false;
        let forceCadenceResolve = false;

        if (form === '4bars_aabb') {
          const mod4 = phraseIndex % 4;
          if (mod4 === 0) activeBlueprint = phraseA;
          else if (mod4 === 1) { activeBlueprint = this._developMotif(phraseA, 'sequence', { degrees: this.rng.choice([1, -1, 2]), lo: loIdx, hi: hiIdx }); isVariation = true; }
          else if (mod4 === 2) activeBlueprint = phraseB;
          else { activeBlueprint = phraseB; isVariation = true; forceCadenceResolve = true; }
        } else if (form === '8bars_abab') {
          const mod4 = phraseIndex % 4;
          if (mod4 === 0) activeBlueprint = phraseA;
          else if (mod4 === 1) activeBlueprint = phraseB;
          else if (mod4 === 2) {
            activeBlueprint = (this._vChance(0.5, Vl) && !ctx.seedPhrase)
              ? this._developMotif(phraseA, this.rng.choice(['sequence', 'inversion']), { degrees: 1, lo: loIdx, hi: hiIdx })
              : phraseA;
          }
          else { activeBlueprint = phraseB; isVariation = true; forceCadenceResolve = true; }
        } else if (form === 'qa_question_answer') {
          const isAnswer = (phraseIndex % 2 === 1);
          if (isAnswer) { activeBlueprint = this._developMotif(phraseA, 'sequence', { degrees: -1, lo: loIdx, hi: hiIdx }); isVariation = true; forceCadenceResolve = true; }
          else activeBlueprint = phraseA;
        } else if (form === '4bars_abac') {
          const mod4 = phraseIndex % 4;
          if (mod4 === 0) activeBlueprint = phraseA;
          else if (mod4 === 1) activeBlueprint = phraseB;
          else if (mod4 === 2) activeBlueprint = phraseA;
          else { activeBlueprint = phraseB; isVariation = true; forceCadenceResolve = true; }
        } else if (form === '2bars_abab') {
          activeBlueprint = (phraseIndex % 2 === 0) ? phraseA : phraseB;
        } else if (form === '2bars_aaba') {
          const mod4 = phraseIndex % 4;
          activeBlueprint = (mod4 === 2) ? phraseB : phraseA;
          if (mod4 === 3) forceCadenceResolve = true;
        } else if (form === '1bar_ostinato') {
          activeBlueprint = phraseA;
          const chord = progression[currentBar] || progression[0];
          transposeDegree = (chord.rootMidi % 12) - (rootMidi % 12);
        } else if (!ctx.seedPhrase && this._vChance(0.6, Vl)) {
          activeBlueprint = this._developMotif(phraseA, this.rng.choice(['sequence', 'sequence', 'inversion', 'fragment']), { degrees: this.rng.choice([1, -1, 2, -2]), lo: loIdx, hi: hiIdx });
        } else {
          activeBlueprint = phraseA;
        }

        if ((isFieryPiano || isSasakure) && isPeakClimax && (density > 50) && this._vChance(0.65, Vl)) {
          const sweepLength = density >= 80 ? Math.min(8, stepsPerBar / 2) : 4;
          for (let sw = 0; sw < sweepLength; sw++) {
            const swStep = phraseStartStep + sw;
            const swMidi = scaleNotes[Math.min(scaleNotes.length - 1, 4 + sw * 2)];
            notes.push({
              step: swStep,
              duration: 1,
              midi: swMidi,
              velocity: Math.min(127, Math.round(95 + sw * 4)),
              pan: -10 + sw * 5
            });
          }
        }

        if ((genreDef.id === 'touhou' || isSasakure) && climaxFactor >= 0.75 && density >= 60 && this._vChance(0.5, Vl)) {
          const tBase = scaleNotes[Math.min(scaleNotes.length - 1, 6)];
          for (let t = 0; t < 3; t++) {
            notes.push({
              step: phraseStartStep + (t * 2) / 3,
              duration: 1,
              midi: Math.min(108, tBase + t * 2),
              velocity: Math.min(127, Math.round(88 * (0.65 + 0.45 * climaxFactor)) + velocityBoost),
              pan: 0
            });
          }
        }

        if (genreDef.id === 'fiery_piano' && climaxFactor >= 0.75 && this._vChance(0.4, Vl)) {
          const trillEnd = phraseStartStep + currentPhraseBars * stepsPerBar;
          const trillBase = rootMidi + 12;
          for (let k = 0; k < 4; k++) {
            const ts = trillEnd - 2 + k;
            if (ts < phraseStartStep || ts >= totalSteps) continue;
            notes.push({
              step: ts,
              duration: 1,
              midi: trillBase + (k % 2),
              velocity: Math.min(127, 82 + velocityBoost),
              pan: 5
            });
          }
        }

        let stepCursor = 0;
        for (let i = 0; i < activeBlueprint.length; i++) {
          const noteDef = activeBlueprint[i];
          const globalStep = phraseStartStep + stepCursor;
          const currentNoteBar = Math.floor(globalStep / stepsPerBar);

          if (globalStep >= totalSteps) break;

          if (!noteDef.isDownbeat && !ctx.seedPhrase && grammar.rest > 0 && this.rng.chance(grammar.rest)) {
            stepCursor += noteDef.durationSteps;
            continue;
          }

          if (!noteDef.isDownbeat && density < 60) {
            const skipChance = (60 - density) / 60;
            if (this.rng.chance(skipChance)) {
              stepCursor += noteDef.durationSteps;
              continue;
            }
          }

          const chord = progression[currentNoteBar] || progression[0];
          const chordPcs = chord.notes.map(n => n % 12);
          const isLastNoteInPhrase = (i === activeBlueprint.length - 1);
          const lockBase = (ctx.songSeed != null ? ctx.songSeed : '') + ':' + noteDef.stepOffset;

          let targetMidi;
          let baseDegreeIndex = Math.max(0, Math.min(scaleNotes.length - 1, noteDef.scaleIndex + transposeDegree));

          if (useContour && contourPoints && contourPoints.length >= 2) {
            const contourY = this._getContourValueAtStep(globalStep, totalSteps, contourPoints); // 0.0 (bottom) to 1.0 (top)
            let contourDegree = Math.round(contourY * (scaleNotes.length - 1));

            if (chaosLevel > 0 && !noteDef.isDownbeat && this._hash01('mut' + lockBase + ':c') < mutationChance * 0.7) {
              const maxChaosLeap = Math.round(1 + (chaosLevel / 100) * 3);
              contourDegree += [-maxChaosLeap, maxChaosLeap, -1, 1][Math.floor(this._hash01('amt' + lockBase + ':c') * 4)];
            }

            contourDegree = Math.max(0, Math.min(scaleNotes.length - 1, contourDegree));
            targetMidi = scaleNotes[contourDegree];

            if (noteDef.isDownbeat && !chordPcs.includes(targetMidi % 12) && this.rng.chance(Math.max(0.4, 1.0 - mutationChance))) {
              const chordTonesInScale = scaleNotes.filter(m => chordPcs.includes(m % 12));
              targetMidi = this._findClosestNote(chordTonesInScale, targetMidi);
            }
          } else {
            if (forceCadenceResolve && isLastNoteInPhrase) {
              targetMidi = rootMidi + (isPeakClimax ? 24 : 12);
            } else {
              if (isPeakClimax) baseDegreeIndex += 3;

              const lockKey = lockBase + ':' + transposeDegree;
              if (!noteDef.isDownbeat && this._hash01('mut' + lockKey) < mutationChance * 0.7) {
                const ha = this._hash01('amt' + lockKey);
                if (chaosLevel > 60 && ha < 0.4) {
                  baseDegreeIndex += [-4, -3, 3, 4, 5][Math.floor(this._hash01('amt2' + lockKey) * 5)];
                } else {
                  baseDegreeIndex += [-1, 1, -2, 2][Math.floor(this._hash01('amt2' + lockKey) * 4)];
                }
              }

              baseDegreeIndex = Math.max(0, Math.min(scaleNotes.length - 1, baseDegreeIndex));
              targetMidi = scaleNotes[baseDegreeIndex];

              if (grammar.chromatic !== false && chaosLevel > 70 && !noteDef.isDownbeat && this._hash01('chr' + lockKey) < (chaosLevel - 70) / 100) {
                targetMidi += this._hash01('chr2' + lockKey) < 0.5 ? -1 : 1;
              } else if (noteDef.isDownbeat && !chordPcs.includes(targetMidi % 12) && this.rng.chance(Math.max(0.3, 1.0 - mutationChance))) {
                const chordTonesInScale = scaleNotes.filter(m => chordPcs.includes(m % 12));
                targetMidi = this._findClosestNote(chordTonesInScale, targetMidi);
              }
            }
          }

          if (!isPeakClimax && !(forceCadenceResolve && isLastNoteInPhrase)) {
            const center = scaleNotes[Math.floor(scaleNotes.length * 0.45)];
            if (targetMidi > center + 12) {
              const inRange = scaleNotes.filter(m => m <= center + 12);
              if (inRange.length) targetMidi = this._findClosestNote(inRange, targetMidi);
            } else if (targetMidi < center - 12) {
              const inRange = scaleNotes.filter(m => m >= center - 12);
              if (inRange.length) targetMidi = this._findClosestNote(inRange, targetMidi);
            }
          }

          const leapCap = grammar.leapSemis || 9;
          if (prevLeadMidi != null && !noteDef.isDownbeat && Math.abs(targetMidi - prevLeadMidi) > leapCap && this.rng.chance(0.7)) {
            const near = scaleNotes.filter(m => Math.abs(m - prevLeadMidi) <= Math.max(2, Math.round(leapCap / 2)));
            if (near.length) targetMidi = this._findClosestNote(near, targetMidi);
          }

          if (forceCadenceResolve && !isLastNoteInPhrase && i === activeBlueprint.length - 2 && !useContour) {
            targetMidi = rootMidi + 11;
          }

          let finalDuration = noteDef.durationSteps;
          if (articulation === 'staccato') {
            finalDuration = Math.max(1, Math.floor(noteDef.durationSteps * 0.5));
          } else if (articulation === 'legato') {
            finalDuration = noteDef.durationSteps + 1;
          } else if (articulation === 'touhou_fast') {
            finalDuration = noteDef.durationSteps <= 2 ? 1 : noteDef.durationSteps;
            if (density >= 75 && this.rng.chance(0.35) && globalStep > 0) {
              notes.push({
                step: globalStep - 1,
                duration: 1,
                midi: targetMidi - 2,
                velocity: Math.min(127, 85 + velocityBoost),
                pan: 0
              });
            }
          } else {
            finalDuration = noteDef.durationSteps <= 2 ? (this.rng.chance(0.35) ? 1 : 2) : noteDef.durationSteps;
          }

          let vel = noteDef.isDownbeat ? 112 : 92;
          vel = Math.round(vel * (0.65 + 0.45 * climaxFactor)) + velocityBoost;
          if (humanize) vel += this.rng.rangeInt(-5, 5);
          vel = Math.max(40, Math.min(127, vel));

          notes.push({
            step: globalStep,
            duration: Math.max(1, finalDuration),
            midi: targetMidi,
            velocity: vel,
            pan: 0
          });
          prevLeadMidi = targetMidi;

          if (isSasakure && density >= 70 && noteDef.durationSteps >= 3 && this._vChance(0.45, Vl)) {
            const flurryMidi = scaleNotes[Math.min(scaleNotes.length - 1, baseDegreeIndex + 2)] || (targetMidi + 4);
            notes.push({
              step: globalStep + 1,
              duration: 1,
              midi: flurryMidi,
              velocity: Math.max(45, vel - 12),
              pan: 12
            });
          }

          if (density >= 80 && noteDef.durationSteps >= 4 && this.rng.chance((density - 70) / 40)) {
            const embellishMidi = scaleNotes[Math.min(scaleNotes.length - 1, baseDegreeIndex + 1)] || (targetMidi + 2);
            notes.push({
              step: globalStep + 2,
              duration: 2,
              midi: embellishMidi,
              velocity: Math.max(40, vel - 15),
              pan: 10
            });
          }

          if (isSasakure && isPeakClimax && noteDef.isDownbeat) {
            const chordTone1 = chord.notes[1] ? chord.notes[1] + 24 : targetMidi + 4;
            const chordTone2 = chord.notes[2] ? chord.notes[2] + 24 : targetMidi + 7;
            if (chordTone1 <= 108) {
              notes.push({ step: globalStep, duration: Math.max(1, finalDuration), midi: chordTone1, velocity: vel - 5, pan: -10 });
            }
            if (chordTone2 <= 108) {
              notes.push({ step: globalStep, duration: Math.max(1, finalDuration), midi: chordTone2, velocity: vel - 8, pan: 10 });
            }
          } else if ((isPeakClimax || isFieryPiano) && noteDef.isDownbeat && targetMidi + 12 <= 108) {
            notes.push({
              step: globalStep,
              duration: Math.max(1, finalDuration),
              midi: targetMidi + 12,
              velocity: Math.min(127, vel + 5),
              pan: 15
            });
          }

          stepCursor += noteDef.durationSteps;
          if (stepCursor >= phraseSteps) break;
        }

        currentBar += currentPhraseBars;
      }

      return {
        name: 'Lead Melody',
        type: 'synth_lead',
        instrument: genreDef.leadStyle,
        color: '#00f2fe',
        notes
      };
    }

    _developMotif(blueprint, kind, opt = {}) {
      if (!blueprint || !blueprint.length) return [];
      const lo = opt.lo != null ? opt.lo : 0;
      const hi = opt.hi != null ? opt.hi : 1e9;
      const clampIdx = (v) => Math.max(lo, Math.min(hi, v));
      const copy = blueprint.map(n => Object.assign({}, n));
      if (kind === 'sequence') {
        const d = opt.degrees || 0;
        for (const n of copy) n.scaleIndex = clampIdx(n.scaleIndex + d);
      } else if (kind === 'inversion') {
        const anchor = copy[0].scaleIndex;
        for (const n of copy) n.scaleIndex = clampIdx(2 * anchor - n.scaleIndex);
      } else if (kind === 'fragment') {
        const keep = Math.max(2, Math.ceil(copy.length / 2));
        const cut = copy.slice(0, keep);
        const lastEnd = Math.max(...copy.map(n => n.stepOffset + n.durationSteps));
        cut[cut.length - 1].durationSteps = Math.max(1, lastEnd - cut[cut.length - 1].stepOffset);
        return cut;
      }
      return copy;
    }

    _composeSeedPhrase(totalSteps, scaleNotes, genreDef, density = 75, chaosLevel = 25, stepsPerBar = 16, timeSignature = '4/4') {
      let rhythmPool;

      if (timeSignature === '7/8' || stepsPerBar === 14) {
        if (density < 45) {
          rhythmPool = [
            [7, 7],
            [6, 8],
            [8, 6],
            [4, 3, 4, 3]
          ];
        } else if (density >= 80) {
          rhythmPool = [
            [2, 2, 2, 1, 2, 2, 2, 1],
            [2, 2, 2, 2, 2, 2, 2],
            [3, 1, 3, 1, 2, 2, 2],
            [2, 2, 3, 2, 2, 3]
          ];
        } else {
          rhythmPool = [
            [4, 3, 4, 3],
            [3, 2, 2, 3, 2, 2],
            [2, 2, 3, 4, 3],
            [3, 4, 3, 4],
            [4, 4, 3, 3]
          ];
        }
      } else if (timeSignature === '6/8' || stepsPerBar === 12) {
        rhythmPool = [
          [3, 3, 3, 3],
          [6, 6],
          [2, 2, 2, 2, 2, 2],
          [4, 2, 4, 2]
        ];
      } else if (timeSignature === '5/8' || stepsPerBar === 10) {
        rhythmPool = [
          [3, 2, 3, 2],
          [2, 3, 2, 3],
          [6, 4],
          [2, 2, 2, 2, 2]
        ];
      } else {
        if (density < 45) {
          rhythmPool = [
            [16],
            [12, 4],
            [8, 8],
            [8, 4, 4],
            [6, 2, 8]
          ];
        } else if (density >= 80) {
          rhythmPool = [
            [2, 2, 2, 2, 2, 2, 2, 2],
            [2, 2, 4, 2, 2, 4],
            [3, 1, 3, 1, 4, 4],
            [2, 2, 2, 2, 4, 4],
            [4, 2, 2, 2, 2, 4]
          ];
        } else {
          if (totalSteps <= 16) rhythmPool = PHRASE_RHYTHMS['1bar'];
          else if (totalSteps <= 32) rhythmPool = PHRASE_RHYTHMS['2bars'];
          else rhythmPool = PHRASE_RHYTHMS['4bars'];
        }
      }

      const blueprint = [];
      let currentScaleIndex = Math.floor(scaleNotes.length * 0.45);
      const homeIndex = currentScaleIndex;
      const loIdx = Math.max(0, homeIndex - 4);
      const hiIdx = Math.min(scaleNotes.length - 1, homeIndex + 5);
      let stepOffset = 0;
      const chaosFactor = chaosLevel / 100;
      let leapsUsed = 0;

      while (stepOffset < totalSteps) {
        const chosenRhythm = this.rng.choice(rhythmPool) || [4, 4, 4, 4];
        for (let i = 0; i < chosenRhythm.length; i++) {
          const dur = chosenRhythm[i];
          const isDownbeat = (stepOffset % stepsPerBar === 0 || stepOffset % (stepsPerBar / 2) === 0);

          if (blueprint.length === 0) {
            currentScaleIndex = homeIndex;
          } else if (leapsUsed < 1 && blueprint.length >= 2 && this.rng.chance(0.3 + chaosFactor * 0.3)) {
            const leapDelta = this.rng.choice([-4, -3, 3, 4, -2, 2]);
            currentScaleIndex = Math.max(loIdx, Math.min(hiIdx, currentScaleIndex + leapDelta));
            leapsUsed++;
          } else {
            const stepDelta = this.rng.choice([-1, 1, -1, 1, 0, 1, -1, 2, -2]);
            currentScaleIndex = Math.max(loIdx, Math.min(hiIdx, currentScaleIndex + stepDelta));
          }

          blueprint.push({
            stepOffset,
            durationSteps: dur,
            scaleIndex: currentScaleIndex,
            isDownbeat
          });

          stepOffset += dur;
          if (stepOffset >= totalSteps) break;
          if (!isDownbeat && this.rng.chance(0.12)) stepOffset += 1;
        }
      }
      if (blueprint.length >= 2) {
        const cands = [homeIndex - 2, homeIndex, homeIndex + 2, homeIndex + 4].filter(v => v >= loIdx && v <= hiIdx);
        const pool = cands.length ? cands : [homeIndex];
        blueprint[blueprint.length - 1].scaleIndex = pool.reduce((a, b) => Math.abs(b - homeIndex) < Math.abs(a - homeIndex) ? b : a);
      }

      return blueprint;
    }


    _generateChordTrack(ctx) {
      const { progression, genreDef, lengthBars, timeSignature = '4/4', stepsPerBar = 16, section, climaxCurve, density = 100, velocityBoost, humanize } = ctx;
      const notes = [];
      const voicedProgression = Theory.optimizeVoiceLeading ? Theory.optimizeVoiceLeading(progression) : progression;

      const startBar = Math.max(0, ctx.barStart || 0);
      const endBar = (ctx.barEnd == null || ctx.barEnd < 0) ? (lengthBars - 1) : Math.min(lengthBars - 1, ctx.barEnd);
      for (let bar = startBar; bar <= endBar; bar++) {
        const chord = voicedProgression[bar] || voicedProgression[0];
        const Vch = (ctx.variation && ctx.variation.chords != null) ? ctx.variation.chords : 0.7;
        let chordTones = (chord.voicedNotes || chord.notes).slice();
        const inv = this._variant(3, Vch);
        if (inv === 1 && chordTones.length >= 2) {
          chordTones[0] += 12;
          chordTones.sort((a, b) => a - b);
        } else if (inv === 2 && chordTones.length >= 3) {
          chordTones.splice(1, 1);
        }
        if (this._vChance(0.3, Vch) && chord.notes.length >= 3) {
          const ninth = chord.rootMidi + 14;
          if (ninth <= 84) chordTones = chordTones.concat([ninth]);
        }
        const barStartStep = bar * stepsPerBar;
        const climaxFactor = this._getClimaxFactor(bar, lengthBars, climaxCurve);
        const phrasePos = bar % 4; // 4-bar phrase structure

        let chopSteps = [];

        if (genreDef.id === 'sasakure_uk' || timeSignature === '7/8' || stepsPerBar === 14) {
          if (phrasePos === 0) {
            chopSteps = [0, 6, 10]; // Main Anchor Groove
          } else if (phrasePos === 1) {
            chopSteps = [2, 6, 9, 12]; // Offbeat Anticipation Push
          } else if (phrasePos === 2) {
            chopSteps = [0, 3, 6, 9, 12]; // Driving Math-Rock Energy Build
          } else {
            chopSteps = [0, 4]; // Cadence Stop (Leaving space for bass/lead fill!)
          }
        } else if (genreDef.id === 'synthwave' || genreDef.id === 'edm') {
          if (phrasePos === 3) {
            chopSteps = [0, 4, 8, 11, 14]; // Turnaround Build
          } else {
            chopSteps = (phrasePos % 2 === 0) ? [0, 4, 8, 12] : [2, 6, 10, 14];
          }
        } else if (genreDef.id === 'lofi') {
          chopSteps = (phrasePos % 2 === 0) ? [0, Math.floor(stepsPerBar * 0.62)] : [Math.floor(stepsPerBar * 0.25), Math.floor(stepsPerBar * 0.75)];
        } else if (genreDef.id === 'fiery_piano' || genreDef.id === 'touhou') {
          if (phrasePos === 0) chopSteps = [0, 4, 8, 12];
          else if (phrasePos === 1) chopSteps = [2, 6, 10, 14];
          else if (phrasePos === 2) chopSteps = [0, 3, 6, 9, 12, 14];
          else chopSteps = [0, 4, 8];
        } else {
          chopSteps = [0];
        }

        let chops = chopSteps;
        const chPat = this._variant(3, Vch);
        if (chPat === 1) {
          chops = chopSteps.map(s => s + 1).filter(s => s < stepsPerBar);
          if (!chops.length) chops = chopSteps;
        } else if (chPat === 2) {
          chops = chopSteps.filter((_, i) => i % 2 === 0);
          if (!chops.length) chops = chopSteps;
        }
        const downStrum = !(chordTones.length > 2 && this._vChance(0.4, Vch));
        const ordered = downStrum ? chordTones : chordTones.slice().reverse();

        for (const stepOffset of chops) {
          if (stepOffset >= stepsPerBar) continue;
          if (stepOffset !== 0 && this.rng.range(0, 100) > density) continue;
          let strumOffset = 0;

          for (const midi of ordered) {
            const isAccented = (stepOffset === 0 || stepOffset === Math.floor(stepsPerBar / 2));
            const baseVel = Math.round((isAccented ? 92 : 80) * (0.7 + 0.35 * climaxFactor)) + velocityBoost;
            const dur = (chops.length > 2) ? 2 : (stepsPerBar - stepOffset);

            notes.push({
              step: barStartStep + stepOffset,
              duration: Math.max(1, Math.min(stepsPerBar - stepOffset, dur)),
              midi,
              velocity: Math.max(30, Math.min(127, humanize ? baseVel + this.rng.rangeInt(-6, 6) : baseVel)),
              strumDelay: strumOffset,
              pan: -15
            });

            strumOffset += 0.015; // Natural human finger roll delay
          }
        }
      }

      return {
        name: 'Harmony & Chords',
        type: 'poly_synth',
        instrument: genreDef.id === 'dark_fantasy' ? 'pipe_organ_lead' : (genreDef.id === 'sasakure_uk' ? 'chiptune_fm_epiano' : 'analog_pad'),
        color: '#9b51e0',
        notes
      };
    }

    _arpVel(base, climaxFactor, velocityBoost, humanize) {
      const v = Math.round(base * (0.7 + 0.35 * climaxFactor)) + velocityBoost;
      return Math.max(30, Math.min(127, humanize ? v + this.rng.rangeInt(-6, 6) : v));
    }

    _arpTrackMeta(instrument) {
      return { name: 'Arpeggio Ostinato', type: 'pluck_synth', instrument, color: '#4facfe' };
    }


    _fitArp(track, progression, stepsPerBar = 16) {
      if (!track || !track.notes) return track;
      for (const n of track.notes) {
        if (n.midi > 93) n.midi = 93;
        if (n.step % stepsPerBar !== 0) continue;
        const bar = Math.floor(n.step / stepsPerBar);
        const chord = (progression && (progression[bar] || progression[0])) || null;
        if (!chord || !chord.notes) continue;
        const pcs = chord.notes.map(x => ((x % 12) + 12) % 12);
        if (pcs.includes(((n.midi % 12) + 12) % 12)) continue;
        let best = n.midi, bd = 99;
        for (let m = n.midi - 6; m <= n.midi + 6; m++) {
          if (pcs.includes(((m % 12) + 12) % 12) && Math.abs(m - n.midi) < bd) {
            bd = Math.abs(m - n.midi);
            best = m;
          }
        }
        n.midi = Math.max(36, Math.min(93, best));
      }
      return track;
    }

    _generateArpChiptune(ctx, startBar, endBar, instrument) {
      const { progression, lengthBars, stepsPerBar = 16, climaxCurve, density = 75, velocityBoost, humanize } = ctx;
      const notes = [];
      for (let bar = startBar; bar <= endBar; bar++) {
        const chord = progression[bar] || progression[0];
        if (!chord.notes || chord.notes.length < 3) continue;
        const pool = [chord.notes[0] + 12, chord.notes[1] + 12, chord.notes[2] + 12, chord.notes[0] + 24];
        const barStartStep = bar * stepsPerBar;
        const climaxFactor = this._getClimaxFactor(bar, lengthBars, climaxCurve);
        const phrasePos = bar % 4;
        for (let s = 0; s < stepsPerBar; s++) {
          let midi = pool[[0, 1, 2, 3, 2, 1][s % 6] % pool.length];
          if (phrasePos === 3 && density > 50 && s >= stepsPerBar - 4) midi += 12; // fill bay len
          notes.push({
            step: barStartStep + s, duration: 1, midi: Math.min(108, midi),
            velocity: this._arpVel((s % 4 === 0) ? 100 : 82, climaxFactor, velocityBoost, humanize), pan: 20
          });
        }
      }
      return Object.assign(this._arpTrackMeta(instrument), { notes });
    }

    _generateArpLofi(ctx, startBar, endBar) {
      const { progression, lengthBars, stepsPerBar = 16, climaxCurve, velocityBoost, humanize } = ctx;
      const notes = [];
      for (let bar = startBar; bar <= endBar; bar++) {
        const chord = progression[bar] || progression[0];
        if (!chord.notes || chord.notes.length < 3) continue;
        const pool = chord.notes.map(n => n + 12);
        const barStartStep = bar * stepsPerBar;
        const climaxFactor = this._getClimaxFactor(bar, lengthBars, climaxCurve);
        const phrasePos = bar % 4;
        const hits = (phrasePos % 2 === 0)
          ? [{ s: 0, d: 5 }, { s: 7, d: 4 }, { s: 11, d: 5 }]
          : [{ s: 2, d: 6 }, { s: 9, d: 4 }];
        hits.forEach((h, hi) => {
          if (h.s >= stepsPerBar) return;
          notes.push({
            step: barStartStep + h.s, duration: Math.min(stepsPerBar - h.s, h.d),
            midi: Math.min(96, pool[hi % pool.length]),
            velocity: this._arpVel(72, climaxFactor, velocityBoost - 8, humanize), pan: 20
          });
        });
      }
      return Object.assign(this._arpTrackMeta('sparkle_arp'), { notes });
    }

    _generateArpSynthwave(ctx, startBar, endBar) {
      const { progression, lengthBars, stepsPerBar = 16, climaxCurve, velocityBoost, humanize } = ctx;
      const notes = [];
      const seq = [0, 0, 1, 0, 2, 0, 3, 2];
      for (let bar = startBar; bar <= endBar; bar++) {
        const chord = progression[bar] || progression[0];
        if (!chord.notes || chord.notes.length < 3) continue;
        const pool = [chord.notes[0] + 12, chord.notes[1] + 12, chord.notes[2] + 12, chord.notes[0] + 24];
        const barStartStep = bar * stepsPerBar;
        const climaxFactor = this._getClimaxFactor(bar, lengthBars, climaxCurve);
        for (let i = 0; i < 8; i++) {
          const s = i * 2;
          if (s >= stepsPerBar) break;
          notes.push({
            step: barStartStep + s, duration: 2, midi: Math.min(108, pool[seq[i] % pool.length]),
            velocity: this._arpVel((s % 4 === 0) ? 100 : 86, climaxFactor, velocityBoost, humanize), pan: 20
          });
        }
      }
      return Object.assign(this._arpTrackMeta('sparkle_arp'), { notes });
    }

    _generateArpEpic(ctx, startBar, endBar) {
      const { progression, lengthBars, stepsPerBar = 16, climaxCurve, velocityBoost, humanize } = ctx;
      const notes = [];
      for (let bar = startBar; bar <= endBar; bar++) {
        const chord = progression[bar] || progression[0];
        if (!chord.notes || chord.notes.length < 3) continue;
        const pool = [chord.notes[0], chord.notes[2], chord.notes[0] + 12, chord.notes[2]];
        const barStartStep = bar * stepsPerBar;
        const climaxFactor = this._getClimaxFactor(bar, lengthBars, climaxCurve);
        for (let i = 0; i < 4; i++) {
          const s = i * 4;
          if (s >= stepsPerBar) break;
          notes.push({
            step: barStartStep + s, duration: Math.min(4, stepsPerBar - s),
            midi: pool[i % pool.length],
            velocity: this._arpVel((i === 0) ? 100 : 86, climaxFactor, velocityBoost, humanize), pan: 20
          });
        }
      }
      return Object.assign(this._arpTrackMeta('sparkle_arp'), { notes });
    }

    _generateArpDoom(ctx, startBar, endBar) {
      const { progression, lengthBars, stepsPerBar = 16, climaxCurve, velocityBoost, humanize } = ctx;
      const notes = [];
      for (let bar = startBar; bar <= endBar; bar++) {
        const chord = progression[bar] || progression[0];
        if (!chord.notes || chord.notes.length < 3) continue;
        const barStartStep = bar * stepsPerBar;
        const climaxFactor = this._getClimaxFactor(bar, lengthBars, climaxCurve);
        const half = Math.floor(stepsPerBar / 2);
        const low = (bar % 2 === 0) ? chord.notes[0] : chord.notes[2];
        notes.push({
          step: barStartStep, duration: Math.min(half, stepsPerBar),
          midi: low, velocity: this._arpVel(92, climaxFactor, velocityBoost, humanize), pan: 20
        });
        if (half < stepsPerBar) {
          notes.push({
            step: barStartStep + half, duration: stepsPerBar - half,
            midi: chord.notes[1], velocity: this._arpVel(80, climaxFactor, velocityBoost, humanize), pan: 20
          });
        }
      }
      return Object.assign(this._arpTrackMeta('sparkle_arp'), { notes });
    }

    _generateArpCyber(ctx, startBar, endBar) {
      const { progression, lengthBars, stepsPerBar = 16, climaxCurve, density = 75, velocityBoost, humanize } = ctx;
      const notes = [];
      for (let bar = startBar; bar <= endBar; bar++) {
        const chord = progression[bar] || progression[0];
        if (!chord.notes || chord.notes.length < 3) continue;
        const pool = [chord.notes[0] + 12, chord.notes[1] + 12, chord.notes[2] + 12, chord.notes[0] + 24];
        const barStartStep = bar * stepsPerBar;
        const climaxFactor = this._getClimaxFactor(bar, lengthBars, climaxCurve);
        for (let s = 0; s < stepsPerBar; s++) {
          let midi = pool[[0, 1, 2, 1][s % 4] % pool.length];
          if (density > 40 && s % 4 === 3) midi -= 1; // chromatic siet vao phach
          notes.push({
            step: barStartStep + s, duration: 1, midi: Math.max(40, Math.min(108, midi)),
            velocity: this._arpVel((s % 4 === 0) ? 96 : 76, climaxFactor, velocityBoost, humanize), pan: 20
          });
        }
      }
      return Object.assign(this._arpTrackMeta('sparkle_arp'), { notes });
    }

    _generateArpAnime(ctx, startBar, endBar) {
      const { progression, lengthBars, stepsPerBar = 16, climaxCurve, velocityBoost, humanize } = ctx;
      const notes = [];
      const seq = [0, 1, 2, 3, 2, 1, 2, 1];
      for (let bar = startBar; bar <= endBar; bar++) {
        const chord = progression[bar] || progression[0];
        if (!chord.notes || chord.notes.length < 3) continue;
        const pool = [chord.notes[0] + 12, chord.notes[1] + 12, chord.notes[2] + 12, chord.notes[0] + 24];
        const barStartStep = bar * stepsPerBar;
        const climaxFactor = this._getClimaxFactor(bar, lengthBars, climaxCurve);
        const phrasePos = bar % 4;
        for (let i = 0; i < 8; i++) {
          const s = i * 2;
          if (s >= stepsPerBar) break;
          notes.push({
            step: barStartStep + s, duration: 2, midi: Math.min(108, pool[seq[i] % pool.length]),
            velocity: this._arpVel((s % 4 === 0) ? 96 : 80, climaxFactor, velocityBoost, humanize), pan: 20
          });
        }
        if (phrasePos === 3) {
          for (let s = stepsPerBar - 4; s < stepsPerBar; s++) {
            const midi = pool[0] + (s - (stepsPerBar - 4)) * 2;
            notes.push({
              step: barStartStep + s, duration: 1, midi: Math.min(108, midi),
              velocity: this._arpVel(88, climaxFactor, velocityBoost, humanize), pan: 20
            });
          }
        }
      }
      return Object.assign(this._arpTrackMeta('sparkle_arp'), { notes });
    }


    _generateArpTrack(ctx) {
      const { progression, scaleNotes, genreDef, lengthBars, timeSignature = '4/4', stepsPerBar = 16, section, climaxCurve, density = 75, chaosLevel = 25, velocityBoost, humanize } = ctx;
      const notes = [];
      const isSasakure = (genreDef.id === 'sasakure_uk');
      const chaosFactor = chaosLevel / 100;

      const gid = genreDef.id;
      const arpStart = Math.max(0, ctx.barStart || 0);
      const arpEnd = (ctx.barEnd == null || ctx.barEnd < 0) ? (lengthBars - 1) : Math.min(lengthBars - 1, ctx.barEnd);
      const VV = (ctx.variation && ctx.variation.arp != null) ? ctx.variation.arp : 0.7;
      const fitVary = (t) => this._varyArp(this._fitArp(t, progression, stepsPerBar), stepsPerBar, VV);
      if (gid === 'chiptune') return fitVary(this._generateArpChiptune(ctx, arpStart, arpEnd, 'sparkle_arp'));
      if (gid === 'sasakure_uk') return fitVary(this._generateArpChiptune(ctx, arpStart, arpEnd, 'grand_piano_lead'));
      if (gid === 'lofi') return fitVary(this._generateArpLofi(ctx, arpStart, arpEnd));
      if (gid === 'synthwave') return fitVary(this._generateArpSynthwave(ctx, arpStart, arpEnd));
      if (gid === 'dark_fantasy') return fitVary(this._generateArpDoom(ctx, arpStart, arpEnd));
      if (gid === 'epic' || gid === 'cinematic') return fitVary(this._generateArpEpic(ctx, arpStart, arpEnd));
      if (gid === 'cyberpunk') return fitVary(this._generateArpCyber(ctx, arpStart, arpEnd));
      if (gid === 'anime') return fitVary(this._generateArpAnime(ctx, arpStart, arpEnd));

      const startBar = Math.max(0, ctx.barStart || 0);
      const endBar = (ctx.barEnd == null || ctx.barEnd < 0) ? (lengthBars - 1) : Math.min(lengthBars - 1, ctx.barEnd);
      for (let bar = startBar; bar <= endBar; bar++) {
        const chord = progression[bar] || progression[0];
        const chordPcs = chord.notes.map(n => n % 12);
        const arpPool = scaleNotes.filter(n => chordPcs.includes(n % 12));
        if (arpPool.length === 0) continue;

        const barStartStep = bar * stepsPerBar;
        const climaxFactor = this._getClimaxFactor(bar, lengthBars, climaxCurve);
        const phrasePos = bar % 4; // 4-bar phrase evolution

        let waveStrategy = 'single_peak_wave';
        if (isSasakure || genreDef.id === 'fiery_piano' || genreDef.id === 'touhou') {
          if (phrasePos === 0) waveStrategy = 'single_peak_wave';
          else if (phrasePos === 1) waveStrategy = 'double_ripple_wave';
          else if (phrasePos === 2) waveStrategy = 'ascending_cascade';
          else waveStrategy = 'waterfall_fill';
        } else {
          const strategies = ['single_peak_wave', 'double_ripple_wave', 'alberti_syncopated', 'ascending_cascade'];
          waveStrategy = strategies[phrasePos % strategies.length];
        }

        const poolLen = arpPool.length;

        for (let stepInBar = 0; stepInBar < stepsPerBar; stepInBar++) {
          const isKeyDownbeat = (stepInBar === 0);
          if (!isKeyDownbeat && this.rng.range(0, 100) > density) continue;

          let targetMidi;
          let isAccent = (stepInBar === 0 || stepInBar === Math.floor(stepsPerBar / 2) || stepInBar === Math.floor(stepsPerBar * 0.75));

          if (waveStrategy === 'single_peak_wave') {
            const halfBar = Math.floor(stepsPerBar / 2) || 1;
            const progress = stepInBar <= halfBar ? (stepInBar / halfBar) : ((stepsPerBar - stepInBar) / (stepsPerBar - halfBar));
            const poolIdx = Math.min(poolLen - 1, Math.floor(progress * poolLen));
            targetMidi = arpPool[poolIdx];
            if (progress > 0.7) targetMidi += 12; // Octave lift at peak!
          } else if (waveStrategy === 'double_ripple_wave') {
            const cycleSteps = Math.floor(stepsPerBar / 2) || 1;
            const posInCycle = stepInBar % cycleSteps;
            const progress = posInCycle < (cycleSteps / 2) ? (posInCycle / (cycleSteps / 2)) : ((cycleSteps - posInCycle) / (cycleSteps / 2));
            const poolIdx = Math.min(poolLen - 1, Math.floor(progress * poolLen));
            targetMidi = arpPool[poolIdx];
            if (stepInBar >= cycleSteps) targetMidi += 12;
          } else if (waveStrategy === 'ascending_cascade') {
            const progress = stepInBar / stepsPerBar;
            const rawIdx = Math.floor(progress * poolLen * 2);
            const poolIdx = rawIdx % poolLen;
            const octaveShift = Math.floor(rawIdx / poolLen) * 12;
            targetMidi = Math.min(108, arpPool[poolIdx] + octaveShift);
            isAccent = (stepInBar % 3 === 0);
          } else if (waveStrategy === 'waterfall_fill') {
            const progress = (stepsPerBar - 1 - stepInBar) / stepsPerBar;
            const rawIdx = Math.floor(progress * poolLen * 1.8);
            const poolIdx = rawIdx % poolLen;
            const octaveShift = Math.floor(rawIdx / poolLen) * 12;
            targetMidi = Math.min(108, arpPool[poolIdx] + octaveShift);
          } else {
            const albertiOrder = [0, 2 % poolLen, 1 % poolLen, 2 % poolLen];
            const poolIdx = albertiOrder[stepInBar % 4];
            targetMidi = arpPool[poolIdx];
          }

          if (density >= 60 && this.rng.chance(chaosFactor * 0.25) && !isKeyDownbeat) {
            const chromaticShift = this.rng.choice([-1, 1]);
            targetMidi = Math.max(48, Math.min(93, targetMidi + chromaticShift));
          }

          const baseVel = Math.round((isAccent ? 98 : 78) * (0.7 + 0.35 * climaxFactor)) + velocityBoost;

          notes.push({
            step: barStartStep + stepInBar,
            duration: 1,
            midi: targetMidi,
            velocity: Math.max(30, Math.min(127, humanize ? baseVel + this.rng.rangeInt(-6, 6) : baseVel)),
            pan: 20
          });
        }
      }

      return this._varyArp(this._fitArp({
        name: 'Arpeggio Ostinato',
        type: 'pluck_synth',
        instrument: isSasakure ? 'grand_piano_lead' : 'sparkle_arp',
        color: '#4facfe',
        notes
      }, progression, stepsPerBar), stepsPerBar, VV);
    }


    _generateBassTrack(ctx) {
      const { progression, scaleNotes, genreDef, lengthBars, timeSignature = '4/4', stepsPerBar = 16, section, climaxCurve, density = 75, chaosLevel = 25, velocityBoost, humanize } = ctx;
      const Vb = (ctx.variation && ctx.variation.bass != null) ? ctx.variation.bass : 0.7;
      const notes = [];
      const chaosFactor = chaosLevel / 100;

      const startBar = Math.max(0, ctx.barStart || 0);
      const endBar = (ctx.barEnd == null || ctx.barEnd < 0) ? (lengthBars - 1) : Math.min(lengthBars - 1, ctx.barEnd);
      for (let bar = startBar; bar <= endBar; bar++) {
        const chord = progression[bar] || progression[0];
        const nextChord = progression[(bar + 1) % lengthBars] || chord;
        const rootPitchClass = chord.rootMidi % 12;
        const nextRootPitchClass = nextChord.rootMidi % 12;

        let rootMidi = 36 + rootPitchClass; // Sub-bass root (C2 range)
        
        if (this._vChance(chaosFactor * 0.6, Vb) && chord.notes.length >= 3) {
          const invChoice = this.rng.choice([chord.notes[1], chord.notes[2]]);
          rootMidi = 36 + (invChoice % 12);
        }

        const fifthMidi = rootMidi + 7;
        const octaveMidi = rootMidi + 12;
        const decimaMidi = rootMidi + (chord.chordType === 'min' ? 15 : 16); // 10th (Decima)
        const subOctaveMidi = Math.max(24, rootMidi - 12); // Deep Sub C1 bass!

        const barStartStep = bar * stepsPerBar;
        const climaxFactor = this._getClimaxFactor(bar, lengthBars, climaxCurve);
        const phrasePos = bar % 4; // 4-bar phrase structure

        let bassEvents = [];

        if (timeSignature === '7/8' || stepsPerBar === 14) {
          if (phrasePos === 0) {
            bassEvents = [
              { s: 0, dur: 3, m: subOctaveMidi },
              { s: 3, dur: 3, m: rootMidi },
              { s: 6, dur: 2, m: fifthMidi },
              { s: 8, dur: 3, m: octaveMidi },
              { s: 11, dur: 3, m: rootMidi }
            ];
          } else if (phrasePos === 1) {
            bassEvents = [
              { s: 0, dur: 2, m: rootMidi },
              { s: 2, dur: 2, m: fifthMidi },
              { s: 4, dur: 3, m: decimaMidi },
              { s: 7, dur: 3, m: octaveMidi },
              { s: 10, dur: 2, m: fifthMidi },
              { s: 12, dur: 2, m: rootMidi }
            ];
          } else if (phrasePos === 2) {
            bassEvents = [
              { s: 0, dur: 2, m: subOctaveMidi },
              { s: 2, dur: 2, m: rootMidi },
              { s: 4, dur: 2, m: fifthMidi },
              { s: 6, dur: 2, m: octaveMidi },
              { s: 8, dur: 2, m: decimaMidi },
              { s: 10, dur: 2, m: octaveMidi },
              { s: 12, dur: 2, m: fifthMidi }
            ];
          } else {
            const nextRootMidi = 36 + nextRootPitchClass;
            const approachNote = (nextRootMidi > rootMidi) ? (nextRootMidi - 1) : (nextRootMidi + 1); // Chromatic leading tone

            bassEvents = [
              { s: 0, dur: 3, m: subOctaveMidi },
              { s: 3, dur: 3, m: rootMidi },
              { s: 6, dur: 2, m: fifthMidi },
              { s: 8, dur: 2, m: octaveMidi },
              { s: 10, dur: 2, m: fifthMidi },
              { s: 12, dur: 2, m: approachNote } // Chromatic approach leading into Bar 1!
            ];
          }
        } else {
          if (density < 40) {
            bassEvents = [
              { s: 0, dur: Math.floor(stepsPerBar * 0.5), m: subOctaveMidi },
              { s: Math.floor(stepsPerBar * 0.5), dur: Math.floor(stepsPerBar * 0.5), m: (phrasePos === 3 ? fifthMidi : rootMidi) }
            ];
          } else if (genreDef.id === 'touhou') {
            const rising = nextRootPitchClass !== rootPitchClass;
            if (rising && phrasePos !== 3) {
              const target = 36 + nextRootPitchClass + 12;
              for (let q = 0; q < 4; q++) {
                const s = q * 4;
                if (s >= stepsPerBar) break;
                const raw = rootMidi + Math.round(((target - rootMidi) * q) / 3);
                bassEvents.push({ s, dur: 3, m: this._findClosestNote(scaleNotes, raw) });
              }
            } else {
              for (let i = 0; i < 8; i++) {
                const s = i * 2;
                if (s >= stepsPerBar) break;
                bassEvents.push({ s, dur: 1, m: rootMidi });
              }
              if (density >= 50 && this.rng.chance(0.7)) {
                for (const os of [2, 6, 10, 14]) {
                  if (os >= stepsPerBar) continue;
                  bassEvents.push({ s: os, dur: 1, m: octaveMidi });
                }
              }
            }
          } else if (genreDef.id === 'fiery_piano') {
            const minorish = /min/.test(chord.chordType || '') && !/maj/.test(chord.chordType || '');
            const thirdMidi = rootMidi + (minorish ? 3 : 4);
            if (climaxFactor >= 0.88 && density >= 60) {
              for (let s = 0; s < stepsPerBar; s++) {
                bassEvents.push({ s, dur: 1, m: (s % 2 === 0) ? rootMidi : octaveMidi });
              }
            } else if (phrasePos % 2 === 0) {
              bassEvents.push({ s: 0, dur: 3, m: subOctaveMidi });
              for (const ss of [4, 8, 12]) {
                if (ss >= stepsPerBar) continue;
                for (const mm of [rootMidi, thirdMidi, fifthMidi]) {
                  bassEvents.push({ s: ss, dur: 2, m: mm });
                }
              }
            } else {
              for (let i = 0; i < 8; i++) {
                const s = i * 2;
                if (s >= stepsPerBar) break;
                bassEvents.push({ s, dur: 2, m: (i % 2 === 0) ? rootMidi : decimaMidi });
              }
            }
            if (phrasePos === 3) {
              const nextRootMidi = 36 + nextRootPitchClass;
              for (let k = 0; k < 4; k++) {
                const s = stepsPerBar - 4 + k;
                if (s < 0) continue;
                bassEvents.push({ s, dur: 1, m: nextRootMidi - (4 - k) });
              }
            }
          } else if (genreDef.id === 'synthwave') {
            for (let i = 0; i < 8; i++) {
              const s = i * 2;
              if (s >= stepsPerBar) break;
              bassEvents.push({ s, dur: 2, m: (i === 2 || i === 6) ? octaveMidi : rootMidi });
            }
          } else if (genreDef.id === 'lofi') {
            bassEvents = [
              { s: 0, dur: 8, m: (phrasePos % 2 === 0 ? subOctaveMidi : rootMidi) },
              { s: 10, dur: 6, m: (phrasePos % 2 === 0 ? rootMidi : fifthMidi) }
            ];
          } else if (genreDef.id === 'chiptune') {
            const seq = [rootMidi, fifthMidi, octaveMidi, fifthMidi, rootMidi, fifthMidi, octaveMidi, fifthMidi];
            for (let i = 0; i < 8; i++) {
              const s = i * 2;
              if (s >= stepsPerBar) break;
              bassEvents.push({ s, dur: 2, m: seq[i] });
            }
          } else if (genreDef.id === 'dark_fantasy') {
            bassEvents = [{ s: 0, dur: 12, m: subOctaveMidi }];
            if (phrasePos === 3 && stepsPerBar > 12) {
              bassEvents.push({ s: stepsPerBar - 4, dur: 4, m: fifthMidi });
            }
          } else if (genreDef.id === 'epic' || genreDef.id === 'cinematic') {
            const seq = [subOctaveMidi, rootMidi, octaveMidi, fifthMidi];
            for (let i = 0; i < 4; i++) {
              const s = i * 4;
              if (s >= stepsPerBar) break;
              bassEvents.push({ s, dur: 4, m: seq[i] });
            }
          } else if (genreDef.id === 'cyberpunk') {
            for (let i = 0; i < 8; i++) {
              const s = i * 2;
              if (s >= stepsPerBar) break;
              bassEvents.push({ s, dur: 2, m: (i % 4 === 3) ? rootMidi - 1 : rootMidi });
            }
          } else if (genreDef.id === 'anime') {
            const seq = [rootMidi, fifthMidi, octaveMidi, fifthMidi, rootMidi, decimaMidi, octaveMidi, fifthMidi];
            for (let i = 0; i < 8; i++) {
              const s = i * 2;
              if (s >= stepsPerBar) break;
              bassEvents.push({ s, dur: 2, m: seq[i] });
            }
          } else if (phrasePos === 0) {
            bassEvents = [
              { s: 0, dur: 4, m: subOctaveMidi },
              { s: 4, dur: 4, m: fifthMidi },
              { s: 8, dur: 4, m: rootMidi },
              { s: 12, dur: 4, m: octaveMidi }
            ];
          } else if (phrasePos === 1) {
            bassEvents = [
              { s: 0, dur: 3, m: rootMidi },
              { s: 3, dur: 3, m: octaveMidi },
              { s: 6, dur: 2, m: fifthMidi },
              { s: 8, dur: 3, m: rootMidi },
              { s: 11, dur: 3, m: decimaMidi },
              { s: 14, dur: 2, m: fifthMidi }
            ];
          } else if (phrasePos === 2) {
            bassEvents = [
              { s: 0, dur: 2, m: subOctaveMidi },
              { s: 2, dur: 2, m: rootMidi },
              { s: 4, dur: 2, m: fifthMidi },
              { s: 6, dur: 2, m: octaveMidi },
              { s: 8, dur: 2, m: decimaMidi },
              { s: 10, dur: 2, m: octaveMidi },
              { s: 12, dur: 2, m: fifthMidi },
              { s: 14, dur: 2, m: rootMidi }
            ];
          } else {
            const nextRootMidi = 36 + nextRootPitchClass;
            const approachNote = (nextRootMidi > rootMidi) ? (nextRootMidi - 1) : (nextRootMidi + 1);

            bassEvents = [
              { s: 0, dur: 4, m: subOctaveMidi },
              { s: 4, dur: 4, m: fifthMidi },
              { s: 8, dur: 3, m: octaveMidi },
              { s: 11, dur: 3, m: fifthMidi },
              { s: 14, dur: 2, m: approachNote }
            ];
          }
        }

        for (const ev of bassEvents) {
          if (ev.s !== 0 && this._vChance(chaosFactor * 0.5, Vb)) {
            const r = this.rng.range(0, 1);
            if (r < 0.4) ev.m = Math.min(72, ev.m + 12); // octave pop
            else if (r < 0.6 && ev.dur >= 2) ev.dur = Math.max(1, ev.dur - 1); // staccato dot bien
          }
        }
        if (bassEvents.length > 3 && this._vChance(chaosFactor * 0.6, Vb)) {
          const cands = bassEvents.filter(e => e.s !== 0 && e.s + 1 < stepsPerBar);
          if (cands.length) cands[this.rng.rangeInt(0, cands.length - 1)].s += 1; // day tre 1 step
        }
        const barShift = this._variant(4, Vb);
        const octShift = barShift === 1 ? 12 : (barShift === 2 ? -12 : 0);

        for (const ev of bassEvents) {
          if (ev.s >= stepsPerBar) continue;
          const isAccent = (ev.s === 0 || ev.dur >= 3);
          const baseVel = Math.round((isAccent ? 112 : 94) * (0.75 + 0.35 * climaxFactor)) + velocityBoost;

          notes.push({
            step: barStartStep + ev.s,
            duration: Math.min(stepsPerBar - ev.s, ev.dur),
            midi: Math.max(24, Math.min(72, ev.m + octShift)),
            velocity: Math.max(30, Math.min(127, humanize ? baseVel + this.rng.rangeInt(-5, 5) : baseVel)),
            pan: 0
          });
        }
      }

      return {
        name: 'Bassline',
        type: 'mono_bass',
        instrument: genreDef.id === 'sasakure_uk' ? 'grand_piano_lead' : (genreDef.id === 'fiery_piano' ? 'grand_piano_lead' : 'sub_saw_bass'),
        color: '#f39c12',
        notes
      };
    }

    _generateDrumTrack(ctx) {
      const { genreDef, lengthBars, timeSignature = '4/4', stepsPerBar = 16, section, climaxCurve, density, chaosLevel, velocityBoost, humanize } = ctx;
      const Vd = (ctx.variation && ctx.variation.drums != null) ? ctx.variation.drums : 0.7;
      const notes = [];

      const KICK = 36;
      const SNARE = 38;
      const CLAP = 39;
      const CHAT = 42;
      const OHAT = 46;
      const CRASH = 49;
      const TOM_HI = 50;
      const TOM_MID = 47;
      const TOM_LOW = 45;

      const isSasakure = (genreDef.id === 'sasakure_uk');

      const startBar = Math.max(0, ctx.barStart || 0);
      const endBar = (ctx.barEnd == null || ctx.barEnd < 0) ? (lengthBars - 1) : Math.min(lengthBars - 1, ctx.barEnd);
      for (let bar = startBar; bar <= endBar; bar++) {
        const barStartStep = bar * stepsPerBar;
        const isFirstBar = (bar === 0);
        const isFillBar = ((bar + 1) % 4 === 0);
        const isSectionTransition = ((bar + 1) % 8 === 0);
        const climaxFactor = this._getClimaxFactor(bar, lengthBars, climaxCurve);
        const isClimaxPeak = (climaxFactor >= 0.88);

        if (isFirstBar || isSectionTransition || isClimaxPeak) {
          notes.push({ step: barStartStep, duration: 8, midi: CRASH, velocity: Math.min(127, Math.round(112 * climaxFactor) + velocityBoost), pan: 15 });
        }

        if (section === 'intro' || density < 30) {
          notes.push({ step: barStartStep, duration: 2, midi: KICK, velocity: 85, pan: 0 });
          if (density >= 20) {
            notes.push({ step: barStartStep + Math.floor(stepsPerBar / 2), duration: 2, midi: SNARE, velocity: 80, pan: 0 });
          }
          continue;
        }

        if (isSasakure || timeSignature === '7/8') {
          const kickHits = (stepsPerBar === 14) ? [0, 4, 8, 11] : [0, 3, 6, 10];
          const snareHits = (stepsPerBar === 14) ? [6, 12] : [4, 12];

          for (const s of kickHits) {
            notes.push({ step: barStartStep + s, duration: 1, midi: KICK, velocity: Math.min(127, Math.round(118 * climaxFactor) + velocityBoost), pan: 0 });
          }
          for (const s of snareHits) {
            notes.push({ step: barStartStep + s, duration: 1, midi: SNARE, velocity: Math.min(127, Math.round(122 * climaxFactor) + velocityBoost), pan: 0 });
          }

          for (let s = 0; s < stepsPerBar; s++) {
            const isOpen = (s % 4 === 2);
            notes.push({
              step: barStartStep + s,
              duration: 1,
              midi: isOpen ? OHAT : CHAT,
              velocity: Math.min(127, (isOpen ? 95 : (s % 2 === 0 ? 88 : 70)) + velocityBoost),
              pan: -10
            });
          }
        } else if (genreDef.id === 'touhou' || genreDef.id === 'fiery_piano' || genreDef.id === 'dark_fantasy') {
          const kickHits = [0, 3, 6, 8, 10, 14];
          const snareHits = [4, 12];

          for (const s of kickHits) {
            if (s >= stepsPerBar) continue;
            notes.push({ step: barStartStep + s, duration: 1, midi: KICK, velocity: Math.min(127, Math.round(115 * climaxFactor) + velocityBoost), pan: 0 });
          }
          for (const s of snareHits) {
            if (s >= stepsPerBar) continue;
            notes.push({ step: barStartStep + s, duration: 1, midi: SNARE, velocity: Math.min(127, Math.round(120 * climaxFactor) + velocityBoost), pan: 0 });
          }

          const hatStep = density < 60 ? 2 : 1;
          for (let s = 0; s < stepsPerBar; s += hatStep) {
            if (isFillBar && s >= stepsPerBar - 4) continue;
            const isOpen = (s % 4 === 2);
            notes.push({
              step: barStartStep + s,
              duration: 1,
              midi: isOpen ? OHAT : CHAT,
              velocity: Math.min(127, (isOpen ? 95 : (s % 2 === 0 ? 85 : 65)) + velocityBoost),
              pan: -10
            });
          }

          if (isFillBar) {
            const fillPat = this._variant(3, Vd);
            if (fillPat === 1) {
              const toms = [TOM_HI, TOM_MID, TOM_LOW, TOM_LOW];
              for (let fi = 0; fi < 4; fi++) {
                const f = stepsPerBar - 4 + fi;
                notes.push({ step: barStartStep + f, duration: 1, midi: toms[fi % toms.length], velocity: Math.min(127, 100 + fi * 8 + velocityBoost), pan: 0 });
              }
            } else if (fillPat === 2) {
              const seq = [SNARE, KICK, SNARE, SNARE];
              for (let fi = 0; fi < 4; fi++) {
                const f = stepsPerBar - 4 + fi;
                notes.push({ step: barStartStep + f, duration: 1, midi: seq[fi % seq.length], velocity: Math.min(127, 100 + fi * 8 + velocityBoost), pan: 0 });
              }
            } else {
              const fillHits = [stepsPerBar - 4, stepsPerBar - 3, stepsPerBar - 2, stepsPerBar - 1];
              for (let fi = 0; fi < fillHits.length; fi++) {
                const f = fillHits[fi];
                notes.push({ step: barStartStep + f, duration: 1, midi: SNARE, velocity: Math.min(127, 100 + fi * 8 + velocityBoost), pan: 0 });
              }
            }
          }
        } else if (genreDef.id === 'synthwave') {
          for (let s = 0; s < stepsPerBar; s += 4) {
            notes.push({ step: barStartStep + s, duration: 1, midi: KICK, velocity: Math.min(127, 115 + velocityBoost), pan: 0 });
          }
          if (stepsPerBar > 4) {
            notes.push({ step: barStartStep + 4, duration: 1, midi: SNARE, velocity: Math.min(127, 120 + velocityBoost), pan: 0 });
          }
          if (stepsPerBar > 12) {
            notes.push({ step: barStartStep + 12, duration: 1, midi: SNARE, velocity: Math.min(127, 120 + velocityBoost), pan: 0 });
          }
          for (let s = 0; s < stepsPerBar; s += 2) {
            notes.push({ step: barStartStep + s, duration: 1, midi: CHAT, velocity: Math.min(127, 85 + velocityBoost), pan: -10 });
          }
        } else {
          for (let s = 0; s < stepsPerBar; s += 4) {
            notes.push({ step: barStartStep + s, duration: 1, midi: KICK, velocity: Math.min(127, 110 + velocityBoost), pan: 0 });
          }
          if (stepsPerBar > 4) {
            notes.push({ step: barStartStep + 4, duration: 1, midi: SNARE, velocity: Math.min(127, 115 + velocityBoost), pan: 0 });
          }
          if (stepsPerBar > 12) {
            notes.push({ step: barStartStep + 12, duration: 1, midi: SNARE, velocity: Math.min(127, 115 + velocityBoost), pan: 0 });
          }
          for (let s = 0; s < stepsPerBar; s += 2) {
            notes.push({ step: barStartStep + s, duration: 1, midi: CHAT, velocity: Math.min(127, 80 + velocityBoost), pan: -10 });
          }
        }

        if (density >= 50 && ['lofi', 'synthwave', 'anime', 'fiery_piano', 'touhou'].includes(genreDef.id) && this._vChance(0.6, Vd)) {
          const gs = this.rng.choice([2, 6, 10, 14].filter(s => s < stepsPerBar));
          if (gs != null) {
            notes.push({ step: barStartStep + gs, duration: 1, midi: SNARE, velocity: Math.min(90, 48 + velocityBoost), pan: 0 });
          }
        }

        const hasOwnFill = ['touhou', 'fiery_piano', 'dark_fantasy'].includes(genreDef.id);
        if (bar % 8 === 0 && !notes.some(n => n.midi === CRASH && Math.abs(n.step - barStartStep) <= 2)) {
          notes.push({ step: barStartStep, duration: 8, midi: CRASH, velocity: Math.min(127, Math.round(105 * climaxFactor) + velocityBoost), pan: 15 });
        }
        if (((bar + 1) % 8 === 0) && !hasOwnFill && stepsPerBar >= 8) {
          const tomPat = this._variant(2, Vd);
          const toms = [TOM_HI, TOM_MID, TOM_LOW, SNARE];
          for (let f = 0; f < 4; f++) {
            const fs = stepsPerBar - 4 + f;
            const drum = tomPat === 1 ? toms[3 - (f % toms.length)] : toms[f % toms.length];
            notes.push({ step: barStartStep + fs, duration: 1, midi: drum, velocity: Math.min(127, 95 + f * 8 + velocityBoost), pan: 0 });
          }
        }
        if (bar % 8 === 0 && bar !== startBar && this._vChance(0.3, Vd)) {
          const ci = notes.findIndex(n => n.midi === CRASH && n.step === barStartStep);
          if (ci >= 0) notes[ci].step += 1;
        }
      }

      return this._varyDrums({
        name: 'Drums & Percussion',
        type: 'drum_kit',
        instrument: 'standard_kit',
        color: '#e74c3c',
        notes
      }, stepsPerBar, Vd, startBar, endBar, density || 75);
    }


    _applyFadeDynamics(trackList, totalBars, fadeInBars, fadeOutBars, stepsPerBar = 16) {
      if (fadeInBars <= 0 && fadeOutBars <= 0) return;

      const totalSteps = totalBars * stepsPerBar;
      const fadeInSteps = fadeInBars * stepsPerBar;
      const fadeOutStartStep = totalSteps - fadeOutBars * stepsPerBar;

      for (const track of trackList) {
        if (!track || !track.notes) continue;
        for (const note of track.notes) {
          let multiplier = 1.0;

          if (fadeInBars > 0 && note.step < fadeInSteps) {
            multiplier *= Math.max(0.1, note.step / fadeInSteps);
          }

          if (fadeOutBars > 0 && note.step >= fadeOutStartStep) {
            const stepsIntoFadeOut = note.step - fadeOutStartStep;
            const remainingSteps = totalSteps - note.step;
            multiplier *= Math.max(0.05, remainingSteps / (fadeOutBars * stepsPerBar));
          }

          note.velocity = Math.max(25, Math.min(127, Math.round(note.velocity * multiplier)));
        }
      }
    }

    _findClosestNote(scaleNotes, targetMidi) {
      if (!scaleNotes || scaleNotes.length === 0) return targetMidi;
      let closest = scaleNotes[0];
      let minDiff = Math.abs(scaleNotes[0] - targetMidi);

      for (let i = 1; i < scaleNotes.length; i++) {
        const diff = Math.abs(scaleNotes[i] - targetMidi);
        if (diff < minDiff) {
          minDiff = diff;
          closest = scaleNotes[i];
        }
      }
      return closest;
    }
  }

  exports.RMGGenerator = {
    RandomContext,
    MusicGenerator
  };

})(typeof window !== 'undefined' ? window : module.exports);
