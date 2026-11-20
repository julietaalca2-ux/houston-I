const fs = require('fs');
const vm = require('vm');
const path = require('path');
const root = path.resolve(__dirname, '..', '..');
const context = { console, Map, Set, Number, Array, Object, Error, TypeError, Math, Promise };
context.window = context;
vm.createContext(context);
[
  'engine/core/EventBus.js', 'engine/core/SceneManager.js', 'engine/core/ResourceRegistry.js',
  'engine/assets/AssetManager.js', 'engine/ecs/Entity.js', 'engine/ecs/Component.js',
  'engine/ecs/System.js', 'engine/ecs/ECSWorld.js', 'engine/physics/PhysicsSystem.js',
  'engine/physics/PhysicsFactory.js', 'engine/characters/CharacterTransformSystem.js',
  'engine/characters/CharacterSystem.js', 'engine/characters/CharacterManager.js',
  'engine/rendering/RenderingPipeline.js', 'engine/vehicles/VehicleAISystem.js',
  'engine/vehicles/VehicleSystem.js', 'engine/vehicles/VehicleFactory.js',
  'engine/world/WorldBoundsSystem.js', 'engine/world/SceneSyncSystem.js',
  'engine/world/WorldBridge.js', 'engine/core/Engine.js'
].forEach(file => vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, { filename: file }));
const engine = context.CiudadEngine.runtime;
const scene = {
  children: [],
  add(object) { if (object.parent && object.parent.remove) object.parent.remove(object); this.children.push(object); object.parent = this; },
  remove(object) { this.children = this.children.filter(item => item !== object); object.parent = null; }
};
const object = {
  parent: null, visible: true,
  position: { set(x, y, z) { Object.assign(this, { x, y, z }); } },
  rotation: {}, scale: { set(x, y, z) { Object.assign(this, { x, y, z }); } }
};
engine.worldBridge.attachScene(scene);
const entity = engine.worldBridge.createEntity({ name: 'TestWorldObject', x: 3, y: 2, z: 4, rotationY: 1.2, object3D: object,
  bounds: { minX: -5, maxX: 5, minZ: -5, maxZ: 5, mode: 'clamp' } });
engine.start('test');
engine.update(1 / 60);
if (scene.children.length !== 1 || object.position.x !== 3 || object.position.y !== 2 || object.position.z !== 4) throw new Error('Object3D scene/transform sync failed');
const transform = engine.world.getComponent(entity, 'Transform');
transform.x = 9;
engine.update(1 / 60);
if (transform.x !== 5 || object.position.x !== 5) throw new Error('World bounds clamp/sync failed');
if (engine.getDiagnostics().world.boundObjects !== 1) throw new Error('World bridge diagnostics failed');
engine.worldBridge.removeEntity(entity);
engine.update(1 / 60);
if (scene.children.length !== 0 || engine.getDiagnostics().world.boundObjects !== 0) throw new Error('World object cleanup failed');
console.log('World Bridge smoke test: PASS');
