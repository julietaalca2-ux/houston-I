window.CiudadCero = window.CiudadCero || {};

CiudadCero.Police = (() => {
  const Config = CiudadCero.Config;
  const World = CiudadCero.World;
  const Entities = CiudadCero.Entities;
  const Physics = CiudadCero.Physics;

  const pCfg = Config.POLICE;

  const state = {
    wanted: 0,
    escapeProgress: 0,
    playerInSight: false,
    playerInHideout: false,
    lastKnownX: 0,
    lastKnownY: 0,
    hasLastKnown: false,
    activeUnitsCount: 0,
    bustTimer: 0,
    sirenAudioTimer: 0,
    roadblocks: [],
    roadblockSpawnCooldown: 0,
    incidentHeat: 0,
    starCooldown: 0
  };

  function reset() {
    state.wanted = 0;
    state.escapeProgress = 0;
    state.playerInSight = false;
    state.playerInHideout = false;
    state.lastKnownX = 0;
    state.lastKnownY = 0;
    state.hasLastKnown = false;
    state.activeUnitsCount = 0;
    state.bustTimer = 0;
    state.sirenAudioTimer = 0;
    state.roadblocks = [];
    state.roadblockSpawnCooldown = 0;
    state.incidentHeat = 0;
    state.starCooldown = 0;
  }

  function getLevelConfig(level) {
    return pCfg.levels[Physics.clamp(level, 1, 5)] || pCfg.levels[1];
  }

  function addWanted(delta, posX, posY, reasonMsg, onNotify) {
    if (state.starCooldown > 0 && delta <= 1) return false;
    const prev = state.wanted;
    state.wanted = Physics.clamp(state.wanted + delta, 0, 5);
    state.escapeProgress = 0;
    state.starCooldown = 2.2;

    if (posX !== undefined && posY !== undefined) {
      state.lastKnownX = posX;
      state.lastKnownY = posY;
      state.hasLastKnown = true;
      state.playerInSight = true;
    }

    if (state.wanted > prev) {
      CiudadCero.Audio.playAlert();
      if (typeof onNotify === 'function') {
        const lvl = getLevelConfig(state.wanted);
        onNotify(`${lvl.label}${reasonMsg ? ' · ' + reasonMsg : ''}`);
      }
      return true;
    }
    return false;
  }

  function setMinWanted(minLevel, posX, posY, reasonMsg, onNotify) {
    if (state.wanted < minLevel) {
      return addWanted(minLevel - state.wanted, posX, posY, reasonMsg, onNotify);
    }
    if (posX !== undefined && posY !== undefined) {
      state.lastKnownX = posX;
      state.lastKnownY = posY;
      state.hasLastKnown = true;
      state.escapeProgress = 0;
    }
    return false;
  }

  function reduceWanted(amount, onNotify) {
    if (state.wanted <= 0) return false;
    state.wanted = Math.max(0, state.wanted - amount);
    state.escapeProgress = 0;
    if (state.wanted === 0) {
      state.hasLastKnown = false;
      state.playerInSight = false;
      state.roadblocks = [];
    }
    if (typeof onNotify === 'function') {
      onNotify(state.wanted === 0 ? '¡Alerta policial eliminada! (0★)' : `Alerta reducida a ${state.wanted}★`);
    }
    return true;
  }

  function clearWanted() {
    state.wanted = 0;
    state.escapeProgress = 0;
    state.playerInSight = false;
    state.hasLastKnown = false;
    state.bustTimer = 0;
    state.roadblocks = [];
  }

  function registerIncident(amount, x, y, onNotify) {
    state.incidentHeat += amount;
    if (state.incidentHeat >= 1.0) {
      state.incidentHeat = 0;
      if (state.wanted === 0) {
        addWanted(1, x, y, 'Conducción temeraria', onNotify);
      } else if (state.wanted < 3) {
        addWanted(1, x, y, 'Daños graves en vía pública', onNotify);
      }
    }
  }

  function maintainUnits(vehicles, player) {
    const policeUnits = vehicles.filter(
      (v) => v.isPolice && !v.isRoadblock && !v.isChaseTarget && v !== player.vehicle
    );
    state.activeUnitsCount = policeUnits.length;

    const desiredCount =
      state.wanted === 0
        ? pCfg.ambientPatrols
        : getLevelConfig(state.wanted).maxUnits;

    if (policeUnits.length > desiredCount) {
      for (let i = 0; i < policeUnits.length && policeUnits.length > desiredCount; i++) {
        const unit = policeUnits[i];
        if (Math.hypot(unit.x - player.x, unit.y - player.y) > 780) {
          const idx = vehicles.indexOf(unit);
          if (idx !== -1) vehicles.splice(idx, 1);
          policeUnits.splice(i, 1);
          i--;
        }
      }
    }

    if (policeUnits.length < desiredCount) {
      const lvlCfg = state.wanted > 0 ? getLevelConfig(state.wanted) : null;
      const choices = lvlCfg ? lvlCfg.types : ['police_patrol'];
      const chosenType = choices[Math.floor(Math.random() * choices.length)];
      const spawned = Entities.spawnPoliceVehicle(
        vehicles,
        player,
        chosenType,
        state.wanted > 0
      );
      if (spawned) {
        vehicles.push(spawned);
      }
    }
  }

  function updateRoadblocks(dt, vehicles, player, onNotify) {
    const shouldHaveRoadblocks = state.wanted >= 4;

    for (let i = state.roadblocks.length - 1; i >= 0; i--) {
      const rb = state.roadblocks[i];
      const dist = Math.hypot(rb.x - player.x, rb.y - player.y);
      rb.ttl -= dt;
      if (!shouldHaveRoadblocks || rb.ttl <= 0 || dist > 1100) {
        rb.units.forEach((u) => {
          if (u !== player.vehicle) {
            const idx = vehicles.indexOf(u);
            if (idx !== -1) vehicles.splice(idx, 1);
          }
        });
        state.roadblocks.splice(i, 1);
      }
    }

    if (!shouldHaveRoadblocks) return;
    if (state.roadblockSpawnCooldown > 0) {
      state.roadblockSpawnCooldown -= dt;
      return;
    }
    if (state.roadblocks.length >= 2) return;

    const moveAngle = player.inCar && player.vehicle ? player.vehicle.angle : player.angle;
    const aheadX = player.x + Math.cos(moveAngle) * 520;
    const aheadY = player.y + Math.sin(moveAngle) * 520;
    const bs = Config.WORLD.blockSize;
    const rw = Config.WORLD.roadWidth;

    const ix = Math.round((aheadX - rw * 0.5) / bs) * bs + rw * 0.5;
    const iy = Math.round((aheadY - rw * 0.5) / bs) * bs + rw * 0.5;

    if (ix < 200 || ix > Config.WORLD.width - 200 || iy < 200 || iy > Config.WORLD.height - 200) {
      return;
    }
    if (Math.hypot(ix - player.x, iy - player.y) < 340) return;

    const horizontalBlock = Math.abs(Math.cos(moveAngle)) < 0.7;
    const blockAngle = horizontalBlock ? 0 : Math.PI / 2;
    const offset = 28;

    const u1 = Entities.createVehicle({
      typeId: 'police_enforcer',
      x: horizontalBlock ? ix - offset : ix,
      y: horizontalBlock ? iy : iy - offset,
      angle: blockAngle,
      isAI: true,
      isParked: true,
      sirenActive: true,
      policeState: 'roadblock'
    });
    u1.isRoadblock = true;

    const u2 = Entities.createVehicle({
      typeId: 'police_patrol',
      x: horizontalBlock ? ix + offset : ix,
      y: horizontalBlock ? iy : iy + offset,
      angle: blockAngle + Math.PI,
      isAI: true,
      isParked: true,
      sirenActive: true,
      policeState: 'roadblock'
    });
    u2.isRoadblock = true;

    vehicles.push(u1, u2);
    state.roadblocks.push({
      x: ix,
      y: iy,
      horizontal: horizontalBlock,
      units: [u1, u2],
      ttl: 28
    });
    state.roadblockSpawnCooldown = 14;

    if (typeof onNotify === 'function') {
      onNotify('🚧 ¡Bloqueo policial desplegado más adelante!');
    }
  }

  function computeStreetPursuitAngle(unit, targetX, targetY) {
    const bs = Config.WORLD.blockSize;
    const rw = Config.WORLD.roadWidth;
    const rx = ((unit.x % bs) + bs) % bs;
    const ry = ((unit.y % bs) + bs) % bs;
    const inVertRoad = rx < rw;
    const inHorizRoad = ry < rw;

    const dx = targetX - unit.x;
    const dy = targetY - unit.y;
    const directAngle = Math.atan2(dy, dx);

    if (Math.hypot(dx, dy) < 230 && Physics.hasLineOfSight(unit.x, unit.y, targetX, targetY)) {
      return directAngle;
    }

    if (inVertRoad && inHorizRoad) {
      if (Math.abs(dx) > Math.abs(dy)) {
        return dx >= 0 ? 0 : Math.PI;
      }
      return dy >= 0 ? Math.PI / 2 : -Math.PI / 2;
    }

    if (inHorizRoad && !inVertRoad) {
      const roadCenterY = Math.floor(unit.y / bs) * bs + (dx >= 0 ? 108 : 42);
      const aimX = unit.x + (dx >= 0 ? 120 : -120);
      return Math.atan2(roadCenterY - unit.y, aimX - unit.x);
    }

    if (inVertRoad && !inHorizRoad) {
      const roadCenterX = Math.floor(unit.x / bs) * bs + (dy >= 0 ? 42 : 108);
      const aimY = unit.y + (dy >= 0 ? 120 : -120);
      return Math.atan2(aimY - unit.y, roadCenterX - unit.x);
    }

    return directAngle;
  }

  function updateChaseTargetVehicle(unit, dt, player) {
    if (unit.isPolice) {
      unit.sirenPhase = (unit.sirenPhase || 0) + dt * 11;
      unit.sirenActive = true;
    }

    if (unit.hp <= 30) {
      unit.vx *= Math.pow(0.08, dt);
      unit.vy *= Math.pow(0.08, dt);
      unit.speed = 0;
      unit.brakeLights = true;
      return;
    }

    if (unit.stunTimer > 0) {
      unit.stunTimer -= dt;
      unit.vx *= 0.92;
      unit.vy *= 0.92;
      unit.x += unit.vx * dt;
      unit.y += unit.vy * dt;
      return;
    }

    // Flee away from player while keeping near city center bounds
    const awayX = unit.x - player.x;
    const awayY = unit.y - player.y;
    const awayDist = Math.hypot(awayX, awayY) || 1;
    let escapeTargetX = unit.x + (awayX / awayDist) * 420;
    let escapeTargetY = unit.y + (awayY / awayDist) * 420;

    // Pull gently toward inner map if close to edges so target doesn't get cornered at border
    if (escapeTargetX < 220) escapeTargetX = 680;
    if (escapeTargetX > Config.WORLD.width - 220) escapeTargetX = Config.WORLD.width - 680;
    if (escapeTargetY < 220) escapeTargetY = 540;
    if (escapeTargetY > Config.WORLD.height - 220) escapeTargetY = Config.WORLD.height - 540;

    let desiredAngle = computeStreetPursuitAngle(unit, escapeTargetX, escapeTargetY);

    const probeDist = 56;
    const frontX = unit.x + Math.cos(unit.angle) * probeDist;
    const frontY = unit.y + Math.sin(unit.angle) * probeDist;
    if (Physics.collidesBuildingCircle(frontX, frontY, 16)) {
      const leftX = unit.x + Math.cos(unit.angle - 0.7) * probeDist;
      const leftY = unit.y + Math.sin(unit.angle - 0.7) * probeDist;
      const rightX = unit.x + Math.cos(unit.angle + 0.7) * probeDist;
      const rightY = unit.y + Math.sin(unit.angle + 0.7) * probeDist;
      const leftFree = !Physics.collidesBuildingCircle(leftX, leftY, 16);
      const rightFree = !Physics.collidesBuildingCircle(rightX, rightY, 16);
      if (leftFree && !rightFree) desiredAngle = unit.angle - 0.95;
      else if (rightFree && !leftFree) desiredAngle = unit.angle + 0.95;
      else desiredAngle = unit.angle + 1.25;
    }

    const diff = Physics.normalizeAngle(desiredAngle - unit.angle);
    const maxTurn = unit.turnRate * 1.15 * dt;
    unit.angle = Physics.normalizeAngle(
      unit.angle + Physics.clamp(diff, -maxTurn, maxTurn)
    );

    const distToPlayer = Math.hypot(player.x - unit.x, player.y - unit.y);
    // Rubber-banding so chase feels exciting and fair on PC and mobile
    const baseChaseSpeed = distToPlayer > 680 ? 155 : distToPlayer < 220 ? 225 : 195;
    const cornerFactor = Math.abs(diff) > 0.75 ? 0.65 : 1.0;
    const targetSpeed = Math.min(unit.maxSpeed, baseChaseSpeed) * cornerFactor;

    if (unit.speed < targetSpeed) {
      unit.speed = Math.min(targetSpeed, unit.speed + unit.accel * dt);
    } else {
      unit.speed = Math.max(targetSpeed, unit.speed - unit.brake * 0.8 * dt);
    }

    unit.vx = Math.cos(unit.angle) * unit.speed;
    unit.vy = Math.sin(unit.angle) * unit.speed;
    unit.x += unit.vx * dt;
    unit.y += unit.vy * dt;
  }

  function updatePoliceUnit(unit, dt, player, vehicles, updateCivilTrafficFn) {
    if (unit.isChaseTarget) {
      updateChaseTargetVehicle(unit, dt, player);
      return;
    }

    unit.sirenPhase = (unit.sirenPhase || 0) + dt * (state.wanted > 0 ? 11 : 4);

    if (unit.isRoadblock) {
      unit.sirenActive = true;
      unit.vx *= 0.85;
      unit.vy *= 0.85;
      unit.speed = 0;
      return;
    }

    if (unit.stunTimer > 0) {
      unit.stunTimer -= dt;
      unit.vx *= 0.92;
      unit.vy *= 0.92;
      unit.x += unit.vx * dt;
      unit.y += unit.vy * dt;
      return;
    }

    const distToPlayer = Math.hypot(player.x - unit.x, player.y - unit.y);
    const maxSight = state.playerInHideout ? pCfg.hideoutSightRange : pCfg.sightRange;
    const canSeePlayer =
      distToPlayer <= maxSight &&
      Physics.hasLineOfSight(unit.x, unit.y, player.x, player.y);

    if (state.wanted > 0 && canSeePlayer) {
      state.playerInSight = true;
      state.lastKnownX = player.x;
      state.lastKnownY = player.y;
      state.hasLastKnown = true;
    }

    if (state.wanted === 0) {
      unit.sirenActive = false;
      unit.policeState = 'patrol';
      updateCivilTrafficFn(unit, dt);
      return;
    }

    unit.sirenActive = true;
    const lvlCfg = getLevelConfig(state.wanted);

    let targetX = state.lastKnownX;
    let targetY = state.lastKnownY;

    if (canSeePlayer) {
      if (unit.policeRole === 'interceptor' && player.inCar && player.vehicle) {
        unit.policeState = 'intercept';
        const leadTime = 0.75;
        targetX = Physics.clamp(
          player.x + player.vehicle.vx * leadTime,
          80,
          Config.WORLD.width - 80
        );
        targetY = Physics.clamp(
          player.y + player.vehicle.vy * leadTime,
          80,
          Config.WORLD.height - 80
        );
      } else {
        unit.policeState = 'pursue';
        targetX = player.x;
        targetY = player.y;
      }
    } else if (state.hasLastKnown) {
      unit.policeState = 'search';
      const distLast = Math.hypot(state.lastKnownX - unit.x, state.lastKnownY - unit.y);
      if (distLast < 95) {
        const orbitAngle = (performance.now() * 0.0012) + unit.id * 2.1;
        targetX = Physics.clamp(state.lastKnownX + Math.cos(orbitAngle) * 140, 80, Config.WORLD.width - 80);
        targetY = Physics.clamp(state.lastKnownY + Math.sin(orbitAngle) * 140, 80, Config.WORLD.height - 80);
      } else {
        targetX = state.lastKnownX;
        targetY = state.lastKnownY;
      }
    } else {
      unit.policeState = 'patrol';
      updateCivilTrafficFn(unit, dt);
      return;
    }

    let desiredAngle = computeStreetPursuitAngle(unit, targetX, targetY);

    const probeDist = 54;
    const frontX = unit.x + Math.cos(unit.angle) * probeDist;
    const frontY = unit.y + Math.sin(unit.angle) * probeDist;
    if (Physics.collidesBuildingCircle(frontX, frontY, 16)) {
      const leftX = unit.x + Math.cos(unit.angle - 0.65) * probeDist;
      const leftY = unit.y + Math.sin(unit.angle - 0.65) * probeDist;
      const rightX = unit.x + Math.cos(unit.angle + 0.65) * probeDist;
      const rightY = unit.y + Math.sin(unit.angle + 0.65) * probeDist;
      const leftFree = !Physics.collidesBuildingCircle(leftX, leftY, 16);
      const rightFree = !Physics.collidesBuildingCircle(rightX, rightY, 16);
      if (leftFree && !rightFree) desiredAngle = unit.angle - 0.9;
      else if (rightFree && !leftFree) desiredAngle = unit.angle + 0.9;
      else desiredAngle = unit.angle + 1.2;
    }

    const diff = Physics.normalizeAngle(desiredAngle - unit.angle);
    const maxTurn = unit.turnRate * 1.15 * dt;
    unit.angle = Physics.normalizeAngle(
      unit.angle + Physics.clamp(diff, -maxTurn, maxTurn)
    );

    const cornerFactor = Math.abs(diff) > 0.75 ? 0.62 : 1.0;
    const targetSpeed = Math.min(unit.maxSpeed, lvlCfg.chaseSpeed) * cornerFactor;

    if (unit.speed < targetSpeed) {
      unit.speed = Math.min(targetSpeed, unit.speed + unit.accel * 1.05 * dt);
    } else {
      unit.speed = Math.max(targetSpeed, unit.speed - unit.brake * 0.8 * dt);
    }

    unit.vx = Math.cos(unit.angle) * unit.speed;
    unit.vy = Math.sin(unit.angle) * unit.speed;
    unit.x += unit.vx * dt;
    unit.y += unit.vy * dt;
  }

  function update(dt, vehicles, player, callbacks) {
    if (state.starCooldown > 0) state.starCooldown -= dt;
    if (state.incidentHeat > 0) {
      state.incidentHeat = Math.max(0, state.incidentHeat - dt * 0.14);
    }

    const hideout = World.getHideoutAt(player.x, player.y);
    state.playerInHideout = Boolean(hideout);

    maintainUnits(vehicles, player);
    updateRoadblocks(dt, vehicles, player, callbacks && callbacks.onNotify);

    state.playerInSight = false;

    for (let i = 0; i < vehicles.length; i++) {
      const v = vehicles[i];
      if (v !== player.vehicle) {
        if (v.isChaseTarget) {
          updateChaseTargetVehicle(v, dt, player);
        } else if (v.isPolice) {
          updatePoliceUnit(
            v,
            dt,
            player,
            vehicles,
            callbacks && callbacks.updateCivilTraffic
          );
        }
      }
    }

    if (state.wanted > 0) {
      state.sirenAudioTimer -= dt;
      if (state.sirenAudioTimer <= 0) {
        CiudadCero.Audio.playSirenPulse();
        state.sirenAudioTimer = state.playerInSight ? 0.55 : 1.15;
      }

      if (state.playerInSight) {
        state.escapeProgress = Math.max(0, state.escapeProgress - dt * 0.45);
      } else {
        const baseSeconds = pCfg.escapeSecondsPerStar + (state.wanted - 1) * 1.2;
        let rate = 1 / baseSeconds;

        if (state.playerInHideout) {
          rate *= pCfg.hideoutEscapeMultiplier;
        }

        const distFromLast = state.hasLastKnown
          ? Math.hypot(player.x - state.lastKnownX, player.y - state.lastKnownY)
          : 500;
        const searchRad = pCfg.searchRadiusBase + state.wanted * 55;
        if (distFromLast > searchRad) {
          rate *= pCfg.farEscapeMultiplier;
        }

        state.escapeProgress += rate * dt;
        if (state.escapeProgress >= 1) {
          state.wanted = Math.max(0, state.wanted - 1);
          state.escapeProgress = 0;
          if (state.wanted === 0) {
            state.hasLastKnown = false;
            state.bustTimer = 0;
            CiudadCero.Audio.playEscapeSuccess();
            if (callbacks && callbacks.onEscaped) callbacks.onEscaped();
          } else if (callbacks && callbacks.onStarReduced) {
            callbacks.onStarReduced(state.wanted);
          }
        }
      }

      const playerSpeed = player.inCar && player.vehicle
        ? Math.abs(player.vehicle.speed)
        : player.speed;

      let closestPoliceDist = Infinity;
      for (let i = 0; i < vehicles.length; i++) {
        const v = vehicles[i];
        if (v.isPolice && !v.isChaseTarget && v !== player.vehicle) {
          const d = Math.hypot(v.x - player.x, v.y - player.y);
          if (d < closestPoliceDist) closestPoliceDist = d;
        }
      }

      if (closestPoliceDist < 48 && playerSpeed < 28 && state.playerInSight) {
        state.bustTimer += dt;
        if (state.bustTimer >= 1.35) {
          state.bustTimer = 0;
          if (callbacks && callbacks.onBusted) callbacks.onBusted();
        }
      } else {
        state.bustTimer = Math.max(0, state.bustTimer - dt * 1.5);
      }
    } else {
      state.escapeProgress = 0;
      state.bustTimer = 0;
    }
  }

  function getHUDState() {
    let mode = 'sight';
    let label = 'PERSECUCIÓN POLICIAL';
    let help = 'Pierde de vista a las patrullas o entra a un escondite.';

    if (state.wanted > 0) {
      if (state.playerInSight) {
        mode = 'sight';
        label = getLevelConfig(state.wanted).label;
        help = '¡En mira policial! Dobla esquinas o usa un callejón oculto.';
      } else if (state.playerInHideout) {
        mode = 'hidden';
        label = 'OCULTO EN ESCONDITE';
        help = 'Rastro perdiéndose rápidamente... mantente cubierto.';
      } else {
        mode = 'searching';
        label = 'BUSCANDO ÚLTIMA UBICACIÓN';
        help = 'Aléjate del perímetro de búsqueda para bajar estrellas.';
      }
    }

    return {
      wanted: state.wanted,
      escapeProgress: state.escapeProgress,
      playerInSight: state.playerInSight,
      playerInHideout: state.playerInHideout,
      hasLastKnown: state.hasLastKnown,
      lastKnownX: state.lastKnownX,
      lastKnownY: state.lastKnownY,
      searchRadius: pCfg.searchRadiusBase + state.wanted * 55,
      activeUnitsCount: state.activeUnitsCount,
      mode,
      label,
      help
    };
  }

  return {
    state,
    reset,
    addWanted,
    setMinWanted,
    reduceWanted,
    clearWanted,
    registerIncident,
    update,
    getHUDState
  };
})();
