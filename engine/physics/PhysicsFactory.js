(function (global) {
  'use strict';
  const namespace = global.CiudadEngine = global.CiudadEngine || {};
  class PhysicsFactory {
    constructor(world) { if (!world) throw new TypeError('PhysicsFactory requires an ECSWorld'); this.world = world; }
    createBody(options) {
      const config = options || {};
      const entity = this.world.createEntity(config.name || 'PhysicsBody');
      this.world.addComponent(entity, 'Transform', { x: config.x || 0, y: config.y || 0, z: config.z || 0, rotationY: config.rotationY || 0 });
      this.world.addComponent(entity, 'Collider', { halfExtents: config.halfExtents || { x: 0.5, y: 0.5, z: 0.5 }, isTrigger: config.isTrigger === true });
      this.world.addComponent(entity, 'RigidBody', { velocity: config.velocity || { x: 0, y: 0, z: 0 }, gravityScale: config.gravityScale ?? 1, useGravity: config.useGravity !== false, kinematic: config.kinematic === true, grounded: false });
      return entity;
    }
    createStaticBox(options) {
      const config = options || {};
      const entity = this.world.createEntity(config.name || 'StaticCollider');
      this.world.addComponent(entity, 'Transform', { x: config.x || 0, y: config.y || 0, z: config.z || 0 });
      this.world.addComponent(entity, 'Collider', { halfExtents: config.halfExtents || { x: 1, y: 1, z: 1 }, isTrigger: config.isTrigger === true });
      return entity;
    }
  }
  namespace.PhysicsFactory = PhysicsFactory;
})(window);
