(function (global) {
  'use strict';
  const namespace = global.CiudadEngine = global.CiudadEngine || {};

  class CharacterSystem extends namespace.System {
    constructor(options) {
      super({ name: 'CharacterAnimationSystem', priority: 20 });
      const config = options || {};
      this.mixers = new Map();
      this.events = config.events || null;
    }
    register(entity, mixer, actions) {
      if (!entity || !mixer) throw new TypeError('Entity and animation mixer are required');
      this.mixers.set(entity.id, { mixer, actions: actions || Object.create(null), activeAction: null });
      if (this.events) this.events.emit('character:registered', { entity, animationCount: Object.keys(actions || {}).length });
      return this.mixers.get(entity.id);
    }
    play(entityOrId, animationName, options) {
      const id = typeof entityOrId === 'object' ? entityOrId.id : Number(entityOrId);
      const entry = this.mixers.get(id);
      if (!entry) return false;
      const action = entry.actions[animationName];
      if (!action) return false;
      const config = options || {};
      if (entry.activeAction && entry.activeAction !== action) {
        entry.activeAction.fadeOut(Number.isFinite(config.fadeDuration) ? config.fadeDuration : 0.18);
      }
      action.reset();
      if (Number.isFinite(config.timeScale)) action.timeScale = config.timeScale;
      if (config.loop === false && global.THREE && global.THREE.LoopOnce !== undefined) {
        action.setLoop(global.THREE.LoopOnce, 1);
        action.clampWhenFinished = true;
      } else if (global.THREE && global.THREE.LoopRepeat !== undefined) {
        action.setLoop(global.THREE.LoopRepeat, Infinity);
        action.clampWhenFinished = false;
      }
      action.fadeIn(Number.isFinite(config.fadeDuration) ? config.fadeDuration : 0.18).play();
      entry.activeAction = action;
      if (this.events) this.events.emit('character:animation-changed', { entityId: id, animation: animationName });
      return true;
    }
    unregister(entityOrId) {
      const id = typeof entityOrId === 'object' ? entityOrId.id : Number(entityOrId);
      const entry = this.mixers.get(id);
      if (!entry) return false;
      entry.mixer.stopAllAction();
      this.mixers.delete(id);
      return true;
    }
    update(world, delta) {
      for (const [id, entry] of this.mixers) {
        if (!world.getEntity(id)) { entry.mixer.stopAllAction(); this.mixers.delete(id); continue; }
        entry.mixer.update(delta);
      }
    }
    dispose() {
      for (const entry of this.mixers.values()) entry.mixer.stopAllAction();
      this.mixers.clear();
    }
  }

  namespace.CharacterSystem = CharacterSystem;
})(window);
