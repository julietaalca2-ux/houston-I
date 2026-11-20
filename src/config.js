window.CiudadCero = window.CiudadCero || {};

CiudadCero.Config = {
  GAME_INFO: {
    title: 'Ciudad Cero',
    installment: 1,
    version: '0.4',
    subtitle: 'Historia y Campaña'
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
    enterRadius: 58,
    talkRadius: 68
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

  VEHICLE_CATALOG: [
    {
      typeId: 'sedan',
      price: 300,
      defaultUnlocked: true,
      unlockHint: 'Disponible desde el inicio',
      color: '#4c738e',
      desc: 'Equilibrado, resistente y discreto para moverse por toda la ciudad.'
    },
    {
      typeId: 'coupe',
      price: 550,
      defaultUnlocked: true,
      unlockHint: 'Disponible desde el inicio',
      color: '#d94f3d',
      desc: 'Deportivo ágil con gran aceleración y velocidad punta.'
    },
    {
      typeId: 'taxi',
      price: 420,
      defaultUnlocked: false,
      unlockHint: 'Completa la Misión 1.3 (Sirenas en el Retrovisor)',
      color: '#eab308',
      desc: 'Ideal para encargos rápidos y transporte urbano.'
    },
    {
      typeId: 'van',
      price: 580,
      defaultUnlocked: false,
      unlockHint: 'Completa la secundaria "Encargo de Furgoneta"',
      color: '#3b6d8c',
      desc: 'Gran masa e integridad estructural para choques pesados.'
    },
    {
      typeId: 'suv',
      price: 750,
      defaultUnlocked: false,
      unlockHint: 'Completa el Capítulo 2 (Corte de Señal)',
      color: '#2c3330',
      desc: 'Tracción pesada capaz de abrirse paso entre bloqueos.'
    },
    {
      typeId: 'police_interceptor',
      price: 1350,
      defaultUnlocked: false,
      unlockHint: 'Completa la Campaña Principal (Capítulo 3)',
      color: '#101824',
      desc: 'Interceptor V8 modificado de altísima velocidad y sirena.'
    }
  ],

  GARAGE_UPGRADES: {
    armor: {
      id: 'armor',
      name: 'BLINDAJE REFORZADO',
      cost: 200,
      hpBonus: 40,
      desc: '+40 HP máximos de carrocería'
    },
    turbo: {
      id: 'turbo',
      name: 'TURBO CALIBRADO',
      cost: 250,
      speedMult: 1.12,
      desc: '+12% velocidad máxima y aceleración'
    },
    bribe: {
      id: 'bribe',
      name: 'CAMBIO DE MATRÍCULA',
      cost: 150,
      desc: 'Borra hasta 2★ de búsqueda si no estás en mira directa'
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
    },
    {
      id: 'garage_south',
      name: 'GARAJE PUERTO SUR',
      gx: 2,
      gy: 4,
      x: 825,
      y: 1405,
      w: 96,
      h: 76,
      spawnX: 825,
      spawnY: 1392,
      spawnAngle: -Math.PI / 2
    }
  ],

  GARAGE_RULES: {
    maxSlots: 8,
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

  PROTAGONIST: {
    id: 'mateo',
    name: 'Mateo "Cero" Vega',
    role: 'Protagonista · Piloto y Mecánico',
    age: '26 años',
    origin: 'Puerto Industrial del Sur',
    color: '#d6f36a',
    jacket: '#2b382d',
    hair: '#1c201d',
    personality: 'Calculador, leal a su palabra y con sangre fría al volante.',
    backstory: 'Ex mecánico de pruebas en los astilleros del sur. Llegó a Ciudad Cero con $ 500 y su Coupé GT tras recibir una llamada anónima sobre la desaparición de su hermano mayor, Julián Vega.',
    motivation: 'Levantar su reputación desde cero, mantener a flote el taller y desenmascarar la red de confiscaciones ilegales detrás del caso de su hermano.'
  },

  CHARACTERS: {
    nora: {
      id: 'nora',
      name: 'Nora "Llave" Salgado',
      role: 'Jefa de Taller · Garaje Central',
      color: '#f5d94b',
      shirt: '#e3b42b',
      hair: '#3a2318',
      x: 472,
      y: 505,
      inWorld: true,
      personality: 'Pragmática, irónica y protectora con quienes respetan su taller.',
      bio: 'Antigua socia mecánica de Julián. Conoce cada tornillo y cada ruta secreta de Ciudad Cero.',
      ambientLines: [
        'Si abollas el Coupé, tráelo a la bahía antes de que eche humo.',
        'Recuerda: los callejones marcados en verde en el radar enfrían rápido el rastro policial.',
        'Tu hermano Julián siempre decía que en Ciudad Cero manda quien conoce los atajos.'
      ]
    },
    ramiro: {
      id: 'ramiro',
      name: 'Ramiro "El Sastre" Mendoza',
      role: 'Informante · Parque Central',
      color: '#6cb2d1',
      shirt: '#4c738e',
      hair: '#22262b',
      x: 765,
      y: 825,
      inWorld: true,
      personality: 'Elegante, meticuloso y siempre un paso adelante. Nunca deja huellas.',
      bio: 'Corredor de información en el Distrito Centro. Mueve encargos discretos y sabe quién compra favores en comisaría.',
      ambientLines: [
        'En esta ciudad la información vale más que el combustible, Mateo.',
        'Evita llamar la atención frente a las patrullas si llevas mercancía delicada.',
        'Cuando necesites dinero extra, revisa los encargos secundarios en tu menú.'
      ]
    },
    valeria: {
      id: 'valeria',
      name: 'Valeria "Chispa" Quiroga',
      role: 'Especialista en Radar · Distrito Norte',
      color: '#4de0b5',
      shirt: '#22a37a',
      hair: '#4a1f2d',
      x: 1365,
      y: 465,
      inWorld: true,
      personality: 'Impulsiva, brillante y rebelde; experta en inhibidores policiales.',
      bio: 'Ingeniera clandestina de telecomunicaciones. Intercepta las frecuencias tácticas del Comisario Dávila.',
      ambientLines: [
        'Tengo los escáneres abiertos: si Dávila mueve un convoy, lo sabremos al instante.',
        'Los Interceptores V8 son rápidos en recta, pero pierden agarre si encadenas curvas cerradas.'
      ]
    },
    davila: {
      id: 'davila',
      name: 'Comisario Héctor Dávila',
      role: 'Jefe de Operaciones Tácticas',
      color: '#ff3b30',
      shirt: '#1d2938',
      hair: '#5c646d',
      x: 1950,
      y: 1200,
      inWorld: false,
      personality: 'Frío, autoritario e implacable.',
      bio: 'Comanda las unidades tácticas de Ciudad Cero y dirige en las sombras el desvío de vehículos confiscados.'
    }
  },

  INTRO_DIALOGUE: [
    {
      speaker: 'mateo',
      text: 'Ciudad Cero... Cinco años sin pisar estas avenidas. Julián dejó unas coordenadas grabadas en esta llave antes de desaparecer.'
    },
    {
      speaker: 'mateo',
      text: 'Solo tengo $ 500 en el bolsillo y el viejo Coupé GT estacionado en la esquina. Primero hablaré con Nora en el Garaje Central.'
    }
  ],

  CHAPTERS: [
    {
      id: 1,
      number: 'CAPÍTULO 1',
      title: 'MOTOR EN FRÍO',
      subtitle: 'Llegada a Ciudad Cero y primeros contactos',
      summary: 'Mateo se instala en el Garaje Central Cero con ayuda de Nora Salgado y acepta sus primeros trabajos en las calles.',
      missions: [
        {
          id: 'c1_m1',
          chapter: 1,
          code: '1.1',
          type: 'talk',
          npcId: 'nora',
          title: 'El Taller de la Avenida Cero',
          helpFoot: 'Acércate a Nora Salgado junto al Garaje Central y habla con ella.',
          helpCar: 'Conduce hasta el Garaje Central y baja para hablar con Nora.',
          x: 472,
          y: 505,
          radius: 42,
          reward: 250,
          startDialogue: null,
          endDialogue: [
            {
              speaker: 'nora',
              text: '¿Mateo Vega? Sabía que tarde o temprano aparecerías por aquí. Tu hermano Julián me pidió que te guardara un espacio en el taller.'
            },
            {
              speaker: 'mateo',
              text: 'Necesito saber qué pasó con él, Nora. Alguien me envió estas coordenadas desde el Distrito Centro.'
            },
            {
              speaker: 'nora',
              text: 'Empieza por ganarte respeto y efectivo. Ve al Parque Central y habla con Ramiro "El Sastre"; él sabe quién mueve los hilos.'
            }
          ]
        },
        {
          id: 'c1_m2',
          chapter: 1,
          code: '1.2',
          type: 'deliver_package',
          pickupNpcId: 'ramiro',
          title: 'El Encargo del Sastre',
          helpFoot: 'Ve al Parque Central para recoger el paquete de Ramiro.',
          helpCar: 'Conduce al Parque Central y recoge el maletín encriptado.',
          pickupX: 765,
          pickupY: 825,
          x: 765,
          y: 825,
          dropX: 1875,
          dropY: 375,
          radius: 30,
          timeLimit: 68,
          failWantedBonus: 1,
          reward: 400,
          pickupDialogue: [
            {
              speaker: 'ramiro',
              text: 'Así que tú eres el hermano de Julián. Tienes su misma mirada fría. Lleva este maletín al contacto del Distrito Norte antes de que cambie el turno.'
            },
            {
              speaker: 'mateo',
              text: 'En marcha. Si este paquete me acerca a la verdad, llegará a tiempo.'
            }
          ],
          endDialogue: [
            {
              speaker: 'mateo',
              text: 'Entrega completada. Pero el receptor del maletín acaba de activar una baliza... ¡Patrullas en camino!'
            }
          ]
        },
        {
          id: 'c1_m3',
          chapter: 1,
          code: '1.3',
          type: 'escape_police',
          title: 'Sirenas en el Retrovisor',
          helpFoot: '¡Escapa de la policía! Usa callejones ocultos o aléjate hasta 0★.',
          helpCar: 'Pierde de vista a las patrullas y enfría la alerta a 0★.',
          triggerWanted: 2,
          x: 1425,
          y: 516,
          radius: 34,
          reward: 500,
          unlockVehicle: 'taxi',
          endDialogue: [
            {
              speaker: 'nora',
              text: 'Buen trabajo al volante, Mateo. Limpié tus placas y conseguí acceso a la flota de Taxis de Ciudad Cero en el catálogo del garaje.'
            },
            {
              speaker: 'nora',
              text: 'Además, rastreé una señal GPS: el antiguo Coupé GT verde de Julián está retenido en un depósito del sector este.'
            }
          ]
        }
      ]
    },
    {
      id: 2,
      number: 'CAPÍTULO 2',
      title: 'PISTAS DE ACEITE Y POLVO',
      subtitle: 'Infiltración, testigos y persecución',
      summary: 'Mateo recupera el vehículo de su hermano, protege a una especialista en radares y caza a un correo de Dávila.',
      missions: [
        {
          id: 'c2_m1',
          chapter: 2,
          code: '2.1',
          type: 'recover_vehicle',
          title: 'El Coupé Confiscado',
          helpFoot: 'Ve al sector este y sube al Coupé GT verde marcado.',
          helpCar: 'Lleva el Coupé GT verde al Garaje Central Cero.',
          vehicleX: 2175,
          vehicleY: 675,
          vehicleType: 'coupe',
          vehicleColor: '#22a37a',
          stealWanted: 2,
          x: 2175,
          y: 675,
          destX: 525,
          destY: 505,
          radius: 38,
          reward: 650,
          grantOwnedVehicle: true,
          endDialogue: [
            {
              speaker: 'mateo',
              text: 'Este era el auto de Julián... Bajo el asiento hay una tarjeta cifrada con el sello de Operaciones Tácticas.'
            },
            {
              speaker: 'nora',
              text: 'Solo hay una persona capaz de abrir esa encriptación sin alertar a toda la comisaría: Valeria "Chispa" Quiroga. Búscala en el Distrito Norte.'
            }
          ]
        },
        {
          id: 'c2_m2',
          chapter: 2,
          code: '2.2',
          type: 'transport_person',
          passengerName: 'Valeria "Chispa"',
          pickupNpcId: 'valeria',
          title: 'Testigo Protegido',
          helpFoot: 'Necesitas un vehículo para recoger a Valeria en el Distrito Norte.',
          helpCar: 'Recoge a Valeria en el norte y llévala al Taller Distrito Este.',
          pickupX: 1365,
          pickupY: 465,
          x: 1365,
          y: 465,
          destX: 1725,
          destY: 805,
          radius: 36,
          reward: 750,
          pickupDialogue: [
            {
              speaker: 'valeria',
              text: '¡Arranca, Mateo! Los hombres del Comisario Dávila llevan horas rastreando mi frecuencia. Llévame al Taller Este y descifraré esa tarjeta.'
            }
          ],
          endDialogue: [
            {
              speaker: 'valeria',
              text: '¡Bingo! La tarjeta demuestra que Dávila desvía autos confiscados hacia el puerto. Uno de sus correos acaba de salir con la copia maestra en un Sedán Blindado.'
            },
            {
              speaker: 'mateo',
              text: 'No llegará lejos. Voy tras él ahora mismo.'
            }
          ]
        },
        {
          id: 'c2_m3',
          chapter: 2,
          code: '2.3',
          type: 'chase_vehicle',
          title: 'Corte de Señal',
          helpFoot: 'Consigue un vehículo rápido y persigue al Sedán Blindado.',
          helpCar: 'Embiste y detén el Sedán Blindado del correo de Dávila.',
          chaseSpawnX: 1575,
          chaseSpawnY: 1275,
          chaseType: 'sedan',
          chaseColor: '#171c21',
          chaseName: 'SEDÁN DE CORREO',
          chaseHp: 140,
          triggerWanted: 2,
          x: 1575,
          y: 1275,
          radius: 36,
          reward: 900,
          unlockVehicle: 'suv',
          endDialogue: [
            {
              speaker: 'mateo',
              text: 'Tengo el disco duro. Julián descubrió toda la operación y lo encerraron en un traslado fantasma.'
            },
            {
              speaker: 'valeria',
              text: 'El Comisario Dávila acaba de declarar alerta roja en toda la ciudad. Prepárate para el golpe final, Mateo.'
            }
          ]
        }
      ]
    },
    {
      id: 3,
      number: 'CAPÍTULO 3',
      title: 'CIUDAD BAJO CERO',
      subtitle: 'La caída del Comisario Dávila',
      summary: 'Con las pruebas en mano, Mateo desata una distracción masiva, transmite los archivos y enfrenta el convoy de Dávila.',
      missions: [
        {
          id: 'c3_m1',
          chapter: 3,
          code: '3.1',
          type: 'wanted_run',
          title: 'Distracción en Tres Frentes',
          helpFoot: 'Sube a un vehículo y cruza los puntos de control con 2★ o más.',
          helpCar: 'Cruza los 2 puntos de control bajo búsqueda (2★+) antes del límite.',
          triggerWanted: 3,
          minWantedRequired: 2,
          checkpoints: [
            { x: 975, y: 975 },
            { x: 1575, y: 1575 }
          ],
          x: 975,
          y: 975,
          radius: 34,
          timeLimit: 75,
          failWantedBonus: 1,
          reward: 1100,
          endDialogue: [
            {
              speaker: 'valeria',
              text: '¡Funcionó! Todas las patrullas tácticas mordieron el anzuelo en el sur. El Depósito Norte quedó despejado para recoger el transmisor.'
            }
          ]
        },
        {
          id: 'c3_m2',
          chapter: 3,
          code: '3.2',
          type: 'deliver_package',
          title: 'Ruta Sin Retorno',
          helpFoot: 'Recoge el transmisor en el Depósito Norte.',
          helpCar: 'Lleva el transmisor al Garaje Puerto Sur y escapa de la policía.',
          pickupX: 1425,
          pickupY: 516,
          x: 1425,
          y: 516,
          dropX: 825,
          dropY: 1405,
          requireClearWantedAtEnd: true,
          triggerWanted: 3,
          radius: 34,
          reward: 1400,
          pickupDialogue: [
            {
              speaker: 'ramiro',
              text: 'El transmisor está listo. Llévalo a la antena del Puerto Sur y pierde a las patrullas para que la emisión salga limpia en todas las frecuencias.'
            }
          ],
          endDialogue: [
            {
              speaker: 'ramiro',
              text: '¡La señal está en el aire! Toda Ciudad Cero acaba de escuchar las grabaciones de Dávila. Pero el Comisario viene hacia aquí en su Unidad Táctica.'
            }
          ]
        },
        {
          id: 'c3_m3',
          chapter: 3,
          code: '3.3',
          type: 'chase_vehicle',
          title: 'El Último Convoy de Dávila',
          helpFoot: 'Intercepta la Unidad Táctica 4x4 del Comisario Dávila.',
          helpCar: 'Inutiliza el blindado de Dávila y regresa al Garaje Central.',
          chaseSpawnX: 1275,
          chaseSpawnY: 1275,
          chaseType: 'police_enforcer',
          chaseColor: '#0e131a',
          chaseName: 'BLINDADO DE DÁVILA',
          chaseHp: 195,
          triggerWanted: 4,
          returnToGarageAfter: true,
          destX: 525,
          destY: 505,
          x: 1275,
          y: 1275,
          radius: 38,
          reward: 2500,
          unlockVehicle: 'police_interceptor',
          endDialogue: [
            {
              speaker: 'davila',
              text: '¡Esto no ha terminado, Vega...! ¡Las unidades de refuerzo vienen en camino...!'
            },
            {
              speaker: 'nora',
              text: 'Sí terminó, Dávila. Asuntos Internos ya tiene los archivos y Julián acaba de comunicarse desde la estación central.'
            },
            {
              speaker: 'mateo',
              text: 'Ciudad Cero vuelve a respirar. El taller es nuestro y las calles siguen abiertas para lo que venga.'
            }
          ]
        }
      ]
    }
  ],

  SIDE_MISSIONS: [
    {
      id: 'side_race_north',
      code: 'SEC-01',
      type: 'checkpoints',
      title: 'Circuito Callejero Norte',
      desc: 'Completa 4 puntos de control a máxima velocidad en el sector norte.',
      helpFoot: 'Sube a un auto rápido para iniciar el circuito.',
      helpCar: 'Cruza los 4 puntos de control antes de que termine el tiempo.',
      startX: 675,
      startY: 375,
      checkpoints: [
        { x: 1275, y: 375 },
        { x: 1875, y: 375 },
        { x: 1875, y: 675 },
        { x: 975, y: 675 }
      ],
      x: 675,
      y: 375,
      radius: 34,
      timeLimit: 52,
      reward: 350
    },
    {
      id: 'side_taxi_express',
      code: 'SEC-02',
      type: 'transport_person',
      passengerName: 'Cliente Ejecutivo',
      title: 'Traslado Exprés Centro-Oeste',
      desc: 'Recoge a un pasajero en el Parque Central y llévalo al Callejón Oeste.',
      helpFoot: 'Necesitas un vehículo para recoger al pasajero.',
      helpCar: 'Recoge al cliente en el Parque Central y llévalo a destino.',
      startX: 825,
      startY: 825,
      pickupX: 825,
      pickupY: 825,
      x: 825,
      y: 825,
      destX: 375,
      destY: 1125,
      radius: 34,
      timeLimit: 55,
      reward: 320
    },
    {
      id: 'side_cargo_boost',
      code: 'SEC-03',
      type: 'steal_type',
      requiredVehicleType: 'van',
      title: 'Encargo de Furgoneta Cargo',
      desc: 'Consigue cualquier Furgoneta Cargo en las calles y entrégala en el Taller Este.',
      helpFoot: 'Busca una Furgoneta Cargo circulando o estacionada.',
      helpCar: 'Conduce una Furgoneta Cargo hasta el Taller Distrito Este.',
      startX: 1575,
      startY: 975,
      x: 1725,
      y: 805,
      destX: 1725,
      destY: 805,
      radius: 38,
      reward: 450,
      unlockVehicle: 'van'
    },
    {
      id: 'side_heat_escape',
      code: 'SEC-04',
      type: 'escape_police',
      title: 'Fuga Relámpago en Puerto Sur',
      desc: 'Despista a una patrulla de 2★ en los muelles del sur sin ser detenido.',
      helpFoot: 'Escapa de la búsqueda policial hasta llegar a 0★.',
      helpCar: 'Pierde de vista a las patrullas y enfría las 2★.',
      startX: 1275,
      startY: 1575,
      triggerWanted: 2,
      x: 1275,
      y: 1575,
      radius: 34,
      reward: 420
    }
  ]
};
