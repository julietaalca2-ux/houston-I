# ECS — CIUDAD ENGINE 0.3.0

El ECS separa la identidad de una entidad, sus datos (componentes) y la lógica que procesa esos datos (sistemas).

## Ejemplo

```js
const world = CiudadEngine.runtime.world;
const player = world.createEntity('Protagonista');
world.addComponent(player, 'Transform', { x: 0, y: 0, z: 0 });
world.addComponent(player, 'Health', { current: 100, max: 100 });

class HealthSystem extends CiudadEngine.System {
  constructor() { super({ name: 'HealthSystem', priority: 10 }); }
  update(ecs) {
    for (const entity of ecs.query('Health')) {
      const health = ecs.getComponent(entity, 'Health');
      health.current = Math.max(0, Math.min(health.current, health.max));
    }
  }
}
world.addSystem(new HealthSystem());
```

## API
- `createEntity(name)` / `removeEntity(entity)` / `getEntity(id)`
- `addComponent(entity, type, value)` / `getComponent(entity, type)` / `hasComponent(entity, type)` / `removeComponent(entity, type)`
- `query(typeA, typeB, ...)`
- `addSystem(system)` / `removeSystem(system)`
- `update(deltaSeconds, elapsedSeconds)`

`type` puede ser un nombre de texto o una clase. Los sistemas se ejecutan por prioridad ascendente; los empates conservan el orden de registro. El delta se limita a 0.1 segundos para evitar saltos excesivos.

Esta versión entrega la infraestructura ECS. No convierte automáticamente los NPC, el protagonista ni la física existente: esa migración se hará por etapas para no romper el juego.
