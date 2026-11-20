# CIUDAD CERO — Versión 0.6: Rediseño Visual de Personajes y NPC

**Saga Original · Juego 01 · Acción, Historia y Conducción Cenital 2D**

**Ciudad Cero v0.6** evoluciona directamente sobre la base jugable de la v0.5 con un **rediseño visual integral del protagonista, los personajes principales/secundarios de la historia, los ciudadanos NPC y los policías a pie**, incorporando modelos cenitales 2D articulados con silueta, vestimenta, peinados, accesorios, animaciones fluidas de movimiento y retratos vectoriales personalizados en diálogos y archivos narrativos, manteniendo intactas todas las mecánicas, misiones, controles y partidas guardadas.

---

## Novedades de la Versión 0.6

1. **Rediseño Visual del Protagonista — Mateo "Cero" Vega**:
   - Modelo cenital 2D articulado con cabeza proporcionada, cabello oscuro peinado hacia atrás con reflejos, chaqueta táctica verde oliva con cuello y franjas lima (`#d6f36a`), guantes de piloto, brazos con braceo dinámico y calzado animado en zancada.
   - **Orientación e interacción claras**: interpolación angular suave al girar, respiración en reposo (`idle`), zancada amplia y estela sutil de polvo al esprintar, transición visual al abrir la puerta y subir/bajar de vehículos, y silueta visible en el asiento del conductor tras el parabrisas.
2. **Personajes de Historia Diferenciados en Mundo y Retratos**:
   - **Nora "Llave" Salgado**: Overol amarillo de mecánica sobre camiseta oscura, rodete recogido y llave inglesa en mano.
   - **Ramiro "El Sastre" Mendoza**: Traje sastre azul pizarra con cuello impecable, cabello engominado y maletín ejecutivo.
   - **Valeria "Chispa" Quiroga**: Chaqueta tecnológica esmeralda con ribetes cian, corte asimétrico borgoña, visor AR luminoso y escáner portátil.
   - **Donato "Muelle" Ríos**: Complexión robusta, chaleco portuario naranja de alta visibilidad con bandas reflejantes, gorra de capataz y portapapeles de carga.
   - **Elena "Ruta" Vargas**: Chaqueta de carreras carmesí con franjas blancas, coleta alta oscura y cronómetro de competición.
   - **Comisario Héctor Dávila**: Retrato y presencia táctica con uniforme azul marino de comandante, charreteras doradas/rojas y gorra oficial con insignia.
   - **Orientación hacia el jugador**: Los personajes en el mundo giran suavemente su mirada hacia Mateo cuando se acerca e incluyen retratos vectoriales SVG personalizados en diálogos y en la pestaña *Historia → Personajes*.
3. **Variedad de NPC Ciudadanos y Policías a Pie**:
   - Peatones articulados con distintos tonos de piel, peinados, complexión, vestimenta y accesorios según el barrio: **ejecutivos** con traje y maletín, **trabajadores portuarios e industriales** con casco de obra amarillo/blanco, chaleco reflejante o cajas de carga, **compradores** con bolsas coloridas, **vecinos** con sudaderas/mochilas y **policías a pie** con uniforme naval, gorra con placa y radio patrullando zonas clave.
   - Reacciones visuales de alerta (`!`) y huida rápida ante vehículos cercanos o bocinas.
4. **Rendimiento Móvil y Compatibilidad Total de Guardado**:
   - Nuevo módulo `src/characters.js` optimizado para Canvas 2D a 60 FPS en **PC**, **Android** e **iPhone Safari**, respetando los modos gráficos `Alta` y `Rendimiento`.
   - Carga y migra automáticamente partidas guardadas desde `ciudad_cero_v05_save` y `ciudad_cero_v04_save` hacia `ciudad_cero_v06_save`.

---

## Cómo Ejecutar

1. Descomprime `ciudad_cero_v0.6.zip`.
2. Abre `index.html` en cualquier navegador moderno (Chrome, Safari, Edge, Firefox) o sírvelo con un servidor local (`npx serve .` o `python3 -m http.server 8080`).
