# CIUDAD CERO V0.21.0 — edición de descarga optimizada

Esta edición conserva el proyecto completo y ajusta la biblioteca de texturas para facilitar la descarga y reducir memoria gráfica:

- Biblioteca de materiales V0.19: JPEG 2K optimizado.
- Biblioteca de expansión V0.21: JPEG 4K optimizado (la biblioteca original era 8K).
- Las rutas están conectadas al renderizador; el perfil Ultra de escritorio carga variantes 4K.
- Los perfiles móviles no cargan el paquete Ultra y conservan texturas base y fallbacks procedurales.

Es un proyecto completo, no un ZIP dividido ni archivos de relleno.
