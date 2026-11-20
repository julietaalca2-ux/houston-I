# Ciudad Cero — Juego 01 (Versión 0.2)

Videojuego web 2D de mundo abierto con vista cenital clásica, inspirado en la primera era de los juegos urbanos de conducción. Primera entrega de una saga original desarrollada en JavaScript puro y HTML5 Canvas.

---

## Novedades de la Versión 0.2

### 1. Compatibilidad completa con celulares (Android y iPhone)
- **Joystick virtual analógico** a la izquierda para mover al protagonista en 360° cuando va a pie.
- **Botón dedicado para correr** (`CORRER`) utilizable en simultáneo con el joystick.
- **Botón inteligente para subir/bajar de vehículos** (`SUBIR` / `BAJAR`) con resaltado automático al acercarse a un auto.
- **Cambio automático de controles** al subir o bajar de un vehículo:
  - *A pie*: Joystick analógico + `SUBIR` + `CORRER`.
  - *Conduciendo*: Botones de dirección (`IZQ` / `DER`) a la izquierda + pedales de `FRENO` y `GAS` + botón `BAJAR` a la derecha.
- **Multi-touch con Pointer Events** (`pointerdown`, `pointermove`, `pointerup`, `pointercancel` + `setPointerCapture`), permitiendo presionar varios controles con distintos dedos al mismo tiempo.
- **Prevención de scroll y zoom accidentales** mediante `viewport-fit=cover`, `user-scalable=no`, `touch-action: none` y `overscroll-behavior: none`.
- **Diseño adaptable** a pantallas verticales y horizontales en iPhone y Android, además de un selector manual (`TÁCTIL: AUTO / ON / OFF`) en la barra superior.

### 2. Ciudad Viva
- **Tráfico autónomo con IA**: vehículos circulando por carriles de mano derecha, girando en intersecciones y frenando ante otros autos o peatones.
- **5 modelos de vehículos originales** con distintos colores, tamaños, velocidades, agarre y masa:
  - *Coupé GT*
  - *Sedán Urbano*
  - *Taxi Ciudad Cero*
  - *Todoterreno 4x4*
  - *Furgoneta Cargo*
- **Peatones caminando** por las aceras con animación de paso y reacción ante bocinas o tráfico cercano.
- **Aceras, pasos de cebra, plazas urbanas y edificios** con detalles arquitectónicos en azoteas.
- **Colisiones OBB (Separating Axis Theorem)** entre vehículos y contra edificios con deslizamiento lateral y transferencia de impulso según la masa de cada vehículo.
- **Conducción mejorada**: dirección progresiva según velocidad, agarre lateral con derrape controlado, marcha atrás, luces de freno funcionales, marcas de neumáticos y velocímetro en pantalla.

### 3. Funciones conservadas y ampliadas
- Movimiento a pie y carrera, exploración libre de Ciudad Cero, ingreso y salida de cualquier vehículo estacionado o del tráfico, dinero (`$ 500` iniciales), misiones encadenadas con recompensas en efectivo, flecha guía de objetivo, mini mapa en tiempo real con tráfico y cámara suave con anticipación de trayectoria.
- **Audio procedural original** generado con Web Audio API (sin archivos externos ni dependencias), activable/silenciable desde el HUD.

### 4. Rendimiento y Arquitectura Modular
- **Caché de mapa en Canvas offscreen**: toda la ciudad estática se dibuja una sola vez en memoria y se vuelca en un único `drawImage` por fotograma, manteniendo fluidez en teléfonos de gama baja y media.
- **Frustum culling** para vehículos, peatones, marcas de frenada y partículas.
- **Escalado dinámico de `devicePixelRatio`** limitado a `2x` para pantallas Retina/AMOLED sin penalizar el rendimiento.
- Código organizado por módulos en `src/`:
  - `src/config.js` — Parámetros del mundo, catálogo de vehículos y misiones.
  - `src/audio.js` — Sintetizador de efectos de sonido originales (Web Audio API).
  - `src/input.js` — Gestión unificada de teclado y controles táctiles multi-dedo.
  - `src/world.js` — Generación de calles, aceras, plazas, edificios y carriles.
  - `src/entities.js` — Fábrica de protagonista, vehículos y peatones.
  - `src/physics.js` — Colisiones SAT (vehículo-edificio y vehículo-vehículo) y salida segura.
  - `src/renderer.js` — Renderizado 2D optimizado, caché de ciudad y mini mapa.
  - `src/ui.js` — Sincronización del HUD, alertas y telemetría.
  - `src/game.js` — Bucle principal (`requestAnimationFrame`), IA de tráfico y estado de partida.

---

## Ejecutar localmente

1. Descarga y descomprime `ciudad_cero_v0.2.zip`.
2. Abre el archivo `index.html` directamente en cualquier navegador moderno (Chrome, Edge, Firefox, Safari).
   - *Nota*: Los módulos están cargados de forma compatible con el protocolo `file://`, por lo que **no requiere servidor local ni instalación de paquetes**.
3. Opcionalmente, si deseas probarlo en tu teléfono dentro de la misma red Wi-Fi, puedes levantar un servidor estático simple:
   ```bash
   npx serve .
   # o con Python:
   python3 -m http.server 8080
   ```

---

## Publicar en GitHub Pages

1. Crea o abre tu repositorio en GitHub (por ejemplo, `ciudad-cero`).
2. Sube el contenido de la carpeta del proyecto (`index.html`, la carpeta `src/`, `README.md` y `.gitignore`) a la rama `main` en la raíz (`/`).
3. En GitHub, entra a **Settings → Pages**.
4. En **Build and deployment → Source**, selecciona **Deploy from a branch**.
5. Elige la rama `main` y la carpeta `/ (root)`, y pulsa **Save**.
6. En 1–2 minutos GitHub Pages publicará la URL oficial jugable desde PC, Android y iPhone.

---

## Controles

### PC (Teclado)
- **W A S D** o **Flechas (`↑ ↓ ← →`)**: Moverse a pie / Acelerar, frenar-reversa y girar vehículo.
- **Shift**: Correr a pie / Turbo al conducir.
- **E**: Subir o bajar del vehículo más cercano.
- **Espacio**: Bocina (conduciendo) / Freno de mano.
- **R**: Reiniciar partida.

### Celulares y Tablets (Android / iPhone)
- **Modo A Pie**:
  - **Joystick izquierdo**: Moverse en cualquier dirección.
  - **Botón `CORRER`**: Mantener presionado para correr.
  - **Botón `SUBIR`**: Subir al vehículo cercano.
- **Modo Conduciendo** *(se activa automáticamente al subir a un auto)*:
  - **Botones `IZQ` / `DER` (izquierda)**: Girar a izquierda y derecha.
  - **Pedal `GAS` (derecha)**: Acelerar.
  - **Pedal `FRENO` (derecha)**: Frenar y dar marcha atrás.
  - **Botón `BAJAR` (derecha)**: Salir del vehículo de forma segura.

---

## Errores conocidos y alcance de v0.2
- **Activación de audio en navegadores móviles**: Por políticas de seguridad de iOS Safari y Android Chrome, el sonido procedural se activa tras el primer toque o pulsación de tecla del jugador.
- **Nivel de búsqueda (`ALERTA`)**: En v0.2 el medidor de alerta sube si se atropella a peatones y disminuye gradualmente con el tiempo; las patrullas de policía con persecución activa están planificadas para la versión 0.3.
- **Guardado persistente**: El progreso de dinero y misiones se reinicia al recargar la página o pulsar `Reiniciar` (el guardado en `localStorage` se incorporará junto con tiendas en futuras actualizaciones).
