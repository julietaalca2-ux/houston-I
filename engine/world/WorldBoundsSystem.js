(function (global) {
  'use strict';
  const namespace = global.CiudadEngine = global.CiudadEngine || {};

  class WorldBoundsSystem extends namespace.System {
    constructor(options) {
      const config = options || {};
      super({ name: 'WorldBoundsSystem', priority: Number.isFinite(config.priority) ? config.priority : 80, enabled: config.enabled !== false });
      this.lastStats = { checked: 0, outside: 0, clamped: 0 };
      this._outside = new Set();
    }
    update(world) {
      let outside = 0, clamped = 0;
      const seen = new Set();
      const entities = world.query('Transform', 'WorldBounds');
      for (const entity of entities) {
        const t = world.getComponent(entity, 'Transform');
        const bounds = world.getComponent(entity, 'WorldBounds');
        const minX = Number.isFinite(bounds.minX) ? bounds.minX : -Infinity;
        const maxX = Number.isFinite(bounds.maxX) ? bounds.maxX : Infinity;
        const minZ = Number.isFinite(bounds.minZ) ? bounds.minZ : -Infinity;
        const maxZ = Number.isFinite(bounds.maxZ) ? bounds.maxZ : Infinity;
        const wasOutside = this._outside.has(entity.id);
        const isOutside = t.x < minX || t.x > maxX || t.z < minZ || t.z > maxZ;
        if (isOutside) {
          outside++; seen.add(entity.id);
          if (bounds.mode === 'clamp') {
            t.x = Math.max(minX, Math.min(maxX, t.x));
            t.z = Math.max(minZ, Math.min(maxZ, t.z));
            const body = world.getComponent(entity, 'RigidBody');
            if (body && body.velocity) {
              if (t.x === minX || t.x === maxX) body.velocity.x = 0;
              if (t.z === minZ || t.z === maxZ) body.velocity.z = 0;
            }
            clamped++;
          }
          if (!wasOutside && world.events) world.events.emit('world:entity-out-of-bounds', { entity, transform: t, bounds });
        } else if (wasOutside && world.events) {
          world.events.emit('world:entity-in-bounds', { entity, transform: t, bounds });
        }
      }
      this._outside = seen;
      this.lastStats = { checked: entities.length, outside, clamped };
    }
  }
  namespace.WorldBoundsSystem = WorldBoundsSystem;
})(window);
