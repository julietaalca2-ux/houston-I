(function (global) {
  'use strict';
  const namespace = global.CiudadEngine = global.CiudadEngine || {};
  function detect() {
    const ua = navigator.userAgent || '';
    const touch = ('ontouchstart' in global) || navigator.maxTouchPoints > 0;
    const mobile = /Android|iPhone|iPad|iPod/i.test(ua) || (touch && Math.min(global.innerWidth || 9999, global.innerHeight || 9999) < 900);
    return {
      runtime: 'browser',
      deviceClass: mobile ? 'mobile' : 'desktop',
      touch,
      webgl2: (() => {
        try {
          const canvas = document.createElement('canvas');
          return Boolean(canvas.getContext('webgl2'));
        } catch (_) { return false; }
      })(),
      webgpu: Boolean(navigator.gpu),
      nativeBridge: Boolean(global.CiudadNative)
    };
  }
  namespace.PlatformAdapter = { detect };
})(window);
