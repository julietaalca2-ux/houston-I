(function (global) {
  'use strict';
  const namespace = global.CiudadEngine = global.CiudadEngine || {};

  class VehicleSystem extends namespace.System {
    constructor(options) {
      const config = options || {};
      super({ name: 'VehicleSystem', priority: Number.isFinite(config.priority) ? config.priority : 5 });
      this.defaultAcceleration = Number.isFinite(config.acceleration) ? config.acceleration : 18;
      this.defaultBrakeForce = Number.isFinite(config.brakeForce) ? config.brakeForce : 32;
      this.defaultMaxSpeed = Number.isFinite(config.maxSpeed) ? config.maxSpeed : 42;
      this.defaultReverseSpeed = Number.isFinite(config.reverseSpeed) ? config.reverseSpeed : 12;
      this.lastStats = { vehicles: 0, moving: 0, drifting: 0 };
    }

    update(world, delta) {
      const vehicles = world.query('Transform', 'Vehicle');
      let moving = 0;
      let drifting = 0;
      for (const entity of vehicles) {
        const transform = world.getComponent(entity, 'Transform');
        const vehicle = world.getComponent(entity, 'Vehicle');
        if (vehicle.enabled === false) continue;
        this._prepare(vehicle, transform);
        const dt = Math.min(0.1, Math.max(0, delta));
        if (dt > 0 && vehicle.physicsMode === 'advanced') {
          this._updateAdvanced(transform, vehicle, dt);
        } else if (dt > 0) {
          const throttle = this._axis(vehicle.controls.throttle);
          const brake = this._axis(vehicle.controls.brake);
          const steering = this._axis(vehicle.controls.steer);
          const speed = vehicle.speed;
          const acceleration = Number.isFinite(vehicle.acceleration) ? Math.max(0, vehicle.acceleration) : this.defaultAcceleration;
          const brakeForce = Number.isFinite(vehicle.brakeForce) ? Math.max(0, vehicle.brakeForce) : this.defaultBrakeForce;
          const maxSpeed = Number.isFinite(vehicle.maxSpeed) ? Math.max(0, vehicle.maxSpeed) : this.defaultMaxSpeed;
          const reverseSpeed = Number.isFinite(vehicle.reverseSpeed) ? Math.max(0, vehicle.reverseSpeed) : this.defaultReverseSpeed;

          if (brake > 0) {
            vehicle.speed = this._moveToward(speed, 0, brakeForce * brake * dt);
          } else if (throttle !== 0) {
            const target = throttle > 0 ? maxSpeed * throttle : -reverseSpeed * Math.abs(throttle);
            vehicle.speed = this._moveToward(speed, target, acceleration * dt);
          } else {
            const drag = Number.isFinite(vehicle.drag) ? Math.max(0, vehicle.drag) : 4.5;
            vehicle.speed = this._moveToward(speed, 0, drag * dt);
          }

          const speedRatio = Math.min(1, Math.abs(vehicle.speed) / Math.max(1, maxSpeed));
          const steerRate = Number.isFinite(vehicle.steerRate) ? vehicle.steerRate : 1.9;
          const direction = vehicle.speed < 0 ? -1 : 1;
          if (Math.abs(vehicle.speed) > 0.01) {
            transform.rotationY = (Number(transform.rotationY) || 0) + steering * steerRate * (0.2 + speedRatio * 0.8) * direction * dt;
          }
          const heading = Number(transform.rotationY) || 0;
          transform.x += Math.sin(heading) * vehicle.speed * dt;
          transform.z += Math.cos(heading) * vehicle.speed * dt;
          vehicle.velocityX = Math.sin(heading) * vehicle.speed;
          vehicle.velocityZ = Math.cos(heading) * vehicle.speed;
          vehicle.lateralSpeed = 0;
          vehicle.drifting = false;
        }
        vehicle.speed = this._clamp(vehicle.speed, -this._number(vehicle.reverseSpeed, this.defaultReverseSpeed), this._number(vehicle.maxSpeed, this.defaultMaxSpeed));
        vehicle.forwardSpeed = vehicle.speed;
        vehicle.velocity = vehicle.speed;
        this._syncVisual(transform, vehicle);
        if (Math.abs(vehicle.speed) > 0.05) moving++;
        if (vehicle.drifting) drifting++;
      }
      this.lastStats = { vehicles: vehicles.length, moving, drifting };
    }

    setControls(entity, controls) {
      if (!this.world) return false;
      const vehicle = this.world.getComponent(entity, 'Vehicle');
      if (!vehicle) return false;
      const input = controls || {};
      if (input.throttle !== undefined) vehicle.controls.throttle = this._axis(input.throttle);
      if (input.brake !== undefined) vehicle.controls.brake = this._axis(input.brake);
      if (input.steer !== undefined) vehicle.controls.steer = this._axis(input.steer);
      if (input.handbrake !== undefined) vehicle.controls.handbrake = this._clamp(Number(input.handbrake) || 0, 0, 1);
      return true;
    }

    _prepare(vehicle, transform) {
      vehicle.controls = vehicle.controls || { throttle: 0, brake: 0, steer: 0, handbrake: 0 };
      vehicle.speed = Number.isFinite(vehicle.speed) ? vehicle.speed : 0;
      vehicle.controls.throttle = this._axis(vehicle.controls.throttle);
      vehicle.controls.brake = this._clamp(Number(vehicle.controls.brake) || 0, 0, 1);
      vehicle.controls.steer = this._axis(vehicle.controls.steer);
      vehicle.controls.handbrake = this._clamp(Number(vehicle.controls.handbrake) || 0, 0, 1);
      if (!Number.isFinite(vehicle.velocityX) || !Number.isFinite(vehicle.velocityZ)) {
        const heading = Number(transform && transform.rotationY) || 0;
        vehicle.velocityX = Math.sin(heading) * vehicle.speed;
        vehicle.velocityZ = Math.cos(heading) * vehicle.speed;
      }
    }
    _updateAdvanced(transform, vehicle, dt) {
      const heading = Number(transform.rotationY) || 0;
      const sin = Math.sin(heading);
      const cos = Math.cos(heading);
      let forwardSpeed = vehicle.velocityX * sin + vehicle.velocityZ * cos;
      let lateralSpeed = vehicle.velocityX * cos - vehicle.velocityZ * sin;
      const throttle = vehicle.controls.throttle;
      const brake = vehicle.controls.brake;
      const handbrake = vehicle.controls.handbrake;
      const acceleration = this._number(vehicle.acceleration, this.defaultAcceleration);
      const brakeForce = this._number(vehicle.brakeForce, this.defaultBrakeForce);
      const maxSpeed = this._number(vehicle.maxSpeed, this.defaultMaxSpeed);
      const reverseSpeed = this._number(vehicle.reverseSpeed, this.defaultReverseSpeed);
      const traction = this._clamp(this._number(vehicle.traction, 1), 0, 2);
      const drag = this._number(vehicle.drag, 1.8);

      if (brake > 0) forwardSpeed = this._moveToward(forwardSpeed, 0, brakeForce * brake * dt);
      else if (throttle !== 0) forwardSpeed += throttle * acceleration * traction * dt;
      else forwardSpeed = this._moveToward(forwardSpeed, 0, drag * dt);
      forwardSpeed = this._clamp(forwardSpeed, -reverseSpeed, maxSpeed);

      // Preserve world-space momentum while the chassis changes heading. This
      // naturally creates lateral velocity during a turn instead of rotating
      // the velocity vector together with the vehicle body.
      const worldVelocityX = forwardSpeed * sin + lateralSpeed * cos;
      const worldVelocityZ = forwardSpeed * cos - lateralSpeed * sin;
      const speedRatio = Math.min(1, Math.abs(forwardSpeed) / Math.max(1, maxSpeed));
      const steerRate = this._number(vehicle.steerRate, 1.65);
      const reverseDirection = forwardSpeed < -0.05 ? -1 : 1;
      const targetYawRate = Math.abs(forwardSpeed) > 0.05
        ? vehicle.controls.steer * steerRate * (0.12 + speedRatio * 0.88) * reverseDirection
        : 0;
      const yawResponse = this._number(vehicle.yawResponse, 9);
      vehicle.yawRate = this._moveToward(Number(vehicle.yawRate) || 0, targetYawRate, yawResponse * dt);
      transform.rotationY = heading + vehicle.yawRate * dt;

      const newHeading = Number(transform.rotationY) || 0;
      const newSin = Math.sin(newHeading);
      const newCos = Math.cos(newHeading);
      forwardSpeed = worldVelocityX * newSin + worldVelocityZ * newCos;
      lateralSpeed = worldVelocityX * newCos - worldVelocityZ * newSin;
      const grip = handbrake > 0
        ? this._number(vehicle.handbrakeGrip, 1.15)
        : this._number(vehicle.lateralGrip, 8.5);
      lateralSpeed = this._moveToward(lateralSpeed, 0, grip * (1 + Math.abs(forwardSpeed) * 0.025) * dt);
      const maxLateralSpeed = this._number(vehicle.maxLateralSpeed, Math.max(8, maxSpeed * 0.65));
      lateralSpeed = this._clamp(lateralSpeed, -maxLateralSpeed, maxLateralSpeed);

      vehicle.velocityX = forwardSpeed * newSin + lateralSpeed * newCos;
      vehicle.velocityZ = forwardSpeed * newCos - lateralSpeed * newSin;
      vehicle.speed = forwardSpeed;
      vehicle.forwardSpeed = forwardSpeed;
      vehicle.lateralSpeed = lateralSpeed;
      vehicle.drifting = handbrake > 0.05 && Math.abs(lateralSpeed) > 0.8;
      transform.x += vehicle.velocityX * dt;
      transform.z += vehicle.velocityZ * dt;
    }
    _syncVisual(transform, vehicle) {
      const object = vehicle.object3D;
      if (!object) return;
      if (object.position && typeof object.position.set === 'function') object.position.set(transform.x || 0, transform.y || 0, transform.z || 0);
      else if (object.position) { object.position.x = transform.x || 0; object.position.y = transform.y || 0; object.position.z = transform.z || 0; }
      if (object.rotation) object.rotation.y = Number(transform.rotationY) || 0;
    }
    _axis(value) { return this._clamp(Number(value) || 0, -1, 1); }
    _number(value, fallback) { return Number.isFinite(value) ? Math.max(0, value) : fallback; }
    _clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
    _moveToward(value, target, amount) {
      if (value < target) return Math.min(target, value + amount);
      return Math.max(target, value - amount);
    }
  }

  namespace.VehicleSystem = VehicleSystem;
})(window);
