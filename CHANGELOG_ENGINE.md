# CIUDAD ENGINE — CHANGELOG

## V0.1.0 — FOUNDATION
- Primera estructura modular del motor.
- EventBus para comunicación desacoplada.
- SceneManager para registrar y activar escenas.
- ResourceRegistry para administrar recursos por identificador.
- Engine runtime con ciclo de actualización y diagnósticos.
- PlatformAdapter para detectar dispositivo, pantalla táctil, WebGL2 y WebGPU.
- Integración del runtime con el renderizador 3D existente.
- Se conserva el fallback 2D y los sistemas de juego originales.


## 0.2.0 — Asset Pipeline
- Añadido AssetManager para carga asíncrona GLB/GLTF con GLTFLoader diferido.
- Caché por ID y deduplicación de cargas simultáneas.
- Eventos de inicio, progreso, éxito, error e instanciación.
- Creación de instancias y descarga con liberación opcional de recursos GPU.
- Diagnóstico del motor incluye el número de cargas pendientes.
