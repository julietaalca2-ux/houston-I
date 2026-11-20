# CIUDAD CERO V0.8.9 — CHARACTER DETAIL UPDATE

Actualización visual de personajes sobre la base TPS FIX.

## Cambios
- Protagonista con anatomía estilizada: cabeza, rostro, ojos, nariz, boca, orejas y cabello.
- Ropa diferenciada por capas: torso, pantalón, cuello, puños y calzado.
- Brazos y piernas articulados con animación procedural de caminata.
- Peatones con variaciones de tonos de piel, cabello y ropa.
- Policías con uniforme, insignia y cinturón visuales.
- NPCs de misiones con variaciones de vestuario.
- Se mantiene la cámara TPS, controles, mundo, vehículos, misiones y sistemas existentes.

Los modelos son geometría 3D suavizada y articulada, no modelos humanos escaneados ni personajes de alta resolución. La animación es procedural.

## Validación
Se revisó la sintaxis de JavaScript y la integridad del ZIP. La apariencia y rendimiento deben probarse dentro del navegador, especialmente en dispositivos móviles.


## V0.8.9 — TOUCH CONTROL & MOVEMENT FIX
- El joystick táctil controla únicamente el desplazamiento del personaje.
- La cámara 3D solo gira al arrastrar directamente sobre el área del mundo.
- Los eventos táctiles del joystick ya no se propagan al control de cámara.
- Movimiento relativo a la orientación absoluta de la cámara, sin realimentación con el ángulo del personaje.
- Sensibilidad de cámara reducida y eje vertical suavizado.
- Aceleración y frenado a pie suavizados; velocidades de caminata/carrera y peatones reajustadas.


## V0.8.9 — CAMERA TOUCH ZONES & VERTICAL LOOK
- The movement joystick has an additional screen-area guard so a touch beginning over it cannot start a camera drag on mobile browsers.
- Joystick pointer events are stopped through release/cancel as well as during movement.
- Vertical camera drag has a wider pitch range: swipe up to look toward the sky and swipe down to look toward the ground.
- Camera height is calculated from the orbit distance and clamped above the ground.


## V0.8.9 — CHARACTER MODEL UPGRADE

- Rebuilt the 3D humanoid silhouette with clearer head, neck, shoulders, chest, waist, hips, thighs, shins, hands and shoes.
- Added layered clothing details (jackets, suit lapels, work overalls, reflective vest, police uniform, belts, pockets and seams).
- Improved hair silhouettes and role-specific headwear; named story characters now use their authored character profiles in the 3D scene.
- Mateo now uses his dedicated protagonist appearance; named mission/story NPCs use their own skin, hair, outfit and accessory palette.
- Pedestrians have more visual variation, while foot patrols use the dedicated police appearance.
- Added more natural arm/forearm and leg/shin articulation, foot lift, body bounce and subtle idle breathing.


## CIUDAD ENGINE V0.1.0 — FOUNDATION

Se incorpora la primera capa independiente del motor:
- Núcleo de eventos (`EventBus`).
- Gestor de escenas (`SceneManager`).
- Registro de recursos (`ResourceRegistry`).
- Ciclo de vida y diagnóstico (`Engine`).
- Detección de capacidades de plataforma (`PlatformAdapter`).
- Conexión del renderizador 3D actual con `CiudadEngine.runtime`.

Esta fase no reemplaza el renderizador ni los sistemas de juego existentes. La base gráfica sigue usando Three.js 0.160.0 y WebGL 2 cuando está disponible. WebGPU queda detectado como capacidad, pero todavía no se usa como backend de renderizado.

### Validación de esta entrega
Se verificó la sintaxis de los archivos JavaScript y la integridad del archivo ZIP. No se realizó una prueba visual interactiva en navegador o iPhone; esa comprobación debe hacerse al abrir el juego.


## CIUDAD ENGINE 0.2.0 — Asset Pipeline

Se incorpora `engine/assets/AssetManager.js` para cargar modelos GLB/GLTF bajo demanda, cachear recursos, emitir eventos de progreso y crear instancias en escenas. Ver `engine/assets/README.md`.


### CIUDAD ENGINE V0.3.0
Incluye el núcleo ECS para organizar entidades, componentes y sistemas. Los sistemas actuales del juego continúan funcionando y se migrarán gradualmente. Ver `engine/ecs/README.md`.


## CIUDAD ENGINE V0.4.0

Se incorpora Character System: gestión de instancias GLB con clonación de esqueletos, animaciones por clips y sincronización de transformaciones mediante ECS. Ver `engine/characters/README.md`.


## CIUDAD ENGINE V0.5.0 — Physics System

Adds an ECS-based physics layer with rigid bodies, AABB colliders, gravity, ground contact, static box collisions, and runtime diagnostics. It is separate from the existing game physics and does not silently replace it. See `engine/physics/README.md`.


## CIUDAD ENGINE V0.6.0

Rendering Pipeline: configurable quality profiles, renderer color/tone mapping, shadow configuration, PBR material factory, and cached texture loading. See `engine/rendering/README.md`.


## CIUDAD ENGINE V0.10.0 — VEHICLE ENGINE
- Se incorpora un sistema vehicular ECS opcional con aceleración, velocidad máxima, frenado, reversa, dirección y resistencia arcade.
- `VehicleFactory` crea, configura, consulta y elimina vehículos ECS.
- Sincronización opcional de `Transform` con objetos 3D de Three.js.
- Integración con `Engine.js` y diagnósticos del motor.
- Los vehículos del juego principal (`src/`) y su garaje no se reemplazan ni migran en esta etapa.
- Prueba automatizada: `node engine/vehicles/VehicleSystem.smoke.test.js`.


## CIUDAD ENGINE V0.11.0 — ADVANCED VEHICLE PHYSICS
- Se agrega física vehicular avanzada opcional (`physicsMode: 'advanced'`) con velocidad longitudinal/lateral, tracción, agarre lateral y respuesta de dirección suavizada.
- Se incorpora freno de mano con reducción de agarre, derrape controlado y recuperación de estabilidad.
- El modo `arcade` permanece como predeterminado para conservar compatibilidad.
- Diagnósticos ampliados con cantidad de vehículos derrapando.
- Pruebas: `node engine/vehicles/VehicleSystem.smoke.test.js` y `node engine/vehicles/EngineVehicleIntegration.smoke.test.js`.


### CIUDAD ENGINE V0.12.0

Incluye Vehicle AI opcional para rutas por waypoints, control de conducción y evasión local básica. Ver `engine/vehicles/README.md`.


## CIUDAD ENGINE V0.13.0 — WORLD & ENGINE INTEGRATION
- Puente ECS ↔ Three.js para asociar entidades a objetos visuales.
- Sincronización de posición, rotación y escala.
- Límites espaciales con eventos y clamp opcional.
- Integración automática al adjuntar la escena al motor.
- Sistemas legacy del videojuego conservados y sin migración forzada.
- Documentación: `engine/world/README.md`.


## CIUDAD ENGINE V0.14.0
Mejora visual del mundo 3D: materiales procedurales de alta resolución para fachadas, asfalto, hormigón y césped; iluminación y sombras refinadas; marcas viales y perfiles de calidad adaptativos para móvil/escritorio. Ver `engine/rendering/README.md`.


## CIUDAD ENGINE V0.15.0 — NEXT-GEN CITY ENVIRONMENT
Nueva capa de materiales PBR 2K y ambiente dinámico: mapas normales, rugosidad, ventanas emisivas, ciclo día/noche y lluvia con asfalto progresivamente húmedo. Los recursos se encuentran en `assets/textures/`. La cantidad de partículas de lluvia se adapta a móviles y escritorio.


### CIUDAD ENGINE V0.17.0
Urban detail pass with instanced street furniture, rooftop equipment, park benches and bundled high-resolution surface materials.


### Engine update V0.18.0
Advanced Lighting & Shadows introduces lighting profiles with device-conscious shadow resolutions.


### CIUDAD ENGINE V0.21.0 — Advanced Vehicle Models & Asset Expansion
- Reworked the in-game vehicle meshes in the Three.js renderer: layered body panels, cabin glazing, bumpers, mirrors, door trim, headlights/tail lamps, detailed wheel assemblies and police livery.
- Added three bundled 2K vehicle texture maps: tire tread, brushed metal and glass reflections, loaded asynchronously with safe material fallbacks.
- Vehicle visuals remain part of the existing renderer and simulation entities; no vehicle physics or input behavior was replaced.



## V0.21.0 — High Resolution Texture Expansion
- Added 13 4K material textures (asphalt, concrete, masonry, facades, roofs, foliage and steel).
- Connected expansion textures to the existing 3D renderer's shared material slots with fallback behavior.

## CIUDAD ENGINE V0.22.0 — Vehicle Visual Overhaul
- Replaced the former block-heavy vehicle silhouette with smoother sculpted body/cabin forms, separate sloped glazing, clearer vehicle proportions, bumper/grille assemblies and improved lamp clusters.
- Added sedan, SUV/utility, van and pickup visual silhouettes selected from each vehicle's existing `typeId`; police vehicles retain a dedicated livery and roof lightbar.
- Rebuilt wheel assemblies with tire sidewalls, alloy faces, spokes and wheel-rotation animation driven by the existing vehicle speed value.
- No changes to VehicleSystem physics, steering, AI, input mapping or world coordinates.


## CIUDAD ENGINE V0.23.0 — 4K World, Vehicles & Characters

- Added a bundled 4K procedural material library for asphalt, sidewalks, concrete, brick, stucco, roof tiles, grass, foliage, steel, vehicle paint, tire rubber, clothing fabric and skin microdetail.
- Desktop Ultra streams the 4K base-color maps into the existing world, vehicle and character material slots.
- Mobile devices retain the existing 2K/PBR path and procedural fallbacks to avoid loading a full 4K texture set into limited GPU memory.
- Character fabric/skin and vehicle paint/tire materials created before asynchronous loads are updated through material registries.
- This is a texture/material upgrade, not a claim of scanned photogrammetry, new rigged character meshes, or a complete vehicle model replacement.
