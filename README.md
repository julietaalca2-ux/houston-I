# CIUDAD CERO — Versión 0.7: Infraestructura Urbana, Semáforos Inteligentes y Mapas Mejorados

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
