/**
 * RMG Main Renderer Controller v2.0
 * Coordinates UI, Generator, WebAudio Synth, Piano Roll Canvas, History System & IPC API.
 * Author: Rin0suke257
 */

(function() {
  'use strict';

  // Core Module Instances
  const Theory = window.RMGTheory;
  const Generator = window.RMGGenerator;
  const Synth = new window.RMGSynth.SynthEngine();
  const Exporter = window.RMGExporter.Exporter;

  // Current App State
  const state = {
    genre: 'fiery_piano',
    key: 'A',
    scale: 'touhou_yonanuki',
    bpm: 170,
    timeSignature: '4/4',
    lengthBars: 8,
    section: 'none',
    motifStructure: 'none',
    articulation: 'auto',
    climaxCurve: 'none',
    contourEnabled: false,
    contourPoints: [
      { x: 0.0, y: 0.3 },
      { x: 0.25, y: 0.75 },
      { x: 0.5, y: 0.35 },
      { x: 0.75, y: 0.95 },
      { x: 1.0, y: 0.2 }
    ],
    fadeInBars: 0,
    fadeOutBars: 0,
    trackTarget: 'pure_piano',
    chaosLevel: 25,
    density: 75,
    currentSong: null,
    isPlaying: false,
    editingTrack: 'lead',
    showGhostNotes: true,
    zoom: 'fit',
    pianoOctave: 4,
    recArmed: false,
    loopMode: false,
    finalHit: true,
    swing: 0,
    historyFilter: 'all',
    tool: 'draw'
  };

  // Undo / Redo stacks (snapshot bai nhac + dieu khien)
  const undoStack = [];
  const redoStack = [];
  const UNDO_LIMIT = 30;

  // Generation History Array
  let songHistory = [];

  // Interactive Piano Roll Studio Drag State
  let draggedPianoNote = null;
  let resizingPianoNote = null;
  let dragStartMidi = null;
  let dragStartStep = null;
  let dragOffsetStep = 0;
  let isDraggingRuler = false;
  let hoveredPianoNote = null;

  // Studio Tools: selection + marquee + group drag + clipboard
  const selectedNotes = new Set();
  let marqueeStart = null; // {px, py}
  let marqueeEnd = null;   // {px, py}
  let groupDrag = null;    // { items: [{trackKey, track, note, origStep, origMidi}], startStep, startMidi }
  let copyBuffer = null;   // [{trackKey, dStep, duration, midi, velocity, pan}]

  // Tap Tempo State
  let tapTimes = [];

  // DOM Elements
  const genreGrid = document.getElementById('genreGrid');
  const selectSection = document.getElementById('selectSection');
  const selectClimaxCurve = document.getElementById('selectClimaxCurve');
  const selectMotifStructure = document.getElementById('selectMotifStructure');
  const selectArticulation = document.getElementById('selectArticulation');
  const selectTrackTarget = document.getElementById('selectTrackTarget');
  const btnTogglePurePiano = document.getElementById('btnTogglePurePiano');
  const txtPurePiano = document.getElementById('txtPurePiano');
  const selectTimeSignature = document.getElementById('selectTimeSignature');
  const valTimeSig = document.getElementById('valTimeSig');
  const selectKey = document.getElementById('selectKey');
  const selectScale = document.getElementById('selectScale');
  const inputCustomBpm = document.getElementById('inputCustomBpm');
  const sliderBpm = document.getElementById('sliderBpm');
  const valBpm = document.getElementById('valBpm');
  const btnTapTempo = document.getElementById('btnTapTempo');
  const inputCustomBars = document.getElementById('inputCustomBars');
  const sliderBars = document.getElementById('sliderBars');
  const valBars = document.getElementById('valBars');
  const sliderFadeIn = document.getElementById('sliderFadeIn');
  const valFadeIn = document.getElementById('valFadeIn');
  const sliderFadeOut = document.getElementById('sliderFadeOut');
  const valFadeOut = document.getElementById('valFadeOut');
  const sliderChaos = document.getElementById('sliderChaos');
  const valChaos = document.getElementById('valChaos');
  const sliderDensity = document.getElementById('sliderDensity');
  const valDensity = document.getElementById('valDensity');
  const progressionDisplay = document.getElementById('progressionDisplay');
  const badgeSectionText = document.getElementById('badgeSectionText');
  const badgeScaleText = document.getElementById('badgeScaleText');
  const badgeBpmText = document.getElementById('badgeBpmText');
  const songInfoLabel = document.getElementById('songInfoLabel');

  const studioTrackTabs = document.getElementById('studioTrackTabs');
  const checkGhostNotes = document.getElementById('checkGhostNotes');

  const contourPanel = document.getElementById('contourPanel');
  const checkEnableContour = document.getElementById('checkEnableContour');
  const contourPresets = document.getElementById('contourPresets');
  const contourBody = document.getElementById('contourBody');
  const contourCanvasContainer = document.getElementById('contourCanvasContainer');
  const contourCanvas = document.getElementById('contourCanvas');
  const btnClearContour = document.getElementById('btnClearContour');
  let contourCtx = contourCanvas ? contourCanvas.getContext('2d') : null;

  let draggedContourIndex = -1;
  let hoveredContourIndex = -1;

  const btnPlay = document.getElementById('btnPlay');
  const playIcon = document.getElementById('playIcon');
  const playText = document.getElementById('playText');
  const btnStop = document.getElementById('btnStop');
  const btnUndo = document.getElementById('btnUndo');
  const btnRedo = document.getElementById('btnRedo');
  const btnGenerate = document.getElementById('btnGenerate');
  const btnBlank = document.getElementById('btnBlank');
  const btnExtractStyle = document.getElementById('btnExtractStyle');
  const selectZoom = document.getElementById('selectZoom');

  const btnCopyClip = document.getElementById('btnCopyClip');
  const btnSaveMidi = document.getElementById('btnSaveMidi');
  const btnSaveMmp = document.getElementById('btnSaveMmp');
  const btnLaunchLmms = document.getElementById('btnLaunchLmms');
  const toastContainer = document.getElementById('toastContainer');

  const historyList = document.getElementById('historyList');
  const btnClearHistory = document.getElementById('btnClearHistory');

  const progressionEditor = document.getElementById('progressionEditor');
  const progressionEditorTitle = document.getElementById('progressionEditorTitle');
  const selectProgChord = document.getElementById('selectProgChord');
  const btnApplyProgChord = document.getElementById('btnApplyProgChord');
  const btnCancelProgChord = document.getElementById('btnCancelProgChord');
  const inputRegenFrom = document.getElementById('inputRegenFrom');
  const inputRegenTo = document.getElementById('inputRegenTo');
  const btnRegenRegion = document.getElementById('btnRegenRegion');
  const btnUnlockAll = document.getElementById('btnUnlockAll');
  let editingProgBar = -1;

  const selectArrangerForm = document.getElementById('selectArrangerForm');
  const arrangerInfo = document.getElementById('arrangerInfo');
  const btnArrange = document.getElementById('btnArrange');
  const checkLoopMode = document.getElementById('checkLoopMode');
  const btnOpenMidi = document.getElementById('btnOpenMidi');
  const fileOpenMidi = document.getElementById('fileOpenMidi');
  const btnRec = document.getElementById('btnRec');
  const btnMotif = document.getElementById('btnMotif');
  const checkFinalHit = document.getElementById('checkFinalHit');
  const btnOpenCustomGenre = document.getElementById('btnOpenCustomGenre');
  const genreModal = document.getElementById('genreModal');
  const customName = document.getElementById('customName');
  const customDesc = document.getElementById('customDesc');
  const customBpm = document.getElementById('customBpm');
  const customKey = document.getElementById('customKey');
  const customScale = document.getElementById('customScale');
  const customTs = document.getElementById('customTs');
  const customLead = document.getElementById('customLead');
  const customProg = document.getElementById('customProg');
  const btnSaveCustomGenre = document.getElementById('btnSaveCustomGenre');
  const btnCancelCustomGenre = document.getElementById('btnCancelCustomGenre');
  const btnOctDown = document.getElementById('btnOctDown');
  const btnOctUp = document.getElementById('btnOctUp');
  const btnVelDown = document.getElementById('btnVelDown');
  const btnVelUp = document.getElementById('btnVelUp');
  const btnAB = document.getElementById('btnAB');
  const sliderSwing = document.getElementById('sliderSwing');
  const valSwing = document.getElementById('valSwing');
  const exportDirLabel = document.getElementById('exportDirLabel');
  const btnChangeExportDir = document.getElementById('btnChangeExportDir');
  const btnOpenExportDir = document.getElementById('btnOpenExportDir');
  const btnQuickMidi = document.getElementById('btnQuickMidi');
  const btnQuickMmp = document.getElementById('btnQuickMmp');
  const btnExportWav = document.getElementById('btnExportWav');
  const recentList = document.getElementById('recentList');
  const btnRefreshRecent = document.getElementById('btnRefreshRecent');
  const historyFilter = document.getElementById('historyFilter');
  const btnBatchMidi = document.getElementById('btnBatchMidi');
  const btnSaveProject = document.getElementById('btnSaveProject');
  const btnQuickSaveProject = document.getElementById('btnQuickSaveProject');
  const btnOpenProject = document.getElementById('btnOpenProject');
  const btnFinish = document.getElementById('btnFinish');
  const btnTransferStyle = document.getElementById('btnTransferStyle');
  const btnCopySeed = document.getElementById('btnCopySeed');
  const btnPasteSeed = document.getElementById('btnPasteSeed');
  const btnDailySeed = document.getElementById('btnDailySeed');
  const btnHelp = document.getElementById('btnHelp');
  const helpModal = document.getElementById('helpModal');
  const btnCloseHelp = document.getElementById('btnCloseHelp');

  // Song tabs (nhieu bai cung luc)
  let songTabs = [];
  let activeTabId = null;
  let tabSeq = 0;

  // A/B compare (ghim ban A so voi ban dang sua)
  let abSlotA = null, abSlotB = null, abHearing = null;

  // Canvases
  const pianoRollCanvas = document.getElementById('pianoRollCanvas');
  const canvasContainer = document.getElementById('canvasContainer');
  const prCtx = pianoRollCanvas.getContext('2d');

  const visualizerCanvas = document.getElementById('visualizerCanvas');
  const vizCtx = visualizerCanvas.getContext('2d');

  /**
   * Show Toast Notification
   */
  function showToast(message, duration = 3500) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  /**
   * Update Header Badges & Info Labels
   */
  function updateHeaderBadges() {
    const scaleName = Theory.SCALES[state.scale] ? Theory.SCALES[state.scale].name : state.scale;
    const timeSigStr = (state.currentSong && state.currentSong.metadata.timeSignature) || state.timeSignature || '4/4';
    badgeScaleText.textContent = `${state.key} • ${scaleName.split('(')[0].trim()}`;
    badgeBpmText.textContent = `${state.bpm} BPM • ${timeSigStr}`;
    if (valTimeSig) valTimeSig.textContent = timeSigStr;

    const sectionLabels = {
      'none': 'Toàn Bài',
      'intro': 'Intro (Mở đầu)',
      'verse': 'Verse (Thân bài)',
      'chorus': 'Chorus (Điệp khúc)',
      'outro': 'Outro (Kết thúc)',
      'merged': 'Merged (Ghép nối)'
    };
    badgeSectionText.textContent = sectionLabels[state.section] || 'Toàn Bài';

    if (state.currentSong) {
      songInfoLabel.textContent = `Tác phẩm: ${state.currentSong.metadata.title} (${state.lengthBars} Bars, ${state.bpm} BPM [${timeSigStr}] • ${state.currentSong.metadata.noteCount || 0} Nốt)`;
    }
  }

  /**
   * Update Chord Progression Chips UI (click chip de sua tung bar)
   */
  function updateProgressionUI(progression) {
    progressionDisplay.innerHTML = '';
    if (!progression) return;

    progression.forEach((chord, idx) => {
      const bar = (chord.bar != null) ? chord.bar : idx;
      const chip = document.createElement('div');
      chip.className = 'chord-chip';
      chip.textContent = `${chord.symbol} (${chord.rootName}${chord.chordType === 'min' ? 'm' : ''})`;
      chip.dataset.bar = bar;
      chip.title = `Bấm để sửa hợp âm Bar ${bar + 1}`;
      chip.addEventListener('click', () => openProgEditor(bar));
      progressionDisplay.appendChild(chip);
    });
  }

  /**
   * Custom genres cua user (localStorage) - dang ky vao Theory.GENRES
   */
  const CUSTOM_GENRE_KEY = 'rmg_custom_genres_v1';

  function getCustomGenres() {
    try {
      return JSON.parse(localStorage.getItem(CUSTOM_GENRE_KEY) || '{}');
    } catch (e) {
      return {};
    }
  }

  function saveCustomGenres(obj) {
    try {
      localStorage.setItem(CUSTOM_GENRE_KEY, JSON.stringify(obj));
    } catch (e) {}
  }

  function loadCustomGenres() {
    const obj = getCustomGenres();
    for (const [id, g] of Object.entries(obj)) {
      if (g && g.id && g.progressions && g.progressions.length) Theory.GENRES[id] = g;
    }
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function renderCustomGenreCards() {
    genreGrid.querySelectorAll('.genre-card[data-custom="1"]').forEach(c => c.remove());
    const customs = getCustomGenres();
    for (const [id, g] of Object.entries(customs)) {
      if (!Theory.GENRES[id]) continue;
      const card = document.createElement('div');
      card.className = 'genre-card' + (state.genre === id ? ' active' : '');
      card.dataset.genre = id;
      card.dataset.custom = '1';
      card.innerHTML = `<span class="genre-name">🎨 ${escapeHtml(g.name)}</span>` +
        `<span class="genre-desc">${escapeHtml(g.description || '')}</span>` +
        `<button class="btn-del-genre" title="Xóa style này">✕</button>`;
      card.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-del-genre')) {
          e.stopPropagation();
          deleteCustomGenre(id);
          return;
        }
        selectGenre(id);
      });
      genreGrid.appendChild(card);
    }
  }

  function deleteCustomGenre(id) {
    const customs = getCustomGenres();
    if (!customs[id]) return;
    delete customs[id];
    saveCustomGenres(customs);
    delete Theory.GENRES[id];
    renderCustomGenreCards();
    if (state.genre === id) selectGenre('fiery_piano');
    else showToast('🗑️ Đã xóa style riêng');
  }

  function openCustomGenreModal() {
    if (!genreModal || !customScale) return;
    customScale.innerHTML = '';
    for (const [sid, s] of Object.entries(Theory.SCALES)) {
      const opt = document.createElement('option');
      opt.value = sid;
      opt.textContent = s.name;
      if (sid === state.scale) opt.selected = true;
      customScale.appendChild(opt);
    }
    if (customKey) customKey.value = state.key;
    genreModal.style.display = 'flex';
  }

  function closeCustomGenreModal() {
    if (genreModal) genreModal.style.display = 'none';
  }

  function saveCustomGenre() {
    const name = (customName.value || '').trim().slice(0, 40);
    const desc = (customDesc.value || '').trim().slice(0, 80);
    const bpm = Math.max(30, Math.min(350, parseInt(customBpm.value, 10) || 120));
    const key = customKey.value;
    const scale = customScale.value;
    const ts = customTs.value;
    const lead = customLead.value;
    const templates = (customProg.value || '').split('\n').map(l => l.split(/[\s,;|]+/).filter(Boolean).slice(0, 8)).filter(t => t.length >= 2).slice(0, 8);
    if (!name) {
      showToast('⚠️ Hãy đặt tên cho style');
      return;
    }
    if (!templates.length) {
      showToast('⚠️ Cần ít nhất 1 vòng hợp âm (VD: i VI VII i)');
      return;
    }
    const id = 'custom_' + Date.now();
    const customs = getCustomGenres();
    customs[id] = {
      id, name, description: desc || 'Style riêng của bạn',
      defaultBpm: bpm, bpmRange: [Math.max(30, bpm - 20), Math.min(350, bpm + 20)],
      defaultKey: key, defaultScale: scale,
      allowedScales: [scale],
      drumGroove: 'standard', leadStyle: lead,
      defaultTimeSignature: ts,
      progressions: templates
    };
    saveCustomGenres(customs);
    Theory.GENRES[id] = customs[id];
    renderCustomGenreCards();
    closeCustomGenreModal();
    selectGenre(id);
    showToast(`🎨 Đã lưu style riêng: ${name}`);
  }

  /**
   * Chon genre (dung chung cho card mac dinh + custom)
   */
  function selectGenre(genreKey) {
    const gDef = Theory.GENRES[genreKey];
    if (!gDef) return;
    genreGrid.querySelectorAll('.genre-card').forEach(c => c.classList.toggle('active', c.dataset.genre === genreKey));
    state.genre = genreKey;

    state.bpm = gDef.defaultBpm;
    sliderBpm.value = Math.min(280, state.bpm);
    valBpm.textContent = state.bpm;

    state.key = gDef.defaultKey;
    selectKey.value = state.key;

    state.scale = gDef.defaultScale;
    selectScale.value = state.scale;

    // Luon reset nhip (tranh dinh 7/8 Sasakure keo sang style khac)
    state.timeSignature = gDef.defaultTimeSignature || '4/4';
    if (selectTimeSignature) selectTimeSignature.value = state.timeSignature;
    if (valTimeSig) valTimeSig.textContent = state.timeSignature;

    generateNewSong();
  }

  /**
   * Octave / velocity nhanh cho selection hoac ca be dang soan
   */
  function editTargetNotes() {
    if (selectedNotes.size) return [...selectedNotes];
    if (!state.currentSong) return [];
    const t = state.currentSong.tracks[state.editingTrack];
    return (t && t.notes) ? [...t.notes] : [];
  }

  function shiftOctave(d) {
    const list = editTargetNotes();
    if (!list.length) {
      showToast('⚠️ Không có nốt nào (bôi đen nốt hoặc chọn bè)');
      return;
    }
    pushUndo('dịch quãng');
    let n = 0;
    for (const note of list) {
      const v = note.midi + d * 12;
      if (v < 24 || v > 96) continue;
      note.midi = v;
      note.locked = true;
      n++;
    }
    refreshAfterEdit();
    showToast(`🎹 Dịch quãng ${d > 0 ? '+1' : '−1'}: ${n} nốt`);
  }

  function shiftVelocity(d) {
    const list = editTargetNotes();
    if (!list.length) {
      showToast('⚠️ Không có nốt nào (bôi đen nốt hoặc chọn bè)');
      return;
    }
    pushUndo('đổi velocity');
    for (const note of list) {
      note.velocity = Math.max(1, Math.min(127, (note.velocity || 90) + d));
      note.baseVel = note.velocity;
      note.locked = true;
    }
    refreshAfterEdit();
    showToast(`🔊 Velocity ${d > 0 ? '+' : ''}${d}: ${list.length} nốt`);
  }

  /**
   * Dung generator voi context goc cua bai dang mo (de gieo lai/sua hoa am)
   */
  function generatorFromSong(song) {
    const md = song.metadata;
    return new Generator.MusicGenerator({
      genre: md.genre,
      key: md.key,
      scale: md.scale,
      bpm: md.bpm,
      timeSignature: md.timeSignature || '4/4',
      lengthBars: md.lengthBars,
      section: md.section || 'none',
      motifStructure: md.motifStructure || 'none',
      articulation: md.articulation || 'auto',
      climaxCurve: md.climaxCurve || 'none',
      fadeInBars: md.fadeInBars || 0,
      fadeOutBars: md.fadeOutBars || 0,
      trackTarget: 'all',
      chaosLevel: md.chaosLevel != null ? md.chaosLevel : 25,
      density: md.density != null ? md.density : 75,
      humanize: true,
      seed: Math.random()
    });
  }

  function getCheckedRegenTracks() {
    const checked = [...document.querySelectorAll('.regen-track:checked')].map(c => c.value);
    return checked.length ? checked : ['lead', 'chords', 'arp', 'bass'];
  }

  /**
   * Gieo lai vung bars, giu nguyen notes locked (not tay) + ngoai vung
   */
  /**
   * Tron ket qua gieo lai vao bai: xoa not cu (tru locked + ngoai vung), them not moi.
   * Tra ve { removed, added }.
   */
  function spliceRegenResult(song, result) {
    const spb = song.metadata.stepsPerBar || 16;
    const fromStep = result.fromBar * spb;
    const toStep = (result.toBar + 1) * spb;
    let removed = 0, added = 0;
    for (const [tKey, newNotes] of Object.entries(result.notes)) {
      const track = song.tracks[tKey];
      if (!track) continue;
      if (!track.notes) track.notes = [];
      const kept = [];
      for (const n of track.notes) {
        if (n.locked || n.step < fromStep || n.step >= toStep) kept.push(n);
        else removed++;
      }
      for (const n of newNotes) {
        if (n.baseVel == null) n.baseVel = n.velocity;
      }
      track.notes = kept.concat(newNotes);
      added += newNotes.length;
    }
    song.metadata.noteCount = Object.values(song.tracks).reduce((acc, t) => acc + (t.notes ? t.notes.length : 0), 0);
    return { removed, added };
  }

  function applyRegenToSong(fromBar0, toBar0, trackKeys, push = true) {
    if (!state.currentSong) {
      showToast('⚠️ Chưa có bài nhạc nào để gieo lại! Hãy bấm Generate trước.');
      return;
    }
    if (push) pushUndo('gieo vùng');
    if (!trackKeys || trackKeys.length === 0) {
      showToast('⚠️ Hãy chọn ít nhất 1 bè để gieo lại!');
      return;
    }
    const song = state.currentSong;
    const spb = song.metadata.stepsPerBar || 16;
    const totalBars = song.metadata.lengthBars;
    const from = Math.max(0, Math.min(totalBars - 1, fromBar0 | 0));
    const to = Math.max(from, Math.min(totalBars - 1, toBar0 == null ? from : (toBar0 | 0)));

    const gen = generatorFromSong(song);
    const result = gen.regenerateRegion(song, { fromBar: from, toBar: to, tracks: trackKeys });
    const { removed, added } = spliceRegenResult(song, result);

    Synth.loadSong(song);
    updateHeaderBadges();
    renderPianoRoll(Synth.currentStep || 0);
    renderHistory();
    scheduleAutosave();
    showToast(`🎲 Đã gieo lại bars ${result.fromBar + 1}–${result.toBar + 1} (${trackKeys.join(', ').toUpperCase()}): +${added} nốt mới, thay ${removed} nốt cũ, nốt 🔒 giữ nguyên`);
  }

  /**
   * Phat trien motif: lay not lead locked trong 2 bars dau lam giong,
   * gieo lai toan bo lead theo contour cua motif do.
   */
  function developMotif() {    const song = state.currentSong;
    if (!song) {
      showToast('⚠️ Chưa có bài nhạc nào! Hãy bấm Generate trước.');
      return;
    }
    const spb = song.metadata.stepsPerBar || 16;
    const motifSteps = 2 * spb;
    const motif = (song.tracks.lead.notes || [])
      .filter(n => n.locked && n.step < motifSteps)
      .sort((a, b) => a.step - b.step);
    if (!motif.length) {
      showToast('🌱 Hãy soạn/kéo vài nốt lead (viền vàng 🔒) trong 2 bars đầu rồi bấm lại', 4500);
      return;
    }
    const scaleNotes = Theory.getScaleNotes(song.metadata.key, song.metadata.scale, 4, 6);
    const seed = motif.map(n => {
      let best = 0, bd = 1e9;
      scaleNotes.forEach((m, i) => {
        const d = Math.abs(m - n.midi);
        if (d < bd) { bd = d; best = i; }
      });
      return { stepOffset: n.step, durationSteps: Math.max(1, n.duration), scaleIndex: best };
    });

    pushUndo('phát triển motif');
    const gen = generatorFromSong(song);
    const totalBars = song.metadata.lengthBars;
    const result = gen.regenerateRegion(song, { fromBar: 0, toBar: totalBars - 1, tracks: ['lead'], leadSeed: seed });
    const { added } = spliceRegenResult(song, result);

    Synth.loadSong(song);
    updateHeaderBadges();
    renderPianoRoll(Synth.currentStep || 0);
    renderHistory();
    scheduleAutosave();
    showToast(`🌱 Đã phát triển motif (${motif.length} nốt gốc) thành lead ${totalBars} bars: +${added} nốt mới`, 4500);
  }

  const MidiParser = window.RMGMidi;

  function gmProgramToInstrument(prog) {
    if (prog == null) return null;
    const p = prog | 0;
    if (p <= 7) return 'grand_piano_lead';
    if (p <= 15) return 'anime_bell_lead';
    if (p <= 23) return 'pipe_organ_lead';
    if (p <= 31) return 'synth_saw_lead';
    if (p <= 39) return 'sub_saw_bass';
    if (p <= 55) return 'orchestral_strings';
    if (p <= 63) return 'zun_trumpet';
    if (p <= 71) return 'synth_saw_lead';
    if (p <= 79) return 'fusion_bright_grand';
    if (p === 80) return 'square_8bit';
    if (p <= 87) return 'synth_saw_lead';
    if (p <= 95) return 'mellow_epiano';
    if (p <= 103) return 'chiptune_fm_epiano';
    if (p <= 111) return 'anime_bell_lead';
    if (p <= 119) return 'sparkle_arp';
    return 'square_8bit';
  }

  function degreeToSymbol(semi, isMajor) {
    if (isMajor) {
      const map = { 0: 'I', 1: 'bII', 2: 'ii', 3: 'bIII', 4: 'iii', 5: 'IV', 6: 'bII', 7: 'V', 8: 'bVI', 9: 'vi', 10: 'bVII', 11: 'vii°' };
      return map[semi] || 'I';
    }
    const map = { 0: 'i', 1: 'bII', 2: 'ii', 3: 'bIII', 4: 'III', 5: 'iv', 6: 'bII', 7: 'v', 8: 'bVI', 9: 'VI', 10: 'bVII', 11: 'vii°' };
    return map[semi] || 'i';
  }

  /**
   * Dung bai RMG tu du lieu MIDI da parse (key/scale theo thiet lap hien tai)
   */
  function buildSongFromMidi(parsed, fileName) {
    const tpq = parsed.ticksPerQuarter || 480;
    const ts = parsed.timeSignature || '4/4';
    const stepsPerBar = ts === '7/8' ? 14 : ts === '6/8' ? 12 : ts === '5/8' ? 10 : 16;
    const ticksPerStep = tpq / 4;

    const pitched = [], drumNotes = [];
    const chanOrder = [];
    for (const t of parsed.tracks) {
      for (const n of t.notes) {
        if (n.channel === 9) drumNotes.push(n);
        else {
          if (!chanOrder.includes(n.channel)) chanOrder.push(n.channel);
          pitched.push(n);
        }
      }
    }
    if (!pitched.length && !drumNotes.length) throw new Error('File MIDI không có nốt nhạc nào');

    const order = ['lead', 'chords', 'arp', 'bass'];
    const chanMap = {};
    chanOrder.forEach((ch, i) => { chanMap[ch] = i < order.length ? order[i] : 'lead'; });

    // Program change dau tien moi channel -> instrument tuong duong (giu tieng goc)
    const chanProg = {};
    for (const t of parsed.tracks) {
      for (const [ch, prog] of Object.entries(t.programs || {})) {
        if (chanProg[ch] == null) chanProg[ch] = prog;
      }
    }
    const repChan = { lead: chanOrder[0], chords: chanOrder[1], arp: chanOrder[2], bass: chanOrder[3] };
    const instFor = (rk, fallback) => {
      const c = repChan[rk];
      if (c != null && chanProg[c] != null) return gmProgramToInstrument(chanProg[c]) || fallback;
      return fallback;
    };
    // Ten track MIDI goc (neu co nghia)
    let midiTitle = '';
    for (const t of parsed.tracks) {
      if (t.name && t.name.length > 3 && !/^track\s*\d+$/i.test(t.name)) { midiTitle = t.name.slice(0, 40); break; }
    }

    const gDef = Theory.GENRES[state.genre] || Theory.GENRES['touhou'];
    const mkTrack = (name, type, instrument, color) => ({ name, type, instrument, color, notes: [] });
    const tracks = {
      lead: mkTrack((midiTitle ? midiTitle + ' ' : '') + 'Lead (import)', 'synth_lead', instFor('lead', gDef.leadStyle || 'square_lead'), '#00f2fe'),
      chords: mkTrack('Harmony (import)', 'poly_synth', instFor('chords', 'analog_pad'), '#9b51e0'),
      arp: mkTrack('Arpeggio (import)', 'pluck_synth', instFor('arp', 'sparkle_arp'), '#4facfe'),
      bass: mkTrack('Bassline (import)', 'mono_bass', instFor('bass', 'sub_saw_bass'), '#f39c12'),
      drums: mkTrack('Drums (import)', 'drum_kit', 'standard_kit', '#e74c3c')
    };

    let endTick = 0;
    const conv = (n) => {
      endTick = Math.max(endTick, n.startTick + n.durTicks);
      return {
        step: 0,
        duration: Math.max(1, Math.round(n.durTicks / ticksPerStep)),
        midi: Math.max(0, Math.min(127, n.midi)),
        velocity: Math.max(1, Math.min(127, n.velocity || 90))
      };
    };
    const tmpPitched = pitched.map(n => ({ ch: n.channel, c: conv(n), tick: n.startTick }));
    const tmpDrums = drumNotes.map(n => ({ c: conv(n), tick: n.startTick }));
    const totalSteps = Math.max(stepsPerBar, Math.ceil(endTick / ticksPerStep));
    const lengthBars = Math.min(256, Math.max(1, Math.ceil(totalSteps / stepsPerBar)));
    const maxStep = lengthBars * stepsPerBar - 1;
    for (const t of tmpPitched) {
      t.c.step = Math.max(0, Math.min(maxStep, Math.round(t.tick / ticksPerStep)));
      tracks[chanMap[t.ch]].notes.push(t.c);
    }
    for (const t of tmpDrums) {
      t.c.step = Math.max(0, Math.min(maxStep, Math.round(t.tick / ticksPerStep)));
      tracks.drums.notes.push(t.c);
    }
    for (const t of Object.values(tracks)) t.notes.sort((a, b) => a.step - b.step);

    // Loi bai hat: gan lyric vao not lead cung step
    const allLyrics = [];
    for (const t of parsed.tracks) {
      for (const l of (t.lyrics || [])) allLyrics.push(l);
    }
    if (allLyrics.length) {
      const stepOf = tick => Math.round(tick / ticksPerStep);
      const leadByStep = {};
      for (const n of tracks.lead.notes) {
        if (leadByStep[n.step] == null) leadByStep[n.step] = n;
      }
      for (const l of allLyrics) {
        const s = Math.max(0, Math.min(maxStep, stepOf(l.tick)));
        const target = leadByStep[s];
        if (target && !target.lyric) target.lyric = l.text;
      }
    }

    // Vong hop am: root bass dau moi bar -> degree theo key hien tai (major/minor rieng)
    const key = state.key, scale = state.scale;
    const isMajor = ['major', 'lydian', 'mixolydian', 'pentatonic_major'].includes(scale);
    const keyPc = Theory.noteToMidi(Theory.normalizeNote(key), 4) % 12;
    const bassByBar = {};
    for (const n of tracks.bass.notes) {
      const bar = Math.floor(n.step / stepsPerBar);
      if (bassByBar[bar] == null) bassByBar[bar] = n.midi % 12;
    }
    const fallback = ['i', 'VI', 'VII', 'i'];
    const rawProg = [];
    for (let bar = 0; bar < lengthBars; bar++) {
      const symbol = (bassByBar[bar] != null)
        ? degreeToSymbol(((bassByBar[bar] - keyPc) + 12) % 12, isMajor)
        : fallback[bar % fallback.length];
      const chord = Theory.resolveChord(symbol, key, scale, 3);
      rawProg.push({ bar, symbol, rootName: chord.rootName, rootMidi: chord.rootMidi, chordType: chord.chordType, notes: chord.notes, quality: chord.quality });
    }
    const progression = Theory.optimizeVoiceLeading ? Theory.optimizeVoiceLeading(rawProg, 3) : rawProg;

    const base = String(fileName || 'song.mid').replace(/\.[^.]+$/, '');
    const noteCount = Object.values(tracks).reduce((a, t) => a + t.notes.length, 0);
    return {
      metadata: {
        title: (`RMG_Imported_${base}`).replace(/[^\w\-]/g, '_').slice(0, 80),
        genre: state.genre, genreName: gDef.name,
        key, scale, scaleName: Theory.SCALES[scale]?.name || scale,
        bpm: parsed.bpm || state.bpm,
        timeSignature: ts, stepsPerBar, lengthBars,
        section: 'none', motifStructure: state.motifStructure,
        articulation: state.articulation, climaxCurve: state.climaxCurve,
        chaosLevel: state.chaosLevel, density: state.density,
        fadeInBars: 0, fadeOutBars: 0,
        trackTarget: 'all', isPurePiano: false,
        useContour: false, contourPoints: null,
        noteCount, seed: Math.random(),
        importedFrom: String(fileName || ''),
        createdAt: new Date().toISOString()
      },
      progression, tracks
    };
  }

  async function handleOpenMidiFile(name, bytes) {
    try {
      if (!MidiParser) throw new Error('Engine MIDI chưa load (thiếu engine/midi.js)');
      const parsed = MidiParser.parseMidiFile(bytes);
      const song = buildSongFromMidi(parsed, name || 'song.mid');
      pushUndo('mở MIDI');
      state.bpm = song.metadata.bpm;
      state.timeSignature = song.metadata.timeSignature;
      state.lengthBars = song.metadata.lengthBars;
      state.section = 'none';
      state.currentSong = song;
      stampBaseVel(song);
      closeProgEditor();
      syncControlsFromState();
      Synth.loadSong(song);
      updateHeaderBadges();
      updateProgressionUI(song.progression);
      renderPianoRoll(0);
      pushToHistory(song);
      showToast(`📂 Đã mở ${name}: ${song.metadata.lengthBars} bars, ${song.metadata.bpm} BPM [${song.metadata.timeSignature}], ${song.metadata.noteCount} nốt (key/scale theo thiết lập: ${song.metadata.key}/${song.metadata.scale})`, 5000);
    } catch (err) {
      showToast('⚠️ Không mở được MIDI: ' + (err.message || err), 5000);
    }
  }

  function openAnyFile(name, bytes) {
    if (/\.rmg$/i.test(name || '')) openProjectFile(name, bytes);
    else handleOpenMidiFile(name, bytes);
  }

  function requestOpenProject() {
    requestOpenMidi(); // cung dialog (loc gom .rmg + .mid), phan loai theo duoi file
  }

  function requestOpenMidi() {
    if (window.rmgAPI && window.rmgAPI.openFile) {
      window.rmgAPI.openFile({ type: 'midi' }).then(res => {
        if (!res) return;
        if (res.success) {
          const base = String(res.filePath || 'song.mid').split(/[\\/]/).pop();
          openAnyFile(base, Uint8Array.from(res.data || []));
        } else if (!res.cancelled) {
          showToast('⚠️ ' + (res.error || 'Không mở được file'));
        }
      }).catch(err => showToast('⚠️ Lỗi mở file: ' + err.message));
    } else if (fileOpenMidi) {
      fileOpenMidi.click();
    } else {
      showToast('Trình duyệt không hỗ trợ mở file.');
    }
  }

  // Dan bang phim may tinh: hang duoi = quang N, hang tren = quang N+1 (G = tao bai nhanh)
  const PIANO_LOWER = { KeyZ: 0, KeyS: 1, KeyX: 2, KeyD: 3, KeyC: 4, KeyV: 5, KeyB: 7, KeyH: 8, KeyN: 9, KeyJ: 10, KeyM: 11 };
  const PIANO_UPPER = { KeyQ: 0, Digit2: 1, KeyW: 2, Digit3: 3, KeyE: 4, KeyR: 5, Digit5: 6, KeyT: 7, Digit6: 8, KeyY: 9, Digit7: 10, KeyU: 11 };

  function playPianoKey(code) {
    let semi = PIANO_LOWER[code], oct = state.pianoOctave;
    if (semi == null && PIANO_UPPER[code] != null) { semi = PIANO_UPPER[code]; oct = state.pianoOctave + 1; }
    if (semi == null) return;
    const midi = Math.max(0, Math.min(127, 12 * (oct + 1) + semi));
    auditionNote(midi, 0.4);
    if (state.recArmed && state.currentSong && state.currentSong.tracks[state.editingTrack]) {
      if (!Synth.isPlaying) {
        Synth.play();
        updatePlayButtonUI(true);
      }
      const track = state.currentSong.tracks[state.editingTrack];
      if (!track.notes) track.notes = [];
      pushUndo('đàn phím');
      track.notes.push({ step: Synth.currentStep || 0, duration: 2, midi, velocity: 100, locked: true });
      state.currentSong.metadata.noteCount = Object.values(state.currentSong.tracks).reduce((a, t) => a + (t.notes ? t.notes.length : 0), 0);
      updateHeaderBadges();
      renderPianoRoll(Synth.currentStep || 0);
      scheduleAutosave();
    }
  }

  function toggleRec() {
    state.recArmed = !state.recArmed;
    if (btnRec) btnRec.classList.toggle('rec-armed', state.recArmed);
    showToast(state.recArmed ? '🔴 REC bật: đàn phím khi phát nhạc để ghi nốt vào bè đang soạn' : '⚪ REC tắt');
  }

  function openProgEditor(bar) {
    if (!state.currentSong) return;
    const song = state.currentSong;
    if (!song.progression || !song.progression[bar]) return;
    editingProgBar = bar;
    progressionEditorTitle.textContent = `Sửa hợp âm Bar ${bar + 1} (hiện tại: ${song.progression[bar].symbol})`;
    selectProgChord.innerHTML = '';
    const key = song.metadata.key, scale = song.metadata.scale;
    for (const sym of Theory.listChordSymbols()) {
      const opt = document.createElement('option');
      let label = sym;
      try {
        const c = Theory.resolveChord(sym, key, scale, 3);
        label = `${sym} (${c.rootName}${c.chordType === 'min' ? 'm' : ''})`;
      } catch (e) {}
      opt.value = sym;
      opt.textContent = label;
      if (sym === song.progression[bar].symbol) opt.selected = true;
      selectProgChord.appendChild(opt);
    }
    progressionEditor.style.display = 'block';
    progressionDisplay.querySelectorAll('.chord-chip').forEach(chip => {
      chip.classList.toggle('editing', parseInt(chip.dataset.bar, 10) === bar);
    });
  }

  function closeProgEditor() {
    editingProgBar = -1;
    if (progressionEditor) progressionEditor.style.display = 'none';
    if (progressionDisplay) {
      progressionDisplay.querySelectorAll('.chord-chip').forEach(chip => chip.classList.remove('editing'));
    }
  }

  function applyProgChord() {
    if (!state.currentSong || editingProgBar < 0) return;
    pushUndo('sửa hợp âm');
    const song = state.currentSong;
    const sym = selectProgChord.value;
    const bar = editingProgBar;
    const gen = generatorFromSong(song);
    song.progression[bar] = gen.resolveBarChord(sym, bar);
    song.progression = gen.retuneProgression(song.progression);
    closeProgEditor();
    updateProgressionUI(song.progression);
    applyRegenToSong(bar, bar, getCheckedRegenTracks(), false);
  }

  function unlockAllNotes() {
    if (!state.currentSong) return;
    pushUndo('mở khóa');
    let n = 0;
    for (const t of Object.values(state.currentSong.tracks)) {
      for (const note of (t.notes || [])) {
        if (note.locked) { delete note.locked; n++; }
      }
    }
    renderPianoRoll(Synth.currentStep || 0);
    renderHistory();
    showToast(n > 0 ? `🔓 Đã mở khóa ${n} nốt soạn tay` : 'Không có nốt nào đang bị khóa');
  }

  /**
   * Luu velocity goc de fade khong cong don khi keo slider nhieu lan
   */
  function stampBaseVel(song) {
    if (!song || !song.tracks) return;
    for (const t of Object.values(song.tracks)) {
      for (const n of (t.notes || [])) {
        if (n.baseVel == null) n.baseVel = n.velocity;
      }
    }
  }

  /**
   * Ap fade in/out len bai HIEN TAI (khong gieo lai, giu nguyen not)
   */
  function applyFadeToSong() {
    const song = state.currentSong;
    if (!song) return;
    pushUndo('fade');
    stampBaseVel(song);
    const spb = song.metadata.stepsPerBar || 16;
    const totalBars = song.metadata.lengthBars;
    const fi = state.fadeInBars || 0;
    const fo = state.fadeOutBars || 0;
    const totalSteps = totalBars * spb;
    const fiSteps = fi * spb;
    const foStart = totalSteps - fo * spb;
    for (const t of Object.values(song.tracks)) {
      for (const n of (t.notes || [])) {
        let m = 1.0;
        if (fi > 0 && n.step < fiSteps) m *= Math.max(0.1, n.step / fiSteps);
        if (fo > 0 && n.step >= foStart) m *= Math.max(0.05, (totalSteps - n.step) / (fo * spb));
        n.velocity = Math.max(25, Math.min(127, Math.round((n.baseVel != null ? n.baseVel : n.velocity) * m)));
      }
    }
    song.metadata.fadeInBars = fi;
    song.metadata.fadeOutBars = fo;
    Synth.loadSong(song);
    updateHeaderBadges();
    renderPianoRoll(Synth.currentStep || 0);
    scheduleAutosave();
  }

  /**
   * Undo / Redo bang snapshot (bai nhac + toan bo dieu khien)
   */
  function cloneSong(song) {
    try {
      if (typeof structuredClone === 'function') return structuredClone(song);
    } catch (e) {}
    return JSON.parse(JSON.stringify(song));
  }

  function snapshotState() {
    return {
      song: state.currentSong ? cloneSong(state.currentSong) : null,
      ui: {
        genre: state.genre, key: state.key, scale: state.scale, bpm: state.bpm,
        timeSignature: state.timeSignature, lengthBars: state.lengthBars,
        section: state.section, motifStructure: state.motifStructure,
        articulation: state.articulation, climaxCurve: state.climaxCurve,
        trackTarget: state.trackTarget, chaosLevel: state.chaosLevel,
        density: state.density, fadeInBars: state.fadeInBars, fadeOutBars: state.fadeOutBars
      },
      label: '', time: 0
    };
  }

  function pushUndo(label) {
    if (!state.currentSong) return;
    const now = Date.now();
    const top = undoStack[undoStack.length - 1];
    if (top && top.label === label && (now - top.time) < 1500) return; // gop nhom keo slider
    const snap = snapshotState();
    snap.label = label;
    snap.time = now;
    undoStack.push(snap);
    if (undoStack.length > UNDO_LIMIT) undoStack.shift();
    redoStack.length = 0;
    updateUndoButtons();
  }

  function restoreSnapshot(snap) {
    if (!snap || !snap.song) return;
    const wasPlaying = Synth.isPlaying;
    if (wasPlaying) Synth.stop();
    Object.assign(state, {
      genre: snap.ui.genre, key: snap.ui.key, scale: snap.ui.scale, bpm: snap.ui.bpm,
      timeSignature: snap.ui.timeSignature, lengthBars: snap.ui.lengthBars,
      section: snap.ui.section, motifStructure: snap.ui.motifStructure,
      articulation: snap.ui.articulation, climaxCurve: snap.ui.climaxCurve,
      trackTarget: snap.ui.trackTarget, chaosLevel: snap.ui.chaosLevel,
      density: snap.ui.density, fadeInBars: snap.ui.fadeInBars, fadeOutBars: snap.ui.fadeOutBars
    });
    state.currentSong = cloneSong(snap.song);
    closeProgEditor();
    syncControlsFromState();
    Synth.loadSong(state.currentSong);
    updateHeaderBadges();
    updateProgressionUI(state.currentSong.progression);
    renderPianoRoll(0);
    renderHistory();
    updateUndoButtons();
    if (wasPlaying) {
      Synth.play();
      updatePlayButtonUI(true);
    }
  }

  function doUndo() {
    if (undoStack.length === 0) {
      showToast('↩️ Không còn bước nào để Undo');
      return;
    }
    redoStack.push(snapshotState());
    const snap = undoStack.pop();
    restoreSnapshot(snap);
    updateUndoButtons();
    showToast(`↩️ Undo: ${snap.label || 'thao tác'}`);
  }

  function doRedo() {
    if (redoStack.length === 0) {
      showToast('↪️ Không còn bước nào để Redo');
      return;
    }
    const cur = snapshotState();
    cur.label = 'redo';
    cur.time = Date.now();
    undoStack.push(cur);
    if (undoStack.length > UNDO_LIMIT) undoStack.shift();
    const snap = redoStack.pop();
    restoreSnapshot(snap);
    updateUndoButtons();
    showToast('↪️ Redo');
  }

  function updateUndoButtons() {
    if (btnUndo) btnUndo.disabled = undoStack.length === 0;
    if (btnRedo) btnRedo.disabled = redoStack.length === 0;
  }

  /**
   * Song tabs: mo nhieu bai cung luc, chuyen qua lai khong mat.
   */
  function tabLabelFor(t) {
    const song = (t.id === activeTabId && state.currentSong) ? state.currentSong
      : (t.snap && t.snap.song ? t.snap.song : null);
    const title = (song && song.metadata && song.metadata.title) || t.label || 'Tab';
    return String(title).replace(/^RMG_/, '').slice(0, 22) || 'Tab';
  }

  function renderTabs() {
    const strip = document.getElementById('tabStrip');
    if (!strip) return;
    strip.innerHTML = '';
    for (const t of songTabs) {
      const el = document.createElement('button');
      el.className = 'tab-item' + (t.id === activeTabId ? ' active' : '');
      el.title = t.label || 'Tab';
      const lab = document.createElement('span');
      lab.className = 'tab-label';
      lab.textContent = tabLabelFor(t);
      lab.addEventListener('click', () => switchTab(t.id));
      const x = document.createElement('span');
      x.className = 'tab-close';
      x.textContent = '✕';
      x.title = 'Đóng tab';
      x.addEventListener('click', (e) => { e.stopPropagation(); closeTab(t.id); });
      el.appendChild(lab);
      el.appendChild(x);
      el.addEventListener('click', () => switchTab(t.id));
      strip.appendChild(el);
    }
    const add = document.createElement('button');
    add.className = 'tab-item tab-add';
    add.title = 'Bài mới (tab mới)';
    add.textContent = '＋';
    add.addEventListener('click', newTab);
    strip.appendChild(add);
  }

  function currentTab() {
    return songTabs.find(t => t.id === activeTabId) || null;
  }

  function switchTab(id) {
    if (id === activeTabId || !state.currentSong) return;
    const cur = currentTab();
    if (cur) cur.snap = snapshotState();
    undoStack.length = 0;
    redoStack.length = 0;
    abSlotA = null;
    abSlotB = null;
    abHearing = null;
    updateABButton();
    const target = songTabs.find(t => t.id === id);
    if (!target || !target.snap || !target.snap.song) return;
    activeTabId = id;
    restoreSnapshot(target.snap);
    renderTabs();
    showToast(`📑 Tab: ${tabLabelFor(target)}`);
  }

  function newTab() {
    if (!state.currentSong) return;
    if (songTabs.length >= 6) {
      showToast('⚠️ Tối đa 6 tabs');
      return;
    }
    const cur = currentTab();
    if (cur) cur.snap = snapshotState();
    undoStack.length = 0;
    redoStack.length = 0;
    abSlotA = null;
    abSlotB = null;
    abHearing = null;
    updateABButton();
    generateNewSong();
    if (!state.currentSong) return;
    tabSeq++;
    const id = 'tab' + Date.now() + '_' + tabSeq;
    songTabs.push({ id, label: '', snap: snapshotState() });
    activeTabId = id;
    renderTabs();
  }

  function closeTab(id) {
    if (songTabs.length <= 1) {
      showToast('⚠️ Giữ lại ít nhất 1 tab');
      return;
    }
    const ix = songTabs.findIndex(t => t.id === id);
    if (ix < 0) return;
    songTabs.splice(ix, 1);
    if (id === activeTabId) {
      undoStack.length = 0;
      redoStack.length = 0;
      abSlotA = null;
      abSlotB = null;
      abHearing = null;
      updateABButton();
      const target = songTabs[Math.max(0, ix - 1)];
      activeTabId = target.id;
      if (target.snap && target.snap.song) restoreSnapshot(target.snap);
    }
    renderTabs();
  }

  /**
   * A/B compare: ghim ban A, sua tiep, bam de nghe doi chieu.
   */
  function toggleAB() {
    if (!state.currentSong) {
      showToast('⚠️ Chưa có bài nhạc!');
      return;
    }
    if (!abSlotA) {
      abSlotA = snapshotState();
      abHearing = 'A';
      updateABButton();
      showToast('📌 Đã ghim bản A — chỉnh sửa rồi bấm A/B để so với bản hiện tại');
      return;
    }
    if (abHearing === 'A') {
      abSlotB = snapshotState();
      restoreSnapshot(abSlotA);
      abHearing = 'B';
      updateABButton();
      showToast('🔊 Nghe bản A (đã ghim)');
    } else {
      if (!abSlotB) {
        showToast('⚠️ Chưa có bản B để so');
        return;
      }
      restoreSnapshot(abSlotB);
      abHearing = 'A';
      updateABButton();
      showToast('🔊 Nghe bản hiện tại (B)');
    }
  }

  function updateABButton() {
    if (!btnAB) return;
    btnAB.classList.toggle('ab-on', !!abSlotA);
    btnAB.title = !abSlotA ? 'A/B: bấm để ghim bản A (double-click ghim lại)'
      : (abHearing === 'A' ? 'Đang nghe A — bấm để nghe B' : 'Đang nghe B — bấm để nghe A');
  }

  function syncPurePianoButton() {
    const isPure = (state.trackTarget === 'pure_piano');
    if (!btnTogglePurePiano) return;
    if (isPure) {
      btnTogglePurePiano.style.borderColor = '#ffd700';
      btnTogglePurePiano.style.color = '#ffd700';
      btnTogglePurePiano.style.background = 'rgba(255, 215, 0, 0.15)';
      if (txtPurePiano) txtPurePiano.textContent = '🎹 THUẦN PIANO: BẬT';
    } else {
      btnTogglePurePiano.style.borderColor = 'var(--border-color)';
      btnTogglePurePiano.style.color = 'var(--text-muted)';
      btnTogglePurePiano.style.background = 'var(--bg-input)';
      if (txtPurePiano) txtPurePiano.textContent = '🎛️ DÀN NHẠC 5 BÈ: BẬT';
    }
  }

  function syncControlsFromState() {
    selectKey.value = state.key;
    selectScale.value = state.scale;
    selectSection.value = state.section;
    selectMotifStructure.value = state.motifStructure;
    if (selectArticulation) selectArticulation.value = state.articulation;
    if (selectClimaxCurve) selectClimaxCurve.value = state.climaxCurve;
    if (selectTrackTarget) selectTrackTarget.value = state.trackTarget;
    if (selectTimeSignature) selectTimeSignature.value = state.timeSignature;
    if (valTimeSig) valTimeSig.textContent = state.timeSignature;
    sliderBpm.value = Math.min(280, state.bpm);
    if (inputCustomBpm) inputCustomBpm.value = state.bpm;
    valBpm.textContent = `${state.bpm} BPM`;
    if (inputCustomBars) inputCustomBars.value = state.lengthBars;
    if (sliderBars) sliderBars.value = Math.min(64, state.lengthBars);
    valBars.textContent = `${state.lengthBars} Bars`;
    document.querySelectorAll('.btn-preset-bar[data-bars]').forEach(btn => {
      btn.classList.toggle('active', parseInt(btn.dataset.bars, 10) === state.lengthBars);
    });
    if (sliderFadeIn) sliderFadeIn.value = state.fadeInBars;
    if (valFadeIn) valFadeIn.textContent = `${state.fadeInBars} Bar${state.fadeInBars > 1 ? 's' : ''}`;
    if (sliderFadeOut) sliderFadeOut.value = state.fadeOutBars;
    if (valFadeOut) valFadeOut.textContent = `${state.fadeOutBars} Bar${state.fadeOutBars > 1 ? 's' : ''}`;
    if (sliderChaos) sliderChaos.value = state.chaosLevel;
    if (valChaos) valChaos.textContent = `${state.chaosLevel}%`;
    if (sliderDensity) sliderDensity.value = state.density;
    if (valDensity) valDensity.textContent = `${state.density}%`;
    genreGrid.querySelectorAll('.genre-card').forEach(c => {
      c.classList.toggle('active', c.dataset.genre === state.genre);
    });
    syncPurePianoButton();
  }

  /**
   * Mixer hien tai de export dung nhu dang nghe (vol/mute/solo/pan)
   */
  function getMix() {
    try {
      return (Synth && Synth.getTrackMix) ? Synth.getTrackMix() : null;
    } catch (e) {
      return null;
    }
  }

  function sanitizeFileName(s) {
    return String(s || 'RMG_Song').replace(/[\\/:*?"<>|]/g, '').replace(/\.\.+/g, '').trim().replace(/\s+/g, '_').slice(0, 80) || 'RMG_Song';
  }

  let exportDirCache = null;

  async function refreshExportDirLabel() {
    try {
      if (window.rmgAPI && window.rmgAPI.getExportDir) {
        const r = await window.rmgAPI.getExportDir();
        if (r && r.success && r.dir) {
          exportDirCache = r.dir;
          if (exportDirLabel) exportDirLabel.textContent = r.dir;
          return;
        }
      }
    } catch (e) {}
    if (exportDirLabel && !exportDirCache) exportDirLabel.textContent = '(chọn mỗi lần)';
  }

  async function changeExportDir() {
    try {
      if (!(window.rmgAPI && window.rmgAPI.setExportDir)) {
        showToast('Chạy trong app RMG để đổi thư mục xuất');
        return;
      }
      const r = await window.rmgAPI.setExportDir();
      if (r && r.success) {
        exportDirCache = r.dir;
        if (exportDirLabel) exportDirLabel.textContent = r.dir;
        showToast('📁 Thư mục xuất: ' + r.dir);
      }
    } catch (e) {
      showToast('⚠️ ' + (e.message || e));
    }
  }

  async function openExportDir() {
    try {
      if (!(window.rmgAPI && window.rmgAPI.openFolder)) {
        showToast('Chạy trong app RMG để mở thư mục');
        return;
      }
      await window.rmgAPI.openFolder({ folder: 'export' });
    } catch (e) {
      showToast('⚠️ ' + (e.message || e));
    }
  }

  async function refreshRecent() {
    if (!recentList) return;
    recentList.innerHTML = '';
    try {
      if (!(window.rmgAPI && window.rmgAPI.listFiles)) {
        recentList.innerHTML = '<div style="font-size:0.72rem; color:var(--text-dim); text-align:center; padding:8px;">Chạy trong app RMG để xem file đã xuất.</div>';
        return;
      }
      const r = await window.rmgAPI.listFiles({ folder: 'export' });
      const files = (r && r.files) || [];
      if (!files.length) {
        recentList.innerHTML = '<div style="font-size:0.72rem; color:var(--text-dim); text-align:center; padding:8px;">Chưa có file nào. Hãy xuất nhanh!</div>';
        return;
      }
      for (const f of files.slice(0, 12)) {
        const el = document.createElement('div');
        el.className = 'recent-item';
        const d = new Date(f.mtime || Date.now());
        const hh = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
        el.innerHTML = `<span>📄 ${escapeHtml(f.name)}</span><span>${(f.size / 1024).toFixed(0)} KB • ${hh}</span>`;
        recentList.appendChild(el);
      }
    } catch (e) {}
  }

  async function quickExport(kind) {
    if (!state.currentSong) {
      showToast('⚠️ Chưa có bài nhạc!');
      return;
    }
    if (kind === 'wav') {
      await exportWav(true);
      return;
    }
    const isMidi = kind === 'midi';
    const fileName = sanitizeFileName(state.currentSong.metadata.title) + (isMidi ? '.mid' : '.mmp');
    const sf2 = isMidi ? null : await resolveSf2();
    try {
      if (window.rmgAPI && window.rmgAPI.saveFileDirect) {
        const data = isMidi
          ? Array.from(Exporter.generateMidiFile(state.currentSong, getMix(), state.swing))
          : Exporter.generateLmmsProject(state.currentSong, getMix(), state.swing, sf2);
        const r = await window.rmgAPI.saveFileDirect({ folder: 'export', fileName, data });
        if (r && r.success) {
          showToast(`⚡ Đã xuất nhanh: ${r.filePath}`, 4000);
          refreshRecent();
          return;
        }
        throw new Error((r && r.error) || 'export failed');
      }
    } catch (e) {
      showToast('⚠️ Xuất nhanh lỗi, chuyển sang dialog: ' + (e.message || e));
    }
    if (isMidi) handleSaveMidi();
    else handleSaveMmp();
  }

  /**
   * Luu mang bytes lon theo chunk (tranh JSON khong lo qua bridge) - dung cho WAV
   */
  async function saveLargeArray(folder, fileName, u8) {
    const CHUNK = 512 * 1024;
    const total = Math.max(1, Math.ceil(u8.length / CHUNK));
    if (total === 1) {
      const r = await window.rmgAPI.saveFileDirect({ folder, fileName, data: Array.from(u8) });
      if (!r || !r.success) throw new Error((r && r.error) || 'save failed');
      return r;
    }
    let last = null;
    for (let i = 0; i < total; i++) {
      const part = u8.subarray(i * CHUNK, Math.min(u8.length, (i + 1) * CHUNK));
      last = await window.rmgAPI.saveFileDirect({ folder, fileName, data: Array.from(part), chunkIndex: i, totalChunks: total });
      if (!last || !last.success) throw new Error((last && last.error) || 'chunk failed');
    }
    return last;
  }

  async function exportWav(useQuick) {    if (!state.currentSong) {
      showToast('⚠️ Chưa có bài nhạc!');
      return;
    }
    const md = state.currentSong.metadata;
    const estSec = (md.lengthBars * (md.stepsPerBar || 16) * (60 / (md.bpm || 120) / 4)) + 2;
    if (estSec * 44100 * 4 > 150 * 1024 * 1024) {
      showToast('⚠️ Bài quá dài để render WAV (>150MB). Hãy xuất MIDI/MMP.');
      return;
    }
    showToast('🎧 Đang render WAV, chờ chút...', 6000);
    try {
      if (Synth.isPlaying) {
        Synth.stop();
        updatePlayButtonUI(false);
      }
      const buf = await Synth.renderOffline(state.currentSong, 2);
      const wav = Exporter.encodeWavFile(buf);
      const fileName = sanitizeFileName(md.title) + '.wav';
      if (useQuick && window.rmgAPI && window.rmgAPI.saveFileDirect) {
        const r = await saveLargeArray('export', fileName, wav);
        if (r && r.success) {
          showToast(`🎧 WAV xong (${(wav.length / 1048576).toFixed(1)} MB): ${r.filePath}`, 6000);
          refreshRecent();
          return;
        }
      }
      if (window.rmgAPI && window.rmgAPI.saveFile) {
        const r = await window.rmgAPI.saveFile({ data: Array.from(wav), defaultName: fileName, type: 'wav' });
        if (r && r.success) {
          showToast(`🎧 WAV xong: ${r.filePath}`, 5000);
          refreshRecent();
        }
      } else {
        const blob = new Blob([wav], { type: 'audio/wav' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
        showToast(`🎧 WAV xong: ${fileName}`, 5000);
      }
    } catch (err) {
      showToast('⚠️ Render WAV lỗi: ' + (err.message || err), 5000);
    }
  }

  /**
   * Finish 1-click: validate + final hit + xuat MIDI & MMP vao thu muc xuat
   */
  async function finishSong() {
    const song = state.currentSong;
    if (!song) {
      showToast('⚠️ Chưa có bài nhạc!');
      return;
    }
    pushUndo('finish');
    Generator.MusicGenerator.prototype.arrangeFinal(song, { finalHit: state.finalHit });
    stampBaseVel(song);
    Synth.loadSong(song);
    updateHeaderBadges();
    updateProgressionUI(song.progression);
    renderPianoRoll(Synth.currentStep || 0);
    renderHistory();
    const base = sanitizeFileName(song.metadata.title);
    const sf2 = await resolveSf2();
    try {
      if (window.rmgAPI && window.rmgAPI.saveFileDirect) {
        const done = [];
        const mid = await window.rmgAPI.saveFileDirect({
          folder: 'export', fileName: base + '.mid',
          data: Array.from(Exporter.generateMidiFile(song, getMix(), state.swing))
        });
        if (mid && mid.success) done.push(mid.filePath);
        const mmp = await window.rmgAPI.saveFileDirect({
          folder: 'export', fileName: base + '.mmp',
          data: Exporter.generateLmmsProject(song, getMix(), state.swing, sf2)
        });
        if (mmp && mmp.success) done.push(mmp.filePath);
        if (done.length) {
          showToast(`⚡ Finish xong (${done.length} file)${sf2 ? ' [SoundFont 🎻]' : ''}: ${done.join(' • ')}`, 6000);
          refreshRecent();
          return;
        }
      }
    } catch (e) {}
    showToast('⚠️ Finish cần chạy trong app RMG (dùng nút xuất thường)');
  }

  /**
   * Ep style hien tai vao bai dang mo: giu melody, thay arp/bass/drums/chords
   */
  function transferStyle() {
    const song = state.currentSong;
    if (!song) {
      showToast('⚠️ Chưa có bài nhạc! Mở MIDI trước.');
      return;
    }
    const target = state.genre;
    const gDef = Theory.GENRES[target];
    if (!gDef) return;
    if (song.metadata.genre === target) {
      showToast('Bài đã đúng style ' + target + ' rồi — đổi genre khác rồi bấm lại');
      return;
    }
    pushUndo('ép style');
    song.metadata.genre = target;
    song.metadata.genreName = gDef.name;
    const gen = generatorFromSong(song);
    const res = gen.regenerateRegion(song, {
      fromBar: 0, toBar: song.metadata.lengthBars - 1,
      tracks: ['chords', 'arp', 'bass', 'drums']
    });
    const stat = spliceRegenResult(song, res);
    Synth.loadSong(song);
    updateHeaderBadges();
    renderPianoRoll(Synth.currentStep || 0);
    renderHistory();
    showToast(`🎭 Đã ép style ${gDef.name}: giữ melody, thay ${stat.added} nốt đệm`, 5000);
  }

  /**
   * Seed chia se: copy/paste/daily - cung seed ra cung bai
   */
  function copySeed() {
    if (!state.currentSong) {
      showToast('⚠️ Chưa có bài nhạc!');
      return;
    }
    const md = state.currentSong.metadata;
    const data = {
      v: 1, genre: md.genre, key: md.key, scale: md.scale, bpm: md.bpm,
      timeSignature: md.timeSignature, lengthBars: md.lengthBars, section: md.section,
      motifStructure: md.motifStructure, articulation: md.articulation,
      climaxCurve: md.climaxCurve, chaosLevel: md.chaosLevel, density: md.density,
      fadeInBars: md.fadeInBars, fadeOutBars: md.fadeOutBars,
      trackTarget: md.trackTarget, seed: md.seed
    };
    const s = JSON.stringify(data);
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(s).then(
          () => showToast('🔗 Đã copy seed — gửi cho ai nhập cũng ra đúng bài này!'),
          () => showToast('⚠️ Không copy được clipboard')
        );
      } else {
        showToast('Clipboard không khả dụng');
      }
    } catch (e) {
      showToast('⚠️ ' + (e.message || e));
    }
  }

  function applySeedOptions(o) {
    pushUndo('nhập seed');
    state.genre = o.genre; state.key = o.key; state.scale = o.scale;
    state.bpm = o.bpm; state.timeSignature = o.timeSignature || '4/4';
    state.lengthBars = o.lengthBars; state.section = o.section || 'none';
    state.motifStructure = o.motifStructure || 'none';
    state.articulation = o.articulation || 'auto';
    state.climaxCurve = o.climaxCurve || 'none';
    state.chaosLevel = o.chaosLevel; state.density = o.density;
    state.fadeInBars = o.fadeInBars || 0; state.fadeOutBars = o.fadeOutBars || 0;
    if (o.trackTarget) state.trackTarget = o.trackTarget;
    syncControlsFromState();
    const wasPlaying = Synth.isPlaying;
    if (wasPlaying) Synth.stop();
    const gen = new Generator.MusicGenerator({
      genre: state.genre, key: state.key, scale: state.scale, bpm: state.bpm,
      timeSignature: state.timeSignature, lengthBars: state.lengthBars,
      section: state.section, motifStructure: state.motifStructure,
      articulation: state.articulation, climaxCurve: state.climaxCurve,
      useContour: false, contourPoints: null,
      fadeInBars: state.fadeInBars, fadeOutBars: state.fadeOutBars,
      trackTarget: state.trackTarget, chaosLevel: state.chaosLevel,
      density: state.density, humanize: true,
      loopMode: state.loopMode, finalHit: state.finalHit, seed: o.seed
    });
    state.currentSong = gen.generate();
    stampBaseVel(state.currentSong);
    Synth.loadSong(state.currentSong);
    updateHeaderBadges();
    updateProgressionUI(state.currentSong.progression);
    renderPianoRoll(0);
    renderHistory();
    pushToHistory(state.currentSong);
    if (wasPlaying) {
      Synth.play();
      updatePlayButtonUI(true);
    }
    showToast('🌱 Đã gieo từ seed — cùng seed ra cùng bài!');
  }

  function pasteSeed() {
    const v = prompt('Dán seed JSON vào đây:', '');
    if (v == null) return;
    try {
      const o = JSON.parse(v.trim());
      if (!o || o.v !== 1 || !Theory.GENRES[o.genre]) throw new Error('Seed không hợp lệ');
      applySeedOptions(o);
    } catch (e) {
      showToast('⚠️ Seed không hợp lệ');
    }
  }

  function dailySeed() {
    const d = new Date();
    const seed = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
    applySeedOptions({
      v: 1, genre: state.genre, key: state.key, scale: state.scale, bpm: state.bpm,
      timeSignature: state.timeSignature, lengthBars: state.lengthBars, section: state.section,
      motifStructure: state.motifStructure, articulation: state.articulation,
      climaxCurve: state.climaxCurve, chaosLevel: state.chaosLevel, density: state.density,
      fadeInBars: state.fadeInBars, fadeOutBars: state.fadeOutBars,
      trackTarget: state.trackTarget, seed
    });
    showToast(`📅 Seed hôm nay: ${seed} — ai nhập seed này cũng ra cùng bài!`, 5000);
  }

  const APP_VERSION = '2.1.0';
  const UPDATE_CHECK_URL = ''; // VD: 'https://api.github.com/OWNER/RMG/releases/latest' (tao repo roi dien vao)
  const SF2_URL = 'https://raw.githubusercontent.com/mrbumpy409/GeneralUser-GS/main/GeneralUser-GS.sf2';
  const SF2_NAME = 'GeneralUser-GS.sf2';

  let lastProjectName = null;

  function projectPayload() {
    if (!state.currentSong) return null;
    return {
      app: 'RMG', v: 1, savedAt: Date.now(),
      ui: {
        genre: state.genre, key: state.key, scale: state.scale, bpm: state.bpm,
        timeSignature: state.timeSignature, lengthBars: state.lengthBars,
        section: state.section, motifStructure: state.motifStructure,
        articulation: state.articulation, climaxCurve: state.climaxCurve,
        trackTarget: state.trackTarget, chaosLevel: state.chaosLevel,
        density: state.density, fadeInBars: state.fadeInBars, fadeOutBars: state.fadeOutBars
      },
      song: state.currentSong
    };
  }

  async function saveProject(quick) {
    if (!state.currentSong) {
      showToast('⚠️ Chưa có bài nhạc!');
      return;
    }
    const data = JSON.stringify(projectPayload());
    const fileName = sanitizeFileName(state.currentSong.metadata.title) + '.rmg';
    try {
      if (quick && window.rmgAPI && window.rmgAPI.saveFileDirect) {
        const r = await window.rmgAPI.saveFileDirect({ folder: 'export', fileName, data });
        if (r && r.success) {
          lastProjectName = fileName;
          showToast(`💾 Project xong: ${r.filePath}`, 4000);
          refreshRecent();
          return;
        }
      }
    } catch (e) {}
    // Save As dialog
    try {
      if (window.rmgAPI && window.rmgAPI.saveFile) {
        const r = await window.rmgAPI.saveFile({ data, defaultName: fileName, type: 'rmg' });
        if (r && r.success) {
          lastProjectName = String(r.filePath || '').split(/[\\/]/).pop();
          showToast(`💾 Project xong: ${r.filePath}`, 4000);
          refreshRecent();
        }
        return;
      }
    } catch (e) {}
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`💾 Project xong: ${fileName}`);
  }

  async function openProjectFile(name, bytes) {
    try {
      const obj = JSON.parse(new TextDecoder().decode(bytes));
      if (!obj || obj.app !== 'RMG' || !obj.song || !obj.song.metadata || !obj.song.tracks) {
        throw new Error('File .rmg không hợp lệ');
      }
      const song = obj.song;
      const ui = obj.ui || {};
      pushUndo('mở project');
      if (ui.genre && Theory.GENRES[ui.genre]) state.genre = ui.genre;
      if (ui.key) state.key = ui.key;
      if (ui.scale && Theory.SCALES[ui.scale]) state.scale = ui.scale;
      if (ui.bpm) state.bpm = ui.bpm;
      if (ui.timeSignature) state.timeSignature = ui.timeSignature;
      if (ui.lengthBars) state.lengthBars = ui.lengthBars;
      if (ui.section) state.section = ui.section;
      if (ui.motifStructure) state.motifStructure = ui.motifStructure;
      if (ui.articulation) state.articulation = ui.articulation;
      if (ui.climaxCurve) state.climaxCurve = ui.climaxCurve;
      if (ui.trackTarget) state.trackTarget = ui.trackTarget;
      if (ui.chaosLevel != null) state.chaosLevel = ui.chaosLevel;
      if (ui.density != null) state.density = ui.density;
      state.fadeInBars = ui.fadeInBars || 0;
      state.fadeOutBars = ui.fadeOutBars || 0;
      state.currentSong = song;
      stampBaseVel(song);
      closeProgEditor();
      syncControlsFromState();
      Synth.loadSong(song);
      updateHeaderBadges();
      updateProgressionUI(song.progression);
      renderPianoRoll(0);
      renderHistory();
      lastProjectName = String(name || '').split(/[\\/]/).pop() || null;
      showToast(`📂 Đã mở project: ${lastProjectName || name}`, 4000);
    } catch (err) {
      showToast('⚠️ Không mở được project: ' + (err.message || err), 5000);
    }
  }

  function requestOpenProject() {
    if (window.rmgAPI && window.rmgAPI.openFile) {
      window.rmgAPI.openFile({ type: 'any' }).then(res => {
        if (!res) return;
        if (res.success) {
          const base = String(res.filePath || 'song.rmg').split(/[\\/]/).pop();
          openProjectFile(base, Uint8Array.from(res.data || []));
        } else if (!res.cancelled) {
          showToast('⚠️ ' + (res.error || 'Không mở được file'));
        }
      }).catch(err => showToast('⚠️ Lỗi mở file: ' + err.message));
    } else if (fileOpenMidi) {
      fileOpenMidi.click();
    }
  }

  /**
   * So seed: luu/nap seed co ten (localStorage)
   */
  const SEED_GALLERY_KEY = 'rmg_seed_gallery_v1';

  function getSeedGallery() {
    try {
      const arr = JSON.parse(localStorage.getItem(SEED_GALLERY_KEY) || '[]');
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      return [];
    }
  }

  function saveSeedGallery(arr) {
    try {
      localStorage.setItem(SEED_GALLERY_KEY, JSON.stringify(arr.slice(0, 50)));
    } catch (e) {}
  }

  function renderSeedGallery() {
    const list = document.getElementById('seedList');
    if (!list) return;
    list.innerHTML = '';
    const arr = getSeedGallery();
    if (!arr.length) {
      list.innerHTML = '<div style="font-size:0.72rem; color:var(--text-dim); text-align:center; padding:8px;">Chưa có seed nào. Gieo bài ưng rồi bấm Lưu.</div>';
      return;
    }
    for (const item of arr) {
      const el = document.createElement('div');
      el.className = 'recent-item';
      el.innerHTML = `<span style="cursor:pointer;" title="Bấm để gieo từ seed này">🌱 ${escapeHtml(item.name)}</span><span class="seed-del" style="cursor:pointer;" title="Xóa">🗑️</span>`;
      el.querySelector('span').addEventListener('click', () => {
        try {
          applySeedOptions(JSON.parse(item.seed));
        } catch (e) {
          showToast('⚠️ Seed hỏng');
        }
      });
      el.querySelector('.seed-del').addEventListener('click', (e) => {
        e.stopPropagation();
        saveSeedGallery(getSeedGallery().filter(x => x.id !== item.id));
        renderSeedGallery();
      });
      list.appendChild(el);
    }
  }

  function saveSeedToGallery() {
    if (!state.currentSong) {
      showToast('⚠️ Chưa có bài nhạc!');
      return;
    }
    const md = state.currentSong.metadata;
    const nameInput = document.getElementById('seedName');
    const name = ((nameInput && nameInput.value) || md.title || 'Seed').trim().slice(0, 50) || 'Seed';
    const data = {
      v: 1, genre: md.genre, key: md.key, scale: md.scale, bpm: md.bpm,
      timeSignature: md.timeSignature, lengthBars: md.lengthBars, section: md.section,
      motifStructure: md.motifStructure, articulation: md.articulation,
      climaxCurve: md.climaxCurve, chaosLevel: md.chaosLevel, density: md.density,
      fadeInBars: md.fadeInBars, fadeOutBars: md.fadeOutBars,
      trackTarget: md.trackTarget, seed: md.seed
    };
    const arr = getSeedGallery();
    arr.unshift({ id: 'seed_' + Date.now(), name, seed: JSON.stringify(data), createdAt: Date.now() });
    saveSeedGallery(arr);
    renderSeedGallery();
    if (nameInput) nameInput.value = '';
    showToast(`🌱 Đã lưu seed: ${name}`);
  }

  async function checkUpdate() {
    const verEl = document.getElementById('appVersionLabel');
    try {
      if (!UPDATE_CHECK_URL) {
        showToast('Chưa cấu hình kênh cập nhật (cần GitHub repo). Bản hiện tại: v' + APP_VERSION, 5000);
        return;
      }
      showToast('Đang kiểm tra cập nhật...');
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 15000);
      const res = await fetch(UPDATE_CHECK_URL, { signal: ctrl.signal });
      clearTimeout(t);
      const info = await res.json();
      const tag = String(info.tag_name || info.version || '').replace(/^v/, '');
      if (tag && tag !== APP_VERSION) {
        showToast(`🎉 Có bản mới v${tag}! (đang dùng v${APP_VERSION})`, 6000);
      } else {
        showToast(`✓ Đang dùng bản mới nhất (v${APP_VERSION})`);
      }
      if (verEl) verEl.textContent = 'v' + APP_VERSION;
    } catch (e) {
      showToast('⚠️ Không kiểm tra được (mất mạng?): bản hiện tại v' + APP_VERSION);
    }
  }

  /**
   * SoundFont tieng that (GeneralUser GS): tai 1 lan, export MMP dung Sf2 player
   */
  let sf2LocalPath = null;

  async function ensureSoundFont() {
    if (sf2LocalPath) return sf2LocalPath;
    try {
      if (!(window.rmgAPI && window.rmgAPI.saveFileDirect && window.rmgAPI.listFiles)) {
        showToast('Tải SoundFont cần chạy trong app RMG');
        return null;
      }
      const l = await window.rmgAPI.listFiles({ folder: 'soundfonts' });
      const hit = ((l && l.files) || []).find(f => f.name === SF2_NAME);
      if (hit) {
        sf2LocalPath = l.dir + '\\' + SF2_NAME;
        updateSfStatus();
        return sf2LocalPath;
      }
    } catch (e) {}
    // Tai ve (~30MB, 1 lan duy nhat)
    try {
      showToast('⬇️ Đang tải SoundFont tiếng thật (~30MB, 1 lần duy nhất)...', 6000);
      const res = await fetch(SF2_URL);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const buf = new Uint8Array(await res.arrayBuffer());
      if (buf.length < 1000000 || buf[0] !== 0x52 || buf[1] !== 0x49) {
        throw new Error('File tải về không phải SoundFont');
      }
      await saveLargeArray('soundfonts', SF2_NAME, buf);
      showToast('🎻 Tải SoundFont xong! Export từ giờ dùng tiếng thật.', 5000);
      sf2LocalPath = null; // doc lai duong dan chuan
      try {
        const l2 = await window.rmgAPI.listFiles({ folder: 'soundfonts' });
        const hit2 = ((l2 && l2.files) || []).find(f => f.name === SF2_NAME);
        if (hit2) sf2LocalPath = l2.dir + '\\' + SF2_NAME;
      } catch (e) {}
      updateSfStatus();
      return sf2LocalPath;
    } catch (e) {
      showToast('⚠️ Không tải được SoundFont (mất mạng?): dùng tiếng synth', 5000);
      return null;
    }
  }

  function updateSfStatus() {
    const el = document.getElementById('sfStatus');
    if (!el) return;
    el.textContent = sf2LocalPath ? 'có sẵn ✓' : 'chưa có';
  }

  async function resolveSf2() {
    try {
      const cb = document.getElementById('checkUseSf2');
      if (!cb || !cb.checked) return null;
      return await ensureSoundFont();
    } catch (e) {
      return null;
    }
  }

  async function initSoundFontStatus() {
    try {
      if (window.rmgAPI && window.rmgAPI.listFiles) {
        const l = await window.rmgAPI.listFiles({ folder: 'soundfonts' });
        const hit = ((l && l.files) || []).find(f => f.name === SF2_NAME);
        if (hit) sf2LocalPath = l.dir + '\\' + SF2_NAME;
      }
    } catch (e) {}
    updateSfStatus();
  }

  async function batchExportMidi() {    if (!songHistory.length) {
      showToast('⚠️ Lịch sử trống, không có gì để xuất');
      return;
    }
    if (!(window.rmgAPI && window.rmgAPI.saveFileDirect)) {
      showToast('⚠️ Xuất hàng loạt cần chạy trong app RMG');
      return;
    }
    showToast(`🎵 Đang xuất ${songHistory.length} file MIDI...`);
    let ok = 0;
    for (const item of songHistory) {
      if (!item.songData) continue;
      try {
        const bytes = Exporter.generateMidiFile(item.songData, null, 0);
        const name = sanitizeFileName(item.customTitle || item.title) + '.mid';
        const r = await window.rmgAPI.saveFileDirect({ folder: 'export', fileName: name, data: Array.from(bytes) });
        if (r && r.success) ok++;
      } catch (e) {}
    }
    refreshRecent();
    showToast(`🎵 Xuất xong ${ok}/${songHistory.length} file MIDI vào thư mục xuất`, 5000);
  }

  /**
   * Khoi dong: autosave moi nhat -> lich su gan nhat -> bai moi
   */
  async function restoreStartup() {
    try {
      if (window.rmgAPI && window.rmgAPI.listFiles && window.rmgAPI.readFileDirect) {
        const l = await window.rmgAPI.listFiles({ folder: 'autosave' });
        const files = (l && l.files) || [];
        if (files.length) {
          const r = await window.rmgAPI.readFileDirect({ folder: 'autosave', fileName: files[0].name });
          if (r && r.success && r.data) {
            const obj = JSON.parse(new TextDecoder().decode(Uint8Array.from(r.data)));
            if (obj && obj.song && obj.song.metadata && obj.song.tracks) {
              const md = obj.song.metadata;
              loadHistoryItem({
                genre: md.genre, key: md.key, scale: md.scale, bpm: md.bpm,
                lengthBars: md.lengthBars, section: md.section, songData: obj.song
              }, true);
              showToast('💾 Đã khôi phục bài trước từ autosave', 4000);
              return;
            }
          }
        }
      }
    } catch (e) {}
    if (songHistory.length && songHistory[0].songData) {
      loadHistoryItem(songHistory[0], true);
      return;
    }
    generateNewSong(true);
  }

  /**
   * Generate a New Track
   */
  function generateNewSong(addToHistory = true) {
    const wasPlaying = Synth.isPlaying;
    if (wasPlaying) Synth.stop();
    pushUndo('tạo bài');

    const safeBars = Math.max(1, Math.min(256, parseInt(state.lengthBars, 10) || 8));
    state.lengthBars = safeBars;
    if (valBars) valBars.textContent = `${safeBars} Bars`;

    const gen = new Generator.MusicGenerator({
      genre: state.genre,
      key: state.key,
      scale: state.scale,
      bpm: state.bpm || 120,
      timeSignature: state.timeSignature || '4/4',
      lengthBars: safeBars,
      section: state.section,
      motifStructure: state.motifStructure,
      articulation: state.articulation,
      climaxCurve: state.climaxCurve,
      useContour: state.contourEnabled,
      contourPoints: state.contourPoints,
      fadeInBars: state.fadeInBars,
      fadeOutBars: state.fadeOutBars,
      trackTarget: state.trackTarget,
      chaosLevel: state.chaosLevel,
      density: state.density,
      humanize: true,
      loopMode: state.loopMode,
      finalHit: state.finalHit,
      seed: Math.random()
    });

    state.currentSong = gen.generate();
    stampBaseVel(state.currentSong);
    Synth.loadSong(state.currentSong);

    updateHeaderBadges();
    updateProgressionUI(state.currentSong.progression);
    renderPianoRoll();

    if (addToHistory) {
      pushToHistory(state.currentSong);
    }

    if (wasPlaying) {
      Synth.play();
      updatePlayButtonUI(true);
    }

    showToast(`🎲 Đã gieo nhạc mới (${state.section.toUpperCase()} • ${state.lengthBars} Bars [${state.timeSignature}] • ${Theory.GENRES[state.genre].name})`);
  }

  /**
   * Push Song to Generation History
   */
  function pushToHistory(songData) {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    const item = {
      id: 'rmg_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      timeStr,
      section: songData.metadata.section || 'none',
      title: songData.metadata.title,
      genre: songData.metadata.genre,
      key: songData.metadata.key,
      scale: songData.metadata.scale,
      bpm: songData.metadata.bpm,
      lengthBars: songData.metadata.lengthBars,
      noteCount: songData.metadata.noteCount || 0,
      fav: false,
      customTitle: '',
      songData: songData
    };

    songHistory.unshift(item);
    if (songHistory.length > 50) songHistory.pop(); // Keep last 50
    saveHistoryStorage();
    renderHistory();
    autosaveSong(item);
  }

  /**
   * Autosave bai ra dia (chong mat khi crash) - im lang, toi da 20 file
   */
  async function pruneAutosaves() {
    try {
      const l = await window.rmgAPI.listFiles({ folder: 'autosave' });
      const files = (l && l.files) || [];
      if (files.length > 20) {
        for (const f of files.slice(20)) {
          try {
            await window.rmgAPI.deleteFile({ folder: 'autosave', fileName: f.name });
          } catch (e) {}
        }
      }
    } catch (e) {}
  }

  async function autosaveSong(item) {
    try {
      if (!(window.rmgAPI && window.rmgAPI.saveFileDirect)) return;
      if (!item || !item.songData) return;
      await window.rmgAPI.saveFileDirect({
        folder: 'autosave',
        fileName: `song_${item.id}.rmg.json`,
        data: JSON.stringify({ v: 1, savedAt: Date.now(), song: item.songData })
      });
      pruneAutosaves();
    } catch (e) {}
  }

  let autosaveTimer = null;

  /**
   * Autosave sau khi sua not (debounce 3s) - crash khong mat doan dang soan
   */
  function scheduleAutosave() {
    if (autosaveTimer) clearTimeout(autosaveTimer);
    autosaveTimer = setTimeout(() => {
      autosaveTimer = null;
      try {
        if (!state.currentSong || !(window.rmgAPI && window.rmgAPI.saveFileDirect)) return;
        window.rmgAPI.saveFileDirect({
          folder: 'autosave',
          fileName: `song_live_${Date.now()}.rmg.json`,
          data: JSON.stringify({ v: 1, savedAt: Date.now(), song: state.currentSong })
        }).then(() => pruneAutosaves()).catch(() => {});
      } catch (e) {}
    }, 3000);
  }

  let quotaWarned = false;

  function saveHistoryStorage() {
    const tiers = [30, 15, 5, 1];
    for (const n of tiers) {
      try {
        localStorage.setItem('rmg_history_v2', JSON.stringify(songHistory.slice(0, n)));
        if (n < 30 && !quotaWarned) {
          quotaWarned = true;
          showToast(`⚠️ Lịch sử quá lớn, chỉ giữ được ${n} bản mới nhất trên máy này`, 4500);
        }
        return;
      } catch (e) {}
    }
  }

  function loadHistoryStorage() {
    try {
      const data = localStorage.getItem('rmg_history_v2');
      if (data) {
        songHistory = JSON.parse(data);
      }
    } catch (e) {
      songHistory = [];
    }
  }

  /**
   * Render History List UI
   */
  function renderHistory() {
    historyList.innerHTML = '';

    // Rebuild filter options (giu lua chon hien tai)
    if (historyFilter) {
      const cur = state.historyFilter || 'all';
      const genres = [...new Set(songHistory.map(i => i.genre).filter(Boolean))];
      historyFilter.innerHTML = '<option value="all">Tất cả</option><option value="fav">★ Yêu thích</option>' +
        genres.map(g => `<option value="genre:${escapeHtml(g)}">${escapeHtml(g)}</option>`).join('');
      historyFilter.value = [...historyFilter.options].some(o => o.value === cur) ? cur : 'all';
      state.historyFilter = historyFilter.value;
    }
    const f = state.historyFilter || 'all';
    const visible = songHistory.filter(item => {
      if (f === 'all') return true;
      if (f === 'fav') return !!item.fav;
      if (f.startsWith('genre:')) return item.genre === f.slice(6);
      return true;
    });

    if (!visible.length) {
      historyList.innerHTML = '<div style="font-size:0.75rem; color:var(--text-dim); text-align:center; padding:12px;">Không có mục nào (đổi bộ lọc hoặc bấm Generate!).</div>';
      return;
    }

    visible.forEach((item, index) => {
      const el = document.createElement('div');
      el.className = 'history-item';
      // Hien so not LIVE tu songData (bai co the da sua sau khi push)
      const liveCount = (item.songData && item.songData.tracks)
        ? Object.values(item.songData.tracks).reduce((acc, t) => acc + (t.notes ? t.notes.length : 0), 0)
        : (item.noteCount || 0);

      const secTag = item.section.toUpperCase();
      const secClass = `badge-tag-${item.section}`;
      const dispTitle = escapeHtml(item.customTitle || item.title);

      el.innerHTML = `
        <div class="history-item-left">
          <span class="badge-section-tag ${secClass}">${secTag}</span>
          <div class="history-item-info">
            <h4 title="Double-click để đổi tên">🎵 ${dispTitle}</h4>
            <p>⏱ ${item.timeStr} • ${item.lengthBars} Bars • ${item.scale} • ${item.bpm} BPM • ${liveCount} Nốt</p>
          </div>
        </div>
        <div class="history-item-actions">
          <button class="btn-history-action btn-act-fav" data-id="${item.id}" title="Đánh dấu yêu thích">
            ${item.fav ? '★' : '☆'}
          </button>
          <button class="btn-history-action btn-act-reload" data-id="${item.id}" title="Tải lại đoạn nhạc này">
            📁 Tải lại
          </button>
          <button class="btn-history-action btn-act-continue" data-id="${item.id}" title="Tạo phân đoạn tiếp nối bài hát">
            🔗 Tạo tiếp nối
          </button>
          <button class="btn-history-action btn-act-merge" data-id="${item.id}" title="Ghép nối đoạn này với các đoạn khác">
            ➕ Ghép nối
          </button>
          <button class="btn-history-action btn-act-del" data-id="${item.id}" title="Xóa">
            🗑️
          </button>
        </div>
      `;

      // Action Listeners
      el.querySelector('.btn-act-fav').addEventListener('click', (e) => {
        e.stopPropagation();
        item.fav = !item.fav;
        saveHistoryStorage();
        renderHistory();
      });

      el.querySelector('.history-item-info h4').addEventListener('dblclick', (e) => {
        e.stopPropagation();
        const v = prompt('Tên mới cho bản này:', item.customTitle || item.title || '');
        if (v === null) return;
        const t = v.trim().slice(0, 60);
        if (t) {
          item.customTitle = t;
          saveHistoryStorage();
          renderHistory();
        }
      });

      el.querySelector('.btn-act-reload').addEventListener('click', (e) => {
        e.stopPropagation();
        loadHistoryItem(item);
      });
      el.querySelector('.btn-act-continue').addEventListener('click', (e) => {
        e.stopPropagation();
        createContinuation(item);
      });

      el.querySelector('.btn-act-merge').addEventListener('click', (e) => {
        e.stopPropagation();
        mergeAllHistoryItems();
      });

      el.querySelector('.btn-act-del').addEventListener('click', (e) => {
        e.stopPropagation();
        deleteHistoryItem(item.id);
      });

      historyList.appendChild(el);
    });
  }

  function loadHistoryItem(item, quiet = false) {
    if (!quiet) pushUndo('tải lại');
    // Genre custom co the da bi xoa -> fallback
    if (!Theory.GENRES[item.genre]) item.genre = 'touhou';
    state.currentSong = item.songData;
    stampBaseVel(state.currentSong);
    state.genre = item.genre;
    state.key = item.key;
    state.scale = item.scale;
    state.bpm = item.bpm;
    state.lengthBars = item.lengthBars;
    state.section = item.section;
    state.motifStructure = item.songData.metadata.motifStructure || 'none';
    state.articulation = item.songData.metadata.articulation || 'auto';
    state.climaxCurve = item.songData.metadata.climaxCurve || 'none';
    state.chaosLevel = item.songData.metadata.chaosLevel !== undefined ? item.songData.metadata.chaosLevel : 25;
    state.density = item.songData.metadata.density !== undefined ? item.songData.metadata.density : 75;
    state.fadeInBars = item.songData.metadata.fadeInBars || 0;
    state.fadeOutBars = item.songData.metadata.fadeOutBars || 0;

    // Sync UI controls
    selectKey.value = state.key;
    selectScale.value = state.scale;
    selectSection.value = state.section;
    selectMotifStructure.value = state.motifStructure;
    state.timeSignature = item.songData.metadata.timeSignature || state.timeSignature || '4/4';
    if (selectTimeSignature) selectTimeSignature.value = state.timeSignature;
    if (valTimeSig) valTimeSig.textContent = state.timeSignature;
    if (selectClimaxCurve) selectClimaxCurve.value = state.climaxCurve;
    if (selectArticulation) selectArticulation.value = state.articulation;
    if (sliderFadeIn) sliderFadeIn.value = state.fadeInBars;
    if (valFadeIn) valFadeIn.textContent = `${state.fadeInBars} Bar${state.fadeInBars > 1 ? 's' : ''}`;
    if (sliderFadeOut) sliderFadeOut.value = state.fadeOutBars;
    if (valFadeOut) valFadeOut.textContent = `${state.fadeOutBars} Bar${state.fadeOutBars > 1 ? 's' : ''}`;
    if (sliderChaos) sliderChaos.value = state.chaosLevel;
    if (valChaos) valChaos.textContent = `${state.chaosLevel}%`;
    if (sliderDensity) sliderDensity.value = state.density;
    if (valDensity) valDensity.textContent = `${state.density}%`;
    sliderBpm.value = state.bpm;
    if (inputCustomBpm) inputCustomBpm.value = state.bpm;
    valBpm.textContent = `${state.bpm} BPM`;
    if (inputCustomBars) inputCustomBars.value = state.lengthBars;
    if (sliderBars) sliderBars.value = Math.min(64, state.lengthBars);
    valBars.textContent = `${state.lengthBars} Bars`;

    // Update preset buttons
    document.querySelectorAll('.btn-preset-bar').forEach(btn => {
      btn.classList.toggle('active', parseInt(btn.dataset.bars, 10) === state.lengthBars);
    });

    genreGrid.querySelectorAll('.genre-card').forEach(c => {
      c.classList.toggle('active', c.dataset.genre === state.genre);
    });

    Synth.loadSong(state.currentSong);
    updateHeaderBadges();
    updateProgressionUI(state.currentSong.progression);
    renderPianoRoll();
    if (quiet) return;
    Synth.play();
    updatePlayButtonUI(true);

    showToast(`📁 Đã tải lại: ${item.title}`);
  }

  function createContinuation(item) {
    let nextSec = 'verse';
    if (item.section === 'intro') nextSec = 'verse';
    else if (item.section === 'verse') nextSec = 'chorus';
    else if (item.section === 'chorus') nextSec = 'outro';
    else if (item.section === 'outro') nextSec = 'intro';

    state.section = nextSec;
    selectSection.value = nextSec;
    state.genre = Theory.GENRES[item.genre] ? item.genre : 'touhou';
    state.key = item.key;
    state.scale = item.scale;
    state.bpm = item.bpm;

    generateNewSong(true);
    showToast(`🔗 Đã tạo phân đoạn tiếp nối: ${nextSec.toUpperCase()}`);
  }

  function deleteHistoryItem(id) {
    songHistory = songHistory.filter(i => i.id !== id);
    saveHistoryStorage();
    renderHistory();
    showToast('🗑️ Đã xóa 1 mục lịch sử');
  }

  function clearHistory() {
    if (songHistory.length === 0) return;
    songHistory = [];
    saveHistoryStorage();
    renderHistory();
    showToast('🗑️ Đã xóa toàn bộ lịch sử gieo nhạc');
  }

  /**
   * Noi nhieu bai (segments) thanh 1 bai dai: dich step + danh lai bar.
   * Tra ve { progression, tracks, totalBars, totalSteps }.
   */
  function stitchSongDatas(songs) {
    let totalBars = 0;
    let cumulativeSteps = 0;
    const mergedProgression = [];
    const first = songs[0];
    const mergedTracks = {
      lead:   { name: 'Lead Melody', type: 'synth_lead', instrument: first.tracks.lead.instrument, color: '#00f2fe', notes: [] },
      chords: { name: 'Harmony & Chords', type: 'poly_synth', instrument: first.tracks.chords.instrument, color: '#9b51e0', notes: [] },
      arp:    { name: 'Arpeggio Ostinato', type: 'pluck_synth', instrument: first.tracks.arp.instrument, color: '#4facfe', notes: [] },
      bass:   { name: 'Bassline', type: 'mono_bass', instrument: first.tracks.bass.instrument, color: '#f39c12', notes: [] },
      drums:  { name: 'Drums & Percussion', type: 'drum_kit', instrument: 'standard_kit', color: '#e74c3c', notes: [] }
    };

    for (const song of songs) {
      const spb = song.metadata.stepsPerBar || 16;
      const stepOffset = cumulativeSteps;

      for (const chord of song.progression) {
        mergedProgression.push({
          ...chord,
          bar: chord.bar + totalBars
        });
      }

      for (const [tKey, track] of Object.entries(song.tracks)) {
        if (!mergedTracks[tKey]) continue;
        for (const note of track.notes) {
          mergedTracks[tKey].notes.push({
            ...note,
            step: note.step + stepOffset
          });
        }
      }

      const songBars = song.metadata.lengthBars || 8;
      totalBars += songBars;
      cumulativeSteps += songBars * spb;
    }

    // Luu velocity goc cho fade ve sau (khong cong don)
    for (const t of Object.values(mergedTracks)) {
      for (const n of t.notes) {
        if (n.baseVel == null) n.baseVel = n.velocity;
      }
    }

    return { progression: mergedProgression, tracks: mergedTracks, totalBars, totalSteps: cumulativeSteps };
  }

  /**
   * Merge Multiple History Items into One Full Song
   */

  /**
   * Merge Multiple History Items into One Full Song
   */
  function mergeAllHistoryItems() {
    if (songHistory.length < 2) {
      showToast('⚠️ Cần ít nhất 2 phân đoạn trong lịch sử để ghép nối thành bài hát hoàn chỉnh!');
      return;
    }

    const itemsToMerge = [...songHistory].reverse();
    pushUndo('ghép nối');
    const st = stitchSongDatas(itemsToMerge.map(i => i.songData));
    const totalBars = st.totalBars;
    const firstMd = itemsToMerge[0].songData.metadata;

    const totalNoteCount = Object.values(st.tracks).reduce((acc, t) => acc + t.notes.length, 0);

    const mergedSong = {
      metadata: {
        title: `RMG_Merged_Song_${itemsToMerge[0].key}_${totalBars}Bars_${Date.now() % 10000}`,
        genre: Theory.GENRES[itemsToMerge[0].genre] ? itemsToMerge[0].genre : 'touhou',
        genreName: (Theory.GENRES[itemsToMerge[0].genre] || Theory.GENRES['touhou']).name,
        key: itemsToMerge[0].key,
        scale: itemsToMerge[0].scale,
        scaleName: Theory.SCALES[itemsToMerge[0].scale]?.name || itemsToMerge[0].scale,
        bpm: itemsToMerge[0].bpm,
        timeSignature: firstMd.timeSignature || '4/4',
        stepsPerBar: firstMd.stepsPerBar || 16,
        lengthBars: totalBars,
        section: 'merged',
        motifStructure: firstMd.motifStructure || 'none',
        articulation: firstMd.articulation || 'auto',
        climaxCurve: firstMd.climaxCurve || 'none',
        chaosLevel: firstMd.chaosLevel != null ? firstMd.chaosLevel : 25,
        density: firstMd.density != null ? firstMd.density : 75,
        fadeInBars: 0,
        fadeOutBars: 0,
        trackTarget: firstMd.trackTarget || 'all',
        isPurePiano: !!firstMd.isPurePiano,
        useContour: !!firstMd.useContour,
        contourPoints: firstMd.contourPoints || null,
        loopMode: state.loopMode,
        noteCount: totalNoteCount,
        seed: Math.random(),
        createdAt: new Date().toISOString()
      },
      progression: st.progression,
      tracks: st.tracks
    };

    Generator.MusicGenerator.prototype.arrangeFinal(mergedSong, { finalHit: state.finalHit });

    state.currentSong = mergedSong;
    state.lengthBars = totalBars;
    state.section = 'merged';
    selectSection.value = 'merged';
    if (inputCustomBars) inputCustomBars.value = totalBars;
    if (sliderBars) sliderBars.value = Math.min(64, totalBars);
    valBars.textContent = `${totalBars} Bars`;

    Synth.loadSong(mergedSong);
    updateHeaderBadges();
    updateProgressionUI(st.progression);
    renderPianoRoll();
    pushToHistory(mergedSong);
    Synth.play();
    updatePlayButtonUI(true);

    showToast(`🎴 Đã ghép nối thành công ${itemsToMerge.length} phân đoạn thành bài hát dài ${totalBars} Bars!`, 5000);
  }

  /**
   * Song Arranger 1-Click: sinh tung doan theo form roi noi thanh bai hoan chinh
   */
  const ARRANGER_FORMS = {
    pop_standard: { name: 'Pop chuẩn (I – V – C – V – C – O)', parts: [['intro', 4], ['verse', 8], ['chorus', 8], ['verse', 8], ['chorus', 8], ['outro', 4]] },
    compact: { name: 'Gọn (V – C – V – C)', parts: [['verse', 8], ['chorus', 8], ['verse', 8], ['chorus', 8]] },
    epic_journey: { name: 'Epic (I – V – C – B – C – O)', parts: [['intro', 4], ['verse', 8], ['chorus', 8], ['bridge', 8], ['chorus', 8], ['outro', 4]] },
    concerto: {
      name: 'Concerto (Tutti – Solo – Cadenza)',
      parts: [
        { section: 'chorus', bars: 16, keyOff: 0, texture: 'tutti' },
        { section: 'verse', bars: 8, keyOff: 0, texture: 'solo' },
        { section: 'verse', bars: 16, keyOff: 'rel', texture: 'dialogue' },
        { section: 'chorus', bars: 8, keyOff: 'rel', texture: 'tutti' },
        { section: 'verse', bars: 8, keyOff: 'dev0', texture: 'dialogue' },
        { section: 'verse', bars: 8, keyOff: 'dev1', texture: 'dialogue' },
        { section: 'verse', bars: 8, keyOff: 'dev2', texture: 'dialogue' },
        { section: 'chorus', bars: 16, keyOff: 0, texture: 'tutti' },
        { section: 'verse', bars: 8, keyOff: 0, texture: 'cadenza', motif: 'none', density: 95, chaosLevel: 45, climaxCurve: 'full_fire' },
        { section: 'chorus', bars: 8, keyOff: 0, texture: 'tutti' }
      ]
    }
  };

  const MAJOR_SCALES = ['major', 'lydian', 'mixolydian', 'pentatonic_major'];

  function transposeKey(rootNote, offset) {
    const midi = Theory.noteToMidi(Theory.normalizeNote(rootNote), 4);
    const pc = (((midi + offset) % 12) + 12) % 12;
    return Theory.NOTE_NAMES[pc];
  }

  /**
   * Giai form thanh parts day du (key/scale/texture/density...), tuong thich
   * ca form cu dang [section, bars] va form moi dang object.
   */
  function resolveFormParts(formKey) {
    const form = ARRANGER_FORMS[formKey];
    if (!form) return [];
    const isMajor = MAJOR_SCALES.includes(state.scale);
    const devTable = isMajor ? [5, 3, 7] : [5, 8, 7];
    return form.parts.map(p => {
      const base = Array.isArray(p) ? { section: p[0], bars: p[1] } : Object.assign({}, p);
      let key = base.key || state.key;
      let scale = base.scale || state.scale;
      const off = base.keyOff;
      if (typeof off === 'number' && off !== 0) {
        key = transposeKey(state.key, off);
      } else if (off === 'rel') {
        key = transposeKey(state.key, isMajor ? -3 : 3);
        if (!base.scale) scale = isMajor ? 'natural_minor' : 'major';
      } else if (typeof off === 'string' && off.startsWith('dev')) {
        const n = parseInt(off.slice(3), 10) || 0;
        key = transposeKey(state.key, devTable[n % devTable.length]);
      }
      return {
        section: base.section || 'verse',
        bars: Math.max(1, Math.min(64, base.bars | 0 || 8)),
        key, scale,
        texture: base.texture || 'tutti',
        motif: base.motif || state.motifStructure,
        density: base.density != null ? base.density : state.density,
        chaosLevel: base.chaosLevel != null ? base.chaosLevel : state.chaosLevel,
        climaxCurve: base.climaxCurve || state.climaxCurve
      };
    });
  }

  function updateArrangerInfo() {
    if (!selectArrangerForm || !arrangerInfo) return;
    const form = ARRANGER_FORMS[selectArrangerForm.value];
    if (!form) return;
    const parts = resolveFormParts(selectArrangerForm.value);
    const total = parts.reduce((a, p) => a + p.bars, 0);
    const seq = parts.map(p => {
      let s = `${p.section.toUpperCase()} ${p.bars}`;
      if (p.texture && p.texture !== 'tutti') s += ` [${p.texture}]`;
      if (p.key && p.key !== state.key) s += ` (${p.key})`;
      return s;
    }).join(' • ');
    arrangerInfo.textContent = `${seq} — Tổng ${total} bars`;
  }

  /**
   * Ap texture tung part len bai da noi (chi Concerto mode dung toi).
   */
  function applyPartTextures(song, parts) {
    let cursor = 0;
    const ranges = [];
    for (const p of parts) {
      if (p.texture && p.texture !== 'tutti') {
        ranges.push({ fromBar: cursor, toBar: cursor + p.bars - 1, texture: p.texture });
      }
      cursor += p.bars;
    }
    if (ranges.length) {
      Generator.MusicGenerator.prototype.applyTexture(song, ranges);
    }
  }

  /**
   * Workspace trong: bai khong not de tu soan / lam tham chieu style.
   * Giu progression mac dinh toan 'i' de moi tool van chay.
   */
  function newBlankSong() {
    const wasPlaying = Synth.isPlaying;
    if (wasPlaying) Synth.stop();
    pushUndo('bài trống');
    const ts = state.timeSignature || '4/4';
    const spb = ts === '7/8' ? 14 : ts === '6/8' ? 12 : ts === '5/8' ? 10 : 16;
    const bars = Math.max(1, Math.min(256, parseInt(state.lengthBars, 10) || 8));
    const gDef = Theory.GENRES[state.genre] || Theory.GENRES['touhou'];
    const isPure = state.trackTarget === 'pure_piano';
    const gen = new Generator.MusicGenerator({
      genre: state.genre, key: state.key, scale: state.scale,
      bpm: state.bpm || 120, timeSignature: ts, lengthBars: bars,
      section: 'none', motifStructure: state.motifStructure,
      articulation: state.articulation, climaxCurve: state.climaxCurve,
      trackTarget: state.trackTarget, chaosLevel: state.chaosLevel,
      density: state.density, humanize: true, seed: Math.random()
    });
    const raw = [];
    for (let bar = 0; bar < bars; bar++) raw.push(gen.resolveBarChord('i', bar));
    const progression = gen.retuneProgression(raw);
    const mkTrack = (name, type, instrument, color) => ({ name, type, instrument, color, notes: [] });
    const song = {
      metadata: {
        title: `RMG_Blank_${state.key}_${bars}Bars`,
        genre: state.genre, genreName: gDef.name,
        key: state.key, scale: state.scale,
        scaleName: Theory.SCALES[state.scale]?.name || state.scale,
        bpm: state.bpm, timeSignature: ts, stepsPerBar: spb,
        lengthBars: bars, section: 'none',
        motifStructure: state.motifStructure, articulation: state.articulation,
        climaxCurve: state.climaxCurve, chaosLevel: state.chaosLevel,
        density: state.density, fadeInBars: 0, fadeOutBars: 0,
        trackTarget: state.trackTarget, isPurePiano: isPure,
        useContour: false, contourPoints: null,
        loopMode: state.loopMode,
        noteCount: 0, seed: Math.random(),
        createdAt: new Date().toISOString()
      },
      progression,
      tracks: {
        lead: isPure
          ? mkTrack('Piano Tay Phải (RH)', 'piano_track', 'grand_piano_lead', '#00f2fe')
          : mkTrack('Lead Melody', 'synth_lead', gDef.leadStyle, '#00f2fe'),
        chords: mkTrack('Harmony & Chords', 'poly_synth', 'analog_pad', '#9b51e0'),
        arp: isPure
          ? mkTrack('Piano Tay Trái (LH)', 'piano_track', 'grand_piano_lead', '#4facfe')
          : mkTrack('Arpeggio Ostinato', 'pluck_synth', 'sparkle_arp', '#4facfe'),
        bass: mkTrack('Bassline', 'mono_bass', 'sub_saw_bass', '#f39c12'),
        drums: mkTrack('Drums & Percussion', 'drum_kit', 'standard_kit', '#e74c3c')
      }
    };

    state.currentSong = song;
    closeProgEditor();
    selectedNotes.clear();
    stampBaseVel(song);
    Synth.loadSong(song);
    updateHeaderBadges();
    updateProgressionUI(progression);
    renderPianoRoll(0);
    pushToHistory(song);
    showToast(`📄 Bài trống ${bars} bars — soạn tay/đàn phím/REC, rồi Trích Style khi ưng!`, 4500);
  }

  /**
   * Trich style tu bai dang mo: nap san modal style de xem truoc + luu.
   */
  function analyzeSongStyle(song) {
    const md = song.metadata;
    const syms = (song.progression || []).map(c => c.symbol).filter(Boolean);
    const templates = [];
    const seen = new Set();
    for (let b = 0; b + 4 <= syms.length && templates.length < 6; b += 4) {
      const t = syms.slice(b, b + 4);
      const k = t.join('|');
      if (!seen.has(k)) { seen.add(k); templates.push(t); }
    }
    if (!templates.length && syms.length) templates.push(syms.slice(0, 8));
    if (!templates.length) templates.push(['i', 'VI', 'VII', 'i']);
    const perBar = (md.noteCount || 0) / Math.max(1, md.lengthBars);
    const density = perBar < 8 ? 35 : perBar < 15 ? 55 : perBar < 25 ? 70 : 85;
    return {
      bpm: md.bpm || 120, key: md.key || 'A', scale: md.scale || 'touhou_yonanuki',
      timeSignature: md.timeSignature || '4/4',
      templates, density,
      noteCount: md.noteCount || 0, bars: md.lengthBars || 8,
      leadStyle: (Theory.GENRES[md.genre] || {}).leadStyle || 'square_8bit'
    };
  }

  function extractStyleFromSong() {
    const song = state.currentSong;
    if (!song) {
      showToast('⚠️ Chưa có bài nhạc nào!');
      return;
    }
    const a = analyzeSongStyle(song);
    openCustomGenreModal();
    if (customName) customName.value = (`Style ${song.metadata.title || ''}`).replace(/^RMG_/, '').slice(0, 40);
    if (customDesc) customDesc.value = `${a.bars} bars • ${a.noteCount} nốt • nên để density ~${a.density}`;
    if (customBpm) customBpm.value = a.bpm;
    if (customKey && [...customKey.options].some(o => o.value === a.key)) customKey.value = a.key;
    if (customScale && [...customScale.options].some(o => o.value === a.scale)) customScale.value = a.scale;
    if (customTs && [...customTs.options].some(o => o.value === a.timeSignature)) customTs.value = a.timeSignature;
    if (customLead && [...customLead.options].some(o => o.value === a.leadStyle)) customLead.value = a.leadStyle;
    if (customProg) customProg.value = a.templates.map(t => t.join(' ')).join('\n');
    showToast('🧬 Đã trích style từ bài này — xem lại rồi bấm Lưu style', 4500);
  }

  function arrangeSong() {
    const form = ARRANGER_FORMS[selectArrangerForm.value];
    if (!form) return;
    const wasPlaying = Synth.isPlaying;
    if (wasPlaying) Synth.stop();
    pushUndo('dựng bài');

    const parts = resolveFormParts(selectArrangerForm.value);
    if (!parts.length) return;
    const segs = parts.map(p => {
      const gen = new Generator.MusicGenerator({
        genre: state.genre,
        key: p.key,
        scale: p.scale,
        bpm: state.bpm || 120,
        timeSignature: state.timeSignature || '4/4',
        lengthBars: p.bars,
        section: p.section,
        motifStructure: p.motif,
        articulation: state.articulation,
        climaxCurve: p.climaxCurve,
        useContour: state.contourEnabled,
        contourPoints: state.contourPoints,
        fadeInBars: 0,
        fadeOutBars: 0,
        trackTarget: state.trackTarget,
        chaosLevel: p.chaosLevel,
        density: p.density,
        humanize: true,
        skipFinalHit: true,
        seed: Math.random()
      });
      return gen.generate();
    });

    const st = stitchSongDatas(segs);
    const totalBars = st.totalBars;
    const totalNoteCount = Object.values(st.tracks).reduce((acc, t) => acc + t.notes.length, 0);
    const spb = segs[0].metadata.stepsPerBar || 16;

    const song = {
      metadata: {
        title: `RMG_Arranged_${selectArrangerForm.value}_${state.key}_${totalBars}Bars`,
        genre: state.genre,
        genreName: Theory.GENRES[state.genre].name,
        key: state.key,
        scale: state.scale,
        scaleName: Theory.SCALES[state.scale]?.name || state.scale,
        bpm: state.bpm,
        timeSignature: state.timeSignature || '4/4',
        stepsPerBar: spb,
        lengthBars: totalBars,
        section: 'merged',
        motifStructure: state.motifStructure,
        articulation: state.articulation,
        climaxCurve: state.climaxCurve,
        chaosLevel: state.chaosLevel,
        density: state.density,
        fadeInBars: 0,
        fadeOutBars: 0,
        trackTarget: state.trackTarget,
        isPurePiano: state.trackTarget === 'pure_piano',
        useContour: state.contourEnabled,
        contourPoints: state.contourPoints,
        loopMode: state.loopMode,
        noteCount: totalNoteCount,
        seed: Math.random(),
        createdAt: new Date().toISOString()
      },
      progression: st.progression,
      tracks: st.tracks
    };

    Generator.MusicGenerator.prototype.arrangeFinal(song, { finalHit: state.finalHit });
    applyPartTextures(song, parts);
    stampBaseVel(song);

    state.currentSong = song;
    state.lengthBars = totalBars;
    state.section = 'merged';
    selectSection.value = 'merged';
    if (inputCustomBars) inputCustomBars.value = totalBars;
    if (sliderBars) sliderBars.value = Math.min(64, totalBars);
    valBars.textContent = `${totalBars} Bars`;
    stampBaseVel(song);

    Synth.loadSong(song);
    updateHeaderBadges();
    updateProgressionUI(st.progression);
    renderPianoRoll();
    pushToHistory(song);
    if (wasPlaying) {
      Synth.play();
      updatePlayButtonUI(true);
    }
    showToast(`🎼 Đã dựng bài ${form.name}: ${totalBars} bars, ${song.metadata.noteCount} nốt!`, 5000);
  }

  function togglePlay() {
    if (!state.currentSong) {
      generateNewSong();
    }

    if (Synth.isPlaying) {
      Synth.pause();
      updatePlayButtonUI(false);
    } else {
      Synth.play();
      updatePlayButtonUI(true);
    }
  }

  function stopPlayback() {
    Synth.stop();
    updatePlayButtonUI(false);
    renderPianoRoll();
  }

  function updatePlayButtonUI(isPlaying) {
    state.isPlaying = isPlaying;
    if (isPlaying) {
      playIcon.textContent = '⏸';
      playText.textContent = 'TẠM DỪNG (PAUSE)';
      btnPlay.style.background = 'linear-gradient(135deg, #f39c12, #e67e22)';
    } else {
      playIcon.textContent = '▶';
      playText.textContent = 'PHÁT NHẠC (PLAY)';
      btnPlay.style.background = 'linear-gradient(135deg, #00f2fe, #4facfe)';
    }
  }

  function setupEventListeners() {
    // Genre Cards Selection
    genreGrid.querySelectorAll('.genre-card').forEach(card => {
      card.addEventListener('click', () => {
        selectGenre(card.dataset.genre);
      });
    });

    // Time Signature Change
    if (selectTimeSignature) {
      selectTimeSignature.addEventListener('change', (e) => {
        state.timeSignature = e.target.value;
        if (valTimeSig) valTimeSig.textContent = state.timeSignature;
        generateNewSong();
      });
    }

    // Section Change
    selectSection.addEventListener('change', (e) => {
      state.section = e.target.value;
      updateHeaderBadges();
      generateNewSong();
    });

    // Motif Structure Change
    selectMotifStructure.addEventListener('change', (e) => {
      state.motifStructure = e.target.value;
      generateNewSong();
    });

    // Articulation Change
    if (selectArticulation) {
      selectArticulation.addEventListener('change', (e) => {
        state.articulation = e.target.value;
        generateNewSong();
      });
    }

    function updatePurePianoButtonUI() {
      syncPurePianoButton();
    }

    if (btnTogglePurePiano) {
      btnTogglePurePiano.addEventListener('click', () => {
        state.trackTarget = (state.trackTarget === 'pure_piano') ? 'all' : 'pure_piano';
        if (selectTrackTarget) selectTrackTarget.value = state.trackTarget;
        updatePurePianoButtonUI();
        updateHeaderBadges();
        generateNewSong();
        showToast(state.trackTarget === 'pure_piano' ? '🎹 Đã BẬT chế độ Thuần Concert Grand Piano 2 Tay!' : '🎛️ Đã BẬT chế độ Dàn nhạc đầy đủ 5 Bè!');
      });
    }

    // Track Target Change
    selectTrackTarget.addEventListener('change', (e) => {
      state.trackTarget = e.target.value;
      updatePurePianoButtonUI();
      updateHeaderBadges();
      generateNewSong();
    });

    // Key Change
    selectKey.addEventListener('change', (e) => {
      state.key = e.target.value;
      generateNewSong();
    });

    // Scale Change
    selectScale.addEventListener('change', (e) => {
      state.scale = e.target.value;
      generateNewSong();
    });

    // Climax Curve Change
    if (selectClimaxCurve) {
      selectClimaxCurve.addEventListener('change', (e) => {
        state.climaxCurve = e.target.value;
        generateNewSong();
      });
    }

    // BPM Slider
    sliderBpm.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      state.bpm = val;
      valBpm.textContent = `${val} BPM`;
      if (inputCustomBpm) inputCustomBpm.value = val;
      Synth.bpm = val;
      Synth.secondsPerStep = (60 / val) / 4;
      updateHeaderBadges();
    });

    // Custom BPM Number Input
    if (inputCustomBpm) {
      inputCustomBpm.addEventListener('input', (e) => {
        const val = Math.max(30, Math.min(350, parseInt(e.target.value, 10) || 120));
        state.bpm = val;
        valBpm.textContent = `${val} BPM`;
        if (sliderBpm) sliderBpm.value = Math.min(280, val);
        Synth.bpm = val;
        Synth.secondsPerStep = (60 / val) / 4;
        updateHeaderBadges();
      });
    }

    // Tap Tempo Button
    if (btnTapTempo) {
      btnTapTempo.addEventListener('click', () => {
        const now = Date.now();
        tapTimes.push(now);
        if (tapTimes.length > 4) tapTimes.shift();

        if (tapTimes.length >= 2) {
          const intervals = [];
          for (let i = 1; i < tapTimes.length; i++) {
            intervals.push(tapTimes[i] - tapTimes[i - 1]);
          }
          const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
          const calculatedBpm = Math.max(40, Math.min(300, Math.round(60000 / avgInterval)));

          state.bpm = calculatedBpm;
          valBpm.textContent = `${calculatedBpm} BPM`;
          if (inputCustomBpm) inputCustomBpm.value = calculatedBpm;
          if (sliderBpm) sliderBpm.value = Math.min(280, calculatedBpm);
          Synth.bpm = calculatedBpm;
          Synth.secondsPerStep = (60 / calculatedBpm) / 4;
          updateHeaderBadges();
          showToast(`⏱ Tap BPM: ${calculatedBpm}`);
        }
      });
    }

    // Fade In Slider (ap truc tiep, khong gieo lai bai)
    if (sliderFadeIn) {
      sliderFadeIn.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10);
        state.fadeInBars = val;
        valFadeIn.textContent = `${val} Bar${val > 1 ? 's' : ''}`;
        applyFadeToSong();
      });
    }

    // Fade Out Slider (ap truc tiep, khong gieo lai bai)
    if (sliderFadeOut) {
      sliderFadeOut.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10);
        state.fadeOutBars = val;
        valFadeOut.textContent = `${val} Bar${val > 1 ? 's' : ''}`;
        applyFadeToSong();
      });
    }

    // Custom Bars Number Input
    if (inputCustomBars) {
      inputCustomBars.addEventListener('input', (e) => {
        const val = Math.max(1, Math.min(256, parseInt(e.target.value, 10) || 8));
        state.lengthBars = val;
        valBars.textContent = `${val} Bars`;
        if (sliderBars) sliderBars.value = Math.min(64, val);

        document.querySelectorAll('.btn-preset-bar[data-bars]').forEach(btn => {
          btn.classList.toggle('active', parseInt(btn.dataset.bars, 10) === val);
        });

        generateNewSong();
      });
    }

    // Bars Slider
    if (sliderBars) {
      sliderBars.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10);
        if (isNaN(val) || val <= 0) return;
        state.lengthBars = val;
        valBars.textContent = `${val} Bars`;
        if (inputCustomBars) inputCustomBars.value = val;

        document.querySelectorAll('.btn-preset-bar[data-bars]').forEach(btn => {
          btn.classList.toggle('active', parseInt(btn.dataset.bars, 10) === val);
        });

        generateNewSong();
      });
    }

    // Quick Preset Bar Buttons (4, 8, 12, 16, 24, 32, 64)
    document.querySelectorAll('.btn-preset-bar[data-bars]').forEach(btn => {
      btn.addEventListener('click', () => {
        const val = parseInt(btn.dataset.bars, 10);
        if (isNaN(val) || val <= 0) return;

        document.querySelectorAll('.btn-preset-bar[data-bars]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        state.lengthBars = val;
        valBars.textContent = `${val} Bars`;
        if (inputCustomBars) inputCustomBars.value = val;
        if (sliderBars) sliderBars.value = Math.min(64, val);

        generateNewSong();
      });
    });

    // Chaos Slider
    sliderChaos.addEventListener('input', (e) => {
      state.chaosLevel = parseInt(e.target.value, 10);
      valChaos.textContent = `${state.chaosLevel}%`;
      generateNewSong();
    });

    // Density Slider
    sliderDensity.addEventListener('input', (e) => {
      state.density = parseInt(e.target.value, 10);
      valDensity.textContent = `${state.density}%`;
      generateNewSong();
    });

    // Swing Slider (khong gieo lai - chi groove phat + xuat)
    if (sliderSwing) {
      sliderSwing.addEventListener('input', (e) => {
        state.swing = Math.max(0, Math.min(60, parseInt(e.target.value, 10) || 0));
        if (valSwing) valSwing.textContent = `${state.swing}%`;
        if ('swing' in Synth) Synth.swing = state.swing;
      });
    }

    // Transport Controls
    btnPlay.addEventListener('click', togglePlay);
    btnStop.addEventListener('click', stopPlayback);
    if (btnUndo) btnUndo.addEventListener('click', doUndo);
    if (btnRedo) btnRedo.addEventListener('click', doRedo);
    if (btnAB) {
      btnAB.addEventListener('click', toggleAB);
      btnAB.addEventListener('dblclick', () => {
        if (!state.currentSong) return;
        abSlotA = snapshotState();
        abSlotB = null;
        abHearing = 'A';
        updateABButton();
        showToast('📌 Đã ghim lại bản A');
      });
    }
    btnGenerate.addEventListener('click', () => generateNewSong());
    if (btnBlank) btnBlank.addEventListener('click', newBlankSong);
    if (btnExtractStyle) btnExtractStyle.addEventListener('click', extractStyleFromSong);
    btnClearHistory.addEventListener('click', clearHistory);

    // Progression Editor & Region Regenerate
    if (btnApplyProgChord) btnApplyProgChord.addEventListener('click', applyProgChord);
    if (btnCancelProgChord) btnCancelProgChord.addEventListener('click', closeProgEditor);
    if (btnUnlockAll) btnUnlockAll.addEventListener('click', unlockAllNotes);
    if (btnRegenRegion) btnRegenRegion.addEventListener('click', () => {
      if (!state.currentSong) {
        showToast('⚠️ Chưa có bài nhạc nào! Hãy bấm Generate trước.');
        return;
      }
      const total = state.currentSong.metadata.lengthBars;
      let from = Math.max(1, Math.min(total, parseInt(inputRegenFrom.value, 10) || 1));
      let to = Math.max(1, Math.min(total, parseInt(inputRegenTo.value, 10) || from));
      if (from > to) { const t = from; from = to; to = t; }
      inputRegenFrom.value = from;
      inputRegenTo.value = to;
      applyRegenToSong(from - 1, to - 1, getCheckedRegenTracks());
    });

    // Arranger 1-click
    if (selectArrangerForm) {
      selectArrangerForm.addEventListener('change', updateArrangerInfo);
      updateArrangerInfo();
    }
    if (btnArrange) btnArrange.addEventListener('click', arrangeSong);
    if (checkLoopMode) {
      checkLoopMode.addEventListener('change', (e) => {
        state.loopMode = e.target.checked;
        showToast(state.loopMode ? '🔁 Loop bật: áp dụng cho bài mới + bài dựng' : '🔁 Loop tắt: bài mới sẽ có hit kết');
      });
    }

    // MIDI import
    if (btnOpenMidi) btnOpenMidi.addEventListener('click', requestOpenMidi);
    if (fileOpenMidi) {
      fileOpenMidi.addEventListener('change', () => {
        const f = fileOpenMidi.files && fileOpenMidi.files[0];
        if (!f) return;
        const reader = new FileReader();
        reader.onload = () => {
          openAnyFile(f.name, new Uint8Array(reader.result));
          fileOpenMidi.value = '';
        };
        reader.onerror = () => showToast('⚠️ Không đọc được file MIDI');
        reader.readAsArrayBuffer(f);
      });
    }

    // Project save/open
    if (btnSaveProject) btnSaveProject.addEventListener('click', () => saveProject(false));
    if (btnQuickSaveProject) btnQuickSaveProject.addEventListener('click', () => saveProject(true));
    if (btnOpenProject) btnOpenProject.addEventListener('click', requestOpenProject);

    // Seed gallery
    const btnSaveSeed = document.getElementById('btnSaveSeed');
    if (btnSaveSeed) btnSaveSeed.addEventListener('click', saveSeedToGallery);

    // Update check
    const btnCheckUpdate = document.getElementById('btnCheckUpdate');
    if (btnCheckUpdate) btnCheckUpdate.addEventListener('click', checkUpdate);
    const appVersionLabel = document.getElementById('appVersionLabel');
    if (appVersionLabel) appVersionLabel.textContent = 'v' + APP_VERSION;

    // REC dan phim + motif
    if (btnRec) btnRec.addEventListener('click', toggleRec);
    if (btnMotif) btnMotif.addEventListener('click', developMotif);

    // Export hub: quick export + WAV + thu muc
    if (btnQuickMidi) btnQuickMidi.addEventListener('click', () => quickExport('midi'));
    if (btnQuickMmp) btnQuickMmp.addEventListener('click', () => quickExport('mmp'));
    if (btnExportWav) btnExportWav.addEventListener('click', () => quickExport('wav'));
    if (btnChangeExportDir) btnChangeExportDir.addEventListener('click', changeExportDir);
    if (btnOpenExportDir) btnOpenExportDir.addEventListener('click', openExportDir);
    if (btnRefreshRecent) btnRefreshRecent.addEventListener('click', refreshRecent);

    // History: filter + batch MIDI
    if (historyFilter) {
      historyFilter.addEventListener('change', (e) => {
        state.historyFilter = e.target.value;
        renderHistory();
      });
    }
    if (btnBatchMidi) btnBatchMidi.addEventListener('click', batchExportMidi);

    // Finish 1-click + style transfer + seeds
    if (btnFinish) btnFinish.addEventListener('click', finishSong);
    if (btnTransferStyle) btnTransferStyle.addEventListener('click', transferStyle);
    if (btnCopySeed) btnCopySeed.addEventListener('click', copySeed);
    if (btnPasteSeed) btnPasteSeed.addEventListener('click', pasteSeed);
    if (btnDailySeed) btnDailySeed.addEventListener('click', dailySeed);

    // Help modal
    if (btnHelp) btnHelp.addEventListener('click', () => { if (helpModal) helpModal.style.display = 'flex'; });
    if (btnCloseHelp) btnCloseHelp.addEventListener('click', () => { if (helpModal) helpModal.style.display = 'none'; });
    if (helpModal) {
      helpModal.addEventListener('click', (e) => {
        if (e.target === helpModal) helpModal.style.display = 'none';
      });
    }

    // Final hit toggle
    if (checkFinalHit) {
      checkFinalHit.addEventListener('change', (e) => {
        state.finalHit = e.target.checked;
        showToast(state.finalHit ? '🎯 Hit kết bài: BẬT' : '🎯 Hit kết bài: TẮT (kết tự nhiên)');
      });
    }

    // Custom genre modal
    if (btnOpenCustomGenre) btnOpenCustomGenre.addEventListener('click', openCustomGenreModal);
    if (btnCancelCustomGenre) btnCancelCustomGenre.addEventListener('click', closeCustomGenreModal);
    if (btnSaveCustomGenre) btnSaveCustomGenre.addEventListener('click', saveCustomGenre);
    if (genreModal) {
      genreModal.addEventListener('click', (e) => {
        if (e.target === genreModal) closeCustomGenreModal();
      });
    }

    // Octave / velocity nhanh
    if (btnOctDown) btnOctDown.addEventListener('click', () => shiftOctave(-1));
    if (btnOctUp) btnOctUp.addEventListener('click', () => shiftOctave(1));
    if (btnVelDown) btnVelDown.addEventListener('click', () => shiftVelocity(-10));
    if (btnVelUp) btnVelUp.addEventListener('click', () => shiftVelocity(10));

    // Variation take tung be (xuc xac mixer)
    document.querySelectorAll('.mixer-channel').forEach(channelEl => {
      const btnDice = channelEl.querySelector('.btn-dice');
      if (!btnDice) return;
      btnDice.addEventListener('click', () => {
        if (!state.currentSong) {
          showToast('⚠️ Chưa có bài nhạc! Hãy bấm Generate trước.');
          return;
        }
        applyRegenToSong(0, state.currentSong.metadata.lengthBars - 1, [channelEl.dataset.track]);
      });
    });

    // Keyboard Shortcuts
    window.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyZ' && !e.shiftKey) {
        e.preventDefault();
        doUndo();
      } else if ((e.ctrlKey || e.metaKey) && (e.code === 'KeyY' || (e.code === 'KeyZ' && e.shiftKey))) {
        e.preventDefault();
        doRedo();
      } else if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.code === 'KeyG') {
        e.preventDefault();
        generateNewSong();
      } else if ((e.ctrlKey || e.metaKey) && e.code === 'KeyD') {
        e.preventDefault();
        duplicateSelection();
      } else if ((e.ctrlKey || e.metaKey) && e.code === 'KeyS') {
        e.preventDefault();
        saveProject(true);
      } else if ((e.ctrlKey || e.metaKey) && e.code === 'KeyC' && selectedNotes.size > 0) {
        e.preventDefault();
        copySelection();
      } else if ((e.ctrlKey || e.metaKey) && e.code === 'KeyV' && copyBuffer && copyBuffer.length) {
        e.preventDefault();
        pasteSelection();
      } else if ((e.code === 'Delete' || e.code === 'Backspace') && selectedNotes.size > 0) {
        e.preventDefault();
        deleteSelection();
      } else if (e.shiftKey && (e.code === 'ArrowUp' || e.code === 'ArrowDown') && selectedNotes.size > 0) {
        e.preventDefault();
        transposeSelection(e.code === 'ArrowUp' ? 1 : -1);
      } else if (e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
        e.preventDefault();
        state.pianoOctave = Math.max(1, Math.min(7, state.pianoOctave + (e.code === 'ArrowRight' ? 1 : -1)));
        showToast(`🎹 Quãng đàn: C${state.pianoOctave} (hàng trên C${state.pianoOctave + 1})`);
      } else if (!e.repeat && !e.ctrlKey && !e.metaKey && (e.code in PIANO_LOWER || e.code in PIANO_UPPER)) {
        playPianoKey(e.code);
      }
    });

    // Mixer Controls
    document.querySelectorAll('.mixer-channel').forEach(channelEl => {
      const trackKey = channelEl.dataset.track;
      const volSlider = channelEl.querySelector('.vol-slider');
      const btnMute = channelEl.querySelector('.btn-mute');
      const btnSolo = channelEl.querySelector('.btn-solo');

      volSlider.addEventListener('input', (e) => {
        Synth.setTrackVolume(trackKey, parseFloat(e.target.value));
      });

      const panSlider = channelEl.querySelector('.pan-slider');
      if (panSlider && Synth.setTrackPan) {
        panSlider.addEventListener('input', (e) => {
          Synth.setTrackPan(trackKey, parseInt(e.target.value, 10));
        });
      }

      btnMute.addEventListener('click', () => {
        const isMuted = Synth.toggleMute(trackKey);
        btnMute.classList.toggle('mute-active', isMuted);
      });

      btnSolo.addEventListener('click', () => {
        const isSolo = Synth.toggleSolo(trackKey);
        btnSolo.classList.toggle('solo-active', isSolo);
      });
    });

    // Contour Toggle Checkbox
    if (checkEnableContour) {
      checkEnableContour.addEventListener('change', (e) => {
        state.contourEnabled = e.target.checked;
        if (contourPanel) contourPanel.classList.toggle('active', state.contourEnabled);
        if (contourPresets) contourPresets.style.display = state.contourEnabled ? 'flex' : 'none';
        if (contourBody) contourBody.style.display = state.contourEnabled ? 'block' : 'none';

        if (state.contourEnabled) {
          setTimeout(() => {
            renderContourCanvas();
          }, 40);
        }
        generateNewSong();
        showToast(state.contourEnabled ? '🎨 Đã BẬT Đường Cong Giai Điệu' : '⚪ Đã TẮT Đường Cong Giai Điệu');
      });
    }

    // Contour Preset Buttons
    document.querySelectorAll('.btn-contour-preset').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.btn-contour-preset').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const preset = btn.dataset.preset;
        if (preset === 'arch') {
          state.contourPoints = [{ x: 0, y: 0.2 }, { x: 0.5, y: 0.9 }, { x: 1.0, y: 0.2 }];
        } else if (preset === 'wave') {
          state.contourPoints = [{ x: 0, y: 0.3 }, { x: 0.25, y: 0.8 }, { x: 0.5, y: 0.3 }, { x: 0.75, y: 0.9 }, { x: 1.0, y: 0.2 }];
        } else if (preset === 'climax') {
          state.contourPoints = [{ x: 0, y: 0.25 }, { x: 0.5, y: 0.5 }, { x: 0.8, y: 1.0 }, { x: 1.0, y: 0.3 }];
        } else if (preset === 'qa') {
          state.contourPoints = [{ x: 0, y: 0.3 }, { x: 0.4, y: 0.75 }, { x: 0.5, y: 0.35 }, { x: 0.9, y: 0.95 }, { x: 1.0, y: 0.15 }];
        } else if (preset === 'flat') {
          state.contourPoints = [{ x: 0, y: 0.5 }, { x: 1.0, y: 0.5 }];
        }
        renderContourCanvas();
        generateNewSong();
      });
    });

    if (btnClearContour) {
      btnClearContour.addEventListener('click', () => {
        state.contourPoints = [{ x: 0, y: 0.5 }, { x: 1.0, y: 0.5 }];
        renderContourCanvas();
        generateNewSong();
        showToast('🗑️ Đã đặt lại đường thẳng ngang');
      });
    }

    // Contour Canvas Mouse Interactivity
    if (contourCanvas) {
      function getContourMousePos(e) {
        const rect = contourCanvas.getBoundingClientRect();
        const clientX = e.clientX || (e.touches && e.touches[0].clientX);
        const clientY = e.clientY || (e.touches && e.touches[0].clientY);
        const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        const y = Math.max(0, Math.min(1, 1 - ((clientY - rect.top) / rect.height)));
        return { x, y, px: clientX - rect.left, py: clientY - rect.top };
      }

      function findContourPointNear(px, py) {
        const rect = contourCanvas.getBoundingClientRect();
        const grabRadius = 14;
        for (let i = 0; i < state.contourPoints.length; i++) {
          const pt = state.contourPoints[i];
          const screenX = pt.x * rect.width;
          const screenY = (1 - pt.y) * rect.height;
          const dist = Math.hypot(screenX - px, screenY - py);
          if (dist <= grabRadius) return i;
        }
        return -1;
      }

      contourCanvas.addEventListener('mousedown', (e) => {
        if (!state.contourEnabled) return;
        const pos = getContourMousePos(e);
        const nearIndex = findContourPointNear(pos.px, pos.py);

        if (e.button === 2) {
          // Right click: delete node point if not endpoints
          if (nearIndex > 0 && nearIndex < state.contourPoints.length - 1) {
            state.contourPoints.splice(nearIndex, 1);
            renderContourCanvas();
            generateNewSong();
          }
          return;
        }

        if (nearIndex >= 0) {
          draggedContourIndex = nearIndex;
        } else {
          // Add new node point
          const newPt = { x: pos.x, y: pos.y };
          state.contourPoints.push(newPt);
          state.contourPoints.sort((a, b) => a.x - b.x);
          draggedContourIndex = state.contourPoints.indexOf(newPt);
          renderContourCanvas();
          generateNewSong();
        }
      });

      contourCanvas.addEventListener('mousemove', (e) => {
        if (!state.contourEnabled) return;
        const pos = getContourMousePos(e);

        if (draggedContourIndex >= 0) {
          const pt = state.contourPoints[draggedContourIndex];
          if (draggedContourIndex === 0) {
            pt.x = 0;
          } else if (draggedContourIndex === state.contourPoints.length - 1) {
            pt.x = 1;
          } else {
            pt.x = Math.max(0.02, Math.min(0.98, pos.x));
          }
          pt.y = pos.y;
          state.contourPoints.sort((a, b) => a.x - b.x);
          draggedContourIndex = state.contourPoints.indexOf(pt);
          renderContourCanvas();
          generateNewSong();
        } else {
          const hover = findContourPointNear(pos.px, pos.py);
          if (hover !== hoveredContourIndex) {
            hoveredContourIndex = hover;
            contourCanvas.style.cursor = hover >= 0 ? 'grab' : 'crosshair';
            renderContourCanvas();
          }
        }
      });

      window.addEventListener('mouseup', () => {
        if (draggedContourIndex >= 0) {
          draggedContourIndex = -1;
          renderContourCanvas();
        }
      });

      contourCanvas.addEventListener('contextmenu', (e) => {
        e.preventDefault();
      });
    }

    // Studio Tool Tabs (Select / Draw / Knife / Erase)
    document.querySelectorAll('.tool-tab').forEach(tab => {
      tab.addEventListener('click', () => setTool(tab.dataset.tool));
    });

    // Studio Track Tabs Selection
    if (studioTrackTabs) {
      studioTrackTabs.querySelectorAll('.btn-track-tab').forEach(tab => {
        tab.addEventListener('click', () => {
          studioTrackTabs.querySelectorAll('.btn-track-tab').forEach(t => t.classList.remove('active'));
          tab.classList.add('active');
          state.editingTrack = tab.dataset.track;
          renderPianoRoll(Synth.currentStep || 0);
          showToast(`🎹 Đang soạn & chỉnh sửa bè: ${tab.textContent.trim()}`);
        });
      });
    }

    if (checkGhostNotes) {
      checkGhostNotes.addEventListener('change', (e) => {
        state.showGhostNotes = e.target.checked;
        renderPianoRoll(Synth.currentStep || 0);
      });
    }

    if (selectZoom) {
      selectZoom.addEventListener('change', (e) => {
        state.zoom = e.target.value;
        handleResize();
        renderPianoRoll(Synth.currentStep || 0);
      });
    }

    // Mixer Channel click selects editing track
    document.querySelectorAll('.mixer-channel').forEach(ch => {
      ch.addEventListener('click', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON') return;
        const trackKey = ch.dataset.track;
        if (trackKey && studioTrackTabs) {
          const tab = studioTrackTabs.querySelector(`[data-track="${trackKey}"]`);
          if (tab) tab.click();
        }
      });
    });

    /**
     * Helper: Map Mouse Events to Piano Roll Grid Coordinates
     */
    function getPianoRollCoords(e) {
      const rect = pianoRollCanvas.getBoundingClientRect();
      if (!rect.width || !rect.height || !pianoRollCanvas.width || !pianoRollCanvas.height) return null;
      const px = (e.clientX - rect.left) * (pianoRollCanvas.width / rect.width);
      const py = (e.clientY - rect.top) * (pianoRollCanvas.height / rect.height);
      if (!isFinite(px) || !isFinite(py)) return null;

      const rulerHeight = 20;
      const isRuler = (py < rulerHeight);

      const stepsPerBar = (state.currentSong && state.currentSong.metadata.stepsPerBar) || (state.timeSignature === '7/8' ? 14 : (state.timeSignature === '6/8' ? 12 : (state.timeSignature === '5/8' ? 10 : 16)));
      const totalSteps = state.lengthBars * stepsPerBar;
      const stepWidth = pianoRollCanvas.width / totalSteps;
      const step = Math.max(0, Math.min(totalSteps - 1, Math.floor(px / stepWidth)));

      const minMidi = 24;
      const maxMidi = 96;
      const totalPitches = maxMidi - minMidi + 1;
      const noteHeight = (pianoRollCanvas.height - rulerHeight) / totalPitches;
      const midi = Math.max(minMidi, Math.min(maxMidi, maxMidi - Math.floor((py - rulerHeight) / noteHeight)));

      return { px, py, isRuler, step, midi, stepWidth, noteHeight, rulerHeight, totalSteps, stepsPerBar, minMidi, maxMidi };
    }

    /**
     * Helper: Audition Note in Real-time
     */
    function auditionNote(midi, duration = 0.25) {
      if (!Synth || !Synth.ctx) return;
      if (Synth.ctx.state === 'suspended') Synth.ctx.resume();
      const bus = Synth.trackBusses[state.editingTrack] || Synth.masterGain;
      const track = state.currentSong ? state.currentSong.tracks[state.editingTrack] : null;
      const inst = track ? track.instrument : 'grand_piano_lead';

      if (inst && (inst.includes('piano') || (state.currentSong && state.currentSong.metadata.isPurePiano))) {
        Synth._playAcousticPianoNote(midi, Synth.ctx.currentTime, duration, 0.9, bus, state.editingTrack === 'lead');
      } else if (state.editingTrack === 'lead') {
        Synth._playLeadSynth(midi, Synth.ctx.currentTime, duration, 0.9, bus, inst);
      } else if (state.editingTrack === 'chords') {
        Synth._playChordSynth(midi, Synth.ctx.currentTime, duration, 0.9, bus);
      } else if (state.editingTrack === 'arp') {
        Synth._playArpSynth(midi, Synth.ctx.currentTime, duration, 0.9, bus);
      } else if (state.editingTrack === 'bass') {
        Synth._playBassSynth(midi, Synth.ctx.currentTime, duration, 0.9, bus, (inst || '').includes('piano'));
      } else {
        Synth._playDrumSynth(midi, Synth.ctx.currentTime, 0.9, bus);
      }
    }

    /**
     * Helper: Find Note at Coordinates
     */
    function findPianoNoteAt(coords) {
      if (!state.currentSong || !state.currentSong.tracks[state.editingTrack]) return null;
      const track = state.currentSong.tracks[state.editingTrack];
      if (!track.notes) return null;

      for (let i = track.notes.length - 1; i >= 0; i--) {
        const n = track.notes[i];
        if (n.midi === coords.midi && n.step <= coords.step && coords.step < n.step + n.duration) {
          const noteRightPx = (n.step + n.duration) * coords.stepWidth;
          const isResize = (Math.abs(coords.px - noteRightPx) <= 8);
          return { note: n, index: i, isResize };
        }
      }
      return null;
    }

  /**
   * Studio Tools helpers (Select / Knife / Erase tren moi track)
   */
  function findNoteAtAnyTrack(coords) {
    if (!state.currentSong) return null;
    for (const [tKey, track] of Object.entries(state.currentSong.tracks)) {
      if (!track.notes) continue;
      for (let i = track.notes.length - 1; i >= 0; i--) {
        const n = track.notes[i];
        if (n.midi === coords.midi && n.step <= coords.step && coords.step < n.step + n.duration) {
          return { trackKey: tKey, track, note: n, index: i };
        }
      }
    }
    return null;
  }

  function findParentTrack(note) {
    if (!state.currentSong) return null;
    for (const [tKey, track] of Object.entries(state.currentSong.tracks)) {
      if (track.notes && track.notes.includes(note)) return { trackKey: tKey, track };
    }
    return null;
  }

  function clearSelection() {
    if (selectedNotes.size) {
      selectedNotes.clear();
      renderPianoRoll(Synth.currentStep || 0);
    }
  }

  function addToSelection(note) {
    if (!selectedNotes.has(note)) {
      selectedNotes.add(note);
      renderPianoRoll(Synth.currentStep || 0);
    }
  }

  function noteRectPx(note, metrics) {
    const { stepWidth, noteHeight, rulerHeight, minMidi, maxMidi } = metrics;
    const W = metrics.canvasWidth;
    const H = metrics.canvasHeight;
    return {
      x: note.step * stepWidth,
      w: Math.max(2, note.duration * stepWidth - 1),
      y: H - ((note.midi - minMidi + 1) * noteHeight),
      h: Math.max(3, noteHeight - 1)
    };
  }

  function gridMetrics() {
    const stepsPerBar = (state.currentSong && state.currentSong.metadata.stepsPerBar) || 16;
    const totalSteps = state.lengthBars * stepsPerBar;
    const stepWidth = pianoRollCanvas.width / totalSteps;
    const rulerHeight = 20;
    const minMidi = 24, maxMidi = 96;
    const noteHeight = (pianoRollCanvas.height - rulerHeight) / (maxMidi - minMidi + 1);
    return { stepsPerBar, totalSteps, stepWidth, rulerHeight, minMidi, maxMidi, noteHeight, canvasWidth: pianoRollCanvas.width, canvasHeight: pianoRollCanvas.height };
  }

  function removeNoteRef(track, index) {
    const [gone] = track.notes.splice(index, 1);
    if (gone) selectedNotes.delete(gone);
  }

  function refreshAfterEdit() {
    if (!state.currentSong) return;
    state.currentSong.metadata.noteCount = Object.values(state.currentSong.tracks).reduce((acc, t) => acc + (t.notes ? t.notes.length : 0), 0);
    Synth.loadSong(state.currentSong);
    updateHeaderBadges();
    renderPianoRoll(Synth.currentStep || 0);
    renderHistory();
    scheduleAutosave();
  }

  function splitNoteAt(hit, cutStep) {
    const n = hit.note;
    if (!(cutStep > n.step && cutStep < n.step + n.duration)) return false;
    pushUndo('cắt nốt');
    const right = {
      step: cutStep,
      duration: (n.step + n.duration) - cutStep,
      midi: n.midi,
      velocity: n.velocity,
      pan: n.pan || 0,
      locked: true
    };
    if (n.baseVel != null) right.baseVel = n.baseVel;
    n.duration = cutStep - n.step;
    n.locked = true;
    hit.track.notes.push(right);
    selectedNotes.clear();
    selectedNotes.add(right);
    refreshAfterEdit();
    return true;
  }

  function deleteSelection() {
    if (!selectedNotes.size || !state.currentSong) return;
    pushUndo('xóa nốt');
    for (const [tKey, track] of Object.entries(state.currentSong.tracks)) {
      if (!track.notes) continue;
      track.notes = track.notes.filter(n => !selectedNotes.has(n));
    }
    selectedNotes.clear();
    refreshAfterEdit();
    showToast('🗑️ Đã xóa các nốt đã chọn');
  }

  function duplicateSelection() {
    if (!selectedNotes.size || !state.currentSong) return;
    const spb = state.currentSong.metadata.stepsPerBar || 16;
    const totalSteps = state.lengthBars * spb;
    let minStep = Infinity, maxEnd = -Infinity;
    for (const n of selectedNotes) {
      minStep = Math.min(minStep, n.step);
      maxEnd = Math.max(maxEnd, n.step + n.duration);
    }
    const shift = Math.max(spb, Math.ceil(maxEnd - minStep));
    pushUndo('nhân bản');
    for (const n of selectedNotes) n._dupMark = true;
    selectedNotes.clear();
    for (const [tKey, track] of Object.entries(state.currentSong.tracks)) {
      if (!track.notes) continue;
      const clones = [];
      // clone theo danh sach rieng de tranh lap vo han
      const src = track.notes.filter(n => n._dupMark);
      for (const n of src) {
        const ns = n.step + shift;
        if (ns >= totalSteps) continue;
        const c = { step: ns, duration: n.duration, midi: n.midi, velocity: n.velocity, pan: n.pan || 0, locked: true };
        if (n.baseVel != null) c.baseVel = n.baseVel;
        clones.push(c);
        selectedNotes.add(c);
      }
      track.notes = track.notes.concat(clones);
    }
    // xoa co tam
    for (const t of Object.values(state.currentSong.tracks)) {
      for (const n of (t.notes || [])) delete n._dupMark;
    }
    refreshAfterEdit();
    showToast(`📄 Đã nhân bản ${selectedNotes.size} nốt sang phải ${shift} steps`);
  }

  function copySelection() {
    if (!selectedNotes.size || !state.currentSong) return;
    let minStep = Infinity;
    for (const n of selectedNotes) minStep = Math.min(minStep, n.step);
    copyBuffer = [];
    for (const n of selectedNotes) {
      const p = findParentTrack(n);
      if (!p) continue;
      copyBuffer.push({ trackKey: p.trackKey, dStep: n.step - minStep, duration: n.duration, midi: n.midi, velocity: n.velocity, pan: n.pan || 0, baseVel: (n.baseVel != null ? n.baseVel : n.velocity) });
    }
    showToast(`📋 Đã copy ${copyBuffer.length} nốt (Ctrl+V để dán tại playhead)`);
  }

  function pasteSelection() {
    if (!copyBuffer || !copyBuffer.length || !state.currentSong) return;
    const spb = state.currentSong.metadata.stepsPerBar || 16;
    const totalSteps = state.lengthBars * spb;
    const atStep = Math.floor((Synth.currentStep || 0) / spb) * spb;
    pushUndo('dán');
    selectedNotes.clear();
    let n = 0;
    for (const c of copyBuffer) {
      const track = state.currentSong.tracks[c.trackKey];
      if (!track) continue;
      if (!track.notes) track.notes = [];
      const ns = atStep + c.dStep;
      if (ns < 0 || ns >= totalSteps) continue;
      const note = { step: ns, duration: c.duration, midi: c.midi, velocity: c.velocity, pan: c.pan || 0, baseVel: c.baseVel, locked: true };
      track.notes.push(note);
      selectedNotes.add(note);
      n++;
    }
    refreshAfterEdit();
    showToast(`📋 Đã dán ${n} nốt tại bar ${Math.floor(atStep / spb) + 1}`);
  }

  function transposeSelection(delta) {
    if (!selectedNotes.size || !state.currentSong) return;
    pushUndo('dịch cao độ');
    for (const n of selectedNotes) {
      n.midi = Math.max(24, Math.min(96, n.midi + delta));
    }
    refreshAfterEdit();
  }

  function startGroupDrag(coords) {
    const items = [];
    for (const n of selectedNotes) {
      const p = findParentTrack(n);
      if (!p) continue;
      items.push({ trackKey: p.trackKey, track: p.track, note: n, origStep: n.step, origMidi: n.midi });
    }
    if (!items.length) return false;
    pushUndo('di chuyển nhóm');
    groupDrag = { items, startStep: coords.step, startMidi: coords.midi };
    return true;
  }

  function updateGroupDrag(coords) {
    if (!groupDrag) return false;
    const song = state.currentSong;
    const spb = song.metadata.stepsPerBar || 16;
    const totalSteps = state.lengthBars * spb;
    const dStep = Math.round(coords.step - groupDrag.startStep);
    const dMidi = coords.midi - groupDrag.startMidi;
    if (dStep === 0 && dMidi === 0) return true;
    for (const it of groupDrag.items) {
      const maxStep = Math.max(0, totalSteps - it.note.duration);
      it.note.step = Math.max(0, Math.min(maxStep, it.origStep + dStep));
      it.note.midi = Math.max(24, Math.min(96, it.origMidi + dMidi));
    }
    renderPianoRoll(Synth.currentStep || 0);
    return true;
  }

  function startMarquee(coords) {
    marqueeStart = { px: coords.px, py: coords.py };
    marqueeEnd = { px: coords.px, py: coords.py };
  }

  function updateMarquee(coords) {
    if (!marqueeStart) return false;
    marqueeEnd = { px: coords.px, py: coords.py };
    renderPianoRoll(Synth.currentStep || 0);
    return true;
  }

  function finishMarqueeOrGroupDrag() {
    let handled = false;
    if (groupDrag) {
      for (const it of groupDrag.items) it.note.locked = true;
      groupDrag = null;
      refreshAfterEdit();
      handled = true;
    } else if (marqueeStart && marqueeEnd) {
      const x0 = Math.min(marqueeStart.px, marqueeEnd.px);
      const x1 = Math.max(marqueeStart.px, marqueeEnd.px);
      const y0 = Math.min(marqueeStart.py, marqueeEnd.py);
      const y1 = Math.max(marqueeStart.py, marqueeEnd.py);
      const m = gridMetrics();
      const moved = Math.abs(marqueeStart.px - marqueeEnd.px) + Math.abs(marqueeStart.py - marqueeEnd.py);
      marqueeStart = null;
      marqueeEnd = null;
      if (moved > 6 && state.currentSong) {
        selectedNotes.clear();
        for (const track of Object.values(state.currentSong.tracks)) {
          if (!track.notes) continue;
          for (const n of track.notes) {
            const r = noteRectPx(n, m);
            const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
            if (cx >= x0 && cx <= x1 && cy >= y0 && cy <= y1) selectedNotes.add(n);
          }
        }
        renderPianoRoll(Synth.currentStep || 0);
        if (selectedNotes.size) showToast(`⬚ Đã chọn ${selectedNotes.size} nốt (Del xóa • Ctrl+D nhân bản • kéo để di chuyển)`);
      } else {
        renderPianoRoll(Synth.currentStep || 0);
      }
      handled = true;
    }
    return handled;
  }

  function setTool(t) {
    if (!['select', 'draw', 'knife', 'erase'].includes(t)) return;
    state.tool = t;
    marqueeStart = null;
    marqueeEnd = null;
    groupDrag = null;
    document.querySelectorAll('.tool-tab').forEach(b => {
      b.classList.toggle('active', b.dataset.tool === t);
    });
    renderPianoRoll(Synth.currentStep || 0);
  }

  function handleSelectMouseDown(coords) {
    const hit = findNoteAtAnyTrack(coords);
    if (hit) {
      if (!selectedNotes.has(hit.note)) {
        clearSelection();
        addToSelection(hit.note);
      }
      if (selectedNotes.size > 1 || selectedNotes.has(hit.note)) {
        startGroupDrag(coords);
      }
      auditionNote(hit.note.midi);
    } else {
      clearSelection();
      startMarquee(coords);
    }
  }

  function handleKnifeMouseDown(coords) {
    const hit = findNoteAtAnyTrack(coords);
    if (hit) {
      if (!splitNoteAt(hit, coords.step)) {
        showToast('🔪 Bấm vào giữa thân nốt để cắt');
      }
    }
  }

  function handleEraseMouseDown(coords) {
    const hit = findNoteAtAnyTrack(coords);
    if (hit) {
      pushUndo('xóa nốt');
      removeNoteRef(hit.track, hit.index);
      refreshAfterEdit();
    }
  }

    // Interactive Piano Roll Canvas Events (Add, Drag, Move, Resize, Delete, Audition)
    pianoRollCanvas.addEventListener('mousedown', (e) => {
      if (!state.currentSong) return;
      if (e.button === 2) return; // Handled by contextmenu

      const coords = getPianoRollCoords(e);
      if (!coords) return;
      if (coords.isRuler) {
        isDraggingRuler = true;
        Synth.seek(coords.step);
        renderPianoRoll(coords.step);
        return;
      }

      // Studio tools (Select / Knife / Erase) - Draw di tiep ben duoi
      if (state.tool === 'select') {
        handleSelectMouseDown(coords);
        return;
      }
      if (state.tool === 'knife') {
        handleKnifeMouseDown(coords);
        return;
      }
      if (state.tool === 'erase') {
        handleEraseMouseDown(coords);
        return;
      }

      const track = state.currentSong.tracks[state.editingTrack];
      if (!track) return;
      if (!track.notes) track.notes = [];

      const hit = findPianoNoteAt(coords);

      if (hit) {
        pushUndo('soạn nốt');
        if (hit.isResize) {
          resizingPianoNote = hit.note;
        } else {
          draggedPianoNote = hit.note;
          dragStartMidi = hit.note.midi;
          dragStartStep = hit.note.step;
          dragOffsetStep = coords.step - hit.note.step;
          auditionNote(hit.note.midi);
        }
      } else {
        // Click on empty grid cell: Add new note!
        pushUndo('soạn nốt');
        const newNote = {
          step: coords.step,
          duration: 2,
          midi: coords.midi,
          velocity: 95,
          locked: true // Not tay -> tu dong khoa, Generate/ gieo lai vung khong xoa
        };
        track.notes.push(newNote);
        draggedPianoNote = newNote;
        dragStartMidi = coords.midi;
        dragStartStep = coords.step;
        dragOffsetStep = 0;
        auditionNote(coords.midi);
        renderPianoRoll(Synth.currentStep || 0);
      }
    });

    pianoRollCanvas.addEventListener('mousemove', (e) => {
      if (!state.currentSong) return;
      const coords = getPianoRollCoords(e);
      if (!coords) return;

      if (isDraggingRuler) {
        Synth.seek(coords.step);
        renderPianoRoll(coords.step);
        return;
      }

      if (marqueeStart) {
        updateMarquee(coords);
        return;
      }

      if (groupDrag) {
        updateGroupDrag(coords);
        return;
      }

      if (draggedPianoNote) {
        const newStep = Math.max(0, Math.min(coords.totalSteps - draggedPianoNote.duration, coords.step - dragOffsetStep));
        const newMidi = coords.midi;

        if (newStep !== draggedPianoNote.step || newMidi !== draggedPianoNote.midi) {
          if (newMidi !== draggedPianoNote.midi) {
            auditionNote(newMidi);
          }
          draggedPianoNote.step = newStep;
          draggedPianoNote.midi = newMidi;
          renderPianoRoll(Synth.currentStep || 0);
        }
        return;
      }

      if (resizingPianoNote) {
        const newDur = Math.max(1, coords.step - resizingPianoNote.step + 1);
        if (newDur !== resizingPianoNote.duration) {
          resizingPianoNote.duration = newDur;
          renderPianoRoll(Synth.currentStep || 0);
        }
        return;
      }

      // Cursor hover feedback
      if (state.tool !== 'draw') {
        if (coords.isRuler) {
          pianoRollCanvas.style.cursor = 'pointer';
        } else if (state.tool === 'select') {
          pianoRollCanvas.style.cursor = findNoteAtAnyTrack(coords) ? 'move' : 'default';
        } else if (state.tool === 'knife') {
          pianoRollCanvas.style.cursor = 'cell';
        } else {
          pianoRollCanvas.style.cursor = 'pointer';
        }
        return;
      }
      if (coords.isRuler) {
        pianoRollCanvas.style.cursor = 'pointer';
      } else {
        const hover = findPianoNoteAt(coords);
        if (hover) {
          pianoRollCanvas.style.cursor = hover.isResize ? 'col-resize' : 'grab';
        } else {
          pianoRollCanvas.style.cursor = 'crosshair';
        }
      }
    });

    window.addEventListener('mouseup', () => {
      // Ket thuc marquee / keo nhom (studio tools)
      if (finishMarqueeOrGroupDrag()) return;
      if (isDraggingRuler || draggedPianoNote || resizingPianoNote) {
        // Chi reload synth khi that su co sua not (keo thuoc don thuan thi giu playhead)
        const edited = !!(draggedPianoNote || resizingPianoNote);
        // Not vua keo/sua bang tay -> khoa lai de gieo lai vung khong xoa
        if (draggedPianoNote) draggedPianoNote.locked = true;
        if (resizingPianoNote) resizingPianoNote.locked = true;
        isDraggingRuler = false;
        draggedPianoNote = null;
        resizingPianoNote = null;
        if (edited && state.currentSong) {
          state.currentSong.metadata.noteCount = Object.values(state.currentSong.tracks).reduce((acc, t) => acc + (t.notes ? t.notes.length : 0), 0);
          Synth.loadSong(state.currentSong);
          updateHeaderBadges();
          renderHistory();
          scheduleAutosave();
        }
        renderPianoRoll(Synth.currentStep || 0);
      }
    });

    pianoRollCanvas.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      if (!state.currentSong) return;

      const coords = getPianoRollCoords(e);
      if (!coords) return;
      if (coords.isRuler) return;

      const hit = findPianoNoteAt(coords);
      if (hit) {
        pushUndo('xóa nốt');
        const track = state.currentSong.tracks[state.editingTrack];
        track.notes.splice(hit.index, 1);
        state.currentSong.metadata.noteCount = Object.values(state.currentSong.tracks).reduce((acc, t) => acc + (t.notes ? t.notes.length : 0), 0);
        Synth.loadSong(state.currentSong);
        updateHeaderBadges();
        renderPianoRoll(Synth.currentStep || 0);
        showToast(`🗑️ Đã xóa nốt (${Theory.midiToNote(hit.note.midi)}) bè ${state.editingTrack.toUpperCase()}`);
      }
    });

    // Export Handlers
    btnCopyClip.addEventListener('click', handleCopyClip);
    btnSaveMidi.addEventListener('click', handleSaveMidi);
    btnSaveMmp.addEventListener('click', handleSaveMmp);
    btnLaunchLmms.addEventListener('click', handleLaunchLmms);

    // Synth Step Sync
    Synth.onStepChange = (currentStep) => {
      renderPianoRoll(currentStep);

      const stepsPerBar = (state.currentSong && state.currentSong.metadata.stepsPerBar) || 16;
      const activeBar = Math.floor(currentStep / stepsPerBar);
      const chips = progressionDisplay.querySelectorAll('.chord-chip');
      chips.forEach(chip => {
        chip.classList.toggle('active', parseInt(chip.dataset.bar, 10) === activeBar);
      });
    };
  }

  async function handleCopyClip() {
    if (!state.currentSong) return;
    const clipXml = Exporter.generateLmmsClipboardClip(state.currentSong, getMix());

    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(clipXml);
        showToast('📋 Đã sao chép Clip LMMS vào Clipboard! Chuyển sang LMMS và ấn Ctrl+V!');
      } else {
        showToast('Clipboard không khả dụng trong môi trường hiện tại.');
      }
    } catch (err) {
      showToast('Lỗi khi sao chép Clipboard: ' + err.message);
    }
  }

  async function handleSaveMidi() {
    if (!state.currentSong) return;
    const midiBytes = Exporter.generateMidiFile(state.currentSong, getMix(), state.swing);
    const defaultName = `${state.currentSong.metadata.title}.mid`;

    if (window.rmgAPI && window.rmgAPI.saveFile) {
      const res = await window.rmgAPI.saveFile({
        data: Array.from(midiBytes),
        defaultName,
        type: 'midi'
      });
      if (res && res.success) {
        showToast(`🎵 Đã lưu file MIDI thành công: "${res.filePath}"`);
        refreshRecent();
      }
    } else {
      const blob = new Blob([midiBytes], { type: 'audio/midi' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = defaultName;
      a.click();
      URL.revokeObjectURL(url);
      showToast(`🎵 Đã tải xuống file MIDI: ${defaultName}`);
    }
  }

  async function handleSaveMmp() {
    if (!state.currentSong) return;
    const sf2 = await resolveSf2();
    const mmpXml = Exporter.generateLmmsProject(state.currentSong, getMix(), state.swing, sf2);
    const defaultName = `${state.currentSong.metadata.title}.mmp`;

    if (window.rmgAPI && window.rmgAPI.saveFile) {
      const res = await window.rmgAPI.saveFile({
        data: mmpXml,
        defaultName,
        type: 'mmp'
      });
      if (res && res.success) {
        showToast(`💾 Đã lưu dự án LMMS thành công: "${res.filePath}"${sf2 ? ' [SoundFont 🎻]' : ''}`);
        refreshRecent();
      }
    } else {
      const blob = new Blob([mmpXml], { type: 'application/xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = defaultName;
      a.click();
      URL.revokeObjectURL(url);
      showToast(`💾 Đã tải xuống file LMMS: ${defaultName}`);
    }
  }

  async function handleLaunchLmms() {
    if (!state.currentSong) return;
    const sf2 = await resolveSf2();
    const mmpXml = Exporter.generateLmmsProject(state.currentSong, getMix(), state.swing, sf2);
    const trackClipXml = Exporter.generateLmmsClipboardClip(state.currentSong, getMix());

    showToast('🚀 Đang chuẩn bị kết nối LMMS...');

    if (window.rmgAPI && window.rmgAPI.launchLMMS) {
      const res = await window.rmgAPI.launchLMMS({
        mmpContent: mmpXml,
        trackClipXml: trackClipXml
      });

      if (res && res.success) {
        showToast(res.message || '🚀 Đã gửi dự án sang LMMS thành công!', 4500);
      } else {
        showToast('⚠️ ' + (res.error || 'Không thể mở LMMS tự động. Hãy dùng nút "Lưu File LMMS" và mở thủ công!'), 5000);
      }
    } else {
      showToast('Tính năng tương tác trực tiếp LMMS cần chạy trong ứng dụng Desktop RMG.');
    }
  }

  function handleResize() {
    const rect = canvasContainer.getBoundingClientRect();
    if (state.zoom === 'fit' || !state.currentSong) {
      pianoRollCanvas.width = rect.width;
      pianoRollCanvas.style.width = '100%';
      canvasContainer.style.overflowX = 'hidden';
    } else {
      const stepsPerBar = (state.currentSong && state.currentSong.metadata.stepsPerBar) || 16;
      const totalSteps = state.lengthBars * stepsPerBar;
      const pxPerStep = (state.zoom === '2x') ? 24 : 12;
      pianoRollCanvas.width = Math.max(rect.width, Math.ceil(totalSteps * pxPerStep));
      pianoRollCanvas.style.width = pianoRollCanvas.width + 'px';
      canvasContainer.style.overflowX = 'auto';
    }
    pianoRollCanvas.height = rect.height;

    visualizerCanvas.width = visualizerCanvas.parentElement.clientWidth;
    visualizerCanvas.height = visualizerCanvas.parentElement.clientHeight;

    renderPianoRoll(Synth.currentStep);
    if (state.contourEnabled) {
      renderContourCanvas();
    }
  }

  /**
   * Render Interactive Melody Contour Envelope Canvas
   */
  function renderContourCanvas() {
    if (!contourCanvas || !contourCanvasContainer) return;
    if (!contourCtx) contourCtx = contourCanvas.getContext('2d');

    const rect = contourCanvasContainer.getBoundingClientRect();
    contourCanvas.width = rect.width;
    contourCanvas.height = rect.height;

    const w = contourCanvas.width;
    const h = contourCanvas.height;
    if (w === 0 || h === 0) return;

    contourCtx.clearRect(0, 0, w, h);

    // 1. Background Grid & Bar Dividers
    const totalBars = state.lengthBars;
    for (let b = 0; b <= totalBars; b++) {
      const bx = (b / totalBars) * w;
      contourCtx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      contourCtx.lineWidth = 1;
      contourCtx.beginPath();
      contourCtx.moveTo(bx, 0);
      contourCtx.lineTo(bx, h);
      contourCtx.stroke();

      if (b < totalBars && totalBars <= 32) {
        contourCtx.fillStyle = 'rgba(0, 242, 254, 0.4)';
        contourCtx.font = '9px sans-serif';
        contourCtx.fillText(`B${b + 1}`, bx + 4, 12);
      }
    }

    // Horizontal Pitch Guidelines (25%, 50%, 75%)
    for (let yPct of [0.25, 0.5, 0.75]) {
      const py = (1 - yPct) * h;
      contourCtx.strokeStyle = 'rgba(0, 242, 254, 0.08)';
      contourCtx.lineWidth = 0.8;
      contourCtx.setLineDash([4, 4]);
      contourCtx.beginPath();
      contourCtx.moveTo(0, py);
      contourCtx.lineTo(w, py);
      contourCtx.stroke();
      contourCtx.setLineDash([]);
    }

    if (!state.contourPoints || state.contourPoints.length === 0) return;

    // 2. Draw Curve Area Gradient Fill
    const sorted = [...state.contourPoints].sort((a, b) => a.x - b.x);
    contourCtx.beginPath();
    contourCtx.moveTo(sorted[0].x * w, (1 - sorted[0].y) * h);

    for (let i = 1; i < sorted.length; i++) {
      contourCtx.lineTo(sorted[i].x * w, (1 - sorted[i].y) * h);
    }
    contourCtx.lineTo(sorted[sorted.length - 1].x * w, h);
    contourCtx.lineTo(sorted[0].x * w, h);
    contourCtx.closePath();

    const fillGrad = contourCtx.createLinearGradient(0, 0, 0, h);
    fillGrad.addColorStop(0, 'rgba(0, 242, 254, 0.25)');
    fillGrad.addColorStop(1, 'rgba(155, 81, 224, 0.05)');
    contourCtx.fillStyle = fillGrad;
    contourCtx.fill();

    // 3. Glowing Neon Stroke Line
    contourCtx.beginPath();
    contourCtx.moveTo(sorted[0].x * w, (1 - sorted[0].y) * h);
    for (let i = 1; i < sorted.length; i++) {
      contourCtx.lineTo(sorted[i].x * w, (1 - sorted[i].y) * h);
    }
    contourCtx.strokeStyle = '#00f2fe';
    contourCtx.lineWidth = 2.5;
    contourCtx.shadowColor = '#00f2fe';
    contourCtx.shadowBlur = 8;
    contourCtx.stroke();
    contourCtx.shadowBlur = 0;

    // 4. Red & Cyan Interactive Nodes
    sorted.forEach((pt, index) => {
      const px = pt.x * w;
      const py = (1 - pt.y) * h;
      const isHover = (index === hoveredContourIndex);
      const isDrag = (index === draggedContourIndex);

      contourCtx.beginPath();
      contourCtx.arc(px, py, isDrag ? 7 : (isHover ? 6.5 : 5), 0, Math.PI * 2);
      contourCtx.fillStyle = isDrag ? '#ffffff' : '#ff2a6d';
      contourCtx.shadowColor = '#ff2a6d';
      contourCtx.shadowBlur = isHover || isDrag ? 14 : 6;
      contourCtx.fill();

      contourCtx.strokeStyle = '#ffffff';
      contourCtx.lineWidth = 1.5;
      contourCtx.stroke();
      contourCtx.shadowBlur = 0;
    });
  }

  function renderPianoRoll(currentStep = 0) {
    if (!state.currentSong) return;

    const width = pianoRollCanvas.width;
    const height = pianoRollCanvas.height;
    if (width === 0 || height === 0) return;

    const rulerHeight = 20;
    const gridHeight = height - rulerHeight;

    const stepsPerBar = (state.currentSong && state.currentSong.metadata.stepsPerBar) || (state.timeSignature === '7/8' ? 14 : (state.timeSignature === '6/8' ? 12 : (state.timeSignature === '5/8' ? 10 : 16)));
    const totalSteps = state.lengthBars * stepsPerBar;
    const stepWidth = width / totalSteps;

    const minMidi = 24;
    const maxMidi = 96;
    const totalPitches = maxMidi - minMidi + 1;
    const noteHeight = gridHeight / totalPitches;

    prCtx.fillStyle = '#0a0b12';
    prCtx.fillRect(0, 0, width, height);

    // 1. Grid Lines
    for (let s = 0; s <= totalSteps; s++) {
      const x = s * stepWidth;
      const isBar = (s % stepsPerBar === 0);
      const isBeat = (stepsPerBar === 14 ? (s % 2 === 0) : (stepsPerBar === 12 ? (s % 3 === 0) : (stepsPerBar === 10 ? (s % 2 === 0) : (s % 4 === 0))));

      if (isBar) {
        prCtx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
        prCtx.lineWidth = 1.5;
      } else if (isBeat) {
        prCtx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        prCtx.lineWidth = 1;
      } else {
        prCtx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
        prCtx.lineWidth = 0.5;
      }

      prCtx.beginPath();
      prCtx.moveTo(x, rulerHeight);
      prCtx.lineTo(x, height);
      prCtx.stroke();
    }

    // 2. Pitch Lanes
    for (let m = minMidi; m <= maxMidi; m++) {
      const pc = m % 12;
      const isBlackKey = [1, 3, 6, 8, 10].includes(pc);
      const y = height - ((m - minMidi + 1) * noteHeight);

      if (isBlackKey) {
        prCtx.fillStyle = 'rgba(0, 0, 0, 0.25)';
        prCtx.fillRect(0, y, width, noteHeight);
      }
      if (pc === 0) {
        prCtx.strokeStyle = 'rgba(0, 242, 254, 0.12)';
        prCtx.lineWidth = 1;
        prCtx.beginPath();
        prCtx.moveTo(0, y);
        prCtx.lineTo(width, y);
        prCtx.stroke();
      }
    }

    // 3. Track Notes (Ghost Notes vs Active Editing Track)
    const trackColors = {
      lead: '#00f2fe',
      chords: '#9b51e0',
      arp: '#4facfe',
      bass: '#f39c12',
      drums: '#e74c3c'
    };

    const trackKeys = ['drums', 'bass', 'chords', 'arp', 'lead'];

    // 3A. Draw Ghost Notes first (non-editing tracks)
    if (state.showGhostNotes) {
      prCtx.globalAlpha = 0.32;
      for (const tKey of trackKeys) {
        if (tKey === state.editingTrack) continue;
        const track = state.currentSong.tracks[tKey];
        if (!track || !track.notes) continue;
        const color = trackColors[tKey] || '#00f2fe';

        for (const note of track.notes) {
          const x = note.step * stepWidth;
          const w = Math.max(2, note.duration * stepWidth - 1);
          const y = height - ((note.midi - minMidi + 1) * noteHeight);
          const h = Math.max(3, noteHeight - 1);

          const isSel = selectedNotes.has(note);
          prCtx.globalAlpha = isSel ? 0.95 : 0.32;
          prCtx.fillStyle = color;
          prCtx.beginPath();
          prCtx.roundRect(x, y, w, h, 2);
          prCtx.fill();
          if (isSel) {
            prCtx.strokeStyle = '#ffffff';
            prCtx.lineWidth = 1.5;
            prCtx.stroke();
          }
          prCtx.globalAlpha = 1.0;
        }
      }
      prCtx.globalAlpha = 1.0;
    }

    // 3B. Draw Active Editing Track Notes (Full vibrant brightness + stroke + note label)
    const activeTrack = state.currentSong.tracks[state.editingTrack];
    if (activeTrack && activeTrack.notes) {
      const baseColor = trackColors[state.editingTrack] || '#00f2fe';

      for (const note of activeTrack.notes) {
        const x = note.step * stepWidth;
        const w = Math.max(3, note.duration * stepWidth - 1);
        const y = height - ((note.midi - minMidi + 1) * noteHeight);
        const h = Math.max(3, noteHeight - 1);

        const isNotePlaying = (Synth.isPlaying && note.step <= currentStep && currentStep < note.step + note.duration);
        const isDragged = (draggedPianoNote === note || resizingPianoNote === note);
        const isSelected = selectedNotes.has(note);

        if (isNotePlaying || isDragged || isSelected) {
          prCtx.fillStyle = '#ffffff';
          prCtx.shadowColor = isDragged ? '#ffd700' : baseColor;
          prCtx.shadowBlur = 12;
        } else {
          prCtx.fillStyle = baseColor;
          prCtx.shadowBlur = 0;
        }

        prCtx.beginPath();
        prCtx.roundRect(x, y, w, h, 2);
        prCtx.fill();
        prCtx.shadowBlur = 0;

        // White / Gold border for active track (Gold = not khoa tay)
        const isLocked = !!note.locked;
        prCtx.strokeStyle = (isDragged || isLocked) ? '#ffd700' : (isSelected ? '#00f2fe' : 'rgba(255, 255, 255, 0.45)');
        prCtx.lineWidth = (isDragged || isLocked || isSelected) ? 2 : 1;
        prCtx.stroke();

        // Right-edge resize handle grip
        if (w >= 12) {
          prCtx.fillStyle = 'rgba(255, 255, 255, 0.8)';
          prCtx.fillRect(x + w - 3, y + 1, 2, h - 2);
        }

        // Note pitch name text label
        if (w >= 18 && h >= 8) {
          prCtx.fillStyle = isNotePlaying ? '#000000' : '#ffffff';
          prCtx.font = 'bold 8px sans-serif';
          prCtx.textBaseline = 'middle';
          const pitchStr = Theory.midiToNote ? Theory.midiToNote(note.midi) : `N${note.midi}`;
          prCtx.fillText(pitchStr, x + 3, y + h / 2);
        }
      }
    }

    // 4. Timeline Ruler Bar (Top 20px)
    prCtx.fillStyle = '#0f111c';
    prCtx.fillRect(0, 0, width, rulerHeight);

    prCtx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    prCtx.lineWidth = 1;
    prCtx.beginPath();
    prCtx.moveTo(0, rulerHeight);
    prCtx.lineTo(width, rulerHeight);
    prCtx.stroke();

    for (let b = 0; b < state.lengthBars; b++) {
      const bx = b * stepsPerBar * stepWidth;
      prCtx.strokeStyle = 'rgba(0, 242, 254, 0.4)';
      prCtx.beginPath();
      prCtx.moveTo(bx, 4);
      prCtx.lineTo(bx, rulerHeight);
      prCtx.stroke();

      prCtx.fillStyle = '#00f2fe';
      prCtx.font = 'bold 9px sans-serif';
      prCtx.textBaseline = 'top';
      prCtx.fillText(`B${b + 1}`, bx + 4, 4);
    }

    // 5. Playhead Bar & Pointer
    const playheadX = currentStep * stepWidth;
    prCtx.strokeStyle = '#ffffff';
    prCtx.shadowColor = '#00f2fe';
    prCtx.shadowBlur = 10;
    prCtx.lineWidth = 2.0;
    prCtx.beginPath();
    prCtx.moveTo(playheadX, 0);
    prCtx.lineTo(playheadX, height);
    prCtx.stroke();
    prCtx.shadowBlur = 0;

    // Playhead triangle in ruler
    prCtx.fillStyle = '#00f2fe';
    prCtx.beginPath();
    prCtx.moveTo(playheadX - 5, 0);
    prCtx.lineTo(playheadX + 5, 0);
    prCtx.lineTo(playheadX, 10);
    prCtx.closePath();
    prCtx.fill();

    // Marquee selection overlay
    if (marqueeStart && marqueeEnd) {
      const mx = Math.min(marqueeStart.px, marqueeEnd.px);
      const my = Math.min(marqueeStart.py, marqueeEnd.py);
      const mw = Math.abs(marqueeEnd.px - marqueeStart.px);
      const mh = Math.abs(marqueeEnd.py - marqueeStart.py);
      prCtx.fillStyle = 'rgba(0, 242, 254, 0.12)';
      prCtx.fillRect(mx, my, mw, mh);
      prCtx.strokeStyle = '#00f2fe';
      prCtx.lineWidth = 1.5;
      prCtx.setLineDash([5, 4]);
      prCtx.strokeRect(mx, my, mw, mh);
      prCtx.setLineDash([]);
    }

    // Selection count badge
    const selInfo = document.getElementById('selectionInfo');
    if (selInfo) {
      selInfo.textContent = selectedNotes.size > 0 ? `⬚ ${selectedNotes.size} nốt` : '';
    }
  }

  function startVisualizerLoop() {
    function draw() {
      requestAnimationFrame(draw);

      const w = visualizerCanvas.width;
      const h = visualizerCanvas.height;
      if (w === 0 || h === 0) return;

      vizCtx.clearRect(0, 0, w, h);

      if (!Synth.isPlaying) {
        vizCtx.strokeStyle = 'rgba(0, 242, 254, 0.2)';
        vizCtx.lineWidth = 1.5;
        vizCtx.beginPath();
        vizCtx.moveTo(0, h / 2);
        vizCtx.lineTo(w, h / 2);
        vizCtx.stroke();
        return;
      }

      const freqData = Synth.getSpectrumData();
      const numBars = 32;
      const barWidth = w / numBars;

      for (let i = 0; i < numBars; i++) {
        const binIndex = Math.floor((i / numBars) * (freqData.length / 2));
        const val = freqData[binIndex] || 0;
        const percent = val / 255;
        const barHeight = percent * (h - 4);

        const gradient = vizCtx.createLinearGradient(0, h, 0, 0);
        gradient.addColorStop(0, 'rgba(0, 242, 254, 0.8)');
        gradient.addColorStop(1, 'rgba(155, 81, 224, 0.9)');

        vizCtx.fillStyle = gradient;
        vizCtx.fillRect(i * barWidth + 1, h - barHeight, barWidth - 2, barHeight);
      }
    }
    requestAnimationFrame(draw);
  }

  window.addEventListener('DOMContentLoaded', () => {
    loadHistoryStorage();
    loadCustomGenres();
    setupEventListeners();
    window.addEventListener('resize', handleResize);
    handleResize();
    renderCustomGenreCards();

    restoreStartup().then(() => {
      renderHistory();
      renderSeedGallery();
      refreshRecent();
      refreshExportDirLabel();
      initSoundFontStatus();
      // Tab dau tien tu bai hien tai
      tabSeq = 1;
      songTabs = [{ id: 'tab1', label: '', snap: snapshotState() }];
      activeTabId = 'tab1';
      renderTabs();
      updateUndoButtons();
      startVisualizerLoop();
    });
  });

})();
