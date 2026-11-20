(function (global) {
  'use strict';
  const namespace = global.CiudadEngine = global.CiudadEngine || {};
  class CharacterTransformSystem extends namespace.System {
    constructor() { super({ name: 'CharacterTransformSystem', priority: 10 }); }
    update(world) {
      for (const entity of world.query('Transform', 'CharacterVisual')) {
        const transform = world.getComponent(entity, 'Transform');
        const visual = world.getComponent(entity, 'CharacterVisual');
        const object = visual && visual.object;
        if (!object) continue;
        if (Number.isFinite(transform.x)) object.position.x = transform.x;
        if (Number.isFinite(transform.y)) object.position.y = transform.y;
        if (Number.isFinite(transform.z)) object.position.z = transform.z;
        if (Number.isFinite(transform.rotationY)) object.rotation.y = transform.rotationY;
      }
    }
  }
  namespace.CharacterTransformSystem = CharacterTransformSystem;
})(window);
