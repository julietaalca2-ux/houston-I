(function (global) {
  'use strict';
  const namespace = global.CiudadEngine = global.CiudadEngine || {};
  class Entity {
    constructor(id, name) {
      this.id = id;
      this.name = name || 'Entity-' + id;
      this.active = true;
      this.destroyed = false;
    }
  }
  namespace.Entity = Entity;
})(window);
