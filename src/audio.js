window.CiudadCero = window.CiudadCero || {};

CiudadCero.Audio = (() => {
  let ctx = null;
  let enabled = true;
  let sirenPhase = 0;

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

  function tone(freq, duration, type = 'sine', gainVal = 0.08, endFreq = null) {
    const c = ensureContext();
    if (!c) return;
    const now = c.currentTime;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (endFreq) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), now + duration);
    }
    gain.gain.setValueAtTime(gainVal, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(now);
    osc.stop(now + duration);
  }

  return {
    unlock() {
      ensureContext();
    },

    isEnabled() {
      return enabled;
    },

    toggle() {
      enabled = !enabled;
      if (enabled) ensureContext();
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
