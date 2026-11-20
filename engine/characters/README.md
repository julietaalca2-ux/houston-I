# Character System — CIUDAD ENGINE 0.4.0

La capa de personajes agrega una API opcional sobre ECS y AssetManager. No sustituye todavía los modelos procedurales ni las rutinas de personajes del juego existente.

## Crear un personaje GLB

```js
const character = await CiudadEngine.runtime.characters.create({
  id: 'mateo-model',
  name: 'Mateo',
  assetId: 'mateo-glb',
  url: 'assets/characters/mateo.glb',
  role: 'player',
  position: { x: 0, y: 0, z: 0 },
  initialAnimation: 'Idle'
});

CiudadEngine.runtime.characters.play('mateo-model', 'Walk');
CiudadEngine.runtime.characters.setPosition('mateo-model', { x: 2, y: 0, z: 4 });
```

- Cada instancia usa `SkeletonUtils.clone` para mantener esqueletos independientes.
- Los clips GLB se convierten en acciones de `AnimationMixer`; se reproducen por nombre de clip.
- `CharacterTransformSystem` sincroniza `Transform` con el objeto 3D.
- `CharacterAnimationSystem` actualiza mixers dentro del ciclo ECS.
- `remove(id)` elimina la entidad, la instancia y sus acciones. `remove(id, { dispose: true })` libera geometrías y materiales de esa instancia; no usarlo si otros modelos comparten recursos.

Los nombres de animación dependen de los clips incluidos en cada GLB. Para modelos sin clips, el personaje se crea igualmente, pero no tendrá animaciones. La clonación esquelética requiere acceso al módulo SkeletonUtils de Three.js r160.

## Alcance

Esta versión entrega la infraestructura de personajes. La migración del protagonista, NPC y personajes de misión del juego actual queda para una integración posterior y requiere modelos GLB compatibles.
