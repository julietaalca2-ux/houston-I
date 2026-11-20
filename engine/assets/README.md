# Asset Pipeline — CIUDAD ENGINE 0.2.0

`CiudadEngine.runtime.assets` carga modelos GLB/GLTF de forma asíncrona y registra el resultado en el registro central de recursos.

## Ejemplo

```js
const asset = await CiudadEngine.runtime.assets.loadGLB(
  'player-police',
  'assets/characters/player-police.glb',
  { onProgress(event) {
      if (event.lengthComputable) console.log(Math.round(event.loaded / event.total * 100) + '%');
  }}
);

const playerModel = CiudadEngine.runtime.assets.addToScene(
  'player-police', CiudadEngine.runtime.scene,
  { name: 'PlayerModel', scale: 1 }
);
```

## Eventos

- `asset:load-start`
- `asset:progress`
- `asset:loaded`
- `asset:load-error`
- `asset:instance-created`
- `asset:unloaded`

## Consideraciones

- GLTFLoader se importa de forma diferida en la primera carga.
- La versión del loader está fijada a Three.js r160 para coincidir con el juego.
- Las peticiones simultáneas del mismo ID comparten una promesa; los recursos ya cargados se reutilizan.
- `createInstance()` clona el árbol de escena. Para múltiples personajes con esqueletos animados independientes, se deberá incorporar clonación específica de esqueletos en una fase posterior.
- `unload(id, { dispose: true })` libera geometrías, materiales y texturas del recurso almacenado. No debe ejecutarse mientras existan instancias activas que compartan esos recursos.
- Los modelos deben estar alojados en el mismo origen o en un servidor con CORS habilitado.
