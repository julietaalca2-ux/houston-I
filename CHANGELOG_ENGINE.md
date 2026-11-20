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


## CIUDAD ENGINE V0.15.0 — NEXT-GEN CITY ENVIRONMENT
- Se agregan mapas PBR 2K locales: normales y rugosidad para asfalto, hormigón y fachadas, más máscara emisiva de ventanas.
- Se implementa ciclo día/noche con cielo, niebla, iluminación direccional y luz ambiental dinámicas.
- Se incorpora lluvia ambiental por partículas y transición gradual a asfalto más húmedo.
- La cantidad de partículas se adapta a móviles y escritorio; las texturas se cargan de forma asíncrona.
- Se mantienen Three.js r160, los controles táctiles, el fallback 2D y los sistemas de simulación existentes.


## CIUDAD ENGINE V0.17.0 — Next-Gen City Detail
- Added modular instanced urban detail generation for street lighting, rooftop HVAC equipment and park benches.
- Added high-resolution brick facade, roof gravel, foliage canopy and brushed metal texture assets.
- Applied bundled brick/roof/foliage maps to building, roof and tree materials with procedural fallbacks.
- Added smoke coverage for build, rebuild and disposal.

## CIUDAD ENGINE V0.17.0 — Realistic City & World Expansion
- Added optional CityWorldExpansionSystem with instanced tree trunks/canopies, shrubs, grass tufts, junction traffic signals, and urban signage.
- Integrated with Engine diagnostics/update and renderer3d world-build flow. Traffic signal emissive cycling is animated at engine update time.
- Added smoke test for construction, rebuild, and cleanup. No new external assets; uses shared procedural geometry/materials to avoid mobile texture-memory growth.


## CIUDAD ENGINE V0.18.0 — Advanced Lighting & Shadows
- Added configurable lighting profiles and Engine integration.
- Added mobile/balanced/high/ultra shadow resolution presets.
- Tuned main renderer shadow map and camera range.
- Added automated smoke test.


## CIUDAD ENGINE V0.21.0 — Advanced Vehicle Models & Asset Expansion
- Expanded the shared car model with layered exterior parts, glazing, trim, bumpers, side mirrors, lamp geometry and detailed wheel/rim assemblies.
- Added locally bundled 2K texture assets for tire tread, brushed metal and glass reflection, connected to renderer vehicle materials.
- Kept the existing vehicle simulation, controls, AI and player-car transitions intact.
- Automated checks cover source syntax and existing engine smoke tests; no visual device test is claimed.


## V0.21.0 — High Resolution Texture Expansion
- Added 13 4K material textures (asphalt, concrete, masonry, facades, roofs, foliage and steel).
- Connected expansion textures to the existing 3D renderer's shared material slots with fallback behavior.

## CIUDAD ENGINE V0.22.0 — Vehicle Visual Overhaul
- Replaced the previous box-dominant vehicle appearance with smoother body and cabin silhouettes, sloped windshield/rear glass, split side windows, door seams, bumpers, grille, mirrors and more refined lamp clusters.
- Added visual variants for sedan, SUV/utility, van and pickup using the existing vehicle `typeId`, plus police livery and roof lightbar.
- Improved wheel assemblies with sidewalls, alloy rims, radial spokes and speed-driven wheel rotation.
- Preserved the existing vehicle simulation, controls, AI, actor synchronization and mobile fallback renderer.
- Added a source-level smoke test for the vehicle visual factory. Visual appearance still requires device/browser playtesting.


## V0.24.0 — 4K World, Vehicles & Characters

- Bundled 4K procedural base-color textures for eight environment material families and four character/vehicle material families.
- Connected desktop Ultra texture streaming to environment, vehicle paint/tire and character fabric/skin materials.
- Kept mobile on the existing 2K assets and PBR maps; 4K source files remain bundled but are not loaded on iPhone/Android.
- Added HighResolutionAssetIntegration smoke coverage for required assets and platform gating.
- No visual iPhone-device validation is claimed.
\n\n## V0.24.0 — Neighborhood Scale & Street Infrastructure\n- Residential homes raised to 2.6–3.1 storeys with repeated window bays and balcony ledges.\n- Street lighting coverage increased across the complete road grid.\n- Traffic signal assemblies generated at all world junctions.\n- Vehicle render groups enlarged and vertically corrected without changing physics/AI coordinates.\n