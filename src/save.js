window.CiudadCero = window.CiudadCero || {};

CiudadCero.Save = (() => {
  const STORAGE_KEY = 'ciudad_cero_v04_save';

  function hasSave() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      return Boolean(raw && raw.length > 2);
    } catch (_) {
      return false;
    }
  }

  function load() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (!data || typeof data !== 'object' || data.version !== '0.4') {
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
          version: '0.4',
          savedAt: Date.now()
        },
        payload
      );
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
      return true;
    } catch (_) {
      return false;
    }
  }

  function clear() {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
      return true;
    } catch (_) {
      return false;
    }
  }

  return {
    STORAGE_KEY,
    hasSave,
    load,
    save,
    clear
  };
})();
