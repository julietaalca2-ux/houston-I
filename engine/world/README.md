# World Integration — CIUDAD ENGINE V0.13.0

Capa opcional para conectar entidades ECS con la escena Three.js y aplicar límites espaciales sin reemplazar el mundo ni la simulación legacy de `src/`.

## Componentes

- `SceneObject`: referencia a un `THREE.Object3D` y opciones visuales (`visible`, `scale`).
- `WorldBounds`: límites `minX`, `maxX`, `minZ`, `maxZ` y modo `notify` o `clamp`.

## API

```js
const engine = CiudadEngine.runtime;
const carVisual = new THREE.Group();
const entity = engine.worldBridge.createEntity({
  name: 'ECS prop', x: 10, y: 0, z: 20,
  object3D: carVisual,
  bounds: { minX: 0, maxX: 500, minZ: 0, maxZ: 500, mode: 'clamp' }
});

// También se puede enlazar una entidad ECS existente:
engine.worldBridge.bindObject(entity, carVisual);
engine.worldBridge.setBounds(entity, { minX: 0, maxX: 500, minZ: 0, maxZ: 500 });
engine.worldBridge.removeEntity(entity);
```

`attachRenderer()` enlaza automáticamente la escena al puente. En cada actualización, `SceneSyncSystem` copia `Transform` a posición, rotación y escala del `Object3D`. `WorldBoundsSystem` emite `world:entity-out-of-bounds` y `world:entity-in-bounds`; con `mode: 'clamp'` limita X/Z y detiene la velocidad correspondiente de un `RigidBody`.

## Compatibilidad y orden

- `WorldBoundsSystem` se ejecuta después de la simulación de movimiento (prioridad 80).
- `SceneSyncSystem` se ejecuta al final del ciclo ECS (prioridad 100).
- Las entidades sin `SceneObject` o `WorldBounds` no se modifican.
- No se migra ni altera `src/world.js`, `src/renderer3d.js` ni el tráfico del juego.
- No requiere Supabase ni una nueva dependencia.

## Diagnóstico

`CiudadEngine.runtime.getDiagnostics().world` informa escena enlazada, objetos enlazados, sincronizaciones y entidades fuera de límites.

## Prueba

```sh
node engine/world/WorldBridge.smoke.test.js
```
