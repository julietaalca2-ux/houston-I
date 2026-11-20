window.CiudadCero = window.CiudadCero || {};

CiudadCero.Game = (() => {
  const Config = CiudadCero.Config;
  const World = CiudadCero.World;
  const Entities = CiudadCero.Entities;
  const Physics = CiudadCero.Physics;
  const Input = CiudadCero.Input;
  const Renderer = CiudadCero.Renderer;
  const UI = CiudadCero.UI;
  const Audio = CiudadCero.Audio;
  const Police = CiudadCero.Police;
  const Garage = CiudadCero.Garage;

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');

  let viewW = 960;
  let viewH = 600;
  let lastTime = 0;

  const state = {
    money: 500,
    missionsCompleted: 0,
    chainIndex: 0,
    player: null,
    vehicles: [],
    pedestrians: [],
    mission: null,
    missionTimeLeft: 0,
    camera: { x: 0, y: 0 }
  };

  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    if (rect.width < 10 || rect.height < 10) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    viewW = Math.round(rect.width);
    viewH = Math.round(rect.height);
    canvas.width = Math.round(viewW * dpr);
    canvas.height = Math.round(viewH * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function startMission(missionData) {
    state.vehicles.forEach((v) => { v.isMissionTarget = false; });

    const m = Object.assign({}, missionData);
    state.mission = m;
    state.missionTimeLeft = m.timeLimit || 0;

    if (m.triggerWanted) {
      Police.setMinWanted(
        m.triggerWanted,
        state.player.x,
        state.player.y,
        'Alerta de misión',
        (msg) => UI.showToast(msg)
      );
    }

    if (m.type === 'recover_vehicle') {
      const targetCar = Entities.createVehicle({
        typeId: m.vehicleType || 'coupe',
        color: m.vehicleColor || '#22a37a',
        x: m.vehicleX,
        y: m.vehicleY,
        angle: 0,
        isAI: false,
        isParked: true,
        isMissionTarget: true
      });
      state.vehicles.push(targetCar);
      m.targetVehicleId = targetCar.id;
    }
  }

  function advanceNextMission() {
    const chain = Config.CHAIN_MISSIONS;
    const template = chain[state.chainIndex % chain.length];
    state.chainIndex += 1;
    startMission(template);
  }

  function resetWorld() {
    state.money = 500;
    state.missionsCompleted = 0;
    state.chainIndex = 0;
    state.player = Entities.createPlayer();
    state.vehicles = [];
    state.pedestrians = [];
    Police.reset();
    UI.closeGarageModal();
    Input.setBlocked(false);

    const starterCar = Entities.createVehicle({
      typeId: 'coupe',
      color: '#d94f3d',
      x: 520,
      y: 390,
      angle: 0,
      isPlayerOwned: true,
      isAI: false,
      isParked: true
    });
    state.vehicles.push(starterCar);
    Garage.init(starterCar);

    const parkedSpecs = ['sedan', 'taxi', 'suv', 'van', 'coupe'];
    World.parkedSpots.forEach((spot, idx) => {
      if (idx >= Config.TRAFFIC.parkedVehicles) return;
      if (Math.hypot(spot.x - starterCar.x, spot.y - starterCar.y) < 120) return;
      state.vehicles.push(
        Entities.createVehicle({
          typeId: parkedSpecs[idx % parkedSpecs.length],
          x: spot.x,
          y: spot.y,
          angle: spot.angle,
          isAI: false,
          isParked: true
        })
      );
    });

    for (let i = 0; i < Config.TRAFFIC.targetVehicles; i++) {
      const v = Entities.spawnTrafficVehicle(state.vehicles, state.player);
      if (v) state.vehicles.push(v);
    }

    for (let i = 0; i < Config.TRAFFIC.targetPedestrians; i++) {
      state.pedestrians.push(Entities.createPedestrian());
    }

    startMission(Config.INITIAL_MISSION);

    Input.setMode(false);
    updateCamera(1);
    UI.showToast('Ciudad Cero v0.3 · Explora, conduce o visita el Garaje');
  }

  function findNearestVehicle() {
    let best = null;
    let bestDist = Config.PLAYER.enterRadius;
    for (let i = 0; i < state.vehicles.length; i++) {
      const v = state.vehicles[i];
      const d = Math.hypot(v.x - state.player.x, v.y - state.player.y);
      if (d < bestDist) {
        best = v;
        bestDist = d;
      }
    }
    return best;
  }

  function toggleEnterExitVehicle() {
    const p = state.player;
    if (p.inCar && p.vehicle) {
      const v = p.vehicle;
      const exitPos = Physics.findSafeExitSpot(v, state.vehicles);
      p.x = exitPos.x;
      p.y = exitPos.y;
      p.angle = v.angle;
      p.inCar = false;
      p.vehicle = null;
      v.brakeLights = false;
      v.reversing = false;
      Input.setMode(false);
      Audio.playDoor(false);
      UI.showToast('Saliste del vehículo');
      return;
    }

    const nearCar = findNearestVehicle();
    if (!nearCar) {
      UI.showToast('Acércate a un vehículo para subir');
      return;
    }

    p.inCar = true;
    p.vehicle = nearCar;
    p.x = nearCar.x;
    p.y = nearCar.y;
    nearCar.isAI = false;
    nearCar.isParked = false;
    Input.setMode(true);
    Audio.playDoor(true);

    if (nearCar.isMissionTarget && state.mission && state.mission.type === 'recover_vehicle') {
      nearCar.isMissionTarget = false;
      nearCar.isPlayerOwned = true;
      Police.setMinWanted(
        state.mission.stealWanted || 2,
        nearCar.x,
        nearCar.y,
        '¡Vehículo recuperado! Llévalo al Garaje Central',
        (msg) => UI.showToast(msg, 3200)
      );
      return;
    }

    if (nearCar.isPolice && !nearCar.isPlayerOwned) {
      nearCar.sirenActive = true;
      Police.setMinWanted(
        2,
        nearCar.x,
        nearCar.y,
        '¡Robo de patrulla policial!',
        (msg) => UI.showToast(msg, 3000)
      );
    } else if (!nearCar.isPlayerOwned) {
      const policeNear = state.vehicles.some(
        (v) => v.isPolice && Math.hypot(v.x - nearCar.x, v.y - nearCar.y) < 380
      );
      if (policeNear || Math.random() < 0.65) {
        Police.addWanted(
          1,
          nearCar.x,
          nearCar.y,
          `Robo de ${nearCar.name}`,
          (msg) => UI.showToast(msg)
        );
      } else {
        UI.showToast(`Subiste a: ${nearCar.name}`);
      }
    } else {
      UI.showToast(`Conduciendo: ${nearCar.name}`);
    }
  }

  function triggerHorn() {
    if (state.player.inCar && state.player.vehicle) {
      const v = state.player.vehicle;
      if (v.isPolice) {
        v.sirenActive = !v.sirenActive;
        Audio.playHorn(true);
        UI.showToast(v.sirenActive ? 'Sirena policial ACTIVADA' : 'Sirena policial APAGADA');
      } else {
        Audio.playHorn(false);
        state.pedestrians.forEach((ped) => {
          if (Math.hypot(ped.x - v.x, ped.y - v.y) < 170) {
            ped.panicTimer = 1.6;
          }
        });
      }
    }
  }

  function getActiveGarageContext() {
    const p = state.player;
    const g = World.getGarageAt(p.x, p.y, 26);
    if (!g) return null;

    let activeVehicle = p.inCar ? p.vehicle : null;
    if (!activeVehicle) {
      activeVehicle = state.vehicles.find(
        (v) => !v.isPolice && Math.hypot(v.x - g.x, v.y - g.y) < 58
      ) || null;
    }

    return {
      garage: g,
      activeVehicle,
      money: state.money,
      slots: Garage.getSlots(),
      maxSlots: Garage.getMaxSlots()
    };
  }

  function refreshGarageModal() {
    const ctxData = getActiveGarageContext();
    if (!ctxData) {
      UI.closeGarageModal();
      Input.setBlocked(false);
      return;
    }

    UI.renderGarageModal(ctxData, {
      onRepairActive: () => {
        const res = Garage.repairActiveVehicle(ctxData.activeVehicle, state.money, (amt) => {
          state.money -= amt;
        });
        UI.showToast(res.msg);
        refreshGarageModal();
      },
      onStoreActive: () => {
        const res = Garage.storeVehicle(
          ctxData.activeVehicle,
          state.vehicles,
          state.player,
          () => Input.setMode(false)
        );
        UI.showToast(res.msg);
        refreshGarageModal();
      },
      onRepairSlot: (slotId) => {
        const res = Garage.repairSlotVehicle(slotId, state.vehicles, state.money, (amt) => {
          state.money -= amt;
        });
        UI.showToast(res.msg);
        refreshGarageModal();
      },
      onSelectSlot: (slotId) => {
        const res = Garage.selectVehicle(slotId, ctxData.garage, state.player, state.vehicles);
        UI.showToast(res.msg);
        if (res.ok) {
          Input.setMode(true);
          UI.closeGarageModal();
          Input.setBlocked(false);
        } else {
          refreshGarageModal();
        }
      },
      onRecoverSlot: (slotId) => {
        const res = Garage.recoverVehicle(
          slotId,
          ctxData.garage,
          state.player,
          state.vehicles,
          state.money,
          (amt) => { state.money -= amt; }
        );
        UI.showToast(res.msg);
        if (res.ok) {
          Input.setMode(true);
          UI.closeGarageModal();
          Input.setBlocked(false);
        } else {
          refreshGarageModal();
        }
      }
    });
  }

  function handleGarageAction(forceClose = false) {
    if (forceClose || UI.isGarageOpen()) {
      UI.closeGarageModal();
      Input.setBlocked(false);
      return;
    }

    const ctxData = getActiveGarageContext();
    if (!ctxData) {
      UI.showToast('Acércate a un Garaje (marcador amarillo) para abrirlo');
      return;
    }

    if (Police.state.wanted > 0 && Police.state.playerInSight) {
      UI.showToast('¡Pierde de vista a la policía antes de entrar al garaje!');
      return;
    }

    Input.setBlocked(true);
    refreshGarageModal();
  }

  function updatePlayerOnFoot(dt) {
    const p = state.player;
    const move = Input.getFootInput();
    const mag = Math.hypot(move.dx, move.dy);

    if (mag > 0.01) {
      const speed = move.sprint ? Config.PLAYER.sprintSpeed : Config.PLAYER.walkSpeed;
      p.speed = speed * Math.min(1, mag);
      p.angle = Math.atan2(move.dy, move.dx);
      Physics.moveCircleEntity(
        p,
        Math.cos(p.angle) * p.speed * dt,
        Math.sin(p.angle) * p.speed * dt,
        p.radius
      );
      p.walkPhase += dt * (move.sprint ? 15 : 10);
    } else {
      p.speed = 0;
    }

    Input.setNearbyVehicle(Boolean(findNearestVehicle()));
  }

  function updatePlayerVehicle(dt) {
    const p = state.player;
    const v = p.vehicle;
    if (!v) return;

    const ctrl = Input.getCarInput();
    const topForward = ctrl.turbo ? v.turboSpeed : v.maxSpeed;

    v.brakeLights = false;
    v.reversing = false;

    if (ctrl.throttle > 0) {
      v.speed += v.accel * (ctrl.turbo ? 1.25 : 1.0) * dt;
    } else if (ctrl.brake > 0) {
      if (v.speed > 12) {
        v.speed -= v.brake * dt;
        v.brakeLights = true;
      } else {
        v.speed -= v.accel * 0.72 * dt;
        v.reversing = true;
      }
    } else {
      v.speed *= Math.pow(0.24, dt);
      if (Math.abs(v.speed) < 3) v.speed = 0;
    }

    if (ctrl.handbrake) {
      v.speed *= Math.pow(0.08, dt);
      v.brakeLights = true;
    }

    v.speed = Physics.clamp(v.speed, -v.reverseSpeed, topForward);

    const speedRatio = Math.min(1, Math.abs(v.speed) / 95);
    const reverseSign = v.speed >= 0 ? 1 : -1;
    if (Math.abs(ctrl.steer) > 0.01 && speedRatio > 0.04) {
      v.angle = Physics.normalizeAngle(
        v.angle + ctrl.steer * v.turnRate * speedRatio * reverseSign * dt
      );
    }

    const forwardX = Math.cos(v.angle);
    const forwardY = Math.sin(v.angle);
    const rightX = -forwardY;
    const rightY = forwardX;

    const lateralVel = v.vx * rightX + v.vy * rightY;
    const lateralGrip = ctrl.handbrake ? 0.96 : v.grip;
    const dampedLateral = lateralVel * Math.pow(1 - lateralGrip, dt * 8);

    if ((Math.abs(lateralVel) > 58 || ctrl.handbrake) && Math.abs(v.speed) > 90) {
      Renderer.addSkidParticle(
        v.x - forwardX * (v.length * 0.35),
        v.y - forwardY * (v.length * 0.35),
        v.angle
      );
    }

    v.vx = forwardX * v.speed + rightX * dampedLateral;
    v.vy = forwardY * v.speed + rightY * dampedLateral;

    v.x += v.vx * dt;
    v.y += v.vy * dt;

    if (v.isPolice) {
      v.sirenPhase = (v.sirenPhase || 0) + dt * (v.sirenActive ? 10 : 0);
    }

    p.x = v.x;
    p.y = v.y;
    p.angle = v.angle;
    Garage.syncWorldVehicle(v);
  }

  function updateTrafficVehicle(v, dt) {
    if (!v.isAI || v.isParked) {
      v.vx *= Math.pow(0.1, dt);
      v.vy *= Math.pow(0.1, dt);
      v.speed = Math.hypot(v.vx, v.vy);
      return;
    }

    if (v.stunTimer > 0) {
      v.stunTimer -= dt;
      v.vx *= 0.92;
      v.vy *= 0.92;
      v.x += v.vx * dt;
      v.y += v.vy * dt;
      return;
    }

    v.turnCooldown = Math.max(0, v.turnCooldown - dt);

    const bs = Config.WORLD.blockSize;
    const rw = Config.WORLD.roadWidth;

    if (v.turnCooldown <= 0) {
      const rx = ((v.x % bs) + bs) % bs;
      const ry = ((v.y % bs) + bs) % bs;
      if (rx > 34 && rx < rw - 34 && ry > 34 && ry < rw - 34 && Math.random() < 0.025) {
        const blockX = Math.floor(v.x / bs) * bs;
        const blockY = Math.floor(v.y / bs) * bs;
        const newDir = Math.random() < 0.5 ? 1 : -1;
        if (v.aiAxis === 'h') {
          v.aiAxis = 'v';
          v.aiDir = newDir;
          v.aiLanePos = blockX + (newDir > 0 ? 108 : 42);
        } else {
          v.aiAxis = 'h';
          v.aiDir = newDir;
          v.aiLanePos = blockY + (newDir > 0 ? 108 : 42);
        }
        v.turnCooldown = 3.2;
      }
    }

    if (v.aiAxis === 'h') {
      if (v.x > Config.WORLD.width - 55) v.aiDir = -1;
      if (v.x < 55) v.aiDir = 1;
    } else {
      if (v.y > Config.WORLD.height - 55) v.aiDir = -1;
      if (v.y < 55) v.aiDir = 1;
    }

    let targetAngle;
    if (v.aiAxis === 'h') {
      const aimX = v.x + v.aiDir * 90;
      targetAngle = Math.atan2(v.aiLanePos - v.y, aimX - v.x);
    } else {
      const aimY = v.y + v.aiDir * 90;
      targetAngle = Math.atan2(aimY - v.y, v.aiLanePos - v.x);
    }

    const angleDiff = Physics.normalizeAngle(targetAngle - v.angle);
    v.angle = Physics.normalizeAngle(
      v.angle + Physics.clamp(angleDiff, -v.turnRate * dt, v.turnRate * dt)
    );

    const forwardX = Math.cos(v.angle);
    const forwardY = Math.sin(v.angle);
    let obstacleAhead = false;

    for (let i = 0; i < state.vehicles.length; i++) {
      const other = state.vehicles[i];
      if (other === v) continue;
      const dx = other.x - v.x;
      const dy = other.y - v.y;
      const dist = Math.hypot(dx, dy);
      if (dist < Config.TRAFFIC.lookAheadDist) {
        const dot = (dx * forwardX + dy * forwardY) / (dist || 1);
        if (dot > 0.72) {
          obstacleAhead = true;
          break;
        }
      }
    }

    if (!obstacleAhead && !state.player.inCar) {
      const pdx = state.player.x - v.x;
      const pdy = state.player.y - v.y;
      const pdist = Math.hypot(pdx, pdy);
      if (pdist < 64 && (pdx * forwardX + pdy * forwardY) / (pdist || 1) > 0.72) {
        obstacleAhead = true;
      }
    }

    const desiredSpeed = obstacleAhead ? 0 : Config.TRAFFIC.aiCruiseSpeed;
    v.brakeLights = obstacleAhead && v.speed > 15;

    if (v.speed < desiredSpeed) {
      v.speed = Math.min(desiredSpeed, v.speed + v.accel * 0.65 * dt);
    } else {
      v.speed = Math.max(desiredSpeed, v.speed - v.brake * 0.9 * dt);
    }

    v.vx = forwardX * v.speed;
    v.vy = forwardY * v.speed;
    v.x += v.vx * dt;
    v.y += v.vy * dt;
  }

  function updatePedestrians(dt) {
    const p = state.player;
    for (let i = 0; i < state.pedestrians.length; i++) {
      const ped = state.pedestrians[i];

      if (ped.knockTimer > 0) {
        ped.knockTimer -= dt;
        ped.x += ped.vx * dt;
        ped.y += ped.vy * dt;
        ped.vx *= 0.88;
        ped.vy *= 0.88;
        continue;
      }

      let threat = null;
      for (let j = 0; j < state.vehicles.length; j++) {
        const v = state.vehicles[j];
        const vSpd = Math.hypot(v.vx, v.vy);
        if (vSpd < 25) continue;
        const dx = ped.x - v.x;
        const dy = ped.y - v.y;
        const dist = Math.hypot(dx, dy);

        if (dist < v.length * 0.5 + ped.radius + 3 && vSpd > 65) {
          ped.knockTimer = 2.6;
          const pushAngle = Math.atan2(dy, dx);
          ped.vx = Math.cos(pushAngle) * 120;
          ped.vy = Math.sin(pushAngle) * 120;
          if (v === p.vehicle) {
            Police.addWanted(
              1,
              ped.x,
              ped.y,
              'Atropello reportado',
              (msg) => UI.showToast(msg)
            );
            Audio.playCrash(0.45);
          }
          break;
        }

        if (dist < 62) {
          threat = v;
        }
      }

      if (ped.knockTimer > 0) continue;

      if (threat || ped.panicTimer > 0) {
        if (ped.panicTimer > 0) ped.panicTimer -= dt;
        const fleeFrom = threat || p;
        const fleeAngle = Math.atan2(ped.y - fleeFrom.y, ped.x - fleeFrom.x);
        ped.angle = fleeAngle;
        Physics.moveCircleEntity(
          ped,
          Math.cos(fleeAngle) * ped.speed * 1.75 * dt,
          Math.sin(fleeAngle) * ped.speed * 1.75 * dt,
          ped.radius
        );
        ped.walkPhase += dt * 15;
      } else {
        const target = ped.loop[ped.targetIdx];
        const dx = target.x - ped.x;
        const dy = target.y - ped.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 10) {
          ped.targetIdx = (ped.targetIdx + ped.loopDir + ped.loop.length) % ped.loop.length;
        } else {
          ped.angle = Math.atan2(dy, dx);
          Physics.moveCircleEntity(
            ped,
            Math.cos(ped.angle) * ped.speed * dt,
            Math.sin(ped.angle) * ped.speed * dt,
            ped.radius
          );
          ped.walkPhase += dt * 8;
        }
      }
    }
  }

  function completeMission(m) {
    state.money += m.reward;
    state.missionsCompleted += 1;
    Audio.playMissionComplete();
    UI.showToast(`¡Misión completada! +$ ${m.reward}`, 3000);
    advanceNextMission();
  }

  function updateMission(dt) {
    const m = state.mission;
    const p = state.player;
    if (!m) return;

    if (state.missionTimeLeft > 0) {
      state.missionTimeLeft -= dt;
      if (state.missionTimeLeft <= 0) {
        state.missionTimeLeft = 0;
        Audio.playMissionFail();
        Police.addWanted(
          m.failWantedBonus || 1,
          p.x,
          p.y,
          '¡Tiempo agotado! Alerta policial activada',
          (msg) => UI.showToast(msg, 3200)
        );
        advanceNextMission();
        return;
      }
    }

    if (m.type === 'escape_police') {
      if (Police.state.wanted === 0) {
        completeMission(m);
      }
      return;
    }

    if (m.type === 'recover_vehicle') {
      const targetVeh = state.vehicles.find((v) => v.id === m.targetVehicleId);
      if (targetVeh) {
        m.x = p.vehicle === targetVeh ? Config.GARAGES[0].x : targetVeh.x;
        m.y = p.vehicle === targetVeh ? Config.GARAGES[0].y : targetVeh.y;
        if (p.vehicle === targetVeh) {
          const distGarage = Math.hypot(targetVeh.x - Config.GARAGES[0].x, targetVeh.y - Config.GARAGES[0].y);
          if (distGarage <= m.radius) {
            completeMission(m);
          }
        }
      }
      return;
    }

    const dist = Math.hypot(p.x - m.x, p.y - m.y);
    if (dist <= m.radius) {
      if (m.minWantedRequired && Police.state.wanted < m.minWantedRequired) {
        UI.showToast(`Necesitas al menos ${m.minWantedRequired}★ de búsqueda activa para este encargo`);
        return;
      }
      completeMission(m);
    }
  }

  function updateCamera(dt) {
    const p = state.player;
    const lookAheadX = p.inCar && p.vehicle ? p.vehicle.vx * 0.25 : 0;
    const lookAheadY = p.inCar && p.vehicle ? p.vehicle.vy * 0.25 : 0;

    const targetX = Physics.clamp(
      p.x + lookAheadX - viewW * 0.5,
      0,
      Math.max(0, Config.WORLD.width - viewW)
    );
    const targetY = Physics.clamp(
      p.y + lookAheadY - viewH * 0.5,
      0,
      Math.max(0, Config.WORLD.height - viewH)
    );

    const smooth = 1 - Math.pow(0.0015, dt);
    state.camera.x += (targetX - state.camera.x) * smooth;
    state.camera.y += (targetY - state.camera.y) * smooth;
  }

  function update(dt) {
    if (UI.isGarageOpen()) {
      return;
    }

    if (state.player.inCar) {
      updatePlayerVehicle(dt);
    } else {
      updatePlayerOnFoot(dt);
    }

    for (let i = 0; i < state.vehicles.length; i++) {
      const v = state.vehicles[i];
      if (v !== state.player.vehicle && !v.isPolice) {
        updateTrafficVehicle(v, dt);
      }
    }

    Police.update(dt, state.vehicles, state.player, {
      updateCivilTraffic: updateTrafficVehicle,
      onNotify: (msg) => UI.showToast(msg, 2800),
      onStarReduced: (rem) => UI.showToast(`Rastro enfriándose · Quedan ${rem}★`),
      onEscaped: () => UI.showToast('¡Has escapado de la policía! (0★)', 3000),
      onBusted: () => {
        const fine = Math.min(state.money, 100);
        state.money -= fine;
        Police.clearWanted();
        if (state.player.inCar && state.player.vehicle) {
          state.player.inCar = false;
          state.player.vehicle = null;
          Input.setMode(false);
        }
        state.player.x = Config.PLAYER.startX;
        state.player.y = Config.PLAYER.startY;
        Audio.playMissionFail();
        UI.showToast(`🚨 ¡Detenido por la policía! Fianza: -$ ${fine}`, 3600);
        if (state.mission && (state.mission.type === 'timed_stealth' || state.mission.type === 'wanted_run')) {
          advanceNextMission();
        }
      }
    });

    for (let i = 0; i < state.vehicles.length; i++) {
      const v = state.vehicles[i];
      Physics.resolveVehicleBuildings(v, (ix, iy, intensity) => {
        if (v === state.player.vehicle) {
          Audio.playCrash(intensity);
          Renderer.addSparkParticles(ix, iy, 6);
          if (intensity > 0.65) {
            Police.registerIncident(0.55, ix, iy, (msg) => UI.showToast(msg));
          }
        }
      });
    }

    Physics.resolveVehicleCollisions(state.vehicles, state.player.vehicle, (info) => {
      Renderer.addSparkParticles(info.x, info.y, 7);
      if (info.involvesPlayer) {
        Audio.playCrash(info.intensity);
        if (info.involvesPolice) {
          if (Police.state.wanted === 0) {
            Police.addWanted(
              1,
              info.x,
              info.y,
              '¡Choque contra patrulla policial!',
              (msg) => UI.showToast(msg)
            );
          } else if (info.intensity > 0.55) {
            Police.addWanted(
              1,
              info.x,
              info.y,
              '¡Embistiendo unidades policiales!',
              (msg) => UI.showToast(msg)
            );
          }
        } else if (info.intensity > 0.45) {
          Police.registerIncident(info.intensity * 0.7, info.x, info.y, (msg) => UI.showToast(msg));
        }
      }
    });

    if (state.player.inCar && state.player.vehicle) {
      state.player.x = state.player.vehicle.x;
      state.player.y = state.player.vehicle.y;
    }

    updatePedestrians(dt);
    updateMission(dt);
    Renderer.updateEffects(dt, state.vehicles);
    updateCamera(dt);

    const p = state.player;
    const v = p.vehicle;
    const nearGarage = Boolean(World.getGarageAt(p.x, p.y, 26));
    Input.setNearbyGarage(nearGarage);

    const dist = state.mission ? Math.hypot(p.x - state.mission.x, p.y - state.mission.y) : 0;
    const speedKmh = v ? Math.abs(v.speed) * 0.42 : 0;
    const vehicleHpPct = v ? (v.hp / v.maxHp) * 100 : 100;

    UI.updateHUD({
      money: state.money,
      inCar: p.inCar,
      vehicleName: v ? v.name : '',
      missionsCompleted: state.missionsCompleted,
      wanted: Police.state.wanted,
      policeHUD: Police.getHUDState(),
      nearGarage,
      mission: state.mission,
      missionTimeLeft: state.missionTimeLeft,
      missionDist: dist,
      speedKmh,
      vehicleHpPct
    });
  }

  function loop(now) {
    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;

    update(dt);
    Renderer.render(ctx, viewW, viewH, {
      player: state.player,
      vehicles: state.vehicles,
      pedestrians: state.pedestrians,
      mission: state.mission,
      camera: state.camera,
      policeHUD: Police.getHUDState(),
      roadblocks: Police.state.roadblocks
    });

    requestAnimationFrame(loop);
  }

  function init() {
    UI.init();
    Input.init({
      onEnterExit: toggleEnterExitVehicle,
      onReset: resetWorld,
      onHorn: triggerHorn,
      onGarage: handleGarageAction
    });

    const btnAudio = document.getElementById('btn-audio');
    if (btnAudio) {
      btnAudio.addEventListener('click', () => {
        const enabled = Audio.toggle();
        UI.updateAudioButton(enabled);
      });
    }

    const btnTouch = document.getElementById('btn-touch-toggle');
    if (btnTouch) {
      btnTouch.addEventListener('click', () => {
        const mode = Input.cycleTouchMode();
        UI.updateTouchButton(Input.getTouchModeLabel(), mode);
      });
      UI.updateTouchButton(Input.getTouchModeLabel(), 'auto');
    }

    const btnReset = document.getElementById('btn-reset');
    if (btnReset) {
      btnReset.addEventListener('click', resetWorld);
    }

    const btnGarageTop = document.getElementById('btn-garage-top');
    if (btnGarageTop) {
      btnGarageTop.addEventListener('click', () => handleGarageAction(false));
    }

    const btnGarageClose = document.getElementById('btn-garage-close');
    if (btnGarageClose) {
      btnGarageClose.addEventListener('click', () => handleGarageAction(true));
    }

    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('orientationchange', () => {
      setTimeout(resizeCanvas, 120);
    });

    resizeCanvas();
    resetWorld();
    lastTime = performance.now();
    requestAnimationFrame(loop);
  }

  return { init, state, resetWorld };
})();

window.addEventListener('DOMContentLoaded', () => {
  CiudadCero.Game.init();
});
