# CIUDAD CERO — Versión 0.8.3: Loston y Puente Costero

## Base y conservación

Esta versión es una evolución directa del proyecto V0.8.2 adjuntado como base. Conserva los 18 archivos del proyecto, la estructura de carga por scripts, los sistemas de juego, la clave de guardado existente y la compatibilidad de lectura con partidas anteriores. No se agregan dependencias ni recursos externos.

## Novedades de la V0.8.3

- Nueva isla urbana Loston, al este de la ciudad original, rodeada por agua.
- Tres barrios: Loston Norte, Loston Centro y Loston Costero.
- Puente vial de doble sentido que conecta la ciudad original con Loston.
- Calzadas, veredas, edificios, parques, palmeras, mobiliario y callejones propios de la isla.
- GPS vial que evita el mar y cruza el canal únicamente por el puente.
- Minimap y mapa ampliado con proporción corregida para mostrar la expansión completa.
- Tráfico y peatones pueden aparecer en Loston; los vehículos no se generan en el agua.

## Novedades heredadas de la V0.8.2

- Se conserva la red vial, los siete callejones originales y se agregan cinco pasajes transitables nuevos: Pasaje de la Estación, Callejón del Astillero, Pasaje de la Torre Norte, Callejón de los Talleres Sur y Pasaje del Bulevar Este.
- Los doce callejones se dibujan con bordes, canaletas, marcas de acceso, reflectores y umbrales peatonales. También aparecen con mayor claridad en el minimapa.
- Se refuerza la lectura de las avenidas con pequeños reflectores de centro de calzada y flechas direccionales antes de las intersecciones principales.
- Se mejoran las rampas de accesibilidad con relieve táctil más visible, bordes biselados y juntas adicionales en las veredas.
- Se mantiene la cuadrícula vial, el sistema GPS, las colisiones, las tiendas, los asaltos, el inventario y la compatibilidad de guardado de la base V0.8.1.

## Novedades de esta entrega

- Dos armerías, ubicadas en Centro Urbano y Zona Industrial, con compra y equipamiento de tres tipos de arma y paquetes de munición.
- Dos comercios asaltables, en los barrios Comercial y Portuario. El asalto requiere llevar un arma equipada y al menos una munición, consume una munición y entrega una recompensa, genera 2 estrellas de búsqueda policial y aplica un tiempo de recuperación por local.
- Inventario y enfriamientos de los comercios guardados en la partida.
- GPS recalculado sobre la cuadrícula de calles e intersecciones. La ruta se dibuja con tramos ortogonales sobre la calzada y evita los atajos diagonales a través de manzanas y edificios.
- Minimapa ampliado y con mayor legibilidad, marcadores de comercios y ruta vial; el mapa ampliado también muestra los comercios y permite fijarlos como destinos GPS.
- Compatibilidad de lectura con partidas anteriores de Ciudad Cero.
- La compra/equipamiento y la munición quedan implementados como inventario; esta versión no incorpora todavía mecánicas de disparo.

## Archivos modificados en V0.8.3

- `index.html` y `README.md`: identificación y documentación de versión.
- `src/config.js`: dimensión ampliada del mundo, distrito Loston, tres barrios, hitos y rótulos viales.
- `src/world.js`: generación de la isla, agua perimetral, puente, calles, callejones, parques, edificios y nodos peatonales; el A* evita el agua.
- `src/renderer.js`: mar, tablero y barandas del puente, etiquetas de barrios, mapa ampliado en seis teselas de tamaño apto para móviles.
- `src/cityart.js`: minimapa de Loston, barrios, agua y puente.
- `src/entities.js`: peatones con apariencia de Loston y tráfico/policía que no se generan sobre agua.
- `src/game.js`: área táctil del minimapa adaptada a su nueva proporción.

Los otros módulos de `src/` se conservan sin cambios respecto de la base V0.8.2. Todos los recursos de la isla se dibujan proceduralmente; no se incorporan imágenes externas.

## Estructura

- `index.html`
- `README.md`
- `src/` — 15 módulos JavaScript y la hoja de estilos `style.css`.

## Ejecución

Abrí `index.html` en un navegador moderno. Si el navegador restringe la carga local, ejecutá un servidor estático desde la carpeta del proyecto, por ejemplo `python3 -m http.server 8080`, y abrí `http://localhost:8080`.

---

# CIUDAD CERO — Versión 0.7.5: Ciudad Viva (Fachadas, Parques, Árboles y Barrios con Personalidad)

## Novedades de la Versión 0.7.5

1. **Edificios y casas rediseñados** (`src/cityart.js`): fachadas con ventanas, puertas, balcones, techos a dos aguas con tejas y chimeneas, edificios de departamentos, rascacielos con muro cortina y helipuerto, locales con toldos y carteles de neón, galpones con portones, fábricas con silos y chimeneas, casas rurales con paneles solares. Todos con sombras proyectadas, bordes biselados y texturas.
2. **Parques grandes, medianos y pequeños**: césped texturizado con franjas de corte, setos, caminos, fuentes, estanques, canteros de flores, bancos, farolas, arbustos y árboles. Plazas duras con adoquín en Centro y Comercial. Jardines de bolsillo sobre las veredas.
3. **Árboles con volumen**: 7 especies (roble, arce, cerezo en flor, olivo, pino, álamo, palmera), copas con lóbulos y luces, sombras y troncos con corteza.
4. **Mapa y minimapa mejorados**: el minimapa dibuja calles/avenidas, manzanas por barrio, edificios, parques y agua desde una caché; el mapa ampliado suma un velo de color por barrio.
5. **Barrios diferenciados**: veredas propias (ladrillo, granito, damero, hormigón húmedo, chapa, grava), franjas de color en cordones y mobiliario propio de cada zona.

Todo el arte se dibuja una sola vez en la caché estática del mapa: sin costo extra por fotograma. En modo *rendimiento* se reduce el detalle. Las partidas de v0.7 y anteriores se cargan sin cambios (misma clave de guardado).

---

## Base: Versión 0.7 — Infraestructura Urbana, Semáforos Inteligentes y Mapas Mejorados

**Saga Original · Juego 01 · Acción, Historia y Conducción Cenital 2D**

**Ciudad Cero v0.7** evoluciona directamente sobre la base de la v0.6 con una **renovación integral de la infraestructura vial y urbana**, incorporando **asfalto texturizado procedural, veredas con baldosas, cordones con bisel 3D, rampas peatonales, mobiliario urbano, red sincronizada de semáforos funcionales de 3 luces, tráfico inteligente que respeta las señales y mapas mejorados (minimapa y mapa ampliado interactivo)**, conservando intactas todas las mecánicas, personajes, historia, persecuciones policiales, garajes, controles táctiles y partidas guardadas.

---

## Novedades de la Versión 0.7

1. **Asfalto Texturizado, Señalización Vial, Veredas y Cordones**:
   - **Textura de asfalto procedural**: Grano mineral, microporos, juntas bituminosas y huellas de rodadura en carriles principales para una superficie urbana realista optimizada con caché de cuadrantes.
   - **Jerarquía vial completa**: Doble línea amarilla continua en avenidas principales, línea discontinua en calles secundarias, líneas blancas de borde de calzada, **líneas blancas de detención** ante cada intersección, sendas peatonales tipo cebra, tapas de alcantarilla y rejillas pluviales.
   - **Veredas y cordones con relieve 3D**: Veredas elevadas con trama de baldosas de hormigón, bisel iluminado superior/izquierdo, sombra de cuneta exterior, rampas táctiles en las esquinas, cordones de seguridad amarillo/negro en zonas portuarias e industriales y mobiliario urbano (hidrantes, paradas de colectivo, bancos y árboles).
2. **Semáforos Funcionales Sincronizados (Rojo · Amarillo · Verde)**:
   - Postes galvanizados en las 4 esquinas de las intersecciones de avenida con brazos voladizos sobre los carriles y **cabezales de 3 luces (Rojo, Amarillo y Verde)** con halo luminoso, visera oscura, indicador peatonal en poste e iluminación dinámica sobre la línea de detención.
   - Coordinación de **onda verde progresiva** a lo largo de las avenidas principales.
3. **Tráfico Inteligente que Respeta Señales y Peatones**:
   - **Detención en luz roja y amarilla**: Los vehículos civiles frenan suavemente detrás de la línea blanca de detención, forman filas ordenadas y arrancan con reacción escalonada natural al cambiar a verde. Si un vehículo ya cruzó el umbral al ponerse amarillo, completa el cruce sin bloquear la intersección.
   - **Ceda el paso a peatones y sirenas**: El tráfico detecta peatones cruzando la calzada y reduce velocidad orillándose ligeramente cuando se aproxima una patrulla policial con sirenas encendidas.
4. **Minimapa y Mapa Ampliado Interactivos Mejorados**:
   - **Minimapa en tiempo real**: Muestra retícula de avenidas, semáforos activos en vivo (`🟢/🟡/🔴`), línea de ruta GPS punteada hacia el destino y perímetros de búsqueda policial.
   - **Mapa Ampliado (`[M]` o tocando el minimapa)**: Incluye nombres de avenidas principales (`AV. CERO`, `AV. CENTRAL`, `BULEVAR ESTE`, `AV. DE LOS MUELLES`, `RUTA INDUSTRIAL`, `AUTOPISTA PERIFÉRICA`), estado de semáforos en vivo, línea de ruta GPS con distancia en metros, zoom con rueda/botones y accesos directos tanto a los **6 barrios** como a los **12 puntos de interés**.
5. **Compatibilidad Total de Guardado**:
   - Carga y migra automáticamente partidas guardadas desde `ciudad_cero_v06_save`, `ciudad_cero_v05_save` y `ciudad_cero_v04_save` hacia `ciudad_cero_v07_save`.

---

## Cómo Ejecutar

1. Descomprime `ciudad_cero_v0.7.zip`.
2. Abre `index.html` en cualquier navegador moderno (Chrome, Safari, Edge, Firefox) o sírvelo con un servidor local (`npx serve .` o `python3 -m http.server 8080`).



## Novedades V0.8.1 — Renovación vial (base de esta versión)

- Se incorporan siete callejones secundarios transitables, con aperturas físicas entre edificios y conexión con las calles perimetrales.
- Se refuerzan las marcas de cruces peatonales y líneas de detención.
- Se detallan las rampas de vereda con relieve táctil, cordones y bordes de calzada.
- Los callejones se representan también en el minimapa.
- Se conservan los sistemas de comercios, GPS vial, Loston, puente, guardado y misiones de la base V0.8.0.
