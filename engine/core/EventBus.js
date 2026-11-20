(function (global) {
  'use strict';
  const namespace = global.CiudadEngine = global.CiudadEngine || {};
  class EventBus {
    constructor() { this.listeners = new Map(); }
    on(type, callback) {
      if (typeof callback !== 'function') throw new TypeError('Event callback must be a function');
      if (!this.listeners.has(type)) this.listeners.set(type, new Set());
      this.listeners.get(type).add(callback);
      return () => this.off(type, callback);
    }
    once(type, callback) {
      const unsubscribe = this.on(type, (payload) => { unsubscribe(); callback(payload); });
      return unsubscribe;
    }
    off(type, callback) {
      const group = this.listeners.get(type);
      if (!group) return false;
      const removed = group.delete(callback);
      if (!group.size) this.listeners.delete(type);
      return removed;
    }
    emit(type, payload) {
      const group = this.listeners.get(type);
      if (!group) return;
      Array.from(group).forEach((callback) => {
        try { callback(payload); }
        catch (error) { console.error('[CIUDAD ENGINE] Event listener error:', type, error); }
      });
    }
    clear() { this.listeners.clear(); }
  }
  namespace.EventBus = EventBus;
})(window);
