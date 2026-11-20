const fs = require('fs');
const vm = require('vm');
const context = { console, Map, Set, Number, Array, Object, Error, TypeError };
context.window = context;
vm.createContext(context);
for (const file of ['engine/ecs/Entity.js', 'engine/ecs/Component.js', 'engine/ecs/System.js', 'engine/ecs/ECSWorld.js']) {
  vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename: file });
}
const { ECSWorld, System } = context.CiudadEngine;
const world = new ECSWorld();
const player = world.createEntity('Protagonista');
world.addComponent(player, 'Transform', { x: 0 });
world.addComponent(player, 'Health', { current: 80 });
if (world.query('Transform', 'Health').length !== 1) throw new Error('multi-component query failed');
const order = [];
class LateSystem extends System { constructor() { super({ priority: 20 }); } update() { order.push('late'); } }
class EarlySystem extends System { constructor() { super({ priority: 5 }); } update() { order.push('early'); } }
world.addSystem(new LateSystem()); world.addSystem(new EarlySystem());
world.update(0.016, 0.016);
if (order.join(',') !== 'early,late') throw new Error('system priority order failed');
if (!world.removeComponent(player, 'Health') || world.query('Health').length !== 0) throw new Error('component removal failed');
if (!world.removeEntity(player) || world.getEntityCount() !== 0) throw new Error('entity removal failed');
console.log('ECSWorld smoke test: PASS');
