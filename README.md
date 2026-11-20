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
