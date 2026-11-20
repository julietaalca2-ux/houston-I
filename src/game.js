window.CiudadCero = window.CiudadCero || {};

(() => {
  const Config = CiudadCero.Config;
  const World = CiudadCero.World;
  const Entities = CiudadCero.Entities;
  const Physics = CiudadCero.Physics;
  const Renderer = CiudadCero.Renderer;
  const Input = CiudadCero.Input;
  const Audio = CiudadCero.Audio;
  const UI = CiudadCero.UI;

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const gameFrame = document.getElementById('game-frame');

  // Dimensiones lógicas del viewport visible
  let viewW = 960;
  let viewH = 600;

  const state = {
    time: 0,
    player: null,
    vehicles: [],
    pedestrians: [],
    skids: [],
    particles: [],
    nearestVehicle: null,
    camera: { x: 0, y: 0 },
    money: 500,
    wanted: 0,
    wantedDecayTimer: 0,
    missionsCompleted: 0,
    mission: null,
    chainIndex: 0
  };

  function resizeCanvas() {
    if (!gameFrame) return;
    const rect = gameFrame.getBoundingClientRect();
    const isMobileViewport = window.innerWidth <= 900 || window.innerHeight <= 560;

    if (isMobileViewport) {
      viewW = Math.max(320, Math.round(rect.width));
      viewH = Math.max(240, Math.round(rect.height));
    } else {
      viewW = 960;
      viewH = 600;
    }

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(viewW * dpr);
    canvas.height = Math.round(viewH * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function spawnParticles(x, y, color, count = 8) {
    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = 40 + Math.random() * 130;
      state.particles.push({
        x,
        y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        color,
        life: 0.25 + Math.random() * 0.25,
        maxLife: 0.5
      });
    }
    if (state.particles.length > 140) {
      state.particles.splice(0, state.particles.length - 140);
    }
  }

  function addSkidMark(x, y) {
    state.skids.push({ x, y, alpha: 0.42 });
    if (state.skids.length > 260) {
      state.skids.shift();
    }
  }

  function initWorldEntities() {
    state.player = Entities.createPlayer();
    state.vehicles = [];
    state.pedestrians = [];
    state.skids = [];
    state.particles = [];

    // Vehículo inicial del jugador (igual que en v0.1, ahora Coupé GT deportivo)
    const starterCar = Entities.createVehicle({
      typeId: 'coupe',
      color: '#d94f3d',
      x: 520,
      y: 390,
      angle: 0,
      isAI: false,
      isParked: true
    });
    state.vehicles.push(starterCar);

    // Autos estacionados en distintos sectores de Ciudad Cero
    const parkedTypes = ['sedan', 'taxi', 'suv', 'van', 'coupe'];
    World.parkedSpots.slice(0, Config.TRAFFIC.parkedVehicles).forEach((spot, idx) => {
      state.vehicles.push(
        Entities.createVehicle({
          typeId: parkedTypes[idx % parkedTypes.length],
          x: spot.x,
          y: spot.y,
          angle: spot.angle,
          isAI: false,
          isParked: true
        })
      );
    });

    // Tráfico circulando con IA
    for (let i = 0; i < Config.TRAFFIC.targetVehicles; i++) {
      const tv = Entities.spawnTrafficVehicle(state.vehicles, state.player);
      if (tv) state.vehicles.push(tv);
    }

    // Peatones caminando por las aceras
    for (let i = 0; i < Config.TRAFFIC.targetPedestrians; i++) {
      state.pedestrians.push(Entities.createPedestrian());
    }
  }

  function resetGame() {
    state.money = 500;
    state.wanted = 0;
    state.wantedDecayTimer = 0;
    state.missionsCompleted = 0;
    state.chainIndex = 0;
    state.mission = Object.assign({}, Config.INITIAL_MISSION);

    Input.clearTouchState();
    initWorldEntities();
    state.nearestVehicle = findNearestVehicle();

    const actor = state.player;
    state.camera.x = Physics.clamp(actor.x - viewW * 0.5, 0, Config.WORLD.width - viewW);
    state.camera.y = Physics.clamp(actor.y - viewH * 0.5, 0, Config.WORLD.height - viewH);

    UI.sync(state);
    UI.say('Ciudad Cero v0.2 lista. ¡Explora!');
  }

  function findNearestVehicle() {
    let best = null;
    let bestDist = Config.PLAYER.enterRadius;
    for (let i = 0; i < state.vehicles.length; i++) {
      const v = state.vehicles[i];
      const d = Math.hypot(state.player.x - v.x, state.player.y - v.y);
      if (d < bestDist) {
        bestDist = d;
        best = v;
      }
    }
    return best;
  }

  function handleEnterExitVehicle() {
    const p = state.player;
    if (p.inCar && p.vehicle) {
      const v = p.vehicle;
      const exitPos = Physics.findSafeExitSpot(v, state.vehicles);
      p.inCar = false;
      p.vehicle = null;
      p.x = exitPos.x;
      p.y = exitPos.y;
      p.angle = v.angle;
      v.brakeLights = false;
      v.reversing = false;
      Audio.playDoor(false);
      UI.say('Has bajado del ' + v.name);
      UI.sync(state);
      return;
    }

    const targetCar = findNearestVehicle();
    if (targetCar) {
      p.inCar = true;
      p.vehicle = targetCar;
      targetCar.isAI = false;
      targetCar.isParked = false;
      Audio.playDoor(true);
      UI.say('Subiste a: ' + targetCar.name);
      UI.sync(state);
    } else {
      UI.say('Acércate a un vehículo para subir.');
    }
  }

  function handleHorn() {
    if (state.player.inCar) {
      Audio.playHorn();
      // Peatones cercanos se alertan con la bocina
      const v = state.player.vehicle;
      for (let i = 0; i < state.pedestrians.length; i++) {
        const ped = state.pedestrians[i];
        if (Math.hypot(ped.x - v.x, ped.y - v.y) < 150) {
          ped.panicTimer = 1.6;
        }
      }
    }
  }

  function updatePlayerOnFoot(dt) {
    const p = state.player;
    const move = Input.getFootInput();
    const mag = Math.hypot(move.dx, move.dy);

    if (mag > 0.01) {
      const spd = move.sprint ? Config.PLAYER.sprintSpeed : Config.PLAYER.walkSpeed;
      const vx = move.dx * spd;
      const vy = move.dy * spd;
      p.angle = Math.atan2(vy, vx);
      p.speed = spd * mag;
      p.walkPhase += dt * (move.sprint ? 15 : 10);
      Physics.moveCircleEntity(p, vx * dt, vy * dt, p.radius);
    } else {
      p.speed = 0;
    }

    // Evitar que el jugador a pie quede dentro de un vehículo detenido
    for (let i = 0; i < state.vehicles.length; i++) {
      const v = state.vehicles[i];
      const dx = p.x - v.x;
      const dy = p.y - v.y;
      const dist = Math.hypot(dx, dy);
      const minR = p.radius + v.width * 0.55;
      if (dist > 0 && dist < minR) {
        const push = minR - dist;
        Physics.moveCircleEntity(p, (dx / dist) * push, (dy / dist) * push, p.radius);
      }
    }
  }

  function updateDrivenVehicle(v, dt) {
    const ctrl = Input.getCarInput();
    const maxForward = ctrl.turbo ? v.turboSpeed : v.maxSpeed;

    v.brakeLights = false;
    v.reversing = false;

    if (ctrl.throttle > 0) {
      v.speed = Math.min(maxForward, v.speed + v.accel * dt);
    } else if (ctrl.brake > 0) {
      if (v.speed > 12) {
        v.speed = Math.max(0, v.speed - v.brake * dt);
        v.brakeLights = true;
      } else {
        v.speed = Math.max(-v.reverseSpeed, v.speed - v.accel * 0.78 * dt);
        v.reversing = true;
      }
    } else {
      v.speed *= Math.pow(0.95, dt * 60);
      if (Math.abs(v.speed) < 3) v.speed = 0;
    }

    if (ctrl.handbrake) {
      v.speed *= Math.pow(0.9, dt * 60);
      v.brakeLights = true;
    }

    // Giro proporcional a la velocidad (realista y cómodo en móvil y PC)
    const speedFactor = Physics.clamp(Math.abs(v.speed) / 85, 0, 1);
    const reverseSign = v.speed >= -1 ? 1 : -1;
    if (ctrl.steer !== 0 && speedFactor > 0.05) {
      v.angle += ctrl.steer * v.turnRate * speedFactor * reverseSign * dt;
    }

    // Física con agarre lateral (permite derrapes controlados en curvas cerradas)
    const forwardX = Math.cos(v.angle);
    const forwardY = Math.sin(v.angle);
    const rightX = -forwardY;
    const rightY = forwardX;

    const currentLateral = v.vx * rightX + v.vy * rightY;
    const gripFactor = ctrl.handbrake ? 0.84 : v.grip;
    const lateralVel = currentLateral * Math.pow(1 - (1 - gripFactor) * 6, dt * 60);

    v.vx = forwardX * v.speed + rightX * lateralVel;
    v.vy = forwardY * v.speed + rightY * lateralVel;

    v.x += v.vx * dt;
    v.y += v.vy * dt;

    // Dejar marcas de neumático si frena fuerte o derrapa
    if (
      (Math.abs(lateralVel) > 48 || (ctrl.handbrake && Math.abs(v.speed) > 90)) &&
      Math.random() < 0.65
    ) {
      addSkidMark(v.x - forwardX * (v.length * 0.35), v.y - forwardY * (v.length * 0.35));
    }
  }

  function isPathBlockedForAI(v) {
    const cos = Math.cos(v.angle);
    const sin = Math.sin(v.angle);
    const lookDist = Config.TRAFFIC.lookAheadDist;

    // Revisar otros vehículos adelante
    for (let i = 0; i < state.vehicles.length; i++) {
      const other = state.vehicles[i];
      if (other === v) continue;
      const dx = other.x - v.x;
      const dy = other.y - v.y;
      const forwardProj = dx * cos + dy * sin;
      const sideProj = Math.abs(-dx * sin + dy * cos);
      if (forwardProj > 18 && forwardProj < lookDist && sideProj < 26) {
        return true;
      }
    }

    // Revisar jugador o peatones cruzando frente al auto
    if (!state.player.inCar) {
      const dx = state.player.x - v.x;
      const dy = state.player.y - v.y;
      const f = dx * cos + dy * sin;
      const s = Math.abs(-dx * sin + dy * cos);
      if (f > 14 && f < lookDist * 0.85 && s < 22) return true;
    }

    for (let i = 0; i < state.pedestrians.length; i++) {
      const ped = state.pedestrians[i];
      const dx = ped.x - v.x;
      const dy = ped.y - v.y;
      const f = dx * cos + dy * sin;
      const s = Math.abs(-dx * sin + dy * cos);
      if (f > 14 && f < lookDist * 0.85 && s < 20) return true;
    }

    return false;
  }

  function updateAIVehicle(v, dt) {
    if (v.isParked) {
      v.vx *= 0.85;
      v.vy *= 0.85;
      v.speed = 0;
      v.brakeLights = false;
      return;
    }

    if (v.stunTimer > 0) {
      v.stunTimer -= dt;
      v.vx *= Math.pow(0.9, dt * 60);
      v.vy *= Math.pow(0.9, dt * 60);
      v.x += v.vx * dt;
      v.y += v.vy * dt;
      v.brakeLights = true;
      return;
    }

    v.turnCooldown = Math.max(0, v.turnCooldown - dt);
    const blocked = isPathBlockedForAI(v);

    // Detectar si está cerca del centro de una intersección para decidir giro ocasional
    const rx = ((v.x % Config.WORLD.blockSize) + Config.WORLD.blockSize) % Config.WORLD.blockSize;
    const ry = ((v.y % Config.WORLD.blockSize) + Config.WORLD.blockSize) % Config.WORLD.blockSize;
    const inIntersection = rx < Config.WORLD.roadWidth && ry < Config.WORLD.roadWidth;

    if (inIntersection && v.turnCooldown <= 0 && !blocked) {
      const cellX = Math.floor(v.x / Config.WORLD.blockSize) * Config.WORLD.blockSize;
      const cellY = Math.floor(v.y / Config.WORLD.blockSize) * Config.WORLD.blockSize;

      if (v.aiAxis === 'h') {
        const targetX = v.aiDir > 0 ? cellX + 42 : cellX + 108;
        if (Math.abs(v.x - targetX) < 12 && Math.random() < 0.32) {
          v.aiAxis = 'v';
          v.aiDir = Math.random() < 0.5 ? 1 : -1;
          v.aiLanePos = v.aiDir > 0 ? cellX + 108 : cellX + 42;
          v.turnCooldown = 2.4;
        }
      } else {
        const targetY = v.aiDir > 0 ? cellY + 42 : cellY + 108;
        if (Math.abs(v.y - targetY) < 12 && Math.random() < 0.32) {
          v.aiAxis = 'h';
          v.aiDir = Math.random() < 0.5 ? 1 : -1;
          v.aiLanePos = v.aiDir > 0 ? cellY + 108 : cellY + 42;
          v.turnCooldown = 2.4;
        }
      }
    }

    // Calcular ángulo objetivo siguiendo el carril asignado
    let desiredAngle;
    if (v.aiAxis === 'h') {
      const laneErr = Physics.clamp((v.aiLanePos - v.y) * 0.025, -0.45, 0.45);
      desiredAngle = v.aiDir > 0 ? laneErr : Math.PI - laneErr;
    } else {
      const laneErr = Physics.clamp((v.aiLanePos - v.x) * 0.025, -0.45, 0.45);
      desiredAngle = v.aiDir > 0 ? Math.PI * 0.5 - laneErr : -Math.PI * 0.5 + laneErr;
    }

    const diff = Physics.normalizeAngle(desiredAngle - v.angle);
    v.angle = Physics.normalizeAngle(v.angle + Physics.clamp(diff, -3.2 * dt, 3.2 * dt));

    const targetSpd = blocked ? 0 : Config.TRAFFIC.aiCruiseSpeed;
    v.brakeLights = blocked;

    if (v.speed < targetSpd) {
      v.speed = Math.min(targetSpd, v.speed + 140 * dt);
    } else {
      v.speed = Math.max(targetSpd, v.speed - 260 * dt);
    }

    v.vx = Math.cos(v.angle) * v.speed;
    v.vy = Math.sin(v.angle) * v.speed;
    v.x += v.vx * dt;
    v.y += v.vy * dt;

    // Dar la vuelta suavemente al llegar al borde del mapa
    const pad = 42;
    if (v.x < pad && v.aiAxis === 'h' && v.aiDir < 0) {
      v.aiDir = 1;
      v.aiLanePos += 66;
    } else if (v.x > Config.WORLD.width - pad && v.aiAxis === 'h' && v.aiDir > 0) {
      v.aiDir = -1;
      v.aiLanePos -= 66;
    }
    if (v.y < pad && v.aiAxis === 'v' && v.aiDir < 0) {
      v.aiDir = 1;
      v.aiLanePos += 66;
    } else if (v.y > Config.WORLD.height - pad && v.aiAxis === 'v' && v.aiDir > 0) {
      v.aiDir = -1;
      v.aiLanePos -= 66;
    }
  }

  function updatePedestrians(dt) {
    for (let i = 0; i < state.pedestrians.length; i++) {
      const ped = state.pedestrians[i];

      if (ped.knockTimer > 0) {
        ped.knockTimer -= dt;
        Physics.moveCircleEntity(ped, ped.vx * dt, ped.vy * dt, ped.radius);
        ped.vx *= 0.86;
        ped.vy *= 0.86;
        continue;
      }

      if (ped.panicTimer > 0) {
        ped.panicTimer -= dt;
      }

      const target = ped.loop[ped.targetIdx];
      const dx = target.x - ped.x;
      const dy = target.y - ped.y;
      const dist = Math.hypot(dx, dy);

      if (dist < 8) {
        ped.targetIdx = (ped.targetIdx + ped.loopDir + ped.loop.length) % ped.loop.length;
      } else {
        const spd = ped.panicTimer > 0 ? ped.speed * 1.85 : ped.speed;
        const vx = (dx / dist) * spd;
        const vy = (dy / dist) * spd;
        ped.angle = Math.atan2(vy, vx);
        ped.walkPhase += dt * (ped.panicTimer > 0 ? 14 : 8);
        Physics.moveCircleEntity(ped, vx * dt, vy * dt, ped.radius);
      }

      // Colisión suave entre vehículos y peatones
      for (let j = 0; j < state.vehicles.length; j++) {
        const v = state.vehicles[j];
        const vDist = Math.hypot(ped.x - v.x, ped.y - v.y);
        if (vDist < 22) {
          const pushAng = Math.atan2(ped.y - v.y, ped.x - v.x);
          const vSpd = Math.hypot(v.vx, v.vy);
          if (vSpd > 95) {
            ped.knockTimer = 1.1;
            ped.panicTimer = 3.5;
            ped.vx = Math.cos(pushAng) * 165;
            ped.vy = Math.sin(pushAng) * 165;
            spawnParticles(ped.x, ped.y, '#e8e4d8', 5);
            if (v === state.player.vehicle && state.wanted < 5) {
              state.wanted += 1;
              state.wantedDecayTimer = 14;
              Audio.playAlert();
              UI.say('¡Cuidado con los peatones! Nivel de alerta: ' + state.wanted + '★');
              UI.sync(state);
            }
          } else {
            Physics.moveCircleEntity(ped, Math.cos(pushAng) * 4, Math.sin(pushAng) * 4, ped.radius);
          }
        }
      }
    }
  }

  function advanceMission() {
    state.missionsCompleted += 1;
    state.money += state.mission.reward;
    Audio.playMissionComplete();
    spawnParticles(state.mission.x, state.mission.y, '#f5d94b', 16);

    const earned = state.mission.reward;
    const nextTemplate =
      Config.CHAIN_MISSIONS[state.chainIndex % Config.CHAIN_MISSIONS.length];
    state.chainIndex += 1;

    state.mission = Object.assign({ id: state.missionsCompleted + 1 }, nextTemplate);
    UI.sync(state);
    UI.say(`¡Misión completada! +$${earned} · Nuevo objetivo activo`, 3.0);
  }

  function update(dt) {
    state.time += dt;

    if (state.player.inCar && state.player.vehicle) {
      updateDrivenVehicle(state.player.vehicle, dt);
      state.player.x = state.player.vehicle.x;
      state.player.y = state.player.vehicle.y;
      state.nearestVehicle = null;
    } else {
      updatePlayerOnFoot(dt);
      const near = findNearestVehicle();
      if (near !== state.nearestVehicle) {
        state.nearestVehicle = near;
        Input.setNearbyVehicle(Boolean(near));
      }
    }

    // Actualizar vehículos de tráfico y estacionados
    for (let i = 0; i < state.vehicles.length; i++) {
      const v = state.vehicles[i];
      if (v === state.player.vehicle) continue;
      updateAIVehicle(v, dt);
    }

    // Resolver colisiones entre vehículos
    Physics.resolveVehicleCollisions(
      state.vehicles,
      state.player.vehicle,
      (cx, cy, intensity, involvesPlayer) => {
        spawnParticles(cx, cy, '#ffd966', 7);
        if (involvesPlayer) {
          Audio.playCrash(intensity);
        }
      }
    );

    // Resolver colisiones de todos los vehículos contra edificios
    for (let i = 0; i < state.vehicles.length; i++) {
      const v = state.vehicles[i];
      Physics.resolveVehicleBuildings(v, (bx, by, intensity) => {
        spawnParticles(bx, by, '#d6cfc2', 5);
        if (v === state.player.vehicle) {
          Audio.playCrash(intensity);
        }
      });
    }

    // Mantener coordenadas del jugador sincronizadas con su auto
    if (state.player.inCar && state.player.vehicle) {
      state.player.x = state.player.vehicle.x;
      state.player.y = state.player.vehicle.y;
    }

    updatePedestrians(dt);

    // Actualizar partículas
    for (let i = state.particles.length - 1; i >= 0; i--) {
      const pt = state.particles[i];
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.life -= dt;
      if (pt.life <= 0) state.particles.splice(i, 1);
    }

    // Reducción gradual del nivel de alerta si no hay incidentes
    if (state.wanted > 0) {
      state.wantedDecayTimer -= dt;
      if (state.wantedDecayTimer <= 0) {
        state.wanted -= 1;
        state.wantedDecayTimer = 12;
        UI.sync(state);
      }
    }

    // Comprobar llegada al punto de misión
    const actor = state.player.inCar ? state.player.vehicle : state.player;
    if (
      state.mission &&
      Math.hypot(actor.x - state.mission.x, actor.y - state.mission.y) <
        state.mission.radius + 16
    ) {
      advanceMission();
    }

    // Cámara suave con anticipación de movimiento
    const lookX = state.player.inCar ? state.player.vehicle.vx * 0.22 : 0;
    const lookY = state.player.inCar ? state.player.vehicle.vy * 0.22 : 0;
    const targetCamX = Physics.clamp(
      actor.x + lookX - viewW * 0.5,
      0,
      Math.max(0, Config.WORLD.width - viewW)
    );
    const targetCamY = Physics.clamp(
      actor.y + lookY - viewH * 0.5,
      0,
      Math.max(0, Config.WORLD.height - viewH)
    );
    const smooth = 1 - Math.pow(0.001, dt);
    state.camera.x += (targetCamX - state.camera.x) * smooth;
    state.camera.y += (targetCamY - state.camera.y) * smooth;

    UI.tick(dt);
    UI.updateLiveTelemetry(actor, state.mission, state.player.vehicle);
  }

  let lastTime = performance.now();
  function loop(now) {
    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;
    update(dt);
    Renderer.render(ctx, viewW, viewH, state);
    requestAnimationFrame(loop);
  }

  // Inicialización general
  Input.init({
    onEnterExit: handleEnterExitVehicle,
    onReset: resetGame,
    onHorn: handleHorn
  });

  UI.init({
    onReset: resetGame
  });

  window.addEventListener('resize', resizeCanvas);
  window.addEventListener('orientationchange', () => {
    setTimeout(resizeCanvas, 120);
  });

  resizeCanvas();
  resetGame();
  requestAnimationFrame(loop);
})();
