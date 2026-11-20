# CIUDAD ENGINE — 0.14.0

Primera capa interna del motor propio de CIUDAD CERO.

## Incluido
- `EventBus`: eventos desacoplados entre sistemas.
- `SceneManager`: registro y selección de escenas.
- `ResourceRegistry`: registro de recursos cargados.
- `AssetManager`: carga asíncrona de modelos GLB/GLTF, caché, instanciación y descarga.
- `ECSWorld`, `Entity`, `Component` y `System`: entidades, almacenamiento de componentes, consultas y ejecución ordenada de sistemas.
- `Engine`: ciclo de vida, actualización y diagnóstico.
- `PlatformAdapter`: detección de capacidades del navegador/dispositivo.

## Integración actual
El renderizador 3D existente de CIUDAD CERO conecta su renderer, escena y cámara con `CiudadEngine.runtime`. El motor recibe una actualización por frame. El renderizado y la simulación existentes siguen siendo responsabilidad del juego en esta fase.

## Compatibilidad
La base del juego sigue usando scripts clásicos y Three.js 0.160.0 desde CDN. Los módulos de CIUDAD ENGINE también se publican como scripts clásicos para no obligar a migrar todo el proyecto de una vez.

## Próximas fases
Próximas fases: integración progresiva de movimiento, personajes, animación, física y herramientas de depuración sobre ECS.

Supabase no es dependencia del motor y se evaluará cuando el juego requiera servicios online.


## Character System
Consultar `characters/README.md` para crear personajes GLB, reproducir clips y administrar instancias.


## V0.10.0 — Vehicle Engine

Adds the optional ECS Vehicle Engine (`vehicles/VehicleSystem.js` and `VehicleFactory.js`) with arcade acceleration, braking, steering, reverse, drag, Transform integration, and optional Three.js Object3D synchronization. Engine creates the system and factory and exposes diagnostics. Existing gameplay vehicles in `src/` are not migrated or replaced. See `engine/vehicles/README.md`.


## V0.11.0 — Advanced Vehicle Physics

El Vehicle Engine incorpora un modelo de conducción avanzado opcional con velocidad longitudinal/lateral, agarre lateral configurable, respuesta de guiñada, freno de mano y derrape controlado. El modo `arcade` anterior sigue siendo el predeterminado. Consultar `vehicles/README.md`.


## V0.12.0 — Vehicle AI System

Agrega conducción autónoma ECS opcional mediante `VehicleAISystem` y el componente `VehicleAI`: seguimiento de waypoints, control de velocidad, giro y evasión local básica de otros vehículos. Se ejecuta antes del `VehicleSystem`; los vehículos sin IA permanecen sin cambios. Consultar `vehicles/README.md`.


## V0.13.0 — World & Engine Integration

Se incorpora `WorldBridge`, `SceneSyncSystem` y `WorldBoundsSystem` para enlazar entidades ECS con `THREE.Object3D`, sincronizar transformaciones y notificar/aplicar límites espaciales opcionales. La escena se enlaza automáticamente al ejecutar `Engine.attachRenderer()`. Consultar `world/README.md`.
