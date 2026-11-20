(function (global) {
  'use strict';
  const namespace = global.CiudadEngine = global.CiudadEngine || {};
  class Engine {
    constructor(options) {
      const config = options || {};
      this.version = config.version || '0.2.0';
      this.events = new namespace.EventBus();
      this.scenes = new namespace.SceneManager(this.events);
      this.resources = new namespace.ResourceRegistry(this.events);
      this.assets = new namespace.AssetManager(this.resources, this.events);
      this.renderer = null;
      this.scene = null;
      this.camera = null;
      this.started = false;
      this.frame = 0;
      this.elapsed = 0;
      this.lastDelta = 0;
      this.platform = 'unknown';
    }
    start(platform) {
      if (this.started) return this;
      this.platform = platform || 'unknown';
      this.started = true;
      this.events.emit('engine:started', { version: this.version, platform: this.platform });
      return this;
    }
    attachRenderer(context) {
      const value = context || {};
      if (!value.renderer || !value.scene || !value.camera) {
        throw new Error('Renderer, scene and camera are required to attach the 3D pipeline');
      }
      this.renderer = value.renderer;
      this.scene = value.scene;
      this.camera = value.camera;
      this.start(this.platform);
      this.events.emit('renderer:attached', { renderer: value.renderer, scene: value.scene, camera: value.camera });
      return true;
    }
    update(deltaSeconds) {
      if (!this.started) return;
      const delta = Number.isFinite(deltaSeconds) ? Math.max(0, Math.min(deltaSeconds, 0.1)) : 0;
      this.lastDelta = delta;
      this.elapsed += delta;
      this.frame += 1;
      this.events.emit('engine:update', { delta, elapsed: this.elapsed, frame: this.frame });
    }
    getDiagnostics() {
      return {
        version: this.version, started: this.started, platform: this.platform,
        rendererAttached: Boolean(this.renderer), frame: this.frame,
        elapsed: Number(this.elapsed.toFixed(3)), sceneCount: this.scenes.getCount(),
        resourceCount: this.resources.getCount(), pendingAssetLoads: this.assets.pending.size
      };
    }
  }
  namespace.Engine = Engine;
  namespace.runtime = namespace.runtime || new Engine({ version: '0.2.0' });
})(window);
