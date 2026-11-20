(function (global) {
  'use strict';
  const namespace = global.CiudadEngine = global.CiudadEngine || {};

  class VehicleFactory {
    constructor(world, options) {
      if (!world) throw new TypeError('VehicleFactory requires an ECSWorld');
      this.world = world;
      this.options = options || {};
      this.created = new Set();
    }

    createVehicle(options) {
      const config = Object.assign({}, this.options, options || {});
      const entity = this.world.createEntity(config.name || 'Vehicle');
      this.world.addComponent(entity, 'Transform', {
        x: Number(config.x) || 0,
        y: Number(config.y) || 0,
        z: Number(config.z) || 0,
        rotationY: Number(config.rotationY) || 0
      });
      this.world.addComponent(entity, 'Vehicle', {
        type: config.type || 'car',
        enabled: config.enabled !== false,
        speed: Number.isFinite(config.speed) ? config.speed : 0,
        maxSpeed: Number.isFinite(config.maxSpeed) ? config.maxSpeed : 42,
        reverseSpeed: Number.isFinite(config.reverseSpeed) ? config.reverseSpeed : 12,
        acceleration: Number.isFinite(config.acceleration) ? config.acceleration : 18,
        brakeForce: Number.isFinite(config.brakeForce) ? config.brakeForce : 32,
        drag: Number.isFinite(config.drag) ? config.drag : 4.5,
        steerRate: Number.isFinite(config.steerRate) ? config.steerRate : 1.9,
        physicsMode: config.physicsMode === 'advanced' ? 'advanced' : 'arcade',
        traction: Number.isFinite(config.traction) ? config.traction : 1,
        lateralGrip: Number.isFinite(config.lateralGrip) ? config.lateralGrip : 8.5,
        handbrakeGrip: Number.isFinite(config.handbrakeGrip) ? config.handbrakeGrip : 1.15,
        maxLateralSpeed: Number.isFinite(config.maxLateralSpeed) ? config.maxLateralSpeed : Math.max(8, (Number(config.maxSpeed) || 42) * 0.65),
        yawResponse: Number.isFinite(config.yawResponse) ? config.yawResponse : 9,
        yawRate: 0,
        velocityX: Math.sin(Number(config.rotationY) || 0) * (Number(config.speed) || 0),
        velocityZ: Math.cos(Number(config.rotationY) || 0) * (Number(config.speed) || 0),
        lateralSpeed: 0,
        drifting: false,
        controls: { throttle: 0, brake: 0, steer: 0, handbrake: 0 },
        object3D: config.object3D || null,
        metadata: config.metadata || {}
      });
      if (config.ai && config.ai.enabled !== false) this.enableAI(entity, config.ai);
      this.created.add(entity.id);
      if (this.world.events) this.world.events.emit('vehicle:created', { entity, vehicle: this.world.getComponent(entity, 'Vehicle') });
      return entity;
    }

    setControls(entity, controls) {
      const vehicle = this.world.getComponent(entity, 'Vehicle');
      if (!vehicle) return false;
      const input = controls || {};
      ['throttle', 'brake', 'steer'].forEach((key) => {
        if (input[key] !== undefined) vehicle.controls[key] = key === 'brake' ? Math.max(0, Math.min(1, Number(input[key]) || 0)) : Math.max(-1, Math.min(1, Number(input[key]) || 0));
      });
      if (input.handbrake !== undefined) vehicle.controls.handbrake = Math.max(0, Math.min(1, Number(input.handbrake) || 0));
      return true;
    }

    enableAI(entity, options) {
      const vehicle = this.world.getComponent(entity, 'Vehicle');
      const config = options || {};
      if (!vehicle) return false;
      const route = Array.isArray(config.route) ? config.route.filter((point) => point && Number.isFinite(point.x) && Number.isFinite(point.z)).map((point) => ({ x: point.x, z: point.z })) : [];
      const ai = { enabled: true, route, waypointIndex: 0, waypointRadius: Number.isFinite(config.waypointRadius) ? config.waypointRadius : 3,
        targetSpeed: Number.isFinite(config.targetSpeed) ? config.targetSpeed : 18, loop: config.loop !== false,
        steeringAngle: Number.isFinite(config.steeringAngle) ? config.steeringAngle : 0.85,
        cornerSpeedFactor: Number.isFinite(config.cornerSpeedFactor) ? config.cornerSpeedFactor : 0.55,
        obstacleRange: Number.isFinite(config.obstacleRange) ? config.obstacleRange : 16,
        obstacleCorridor: Number.isFinite(config.obstacleCorridor) ? config.obstacleCorridor : 2.6,
        avoidanceStrength: Number.isFinite(config.avoidanceStrength) ? config.avoidanceStrength : 0.8,
        state: 'idle', completed: false };
      this.world.addComponent(entity, 'VehicleAI', ai);
      return ai;
    }
    setRoute(entity, route, options) {
      const ai = this.world.getComponent(entity, 'VehicleAI') || this.enableAI(entity, options || {});
      if (!ai || !Array.isArray(route)) return false;
      ai.route = route.filter((point) => point && Number.isFinite(point.x) && Number.isFinite(point.z)).map((point) => ({ x: point.x, z: point.z }));
      ai.waypointIndex = 0; ai.completed = false; ai.state = ai.route.length ? 'following' : 'idle';
      return true;
    }
    disableAI(entity) { const ai = this.world.getComponent(entity, 'VehicleAI'); if (!ai) return false; ai.enabled = false; return true; }
    getVehicle(entity) { return this.world.getComponent(entity, 'Vehicle'); }
    getTransform(entity) { return this.world.getComponent(entity, 'Transform'); }

    destroyVehicle(entity) {
      if (!entity || !this.created.has(entity.id)) return false;
      const removed = this.world.removeEntity(entity);
      this.created.delete(entity.id);
      if (removed && this.world.events) this.world.events.emit('vehicle:removed', { entity });
      return removed;
    }

    dispose() {
      for (const id of Array.from(this.created)) this.destroyVehicle(this.world.getEntity(id));
    }
  }

  namespace.VehicleFactory = VehicleFactory;
})(window);
