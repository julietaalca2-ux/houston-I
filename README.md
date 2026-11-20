# CIUDAD CERO — Versión 0.8.5: NPC Intelligence

## Base y conservación

Esta versión parte del ZIP completo V0.8.4. Conserva Loston, el puente, el mapa, las misiones, el sistema de salud, colisiones, guardado y los módulos existentes. No agrega dependencias externas ni cambia el formato de las partidas guardadas.

## Novedades de la V0.8.5

- Nuevo módulo `src/npc_ai.js` para decisiones de peatones ambientales.
- Detección anticipada de vehículos que se aproximan, considerando distancia, velocidad y dirección de movimiento.
- Reacciones de evasión y pánico con una dirección de escape ligeramente variable para evitar que todos huyan en línea recta.
- Separación local entre peatones para reducir amontonamientos.
- Los peatones pueden apartarse de Mateo cuando camina cerca.
- Los agentes de policía a pie mantienen su reacción ante un jugador buscado.
- Se conservan los impactos, atropellos, efectos y tiempos de derribo heredados de V0.8.4.
- La IA funciona localmente, sin servicios externos ni conexión permanente.

## Compatibilidad y límites

- Los NPC principales de la historia mantienen sus posiciones y su lógica de interacción para no alterar misiones ni diálogos.
- Esta entrega mejora principalmente la inteligencia de peatones ambientales; todavía no incorpora horarios completos de casa/trabajo para personajes principales, conversaciones autónomas entre NPC ni navegación global con búsqueda de rutas.
- No se modifican claves ni estructuras del guardado.

## Archivos de la V0.8.5

- `index.html`: carga el nuevo módulo y muestra la versión actualizada.
- `src/npc_ai.js`: nuevo controlador de comportamiento peatonal.
- `src/entities.js`: inicializa los estados internos de IA de cada peatón.
- `src/game.js`: integra la IA con tráfico, peatones, policía y física existentes.
- `README.md`: documentación de la actualización.

## Comprobaciones realizadas

- Sintaxis JavaScript comprobada con `node --check` para todos los módulos.
- Referencias de scripts locales comprobadas contra los archivos del ZIP.
- Integridad del ZIP comprobada.
- No se ejecutó una partida gráfica completa en navegador o teléfono; se recomienda probar tráfico denso, peatones cerca del jugador y situaciones de atropello antes de publicar.
