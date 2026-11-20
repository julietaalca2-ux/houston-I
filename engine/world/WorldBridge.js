(function (global) {
  'use strict';
  const namespace = global.CiudadEngine = global.CiudadEngine || {};

  class WorldBridge {
    constructor(engine) {
      if (!engine || !engine.world) throw new TypeError('WorldBridge requires an Engine instance');
      this.engine = engine;
      this.world = engine.world;
      this.sceneSync = engine.sceneSyncSystem;
      this.boundScene = null;
      this.bindings = new Map();
      if (engine.events) {
        engine.events.on('ecs:entity-removed', ({ entity }) => this.bindings.delete(entity.id));
        engine.events.on('ecs:component-removed', ({ entity, type }) => { if (type === 'SceneObject') this.bindings.delete(entity.id); });
      }
    }
    attachScene(scene) {
      this.boundScene = scene || null;
      this.sceneSync.setScene(this.boundScene);
      return this;
    }
    bindObject(entity, object3D, options) {
      if (!this.world.resolveEntity(entity)) throw new Error('Cannot bind an Object3D to an unknown entity');
      if (!object3D) throw new TypeError('A Three.js Object3D is required');
      const config = options || {};
      this.world.addComponent(entity, 'SceneObject', { object3D, scale: config.scale || null, visible: config.visible !== false });
      if (config.bounds) this.setBounds(entity, config.bounds);
      object3D.visible = config.visible !== false;
      this.bindings.set(entity.id || Number(entity), object3D);
      return entity;
    }
    unbindObject(entity, removeComponent) {
      const resolved = this.world.resolveEntity(entity);
      if (!resolved) return false;
      const binding = this.world.getComponent(resolved, 'SceneObject');
      if (binding && binding.object3D && binding.object3D.parent && typeof binding.object3D.parent.remove === 'function') binding.object3D.parent.remove(binding.object3D);
      if (removeComponent !== false) this.world.removeComponent(resolved, 'SceneObject');
      this.bindings.delete(resolved.id);
      return Boolean(binding);
    }
    setBounds(entity, bounds) {
      if (!this.world.resolveEntity(entity)) throw new Error('Cannot set bounds on an unknown entity');
      const b = bounds || {};
      return this.world.addComponent(entity, 'WorldBounds', {
        minX: Number.isFinite(b.minX) ? b.minX : -Infinity,
        maxX: Number.isFinite(b.maxX) ? b.maxX : Infinity,
        minZ: Number.isFinite(b.minZ) ? b.minZ : -Infinity,
        maxZ: Number.isFinite(b.maxZ) ? b.maxZ : Infinity,
        mode: b.mode === 'clamp' ? 'clamp' : 'notify'
      });
    }
    createEntity(options) {
      const config = options || {};
      const entity = this.world.createEntity(config.name || 'WorldEntity');
      this.world.addComponent(entity, 'Transform', {
        x: Number.isFinite(config.x) ? config.x : 0,
        y: Number.isFinite(config.y) ? config.y : 0,
        z: Number.isFinite(config.z) ? config.z : 0,
        rotationX: Number.isFinite(config.rotationX) ? config.rotationX : 0,
        rotationY: Number.isFinite(config.rotationY) ? config.rotationY : 0,
        rotationZ: Number.isFinite(config.rotationZ) ? config.rotationZ : 0
      });
      if (config.bounds) this.setBounds(entity, config.bounds);
      if (config.object3D) this.bindObject(entity, config.object3D, config);
      return entity;
    }
    removeEntity(entity) {
      const resolved = this.world.resolveEntity(entity);
      if (!resolved) return false;
      this.unbindObject(resolved);
      return this.world.removeEntity(resolved);
    }
    getDiagnostics() {
      return { boundScene: Boolean(this.boundScene), boundObjects: this.bindings.size,
        sceneSync: Object.assign({}, this.sceneSync.lastStats),
        bounds: Object.assign({}, this.engine.worldBoundsSystem.lastStats) };
    }
  }
  namespace.WorldBridge = WorldBridge;
})(window);
