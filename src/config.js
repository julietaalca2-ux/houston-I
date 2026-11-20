window.CiudadCero = window.CiudadCero || {};

CiudadCero.Config = {
  GAME_INFO: {
    title: 'Ciudad Cero',
    installment: 1,
    version: '0.2'
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

  // Catálogo extensible de vehículos para Ciudad Cero y futuras entregas
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
      colors: ['#e5e9e3', '#3b6d8c', '#c97e38']
    }
  },

  TRAFFIC: {
    targetVehicles: 14,
    parkedVehicles: 10,
    targetPedestrians: 26,
    aiCruiseSpeed: 118,
    aiTurnSpeed: 76,
    lookAheadDist: 78
  },

  // Misión 1 conserva la ubicación exacta de la versión 0.1 y luego encadena nuevas entregas
  INITIAL_MISSION: {
    id: 1,
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
      title: 'Entrega rápida en Distrito Norte',
      helpFoot: 'Sube a un auto o corre hacia el norte.',
      helpCar: 'Llega al punto de entrega antes de que enfríe.',
      x: 1875,
      y: 375,
      radius: 26,
      reward: 350
    },
    {
      title: 'Recogida en Plaza Central',
      helpFoot: 'Dirígete al cruce de Plaza Central.',
      helpCar: 'Estaciona sobre la baliza amarilla.',
      x: 975,
      y: 1275,
      radius: 26,
      reward: 400
    },
    {
      title: 'Encargo en Avenida Este',
      helpFoot: 'Cruza la ciudad hasta el sector este.',
      helpCar: 'Conduce con cuidado entre el tráfico.',
      x: 2175,
      y: 1275,
      radius: 26,
      reward: 450
    },
    {
      title: 'Regreso al Barrio Sur',
      helpFoot: 'Vuelve hacia el punto de encuentro sur.',
      helpCar: 'Completa el circuito urbano en el marcador.',
      x: 375,
      y: 1575,
      radius: 26,
      reward: 500
    },
    {
      title: 'Ruta Exprés Centro',
      helpFoot: 'Llega al punto de control central.',
      helpCar: 'Acelera hacia la zona comercial.',
      x: 1575,
      y: 675,
      radius: 26,
      reward: 550
    }
  ]
};
