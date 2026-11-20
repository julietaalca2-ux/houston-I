(function (global) {
  'use strict';
  const namespace = global.CiudadEngine = global.CiudadEngine || {};

  function componentKey(type) {
    if (typeof type === 'string' && type) return type;
    if (typeof type === 'function' && type.name) return type.name;
    throw new TypeError('Component type must be a non-empty name or class');
  }

  class ECSWorld {
    constructor(events) {
      this.events = events || null;
      this.nextEntityId = 1;
      this.entities = new Map();
      this.components = new Map();
      this.systems = [];
      this.systemOrder = 0;
    }
    createEntity(name) {
      const entity = new namespace.Entity(this.nextEntityId++, name);
      this.entities.set(entity.id, entity);
      if (this.events) this.events.emit('ecs:entity-created', { entity });
      return entity;
    }
    getEntity(id) { return this.entities.get(Number(id)) || null; }
    addComponent(entityOrId, type, value) {
      const entity = this.resolveEntity(entityOrId);
      const key = componentKey(type);
      if (!entity || entity.destroyed) throw new Error('Cannot add a component to an unknown entity');
      const component = value !== undefined ? value : (typeof type === 'function' ? new type() : {});
      if (!this.components.has(key)) this.components.set(key, new Map());
      this.components.get(key).set(entity.id, component);
      if (this.events) this.events.emit('ecs:component-added', { entity, type: key, component });
      return component;
    }
    getComponent(entityOrId, type) {
      const entity = this.resolveEntity(entityOrId);
      if (!entity) return null;
      const store = this.components.get(componentKey(type));
      return store ? (store.get(entity.id) || null) : null;
    }
    hasComponent(entityOrId, type) { return this.getComponent(entityOrId, type) !== null; }
    removeComponent(entityOrId, type) {
      const entity = this.resolveEntity(entityOrId);
      if (!entity) return false;
      const key = componentKey(type);
      const store = this.components.get(key);
      if (!store) return false;
      const removed = store.delete(entity.id);
      if (!store.size) this.components.delete(key);
      if (removed && this.events) this.events.emit('ecs:component-removed', { entity, type: key });
      return removed;
    }
    removeEntity(entityOrId) {
      const entity = this.resolveEntity(entityOrId);
      if (!entity) return false;
      for (const [key, store] of this.components) {
        if (store.delete(entity.id) && this.events) this.events.emit('ecs:component-removed', { entity, type: key });
        if (!store.size) this.components.delete(key);
      }
      entity.active = false;
      entity.destroyed = true;
      this.entities.delete(entity.id);
      if (this.events) this.events.emit('ecs:entity-removed', { entity });
      return true;
    }
    addSystem(system) {
      if (!system || typeof system.update !== 'function') throw new TypeError('System must provide update(world, delta)');
      if (this.systems.some((entry) => entry.system === system)) return system;
      system.world = this;
      this.systems.push({ system, order: this.systemOrder++ });
      this.systems.sort((a, b) => a.system.priority - b.system.priority || a.order - b.order);
      if (this.events) this.events.emit('ecs:system-added', { system });
      return system;
    }
    removeSystem(system) {
      const index = this.systems.findIndex((entry) => entry.system === system);
      if (index < 0) return false;
      this.systems[index].system.world = null;
      this.systems.splice(index, 1);
      if (this.events) this.events.emit('ecs:system-removed', { system });
      return true;
    }
    query() {
      const types = Array.from(arguments).map(componentKey);
      if (!types.length) return Array.from(this.entities.values()).filter((entity) => entity.active && !entity.destroyed);
      const stores = types.map((type) => this.components.get(type));
      if (stores.some((store) => !store)) return [];
      const smallest = stores.reduce((a, b) => a.size <= b.size ? a : b);
      const result = [];
      for (const id of smallest.keys()) {
        if (stores.every((store) => store.has(id))) {
          const entity = this.entities.get(id);
          if (entity && entity.active && !entity.destroyed) result.push(entity);
        }
      }
      return result;
    }
    update(deltaSeconds, elapsedSeconds) {
      const delta = Number.isFinite(deltaSeconds) ? Math.max(0, Math.min(deltaSeconds, 0.1)) : 0;
      const snapshot = this.systems.slice();
      for (const entry of snapshot) {
        const system = entry.system;
        if (system.enabled && this.systems.some((current) => current.system === system)) {
          system.update(this, delta, Number.isFinite(elapsedSeconds) ? elapsedSeconds : 0);
        }
      }
    }
    resolveEntity(entityOrId) {
      if (entityOrId && typeof entityOrId === 'object' && Number.isFinite(entityOrId.id)) return this.entities.get(entityOrId.id) || null;
      return this.getEntity(entityOrId);
    }
    clear() {
      for (const entry of this.systems) entry.system.world = null;
      this.systems.length = 0;
      for (const entity of this.entities.values()) { entity.active = false; entity.destroyed = true; }
      this.entities.clear();
      this.components.clear();
    }
    getEntityCount() { return this.entities.size; }
    getSystemCount() { return this.systems.length; }
    getComponentCount() {
      let count = 0;
      for (const store of this.components.values()) count += store.size;
      return count;
    }
  }
  namespace.ECSWorld = ECSWorld;
})(window);
