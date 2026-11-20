/**
 * Ciudad Cero V0.7.9 - Módulo del Mundo (src/world.js)
 * Gestiona los 6 barrios, grilla vial, cordones, sendas peatonales,
 * semáforos funcionales de 4 vías, parques variados, árboles volumétricos y garajes.
 */

export const WORLD_WIDTH = 4800;
export const WORLD_HEIGHT = 4800;
export const BLOCK_SIZE = 480;
export const ROAD_WIDTH = 112;
export const SIDEWALK_WIDTH = 18;

export const NEIGHBORHOODS = [
  {
    id: 'centro',
    name: 'Centro Urbano',
    bounds: { x1: 1440, y1: 1440, x2: 3360, y2: 3360 },
    groundColor: '#2c313a',
    sidewalkColor: '#8d95a0',
    buildingStyle: 'skyscraper',
    trafficDensity: 1.0,
    pedestrianDensity: 1.0
  },
  {
    id: 'comercial',
    name: 'Distrito Comercial',
    bounds: { x1: 1440, y1: 0, x2: 3360, y2: 1440 },
    groundColor: '#323741',
    sidewalkColor: '#989fa9',
    buildingStyle: 'commercial',
    trafficDensity: 0.9,
    pedestrianDensity: 0.95
  },
  {
    id: 'residencial',
    name: 'Barrio Residencial',
    bounds: { x1: 0, y1: 0, x2: 1440, y2: 2400 },
    groundColor: '#364938',
    sidewalkColor: '#9ca39d',
    buildingStyle: 'residential',
    trafficDensity: 0.55,
    pedestrianDensity: 0.65
  },
  {
    id: 'industrial',
    name: 'Zona Industrial',
    bounds: { x1: 0, y1: 2400, x2: 1440, y2: 4800 },
    groundColor: '#383634',
    sidewalkColor: '#7f7c78',
    buildingStyle: 'industrial',
    trafficDensity: 0.65,
    pedestrianDensity: 0.4
  },
  {
    id: 'puerto',
    name: 'Puerto',
    bounds: { x1: 3360, y1: 1440, x2: 4800, y2: 4800 },
    groundColor: '#2f3842',
    sidewalkColor: '#848d96',
    buildingStyle: 'port',
    trafficDensity: 0.6,
    pedestrianDensity: 0.5
  },
  {
    id: 'periferia',
    name: 'Periferia',
    bounds: { x1: 1440, y1: 3360, x2: 3360, y2: 4800 },
    groundColor: '#464136',
    sidewalkColor: '#8c867a',
    buildingStyle: 'periphery',
    trafficDensity: 0.5,
    pedestrianDensity: 0.45
  }
];

function seededRandom(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function getNeighborhoodAt(x, y) {
  for (const n of NEIGHBORHOODS) {
    if (x >= n.bounds.x1 && x < n.bounds.x2 && y >= n.bounds.y1 && y < n.bounds.y2) {
      return n;
    }
  }
  return NEIGHBORHOODS[0];
}

export function createWorld() {
  const rand = seededRandom(792026);
  const cols = Math.floor(WORLD_WIDTH / BLOCK_SIZE);
  const rows = Math.floor(WORLD_HEIGHT / BLOCK_SIZE);

  const roadsV = [];
  const roadsH = [];
  for (let c = 1; c < cols; c++) roadsV.push(c * BLOCK_SIZE);
  for (let r = 1; r < rows; r++) roadsH.push(r * BLOCK_SIZE);

  // Intersecciones con semáforos funcionales de 4 vías
  const intersections = [];
  const crosswalks = [];
  const halfRoad = ROAD_WIDTH / 2;

  for (let r = 0; r < roadsH.length; r++) {
    for (let c = 0; c < roadsV.length; c++) {
      const ix = roadsV[c];
      const iy = roadsH[r];
      const startNSGreen = (r + c) % 2 === 0;
      const cycleDuration = 14;
      intersections.push({
        id: `int_${c}_${r}`,
        x: ix,
        y: iy,
        timer: (r * 1.7 + c * 2.3) % cycleDuration,
        cycleDuration,
        nsState: startNSGreen ? 'green' : 'red',
        ewState: startNSGreen ? 'red' : 'green'
      });

      // 4 sendas peatonales alrededor de cada cruce
      const cwWidth = 16;
      const cwOffset = halfRoad + 6;
      crosswalks.push(
        { x: ix - halfRoad + 8, y: iy - cwOffset - cwWidth, w: ROAD_WIDTH - 16, h: cwWidth, dir: 'h' },
        { x: ix - halfRoad + 8, y: iy + cwOffset, w: ROAD_WIDTH - 16, h: cwWidth, dir: 'h' },
        { x: ix - cwOffset - cwWidth, y: iy - halfRoad + 8, w: cwWidth, h: ROAD_WIDTH - 16, dir: 'v' },
        { x: ix + cwOffset, y: iy - halfRoad + 8, w: cwWidth, h: ROAD_WIDTH - 16, dir: 'v' }
      );
    }
  }

  // Garajes clandestinos para repintar y bajar nivel de búsqueda
  const garages = [
    { id: 'garage_centro', name: 'Taller Clandestino Centro', x: 1740, y: 1720, w: 96, h: 72, cost: 100 },
    { id: 'garage_industrial', name: 'Galpón de Chapa Industrial', x: 760, y: 3140, w: 104, h: 76, cost: 100 },
    { id: 'garage_puerto', name: 'Dique de Pintura Puerto', x: 3640, y: 2660, w: 96, h: 72, cost: 100 },
    { id: 'garage_periferia', name: 'Taller Ruta Sur', x: 2680, y: 4100, w: 96, h: 72, cost: 100 }
  ];

  // Zona portuaria de agua en el borde este del Puerto
  const waterZones = [
    { x: 4440, y: 1440, w: 360, h: 3360 }
  ];

  const blocks = [];
  const buildings = [];
  const parks = [];
  const trees = [];

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const bx = col * BLOCK_SIZE;
      const by = row * BLOCK_SIZE;
      const centerX = bx + BLOCK_SIZE / 2;
      const centerY = by + BLOCK_SIZE / 2;
      const neighborhood = getNeighborhoodAt(centerX, centerY);

      const leftInset = col === 0 ? 24 : halfRoad + SIDEWALK_WIDTH;
      const rightInset = col === cols - 1 ? 24 : halfRoad + SIDEWALK_WIDTH;
      const topInset = row === 0 ? 24 : halfRoad + SIDEWALK_WIDTH;
      const bottomInset = row === rows - 1 ? 24 : halfRoad + SIDEWALK_WIDTH;

      const innerX = bx + leftInset;
      const innerY = by + topInset;
      const innerW = BLOCK_SIZE - leftInset - rightInset;
      const innerH = BLOCK_SIZE - topInset - bottomInset;

      // Evitar construir sobre el agua del puerto
      if (innerX >= 4420) continue;

      const blockInfo = {
        col,
        row,
        x: innerX,
        y: innerY,
        w: innerW,
        h: innerH,
        neighborhood: neighborhood.id,
        buildings: [],
        trees: [],
        park: null
      };

      // Verificar si la manzana contiene un garaje
      const hasGarage = garages.some(
        (g) => g.x >= innerX - 20 && g.x <= innerX + innerW + 20 && g.y >= innerY - 20 && g.y <= innerY + innerH + 20
      );

      // Parques variados según barrio
      const isParkBlock =
        !hasGarage &&
        ((col === 4 && row === 4) ||
          (col === 1 && row === 2) ||
          (col === 5 && row === 1) ||
          (col === 2 && row === 7) ||
          (col === 5 && row === 8));

      if (isParkBlock) {
        const parkTypes = ['fountain', 'botanical', 'plaza'];
        const parkType = parkTypes[(col + row) % parkTypes.length];
        const park = {
          x: innerX,
          y: innerY,
          w: innerW,
          h: innerH,
          type: parkType,
          neighborhood: neighborhood.id
        };
        parks.push(park);
        blockInfo.park = park;

        // Árboles volumétricos perimetrales en el parque
        const treeCount = 10;
        for (let t = 0; t < treeCount; t++) {
          const angle = (t / treeCount) * Math.PI * 2;
          const rx = innerW * 0.36;
          const ry = innerH * 0.36;
          const tree = {
            x: innerX + innerW / 2 + Math.cos(angle) * rx + (rand() - 0.5) * 18,
            y: innerY + innerH / 2 + Math.sin(angle) * ry + (rand() - 0.5) * 18,
            radius: 18 + rand() * 8,
            hue: 105 + Math.floor(rand() * 28),
            phase: rand() * Math.PI * 2
          };
          trees.push(tree);
          blockInfo.trees.push(tree);
        }
      } else {
        // Poblar manzana con edificios detallados y árboles entre lotes
        populateBlockBuildings(rand, blockInfo, neighborhood, garages, buildings, trees);
      }

      blocks.push(blockInfo);
    }
  }

  return {
    width: WORLD_WIDTH,
    height: WORLD_HEIGHT,
    blockSize: BLOCK_SIZE,
    roadWidth: ROAD_WIDTH,
    sidewalkWidth: SIDEWALK_WIDTH,
    cols,
    rows,
    roadsV,
    roadsH,
    intersections,
    crosswalks,
    garages,
    waterZones,
    blocks,
    buildings,
    parks,
    trees
  };
}

function populateBlockBuildings(rand, block, neighborhood, garages, buildings, trees) {
  const { x, y, w, h } = block;
  const subCols = neighborhood.buildingStyle === 'industrial' || neighborhood.buildingStyle === 'port' ? 2 : 2;
  const subRows = neighborhood.buildingStyle === 'residential' ? 3 : 2;
  const gap = 14;
  const cellW = (w - gap * (subCols - 1)) / subCols;
  const cellH = (h - gap * (subRows - 1)) / subRows;

  const palettes = {
    skyscraper: [
      { base: '#495867', roof: '#647687', accent: '#93c5fd', height: 28 },
      { base: '#3d4c5c', roof: '#576b7e', accent: '#7dd3fc', height: 34 },
      { base: '#525b66', roof: '#717d8c', accent: '#bae6fd', height: 24 }
    ],
    commercial: [
      { base: '#7c5c46', roof: '#9a785e', accent: '#f59e0b', height: 15 },
      { base: '#5f6c7b', roof: '#7c8b9c', accent: '#ef4444', height: 17 },
      { base: '#6e655f', roof: '#8c817a', accent: '#10b981', height: 14 }
    ],
    residential: [
      { base: '#b08968', roof: '#9c4221', accent: '#fef3c7', height: 10 },
      { base: '#a39171', roof: '#7f5539', accent: '#fde68a', height: 9 },
      { base: '#8d99ae', roof: '#4a5568', accent: '#e2e8f0', height: 11 }
    ],
    industrial: [
      { base: '#57534e', roof: '#78716c', accent: '#ea580c', height: 16 },
      { base: '#44403c', roof: '#68625d', accent: '#eab308', height: 18 }
    ],
    port: [
      { base: '#3b5266', roof: '#526f87', accent: '#38bdf8', height: 14 },
      { base: '#6b4c3b', roof: '#87634f', accent: '#fb923c', height: 13 }
    ],
    periphery: [
      { base: '#786b59', roof: '#948570', accent: '#d97706', height: 9 },
      { base: '#68645e', roof: '#858079', accent: '#a3e635', height: 8 }
    ]
  };

  const stylePalette = palettes[neighborhood.buildingStyle] || palettes.commercial;

  for (let sr = 0; sr < subRows; sr++) {
    for (let sc = 0; sc < subCols; sc++) {
      const lx = x + sc * (cellW + gap);
      const ly = y + sr * (cellH + gap);

      // Dejar espacio libre frente a garajes
      const overlapsGarage = garages.some(
        (g) =>
          lx < g.x + g.w + 26 &&
          lx + cellW > g.x - 26 &&
          ly < g.y + g.h + 26 &&
          ly + cellH > g.y - 26
      );
      if (overlapsGarage) continue;

      // En periferia o residencial algunos lotes son jardines con árboles
      if ((neighborhood.buildingStyle === 'periphery' || neighborhood.buildingStyle === 'residential') && rand() < 0.22) {
        const tree = {
          x: lx + cellW * 0.5,
          y: ly + cellH * 0.5,
          radius: 17 + rand() * 7,
          hue: 98 + Math.floor(rand() * 30),
          phase: rand() * Math.PI * 2
        };
        trees.push(tree);
        block.trees.push(tree);
        continue;
      }

      const margin = 4 + rand() * 6;
      const bw = Math.max(44, cellW - margin * 2);
      const bh = Math.max(44, cellH - margin * 2);
      const bx = lx + (cellW - bw) / 2;
      const by = ly + (cellH - bh) / 2;
      const pal = stylePalette[Math.floor(rand() * stylePalette.length)];

      const building = {
        x: bx,
        y: by,
        w: bw,
        h: bh,
        height: pal.height + Math.floor(rand() * 6),
        baseColor: pal.base,
        roofColor: pal.roof,
        accentColor: pal.accent,
        style: neighborhood.buildingStyle,
        hasSkylight: neighborhood.buildingStyle === 'industrial' || rand() < 0.35,
        hasAcUnits: neighborhood.buildingStyle !== 'residential' && rand() < 0.7,
        hasAwning: neighborhood.buildingStyle === 'commercial' && rand() < 0.75,
        awningSide: Math.floor(rand() * 4)
      };

      buildings.push(building);
      block.buildings.push(building);

      // Árbol ornamental en esquina de vereda en zonas residenciales/comerciales
      if ((neighborhood.buildingStyle === 'residential' || neighborhood.buildingStyle === 'commercial') && rand() < 0.35) {
        const tree = {
          x: bx + bw + 6,
          y: by + 8,
          radius: 13 + rand() * 5,
          hue: 108 + Math.floor(rand() * 22),
          phase: rand() * Math.PI * 2
        };
        if (tree.x < x + w - 6) {
          trees.push(tree);
          block.trees.push(tree);
        }
      }
    }
  }
}

export function updateTrafficLights(world, dt) {
  for (const inter of world.intersections) {
    inter.timer = (inter.timer + dt) % inter.cycleDuration;
    const t = inter.timer;
    const half = inter.cycleDuration / 2;
    const yellowWindow = 2.0;

    if (t < half - yellowWindow) {
      inter.nsState = 'green';
      inter.ewState = 'red';
    } else if (t < half) {
      inter.nsState = 'yellow';
      inter.ewState = 'red';
    } else if (t < inter.cycleDuration - yellowWindow) {
      inter.nsState = 'red';
      inter.ewState = 'green';
    } else {
      inter.nsState = 'red';
      inter.ewState = 'yellow';
    }
  }
}

export function isOnRoad(world, x, y) {
  const half = world.roadWidth / 2;
  for (const rx of world.roadsV) {
    if (Math.abs(x - rx) <= half) return true;
  }
  for (const ry of world.roadsH) {
    if (Math.abs(y - ry) <= half) return true;
  }
  return false;
}

export function checkWorldCollision(world, x, y, radius) {
  let outX = Math.max(radius + 8, Math.min(world.width - radius - 8, x));
  let outY = Math.max(radius + 8, Math.min(world.height - radius - 8, y));
  let collided = outX !== x || outY !== y;

  // Borde del agua en el Puerto
  for (const wz of world.waterZones) {
    if (outX + radius > wz.x && outX - radius < wz.x + wz.w && outY + radius > wz.y && outY - radius < wz.y + wz.h) {
      outX = wz.x - radius;
      collided = true;
    }
  }

  // Consulta espacial rápida por manzana
  const minCol = Math.max(0, Math.floor((outX - radius - 32) / world.blockSize));
  const maxCol = Math.min(world.cols - 1, Math.floor((outX + radius + 32) / world.blockSize));
  const minRow = Math.max(0, Math.floor((outY - radius - 32) / world.blockSize));
  const maxRow = Math.min(world.rows - 1, Math.floor((outY + radius + 32) / world.blockSize));

  for (const block of world.blocks) {
    if (block.col < minCol || block.col > maxCol || block.row < minRow || block.row > maxRow) continue;
    for (const b of block.buildings) {
      const closestX = Math.max(b.x, Math.min(outX, b.x + b.w));
      const closestY = Math.max(b.y, Math.min(outY, b.y + b.h));
      const dx = outX - closestX;
      const dy = outY - closestY;
      const distSq = dx * dx + dy * dy;

      if (distSq < radius * radius) {
        collided = true;
        const dist = Math.sqrt(distSq);
        if (dist > 0.0001) {
          const overlap = radius - dist;
          outX += (dx / dist) * overlap;
          outY += (dy / dist) * overlap;
        } else {
          outY = b.y - radius;
        }
      }
    }
  }

  return { collided, x: outX, y: outY };
}
