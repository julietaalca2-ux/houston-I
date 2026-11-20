(function (global) {
  'use strict';
  const namespace = global.CiudadEngine = global.CiudadEngine || {};

  class CharacterManager {
    constructor(engine, options) {
      if (!engine || !engine.world || !engine.assets) throw new TypeError('CharacterManager requires a CiudadEngine instance');
      this.engine = engine;
      this.options = options || {};
      this.characters = new Map();
      this.skeletonUtilsPromise = null;
    }
    async _cloneModel(source) {
      if (!global.THREE) throw new Error('Three.js must be loaded before creating a character');
      if (!this.skeletonUtilsPromise) {
        const url = this.options.skeletonUtilsUrl || 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/utils/SkeletonUtils.js';
        this.skeletonUtilsPromise = import(url).then((module) => {
          if (typeof module.clone !== 'function') throw new Error('SkeletonUtils.clone is unavailable');
          return module.clone;
        }).catch((error) => { this.skeletonUtilsPromise = null; throw error; });
      }
      const clone = await this.skeletonUtilsPromise;
      return clone(source);
    }
    async create(config) {
      const options = config || {};
      if (!options.id || !options.assetId || !options.url) throw new Error('Character id, assetId and model url are required');
      if (this.characters.has(String(options.id))) throw new Error('Character already exists: ' + options.id);
      const asset = await this.engine.assets.loadGLB(options.assetId, options.url, options);
      const model = await this._cloneModel(asset.scene);
      model.name = options.name || String(options.id);
      const position = options.position || {};
      model.position.set(Number(position.x) || 0, Number(position.y) || 0, Number(position.z) || 0);
      if (Number.isFinite(options.scale)) model.scale.setScalar(options.scale);
      if (options.rotationY) model.rotation.y = options.rotationY;
      const entity = this.engine.world.createEntity(options.name || String(options.id));
      this.engine.world.addComponent(entity, 'Character', {
        characterId: String(options.id), assetId: String(options.assetId), role: options.role || 'npc'
      });
      this.engine.world.addComponent(entity, 'Transform', {
        x: model.position.x, y: model.position.y, z: model.position.z, rotationY: model.rotation.y
      });
      this.engine.world.addComponent(entity, 'CharacterVisual', { object: model });
      const mixer = asset.animations.length ? new global.THREE.AnimationMixer(model) : null;
      const actions = Object.create(null);
      if (mixer) asset.animations.forEach((clip, index) => {
        const key = clip.name || 'animation_' + index;
        actions[key] = mixer.clipAction(clip);
      });
      if (mixer) this.engine.characterSystem.register(entity, mixer, actions);
      if (this.engine.scene) this.engine.scene.add(model);
      const record = { id: String(options.id), entity, model, mixer, actions, asset };
      this.characters.set(record.id, record);
      this.engine.events.emit('character:created', { entity, model, animationNames: Object.keys(actions) });
      if (options.initialAnimation) this.play(record.id, options.initialAnimation);
      return record;
    }
    play(id, animationName, options) { return this.engine.characterSystem.play(this.characters.get(String(id))?.entity, animationName, options); }
    setPosition(id, position) {
      const record = this.characters.get(String(id));
      if (!record || !position) return false;
      const x = Number(position.x), y = Number(position.y), z = Number(position.z);
      if (Number.isFinite(x)) record.model.position.x = x;
      if (Number.isFinite(y)) record.model.position.y = y;
      if (Number.isFinite(z)) record.model.position.z = z;
      const transform = this.engine.world.getComponent(record.entity, 'Transform');
      Object.assign(transform, { x: record.model.position.x, y: record.model.position.y, z: record.model.position.z });
      return true;
    }
    remove(id, options) {
      const key = String(id), record = this.characters.get(key);
      if (!record) return false;
      this.engine.characterSystem.unregister(record.entity);
      if (record.model.parent) record.model.parent.remove(record.model);
      this.engine.world.removeEntity(record.entity);
      if (options && options.dispose) this._disposeModel(record.model);
      this.characters.delete(key);
      this.engine.events.emit('character:removed', { id: key });
      return true;
    }
    _disposeModel(root) {
      const geometries = new Set(), materials = new Set();
      root.traverse((node) => {
        if (node.geometry) geometries.add(node.geometry);
        (Array.isArray(node.material) ? node.material : [node.material]).filter(Boolean).forEach((mat) => materials.add(mat));
      });
      geometries.forEach((item) => item.dispose());
      materials.forEach((item) => item.dispose());
    }
    get(id) { return this.characters.get(String(id)) || null; }
    getCount() { return this.characters.size; }
    dispose() { Array.from(this.characters.keys()).forEach((id) => this.remove(id)); }
  }
  namespace.CharacterManager = CharacterManager;
})(window);
