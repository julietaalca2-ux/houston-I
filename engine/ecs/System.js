(function (global) {
  'use strict';
  const namespace = global.CiudadEngine = global.CiudadEngine || {};
  class System {
    constructor(options) {
      const config = options || {};
      this.name = config.name || this.constructor.name || 'System';
      this.priority = Number.isFinite(config.priority) ? config.priority : 0;
      this.enabled = config.enabled !== false;
      this.world = null;
    }
    update() {}
  }
  namespace.System = System;
})(window);
