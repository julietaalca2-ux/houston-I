# CIUDAD CERO v0.8.7 — POLICE INTELLIGENCE

Actualización integrada del sistema policial sobre la base del proyecto v0.8.6.

## Sistemas incluidos

- Patrullaje ambiental sin persecución cuando el nivel de búsqueda está en cero.
- Variación de velocidad y comportamiento de circulación para evitar patrullas sincronizadas.
- Cinco niveles de búsqueda con refuerzos progresivos y unidades especializadas.
- Persecución vehicular, interceptación, búsqueda de última ubicación y pérdida gradual de interés.
- Bloqueos de calles en niveles altos de alerta.
- Patrulleros que pueden detenerse y desplegar agentes a pie como apoyo durante una alerta cercana.
- Agentes a pie que patrullan, reciben el último punto conocido, avanzan hacia la zona, contienen al jugador y regresan al vehículo al finalizar la alerta.
- Coordinación básica entre unidades mediante objetivos compartidos, despliegue con enfriamiento y roles de patrulla/interceptor/apoyo.
- Detención arcade no gráfica mediante proximidad y control de la situación.
- HUD, notificaciones y audio de alerta conectados al sistema existente.

## Archivos principales modificados

- `src/police.js`: despacho, despliegue y retorno de agentes, persecución, búsqueda y detención.
- `src/npc_ai.js`: integración de estados de agentes desplegados con la IA peatonal.
- `src/game.js`: creación y registro de agentes de apoyo.
- `src/entities.js` y `src/config.js`: datos de patrullas y unidades.
- `index.html`: versión visible del proyecto.

## Validación

- Se verificó la sintaxis de los archivos JavaScript con `node --check`.
- Se verificaron las referencias locales de scripts y estilos del HTML.
- Se verificó la integridad del ZIP.

Nota: la IA y los sistemas se integran en el código del juego; el comportamiento final debe probarse también ejecutando el juego en navegador para ajustar balance, rutas y rendimiento.
