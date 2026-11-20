# Rendering Pipeline — V0.6.0

Rendering configuration and shared graphics utilities for CIUDAD ENGINE.

## Quality profiles

`low`, `medium`, `high` (default), and `ultra`. Profiles cap pixel ratio and configure shadow-map use/resolution and tone-mapping exposure. Antialias is documented as a renderer-construction option: WebGL antialias cannot be toggled after the renderer is created.

## API

- `engine.rendering.setQuality('medium')`
- `engine.rendering.createPBRMaterial({ color, roughness, metalness })`
- `engine.rendering.loadTexture(url, { repeat: { x, y }, colorTexture: true })`
- `engine.rendering.getDiagnostics()`

Textures are cached by URL. Call `dispose()` when shutting down the rendering pipeline.

The pipeline configures an attached Three.js renderer; it does not automatically replace existing game materials, add new light sources, or remodel the city. Existing scene lights are used for shadow-map sizing.


## V0.14.0 — World Surface Materials

The main 3D game renderer now creates a local procedural surface library for asphalt, concrete, grass, and building facades. The facade atlas includes individual window panes, frames, sills, floor bands, and subtle surface variation. Road and sidewalk materials use repeating high-resolution maps; lane separators add readable street structure.

Lighting has been refined with a cooler fill light, warm key light, improved shadow-map resolution, shadow bias tuning, ACES exposure, and longer atmospheric fog. Rendering pixel ratio and shadow resolution adapt to mobile versus desktop. The procedural maps are generated locally with CanvasTexture, avoiding external texture requests and preserving the legacy 2D fallback.

Note: larger files do not automatically mean better graphics. V0.14.0 increases visual texture detail while generating most pixel data at runtime, so the ZIP remains relatively compact and mobile download/storage costs stay controlled.


Bundled 2K texture assets live in `assets/textures/`: `asphalt_2k.jpg`, `concrete_2k.jpg`, `grass_2k.jpg`, and `building_facade_2k.jpg`. They load locally through Three.js TextureLoader. Procedural CanvasTexture fallbacks are created first, so the scene remains drawable if a texture file fails to load.


## V0.15.0 — PBR & Atmosphere
- Mapas locales de normales y rugosidad para asfalto, hormigón y fachadas.
- Máscara emisiva de ventanas para acentuar fachadas durante la noche.
- Ciclo día/noche dinámico con actualización de cielo, niebla y luces.
- Lluvia ambiental ligera con partículas y transición progresiva de rugosidad del asfalto.
- Los mapas se cargan de forma asíncrona; el renderizador mantiene materiales base mientras se descargan y no depende de hosts externos.
- En móvil se reduce la cantidad de partículas de lluvia para moderar el coste gráfico.


## CityDetailSystem (V0.16.0)

The optional `CityDetailSystem` builds repeated urban props with `THREE.InstancedMesh`: street lamps, rooftop HVAC units and park benches. Call `build(THREE, scene, world, textureSet)` after the base city geometry; call `dispose(scene)` before rebuilding or unloading. It reports generated counts in `stats`.


## CityWorldExpansionSystem (V0.17.0)
Optional renderer-integrated instanced expansion for park trees, shrub clusters, grass tufts, intersection signals, and simple street signage. It exposes diagnostics, a capped signal cycle update, rebuild cleanup, and configurable instance limits.


### AdvancedLightingSystem (V0.18.0)
Profiles: mobile, balanced, high, ultra. Adjusts exposure, directional shadow-map resolution and shadow settings. Integrated through Engine attach/update diagnostics.
