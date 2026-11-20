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
    const civilKeys = ['compact', 'coupe', 'muscle', 'sedan', 'taxi', 'suv', 'van', 'truck'];
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

  function spawnTrafficVehicle(existingVehicles, playerRef, preferNearPlayer = false) {
    const lanes = World.getLaneCoords();
    const weightedTypes = [
      'sedan', 'sedan', 'compact', 'compact',
      'taxi', 'coupe', 'muscle', 'suv', 'van', 'truck'
    ];

    for (let attempt = 0; attempt < 30; attempt++) {
      const lane = randomItem(lanes);
      let x, y, angle;
      if (lane.axis === 'h') {
        if (preferNearPlayer && playerRef) {
          x = Math.max(90, Math.min(Config.WORLD.width - 90, playerRef.x + (Math.random() - 0.5) * 2200));
        } else {
          x = 90 + Math.random() * (Config.WORLD.width - 180);
        }
        y = lane.pos;
        angle = lane.dir > 0 ? 0 : Math.PI;
      } else {
        x = lane.pos;
        if (preferNearPlayer && playerRef) {
          y = Math.max(90, Math.min(Config.WORLD.height - 90, playerRef.y + (Math.random() - 0.5) * 2000));
        } else {
          y = 90 + Math.random() * (Config.WORLD.height - 180);
        }
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
      if (nearPlayer && distToPlayer > 780) continue;

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
    const loop = randomItem(World.sidewalkNodes);
    const startIdx = Math.floor(Math.random() * loop.length);
    const startNode = loop[startIdx];
    const dir = Math.random() < 0.5 ? 1 : -1;
    const nextIdx = (startIdx + dir + loop.length) % loop.length;
    const dId = startNode.districtId || 'residencial';

    const districtOutfits = {
      centro: [
        { shirt: '#2b3a4a', hair: '#1c1f24', hatType: 'none', hasBag: true, role: 'executive' },
        { shirt: '#495867', hair: '#3b281c', hatType: 'none', hasBag: false, role: 'executive' },
        { shirt: '#d8e2dc', hair: '#2a241e', hatType: 'none', hasBag: true, role: 'executive' }
      ],
      industrial: [
        { shirt: '#e68a3e', hair: '#222222', hatType: 'hardhat', hasBag: false, role: 'worker' },
        { shirt: '#f5d94b', hair: '#3a2b1d', hatType: 'hardhat', hasBag: false, role: 'worker' },
        { shirt: '#4a6670', hair: '#1e1e1e', hatType: 'cap', hasBag: false, role: 'worker' }
      ],
      portuaria: [
        { shirt: '#3b6d8c', hair: '#232026', hatType: 'cap', hasBag: false, role: 'worker' },
        { shirt: '#d97e38', hair: '#382b22', hatType: 'hardhat', hasBag: false, role: 'worker' },
        { shirt: '#81b29a', hair: '#1d1d1d', hatType: 'cap', hasBag: false, role: 'worker' }
      ],
      comercial: [
        { shirt: '#e07a5f', hair: '#2a241e', hatType: 'none', hasBag: true, role: 'shopper' },
        { shirt: '#9b8ec4', hair: '#4a1f2d', hatType: 'none', hasBag: true, role: 'shopper' },
        { shirt: '#f2cc8f', hair: '#5a3e2b', hatType: 'cap', hasBag: true, role: 'shopper' }
      ],
      residencial: [
        { shirt: '#d9e6a2', hair: '#2a241e', hatType: 'none', hasBag: false, role: 'resident' },
        { shirt: '#6cb2d1', hair: '#3b281c', hatType: 'cap', hasBag: false, role: 'resident' },
        { shirt: '#81b29a', hair: '#382b22', hatType: 'none', hasBag: true, role: 'resident' }
      ],
      periferia: [
        { shirt: '#a3c977', hair: '#3b281c', hatType: 'cap', hasBag: false, role: 'resident' },
        { shirt: '#f2cc8f', hair: '#2a241e', hatType: 'none', hasBag: false, role: 'resident' },
        { shirt: '#e07a5f', hair: '#1d1d1d', hatType: 'cap', hasBag: false, role: 'resident' }
      ]
    };

    const pool = districtOutfits[dId] || districtOutfits.residencial;
    const look = randomItem(pool);

    return {
      id: nextPedId++,
      x: startNode.x,
      y: startNode.y,
      angle: 0,
      radius: 7,
      speed: 36 + Math.random() * 18,
      shirt: look.shirt,
      hair: look.hair,
      hatType: look.hatType || 'none',
      hasBag: Boolean(look.hasBag),
      role: look.role || 'resident',
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
