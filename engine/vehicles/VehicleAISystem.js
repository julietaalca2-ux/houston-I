(function (global) {
  'use strict';
  const namespace = global.CiudadEngine = global.CiudadEngine || {};

  class VehicleAISystem extends namespace.System {
    constructor(options) {
      const config = options || {};
      super({ name: 'VehicleAISystem', priority: Number.isFinite(config.priority) ? config.priority : 4, enabled: config.enabled !== false });
      this.defaultLookAhead = Number.isFinite(config.lookAhead) ? Math.max(2, config.lookAhead) : 9;
      this.defaultObstacleRange = Number.isFinite(config.obstacleRange) ? Math.max(2, config.obstacleRange) : 16;
      this.lastStats = { controlled: 0, following: 0, avoiding: 0, completed: 0 };
    }

    update(world, delta) {
      const agents = world.query('Transform', 'Vehicle', 'VehicleAI');
      const allVehicles = world.query('Transform', 'Vehicle');
      const dt = Math.max(0, Math.min(Number(delta) || 0, 0.1));
      let following = 0, avoiding = 0, completed = 0;
      for (const entity of agents) {
        const transform = world.getComponent(entity, 'Transform');
        const vehicle = world.getComponent(entity, 'Vehicle');
        const ai = world.getComponent(entity, 'VehicleAI');
        if (!ai.enabled || vehicle.enabled === false || !dt) continue;
        const route = ai.route;
        if (!Array.isArray(route) || route.length < 1) {
          vehicle.controls.throttle = 0; vehicle.controls.brake = 1; vehicle.controls.steer = 0;
          ai.state = 'idle'; continue;
        }
        let index = Math.max(0, Math.min(route.length - 1, ai.waypointIndex || 0));
        let target = route[index];
        let dx = target.x - transform.x, dz = target.z - transform.z;
        let distance = Math.hypot(dx, dz);
        const reach = Math.max(0.5, Number(ai.waypointRadius) || 3);
        let guard = 0;
        while (distance <= reach && guard++ < route.length) {
          if (index < route.length - 1) index++;
          else if (ai.loop) index = 0;
          else { ai.completed = true; ai.state = 'completed'; break; }
          target = route[index]; dx = target.x - transform.x; dz = target.z - transform.z;
          distance = Math.hypot(dx, dz);
        }
        ai.waypointIndex = index;
        if (ai.completed) {
          vehicle.controls.throttle = 0; vehicle.controls.brake = 1; vehicle.controls.steer = 0; completed++; continue;
        }
        const heading = Number(transform.rotationY) || 0;
        const desiredHeading = Math.atan2(dx, dz);
        let angle = this._wrap(desiredHeading - heading);
        let steer = this._clamp(angle / Math.max(0.25, Number(ai.steeringAngle) || 0.85), -1, 1);
        const maxSpeed = Math.max(1, Number(ai.targetSpeed) || 18);
        const turnFactor = this._clamp(1 - Math.abs(angle) * (Number(ai.cornerSpeedFactor) || 0.55), 0.35, 1);
        let targetSpeed = maxSpeed * turnFactor;
        const obstacle = this._findObstacle(entity, transform, allVehicles, ai);
        if (obstacle) {
          const side = obstacle.lateral >= 0 ? -1 : 1;
          steer = this._clamp(steer + side * (Number(ai.avoidanceStrength) || 0.8), -1, 1);
          targetSpeed *= this._clamp(obstacle.distance / Math.max(1, Number(ai.obstacleRange) || this.defaultObstacleRange), 0.15, 0.75);
          ai.state = 'avoiding'; avoiding++;
        } else { ai.state = 'following'; following++; }
        const speed = Math.abs(Number(vehicle.speed) || 0);
        const speedError = targetSpeed - speed;
        vehicle.controls.steer = steer;
        vehicle.controls.throttle = speedError > 0.8 ? this._clamp(speedError / Math.max(4, maxSpeed * 0.45), 0.18, 1) : 0;
        vehicle.controls.brake = speedError < -1.2 ? this._clamp((-speedError) / Math.max(5, maxSpeed * 0.5), 0.12, 1) : 0;
        vehicle.controls.handbrake = 0;
      }
      this.lastStats = { controlled: agents.length, following, avoiding, completed };
    }

    _findObstacle(entity, transform, vehicles, ai) {
      const heading = Number(transform.rotationY) || 0;
      const fx = Math.sin(heading), fz = Math.cos(heading);
      const range = Math.max(2, Number(ai.obstacleRange) || this.defaultObstacleRange);
      const corridor = Math.max(1, Number(ai.obstacleCorridor) || 2.6);
      let nearest = null;
      for (const other of vehicles) {
        if (other.id === entity.id) continue;
        const t = this.world.getComponent(other, 'Transform');
        const v = this.world.getComponent(other, 'Vehicle');
        if (!t || (v && v.enabled === false)) continue;
        const dx = t.x - transform.x, dz = t.z - transform.z;
        const longitudinal = dx * fx + dz * fz;
        const lateral = dx * fz - dz * fx;
        if (longitudinal <= 0.5 || longitudinal > range || Math.abs(lateral) > corridor) continue;
        if (!nearest || longitudinal < nearest.distance) nearest = { distance: longitudinal, lateral };
      }
      return nearest;
    }
    _wrap(angle) { while (angle > Math.PI) angle -= Math.PI * 2; while (angle < -Math.PI) angle += Math.PI * 2; return angle; }
    _clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
  }
  namespace.VehicleAISystem = VehicleAISystem;
})(window);
