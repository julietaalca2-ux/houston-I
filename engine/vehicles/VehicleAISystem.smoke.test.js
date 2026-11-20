const fs = require('fs');
const vm = require('vm');
const path = require('path');
const root = path.resolve(__dirname, '..', '..');
const context = { console, Map, Set, Number, Array, Object, Error, TypeError, Math };
context.window = context;
vm.createContext(context);
[
  'engine/ecs/Entity.js', 'engine/ecs/Component.js', 'engine/ecs/System.js', 'engine/ecs/ECSWorld.js',
  'engine/vehicles/VehicleAISystem.js', 'engine/vehicles/VehicleSystem.js', 'engine/vehicles/VehicleFactory.js'
].forEach((file) => vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, { filename: file }));
const ns = context.CiudadEngine;
const world = new ns.ECSWorld();
const aiSystem = new ns.VehicleAISystem();
const driveSystem = new ns.VehicleSystem();
world.addSystem(aiSystem);
world.addSystem(driveSystem);
const factory = new ns.VehicleFactory(world);
const car = factory.createVehicle({ maxSpeed: 24, acceleration: 14, ai: { route: [{ x: 0, z: 30 }, { x: 20, z: 30 }], targetSpeed: 14, loop: false } });
for (let i = 0; i < 120; i++) world.update(1 / 60, i / 60);
const vehicle = factory.getVehicle(car);
const transform = factory.getTransform(car);
const ai = world.getComponent(car, 'VehicleAI');
if (!(transform.z > 5 && vehicle.speed > 0)) throw new Error('AI route following / throttle failed');
if (ai.state !== 'following' && ai.state !== 'avoiding') throw new Error('AI state reporting failed');
const obstacle = factory.createVehicle({ x: transform.x, z: transform.z + 7, enabled: true });
world.update(1 / 60, 3);
if (ai.state !== 'avoiding' || vehicle.controls.brake <= 0 && Math.abs(vehicle.controls.steer) < 0.1) throw new Error('Vehicle obstacle avoidance failed');
if (aiSystem.lastStats.controlled !== 1 || aiSystem.lastStats.avoiding !== 1) throw new Error('AI diagnostics failed');
if (!factory.setRoute(car, [{ x: 12, z: 12 }], { loop: false })) throw new Error('Route replacement failed');
if (!factory.disableAI(car) || world.getComponent(car, 'VehicleAI').enabled) throw new Error('AI disable failed');
console.log('VehicleAISystem smoke test: PASS');
