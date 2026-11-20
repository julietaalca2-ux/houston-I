# CIUDAD CERO — Versión 0.3

**Saga Original · Juego 01 · Acción y Conducción Cenital 2D**

**Ciudad Cero** es un videojuego web original de mundo abierto con cámara cenital 2D inspirado en los clásicos de acción urbana. Esta **versión 0.3** amplía directamente la base jugable de la versión 0.2 incorporando un **sistema policial completo de 5 niveles**, **inteligencia artificial de patrullaje, persecución e interceptación**, **mecánicas de ocultación y escape progresivo**, **garajes funcionales** y **misiones policiales**, manteniendo intacta la compatibilidad móvil en **Android**, **iPhone** y **PC**.

---

## Novedades de la Versión 0.3

1. **Sistema de Búsqueda Policial (1★ a 5★)**:
   - **1★ Búsqueda leve**: una patrulla comienza a seguir al jugador.
   - **2★ Patrullaje activo**: refuerzos policiales con mayor presión.
   - **3★ Persecución agresiva**: aparecen **Interceptores V8** de alta velocidad que intentan cortar el paso.
   - **4★ Bloqueos y refuerzos**: despliegue de **bloqueos de calles** con patrullas cruzadas y balizas en intersecciones por delante del jugador.
   - **5★ Alerta máxima**: persecución total con **Unidades Tácticas 4x4** blindadas, interceptores y perímetro ampliado.
   - **Aumento dinámico de estrellas**: robar vehículos civiles o patrullas, chocar contra unidades policiales, atropellar peatones, provocar daños repetidos o incumplir objetivos de misiones con límite de tiempo.
2. **Inteligencia Artificial Policial (`src/police.js`)**:
   - Patrullas rutinarias circulando por los carriles de la ciudad incluso sin búsqueda activa.
   - Detección real mediante rango visual y **línea de visión bloqueada por edificios** (`Physics.hasLineOfSight`).
   - Navegación por calles para perseguir, predecir trayectoria (interceptación) y registrar la **última ubicación conocida (`?`)** cuando el jugador se pierde de vista.
3. **Sistema de Escape y Ocultación**:
   - Indicador dedicado en el HUD con estado en tiempo real (`EN MIRA`, `BUSCANDO ÚLTIMA UBICACIÓN`, `OCULTO EN ESCONDITE`) y barra de enfriamiento progresivo.
   - **3 Escondites (callejones cubiertos entre edificios)** señalizados en la ciudad y en el minimapa donde el rastro policial se pierde mucho más rápido.
   - Reducción gradual estrella por estrella (`3★ → 2★ → 1★ → 0★`) sin desaparición instantánea.
4. **Garajes Funcionales (`src/garage.js`)**:
   - **Garaje Central Cero** (junto al punto de inicio) y **Taller Distrito Este**, ambos marcados en el mapa y minimapa.
   - Permite **guardar vehículos** (hasta 6 espacios), **seleccionar** automóviles disponibles, **reparar** daños estructurales (`$ 75`) y **recuperar** vehículos dejados en la ciudad (`$ 50`).
5. **Vehículos Policiales Originales**:
   - **Patrulla CC-01**, **Interceptor V8** y **Unidad Táctica 4x4** con luces de emergencia rojas/azules animadas, halos luminosos, sirena interactiva y estadísticas diferenciadas.
6. **Nuevas Misiones Policiales**:
   - Misiones encadenadas tras el objetivo inicial: *¡Emboscada! Escapa de la patrulla*, *Entrega sin ser detenido (contrarreloj)*, *Recupera el Coupé confiscado al Garaje* y *Distracción bajo búsqueda (3★)*.
7. **Compatibilidad Móvil Mejorada**:
   - Conserva el joystick táctil, pedales multitáctiles, botones de dirección, correr y subir/bajar, sumando el botón contextual **`🔧 GARAJE`** al entrar en zona de taller y botón de bocina/sirena en modo conducción.

---

## Estructura del Proyecto

```text
ciudad_cero_v0.3/
├── index.html          # Estructura principal, HUD policial, modal de garaje y controles móviles
├── README.md           # Documentación del proyecto y guía de despliegue
├── .gitignore          # Exclusiones de archivos temporales
└── src/
    ├── style.css       # Estilos responsivos, HUD de búsqueda, modal de garaje y controles táctiles
    ├── config.js       # Parámetros de mundo, vehículos, niveles policiales, garajes, escondites y misiones
    ├── audio.js        # Audio procedural Web Audio (motor/puertas, choques, sirenas, taller y alertas)
    ├── input.js        # Gestión unificada de teclado (PC) y Pointer Events multitáctiles (Android/iPhone)
    ├── world.js        # Generador de calles, manzanas, parques, parcelas de garajes y callejones ocultos
    ├── entities.js     # Fábricas de jugador, vehículos civiles/policiales y peatones
    ├── physics.js      # Colisiones OBB, línea de visión (raycast AABB), daño vehicular y salida segura
    ├── garage.js       # Gestión de flota guardada, reparación, selección y recuperación de vehículos
    ├── police.js       # IA policial, persecución, interceptación, bloqueos de calle y escape progresivo
    ├── renderer.js     # Renderizado Canvas 2D con mapa cacheado, luces policiales, partículas y minimapa
    ├── ui.js           # Controlador de HUD, barra de escape, velocímetro/salud y modal de garaje
    └── game.js         # Bucle principal (60 FPS), misiones, eventos y sincronización de sistemas
