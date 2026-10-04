

(function(exports) {
  'use strict';

  const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const ENHARMONIC = {
    'Db': 'C#', 'Eb': 'D#', 'Gb': 'F#', 'Ab': 'G#', 'Bb': 'A#'
  };

  function normalizeNote(name) {
    if (!name) return 'C';
    const clean = name.trim();
    return ENHARMONIC[clean] || clean;
  }

  function noteToMidi(noteName, octave = 4) {
    const norm = normalizeNote(noteName);
    const index = NOTE_NAMES.indexOf(norm);
    if (index === -1) return 60; // Default Middle C
    return (octave + 1) * 12 + index;
  }

  function midiToNote(midi) {
    const clamped = Math.max(0, Math.min(127, Math.round(midi)));
    const note = NOTE_NAMES[clamped % 12];
    const octave = Math.floor(clamped / 12) - 1;
    return { name: note, octave, fullName: `${note}${octave}`, midi: clamped };
  }

  function midiToFreq(midi) {
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  const SCALES = {
    'touhou_yonanuki': {
      name: 'Touhou Yonanuki Minor (ZUN Signature)',
      intervals: [0, 2, 3, 7, 8], // 1, 2, b3, 5, b6 (Dramatic melodic ZUN leaps)
      mood: 'Dramatic, intense, heroic, nostalgic',
      genreBias: ['touhou', 'anime']
    },
    'touhou_insen': {
      name: 'Insen Scale (Japanese Mystical)',
      intervals: [0, 1, 5, 7, 10], // 1, b2, 4, 5, b7
      mood: 'Mysterious, traditional shrine, dark folk',
      genreBias: ['touhou', 'cyberpunk', 'dark_fantasy']
    },
    'hirajoshi': {
      name: 'Hirajoshi (Japanese Melancholic)',
      intervals: [0, 2, 3, 7, 8],
      mood: 'Poetic, bittersweet, emotional',
      genreBias: ['touhou', 'lofi', 'dark_fantasy']
    },
    'chromatic': {
      name: 'Chromatic (Safe)',
      intervals: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
      mood: 'Neutral, keeps every note',
      genreBias: []
    },

    'phrygian_dominant': {
      name: 'Phrygian Dominant (Dark Fantasy / Souls / Castlevania)',
      intervals: [0, 1, 4, 5, 7, 8, 10], // 1, b2, 3, 4, 5, b6, b7
      mood: 'Menacing, gothic cathedral, Elden Ring / Dark Souls boss fight',
      genreBias: ['dark_fantasy', 'epic', 'cyberpunk']
    },
    'gothic_harmonic_minor': {
      name: 'Gothic Harmonic Minor',
      intervals: [0, 2, 3, 5, 7, 8, 11],
      mood: 'Gothic, regal, dark dungeon, vampire castle',
      genreBias: ['dark_fantasy', 'touhou', 'epic']
    },
    'byzantine': {
      name: 'Byzantine / Double Harmonic',
      intervals: [0, 1, 4, 5, 7, 8, 11], // 1, b2, 3, 4, 5, b6, 7
      mood: 'Ancient cursed tomb, dark sorcery ritual',
      genreBias: ['dark_fantasy']
    },

    'natural_minor': {
      name: 'Natural Minor (Aeolian)',
      intervals: [0, 2, 3, 5, 7, 8, 10],
      mood: 'Dark, energetic, serious, standard for EDM & Rock',
      genreBias: ['touhou', 'synthwave', 'chiptune', 'epic', 'edm', 'dark_fantasy']
    },
    'harmonic_minor': {
      name: 'Harmonic Minor',
      intervals: [0, 2, 3, 5, 7, 8, 11],
      mood: 'Gothic, regal, intense classical drama',
      genreBias: ['touhou', 'epic', 'chiptune', 'dark_fantasy']
    },
    'melodic_minor': {
      name: 'Melodic Minor',
      intervals: [0, 2, 3, 5, 7, 9, 11],
      mood: 'Sophisticated, jazz fusion, adventurous',
      genreBias: ['jazz', 'epic']
    },
    'dorian': {
      name: 'Dorian Mode',
      intervals: [0, 2, 3, 5, 7, 9, 10],
      mood: 'Heroic, groovy, synthwave cyberpunk retro',
      genreBias: ['synthwave', 'cyberpunk', 'lofi']
    },
    'phrygian': {
      name: 'Phrygian Mode',
      intervals: [0, 1, 3, 5, 7, 8, 10],
      mood: 'Exotic, menacing, darksynth, boss battle',
      genreBias: ['cyberpunk', 'epic', 'dark_fantasy']
    },
    'major': {
      name: 'Major (Ionian)',
      intervals: [0, 2, 4, 5, 7, 9, 11],
      mood: 'Uplifting, bright, joyful, heroic anime op',
      genreBias: ['anime', 'chiptune', 'edm']
    },
    'lydian': {
      name: 'Lydian Mode',
      intervals: [0, 2, 4, 6, 7, 9, 11],
      mood: 'Dreamy, ethereal, sci-fi, floating wonder',
      genreBias: ['synthwave', 'lofi']
    },
    'mixolydian': {
      name: 'Mixolydian Mode',
      intervals: [0, 2, 4, 5, 7, 9, 10],
      mood: 'Funky, classic rock, adventurous voyage',
      genreBias: ['synthwave', 'chiptune']
    },
    'pentatonic_minor': {
      name: 'Minor Pentatonic',
      intervals: [0, 3, 5, 7, 10],
      mood: 'Bluesy, punchy, safe for rapid solos',
      genreBias: ['synthwave', 'chiptune', 'edm']
    },
    'pentatonic_major': {
      name: 'Major Pentatonic',
      intervals: [0, 2, 4, 7, 9],
      mood: 'Inspirational, peaceful, nostalgic oriental',
      genreBias: ['anime', 'lofi']
    },
    'jazz_neosoul': {
      name: 'Neo-Soul / Jazz Color',
      intervals: [0, 2, 3, 5, 7, 9, 11],
      mood: 'Smooth, lush, aesthetic coffee vibes',
      genreBias: ['lofi', 'sasakure_uk']
    },
    'lydian_augmented': {
      name: 'Lydian Augmented (sasakure.UK Sci-Fi)',
      intervals: [0, 2, 4, 6, 8, 9, 11],
      mood: 'Futuristic, chiptune mystery, outer-space math jazz',
      genreBias: ['sasakure_uk', 'chiptune']
    },
    'dorian_b2': {
      name: 'Dorian b2 / Phrygian #6 (Math Fusion)',
      intervals: [0, 1, 3, 5, 7, 9, 10],
      mood: 'Intricate progressive fusion, Spider Thread tension',
      genreBias: ['sasakure_uk', 'cyberpunk']
    }
  };

  const CHORD_TYPES = {
    'maj':      { name: 'Major', intervals: [0, 4, 7], quality: 'major' },
    'min':      { name: 'Minor', intervals: [0, 3, 7], quality: 'minor' },
    'dim':      { name: 'Diminished', intervals: [0, 3, 6], quality: 'dim' },
    'dim7':     { name: 'Diminished 7th', intervals: [0, 3, 6, 9], quality: 'dim' },
    'aug':      { name: 'Augmented', intervals: [0, 4, 8], quality: 'aug' },
    'sus2':     { name: 'Sus2', intervals: [0, 2, 7], quality: 'sus' },
    'sus4':     { name: 'Sus4', intervals: [0, 5, 7], quality: 'sus' },
    '7sus4':    { name: '7 Sus4', intervals: [0, 5, 7, 10], quality: 'dominant' },
    'add9':     { name: 'Major Add 9', intervals: [0, 4, 7, 14], quality: 'major' },
    'madd9':    { name: 'Minor Add 9', intervals: [0, 3, 7, 14], quality: 'minor' },
    'maj7':     { name: 'Major 7th', intervals: [0, 4, 7, 11], quality: 'major' },
    'min7':     { name: 'Minor 7th', intervals: [0, 3, 7, 10], quality: 'minor' },
    'dom7':     { name: 'Dominant 7th', intervals: [0, 4, 7, 10], quality: 'dominant' },
    '7b9':      { name: 'Dominant 7(b9)', intervals: [0, 4, 7, 10, 13], quality: 'dominant' },
    'm7b5':     { name: 'Half-Diminished', intervals: [0, 3, 6, 10], quality: 'dim' },
    'maj9':     { name: 'Major 9th', intervals: [0, 4, 7, 11, 14], quality: 'major' },
    'm9':       { name: 'Minor 9th', intervals: [0, 3, 7, 10, 14], quality: 'minor' },
    'min11':    { name: 'Minor 11th', intervals: [0, 3, 7, 10, 14, 17], quality: 'minor' },
    'sixnine':  { name: '6/9 Chiptune Jazz', intervals: [0, 4, 7, 9, 14], quality: 'major' },
    'm6':       { name: 'Minor 6th', intervals: [0, 3, 7, 9], quality: 'minor' },
    'power':    { name: 'Power 5th', intervals: [0, 7, 12], quality: 'power' }
  };

  const GENRES = {
    'sasakure_uk': {
      id: 'sasakure_uk',
      name: '🤖 sasakure.UK / Chiptune-Fusion',
      description: 'Phong cách Spider Thread Monopoly, nhịp lẻ 7/8, rải arpeggio 16th lấp lánh, jazz stabs, hòa âm chiptune hiện đại',
      defaultBpm: 155,
      bpmRange: [130, 190],
      defaultKey: 'A',
      defaultScale: 'touhou_yonanuki',
      allowedScales: ['touhou_yonanuki', 'lydian', 'dorian', 'lydian_augmented', 'harmonic_minor', 'natural_minor', 'jazz_neosoul'],
      drumGroove: 'math_breakbeat',
      minimalKit: true,
      bassWalk: 0.6,
      dottedBounce: 0.4,
      leadStyle: 'chiptune_fm_epiano',
      defaultTimeSignature: '7/8',
      progressions: [
        ['IVmaj7', 'V7', 'iii7', 'vi7'],                                    // Royal Road Vocaloid (sasakure signature)
        ['bVImaj7', 'bVII7', 'i7', 'IIImaj7'],                               // Spider Thread Modal Interchange
        ['i', 'bVII', 'bVImaj7', 'V7sus4', 'V7'],                            // Dramatic Descending Tension
        ['IVmaj7', 'iv6', 'iii7', 'bIII°7', 'ii7', 'V7', 'Imaj7', 'Imaj7'], // Chromatic Luxury Voice Leading
        ['i', 'bII', 'bVII', 'V7'],                                          // Phrygian Math Break
        ['ii7', 'V7b9', 'Imaj7', 'VI7'],                                     // Jazz Fusion 2-5-1-6
        ['IVmaj7', 'V7', 'Imaj7', 'vi7', 'ii7', 'V7', 'Imaj7', 'Imaj7'], // Anime Fusion Anthem
        ['Imaj7', 'iii7', 'vi7', 'ii7'],                                     // Neo-Soul shimmer
        ['V7sus4', 'V7', 'i7', 'i7']                                         // Turnaround snap
      ],
      trackProfile: { lead: 1.0, chords: 0.8, arp: 1.0, bass: 1.0, drums: 1.0 },
      leadGrammar: { rest: 0.08, leapSemis: 10, chromatic: true }
    },
    'fiery_piano': {
      id: 'fiery_piano',
      defaultTimeSignature: '4/4',
      name: '🎹 Fiery Virtuoso Piano',
      description: 'Piano solo siêu cháy, chạy ngón tốc độ cao, bè tay trái rải quãng 10 hùng tráng, cao trào chạm đến tâm hồn',
      defaultBpm: 170,
      bpmRange: [140, 200],
      defaultKey: 'A',
      defaultScale: 'touhou_yonanuki',
      allowedScales: ['touhou_yonanuki', 'harmonic_minor', 'natural_minor', 'dorian', 'hirajoshi'],
      drumGroove: 'touhou_break',
      bassWalk: 0.5,
      dottedBounce: 0.4,
      leadStyle: 'grand_piano_lead',
      progressions: [
        ['VI', 'VII', 'i', 'III'],       // ZUN / Liszt Royal Epic
        ['i', 'VI', 'III', 'VII'],       // Emotional Climax Journey
        ['iv', 'v', 'VI', 'VII'],        // Rapid Tension Build
        ['i', 'VII', 'VI', 'V'],         // Passionate Andalusian Descent
        ['VI', 'v', 'i', 'iv', 'VI', 'VII', 'i', 'i'],
        ['i', 'viio', 'V7', 'i'],          // Diminished brilliance
        ['i', 'iv', 'V7', 'VI']            // Deceptive fire
      ],
      trackProfile: { lead: 1.0, chords: 0.9, arp: 1.0, bass: 1.0, drums: 0.8 },
      leadGrammar: { rest: 0.05, leapSemis: 12, chromatic: true }
    },
    'dark_fantasy': {
      id: 'dark_fantasy',
      defaultTimeSignature: '4/4',
      name: '🏰 Dark Fantasy / Gothic RPG',
      description: 'Âm hưởng u tối, Gothic, Bloodborne / Dark Souls / Castlevania, Pipe Organ & Choir dồn dập',
      defaultBpm: 128,
      bpmRange: [110, 150],
      defaultKey: 'D',
      defaultScale: 'phrygian_dominant',
      allowedScales: ['phrygian_dominant', 'gothic_harmonic_minor', 'byzantine', 'phrygian', 'natural_minor'],
      drumGroove: 'gothic_war_drums',
      bassWalk: 0.3,
      dottedBounce: 0.3,
      leadStyle: 'pipe_organ_lead',
      progressions: [
        ['i', 'bII', 'iv', 'V'],         // Bloodborne / Dark Souls Boss tension
        ['i', 'VI', 'vii°', 'i'],        // Castlevania Gothic Palace
        ['i', 'iv', 'V7', 'i'],          // Classical Dramatic Minor
        ['i', 'bII', 'bVII', 'i'],       // Neapolitan Phrygian Climax
        ['i', 'bVI', 'bII', 'V'],        // Cursed Sorcery Tension
        ['i', 'III', 'bII', 'V'],        // Dark Souls Abyss Walker
        ['i', 'bII', 'V7', 'i']          // Neapolitan resolve
      ],
      trackProfile: { lead: 1.0, chords: 1.0, arp: 0.5, bass: 1.0, drums: 0.9 },
      leadGrammar: { rest: 0.15, leapSemis: 8, chromatic: false }
    },
    'touhou': {
      id: 'touhou',
      defaultTimeSignature: '4/4',
      name: '🌸 Touhou / ZUN Style',
      description: 'Giai điệu kịch tính, nhịp nhanh, ZUN-trumpet lead, arpeggio piano bùng nổ',
      defaultBpm: 165,
      bpmRange: [150, 180],
      defaultKey: 'A',
      defaultScale: 'touhou_yonanuki',
      allowedScales: ['touhou_yonanuki', 'natural_minor', 'harmonic_minor', 'touhou_insen', 'hirajoshi'],
      drumGroove: 'touhou_break',
      minimalKit: true,
      bassWalk: 0.85,
      dottedBounce: 0.45,
      leadStyle: 'zun_trumpet',
      progressions: [
        ['VI', 'VII', 'i', 'III'],       // Classic Touhou Royal cadence (F - G - Am - C)
        ['i', 'VI', 'VII', 'i'],         // Dramatic Battle theme (Am - F - G - Am)
        ['VI', 'v', 'i', 'iv'],          // Nostalgic Stage theme (F - Em - Am - Dm)
        ['i', 'VII', 'VI', 'V'],         // Andalusian climax (Am - G - F - E)
        ['VI', 'VII', 'v', 'i', 'VI', 'VII', 'i', 'i'],
        ['i', 'III', 'VII', 'VI'],       // UN Owen / Necrofantasia tension
        ['iv', 'v', 'VI', 'VII', 'i', 'III', 'iv', 'V'],
        ['i', 'VI', 'V7', 'i'],            // Secondary punch
        ['VI', 'VII', 'V7sus4', 'V7']      // Pre-chorus lift
      ],
      trackProfile: { lead: 1.0, chords: 0.9, arp: 0.9, bass: 1.0, drums: 1.0 },
      leadGrammar: { rest: 0.08, leapSemis: 10, chromatic: false }
    },
    'synthwave': {
      id: 'synthwave',
      defaultTimeSignature: '4/4',
      name: '🌆 Synthwave / Retrowave',
      description: 'Âm hưởng thập niên 80, rolling bassline 16th, pad analog dày ấm, giai điệu neon',
      defaultBpm: 120,
      bpmRange: [105, 130],
      defaultKey: 'F',
      defaultScale: 'dorian',
      allowedScales: ['dorian', 'natural_minor', 'pentatonic_minor', 'lydian'],
      drumGroove: 'synthwave_four',
      bassWalk: 0.4,
      dottedBounce: 0.2,
      leadStyle: 'synth_saw_lead',
      progressions: [
        ['i', 'VI', 'III', 'VII'],       // Outrun Anthem (Fm - Db - Ab - Eb)
        ['i', 'v', 'VI', 'VII'],         // Midnight Drive (Fm - Cm - Db - Eb)
        ['VI', 'VII', 'i', 'i'],         // Retro Sunset
        ['i', 'bVII', 'v', 'VI'],        // Neon Highway
        ['i', 'VI', 'iv', 'v'],           // Dark Synthwave
        ['i', 'bVImaj7', 'bIII', 'bVII7'], // Neon maj7 glow
        ['i7', 'iv7', 'v7', 'VI7']         // Minor groove
      ],
      trackProfile: { lead: 0.9, chords: 1.0, arp: 0.8, bass: 1.0, drums: 1.0 },
      leadGrammar: { rest: 0.15, leapSemis: 6, chromatic: false }
    },
    'lofi': {
      id: 'lofi',
      defaultTimeSignature: '4/4',
      name: '☕ Lofi Hip-Hop / Chill',
      description: 'Hợp âm Jazz 7th/9th êm ái, nhịp swing nhè nhẹ, giai điệu hoài niệm thư giãn',
      defaultBpm: 80,
      bpmRange: [70, 90],
      defaultKey: 'D',
      defaultScale: 'jazz_neosoul',
      allowedScales: ['jazz_neosoul', 'dorian', 'natural_minor', 'pentatonic_major', 'hirajoshi'],
      drumGroove: 'lofi_swing',
      bassWalk: 0.2,
      dottedBounce: 0.35,
      leadStyle: 'mellow_epiano',
      progressions: [
        ['ii7', 'V7', 'Imaj7', 'VI7'],   // Classic Jazz Turnaround
        ['Imaj7', 'VI7', 'ii7', 'V7'],   // Nostalgic Study loop
        ['iv7', 'i7', 'bVII7', 'bVI7'],  // Chill Late Night
        ['Imaj9', 'IVmaj7', 'iii7', 'vi7'],
        ['i7', 'iv7', 'bVImaj7', 'V7b9'],
        ['bVImaj7', 'V7b9', 'i7', 'i7']  // Smoky resolve
      ],
      trackProfile: { lead: 0.7, chords: 1.0, arp: 0.3, bass: 0.8, drums: 0.8 },
      leadGrammar: { rest: 0.30, leapSemis: 4, chromatic: false }
    },
    'chiptune': {
      id: 'chiptune',
      defaultTimeSignature: '4/4',
      name: '👾 8-Bit Chiptune / Arcade',
      description: 'Âm thanh NES 8-bit, arpeggio tốc độ cao, giai điệu phiêu lưu tươi sáng',
      defaultBpm: 145,
      bpmRange: [130, 165],
      defaultKey: 'C',
      defaultScale: 'major',
      allowedScales: ['major', 'natural_minor', 'harmonic_minor', 'pentatonic_minor'],
      drumGroove: 'chiptune_punch',
      bassWalk: 0.3,
      dottedBounce: 0.3,
      leadStyle: 'square_8bit',
      progressions: [
        ['I', 'vi', 'IV', 'V'],          // 50s / Classic RPG Town
        ['i', 'iv', 'VI', 'VII'],        // Boss / Dungeon stage
        ['I', 'V', 'vi', 'IV'],          // Pop Punk 8-bit
        ['vi', 'IV', 'I', 'V'],          // Adventure Anthem
        ['i', 'VI', 'III', 'VII'],
        ['I', 'iii', 'IV', 'V'],         // Sunny quest
        ['i', 'V7', 'i', 'V7']           // Boss stabs
      ],
      trackProfile: { lead: 1.0, chords: 0.35, arp: 1.0, bass: 1.0, drums: 0.9 },
      leadGrammar: { rest: 0.10, leapSemis: 8, chromatic: false }
    },
    'cyberpunk': {
      id: 'cyberpunk',
      defaultTimeSignature: '4/4',
      name: '⚡ Cyberpunk / Darksynth',
      description: 'Bassline gầm rú, nhịp điệu dồn dập, gam màu Phrygian tăm tối và căng thẳng',
      defaultBpm: 130,
      bpmRange: [120, 140],
      defaultKey: 'E',
      defaultScale: 'phrygian',
      allowedScales: ['phrygian', 'touhou_insen', 'natural_minor', 'harmonic_minor'],
      drumGroove: 'cyber_industrial',
      bassWalk: 0.3,
      dottedBounce: 0.3,
      leadStyle: 'distorted_lead',
      progressions: [
        ['i', 'bII', 'i', 'bVI'],        // Phrygian Tension (Em - F - Em - C)
        ['i', 'iv', 'v', 'i'],           // Industrial Dark
        ['i', 'bII', 'bVII', 'i'],       // Cyber Combat
        ['i', 'bVI', 'bII', 'V'],        // Overdrive Climax
        ['i', 'i', 'bII', 'bII'],
        ['i', 'bII', 'V7b9', 'i']        // Chrome resolve
      ],
      trackProfile: { lead: 1.0, chords: 0.7, arp: 0.9, bass: 1.0, drums: 1.0 },
      leadGrammar: { rest: 0.10, leapSemis: 8, chromatic: true }
    },
    'epic': {
      id: 'epic',
      defaultTimeSignature: '4/4',
      name: '⚔️ Epic / Orchestral',
      description: 'Dàn dây dồn dập, kèn đồng hào hùng, trống Taiko hùng tráng cho cinematic',
      defaultBpm: 135,
      bpmRange: [115, 155],
      defaultKey: 'D',
      defaultScale: 'harmonic_minor',
      allowedScales: ['harmonic_minor', 'natural_minor', 'melodic_minor', 'dorian'],
      drumGroove: 'epic_taiko',
      bassWalk: 0.2,
      dottedBounce: 0.25,
      leadStyle: 'orchestral_strings',
      progressions: [
        ['i', 'VI', 'III', 'VII'],       // Hans Zimmer / Two Steps From Hell
        ['i', 'VI', 'iv', 'V'],          // Dramatic Gothic
        ['i', 'iv', 'VI', 'V'],          // Heroic Sacrifice
        ['VI', 'VII', 'i', 'v'],         // Battle March
        ['i', 'III', 'VII', 'VI'],
        ['i', 'bVII', 'VI', 'V7']        // War horn cadence
      ],
      trackProfile: { lead: 1.0, chords: 1.0, arp: 0.6, bass: 1.0, drums: 1.0 },
      leadGrammar: { rest: 0.12, leapSemis: 10, chromatic: false }
    },
    'cinematic': {
      id: 'cinematic',
      defaultTimeSignature: '4/4',
      name: '🎬 Cinematic Journey',
      description: 'Sử thi chữa lành: arc cao trào giữa bài + outro trầm, Dm hoài cổ',
      defaultBpm: 100,
      bpmRange: [60, 140],
      defaultKey: 'D',
      defaultScale: 'natural_minor',
      allowedScales: ['natural_minor', 'harmonic_minor', 'dorian'],
      drumGroove: 'epic_taiko',
      bassWalk: 0.2,
      dottedBounce: 0.25,
      leadStyle: 'orchestral_strings',
      progressions: [
        ['i', 'VI', 'III', 'VII'],       // Verse chua lanh (Hanh Trinh Ve Nha)
        ['i', 'VII', 'VI', 'V'],         // Chorus cao trao (leading-tone ve i)
        ['VI', 'VII', 'i', 'i'],         // Breakdown / Outro tram
        ['i', 'iv', 'VI', 'V'],          // Bien tau dramatic
        ['i', 'iv', 'V7', 'i']           // Quiet resolve
      ],
      trackProfile: { lead: 1.0, chords: 1.0, arp: 0.6, bass: 1.0, drums: 0.8 },
      leadGrammar: { rest: 0.18, leapSemis: 8, chromatic: false }
    },
    'anime': {
      id: 'anime',
      defaultTimeSignature: '4/4',
      name: '✨ Anime Pop / Royal Road',
      description: 'Vòng hợp âm Oudou (IV-V-iii-vi) huyền thoại của J-Pop/Anime, tươi vui và tràn đầy hy vọng',
      defaultBpm: 155,
      bpmRange: [140, 175],
      defaultKey: 'G',
      defaultScale: 'major',
      allowedScales: ['major', 'pentatonic_major', 'touhou_yonanuki', 'lydian'],
      drumGroove: 'anime_pop_beat',
      bassWalk: 0.4,
      dottedBounce: 0.35,
      leadStyle: 'anime_bell_lead',
      progressions: [
        ['IV', 'V', 'iii', 'vi'],        // Oudou / Royal Road (C - D - Bm - Em in G)
        ['IV', 'V', 'I', 'vi'],          // J-Pop Standard
        ['I', 'V', 'vi', 'IV'],          // Anime Opening Anthem
        ['IV', 'iii', 'ii', 'I'],        // Sweet Melodic
        ['vi', 'IV', 'V', 'I'],
        ['Imaj7', 'iii7', 'vi7', 'IVmaj7'], // Sparkling chorus
        ['I', 'iii', 'IV', 'V7sus4']        // Lift-off
      ],
      trackProfile: { lead: 1.0, chords: 0.9, arp: 0.8, bass: 1.0, drums: 1.0 },
      leadGrammar: { rest: 0.10, leapSemis: 8, chromatic: false }
    }
  };


  function getScaleNotes(rootNote, scaleKey, minOctave = 3, maxOctave = 6) {
    const rootNorm = normalizeNote(rootNote);
    const rootIndex = NOTE_NAMES.indexOf(rootNorm);
    const scale = SCALES[scaleKey] || SCALES['natural_minor'];
    const notes = [];

    for (let oct = minOctave; oct <= maxOctave; oct++) {
      const baseMidi = (oct + 1) * 12 + rootIndex;
      for (const interval of scale.intervals) {
        const midi = baseMidi + interval;
        if (midi >= 0 && midi <= 127) {
          notes.push(midi);
        }
      }
    }

    return Array.from(new Set(notes)).sort((a, b) => a - b);
  }


  function resolveChord(symbol, rootNote, scaleKey, baseOctave = 3) {
    const rootNorm = normalizeNote(rootNote);
    const rootMidi = noteToMidi(rootNorm, baseOctave);
    const scale = SCALES[scaleKey] || SCALES['natural_minor'];

    const DEGREE_MAP_MINOR = {
      'i': 0, 'I': 0, 'i7': 0, 'Imaj7': 0, 'Imaj9': 0, 'i9': 0,
      'bii': 1, 'bII': 1, 'bII7': 1, 'bIImaj7': 1,
      'ii': 2, 'II': 2, 'ii7': 2, 'iiø': 2, 'ii°': 2,
      'biii': 3, 'bIII': 3, 'bIII7': 3, 'bIIImaj7': 3, 'bIII°7': 3, 'bIII°': 3, 'iii': 3, 'III': 3, 'IIImaj7': 3,
      'iv': 5, 'IV': 5, 'iv7': 5, 'IVmaj7': 5, 'iv6': 5, 'IV7': 5,
      'v': 7, 'V': 7, 'v7': 7, 'V7': 7, 'V7b9': 7, 'V7sus4': 7, 'Vsus4': 7,
      'bvi': 8, 'bVI': 8, 'bVI7': 8, 'bVImaj7': 8, 'vi': 8, 'VI': 8, 'VI7': 8,
      'bvii': 10, 'bVII': 10, 'bVII7': 10, 'bVIImaj7': 10, 'vii': 10, 'VII': 10, 'vii°': 11, 'viio': 11
    };

    const DEGREE_MAP_MAJOR = {
      'I': 0, 'i': 0, 'Imaj7': 0, 'Imaj9': 0,
      'bII': 1, 'bIImaj7': 1,
      'ii': 2, 'II': 2, 'ii7': 2, 'ii9': 2,
      'bIII': 3, 'bIIImaj7': 3, 'bIII°7': 3, 'iii': 4, 'III': 4, 'iii7': 4,
      'IV': 5, 'iv': 5, 'IVmaj7': 5, 'iv6': 5,
      'V': 7, 'v': 7, 'V7': 7, 'V7b9': 7, 'V7sus4': 7,
      'bVI': 8, 'bVImaj7': 8, 'vi': 9, 'VI': 9, 'vi7': 9,
      'bVII': 10, 'bVII7': 10, 'vii°': 11, 'VII': 11, 'viio': 11
    };

    const isMajorContext = (scaleKey === 'major' || scaleKey === 'lydian' || scaleKey === 'mixolydian' || scaleKey === 'pentatonic_major');
    const degreeMap = isMajorContext ? DEGREE_MAP_MAJOR : DEGREE_MAP_MINOR;

    let offset = degreeMap[symbol];
    if (offset === undefined) {
      const cleaned = symbol.replace(/[^a-zA-Z]/g, '');
      offset = degreeMap[cleaned] !== undefined ? degreeMap[cleaned] : 0;
    }

    const chordRootMidi = rootMidi + offset;
    const rootName = NOTE_NAMES[chordRootMidi % 12];

    let chordType = 'min';
    if (symbol.includes('maj9')) chordType = 'maj9';
    else if (symbol.includes('maj7')) chordType = 'maj7';
    else if (symbol.includes('7sus4') || symbol.includes('Vsus4')) chordType = '7sus4';
    else if (symbol.includes('7b9')) chordType = '7b9';
    else if (symbol.includes('6/9') || symbol.includes('sixnine')) chordType = 'sixnine';
    else if (symbol.includes('madd9')) chordType = 'madd9';
    else if (symbol.includes('add9')) chordType = 'add9';
    else if (symbol.includes('min11') || symbol.includes('m11')) chordType = 'min11';
    else if (symbol.includes('m9')) chordType = 'm9';
    else if (symbol.includes('6') && (symbol.startsWith('iv') || symbol.startsWith('i') || symbol.startsWith('ii'))) chordType = 'm6';
    else if (symbol.includes('°7') || symbol.includes('dim7')) chordType = 'dim7';
    else if (symbol.includes('°') || symbol.includes('dim') || symbol.includes('o')) chordType = 'dim';
    else if (symbol.includes('ø') || symbol.includes('m7b5')) chordType = 'm7b5';
    else if (symbol.includes('V7') || symbol.includes('7b9')) chordType = 'dom7';
    else if (symbol.includes('7') && (symbol.startsWith('i') || symbol.startsWith('ii') || symbol.startsWith('iv') || symbol.startsWith('vi') || symbol.startsWith('v'))) chordType = 'min7';
    else if (symbol.includes('7') && (symbol.startsWith('I') || symbol.startsWith('IV') || symbol.startsWith('VI') || symbol.startsWith('VII') || symbol.startsWith('bVII') || symbol.startsWith('bVI'))) chordType = 'dom7';
    else if (symbol === symbol.toUpperCase() || symbol.startsWith('bVI') || symbol.startsWith('bVII') || symbol.startsWith('bII') || symbol.startsWith('bIII') || symbol.startsWith('IV') || symbol.startsWith('V') || symbol.startsWith('III') || symbol.startsWith('I')) chordType = 'maj';
    else chordType = 'min';

    const intervals = CHORD_TYPES[chordType] ? CHORD_TYPES[chordType].intervals : [0, 4, 7];
    const notes = intervals.map(iv => chordRootMidi + iv);

    return {
      symbol,
      rootName,
      rootMidi: chordRootMidi,
      chordType,
      notes,
      quality: CHORD_TYPES[chordType] ? CHORD_TYPES[chordType].quality : 'major'
    };
  }


  function optimizeVoiceLeading(chordList, targetOctave = 3) {
    if (!chordList || chordList.length === 0) return [];
    const result = [];
    let prevNotes = null;

    for (let i = 0; i < chordList.length; i++) {
      const chord = chordList[i];
      const baseNotes = chord.notes.map(n => (n % 12));
      const rootBaseMidi = noteToMidi(chord.rootName, targetOctave);

      if (!prevNotes || i === 0) {
        const voiced = baseNotes.map(pc => {
          let midi = rootBaseMidi + ((pc - (rootBaseMidi % 12) + 12) % 12);
          if (midi < 48) midi += 12;
          if (midi > 72) midi -= 12;
          return midi;
        }).sort((a, b) => a - b);

        result.push({ ...chord, voicedNotes: voiced });
        prevNotes = voiced;
      } else {
        const prevCenter = prevNotes.reduce((a, b) => a + b, 0) / prevNotes.length;
        const candidateVoicings = [];

        for (let oct = targetOctave - 1; oct <= targetOctave + 1; oct++) {
          const rootM = (oct + 1) * 12 + (chord.rootMidi % 12);
          const rawVoiced = baseNotes.map(pc => {
            let m = rootM + ((pc - (rootM % 12) + 12) % 12);
            return m;
          });

          candidateVoicings.push([...rawVoiced]);

          if (rawVoiced.length >= 3) {
            const inv1 = [...rawVoiced];
            inv1[0] += 12;
            candidateVoicings.push(inv1);

            const inv2 = [...inv1];
            inv2[1] += 12;
            candidateVoicings.push(inv2);

            const invDown = [...rawVoiced];
            invDown[invDown.length - 1] -= 12;
            candidateVoicings.push(invDown);
          }
        }

        let bestVoicing = candidateVoicings[0];
        let minScore = Infinity;

        for (const v of candidateVoicings) {
          const center = v.reduce((a, b) => a + b, 0) / v.length;
          const centerDiff = Math.abs(center - prevCenter);
          const rangePenalty = Math.max(0, 45 - Math.min(...v)) * 2 + Math.max(0, Math.max(...v) - 78) * 2;
          const score = centerDiff + rangePenalty;

          if (score < minScore) {
            minScore = score;
            bestVoicing = v.sort((a, b) => a - b);
          }
        }

        result.push({ ...chord, voicedNotes: bestVoicing });
        prevNotes = bestVoicing;
      }
    }

    return result;
  }


  function listChordSymbols() {
    const seen = {};
    const out = [];
    function add(sym) {
      if (typeof sym !== 'string' || !sym) return;
      if (!seen[sym]) { seen[sym] = true; out.push(sym); }
    }
    for (const gKey of Object.keys(GENRES)) {
      const progs = GENRES[gKey].progressions || [];
      for (const tpl of progs) {
        for (const sym of tpl) add(sym);
      }
    }
    const extras = ['I', 'i', 'ii', 'II', 'iii', 'III', 'IV', 'iv', 'V', 'v', 'VI', 'vi',
      'VII', 'vii', 'bII', 'bIII', 'bVI', 'bVII', 'V7', 'Imaj7', 'i7', 'ii7', 'iii7',
      'IVmaj7', 'vi7', 'V7sus4', 'i7', 'IIImaj7'];
    for (const sym of extras) add(sym);
    return out;
  }

  exports.RMGTheory = {
    NOTE_NAMES,
    SCALES,
    CHORD_TYPES,
    GENRES,
    normalizeNote,
    noteToMidi,
    midiToNote,
    midiToFreq,
    getScaleNotes,
    resolveChord,
    optimizeVoiceLeading,
    listChordSymbols
  };

})(typeof window !== 'undefined' ? window : module.exports);
