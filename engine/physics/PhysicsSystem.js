(function (global) {
  'use strict';
  const namespace = global.CiudadEngine = global.CiudadEngine || {};
  class PhysicsSystem extends namespace.System {
    constructor(options) {
      super({ name: 'PhysicsSystem', priority: (options && options.priority) ?? 0 });
      const config = options || {};
      this.gravity = Number.isFinite(config.gravity) ? config.gravity : -9.81;
      this.groundY = Number.isFinite(config.groundY) ? config.groundY : 0;
      this.maxSubstep = Number.isFinite(config.maxSubstep) ? Math.max(1 / 240, config.maxSubstep) : 1 / 60;
      this.lastStats = { bodies: 0, contacts: 0, grounded: 0 };
    }
    update(world, delta) {
      if (!(delta > 0)) return;
      const steps = Math.max(1, Math.ceil(delta / this.maxSubstep));
      const dt = delta / steps;
      let contacts = 0;
      const bodies = world.query('Transform', 'RigidBody', 'Collider');
      const statics = world.query('Transform', 'Collider').filter((entity) => !world.hasComponent(entity, 'RigidBody'));
      for (const entity of bodies) {
        const transform = world.getComponent(entity, 'Transform');
        const body = world.getComponent(entity, 'RigidBody');
        const collider = world.getComponent(entity, 'Collider');
        this._prepare(body);
        body.grounded = false;
        for (let step = 0; step < steps; step++) {
          if (body.useGravity !== false && body.kinematic !== true) body.velocity.y += this.gravity * body.gravityScale * dt;
          if (body.kinematic !== true) {
            transform.x += body.velocity.x * dt;
            transform.y += body.velocity.y * dt;
            transform.z += body.velocity.z * dt;
          }
          const half = this._half(collider);
          if (transform.y - half.y < this.groundY) {
            transform.y = this.groundY + half.y;
            if (body.velocity.y < 0) body.velocity.y = 0;
            body.grounded = true;
            contacts++;
          }
          for (const obstacle of statics) {
            const obstacleTransform = world.getComponent(obstacle, 'Transform');
            const obstacleCollider = world.getComponent(obstacle, 'Collider');
            if (!this._overlap(transform, half, obstacleTransform, this._half(obstacleCollider))) continue;
            const otherHalf = this._half(obstacleCollider);
            const dx = transform.x - obstacleTransform.x;
            const dy = transform.y - obstacleTransform.y;
            const dz = transform.z - obstacleTransform.z;
            const px = half.x + otherHalf.x - Math.abs(dx);
            const py = half.y + otherHalf.y - Math.abs(dy);
            const pz = half.z + otherHalf.z - Math.abs(dz);
            if (px <= py && px <= pz) {
              transform.x += (dx < 0 ? -1 : 1) * px;
              body.velocity.x = 0;
            } else if (py <= pz) {
              transform.y += (dy < 0 ? -1 : 1) * py;
              if (dy > 0) body.grounded = true;
              body.velocity.y = 0;
            } else {
              transform.z += (dz < 0 ? -1 : 1) * pz;
              body.velocity.z = 0;
            }
            contacts++;
          }
        }
      }
      this.lastStats = { bodies: bodies.length, contacts, grounded: bodies.filter((entity) => world.getComponent(entity, 'RigidBody').grounded).length };
    }
    _prepare(body) {
      body.velocity = body.velocity || { x: 0, y: 0, z: 0 };
      body.gravityScale = Number.isFinite(body.gravityScale) ? body.gravityScale : 1;
      ['x', 'y', 'z'].forEach((axis) => { if (!Number.isFinite(body.velocity[axis])) body.velocity[axis] = 0; });
    }
    _half(collider) {
      const value = collider.halfExtents || collider.size || { x: 0.5, y: 0.5, z: 0.5 };
      return { x: Math.max(0, Number(value.x) || 0), y: Math.max(0, Number(value.y) || 0), z: Math.max(0, Number(value.z) || 0) };
    }
    _overlap(a, ah, b, bh) {
      return Math.abs(a.x - b.x) < ah.x + bh.x && Math.abs(a.y - b.y) < ah.y + bh.y && Math.abs(a.z - b.z) < ah.z + bh.z;
    }
  }
  namespace.PhysicsSystem = PhysicsSystem;
})(window);
