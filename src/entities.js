window.CiudadCero = window.CiudadCero || {};

CiudadCero.Entities = (() => {
  const Config = CiudadCero.Config;
  const World = CiudadCero.World;

  let nextVehicleId = 1;
  let nextPedId = 1;

  const SKIN_POOL = ['#f4ccb0', '#e5b392', '#d29b76', '#b87f5a', '#8f5d3e', '#69412a'];
  const HAIR_POOL = ['#17191a', '#2d2118', '#4a3222', '#6e4c2e', '#8c3b2b', '#8d969e'];

  function randomItem(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function createPlayer() {
    return {
      id: 'mateo',
      visualId: 'mateo',
      name: 'Mateo "Cero" Vega',
      x: Config.PLAYER.startX,
      y: Config.PLAYER.startY,
      angle: 0,
      visualAngle: 0,
      radius: Config.PLAYER.radius,
      speed: 0,
      inCar: false,
      vehicle: null,
      walkPhase: 0,
      idlePhase: 0,
      enterExitAnim: null
    };
  }

  function createVehicle(opts) {
    const spec = Config.VEHICLE_TYPES[opts.typeId] || Config.VEHICLE_TYPES.sedan;
    const armorBonus = opts.armorUpgraded ? 70 : 0;
    const speedMult = opts.engineUpgraded ? 1.12 : 1.0;
    const accelMult = opts.engineUpgraded ? 1.12 : 1.0;

    return {
      id: nextVehicleId++,
      typeId: spec.id,
      name: spec.name,
      category: spec.category || 'civil',
      color: opts.color || randomItem(spec.colors),
      x: opts.x,
      y: opts.y,
      vx: 0,
      vy: 0,
      speed: 0,
      angle: opts.angle || 0,
      length: spec.length,
      width: spec.width,
      maxSpeed: Math.round(spec.maxSpeed * speedMult),
      turboSpeed: Math.round(spec.turboSpeed * speedMult),
      reverseSpeed: spec.reverseSpeed,
      accel: Math.round(spec.accel * accelMult),
      brake: spec.brake,
      turnRate: spec.turnRate,
      grip: spec.grip,
      mass: spec.mass,
      hp: opts.hp !== undefined ? opts.hp : spec.maxHp + armorBonus,
      maxHp: opts.maxHp !== undefined ? opts.maxHp : spec.maxHp + armorBonus,
      armorUpgraded: Boolean(opts.armorUpgraded),
      engineUpgraded: Boolean(opts.engineUpgraded),
      isPolice: Boolean(spec.isPolice),
      policeRole: spec.policeRole || null,
      sirenActive: Boolean(opts.sirenActive),
      sirenPhase: Math.random() * Math.PI * 2,
      policeState: opts.policeState || 'patrol',
      isRoadblock: Boolean(opts.isRoadblock),
      isChaseTarget: Boolean(opts.isChaseTarget),
      isMissionTarget: Boolean(opts.isMissionTarget),
      isPlayerOwned: Boolean(opts.isPlayerOwned),
      isAI: Boolean(opts.isAI),
      isParked: Boolean(opts.isParked),
      aiAxis: opts.aiAxis || 'h',
      aiDir: opts.aiDir || 1,
      aiLanePos: opts.aiLanePos || opts.y,
      turnCooldown: 1 + Math.random() * 2,
      stunTimer: 0,
      brakeLights: false,
      reversing: false,
      stoppedAtSignal: false,
      signalLaunchTimer: 0,
      yieldingToEmergency: false,
      steerVisual: 0,
      turningTimer: 0,
      stuckTimer: 0,
      unstickTimer: 0
    };
  }

  function spawnTrafficVehicle(existingVehicles, playerRef, preferNear = false) {
    const lanes = World.getLaneCoords();
    const weightedTypes = [
      'sedan', 'sedan',
      'compact', 'compact',
      'taxi', 'taxi',
      'suv', 'suv',
      'van', 'coupe', 'muscle', 'truck'
    ];

    for (let attempt = 0; attempt < 30; attempt++) {
      const lane = randomItem(lanes);
      let x, y, angle;
      if (lane.axis === 'h') {
        if (preferNear && playerRef) {
          x = Math.max(90, Math.min(Config.WORLD.width - 90, playerRef.x + (Math.random() - 0.5) * 1800));
        } else {
          x = 80 + Math.random() * (Config.WORLD.width - 160);
        }
        y = lane.pos;
        angle = lane.dir > 0 ? 0 : Math.PI;
      } else {
        x = lane.pos;
        if (preferNear && playerRef) {
          y = Math.max(90, Math.min(Config.WORLD.height - 90, playerRef.y + (Math.random() - 0.5) * 1600));
        } else {
          y = 80 + Math.random() * (Config.WORLD.height - 160);
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

  function buildCitizenLook(dId, forcePolice = false) {
    const skin = randomItem(SKIN_POOL);
    const hair = randomItem(HAIR_POOL);

    if (forcePolice) {
      return {
        role: 'police_foot',
        isPoliceFoot: true,
        shirt: '#1a2b3c',
        hair,
        skin,
        visualProfile: {
          shoulderW: 17.0,
          torsoDepth: 9.0,
          headR: 4.7,
          skin,
          torsoPrimary: '#1a2b3c',
          torsoSecondary: '#111c28',
          accent: '#3898ff',
          trim: '#cfd9e3',
          sleeve: '#1a2b3c',
          glove: '#161b20',
          shoe: '#121518',
          hairColor: hair,
          hairStyle: 'short_crop',
          outfitStyle: 'police_uniform',
          hatType: 'police_cap',
          accessory: 'radio'
        }
      };
    }

    const districtArchetypes = {
      centro: [
        { role: 'executive', shirt: '#2b3a4a', sec: '#1b2631', outfit: 'suit', hairStyle: 'slick_part', hat: 'none', acc: 'briefcase', w: 16.4 },
        { role: 'executive', shirt: '#495867', sec: '#333e4a', outfit: 'suit', hairStyle: 'bun', hat: 'none', acc: 'briefcase', w: 15.2 },
        { role: 'executive', shirt: '#5c6b73', sec: '#3d484e', outfit: 'suit', hairStyle: 'short_crop', hat: 'none', acc: 'none', w: 16.0 }
      ],
      industrial: [
        { role: 'worker', shirt: '#e68a3e', sec: '#2d3748', outfit: 'hi_vis_vest', hairStyle: 'short_crop', hat: 'hardhat', hatColor: '#facc15', acc: 'clipboard', w: 17.6 },
        { role: 'worker', shirt: '#a3e635', sec: '#334155', outfit: 'hi_vis_vest', hairStyle: 'short_crop', hat: 'hardhat', hatColor: '#f8fafc', acc: 'box', w: 17.4 },
        { role: 'worker', shirt: '#4a6670', sec: '#2d3e45', outfit: 'casual_jacket', hairStyle: 'short_crop', hat: 'cap', hatColor: '#2b3a4a', acc: 'none', w: 16.8 }
      ],
      portuaria: [
        { role: 'worker', shirt: '#d97724', sec: '#24394a', outfit: 'hi_vis_vest', hairStyle: 'short_crop', hat: 'hardhat', hatColor: '#facc15', acc: 'box', w: 17.8 },
        { role: 'worker', shirt: '#3b6d8c', sec: '#234257', outfit: 'casual_jacket', hairStyle: 'short_crop', hat: 'cap', hatColor: '#1e3a5f', acc: 'clipboard', w: 17.0 },
        { role: 'worker', shirt: '#52796f', sec: '#2f4741', outfit: 'casual_hoodie', hairStyle: 'bun', hat: 'none', acc: 'backpack', w: 15.8 }
      ],
      comercial: [
        { role: 'shopper', shirt: '#e07a5f', sec: '#a8523b', outfit: 'casual_jacket', hairStyle: 'long_hair', hat: 'none', acc: 'shopping_bag', w: 15.0 },
        { role: 'shopper', shirt: '#9b8ec4', sec: '#6c5f94', outfit: 'casual_jacket', hairStyle: 'ponytail', hat: 'none', acc: 'shopping_bag', w: 15.2 },
        { role: 'shopper', shirt: '#4ea8de', sec: '#2b6cb0', outfit: 'casual_hoodie', hairStyle: 'short_crop', hat: 'cap', hatColor: '#e25845', acc: 'backpack', w: 16.0 }
      ],
      residencial: [
        { role: 'resident', shirt: '#6cb2d1', sec: '#3c6e85', outfit: 'casual_hoodie', hairStyle: 'short_crop', hat: 'none', acc: 'backpack', w: 15.8 },
        { role: 'resident', shirt: '#81b29a', sec: '#4d7361', outfit: 'casual_jacket', hairStyle: 'ponytail', hat: 'none', acc: 'shopping_bag', w: 15.0 },
        { role: 'resident', shirt: '#e9c46a', sec: '#a88938', outfit: 'casual_jacket', hairStyle: 'bun', hat: 'cap', hatColor: '#2f5d50', acc: 'none', w: 15.6 }
      ],
      periferia: [
        { role: 'resident', shirt: '#7fa653', sec: '#4f6b30', outfit: 'casual_jacket', hairStyle: 'short_crop', hat: 'cap', hatColor: '#3b4d38', acc: 'backpack', w: 16.4 },
        { role: 'resident', shirt: '#b56576', sec: '#7a3f4d', outfit: 'casual_hoodie', hairStyle: 'ponytail', hat: 'none', acc: 'none', w: 15.2 },
        { role: 'worker', shirt: '#d4a373', sec: '#8c6239', outfit: 'casual_jacket', hairStyle: 'short_crop', hat: 'none', acc: 'box', w: 16.8 }
      ]
    };

    const pool = districtArchetypes[dId] || districtArchetypes.residencial;
    const arch = randomItem(pool);

    return {
      role: arch.role,
      isPoliceFoot: false,
      shirt: arch.shirt,
      hair,
      skin,
      visualProfile: {
        shoulderW: arch.w,
        torsoDepth: 8.6,
        headR: 4.5,
        skin,
        torsoPrimary: arch.shirt,
        torsoSecondary: arch.sec,
        accent: '#d6f36a',
        trim: '#dce4df',
        sleeve: arch.shirt,
        glove: skin,
        shoe: '#1d2226',
        hairColor: hair,
        hairStyle: arch.hairStyle,
        outfitStyle: arch.outfit,
        hatType: arch.hat,
        hatColor: arch.hatColor || '#26313a',
        accessory: arch.acc
      }
    };
  }

  function createPedestrian(forcedLoopIdx = null, forcePolice = false) {
    const loopIdx =
      forcedLoopIdx !== null
        ? forcedLoopIdx
        : Math.floor(Math.random() * World.sidewalkNodes.length);
    const loop = World.sidewalkNodes[loopIdx];
    const startIdx = Math.floor(Math.random() * loop.length);
    const startNode = loop[startIdx];
    const dir = Math.random() < 0.5 ? 1 : -1;
    const nextIdx = (startIdx + dir + loop.length) % loop.length;
    const dId = startNode.districtId || 'residencial';

    const look = buildCitizenLook(dId, forcePolice);

    return {
      id: nextPedId++,
      x: startNode.x,
      y: startNode.y,
      angle: 0,
      visualAngle: 0,
      radius: forcePolice ? 8 : 7,
      speed: forcePolice ? 34 : 36 + Math.random() * 18,
      shirt: look.shirt,
      hair: look.hair,
      skin: look.skin,
      role: look.role,
      isPoliceFoot: look.isPoliceFoot,
      visualProfile: look.visualProfile,
      loop,
      targetIdx: nextIdx,
      loopDir: dir,
      walkPhase: Math.random() * Math.PI * 2,
      idlePhase: Math.random() * Math.PI * 2,
      panicTimer: 0,
      alertIconTimer: 0,
      pausedTimer: 0,
      curbWaitTimer: 0,
      waitingAtCrosswalk: false,
      knockTimer: 0,
      vx: 0,
      vy: 0
    };
  }

  function createFootPolicePatrols() {
    const civicTargets = [
      { x: 2925, y: 525 },  // Comisaría Central
      { x: 2325, y: 825 },  // Plaza Torre Cero
      { x: 1725, y: 825 },  // Centro Oeste
      { x: 825, y: 2325 },  // Terminal Portuaria
      { x: 2325, y: 2025 }, // Complejo Industrial
      { x: 3825, y: 825 }   // Bulevar Comercial
    ];

    const officers = [];
    civicTargets.forEach((pt) => {
      let bestIdx = 0;
      let bestDist = Infinity;
      for (let i = 0; i < World.sidewalkNodes.length; i++) {
        const node = World.sidewalkNodes[i][0];
        const d = Math.hypot(node.x - pt.x, node.y - pt.y);
        if (d < bestDist) {
          bestDist = d;
          bestIdx = i;
        }
      }
      officers.push(createPedestrian(bestIdx, true));
    });

    return officers;
  }

  function createStoryNPCs() {
    const list = [];
    const chars = Config.CHARACTERS || {};
    Object.keys(chars).forEach((key) => {
      const c = chars[key];
      if (!c.inWorld) return;
      list.push({
        id: c.id,
        visualId: c.id,
        name: c.name,
        role: c.role,
        color: c.color,
        shirt: c.shirt,
        hair: c.hair,
        x: c.x,
        y: c.y,
        radius: 10,
        angle: Math.PI / 2,
        baseAngle: Math.PI / 2,
        visualAngle: Math.PI / 2,
        idlePhase: Math.random() * Math.PI * 2,
        pulsePhase: Math.random() * Math.PI * 2,
        isAwareOfPlayer: false
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
    createFootPolicePatrols,
    createStoryNPCs
  };
})();
