const fs = require('fs');
const vm = require('vm');
const path = require('path');
const root = path.resolve(__dirname, '..', '..');
const context = { console, Map, Set, Number, Array, Object, Error, TypeError, Math, Promise };
context.window = context;
vm.createContext(context);
[
  'engine/core/EventBus.js',
  'engine/core/SceneManager.js',
  'engine/core/ResourceRegistry.js',
  'engine/assets/AssetManager.js',
  'engine/ecs/Entity.js',
  'engine/ecs/Component.js',
  'engine/ecs/System.js',
  'engine/ecs/ECSWorld.js',
  'engine/physics/PhysicsSystem.js',
  'engine/physics/PhysicsFactory.js',
  'engine/characters/CharacterTransformSystem.js',
  'engine/characters/CharacterSystem.js',
  'engine/characters/CharacterManager.js',
  'engine/rendering/RenderingPipeline.js',
  'engine/vehicles/VehicleAISystem.js',
  'engine/vehicles/VehicleSystem.js',
  'engine/vehicles/VehicleFactory.js',
  'engine/world/WorldBoundsSystem.js',
  'engine/world/SceneSyncSystem.js',
  'engine/world/WorldBridge.js',
  'engine/core/Engine.js'
].forEach((file) => vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, { filename: file }));

const engine = context.CiudadEngine.runtime;
if (engine.version !== '0.14.0' || !engine.vehicleSystem || !engine.vehicles) throw new Error('Engine vehicle module registration failed');
engine.start('test');
const car = engine.vehicles.createVehicle({ maxSpeed: 20, physicsMode: 'advanced' });
engine.vehicles.setControls(car, { throttle: 1 });
engine.update(0.1);
const diagnostics = engine.getDiagnostics();
if (diagnostics.vehicleCount !== 1 || diagnostics.vehicles.moving !== 1 || !diagnostics.vehicleAI || !diagnostics.world) throw new Error('Engine vehicle diagnostics/update failed');
engine.vehicles.destroyVehicle(car);
if (engine.getDiagnostics().vehicleCount !== 0) throw new Error('Engine vehicle cleanup failed');
console.log('Engine Vehicle integration smoke test: PASS');
