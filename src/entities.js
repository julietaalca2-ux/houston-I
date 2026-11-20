window.CiudadCero = window.CiudadCero || {};

CiudadCero.Entities = (() => {
  const Config = CiudadCero.Config;
  const World = CiudadCero.World;

  let nextVehicleId = 1;
  let nextPedId = 1;

  function randomItem(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function createPlayer() {
    return {
      x: Config.PLAYER.startX,
      y: Config.PLAYER.startY,
      angle: 0,
      speed: 0,
      radius: Config.PLAYER.radius,
      inCar: false,
      vehicle: null,
      walkPhase: 0
    };
  }

  function createVehicle(opts = {}) {
    const civilKeys = ['coupe', 'sedan', 'taxi', 'suv', 'van'];
    const typeKey = opts.typeId || randomItem(civilKeys);
    const spec = Config.VEHICLE_TYPES[typeKey] || Config.VEHICLE_TYPES.sedan;
    const color = opts.color || randomItem(spec.colors);
    const armorUpgraded = Boolean(opts.armorUpgraded);
    const engineUpgraded = Boolean(opts.engineUpgraded);
    const baseMaxHp = opts.maxHp || spec.maxHp || 120;
    const maxHp = baseMaxHp;
    const speedMult = engineUpgraded && !opts.maxHp ? 1.12 : 1.0;

    return {
      id: nextVehicleId++,
      typeId: spec.id,
      name: opts.customName || spec.name,
      color,
      x: opts.x || 520,
      y: opts.y || 390,
      angle: opts.angle || 0,
      speed: 0,
      vx: 0,
      vy: 0,
      length: spec.length,
      width: spec.width,
      maxSpeed: Math.round(spec.maxSpeed * speedMult),
      turboSpeed: Math.round(spec.turboSpeed * speedMult),
      reverseSpeed: spec.reverseSpeed,
      accel: Math.round(spec.accel * speedMult),
      brake: spec.brake,
      turnRate: spec.turnRate,
      grip: spec.grip,
      mass: spec.mass,
      hp: opts.hp !== undefined ? opts.hp : maxHp,
      maxHp,
      armorUpgraded,
      engineUpgraded,
      isPlayerOwned: Boolean(opts.isPlayerOwned),
      isPolice: Boolean(spec.isPolice || opts.isPolice),
      policeRole: spec.policeRole || opts.policeRole || null,
      policeState: opts.policeState || 'patrol',
      sirenActive: Boolean(opts.sirenActive),
      sirenPhase: Math.random() * Math.PI * 2,
      isMissionTarget: Boolean(opts.isMissionTarget),
      isChaseTarget: Boolean(opts.isChaseTarget),
      isAI: Boolean(opts.isAI),
      isParked: Boolean(opts.isParked),
      brakeLights: false,
      reversing: false,
      aiAxis: opts.aiAxis || 'h',
      aiDir: opts.aiDir || 1,
      aiLanePos: opts.aiLanePos || 408,
      turnCooldown: 1.5,
      stunTimer: 0
    };
  }

  function spawnTrafficVehicle(existingVehicles, playerRef) {
    const lanes = World.getLaneCoords();
    const weightedTypes = ['sedan', 'sedan', 'taxi', 'coupe', 'suv', 'van'];

    for (let attempt = 0; attempt < 25; attempt++) {
      const lane = randomItem(lanes);
      let x, y, angle;
      if (lane.axis === 'h') {
        x = 90 + Math.random() * (Config.WORLD.width - 180);
        y = lane.pos;
        angle = lane.dir > 0 ? 0 : Math.PI;
      } else {
        x = lane.pos;
        y = 90 + Math.random() * (Config.WORLD.height - 180);
        angle = lane.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
      }

      if (playerRef && Math.hypot(x - playerRef.x, y - playerRef.y) < 260) {
        continue;
      }
      const tooClose = existingVehicles.some(
        (v) => Math.hypot(v.x - x, v.y - y) < 115
      );
      if (tooClose) continue;

      return createVehicle({
        typeId: randomItem(weightedTypes),
        x,
        y,
        angle,
        isAI: true,
        isParked: false,
        aiAxis: lane.axis,
        aiDir: lane.dir,
        aiLanePos: lane.pos
      });
    }
    return null;
  }

  function spawnPoliceVehicle(existingVehicles, playerRef, typeId = 'police_patrol', nearPlayer = false) {
    const lanes = World.getLaneCoords();
    let bestCandidate = null;

    for (let attempt = 0; attempt < 35; attempt++) {
      const lane = randomItem(lanes);
      let x, y, angle;
      if (lane.axis === 'h') {
        x = 90 + Math.random() * (Config.WORLD.width - 180);
        y = lane.pos;
        angle = lane.dir > 0 ? 0 : Math.PI;
      } else {
        x = lane.pos;
        y = 90 + Math.random() * (Config.WORLD.height - 180);
        angle = lane.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
      }

      const distToPlayer = playerRef ? Math.hypot(x - playerRef.x, y - playerRef.y) : 500;
      if (distToPlayer < 260) continue;
      if (nearPlayer && distToPlayer > 720) continue;

      const tooClose = existingVehicles.some(
        (v) => Math.hypot(v.x - x, v.y - y) < 110
      );
      if (tooClose) continue;

      bestCandidate = createVehicle({
        typeId,
        x,
        y,
        angle,
        isAI: true,
        isParked: false,
        sirenActive: nearPlayer,
        policeState: nearPlayer ? 'pursue' : 'patrol',
        aiAxis: lane.axis,
        aiDir: lane.dir,
        aiLanePos: lane.pos
      });
      break;
    }

    return bestCandidate;
  }

  function createPedestrian() {
    const outfits = [
      { shirt: '#d9e6a2', hair: '#2a241e' },
      { shirt: '#6cb2d1', hair: '#3b281c' },
      { shirt: '#e07a5f', hair: '#1d1d1d' },
      { shirt: '#f2cc8f', hair: '#5a3e2b' },
      { shirt: '#9b8ec4', hair: '#232026' },
      { shirt: '#81b29a', hair: '#382b22' }
    ];
    const look = randomItem(outfits);
    const loop = randomItem(World.sidewalkNodes);
    const startIdx = Math.floor(Math.random() * loop.length);
    const startNode = loop[startIdx];
    const dir = Math.random() < 0.5 ? 1 : -1;
    const nextIdx = (startIdx + dir + loop.length) % loop.length;

    return {
      id: nextPedId++,
      x: startNode.x,
      y: startNode.y,
      angle: 0,
      radius: 7,
      speed: 36 + Math.random() * 18,
      shirt: look.shirt,
      hair: look.hair,
      loop,
      targetIdx: nextIdx,
      loopDir: dir,
      walkPhase: Math.random() * Math.PI * 2,
      panicTimer: 0,
      knockTimer: 0,
      vx: 0,
      vy: 0
    };
  }

  function createStoryNPCs() {
    const list = [];
    const chars = Config.CHARACTERS || {};
    Object.keys(chars).forEach((key) => {
      const c = chars[key];
      if (!c.inWorld) return;
      list.push({
        id: c.id,
        name: c.name,
        role: c.role,
        color: c.color,
        shirt: c.shirt,
        hair: c.hair,
        x: c.x,
        y: c.y,
        radius: 10,
        angle: Math.PI / 2,
        pulsePhase: Math.random() * Math.PI * 2
      });
    });
    return list;
  }

  return {
    createPlayer,
    createVehicle,
    spawnTrafficVehicle,
    spawnPoliceVehicle,
    createPedestrian,
    createStoryNPCs
  };
})();
