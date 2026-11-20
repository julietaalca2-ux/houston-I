(function (global) {
  'use strict';
  const namespace = global.CiudadEngine = global.CiudadEngine || {};
  class SceneSyncSystem extends namespace.System {
    constructor(options) {
      const config = options || {};
      super({ name: 'SceneSyncSystem', priority: Number.isFinite(config.priority) ? config.priority : 100, enabled: config.enabled !== false });
      this.scene = config.scene || null;
      this.lastStats = { attached: 0, updated: 0, detached: 0 };
      this._attached = new Map();
    }
    setScene(scene) {
      if (this.scene === scene) return this;
      this._detachAll(); this.scene = scene || null; return this;
    }
    update(world) {
      const stats = { attached: 0, updated: 0, detached: 0 };
      if (!this.scene) { this.lastStats = stats; return; }
      const live = new Set();
      for (const entity of world.query('Transform', 'SceneObject')) {
        const transform = world.getComponent(entity, 'Transform');
        const binding = world.getComponent(entity, 'SceneObject');
        const object = binding && binding.object3D;
        if (!object) continue;
        live.add(entity.id);
        if (object.parent !== this.scene) {
          if (object.parent && typeof object.parent.remove === 'function') object.parent.remove(object);
          this.scene.add(object); stats.attached++;
        }
        this._attached.set(entity.id, object);
        object.visible = binding.visible !== false;
        this._applyTransform(object, transform, binding); stats.updated++;
      }
      for (const [id, object] of this._attached) if (!live.has(id)) {
        if (object.parent && typeof object.parent.remove === 'function') object.parent.remove(object);
        this._attached.delete(id); stats.detached++;
      }
      this.lastStats = stats;
    }
    _applyTransform(object, transform, binding) {
      const t = transform || {}, number = (v, fallback) => Number.isFinite(v) ? v : (fallback === undefined ? 0 : fallback);
      const p = object.position;
      if (p && typeof p.set === 'function') p.set(number(t.x), number(t.y), number(t.z));
      else if (p) Object.assign(p, { x: number(t.x), y: number(t.y), z: number(t.z) });
      if (object.rotation) Object.assign(object.rotation, { x: number(t.rotationX), y: number(t.rotationY), z: number(t.rotationZ) });
      const scale = t.scale || binding.scale;
      if (scale && object.scale) {
        if (typeof object.scale.set === 'function') object.scale.set(number(scale.x, 1), number(scale.y, 1), number(scale.z, 1));
        else Object.assign(object.scale, { x: number(scale.x, 1), y: number(scale.y, 1), z: number(scale.z, 1) });
      }
    }
    _detachAll() {
      for (const object of this._attached.values()) if (object.parent && typeof object.parent.remove === 'function') object.parent.remove(object);
      this._attached.clear();
    }
  }
  namespace.SceneSyncSystem = SceneSyncSystem;
})(window);
