# CIUDAD CERO — Versión 0.4: Historia y Campaña

**Saga Original · Juego 01 · Acción, Historia y Conducción Cenital 2D**

**Ciudad Cero v0.4** amplía directamente la base jugable de la versión 0.3 transformando la ciudad en un mundo abierto con **historia principal conectada en 3 capítulos**, **protagonista y personajes secundarios con diálogos interactivos**, **misiones variadas**, **misiones secundarias**, **catálogo y mejoras en garajes** y **guardado automático de progreso en `localStorage`**, manteniendo intacta la compatibilidad en **PC**, **Android** e **iPhone**.

---

## Novedades de la Versión 0.4

1. **Protagonista e Historia Original**:
   - **Protagonista**: **Mateo "Cero" Vega** (26 años), ex mecánico de pruebas y piloto de traslado que llega a Ciudad Cero tras la desaparición de su hermano mayor, **Julián Vega**, siguiendo unas coordenadas grabadas en una llave de taller.
   - **Personajes Secundarios con Diálogos en Pantalla**:
     - **Nora "Llave" Salgado** (Jefa de Taller en *Garaje Central Cero*).
     - **Ramiro "El Sastre" Mendoza** (Corredor de información en *Parque Central*).
     - **Valeria "Chispa" Quiroga** (Especialista en radares y evasión en *Distrito Norte*).
     - **Comisario Héctor Dávila** (Jefe de Operaciones Tácticas y antagonista principal).
2. **Campaña Principal en 3 Capítulos (9 Misiones Conectadas)**:
   - **Capítulo 1 · Motor en Frío**: *1.1 El Taller de la Avenida Cero* (hablar con contactos), *1.2 El Encargo del Sastre* (entrega de paquete contrarreloj) y *1.3 Sirenas en el Retrovisor* (escape policial).
   - **Capítulo 2 · Pistas de Aceite y Polvo**: *2.1 El Coupé Confiscado* (robo y entrega de vehículo), *2.2 Testigo Protegido* (transporte de personaje) y *2.3 Corte de Señal* (persecución e inutilización de vehículo enemigo).
   - **Capítulo 3 · Ciudad Bajo Cero**: *3.1 Distracción en Tres Frentes* (puntos de control bajo búsqueda activa), *3.2 Ruta Sin Retorno* (transporte de pruebas y escape) y *3.3 El Último Convoy de Dávila* (intercepción táctica y cierre de campaña).
3. **Misiones Secundarias Opcionales**:
   - *SEC-01 Circuito Callejero Norte* (contrarreloj por puntos de control).
   - *SEC-02 Traslado Exprés Centro-Oeste* (transporte de pasajero).
   - *SEC-03 Encargo de Furgoneta Cargo* (robo y entrega de tipo de vehículo).
   - *SEC-04 Fuga Relámpago en Puerto Sur* (escape policial).
4. **Garajes Ampliados, Catálogo y Mejoras (`src/garage.js`)**:
   - Tres talleres operativos: **Garaje Central Cero**, **Taller Distrito Este** y **Garaje Puerto Sur**.
   - **Catálogo de Vehículos Desbloqueables** (adquiere nuevos modelos con dinero a medida que avanzas en la campaña y las secundarias).
   - **Mejoras de Taller**: *Blindaje Reforzado (+40 HP)*, *Turbo Calibrado (+12% velocidad/aceleración)* y *Cambio de Matrícula (-2★)*.
5. **Guardado Automático y Nueva Partida (`src/save.js`)**:
   - Persistencia automática en `localStorage` (`ciudad_cero_v04_save`) de capítulo, misiones completadas, dinero, vehículos desbloqueados y flota guardada.
   - Opción de **Nueva Partida** con diálogo de confirmación antes de reiniciar el progreso.

---

## Estructura del Proyecto

```text
ciudad_cero_v0.4/
├── index.html          # Interfaz completa, ventanas de diálogo, modales de historia/garaje y controles táctiles
├── README.md           # Documentación del proyecto
├── .gitignore          # Exclusiones de archivos temporales
└── src/
    ├── style.css       # Estilos responsivos para PC, Android y iPhone
    ├── config.js       # Capítulos, misiones, personajes, catálogo vehicular, policía y mapa
    ├── save.js         # Guardado y carga automática en localStorage
    ├── story.js        # Motor de campaña, diálogos, misiones principales y secundarias
    ├── audio.js        # Síntesis procedural Web Audio API (motor, sirenas, taller, misiones y diálogos)
    ├── input.js        # Teclado (PC) y Pointer Events multitáctiles (Android/iPhone)
    ├── world.js        # Generador de ciudad, edificios, parques, 3 garajes y 3 escondites
    ├── entities.js     # Jugador, vehículos civiles/policiales/objetivo, peatones y NPCs de historia
    ├── physics.js      # Colisiones OBB, línea de visión (raycast AABB), daño y salida segura
    ├── garage.js       # Flota guardada, reparaciones, catálogo desbloqueable y mejoras mecánicas
    ├── police.js       # IA policial de 5 niveles, bloqueos, persecuciones y vehículos fugitivos
    ├── renderer.js     # Renderizado Canvas 2D con NPCs, marcadores de misión, luces y minimapa
    ├── ui.js           # Controlador de HUD, diálogos, banner de recompensa y modales
    └── game.js         # Bucle principal (60 FPS) y sincronización de sistemas
```

---

## Cómo Ejecutar

1. Descomprime el archivo `ciudad_cero_v0.4.zip`.
2. Abre `index.html` directamente en cualquier navegador moderno (Chrome, Edge, Safari, Firefox) o sírvelo mediante un servidor estático local (`npx serve .` o `python3 -m http.server 8080`).
