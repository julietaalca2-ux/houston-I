(function (global) {
  'use strict';
  const namespace = global.CiudadEngine = global.CiudadEngine || {};
  const QUALITY = {
    low:    { pixelRatio: 1, shadows: false, shadowMapSize: 512, toneMappingExposure: 1.0, antialias: false },
    medium: { pixelRatio: 1.25, shadows: true, shadowMapSize: 1024, toneMappingExposure: 1.05, antialias: true },
    high:   { pixelRatio: 1.5, shadows: true, shadowMapSize: 2048, toneMappingExposure: 1.1, antialias: true },
    ultra:  { pixelRatio: 2, shadows: true, shadowMapSize: 4096, toneMappingExposure: 1.12, antialias: true }
  };
  class RenderingPipeline {
    constructor(options) {
      const config = options || {};
      this.quality = QUALITY[config.quality] ? config.quality : 'high';
      this.renderer = null;
      this.scene = null;
      this.camera = null;
      this.textureCache = new Map();
      this.applied = false;
    }
    attach(context) {
      const value = context || {};
      if (!value.renderer || !value.scene || !value.camera) throw new Error('Renderer, scene and camera are required');
      this.renderer = value.renderer; this.scene = value.scene; this.camera = value.camera;
      this.applyQuality();
      this.applied = true;
      return this;
    }
    setQuality(level) {
      if (!QUALITY[level]) throw new Error('Unknown rendering quality: ' + level);
      this.quality = level;
      if (this.renderer) this.applyQuality();
      return this.getDiagnostics();
    }
    applyQuality() {
      const profile = QUALITY[this.quality];
      const renderer = this.renderer;
      if (typeof renderer.setPixelRatio === 'function') {
        const deviceRatio = global.devicePixelRatio || 1;
        renderer.setPixelRatio(Math.min(deviceRatio, profile.pixelRatio));
      }
      if (renderer.shadowMap) {
        renderer.shadowMap.enabled = profile.shadows;
        const THREE = global.THREE;
        if (THREE && THREE.PCFSoftShadowMap !== undefined) renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      }
      const THREE = global.THREE;
      if (THREE) {
        if (THREE.ACESFilmicToneMapping !== undefined) renderer.toneMapping = THREE.ACESFilmicToneMapping;
        if (THREE.SRGBColorSpace !== undefined) renderer.outputColorSpace = THREE.SRGBColorSpace;
      }
      renderer.toneMappingExposure = profile.toneMappingExposure;
      if (renderer.shadowMap && renderer.shadowMap.enabled && this.scene && this.scene.traverse) {
        this.scene.traverse((object) => {
          if (object && object.isDirectionalLight && object.shadow && object.shadow.mapSize) {
            object.shadow.mapSize.set(profile.shadowMapSize, profile.shadowMapSize);
            object.shadow.needsUpdate = true;
          }
        });
      }
    }
    createPBRMaterial(parameters) {
      const THREE = global.THREE;
      if (!THREE || !THREE.MeshStandardMaterial) throw new Error('Three.js MeshStandardMaterial is not available');
      const source = Object.assign({ color: 0xffffff, roughness: 0.82, metalness: 0.02 }, parameters || {});
      source.roughness = Math.max(0, Math.min(1, Number(source.roughness)));
      source.metalness = Math.max(0, Math.min(1, Number(source.metalness)));
      return new THREE.MeshStandardMaterial(source);
    }
    loadTexture(url, options) {
      const THREE = global.THREE;
      if (!THREE || !THREE.TextureLoader) return Promise.reject(new Error('Three.js TextureLoader is not available'));
      if (this.textureCache.has(url)) return this.textureCache.get(url);
      const config = options || {};
      const promise = new Promise((resolve, reject) => {
        new THREE.TextureLoader().load(url, (texture) => {
          if (THREE.SRGBColorSpace && config.colorTexture !== false) texture.colorSpace = THREE.SRGBColorSpace;
          if (config.repeat && texture.repeat && texture.wrapS !== undefined) {
            texture.wrapS = THREE.RepeatWrapping; texture.wrapT = THREE.RepeatWrapping;
            texture.repeat.set(config.repeat.x || 1, config.repeat.y || 1);
          }
          resolve(texture);
        }, undefined, reject);
      });
      this.textureCache.set(url, promise);
      promise.catch(() => this.textureCache.delete(url));
      return promise;
    }
    getDiagnostics() {
      const profile = QUALITY[this.quality];
      return { quality: this.quality, attached: Boolean(this.renderer), applied: this.applied,
        shadowsEnabled: Boolean(profile.shadows), shadowMapSize: profile.shadowMapSize,
        textureCount: this.textureCache.size, pixelRatioCap: profile.pixelRatio };
    }
    dispose() {
      this.textureCache.forEach((promise) => promise.then((texture) => { if (texture && texture.dispose) texture.dispose(); }).catch(() => {}));
      this.textureCache.clear(); this.renderer = null; this.scene = null; this.camera = null; this.applied = false;
    }
  }
  RenderingPipeline.QUALITY = Object.freeze(Object.keys(QUALITY));
  namespace.RenderingPipeline = RenderingPipeline;
})(window);
