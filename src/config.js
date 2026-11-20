window.CiudadCero = window.CiudadCero || {};

CiudadCero.Config = {
  GAME_INFO: {
    title: 'Ciudad Cero',
    installment: 1,
    version: '0.3'
  },

  WORLD: {
    width: 2400,
    height: 1800,
    roadWidth: 150,
    blockSize: 300,
    sidewalkWidth: 22
  },

  PLAYER: {
    startX: 380,
    startY: 390,
    walkSpeed: 148,
    sprintSpeed: 225,
    radius: 9,
    enterRadius: 58
  },

  VEHICLE_TYPES: {
    coupe: {
      id: 'coupe',
      name: 'COUPÉ GT',
      length: 40,
      width: 20,
      maxSpeed: 315,
      turboSpeed: 375,
      reverseSpeed: 125,
      accel: 265,
      brake: 360,
      turnRate: 2.85,
      grip: 0.91,
      mass: 1.0,
      maxHp: 110,
      colors: ['#d94f3d', '#2b7de9', '#e3b42b', '#22a37a']
    },
    sedan: {
      id: 'sedan',
      name: 'SEDÁN URBANO',
      length: 42,
      width: 20,
      maxSpeed: 255,
      turboSpeed: 300,
      reverseSpeed: 110,
      accel: 215,
      brake: 320,
      turnRate: 2.55,
      grip: 0.93,
      mass: 1.25,
      maxHp: 125,
      colors: ['#dce2db', '#8f9c98', '#4c738e', '#65856c', '#9c5249']
    },
    taxi: {
      id: 'taxi',
      name: 'TAXI CIUDAD CERO',
      length: 42,
      width: 20,
      maxSpeed: 265,
      turboSpeed: 315,
      reverseSpeed: 115,
      accel: 230,
      brake: 330,
      turnRate: 2.65,
      grip: 0.93,
      mass: 1.25,
      maxHp: 125,
      colors: ['#eab308']
    },
    suv: {
      id: 'suv',
      name: 'TODOTERRENO 4X4',
      length: 44,
      width: 22,
      maxSpeed: 245,
      turboSpeed: 285,
      reverseSpeed: 105,
      accel: 205,
      brake: 310,
      turnRate: 2.3,
      grip: 0.94,
      mass: 1.65,
      maxHp: 165,
      colors: ['#2c3330', '#b79e72', '#8f3f36', '#4a5c53']
    },
    van: {
      id: 'van',
      name: 'FURGONETA CARGO',
      length: 48,
      width: 22,
      maxSpeed: 220,
      turboSpeed: 255,
      reverseSpeed: 95,
      accel: 180,
      brake: 290,
      turnRate: 2.05,
      grip: 0.95,
      mass: 1.95,
      maxHp: 185,
      colors: ['#e5e9e3', '#3b6d8c', '#c97e38']
    },
    police_patrol: {
      id: 'police_patrol',
      name: 'PATRULLA CC-01',
      isPolice: true,
      policeRole: 'patrol',
      length: 42,
      width: 20,
      maxSpeed: 290,
      turboSpeed: 340,
      reverseSpeed: 120,
      accel: 255,
      brake: 350,
      turnRate: 2.75,
      grip: 0.92,
      mass: 1.35,
      maxHp: 145,
      colors: ['#161d24']
    },
    police_interceptor: {
      id: 'police_interceptor',
      name: 'INTERCEPTOR V8',
      isPolice: true,
      policeRole: 'interceptor',
      length: 41,
      width: 20,
      maxSpeed: 335,
      turboSpeed: 390,
      reverseSpeed: 130,
      accel: 295,
      brake: 380,
      turnRate: 2.95,
      grip: 0.91,
      mass: 1.25,
      maxHp: 140,
      colors: ['#101824']
    },
    police_enforcer: {
      id: 'police_enforcer',
      name: 'UNIDAD TÁCTICA 4X4',
      isPolice: true,
      policeRole: 'enforcer',
      length: 46,
      width: 23,
      maxSpeed: 265,
      turboSpeed: 305,
      reverseSpeed: 110,
      accel: 230,
      brake: 340,
      turnRate: 2.4,
      grip: 0.94,
      mass: 2.15,
      maxHp: 225,
      colors: ['#131920']
    }
  },

  TRAFFIC: {
    targetVehicles: 13,
    parkedVehicles: 9,
    targetPedestrians: 24,
    aiCruiseSpeed: 118,
    lookAheadDist: 78
  },

  POLICE: {
    ambientPatrols: 2,
    sightRange: 390,
    hideoutSightRange: 125,
    searchRadiusBase: 360,
    escapeSecondsPerStar: 8.5,
    hideoutEscapeMultiplier: 2.4,
    farEscapeMultiplier: 1.45,
    levels: {
      1: {
        label: '1★ BÚSQUEDA LEVE',
        maxUnits: 1,
        chaseSpeed: 205,
        aggression: 0.45,
        roadblocks: false,
        types: ['police_patrol']
      },
      2: {
        label: '2★ PATRULLAJE ACTIVO',
        maxUnits: 2,
        chaseSpeed: 232,
        aggression: 0.65,
        roadblocks: false,
        types: ['police_patrol', 'police_patrol']
      },
      3: {
        label: '3★ PERSECUCIÓN AGRESIVA',
        maxUnits: 3,
        chaseSpeed: 265,
        aggression: 0.85,
        roadblocks: false,
        types: ['police_patrol', 'police_interceptor']
      },
      4: {
        label: '4★ BLOQUEOS Y REFUERZOS',
        maxUnits: 4,
        chaseSpeed: 288,
        aggression: 0.95,
        roadblocks: true,
        types: ['police_interceptor', 'police_enforcer']
      },
      5: {
        label: '5★ ALERTA MÁXIMA',
        maxUnits: 5,
        chaseSpeed: 312,
        aggression: 1.0,
        roadblocks: true,
        types: ['police_interceptor', 'police_enforcer', 'police_enforcer']
      }
    }
  },

  GARAGES: [
    {
      id: 'garage_central',
      name: 'GARAJE CENTRAL CERO',
      gx: 1,
      gy: 1,
      x: 525,
      y: 505,
      w: 96,
      h: 76,
      spawnX: 525,
      spawnY: 492,
      spawnAngle: -Math.PI / 2
    },
    {
      id: 'garage_east',
      name: 'TALLER DISTRITO ESTE',
      gx: 5,
      gy: 2,
      x: 1725,
      y: 805,
      w: 96,
      h: 76,
      spawnX: 1725,
      spawnY: 792,
      spawnAngle: -Math.PI / 2
    }
  ],

  GARAGE_RULES: {
    maxSlots: 6,
    repairCost: 75,
    recoverCost: 50
  },

  HIDEOUTS: [
    {
      id: 'hideout_west',
      name: 'Callejón Cubierto Oeste',
      gx: 1,
      gy: 3,
      openSide: 'west',
      x: 516,
      y: 1125,
      w: 68,
      h: 68
    },
    {
      id: 'hideout_north',
      name: 'Depósito Cubierto Norte',
      gx: 4,
      gy: 1,
      openSide: 'north',
      x: 1425,
      y: 516,
      w: 68,
      h: 68
    },
    {
      id: 'hideout_south',
      name: 'Cochera Oculta Sur',
      gx: 6,
      gy: 4,
      openSide: 'east',
      x: 2034,
      y: 1425,
      w: 68,
      h: 68
    }
  ],

  INITIAL_MISSION: {
    id: 1,
    type: 'reach',
    title: 'Llega al punto amarillo',
    helpFoot: 'Muévete con WASD, flechas o el joystick.',
    helpCar: 'Conduce hasta el marcador amarillo.',
    x: 1220,
    y: 820,
    radius: 26,
    reward: 250
  },

  CHAIN_MISSIONS: [
    {
      type: 'escape_police',
      title: '¡Emboscada! Escapa de la patrulla',
      helpFoot: 'Escóndete o aléjate de la patrulla hasta perder las estrellas.',
      helpCar: 'Pierde de vista a la policía y enfría la búsqueda (0★).',
      triggerWanted: 1,
      x: 1220,
      y: 820,
      radius: 26,
      reward: 400
    },
    {
      type: 'timed_stealth',
      title: 'Entrega sin ser detenido',
      helpFoot: 'Llega al punto antes de que acabe el tiempo.',
      helpCar: 'Conduce al Distrito Norte sin que te atrapen.',
      x: 1875,
      y: 375,
      radius: 26,
      timeLimit: 48,
      failWantedBonus: 1,
      reward: 500
    },
    {
      type: 'recover_vehicle',
      title: 'Recupera el Coupé confiscado',
      helpFoot: 'Sube al Coupé marcado en el sector este.',
      helpCar: 'Lleva el vehículo al Garaje Central con la policía detrás.',
      vehicleX: 2175,
      vehicleY: 675,
      vehicleType: 'coupe',
      vehicleColor: '#22a37a',
      stealWanted: 2,
      x: 525,
      y: 505,
      radius: 36,
      reward: 650
    },
    {
      type: 'wanted_run',
      title: 'Distracción bajo búsqueda (3★)',
      helpFoot: 'Sube a un auto y cruza el punto de control.',
      helpCar: 'Llega al marcador con al menos 2★ de búsqueda activa.',
      triggerWanted: 3,
      minWantedRequired: 2,
      x: 975,
      y: 1275,
      radius: 28,
      reward: 800
    },
    {
      type: 'reach',
      title: 'Encargo en Barrio Sur',
      helpFoot: 'Dirígete al punto de encuentro sur.',
      helpCar: 'Estaciona sobre la baliza amarilla.',
      x: 375,
      y: 1575,
      radius: 26,
      reward: 450
    }
  ]
};
