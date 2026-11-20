# CIUDAD ENGINE — Core 0.3.0

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


## V0.10.0 — Vehicle Engine

- Added ECS Vehicle component data managed by `VehicleFactory`.
- Added arcade acceleration, speed caps, braking, reverse, drag, and speed-sensitive steering.
- Added Transform and optional Three.js Object3D synchronization.
- Integrated `VehicleSystem` and `VehicleFactory` into `Engine.js`; exposed vehicle diagnostics.
- Added automated smoke test and module documentation.
- Kept the legacy `src/` driving, traffic, garage, and mission systems unchanged; migration remains opt-in and future work.


## V0.11.0 — Advanced Vehicle Physics

- Added opt-in `physicsMode: 'advanced'`; existing `arcade` handling remains the default.
- Added world-space velocity, longitudinal/lateral speed decomposition, configurable traction and lateral grip.
- Added handbrake grip reduction, drift state, and smoothed yaw response.
- Added drift diagnostics and automated coverage for drift initiation and lateral-grip recovery.
- Updated runtime engine version to `0.11.0`; legacy game vehicle scripts remain untouched.


## V0.12.0 — Vehicle AI System

- Nuevo `VehicleAISystem` opcional basado en ECS.
- Seguimiento de rutas por waypoints y control automático de acelerador, freno y dirección.
- Ajuste de velocidad en curvas y evasión local básica de vehículos.
- API de fábrica para activar/desactivar IA y reemplazar rutas.
- Diagnósticos y pruebas automatizadas.
- No modifica los NPC ni el tráfico del juego en `src/`.


## CIUDAD ENGINE V0.13.0 — WORLD & ENGINE INTEGRATION
- Se agrega `WorldBridge` para crear entidades del mundo y enlazar/desenlazar objetos Three.js.
- `SceneSyncSystem` sincroniza Transform (posición, rotación y escala) al final del ciclo ECS.
- `WorldBoundsSystem` detecta salidas de límites, emite eventos y ofrece modo opcional de clamp en X/Z.
- `Engine.attachRenderer()` enlaza automáticamente la escena y los diagnósticos incorporan métricas del puente.
- La integración es optativa: no migra ni reemplaza `src/` ni la simulación actual del juego.
- Prueba: `node engine/world/WorldBridge.smoke.test.js`.


## CIUDAD ENGINE V0.14.0 — VISUAL QUALITY & PERFORMANCE
- Se reemplazan superficies planas por materiales procedurales de alta resolución: asfalto, hormigón, césped y fachadas con ventanas detalladas.
- Se mejora la iluminación direccional, el balance ambiental, el tone mapping y la niebla de profundidad.
- Se elevan los mapas de sombras y la resolución de renderizado con perfiles adaptados a móvil y escritorio.
- Se agregan separadores de carril y detalles arquitectónicos de fachada.
- Las texturas se generan localmente con CanvasTexture: no requieren servicios externos ni descargas en tiempo de juego.
- Se mantiene el renderer 2D como fallback y se conservan los controles táctiles y la simulación de juego.
