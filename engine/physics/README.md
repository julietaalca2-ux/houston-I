# CIUDAD ENGINE — Physics System (V0.5.0)

The physics layer is an ECS system, independent from the game's existing `src/physics.js`.

## Components
- `Transform`: world position (`x`, `y`, `z`).
- `RigidBody`: `velocity`, `gravityScale`, `useGravity`, `kinematic`, and runtime `grounded`.
- `Collider`: axis-aligned box using `halfExtents` (half-size on each axis).

## Usage
```js
const body = engine.physics.createBody({
  name: 'NPC', x: 0, y: 1, z: 0,
  halfExtents: { x: 0.35, y: 0.9, z: 0.35 }
});
engine.physics.createStaticBox({
  name: 'Building', x: 4, y: 2, z: 0,
  halfExtents: { x: 2, y: 2, z: 2 }
});
```

The engine installs PhysicsSystem automatically before the character transform sync system. Ground is a configurable horizontal plane (default Y=0). Static colliders are entities with Transform + Collider and no RigidBody.

## Scope and limitations
This first version uses axis-aligned boxes, a flat ground plane, gravity and basic positional resolution. It does not yet provide rotated collision shapes, vehicle suspension, friction, continuous collision detection, slopes, terrain, ragdoll, or a full rigid-body solver. Trigger colliders are metadata only in this release. The game's existing physics remains unchanged until an explicit migration.

Run `node engine/physics/PhysicsSystem.smoke.test.js` for the isolated smoke test.
