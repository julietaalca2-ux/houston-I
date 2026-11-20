(function (global) {
  'use strict';
  const namespace = global.CiudadEngine = global.CiudadEngine || {};
  class Component {
    constructor(data) {
      if (data && typeof data === 'object') Object.assign(this, data);
    }
  }
  namespace.Component = Component;
})(window);
