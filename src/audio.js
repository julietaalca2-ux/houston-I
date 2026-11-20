window.CiudadCero = window.CiudadCero || {};

CiudadCero.Audio = (() => {
  let ctx = null;
  let enabled = true;
  let masterVolume = 0.85;
  let musicEnabled = true;
  let sfxEnabled = true;
  let sirenPhase = 0;
  let musicTimer = null;
  let musicStep = 0;

  const BASS_NOTES = [55.0, 55.0, 65.41, 65.41, 49.0, 49.0, 58.27, 65.41];
  const PAD_NOTES = [220.0, 261.63, 196.0, 246.94];

  function ensureContext() {
    if (!enabled) return null;
    if (!ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        ctx = new AudioCtx();
      }
    }
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    return ctx;
  }

  function tone(freq, duration, type = 'sine', gainVal = 0.08, endFreq = null, isMusic = false) {
    if (!enabled) return;
    if (isMusic && !musicEnabled) return;
    if (!isMusic && !sfxEnabled) return;
    const scaledGain = gainVal * Math.max(0, Math.min(1, masterVolume));
    if (scaledGain <= 0.0005) return;

    const c = ensureContext();
    if (!c || c.state !== 'running') return;

    const now = c.currentTime;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (endFreq) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), now + duration);
    }
    gain.gain.setValueAtTime(scaledGain, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(now);
    osc.stop(now + duration);
  }

  function tickMusic() {
    if (!enabled || !musicEnabled || masterVolume <= 0.01) return;
    const c = ensureContext();
    if (!c || c.state !== 'running') return;

    const bassFreq = BASS_NOTES[musicStep % BASS_NOTES.length];
    tone(bassFreq, 0.55, 'triangle', 0.032, bassFreq * 0.99, true);

    if (musicStep % 2 === 0) {
      const padFreq = PAD_NOTES[(musicStep / 2) % PAD_NOTES.length];
      tone(padFreq, 1.15, 'sine', 0.018, null, true);
    }
    musicStep = (musicStep + 1) % 16;
  }

  function syncMusicLoop() {
    if (enabled && musicEnabled) {
      if (!musicTimer) {
        musicTimer = setInterval(tickMusic, 650);
      }
    } else if (musicTimer) {
      clearInterval(musicTimer);
      musicTimer = null;
    }
  }

  return {
    unlock() {
      ensureContext();
      syncMusicLoop();
    },

    applySettings(audioSettings) {
      if (!audioSettings) return;
      if (typeof audioSettings.enabled === 'boolean') enabled = audioSettings.enabled;
      if (typeof audioSettings.masterVolume === 'number') {
        masterVolume = Math.max(0, Math.min(1, audioSettings.masterVolume));
      }
      if (typeof audioSettings.musicEnabled === 'boolean') musicEnabled = audioSettings.musicEnabled;
      if (typeof audioSettings.sfxEnabled === 'boolean') sfxEnabled = audioSettings.sfxEnabled;
      if (enabled) ensureContext();
      syncMusicLoop();
    },

    getSettings() {
      return {
        enabled,
        masterVolume,
        musicEnabled,
        sfxEnabled
      };
    },

    isEnabled() {
      return enabled;
    },

    setEnabled(val) {
      enabled = Boolean(val);
      if (enabled) ensureContext();
      syncMusicLoop();
      return enabled;
    },

    setMasterVolume(val) {
      masterVolume = Math.max(0, Math.min(1, Number(val) || 0));
      syncMusicLoop();
      return masterVolume;
    },

    setMusicEnabled(val) {
      musicEnabled = Boolean(val);
      if (musicEnabled && enabled) ensureContext();
      syncMusicLoop();
      return musicEnabled;
    },

    setSfxEnabled(val) {
      sfxEnabled = Boolean(val);
      return sfxEnabled;
    },

    toggle() {
      enabled = !enabled;
      if (enabled) ensureContext();
      syncMusicLoop();
      return enabled;
    },

    playDoor(entering) {
      if (entering) {
        tone(170, 0.08, 'triangle', 0.1, 240);
        setTimeout(() => tone(120, 0.09, 'sine', 0.12, 85), 65);
      } else {
        tone(220, 0.07, 'triangle', 0.09, 150);
        setTimeout(() => tone(110, 0.08, 'sine', 0.1, 75), 55);
      }
    },

    playHorn(isPolice = false) {
      if (isPolice) {
        tone(680, 0.18, 'sawtooth', 0.055, 880);
        setTimeout(() => tone(880, 0.18, 'sawtooth', 0.055, 640), 170);
      } else {
        tone(340, 0.16, 'sawtooth', 0.06, 330);
        tone(425, 0.16, 'sawtooth', 0.05, 415);
      }
    },

    playSirenPulse() {
      sirenPhase = (sirenPhase + 1) % 2;
      const f1 = sirenPhase === 0 ? 640 : 840;
      const f2 = sirenPhase === 0 ? 820 : 620;
      tone(f1, 0.24, 'triangle', 0.026, f2);
    },

    playCrash(intensity = 0.5) {
      const vol = Math.min(0.18, 0.05 + intensity * 0.12);
      tone(95, 0.18, 'sawtooth', vol, 36);
      tone(62, 0.22, 'square', vol * 0.7, 28);
    },

    playMissionComplete() {
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((n, idx) => {
        setTimeout(() => tone(n, 0.18, 'triangle', 0.09), idx * 75);
      });
    },

    playMissionFail() {
      tone(240, 0.22, 'sawtooth', 0.08, 175);
      setTimeout(() => tone(175, 0.28, 'sawtooth', 0.08, 125), 180);
    },

    playAlert() {
      tone(660, 0.11, 'square', 0.05, 520);
      setTimeout(() => tone(780, 0.12, 'square', 0.05, 640), 110);
    },

    playEscapeSuccess() {
      tone(440, 0.14, 'sine', 0.07, 587.33);
      setTimeout(() => tone(587.33, 0.22, 'triangle', 0.08, 880), 120);
    },

    playGarageAction() {
      tone(290, 0.09, 'square', 0.06, 440);
      setTimeout(() => tone(520, 0.14, 'triangle', 0.08, 660), 80);
    },

    playDialogueBlip() {
      tone(480, 0.055, 'triangle', 0.045, 620);
    }
  };
})();
