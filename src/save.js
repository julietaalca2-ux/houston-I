window.CiudadCero = window.CiudadCero || {};

CiudadCero.Save = (() => {
  const STORAGE_KEY = 'ciudad_cero_v07_save';
  const LEGACY_KEY_V06 = 'ciudad_cero_v06_save';
  const LEGACY_KEY_V05 = 'ciudad_cero_v05_save';
  const LEGACY_KEY_V04 = 'ciudad_cero_v04_save';
  const SETTINGS_KEY = 'ciudad_cero_settings_v07';
  const LEGACY_SETTINGS_V06 = 'ciudad_cero_settings_v06';
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
      showTrafficLightsOnMap: true,
      quality: 'high',
      autoSave: true
    }
  };

  function cloneDefaults() {
    return JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
  }

  function hasSave() {
    try {
      const keys = [STORAGE_KEY, LEGACY_KEY_V06, LEGACY_KEY_V05, LEGACY_KEY_V04];
      for (let i = 0; i < keys.length; i++) {
        const raw = window.localStorage.getItem(keys[i]);
        if (raw && raw.length > 2) return true;
      }
      return false;
    } catch (_) {
      return false;
    }
  }

  function load() {
    try {
      const keys = [STORAGE_KEY, LEGACY_KEY_V06, LEGACY_KEY_V05, LEGACY_KEY_V04];
      let raw = null;
      for (let i = 0; i < keys.length; i++) {
        raw = window.localStorage.getItem(keys[i]);
        if (raw) break;
      }
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (!data || typeof data !== 'object') return null;
      if (!['0.7.9', '0.7.5', '0.7', '0.6', '0.5', '0.4'].includes(data.version)) {
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
          version: '0.7.9',
          savedAt: Date.now()
        },
        payload
      );
      const serialized = JSON.stringify(record);
      window.localStorage.setItem(STORAGE_KEY, serialized);
      // Maintain compatibility keys for v0.6 & v0.5 continuity
      window.localStorage.setItem(
        LEGACY_KEY_V06,
        JSON.stringify(Object.assign({}, record, { version: '0.6' }))
      );
      window.localStorage.setItem(
        LEGACY_KEY_V05,
        JSON.stringify(Object.assign({}, record, { version: '0.5' }))
      );
      return true;
    } catch (_) {
      return false;
    }
  }

  function clear() {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
      window.localStorage.removeItem(LEGACY_KEY_V06);
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
      const keys = [SETTINGS_KEY, LEGACY_SETTINGS_V06, LEGACY_SETTINGS_V05];
      let raw = null;
      for (let i = 0; i < keys.length; i++) {
        raw = window.localStorage.getItem(keys[i]);
        if (raw) break;
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
    LEGACY_KEY_V06,
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
