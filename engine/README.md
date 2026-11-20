# CIUDAD ENGINE — Foundation 0.1.0

Primera capa interna del motor propio de CIUDAD CERO.

## Incluido
- `EventBus`: eventos desacoplados entre sistemas.
- `SceneManager`: registro y selección de escenas.
- `ResourceRegistry`: registro de recursos cargados.
- `AssetManager`: carga asíncrona de modelos GLB/GLTF, caché, instanciación y descarga.
- `Engine`: ciclo de vida, actualización y diagnóstico.
- `PlatformAdapter`: detección de capacidades del navegador/dispositivo.

## Integración actual
El renderizador 3D existente de CIUDAD CERO conecta su renderer, escena y cámara con `CiudadEngine.runtime`. El motor recibe una actualización por frame. El renderizado y la simulación existentes siguen siendo responsabilidad del juego en esta fase.

## Compatibilidad
La base del juego sigue usando scripts clásicos y Three.js 0.160.0 desde CDN. Los módulos de CIUDAD ENGINE también se publican como scripts clásicos para no obligar a migrar todo el proyecto de una vez.

## Próximas fases
1. Sistema de entidades/componentes.
2. Sistema de entidades/componentes.
3. Abstracción del backend gráfico y pruebas WebGPU.
4. Física, animación y herramientas de depuración.

Supabase no es dependencia del motor y se evaluará cuando el juego requiera servicios online.
