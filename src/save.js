window.CiudadCero = window.CiudadCero || {};

CiudadCero.Save = (() => {
  const STORAGE_KEY = 'ciudad_cero_v06_save';
  const LEGACY_KEY_V05 = 'ciudad_cero_v05_save';
  const LEGACY_KEY_V04 = 'ciudad_cero_v04_save';
  const SETTINGS_KEY = 'ciudad_cero_settings_v06';
  const LEGACY_SETTINGS_V05 = 'ciudad_cero_settings_v05';

  const DEFAULT_SETTINGS = {
    audio: {
      enabled: true,
      masterVolume: 0.85,
      musicEnabled: true,
      sfxEnabled: true
    },
    touch: {
      mode: 'auto',
      showJoystick: true,
      sensitivity: 1.0,
      buttonSize: 'normal',
      opacity: 0.85,
      carSteerMode: 'buttons',
      swapSides: false
    },
    general: {
      showMinimap: true,
      showDistrictBadge: true,
      quality: 'high',
      autoSave: true
    }
  };

  function cloneDefaults() {
    return JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
  }

  function hasSave() {
    try {
      const raw6 = window.localStorage.getItem(STORAGE_KEY);
      if (raw6 && raw6.length > 2) return true;
      const raw5 = window.localStorage.getItem(LEGACY_KEY_V05);
      if (raw5 && raw5.length > 2) return true;
      const raw4 = window.localStorage.getItem(LEGACY_KEY_V04);
      return Boolean(raw4 && raw4.length > 2);
    } catch (_) {
      return false;
    }
  }

  function load() {
    try {
      let raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        raw = window.localStorage.getItem(LEGACY_KEY_V05);
      }
      if (!raw) {
        raw = window.localStorage.getItem(LEGACY_KEY_V04);
      }
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (!data || typeof data !== 'object') return null;
      if (data.version !== '0.6' && data.version !== '0.5' && data.version !== '0.4') {
        return null;
      }
      return data;
    } catch (_) {
      return null;
    }
  }

  function save(payload) {
    try {
      const record = Object.assign(
        {
          version: '0.6',
          savedAt: Date.now()
        },
        payload
      );
      const serialized = JSON.stringify(record);
      window.localStorage.setItem(STORAGE_KEY, serialized);
      // Maintain compatibility keys for v0.5 & v0.4 continuity
      const compatV05 = Object.assign({}, record, { version: '0.5' });
      window.localStorage.setItem(LEGACY_KEY_V05, JSON.stringify(compatV05));
      return true;
    } catch (_) {
      return false;
    }
  }

  function clear() {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
      window.localStorage.removeItem(LEGACY_KEY_V05);
      window.localStorage.removeItem(LEGACY_KEY_V04);
      return true;
    } catch (_) {
      return false;
    }
  }

  function loadSettings() {
    const base = cloneDefaults();
    try {
      let raw = window.localStorage.getItem(SETTINGS_KEY);
      if (!raw) {
        raw = window.localStorage.getItem(LEGACY_SETTINGS_V05);
      }
      if (!raw) return base;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return base;
      if (parsed.audio) Object.assign(base.audio, parsed.audio);
      if (parsed.touch) Object.assign(base.touch, parsed.touch);
      if (parsed.general) Object.assign(base.general, parsed.general);
      return base;
    } catch (_) {
      return base;
    }
  }

  function saveSettings(settings) {
    try {
      window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
      return true;
    } catch (_) {
      return false;
    }
  }

  function resetSettings() {
    const base = cloneDefaults();
    saveSettings(base);
    return base;
  }

  return {
    STORAGE_KEY,
    LEGACY_KEY_V05,
    LEGACY_KEY_V04,
    SETTINGS_KEY,
    DEFAULT_SETTINGS,
    hasSave,
    load,
    save,
    clear,
    loadSettings,
    saveSettings,
    resetSettings
  };
})();
