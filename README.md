# CIUDAD CERO V0.8.9 — TPS CAMERA CONTROL FIX

Actualización incremental sobre V0.8.9_TPS.

## Mejoras de cámara y control
- Movimiento a pie relativo a la orientación horizontal de la cámara: joystick arriba avanza hacia donde mira la cámara y los laterales se interpretan respecto de esa vista.
- Giro de cámara más suave y preciso mediante arrastre.
- Rango de giro completo alrededor del protagonista.
- Inclinación vertical más controlada.
- Cámara algo más alejada para dar espacio de lectura y seguimiento más estable.
- Mantiene el fallback 2D cuando WebGL/Three.js no está disponible.

## Instalación
Reemplazar los archivos del repositorio por los de este ZIP conservando la estructura `src/`.

## Validación
Comprobar sintaxis JavaScript y estructura ZIP. La prueba visual final debe hacerse en navegador/dispositivo.
