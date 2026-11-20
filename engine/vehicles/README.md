# Vehicle Engine — CIUDAD ENGINE V0.12.0

Sistema opcional de vehículos basado en ECS. Incluye conducción arcade (`physicsMode: 'arcade'`), física arcade avanzada (`physicsMode: 'advanced'`) y conducción autónoma opcional mediante `VehicleAI`.

## Crear un vehículo con IA

```js
const car = CiudadEngine.runtime.vehicles.createVehicle({
  name: 'Tráfico urbano',
  physicsMode: 'advanced',
  maxSpeed: 32,
  ai: {
    route: [{ x: 0, z: 0 }, { x: 0, z: 80 }, { x: 45, z: 80 }],
    targetSpeed: 18,
    waypointRadius: 4,
    loop: true
  }
});
```

La IA se ejecuta antes del `VehicleSystem` (prioridad 4 frente a 5), calcula acelerador, freno y dirección, y deja que el sistema de conducción existente aplique el movimiento. Los vehículos sin componente `VehicleAI` no reciben órdenes de IA.

## API

- `vehicles.enableAI(entity, options)`: agrega el componente de IA.
- `vehicles.setRoute(entity, route, options)`: reemplaza la ruta y reinicia el índice de waypoint.
- `vehicles.disableAI(entity)`: desactiva la conducción autónoma sin eliminar el vehículo.
- `vehicles.setControls(entity, controls)`: conserva el control manual disponible.

Cada waypoint utiliza coordenadas `{ x, z }`. Opciones: `targetSpeed`, `waypointRadius`, `loop`, `steeringAngle`, `cornerSpeedFactor`, `obstacleRange`, `obstacleCorridor` y `avoidanceStrength`.

## Comportamiento

- Seguimiento de rutas por waypoints.
- Ajuste de velocidad según el ángulo de giro.
- Frenado/aceleración automáticos para aproximarse a la velocidad objetivo.
- Detección de otros vehículos dentro de un corredor frontal y maniobra/frenado evasivo básico.
- Estados `idle`, `following`, `avoiding` y `completed`.
- Diagnósticos en `Engine.getDiagnostics().vehicleAI`.

La evasión es geométrica y local: no incluye navegación por calles, semáforos, reglas de tránsito, colisión física ni planificación global de rutas. El sistema es opcional y no modifica `src/npc_ai.js` ni el tráfico actual del juego.

## Pruebas

```sh
node engine/vehicles/VehicleAISystem.smoke.test.js
node engine/vehicles/VehicleSystem.smoke.test.js
node engine/vehicles/EngineVehicleIntegration.smoke.test.js
```
