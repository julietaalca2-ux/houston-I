# CIUDAD CERO — Versión 0.5: Expansión Urbana e Interfaz Total

**Saga Original · Juego 01 · Acción, Historia y Conducción Cenital 2D**

**Ciudad Cero v0.5** amplía directamente la base jugable de la v0.4 con una **ciudad expandida 4x (`4800 x 3600` px) dividida en 6 barrios conectados**, **vida urbana dinámica con semáforos, estacionamientos, tráfico variado y peatones caracterizados**, **nueva interfaz a pantalla completa (`100vw x 100dvh`) sin encabezados permanentes**, **menú organizado por secciones (`Partida`, `Sonido`, `Controles Táctiles`, `Mapa`, `Configuración`)** y **mapa ampliado interactivo con GPS**, conservando intacto el progreso guardado de v0.4 y la compatibilidad completa en **PC**, **Android** e **iPhone**.

---

## Novedades de la Versión 0.5

1. **Ciudad Expandida en 6 Barrios Conectados (`4800 x 3600` px)**:
   - **Barrio Residencial**: Avenidas arboladas, Parque Central, viviendas de ladrillo y el Garaje Central Cero.
   - **Centro Urbano**: Rascacielos con helipuertos, Plaza Torre Cero, Comisaría Central y avenidas de alto tráfico.
   - **Barrio Comercial**: Galerías iluminadas, toldos coloridos, carteles de neón y el nuevo *Taller Bulevar Este*.
   - **Zona Portuaria**: Dársenas navegables, contenedores apilados, muelles del sur y almacenes aduaneros.
   - **Zona Industrial**: Naves metálicas, silos de almacenamiento, patios logísticos y el nuevo *Taller Zona Industrial*.
   - **Periferia de la Ciudad**: Autopista Periférica Sur, miradores abiertos, estación de ruta y galpones ocultos.
2. **Ciudad Más Viva y Rendimiento Móvil Optimizado**:
   - **Semáforos funcionales** en las principales intersecciones que regulan el tráfico civil.
   - **11 modelos de vehículos** (incluyendo *Compacto Urbano*, *Muscle V8 Clásico* y *Camión Portuario*), vehículos estacionados en playas de estacionamiento y mayor densidad de circulación.
   - **Peatones con apariencias diferenciadas por barrio** (ejecutivos con maletín, trabajadores con casco de obra, compradores y vecinos).
   - **Caché de mapa en 4 cuadrantes (`2400 x 1800`)** para garantizar fluidez a 60 FPS en Safari iOS, Android y navegadores de escritorio.
3. **Nueva Interfaz a Pantalla Completa**:
   - Eliminado el encabezado superior permanente: el juego aprovecha el 100% de la pantalla.
   - HUD flotante limpio con objetivo activo, indicador de barrio/avenida, saldo, estrellas de alerta y botón compacto `☰ MENÚ`.
4. **Menú Organizado por Secciones y Mapa Ampliado**:
   - **PARTIDA**: Guardar partida, cargar partida, reiniciar con confirmación y resumen detallado de progreso.
   - **SONIDO**: Activar/desactivar sonido, control deslizante de volumen general, música ambiental sintetizada y efectos de sonido independientes.
   - **CONTROLES TÁCTILES**: Activar/desactivar controles táctiles, mostrar u ocultar joystick (con cruceta alternativa), sensibilidad del joystick, tamaño, opacidad, modo de dirección en vehículo y disposición para zurdos/diestros.
   - **MAPA**: Mapa ampliado interactivo con zoom, desplazamiento, selección de destino GPS y directorio de los 6 barrios.
   - **CONFIGURACIÓN**: Minimapa en pantalla, indicador de barrio, calidad gráfica (`Alta` / `Rendimiento`) y autoguardado.
5. **Compatibilidad Total con Guardados de v0.4**:
   - Carga y migra automáticamente partidas guardadas en `ciudad_cero_v04_save` hacia `ciudad_cero_v05_save` sin reiniciar el progreso existente.

---

## Cómo Ejecutar

1. Descomprime `ciudad_cero_v0.5.zip`.
2. Abre `index.html` en cualquier navegador moderno (Chrome, Safari, Edge, Firefox) o sírvelo con un servidor local (`npx serve .` o `python3 -m http.server 8080`).
