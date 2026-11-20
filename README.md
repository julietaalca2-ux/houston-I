# CIUDAD CERO — Versión 0.7.9: Pulido Integral (Ciudad, Física, Tráfico, Policía y Móvil)

## Novedades de la Versión 0.7.9

1. **Gráficos urbanos, edificios y parques perfeccionados** (`src/cityart.js`, `src/renderer.js`):
   - **Árboles y vegetación con doble penumbra**: Sombras proyectadas más suaves y naturales, copas con contraste solar y detalles foliares en roble, arce, cerezo, olivo, pino, álamo y palmera.
   - **Parques y plazas**: Pérgolas arquitectónicas en parques grandes, senderos con borde de piedra, fuentes y jardines floridos.
   - **Calles y veredas**: Rampas peatonales táctiles en las 4 esquinas de cada manzana y franjas de color por barrio sobre el cordón.
2. **Vehículos, tráfico inteligente y peatones** (`src/game.js`, `src/entities.js`, `src/renderer.js`):
   - **Dirección y ruedas delanteras**: Curva de giro progresiva según velocidad, estabilidad a alta velocidad y giro visual visible de las ruedas delanteras al doblar.
   - **Tráfico sin atascos**: Giros suaves en esquinas, prevención automática de bloqueos mutuos en intersecciones y respeto a semáforos y sirenas.
   - **Peatones más naturales**: Espera segura en el cordón antes de cruzar si se acercan vehículos rápidos y reacción al bocinazo para despejar la calzada.
3. **Policía y persecuciones más dinámicas** (`src/police.js`):
   - Sensores laterales ampliados para esquivar esquinas a alta velocidad y maniobra automática de desatasco en retroceso si una patrulla queda bloqueada.
4. **Personajes, HUD, Mapa y Estabilidad Móvil** (`src/characters.js`, `src/ui.js`, `src/style.css`, `src/save.js`):
   - Indicador direccional en el anillo de Mateo y leve inclinación al esprintar.
   - Minimapa con indicador cardinal (`N`) y marco de cámara; mapa ampliado con barrio de destino en la ruta GPS.
   - Alerta visual cuando el vehículo tiene baja integridad (`≤ 30% HP`), protección ante cambios de pestaña (`visibilitychange`), bloqueo de gestos táctiles accidentales en Android/iPhone y compatibilidad total con partidas guardadas de v0.7.5 y anteriores.

---

# CIUDAD CERO — Versión 0.7.5: Ciudad Viva (Fachadas, Parques y Barrios)

## Novedades de la Versión 0.7.5

1. **Nuevo módulo visual procedural (`src/cityart.js`)**:
   - **Edificios y casas diferenciados por barrio**:
     - *Residencial*: casas unifamiliares con techos a dos aguas de teja, chimeneas, patios y departamentos con balcones y tendederos.
     - *Centro Urbano*: torres de cristal y acero con muros cortina, ventanas iluminadas, cornisas y azoteas técnicas.
     - *Comercial*: locales con escaparates luminosos, toldos rayados de colores, carteles de neón y terrazas con mesas y sombrillas.
     - *Zona Portuaria*: almacenes con techos metálicos acanalados, muelles de carga, patios de contenedores apilados y grúas.
     - *Zona Industrial*: fábricas con dientes de sierra, silos cilíndricos, chimeneas humeantes y pasarelas metálicas.
     - *Periferia*: granjas y galpones rurales con tejados de chapa, silos pequeños y árboles dispersos.
   - **Parques variados y vegetación 2D**:
     - Parques grandes, medianos y pequeños con caminos curvos, canteros de flores, bancos, farolas, fuentes de agua y estanques.
     - Especies de árboles con volumen y sombra proyectada: roble, arce, cerezo en flor, olivo, pino, álamo y palmera.
   - **Veredas y mobiliario por barrio**:
     - Patrones de pavimento propios (ladrillo en espiga, granito pulido, damero comercial, hormigón húmedo portuario, chapa industrial y grava periférica), jardineras, jardines de bolsillo, bolardos y barriles.
   - **Mapa y minimapa mejorados**:
     - Caché de mapa base con tintes por barrio, parques destacados, bordes de distrito y etiquetas legibles.

---

# CIUDAD CERO — Versión 0.7: Infraestructura Urbana y Tráfico Inteligente

## Novedades de la Versión 0.7

1. **Infraestructura Vial Realista (`src/renderer.js`, `src/world.js`)**:
   - **Textura de asfalto procedural** con grano mineral y juntas bituminosas, veredas de losetas texturizadas con cordones con sombra 3D y esquinas redondeadas.
   - **Calles principales vs secundarias**: las avenidas pares lucen doble línea amarilla continua y marcas de carril; las calles locales conservan línea discontinua blanca.
   - **Sendas peatonales y líneas de detención**: pasos de cebra blancos en los accesos de cada intersección y líneas de frenado previas.
   - **Mobiliario urbano**: farolas callejeras con halo luminoso cálido, hidrantes, paradas de autobús, bancos y carteles luminosos comerciales.
2. **Semáforos Sincronizados de 4 Vías (`src/world.js`, `src/renderer.js`, `src/game.js`)**:
   - Controladores de tráfico sincronizados en las intersecciones principales con fases **Verde → Amarillo → Rojo** e indicadores peatonales **CRUCE / ALTO**.
   - Semáforos visibles tanto en el mundo 2D (con halo de luz real) como en el minimapa y mapa ampliado.
3. **Tráfico y Peatones Inteligentes (`src/game.js`, `src/entities.js`)**:
   - **Detección de semáforos**: los vehículos civiles frenan suavemente ante la luz roja y amarilla, mantienen distancia de seguridad en fila y arrancan de forma escalonada al cambiar a verde.
   - **Cruce peatonal inteligente y prioridad de emergencia**: los vehículos ceden el paso ante peatones en la calzada y reducen la velocidad cuando una patrulla policial pasa con sirena activa.
4. **Mapa Interactivo con Navegación GPS (`src/ui.js`, `src/renderer.js`, `src/game.js`)**:
   - Toca o haz clic en cualquier punto del mapa ampliado (`[M]`), barrio o lugar destacado para fijar una **ruta GPS personalizada** visible en el minimapa, en el mapa completo y con flecha direccional en pantalla.

## Cómo ejecutar

Abre `index.html` directamente en cualquier navegador moderno de PC o celular, o publícalo como sitio estático en GitHub Pages / Vercel.
