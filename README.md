# CIUDAD CERO V0.8.9 — CHARACTER DETAIL UPDATE

Actualización visual de personajes sobre la base TPS FIX.

## Cambios
- Protagonista con anatomía estilizada: cabeza, rostro, ojos, nariz, boca, orejas y cabello.
- Ropa diferenciada por capas: torso, pantalón, cuello, puños y calzado.
- Brazos y piernas articulados con animación procedural de caminata.
- Peatones con variaciones de tonos de piel, cabello y ropa.
- Policías con uniforme, insignia y cinturón visuales.
- NPCs de misiones con variaciones de vestuario.
- Se mantiene la cámara TPS, controles, mundo, vehículos, misiones y sistemas existentes.

Los modelos son geometría 3D suavizada y articulada, no modelos humanos escaneados ni personajes de alta resolución. La animación es procedural.

## Validación
Se revisó la sintaxis de JavaScript y la integridad del ZIP. La apariencia y rendimiento deben probarse dentro del navegador, especialmente en dispositivos móviles.


## V0.8.9 — TOUCH CONTROL & MOVEMENT FIX
- El joystick táctil controla únicamente el desplazamiento del personaje.
- La cámara 3D solo gira al arrastrar directamente sobre el área del mundo.
- Los eventos táctiles del joystick ya no se propagan al control de cámara.
- Movimiento relativo a la orientación absoluta de la cámara, sin realimentación con el ángulo del personaje.
- Sensibilidad de cámara reducida y eje vertical suavizado.
- Aceleración y frenado a pie suavizados; velocidades de caminata/carrera y peatones reajustadas.
