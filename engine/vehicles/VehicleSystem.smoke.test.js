const fs = require('fs');
const vm = require('vm');
const path = require('path');
const root = path.resolve(__dirname, '..', '..');
const context = { console, Map, Set, Number, Array, Object, Error, TypeError, Math };
context.window = context;
vm.createContext(context);
[
  'engine/ecs/Entity.js',
  'engine/ecs/Component.js',
  'engine/ecs/System.js',
  'engine/ecs/ECSWorld.js',
  'engine/vehicles/VehicleSystem.js',
  'engine/vehicles/VehicleFactory.js'
].forEach((file) => vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, { filename: file }));

const ns = context.CiudadEngine;
const world = new ns.ECSWorld();
const system = new ns.VehicleSystem();
world.addSystem(system);
const factory = new ns.VehicleFactory(world);
const object3D = { position: { x: 0, y: 0, z: 0 }, rotation: { y: 0 } };
const car = factory.createVehicle({ name: 'Test car', object3D, maxSpeed: 30, acceleration: 20, brakeForce: 40 });

factory.setControls(car, { throttle: 1 });
for (let i = 0; i < 60; i++) world.update(1 / 60, (i + 1) / 60);
const vehicle = factory.getVehicle(car);
const transform = factory.getTransform(car);
if (!(vehicle.speed > 10 && vehicle.speed <= 30)) throw new Error('Acceleration or speed limit failed');
if (!(transform.z > 0 && object3D.position.z === transform.z)) throw new Error('Transform / 3D visual synchronization failed');

factory.setControls(car, { throttle: 0, brake: 1, steer: 0 });
for (let i = 0; i < 60; i++) world.update(1 / 60, 1 + (i + 1) / 60);
if (vehicle.speed !== 0) throw new Error('Braking failed');

factory.setControls(car, { throttle: 1, steer: 1, brake: 0 });
for (let i = 0; i < 30; i++) world.update(1 / 60, 2 + (i + 1) / 60);
if (!(transform.rotationY > 0)) throw new Error('Steering failed');

factory.setControls(car, { throttle: -1, steer: 0, brake: 0 });
for (let i = 0; i < 90; i++) world.update(1 / 60, 3 + (i + 1) / 60);
if (!(vehicle.speed < 0)) throw new Error('Reverse acceleration failed');

vehicle.enabled = false;
const frozenX = transform.x;
world.update(0.1, 4);
if (transform.x !== frozenX) throw new Error('Disabled vehicle should not move');
if (system.lastStats.vehicles !== 1) throw new Error('Vehicle diagnostics failed');
if (!factory.destroyVehicle(car) || world.getEntityCount() !== 0) throw new Error('Vehicle destruction failed');

const driftCar = factory.createVehicle({ physicsMode: 'advanced', maxSpeed: 36, acceleration: 22, lateralGrip: 8.5, handbrakeGrip: 0.8 });
factory.setControls(driftCar, { throttle: 1 });
for (let i = 0; i < 60; i++) world.update(1 / 60, 5 + (i + 1) / 60);
factory.setControls(driftCar, { throttle: 0.35, steer: 1, handbrake: 1 });
for (let i = 0; i < 45; i++) world.update(1 / 60, 6 + (i + 1) / 60);
const driftVehicle = factory.getVehicle(driftCar);
const driftTransform = factory.getTransform(driftCar);
if (Math.abs(driftVehicle.lateralSpeed) < 0.8 || !driftVehicle.drifting) throw new Error('Advanced handbrake drift failed');
if (Math.abs(driftVehicle.velocityX) + Math.abs(driftVehicle.velocityZ) < 1) throw new Error('Advanced world velocity failed');
if (Math.abs(driftTransform.rotationY) < 0.1) throw new Error('Advanced steering response failed');
if (system.lastStats.drifting !== 1) throw new Error('Drift diagnostics failed');
factory.setControls(driftCar, { throttle: 0, steer: 0, handbrake: 0 });
for (let i = 0; i < 180; i++) world.update(1 / 60, 7 + (i + 1) / 60);
if (Math.abs(driftVehicle.lateralSpeed) > 0.8) throw new Error('Lateral grip recovery failed');
if (!factory.destroyVehicle(driftCar)) throw new Error('Advanced vehicle destruction failed');
console.log('VehicleSystem smoke test: PASS');
