# CIUDAD CERO v0.8.8 — WORLD REBUILD + URBAN DETAIL

Versión construida directamente sobre `CIUDAD_CERO_V0.8.7_FIX`, conservando los sistemas de juego y la integración POLICE INTELLIGENCE.

## Objetivo de la versión: renovación masiva del mapa

- Reorganización de las huellas de edificios por parcela: los bloques ya no se representan únicamente como un rectángulo grande.
- Centro urbano con torres, anexos y podios en distintas posiciones, creando manzanas de densidad y siluetas variadas.
- Barrio residencial con viviendas pareadas, pequeños conjuntos y patios interiores.
- Barrio comercial y Loston con tiras de locales, esquinas comerciales y patios peatonales.
- Zona industrial y portuaria con naves longitudinales, anexos de servicio y patios abiertos.
- Periferia de baja densidad con casas aisladas y lotes amplios.
- Se mantienen las calles, intersecciones, semáforos, puentes, agua, parques, callejones, garajes, escondites y coordenadas del mundo para no romper navegación, tráfico, colisiones ni misiones.
- Se conservan los sistemas policiales y el resto de funcionalidades de la versión base.

## Archivos modificados

- `src/world.js`: generación de huellas urbanas por parcela y distribución de edificios.
- `src/cityart.js`: selección visual de locales de Loston, nueva capa de infraestructura de azoteas por distrito, paneles solares, climatización, lucarnas, ventiladores, tanques y respiraderos; microdetalles de veredas y pavimentos.
- `index.html`: identificación de versión y actualización de la etiqueta del menú.
- `README.md`: documentación de la versión.

## Validación técnica

- Sintaxis de todos los archivos JavaScript comprobada con `node --check`.
- Referencias locales de scripts y estilos verificadas.
- Integridad del ZIP verificada.

La validación de sintaxis no reemplaza una prueba completa en navegador ni una revisión visual en el dispositivo objetivo. Se recomienda probar el arranque, conducción, tráfico, peatones, colisiones y mapa completo en el dispositivo objetivo. La nueva decoración se dibuja en las cachés estáticas del mapa para evitar trabajo adicional en cada fotograma.
