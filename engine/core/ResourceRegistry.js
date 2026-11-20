(function (global) {
  'use strict';
  const namespace = global.CiudadEngine = global.CiudadEngine || {};
  class ResourceRegistry {
    constructor(events) { this.events = events; this.resources = new Map(); }
    register(id, resource, metadata) {
      if (!id) throw new Error('Resource id is required');
      this.resources.set(String(id), { resource, metadata: metadata || {}, registeredAt: Date.now() });
      this.events.emit('resource:registered', { id: String(id), metadata: metadata || {} });
      return resource;
    }
    get(id) { const entry = this.resources.get(String(id)); return entry ? entry.resource : null; }
    getMetadata(id) { const entry = this.resources.get(String(id)); return entry ? entry.metadata : null; }
    has(id) { return this.resources.has(String(id)); }
    remove(id) {
      const removed = this.resources.delete(String(id));
      if (removed) this.events.emit('resource:removed', { id: String(id) });
      return removed;
    }
    clear() { this.resources.clear(); }
    getCount() { return this.resources.size; }
  }
  namespace.ResourceRegistry = ResourceRegistry;
})(window);
