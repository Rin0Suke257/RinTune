

(function(exports) {
  'use strict';

  class SynthEngine {
    constructor() {
      this.ctx = null;
      this.masterGain = null;
      this.limiter = null;
      this.reverbNode = null;
      this.analyser = null;

      this.trackBusses = {};
      this.trackStates = {
        lead:   { volume: 0.85, muted: false, solo: false, pan: 0 },
        chords: { volume: 0.70, muted: false, solo: false, pan: -15 },
        arp:    { volume: 0.75, muted: false, solo: false, pan: 15 },
        bass:   { volume: 0.90, muted: false, solo: false, pan: 0 },
        drums:  { volume: 0.95, muted: false, solo: false, pan: 0 }
      };
      this.trackPanners = {};

      this.songData = null;
      this.isPlaying = false;
      this.isPaused = false;
      this.currentStep = 0;
      this.totalSteps = 0;
      this.bpm = 140;
      this.secondsPerStep = 0.1; // (60 / bpm) / 4

      this.lookaheadMs = 25.0; // How frequently to call scheduling function (in milliseconds)
      this.scheduleAheadTime = 0.1; // How far ahead to schedule audio (sec)
      this.nextStepTime = 0.0;
      this.timerId = null;
      this.scheduledStep = 0;
      this.swing = 0; // 0-60 (% tre offbeat 8th, 0 = thang)
      this._offlineRender = false;

      this.onStepChange = null;
      this.onPlaybackEnd = null;

      this.noiseBuffer = null;
    }


    initAudio(force = false) {
      if (!force && this.ctx && this.ctx.state !== 'closed') {
        if (this.ctx.state === 'suspended') {
          this.ctx.resume();
        }
        return;
      }

      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContextClass();

      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.8;

      this.limiter = this.ctx.createDynamicsCompressor();
      this.limiter.threshold.setValueAtTime(-1.0, this.ctx.currentTime);
      this.limiter.knee.setValueAtTime(0.0, this.ctx.currentTime);
      this.limiter.ratio.setValueAtTime(20.0, this.ctx.currentTime);
      this.limiter.attack.setValueAtTime(0.002, this.ctx.currentTime);
      this.limiter.release.setValueAtTime(0.1, this.ctx.currentTime);

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.85, this.ctx.currentTime);

      this.reverbNode = this.ctx.createConvolver();
      this._createReverbImpulse(1.8, 2.5);

      this.reverbGain = this.ctx.createGain();
      this.reverbGain.gain.setValueAtTime(0.22, this.ctx.currentTime);

      this.limiter.connect(this.masterGain);
      this.masterGain.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);

      this.reverbNode.connect(this.reverbGain);
      this.reverbGain.connect(this.limiter);

      const trackKeys = ['lead', 'chords', 'arp', 'bass', 'drums'];
      for (const key of trackKeys) {
        const gainNode = this.ctx.createGain();
        const state = this.trackStates[key];
        gainNode.gain.setValueAtTime(state.volume, this.ctx.currentTime);
        const panner = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;
        if (panner) {
          panner.pan.setValueAtTime((state.pan || 0) / 100, this.ctx.currentTime);
          gainNode.connect(panner);
          panner.connect(this.limiter);
        } else {
          gainNode.connect(this.limiter);
        }

        if (key === 'lead' || key === 'chords' || key === 'arp') {
          const sendGain = this.ctx.createGain();
          sendGain.gain.setValueAtTime(0.35, this.ctx.currentTime);
          gainNode.connect(sendGain);
          sendGain.connect(this.reverbNode);
        }

        this.trackBusses[key] = gainNode;
        this.trackPanners[key] = panner;
      }

      this._generateNoiseBuffer();
    }

    _generateNoiseBuffer() {
      const bufferSize = this.ctx.sampleRate * 2; // 2 seconds of noise
      this.noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
    }

    _createReverbImpulse(duration, decay) {
      const sampleRate = this.ctx.sampleRate;
      const length = sampleRate * duration;
      const impulse = this.ctx.createBuffer(2, length, sampleRate);
      const left = impulse.getChannelData(0);
      const right = impulse.getChannelData(1);

      for (let i = 0; i < length; i++) {
        const n = i / length;
        const envelope = Math.pow(1 - n, decay);
        left[i] = (Math.random() * 2 - 1) * envelope;
        right[i] = (Math.random() * 2 - 1) * envelope;
      }
      this.reverbNode.buffer = impulse;
    }


    loadSong(songData) {
      this.stop();
      this.songData = songData;
      this.bpm = songData.metadata.bpm || 140;
      this.secondsPerStep = (60 / this.bpm) / 4; // 16th note step duration in seconds
      const stepsPerBar = songData.metadata.stepsPerBar || 16;
      this.totalSteps = (songData.metadata.lengthBars || 16) * stepsPerBar;
      this.currentStep = 0;
      this.scheduledStep = 0;
    }


    play() {
      this.initAudio();
      if (!this.songData) return;

      if (this.isPlaying) return;

      this.isPlaying = true;
      this.isPaused = false;
      this.nextStepTime = this.ctx.currentTime + 0.05;
      this.scheduledStep = this.currentStep;

      this.timerId = setInterval(() => this._schedulerLoop(), this.lookaheadMs);
    }


    pause() {
      if (!this.isPlaying) return;
      this.isPlaying = false;
      this.isPaused = true;
      clearInterval(this.timerId);
      this.timerId = null;
    }


    stop() {
      this.isPlaying = false;
      this.isPaused = false;
      this._seekGen = (this._seekGen || 0) + 1; // huy callback cu da schedule
      if (this.timerId) {
        clearInterval(this.timerId);
        this.timerId = null;
      }
      this.currentStep = 0;
      this.scheduledStep = 0;
      if (this.onStepChange) this.onStepChange(0);
    }


    seek(step) {
      this.currentStep = Math.max(0, Math.min(this.totalSteps - 1, step));
      this.scheduledStep = this.currentStep;
      this._seekGen = (this._seekGen || 0) + 1; // huy callback cu da schedule
      if (this.isPlaying) {
        this.nextStepTime = this.ctx.currentTime + 0.02;
      }
      if (this.onStepChange) this.onStepChange(this.currentStep);
    }


    _schedulerLoop() {
      if (!this.isPlaying || !this.songData) return;

      while (this.nextStepTime < this.ctx.currentTime + this.scheduleAheadTime) {
        this._scheduleStep(this.scheduledStep, this.nextStepTime);
        this._advanceStep();
      }
    }

    _advanceStep() {
      this.nextStepTime += this.secondsPerStep;
      this.scheduledStep++;

      if (this.scheduledStep >= this.totalSteps) {
        this.scheduledStep = 0;
      }
    }

    _scheduleStep(stepIndex, time) {
      if (!this.songData || !this.songData.tracks) return;

      let playTime = time;
      if (this.swing > 0 && (stepIndex % 4) === 2) {
        playTime = time + (this.swing / 100) * this.secondsPerStep * 2;
      }

      const delayMs = Math.max(0, (playTime - this.ctx.currentTime) * 1000);
      const gen = this._seekGen || 0;
      setTimeout(() => {
        if (this._offlineRender) return;
        if (this.isPlaying && gen === (this._seekGen || 0)) {
          this.currentStep = stepIndex;
          if (this.onStepChange) this.onStepChange(stepIndex);
        }
      }, delayMs);

      const hasAnySolo = Object.values(this.trackStates).some(s => s.solo);

      for (const [trackKey, track] of Object.entries(this.songData.tracks)) {
        const state = this.trackStates[trackKey];
        if (!state) continue;

        const isAudible = hasAnySolo ? state.solo : !state.muted;
        if (!isAudible) continue;

        const bus = this.trackBusses[trackKey];
        if (!bus) continue;

        const notesAtStep = track.notes.filter(n => Math.round(n.step) === stepIndex);
        for (const note of notesAtStep) {
          const noteDurationSec = note.duration * this.secondsPerStep;
          const velocityRatio = (note.velocity || 90) / 127;
          const noteStartTime = playTime + (note.strumDelay || 0);

          const isPianoTrack = (track.instrument && track.instrument.includes('piano')) || 
                               (track.type === 'piano_track') || 
                               (this.songData.metadata && this.songData.metadata.isPurePiano);

          if (isPianoTrack) {
            this._playAcousticPianoNote(note.midi, noteStartTime, noteDurationSec, velocityRatio, bus, trackKey === 'lead' || trackKey === 'arp');
            continue;
          }

          switch (trackKey) {
            case 'lead':
              this._playLeadSynth(note.midi, noteStartTime, noteDurationSec, velocityRatio, bus, track.instrument);
              break;
            case 'chords':
              this._playChordSynth(note.midi, noteStartTime, noteDurationSec, velocityRatio, bus);
              break;
            case 'arp':
              this._playArpSynth(note.midi, noteStartTime, noteDurationSec, velocityRatio, bus);
              break;
            case 'bass':
              this._playBassSynth(note.midi, noteStartTime, noteDurationSec, velocityRatio, bus, (track.instrument || '').includes('piano'));
              break;
            case 'drums':
              this._playDrumSynth(note.midi, noteStartTime, velocityRatio, bus);
              break;
          }
        }
      }
    }


    _m2f(midi) {
      return 440 * Math.pow(2, (midi - 69) / 12);
    }


    _playAcousticPianoNote(midi, startTime, duration, velocity, busNode, isRightHand = true) {
      const freq = this._m2f(midi);

      const panVal = Math.max(-0.6, Math.min(0.6, ((midi - 60) / 48)));
      const panner = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;
      if (panner) panner.pan.setValueAtTime(panVal, startTime);

      const osc1 = this.ctx.createOscillator();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(freq, startTime);

      const osc2 = this.ctx.createOscillator();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(freq * 2.001, startTime); // Subtle acoustic detuning

      const osc3 = this.ctx.createOscillator();
      osc3.type = 'sine';
      osc3.frequency.setValueAtTime(freq * 3.003, startTime);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.Q.setValueAtTime(1.8, startTime);

      const cutoffFreq = Math.min(18000, freq * (2.8 + Math.pow(velocity, 1.4) * 6.0));
      filter.frequency.setValueAtTime(cutoffFreq, startTime);
      filter.frequency.exponentialRampToValueAtTime(Math.min(12000, freq * 2.2), startTime + 0.08);

      const gainNode = this.ctx.createGain();
      const peakGain = Math.min(0.85, 0.42 * Math.pow(velocity, 1.2));
      const attackTime = 0.003; // Fast mechanical hammer hit
      
      const pitchFactor = Math.max(0.4, Math.min(1.8, (72 - midi) / 24 + 1.0));
      const decayTime = Math.max(0.3, Math.min(2.5, duration * 0.9 * pitchFactor));
      const releaseTime = Math.max(0.12, Math.min(0.35, 0.15 * pitchFactor));

      gainNode.gain.setValueAtTime(0.0001, startTime);
      gainNode.gain.linearRampToValueAtTime(peakGain, startTime + attackTime);
      gainNode.gain.exponentialRampToValueAtTime(Math.max(0.0001, peakGain * 0.55), startTime + attackTime + 0.15);
      gainNode.gain.exponentialRampToValueAtTime(Math.max(0.0001, peakGain * 0.25), startTime + decayTime);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration + releaseTime);

      const gainOsc1 = this.ctx.createGain();
      gainOsc1.gain.setValueAtTime(0.7, startTime);
      const gainOsc2 = this.ctx.createGain();
      gainOsc2.gain.setValueAtTime(0.28 * velocity, startTime);
      const gainOsc3 = this.ctx.createGain();
      gainOsc3.gain.setValueAtTime(0.12 * Math.pow(velocity, 2), startTime);

      osc1.connect(gainOsc1);
      osc2.connect(gainOsc2);
      osc3.connect(gainOsc3);

      gainOsc1.connect(filter);
      gainOsc2.connect(filter);
      gainOsc3.connect(filter);

      filter.connect(gainNode);

      if (panner) {
        gainNode.connect(panner);
        panner.connect(busNode);
      } else {
        gainNode.connect(busNode);
      }

      osc1.start(startTime);
      osc2.start(startTime);
      osc3.start(startTime);

      const stopTime = startTime + duration + releaseTime + 0.05;
      osc1.stop(stopTime);
      osc2.stop(stopTime);
      osc3.stop(stopTime);
    }


    _playLeadSynth(midi, startTime, duration, velocity, busNode, instrumentType) {
      const freq = this._m2f(midi);
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gainNode = this.ctx.createGain();
      const filterNode = this.ctx.createBiquadFilter();

      if (instrumentType === 'grand_piano_lead') {
        osc1.type = 'triangle';
        osc2.type = 'sawtooth';
        osc1.detune.setValueAtTime(-3, startTime);
        osc2.detune.setValueAtTime(3, startTime);

        filterNode.type = 'lowpass';
        filterNode.Q.setValueAtTime(2.0, startTime);
        filterNode.frequency.setValueAtTime(Math.min(16000, freq * (3.5 + 2.5 * velocity)), startTime);
        filterNode.frequency.exponentialRampToValueAtTime(Math.min(6000, freq * 1.5), startTime + 0.15);
      } else if (instrumentType === 'zun_trumpet') {
        osc1.type = 'sawtooth';
        osc2.type = 'square';
        osc1.detune.setValueAtTime(0, startTime);
        osc2.detune.setValueAtTime(7, startTime); // +7 cents chorus

        filterNode.type = 'lowpass';
        filterNode.Q.setValueAtTime(4.5, startTime);
        filterNode.frequency.setValueAtTime(freq * 1.5, startTime);
        filterNode.frequency.exponentialRampToValueAtTime(Math.min(18000, freq * 5.5), startTime + 0.04);
        filterNode.frequency.exponentialRampToValueAtTime(Math.min(18000, freq * 2.2), startTime + duration);
      } else if (instrumentType === 'pipe_organ_lead') {
        osc1.type = 'sawtooth';
        osc2.type = 'triangle';
        osc1.detune.setValueAtTime(-4, startTime);
        osc2.detune.setValueAtTime(4, startTime);

        filterNode.type = 'lowpass';
        filterNode.Q.setValueAtTime(2.2, startTime);
        filterNode.frequency.setValueAtTime(Math.min(14000, freq * 4.0), startTime);
      } else if (instrumentType === 'chiptune_fm_epiano' || instrumentType === 'sparkle_arp') {
        osc1.type = 'triangle';
        osc2.type = 'square';
        osc1.detune.setValueAtTime(-2, startTime);
        osc2.detune.setValueAtTime(1204, startTime); // Octave + 4 cents shimmer

        filterNode.type = 'lowpass';
        filterNode.Q.setValueAtTime(4.0, startTime);
        filterNode.frequency.setValueAtTime(Math.min(18000, freq * (4.0 + 3.0 * velocity)), startTime);
        filterNode.frequency.exponentialRampToValueAtTime(Math.min(9000, freq * 1.8), startTime + 0.12);
      } else if (instrumentType === 'fusion_bright_grand') {
        osc1.type = 'triangle';
        osc2.type = 'sawtooth';
        osc1.detune.setValueAtTime(-4, startTime);
        osc2.detune.setValueAtTime(4, startTime);

        filterNode.type = 'lowpass';
        filterNode.Q.setValueAtTime(2.5, startTime);
        filterNode.frequency.setValueAtTime(Math.min(18000, freq * (5.0 + 2.0 * velocity)), startTime);
        filterNode.frequency.exponentialRampToValueAtTime(Math.min(8000, freq * 2.0), startTime + 0.2);
      } else if (instrumentType === 'square_8bit') {
        osc1.type = 'square';
        osc2.type = 'square';
        osc2.detune.setValueAtTime(5, startTime);
        filterNode.type = 'lowpass';
        filterNode.frequency.setValueAtTime(8000, startTime);
      } else if (instrumentType === 'mellow_epiano') {
        osc1.type = 'triangle';
        osc2.type = 'sine';
        osc1.detune.setValueAtTime(-4, startTime);
        osc2.detune.setValueAtTime(4, startTime);
        filterNode.type = 'lowpass';
        filterNode.Q.setValueAtTime(1.2, startTime);
        filterNode.frequency.setValueAtTime(Math.min(6000, freq * 2.2), startTime);
      } else if (instrumentType === 'distorted_lead') {
        osc1.type = 'sawtooth';
        osc2.type = 'sawtooth';
        osc1.detune.setValueAtTime(-9, startTime);
        osc2.detune.setValueAtTime(9, startTime);
        filterNode.type = 'lowpass';
        filterNode.Q.setValueAtTime(7.0, startTime);
        filterNode.frequency.setValueAtTime(Math.min(14000, freq * 4.5), startTime);
      } else if (instrumentType === 'orchestral_strings') {
        osc1.type = 'sawtooth';
        osc2.type = 'sawtooth';
        osc1.detune.setValueAtTime(-6, startTime);
        osc2.detune.setValueAtTime(6, startTime);
        filterNode.type = 'lowpass';
        filterNode.Q.setValueAtTime(1.0, startTime);
        filterNode.frequency.setValueAtTime(Math.min(9000, freq * 3.0), startTime);
      } else if (instrumentType === 'anime_bell_lead') {
        osc1.type = 'sine';
        osc2.type = 'triangle';
        osc1.detune.setValueAtTime(0, startTime);
        osc2.detune.setValueAtTime(1205, startTime); // Octave + shimmer
        filterNode.type = 'lowpass';
        filterNode.Q.setValueAtTime(3.0, startTime);
        filterNode.frequency.setValueAtTime(Math.min(16000, freq * 5.0), startTime);
      } else {
        osc1.type = 'sawtooth';
        osc2.type = 'sawtooth';
        osc1.detune.setValueAtTime(-5, startTime);
        osc2.detune.setValueAtTime(5, startTime);
        filterNode.type = 'lowpass';
        filterNode.frequency.setValueAtTime(freq * 3.5, startTime);
      }

      osc1.frequency.setValueAtTime(freq, startTime);
      osc2.frequency.setValueAtTime(freq, startTime);

      const lfo = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();
      lfo.frequency.setValueAtTime(5.8, startTime); // 5.8 Hz vibrato
      lfoGain.gain.setValueAtTime(0, startTime);
      lfoGain.gain.setValueAtTime(0, startTime + 0.15); // Vibrato delay
      lfoGain.gain.linearRampToValueAtTime(7, startTime + 0.35); // 7 cents depth
      lfo.connect(lfoGain);
      lfoGain.connect(osc1.detune);
      lfoGain.connect(osc2.detune);

      const attack = 0.015;
      const decay = 0.08;
      const sustain = 0.75;
      const release = 0.06;
      const peakGain = 0.28 * velocity;

      gainNode.gain.setValueAtTime(0.0001, startTime);
      gainNode.gain.linearRampToValueAtTime(peakGain, startTime + attack);
      gainNode.gain.linearRampToValueAtTime(peakGain * sustain, startTime + attack + decay);
      gainNode.gain.setValueAtTime(peakGain * sustain, startTime + duration);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration + release);

      osc1.connect(filterNode);
      osc2.connect(filterNode);
      filterNode.connect(gainNode);
      gainNode.connect(busNode);

      osc1.start(startTime);
      osc2.start(startTime);
      lfo.start(startTime);

      const stopTime = startTime + duration + release + 0.02;
      osc1.stop(stopTime);
      osc2.stop(stopTime);
      lfo.stop(stopTime);
    }


    _playChordSynth(midi, startTime, duration, velocity, busNode) {
      const freq = this._m2f(midi);
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gainNode = this.ctx.createGain();
      const filterNode = this.ctx.createBiquadFilter();

      osc1.type = 'sawtooth';
      osc2.type = 'sawtooth';
      osc1.frequency.setValueAtTime(freq, startTime);
      osc2.frequency.setValueAtTime(freq, startTime);
      osc1.detune.setValueAtTime(-9, startTime);
      osc2.detune.setValueAtTime(9, startTime);

      filterNode.type = 'lowpass';
      filterNode.Q.setValueAtTime(1.8, startTime);
      filterNode.frequency.setValueAtTime(Math.min(8000, freq * 3.0), startTime);

      const attack = 0.06;
      const release = 0.12;
      const peakGain = 0.13 * velocity;

      gainNode.gain.setValueAtTime(0.0001, startTime);
      gainNode.gain.linearRampToValueAtTime(peakGain, startTime + attack);
      gainNode.gain.setValueAtTime(peakGain * 0.85, startTime + duration);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration + release);

      osc1.connect(filterNode);
      osc2.connect(filterNode);
      filterNode.connect(gainNode);
      gainNode.connect(busNode);

      osc1.start(startTime);
      osc2.start(startTime);

      const stopTime = startTime + duration + release + 0.02;
      osc1.stop(stopTime);
      osc2.stop(stopTime);
    }


    _playArpSynth(midi, startTime, duration, velocity, busNode) {
      const freq = this._m2f(midi);
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gainNode = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, startTime);

      filter.type = 'lowpass';
      filter.Q.setValueAtTime(6.0, startTime);
      filter.frequency.setValueAtTime(Math.min(12000, freq * 6.0), startTime);
      filter.frequency.exponentialRampToValueAtTime(Math.min(4000, freq * 1.5), startTime + 0.12);

      const peakGain = 0.18 * velocity;
      gainNode.gain.setValueAtTime(0.0001, startTime);
      gainNode.gain.linearRampToValueAtTime(peakGain, startTime + 0.005);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + Math.min(0.25, duration + 0.05));

      osc.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(busNode);

      osc.start(startTime);
      osc.stop(startTime + 0.3);
    }


    _playBassSynth(midi, startTime, duration, velocity, busNode, bright = false) {
      const freq = this._m2f(midi);
      const subOsc = this.ctx.createOscillator();
      const sawOsc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gainNode = this.ctx.createGain();

      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(freq, startTime);

      sawOsc.type = bright ? 'triangle' : 'sawtooth';
      sawOsc.frequency.setValueAtTime(freq, startTime);

      filter.type = 'lowpass';
      filter.Q.setValueAtTime(bright ? 1.5 : 3.0, startTime);
      filter.frequency.setValueAtTime(freq * (bright ? 2.2 : 3.5), startTime);
      filter.frequency.exponentialRampToValueAtTime(freq * 1.2, startTime + 0.1);

      const peakGain = (bright ? 0.24 : 0.32) * velocity;
      gainNode.gain.setValueAtTime(0.0001, startTime);
      gainNode.gain.linearRampToValueAtTime(peakGain, startTime + 0.008);
      gainNode.gain.setValueAtTime(peakGain * 0.9, startTime + duration);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration + 0.05);

      subOsc.connect(gainNode);
      sawOsc.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(busNode);

      subOsc.start(startTime);
      sawOsc.start(startTime);

      const stopTime = startTime + duration + 0.07;
      subOsc.stop(stopTime);
      sawOsc.stop(stopTime);
    }


    _playDrumSynth(midi, startTime, velocity, busNode) {
      switch (midi) {
        case 36: // KICK
          this._synthKick(startTime, velocity, busNode);
          break;
        case 38: // SNARE
        case 39: // CLAP
          this._synthSnare(startTime, velocity, busNode, midi === 39);
          break;
        case 42: // CLOSED HI-HAT
          this._synthHiHat(startTime, velocity, busNode, false);
          break;
        case 46: // OPEN HI-HAT
          this._synthHiHat(startTime, velocity, busNode, true);
          break;
        case 49: // CRASH CYMBAL
          this._synthCrash(startTime, velocity, busNode);
          break;
        case 45: // TOM LOW
        case 47: // TOM MID
        case 50: // TOM HI
          this._synthTom(startTime, velocity, busNode, midi);
          break;
        default:
          this._synthHiHat(startTime, velocity, busNode, false);
          break;
      }
    }

    _synthKick(startTime, velocity, busNode) {
      const osc = this.ctx.createOscillator();
      const gainNode = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(155, startTime);
      osc.frequency.exponentialRampToValueAtTime(45, startTime + 0.075);

      const peakGain = 0.55 * velocity;
      gainNode.gain.setValueAtTime(peakGain, startTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + 0.28);

      osc.connect(gainNode);
      gainNode.connect(busNode);

      osc.start(startTime);
      osc.stop(startTime + 0.3);
    }

    _synthSnare(startTime, velocity, busNode, isClap) {
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(180, startTime);
      osc.frequency.exponentialRampToValueAtTime(80, startTime + 0.05);

      oscGain.gain.setValueAtTime(0.28 * velocity, startTime);
      oscGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.12);
      osc.connect(oscGain);
      oscGain.connect(busNode);

      osc.start(startTime);
      osc.stop(startTime + 0.15);

      if (this.noiseBuffer) {
        const noise = this.ctx.createBufferSource();
        noise.buffer = this.noiseBuffer;
        const filter = this.ctx.createBiquadFilter();
        const noiseGain = this.ctx.createGain();

        filter.type = isClap ? 'bandpass' : 'highpass';
        filter.frequency.setValueAtTime(isClap ? 1200 : 1500, startTime);
        if (isClap) filter.Q.setValueAtTime(2.0, startTime);

        noiseGain.gain.setValueAtTime(0.32 * velocity, startTime);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, startTime + (isClap ? 0.22 : 0.18));

        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(busNode);

        noise.start(startTime);
        noise.stop(startTime + 0.25);
      }
    }

    _synthHiHat(startTime, velocity, busNode, isOpen) {
      if (!this.noiseBuffer) return;
      const noise = this.ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;
      const filter = this.ctx.createBiquadFilter();
      const gainNode = this.ctx.createGain();

      filter.type = 'highpass';
      filter.frequency.setValueAtTime(7500, startTime);

      const duration = isOpen ? 0.35 : 0.05;
      const peakGain = (isOpen ? 0.22 : 0.18) * velocity;

      gainNode.gain.setValueAtTime(peakGain, startTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      noise.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(busNode);

      noise.start(startTime);
      noise.stop(startTime + duration + 0.02);
    }

    _synthCrash(startTime, velocity, busNode) {
      if (!this.noiseBuffer) return;
      const noise = this.ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;
      const filter = this.ctx.createBiquadFilter();
      const gainNode = this.ctx.createGain();

      filter.type = 'highpass';
      filter.frequency.setValueAtTime(5000, startTime);

      gainNode.gain.setValueAtTime(0.28 * velocity, startTime);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + 1.6);

      noise.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(busNode);

      noise.start(startTime);
      noise.stop(startTime + 1.7);
    }

    _synthTom(startTime, velocity, busNode, midi) {
      const osc = this.ctx.createOscillator();
      const gainNode = this.ctx.createGain();
      const baseFreq = midi === 50 ? 150 : (midi === 47 ? 115 : 85);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(baseFreq * 1.5, startTime);
      osc.frequency.exponentialRampToValueAtTime(baseFreq, startTime + 0.08);

      gainNode.gain.setValueAtTime(0.35 * velocity, startTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + 0.22);

      osc.connect(gainNode);
      gainNode.connect(busNode);

      osc.start(startTime);
      osc.stop(startTime + 0.25);
    }


    setTrackVolume(trackKey, volume) {
      if (this.trackStates[trackKey]) {
        this.trackStates[trackKey].volume = volume;
        if (this.trackBusses[trackKey] && this.ctx) {
          this.trackBusses[trackKey].gain.setValueAtTime(volume, this.ctx.currentTime);
        }
      }
    }

    setTrackPan(trackKey, pan) {
      const v = Math.max(-100, Math.min(100, pan | 0));
      if (this.trackStates[trackKey]) {
        this.trackStates[trackKey].pan = v;
        if (this.trackPanners[trackKey] && this.ctx) {
          this.trackPanners[trackKey].pan.setValueAtTime(v / 100, this.ctx.currentTime);
        }
      }
    }

    getTrackMix() {
      const out = {};
      for (const [k, s] of Object.entries(this.trackStates)) {
        out[k] = { volume: s.volume, muted: !!s.muted, solo: !!s.solo, pan: (s.pan | 0) };
      }
      return out;
    }

    toggleMute(trackKey) {
      if (this.trackStates[trackKey]) {
        this.trackStates[trackKey].muted = !this.trackStates[trackKey].muted;
        return this.trackStates[trackKey].muted;
      }
      return false;
    }

    toggleSolo(trackKey) {
      if (this.trackStates[trackKey]) {
        this.trackStates[trackKey].solo = !this.trackStates[trackKey].solo;
        return this.trackStates[trackKey].solo;
      }
      return false;
    }

    setMasterVolume(vol) {
      if (this.masterGain && this.ctx) {
        this.masterGain.gain.setValueAtTime(vol, this.ctx.currentTime);
      }
    }

    setSwing(pct) {
      this.swing = Math.max(0, Math.min(60, pct | 0));
    }


    async renderOffline(songData, tailSec = 2) {
      if (typeof OfflineAudioContext === 'undefined') {
        throw new Error('Trinh duyet khong ho tro OfflineAudioContext');
      }
      const md = songData.metadata || {};
      const stepsPerBar = md.stepsPerBar || 16;
      const totalSteps = (md.lengthBars || 8) * stepsPerBar;
      const secPerStep = (60 / (md.bpm || 120)) / 4;
      const saveSong = this.songData;
      const saveBpm = this.bpm;
      const saveSec = this.secondsPerStep;
      const saveTotal = this.totalSteps;
      const prevCtx = this.ctx;
      const prevBusses = this.trackBusses;
      const prevPanners = this.trackPanners;
      const prevNoise = this.noiseBuffer;
      const prevAnalyser = this.analyser;
      const prevLimiter = this.limiter;
      const prevMaster = this.masterGain;
      const prevReverb = this.reverbNode;
      const prevReverbGain = this.reverbGain;

      const sr = 44100;
      const off = new OfflineAudioContext(2, Math.ceil(sr * (totalSteps * secPerStep + tailSec)), sr);
      this.ctx = off;
      this.trackBusses = {};
      this.trackPanners = {};
      this._offlineRender = true;
      try {
        this.initAudio(true);
        this.songData = songData;
        this.bpm = md.bpm || 120;
        this.secondsPerStep = secPerStep;
        this.totalSteps = totalSteps;
        for (let step = 0; step < totalSteps; step++) {
          this._scheduleStep(step, step * secPerStep);
        }
        const buf = await off.startRendering();
        return buf;
      } finally {
        this.ctx = prevCtx;
        this.trackBusses = prevBusses;
        this.trackPanners = prevPanners;
        this.noiseBuffer = prevNoise;
        this.analyser = prevAnalyser;
        this.limiter = prevLimiter;
        this.masterGain = prevMaster;
        this.reverbNode = prevReverb;
        this.reverbGain = prevReverbGain;
        this.songData = saveSong;
        this.bpm = saveBpm;
        this.secondsPerStep = saveSec;
        this.totalSteps = saveTotal;
        this._offlineRender = false;
      }
    }


    getSpectrumData() {
      if (!this.analyser) return new Uint8Array(0);
      const data = new Uint8Array(this.analyser.frequencyBinCount);
      this.analyser.getByteFrequencyData(data);
      return data;
    }
  }

  exports.RMGSynth = {
    SynthEngine
  };

})(typeof window !== 'undefined' ? window : module.exports);
