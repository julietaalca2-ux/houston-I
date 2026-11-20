# CIUDAD CERO v0.8.9 — FULL 3D GENERATION

## Objetivo
Primera migración del mundo de CIUDAD CERO desde la representación 2D hacia una escena tridimensional real mediante WebGL y Three.js.

## Cambios principales
- Nuevo `src/renderer3d.js`: construye una escena 3D con terreno, cuadrícula de avenidas, calzadas, veredas, agua, parques, árboles, edificios volumétricos, azoteas y bandas de ventanas.
- Alturas y perfiles arquitectónicos diferenciados por distrito: centro, comercial, Loston, residencial, periferia, industrial y portuario.
- Cámara en perspectiva que sigue al protagonista y se ajusta según vaya a pie o conduciendo.
- Representación 3D dinámica del protagonista, vehículos cercanos, peatones y NPCs.
- Iluminación hemisférica, luz direccional, sombras, niebla atmosférica y tone mapping.
- El motor de simulación original continúa controlando posiciones, tráfico, peatones, colisiones, misiones y policía. La nueva capa 3D representa ese estado; no reemplaza las reglas del juego.
- El renderer 2D anterior permanece como fallback si WebGL o Three.js no están disponibles.

## Dependencia
Se carga Three.js r160 desde jsDelivr (`https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js`). La primera carga requiere conexión a internet. Si la librería no se puede cargar o WebGL no está disponible, el juego conserva la vista 2D anterior en lugar de bloquear el inicio.

## Importante sobre el alcance
Esta es la primera etapa funcional de la migración 3D. Los sistemas del juego siguen usando coordenadas 2D internas y se proyectan a la escena 3D. Todavía no se han convertido todas las colisiones a volúmenes 3D ni se han modelado a mano interiores, animaciones esqueléticas, vehículos únicos, puentes detallados o edificios interiores. La cámara y la escena deben probarse en navegador móvil y escritorio para ajustar escala, rendimiento y encuadre.

## Validación
- Comprobar sintaxis de todos los archivos JavaScript con `node --check`.
- Verificar referencias locales del HTML.
- Verificar integridad del ZIP.
- La validación estática no sustituye una prueba visual real en navegador/iPhone.


## V0.8.9 — Cámara en tercera persona (TPS)
- Cámara colocada detrás y por encima del protagonista, con seguimiento suave.
- La cámara sigue la orientación del personaje a pie y del vehículo.
- Arrastrar sobre el mundo permite orbitar la cámara horizontalmente y ajustar su inclinación.
- Se corrigió la orientación visual de personajes y vehículos para alinearla con el rumbo de la simulación.
- Los controles táctiles existentes permanecen separados de la zona de arrastre de cámara.
