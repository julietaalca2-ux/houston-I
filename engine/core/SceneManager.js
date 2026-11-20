(function (global) {
  'use strict';
  const namespace = global.CiudadEngine = global.CiudadEngine || {};
  class SceneManager {
    constructor(events) {
      this.events = events;
      this.activeScene = null;
      this.scenes = new Map();
    }
    register(id, scene) {
      if (!id || !scene) throw new Error('Scene id and scene are required');
      this.scenes.set(String(id), scene);
      this.events.emit('scene:registered', { id: String(id), scene });
      return scene;
    }
    activate(id) {
      const scene = this.scenes.get(String(id));
      if (!scene) throw new Error('Unknown scene: ' + id);
      const previous = this.activeScene;
      this.activeScene = scene;
      this.events.emit('scene:changed', { id: String(id), previous, scene });
      return scene;
    }
    getActive() { return this.activeScene; }
    get(id) { return this.scenes.get(String(id)) || null; }
    clear() { this.scenes.clear(); this.activeScene = null; }
    getCount() { return this.scenes.size; }
  }
  namespace.SceneManager = SceneManager;
})(window);
