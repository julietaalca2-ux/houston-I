(function (global) {
  'use strict';
  const namespace = global.CiudadEngine = global.CiudadEngine || {};
  class Engine {
    constructor(options) {
      const config = options || {};
      this.version = config.version || '0.23.0';
      this.events = new namespace.EventBus();
      this.scenes = new namespace.SceneManager(this.events);
      this.resources = new namespace.ResourceRegistry(this.events);
      this.assets = new namespace.AssetManager(this.resources, this.events);
      this.world = new namespace.ECSWorld(this.events);
      this.physicsSystem = new namespace.PhysicsSystem(config.physics);
      this.world.addSystem(this.physicsSystem);
      this.physics = new namespace.PhysicsFactory(this.world);
      this.characterSystem = new namespace.CharacterSystem({ events: this.events });
      this.characterTransformSystem = new namespace.CharacterTransformSystem();
      this.world.addSystem(this.characterTransformSystem);
      this.world.addSystem(this.characterSystem);
      this.characters = new namespace.CharacterManager(this);
      this.vehicleAISystem = new namespace.VehicleAISystem(config.vehicleAI);
      this.world.addSystem(this.vehicleAISystem);
      this.vehicleSystem = new namespace.VehicleSystem(config.vehicles);
      this.world.addSystem(this.vehicleSystem);
      this.vehicles = new namespace.VehicleFactory(this.world, config.vehicles);
      this.worldBoundsSystem = new namespace.WorldBoundsSystem(config.worldBounds);
      this.sceneSyncSystem = new namespace.SceneSyncSystem(config.sceneSync);
      this.world.addSystem(this.worldBoundsSystem);
      this.world.addSystem(this.sceneSyncSystem);
      this.worldBridge = new namespace.WorldBridge(this);
      this.rendering = new namespace.RenderingPipeline({ quality: config.renderQuality || 'high' });
      this.cityDetails = namespace.CityDetailSystem ? new namespace.CityDetailSystem(config.cityDetails) : null;
      this.cityExpansion = namespace.CityWorldExpansionSystem ? new namespace.CityWorldExpansionSystem(config.cityExpansion) : null;
      this.advancedLighting = namespace.AdvancedLightingSystem ? new namespace.AdvancedLightingSystem(config.lighting) : null;
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
      this.rendering.attach({ renderer: value.renderer, scene: value.scene, camera: value.camera });
      if (this.advancedLighting) this.advancedLighting.attach({ renderer: value.renderer, scene: value.scene });
      this.worldBridge.attachScene(value.scene);
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
      this.world.update(delta, this.elapsed);
      if (this.cityExpansion) this.cityExpansion.update(delta, this.camera);
      if (this.advancedLighting) this.advancedLighting.update(delta);
      this.events.emit('engine:update', { delta, elapsed: this.elapsed, frame: this.frame });
    }
    getDiagnostics() {
      return {
        version: this.version, started: this.started, platform: this.platform,
        rendererAttached: Boolean(this.renderer), frame: this.frame,
        elapsed: Number(this.elapsed.toFixed(3)), sceneCount: this.scenes.getCount(),
        resourceCount: this.resources.getCount(), pendingAssetLoads: this.assets.pending.size,
        entityCount: this.world.getEntityCount(), componentCount: this.world.getComponentCount(),
        systemCount: this.world.getSystemCount(), characterCount: this.characters.getCount(),
        vehicleCount: this.world.query('Vehicle').length,
        vehicles: Object.assign({}, this.vehicleSystem.lastStats),
        vehicleAI: Object.assign({}, this.vehicleAISystem.lastStats),
        world: this.worldBridge.getDiagnostics(),
        physics: Object.assign({}, this.physicsSystem.lastStats),
        cityDetails: this.cityDetails ? Object.assign({}, this.cityDetails.stats) : null,
        cityExpansion: this.cityExpansion ? this.cityExpansion.getDiagnostics() : null,
        advancedLighting: this.advancedLighting ? this.advancedLighting.getDiagnostics() : null,
        rendering: this.rendering.getDiagnostics()
      };
    }
  }
  namespace.Engine = Engine;
  namespace.runtime = namespace.runtime || new Engine({ version: '0.23.0' });
})(window);
