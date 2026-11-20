(function (global) {
  'use strict';
  const namespace = global.CiudadEngine = global.CiudadEngine || {};

  /** Asynchronous GLB/GLTF asset pipeline for CIUDAD ENGINE. */
  class AssetManager {
    constructor(registry, events, options) {
      this.registry = registry;
      this.events = events;
      this.options = options || {};
      this.loaderPromise = null;
      this.pending = new Map();
      this.disposed = false;
    }

    async _getLoader() {
      if (this.disposed) throw new Error('AssetManager has been disposed');
      if (this.loaderPromise) return this.loaderPromise;
      this.loaderPromise = (async () => {
        if (!global.THREE) throw new Error('Three.js must be loaded before loading 3D assets');
        if (global.THREE.GLTFLoader) return new global.THREE.GLTFLoader();
        const moduleUrl = this.options.loaderUrl ||
          'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/GLTFLoader.js';
        const module = await import(moduleUrl);
        if (typeof module.GLTFLoader !== 'function') throw new Error('GLTFLoader module is unavailable');
        return new module.GLTFLoader();
      })().catch((error) => { this.loaderPromise = null; throw error; });
      return this.loaderPromise;
    }

    loadGLB(id, url, options) {
      const key = String(id || '');
      if (!key) return Promise.reject(new Error('Asset id is required'));
      if (typeof url !== 'string' || !url.trim()) return Promise.reject(new Error('A GLB/GLTF URL is required'));
      if (this.disposed) return Promise.reject(new Error('AssetManager has been disposed'));
      const cached = this.registry.get(key);
      if (cached) return Promise.resolve(cached);
      if (this.pending.has(key)) return this.pending.get(key);
      const config = options || {};
      const task = this._getLoader().then((loader) => new Promise((resolve, reject) => {
        this.events.emit('asset:load-start', { id: key, url });
        loader.load(url, (gltf) => {
          const asset = {
            id: key, url, scene: gltf.scene, scenes: gltf.scenes || [gltf.scene],
            animations: gltf.animations || [], cameras: gltf.cameras || [],
            parser: gltf.parser || null, userData: gltf.userData || {}, loadedAt: Date.now()
          };
          this.registry.register(key, asset, {
            type: 'gltf', url, animationCount: asset.animations.length,
            sceneCount: asset.scenes.length
          });
          this.events.emit('asset:loaded', { id: key, asset });
          resolve(asset);
        }, (event) => {
          if (typeof config.onProgress === 'function') config.onProgress(event);
          this.events.emit('asset:progress', {
            id: key, loaded: event.loaded || 0, total: event.total || 0,
            lengthComputable: Boolean(event.lengthComputable)
          });
        }, (error) => {
          this.events.emit('asset:load-error', { id: key, error });
          reject(error instanceof Error ? error : new Error('Unable to load asset: ' + key));
        });
      })).finally(() => this.pending.delete(key));
      this.pending.set(key, task);
      return task;
    }

    createInstance(id, options) {
      const asset = this.registry.get(id);
      if (!asset || !asset.scene) throw new Error('Asset is not loaded: ' + id);
      const config = options || {};
      const root = asset.scene.clone(true);
      if (config.name) root.name = config.name;
      if (config.position && root.position) root.position.set(
        Number(config.position.x) || 0, Number(config.position.y) || 0, Number(config.position.z) || 0
      );
      if (config.scale && root.scale) {
        if (typeof config.scale === 'number') root.scale.setScalar(config.scale);
        else root.scale.set(Number(config.scale.x) || 1, Number(config.scale.y) || 1, Number(config.scale.z) || 1);
      }
      if (config.rotation && root.rotation) root.rotation.set(
        Number(config.rotation.x) || 0, Number(config.rotation.y) || 0, Number(config.rotation.z) || 0
      );
      return root;
    }

    addToScene(id, scene, options) {
      if (!scene || typeof scene.add !== 'function') throw new Error('A valid Three.js scene is required');
      const instance = this.createInstance(id, options);
      scene.add(instance);
      this.events.emit('asset:instance-created', { id: String(id), instance, scene });
      return instance;
    }

    unload(id, options) {
      const key = String(id);
      const asset = this.registry.get(key);
      if (!asset) return false;
      if (options && options.dispose) this._disposeAsset(asset);
      this.registry.remove(key);
      this.events.emit('asset:unloaded', { id: key });
      return true;
    }

    _disposeAsset(asset) {
      const geometries = new Set(), materials = new Set(), textures = new Set();
      (asset.scenes || [asset.scene]).forEach((root) => {
        if (!root || typeof root.traverse !== 'function') return;
        root.traverse((node) => {
          if (node.geometry) geometries.add(node.geometry);
          const list = Array.isArray(node.material) ? node.material : (node.material ? [node.material] : []);
          list.forEach((material) => {
            materials.add(material);
            Object.keys(material).forEach((key) => {
              const value = material[key];
              if (value && value.isTexture) textures.add(value);
            });
          });
        });
      });
      textures.forEach((item) => item.dispose());
      materials.forEach((item) => item.dispose());
      geometries.forEach((item) => item.dispose());
    }

    dispose() {
      if (this.disposed) return;
      this.disposed = true;
      this.pending.clear();
      this.events.emit('assets:manager-disposed', {});
    }
  }

  namespace.AssetManager = AssetManager;
})(window);
