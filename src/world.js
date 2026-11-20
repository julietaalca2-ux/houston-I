window.CiudadCero = window.CiudadCero || {};

CiudadCero.World = (() => {
  const Config = CiudadCero.Config;
  const cfg = Config.WORLD;
  const sigCfg = Config.TRAFFIC_SIGNAL || { cycleDuration: 15.0, greenDuration: 6.0, yellowDuration: 1.5 };

  const buildings = [];
  const parks = [];
  const waterZones = [];
  const parkingLots = [];
  const garages = [];
  const hideouts = [];
  const stores = (Config.STORES || []).map((store) => Object.assign({}, store));
  const parkedSpots = [];
  const sidewalkNodes = [];
  const trafficLights = [];
  const streetLights = [];
  const props = [];

  function getDistrictAt(x, y) {
    const list = Config.DISTRICTS || [];
    for (let i = 0; i < list.length; i++) {
      const d = list[i];
      const b = d.bounds;
      if (x >= b.x1 && x < b.x2 && y >= b.y1 && y < b.y2) {
        return d;
      }
      if (d.extraBounds) {
        const eb = d.extraBounds;
        if (x >= eb.x1 && x < eb.x2 && y >= eb.y1 && y < eb.y2) {
          return d;
        }
      }
    }
    return list[0] || { id: 'centro', name: 'Centro Urbano', shortName: 'CENTRO', color: '#6cb2d1', avenueLabel: 'Av. Central' };
  }

  function init() {
    buildings.length = 0;
    parks.length = 0;
    waterZones.length = 0;
    parkingLots.length = 0;
    garages.length = 0;
    hideouts.length = 0;
    parkedSpots.length = 0;
    sidewalkNodes.length = 0;
    trafficLights.length = 0;
    streetLights.length = 0;
    props.length = 0;

    Config.GARAGES.forEach((g) => garages.push(Object.assign({}, g)));
    Config.HIDEOUTS.forEach((h) => hideouts.push(Object.assign({}, h)));

    const cols = Math.floor(cfg.width / cfg.blockSize);
    const rows = Math.floor(cfg.height / cfg.blockSize);

    // Special block definitions (gx, gy)
    const parkSet = new Set([
      '2,2',   // Parque Central (Residencial)
      '3,1',   // Plaza Residencial Norte
      '5,3',   // Parque Urbano Este
      '7,2',   // Plaza Torre Cero (Centro)
      '12,2',  // Plaza Galerías (Comercial)
      '13,9',  // Mirador de las Colinas (Periferia)
      '4,10',  // Parque Periferia Oeste
      '10,10'  // Área Verde Periferia Sur
    ]);

    // v0.7.5: clasificación visual de parques (grande / mediano / pequeño)
    const largeParks = new Set(['2,2', '5,3', '13,9']);

    const waterSet = new Set([
      '0,6', '0,7', '0,8',
      '1,9', '2,9', '3,9'
    ]);

    const parkingSet = new Set([
      '0,3',   // Estacionamiento Residencial
      '6,3',   // Estacionamiento Torre Cero
      '11,2',  // Estacionamiento Comercial Este
      '4,6',   // Estacionamiento Muelle 4
      '8,5',   // Estacionamiento Industrial
      '11,10', // Estacionamiento Periferia Sur
      '7,10'   // Parador Ruta 0
    ]);

    for (let gx = 0; gx < cols; gx++) {
      for (let gy = 0; gy < rows; gy++) {
        const x = gx * cfg.blockSize;
        const y = gy * cfg.blockSize;
        const key = `${gx},${gy}`;

        const blockLeft = x + cfg.roadWidth;
        const blockTop = y + cfg.roadWidth;
        const blockSize = cfg.blockSize - cfg.roadWidth;
        const centerX = blockLeft + blockSize * 0.5;
        const centerY = blockTop + blockSize * 0.5;
        const district = getDistrictAt(centerX, centerY);

        // Streetlights on intersection corners
        if (gx > 0 && gy > 0 && (gx + gy) % 2 === 0) {
          streetLights.push({
            x: x + cfg.roadWidth - 7,
            y: y + cfg.roadWidth - 7,
            districtId: district.id
          });
          streetLights.push({
            x: x + 7,
            y: y + 7,
            districtId: district.id
          });
        }

        // Synchronized 4-way traffic light systems at avenue intersections
        if (gx > 0 && gy > 0 && (gx % 2 === 0 || gy % 2 === 0)) {
          const isMajor = gx % 2 === 0 && gy % 2 === 0;
          // Staggered green-wave timing along avenues
          const waveOffset = ((gx * 1.65 + gy * 1.65) % sigCfg.cycleDuration);
          trafficLights.push({
            id: `tl_${gx}_${gy}`,
            gx,
            gy,
            isMajor,
            x: x + cfg.roadWidth * 0.5,
            y: y + cfg.roadWidth * 0.5,
            ix: x,
            iy: y,
            phaseOffset: waveOffset,
            districtId: district.id
          });
        }

        const garageHere = garages.find((g) => g.gx === gx && g.gy === gy);
        const hideoutHere = hideouts.find((h) => h.gx === gx && h.gy === gy);
        const isPark = parkSet.has(key);
        const isWater = waterSet.has(key);
        const isParking = parkingSet.has(key);

        if (garageHere) {
          const bx = blockLeft + cfg.sidewalkWidth;
          const bw = blockSize - cfg.sidewalkWidth * 2;
          buildings.push({
            x: bx,
            y: blockTop + blockSize - 38,
            w: bw,
            h: 26,
            shade: 1,
            roofType: 1,
            isGarageRoof: true,
            districtId: district.id
          });
        } else if (hideoutHere) {
          const pad = 16;
          const wall = 26;
          const innerL = blockLeft + pad;
          const innerT = blockTop + pad;
          const innerW = blockSize - pad * 2;
          const innerH = blockSize - pad * 2;

          if (hideoutHere.openSide !== 'north') {
            buildings.push({ x: innerL, y: innerT, w: innerW, h: wall, shade: 2, roofType: 1, isHideoutWall: true, districtId: district.id });
          }
          if (hideoutHere.openSide !== 'south') {
            buildings.push({ x: innerL, y: innerT + innerH - wall, w: innerW, h: wall, shade: 0, roofType: 1, isHideoutWall: true, districtId: district.id });
          }
          if (hideoutHere.openSide !== 'west') {
            buildings.push({
              x: innerL,
              y: innerT + (hideoutHere.openSide !== 'north' ? wall : 0),
              w: wall,
              h: innerH - (hideoutHere.openSide !== 'north' ? wall : 0) - (hideoutHere.openSide !== 'south' ? wall : 0),
              shade: 3,
              roofType: 1,
              isHideoutWall: true,
              districtId: district.id
            });
          }
          if (hideoutHere.openSide !== 'east') {
            buildings.push({
              x: innerL + innerW - wall,
              y: innerT + (hideoutHere.openSide !== 'north' ? wall : 0),
              w: wall,
              h: innerH - (hideoutHere.openSide !== 'north' ? wall : 0) - (hideoutHere.openSide !== 'south' ? wall : 0),
              shade: 1,
              roofType: 1,
              isHideoutWall: true,
              districtId: district.id
            });
          }
        } else if (isWater) {
          waterZones.push({
            x: blockLeft + 8,
            y: blockTop + 8,
            w: blockSize - 16,
            h: blockSize - 16,
            districtId: district.id
          });
        } else if (isPark) {
          parks.push({
            x: blockLeft + cfg.sidewalkWidth,
            y: blockTop + cfg.sidewalkWidth,
            w: blockSize - cfg.sidewalkWidth * 2,
            h: blockSize - cfg.sidewalkWidth * 2,
            districtId: district.id,
            isPlaza: district.id === 'centro' || district.id === 'comercial',
            sizeClass: largeParks.has(key) ? 'large' : 'medium'
          });
        } else if (isParking) {
          const px = blockLeft + 14;
          const py = blockTop + 14;
          const pw = blockSize - 28;
          const ph = blockSize - 28;
          parkingLots.push({
            x: px,
            y: py,
            w: pw,
            h: ph,
            districtId: district.id
          });
          parkedSpots.push({ x: px + pw * 0.3, y: py + ph * 0.35, angle: 0 });
          parkedSpots.push({ x: px + pw * 0.7, y: py + ph * 0.65, angle: Math.PI });
        } else {
          const bx = blockLeft + cfg.sidewalkWidth;
          const by = blockTop + cfg.sidewalkWidth;
          const bw = blockSize - cfg.sidewalkWidth * 2;
          const bh = blockSize - cfg.sidewalkWidth * 2;

          if (district.id === 'portuaria' && (gx + gy) % 3 === 0) {
            props.push({
              type: 'container_yard',
              x: bx,
              y: by,
              w: bw,
              h: bh,
              seed: gx * 7 + gy * 13
            });
            buildings.push({
              x: bx + 18,
              y: by + 22,
              w: bw - 36,
              h: bh - 44,
              shade: 2,
              roofType: 4,
              districtId: district.id,
              isContainerBlock: true
            });
          } else if (district.id === 'periferia' && (gx + gy) % 3 === 1) {
            parks.push({
              x: bx,
              y: by,
              w: bw,
              h: bh,
              districtId: district.id,
              isMeadow: true,
              sizeClass: 'small'
            });
            buildings.push({
              x: bx + 14,
              y: by + 14,
              w: 44,
              h: 34,
              shade: 2,
              roofType: 0,
              districtId: district.id
            });
          } else {
            buildings.push({
              x: bx,
              y: by,
              w: bw,
              h: bh,
              shade: (gx * 3 + gy * 5) % 4,
              roofType: (gx + gy) % 4,
              districtId: district.id
            });
          }

          addDistrictProps(gx, gy, district, blockLeft, blockTop, blockSize);

          // Urban street furniture on sidewalks (hydrants, bus stops, benches, trees, billboards)
          if ((gx + gy) % 2 === 0) {
            props.push({ type: 'hydrant', x: blockLeft + 9, y: blockTop + blockSize * 0.35 });
          }
          if (district.id === 'centro' && (gx + gy) % 2 === 1) {
            props.push({ type: 'bus_stop', x: blockLeft + blockSize * 0.5, y: blockTop + 8, horizontal: true });
          } else if (district.id === 'comercial' && (gx + gy) % 2 === 0) {
            props.push({ type: 'billboard', x: blockLeft + 10, y: blockTop + 10, color: '#f5d94b' });
            props.push({ type: 'bench', x: blockLeft + blockSize * 0.5, y: blockTop + blockSize - 9 });
          } else if (district.id === 'residencial' && (gx + gy) % 2 === 1) {
            props.push({ type: 'tree', x: blockLeft + 11, y: blockTop + 11 });
            props.push({ type: 'tree', x: blockLeft + blockSize - 11, y: blockTop + blockSize - 11 });
          }
        }

        if (!garageHere && !hideoutHere && !isWater) {
          const swPad = cfg.sidewalkWidth * 0.5;
          const n0 = { x: blockLeft + swPad, y: blockTop + swPad, districtId: district.id };
          const n1 = { x: blockLeft + blockSize - swPad, y: blockTop + swPad, districtId: district.id };
          const n2 = { x: blockLeft + blockSize - swPad, y: blockTop + blockSize - swPad, districtId: district.id };
          const n3 = { x: blockLeft + swPad, y: blockTop + blockSize - swPad, districtId: district.id };
          sidewalkNodes.push([n0, n1, n2, n3]);
        }

        if ((gx + gy) % 3 === 0 && !garageHere && !hideoutHere && !isWater && !isParking) {
          parkedSpots.push({
            x: blockLeft + blockSize * 0.5,
            y: blockTop - 18,
            angle: 0
          });
        }
      }
    }
  }

  // v0.7.5: vegetación y mobiliario con personalidad propia por barrio (solo decorativo)
  function addDistrictProps(gx, gy, district, bl, bt, bs) {
    const id = district.id;
    const h = (gx * 7 + gy * 13) % 5;
    const T = (x, y, species, size) => props.push({ type: 'tree', x, y, species, size });
    if (id === 'residencial') {
      const sp = ['oak', 'maple', 'blossom'][(gx + gy) % 3];
      for (let k = 1; k <= 3; k++) {
        T(bl + (bs * k) / 4, bt + 8, sp, 7 + (k % 2));
        T(bl + (bs * k) / 4, bt + bs - 8, sp, 7 + ((k + 1) % 2));
      }
      if (h === 0 || h === 3) props.push({ type: 'pocket_park', x: bl + 11, y: bt + bs * 0.64, species: 'blossom' });
      props.push({ type: 'planter', x: bl + bs - 30, y: bt + 9, w: 24, h: 8 });
    } else if (id === 'centro') {
      for (let k = 1; k <= 3; k++) {
        T(bl + (bs * k) / 4, bt + 9, 'poplar', 7);
      }
      props.push({ type: 'planter', x: bl + 26, y: bt + bs - 9, w: 28, h: 8 });
      props.push({ type: 'planter', x: bl + bs - 26, y: bt + bs - 9, w: 28, h: 8 });
      if (h === 1) props.push({ type: 'pocket_park', x: bl + 11, y: bt + bs * 0.64, species: 'oak' });
    } else if (id === 'comercial') {
      T(bl + bs * 0.25, bt + bs - 9, 'palm', 7);
      T(bl + bs * 0.75, bt + bs - 9, 'palm', 7);
      T(bl + bs * 0.25, bt + 9, 'blossom', 6.5);
      props.push({ type: 'planter', x: bl + bs * 0.5, y: bt + 9, w: 26, h: 8 });
      if (h === 2) props.push({ type: 'pocket_park', x: bl + bs - 11, y: bt + bs * 0.64, species: 'blossom' });
    } else if (id === 'portuaria') {
      for (let k = 0; k < 4; k++) props.push({ type: 'bollard', x: bl + 20 + k * ((bs - 40) / 3), y: bt + bs - 8 });
      props.push({ type: 'crates', x: bl + 14, y: bt + bs * 0.55 });
      props.push({ type: 'barrel', x: bl + bs - 12, y: bt + bs * 0.45, color: '#b4472f' });
      if (h === 0) T(bl + bs - 12, bt + 10, 'palm', 6.5);
    } else if (id === 'industrial') {
      props.push({ type: 'barrel', x: bl + 12, y: bt + bs * 0.55, color: '#3a6ea5' });
      props.push({ type: 'barrel', x: bl + 12, y: bt + bs * 0.55 + 8, color: '#b4472f' });
      props.push({ type: 'crates', x: bl + bs - 13, y: bt + bs * 0.6 });
      if (h === 2) T(bl + bs * 0.5, bt + 8, 'poplar', 6.5);
    } else if (id === 'periferia') {
      const sp = ['oak', 'pine', 'olive'][(gx + gy) % 3];
      T(bl + 12, bt + 10, sp, 9);
      T(bl + bs - 12, bt + bs - 10, sp, 10);
      T(bl + bs * 0.5, bt + bs - 8, 'pine', 8);
      if (h === 4 || h === 1) props.push({ type: 'pocket_park', x: bl + bs - 11, y: bt + bs * 0.64, species: 'oak' });
    }
  }

  function isOnRoad(x, y) {
    const rx = ((x % cfg.blockSize) + cfg.blockSize) % cfg.blockSize;
    const ry = ((y % cfg.blockSize) + cfg.blockSize) % cfg.blockSize;
    return rx < cfg.roadWidth || ry < cfg.roadWidth;
  }

  function getGarageAt(x, y, margin = 22) {
    for (let i = 0; i < garages.length; i++) {
      const g = garages[i];
      if (
        Math.abs(x - g.x) <= g.w * 0.5 + margin &&
        Math.abs(y - g.y) <= g.h * 0.5 + margin
      ) {
        return g;
      }
    }
    return null;
  }

  function getHideoutAt(x, y) {
    for (let i = 0; i < hideouts.length; i++) {
      const h = hideouts[i];
      if (
        Math.abs(x - h.x) <= h.w * 0.5 + 8 &&
        Math.abs(y - h.y) <= h.h * 0.5 + 8
      ) {
        return h;
      }
    }
    return null;
  }

  // Street-only GPS: A* over the orthogonal road/intersection grid.
  // The route deliberately terminates at the nearest intersection instead of
  // drawing a shortcut through a building to an indoor destination.
  function getStreetRoute(startX, startY, endX, endY) {
    const bs = cfg.blockSize;
    const cols = Math.max(1, Math.floor(cfg.width / bs));
    const rows = Math.max(1, Math.floor(cfg.height / bs));
    const clampIndex = (v, max) => Math.max(0, Math.min(max - 1, Math.round((v - bs * 0.25) / bs)));
    const sx = clampIndex(startX, cols), sy = clampIndex(startY, rows);
    const ex = clampIndex(endX, cols), ey = clampIndex(endY, rows);
    const key = (x, y) => `${x},${y}`;
    const open = [{ x: sx, y: sy, g: 0, f: Math.abs(ex - sx) + Math.abs(ey - sy) }];
    const cameFrom = new Map();
    const gScore = new Map([[key(sx, sy), 0]]);
    const closed = new Set();
    let found = false;
    while (open.length) {
      open.sort((a, b) => a.f - b.f);
      const current = open.shift();
      const ck = key(current.x, current.y);
      if (closed.has(ck)) continue;
      if (current.x === ex && current.y === ey) { found = true; break; }
      closed.add(ck);
      const neighbors = [[current.x + 1, current.y], [current.x - 1, current.y], [current.x, current.y + 1], [current.x, current.y - 1]];
      for (const [nx, ny] of neighbors) {
        if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
        const nk = key(nx, ny);
        if (closed.has(nk)) continue;
        const tentative = current.g + 1;
        if (tentative < (gScore.get(nk) ?? Infinity)) {
          cameFrom.set(nk, ck);
          gScore.set(nk, tentative);
          open.push({ x: nx, y: ny, g: tentative, f: tentative + Math.abs(ex - nx) + Math.abs(ey - ny) });
        }
      }
    }
    if (!found) return [];
    const path = [];
    let cursor = key(ex, ey);
    while (cursor) {
      const parts = cursor.split(',').map(Number);
      path.push({ x: parts[0] * bs + cfg.roadWidth * 0.5, y: parts[1] * bs + cfg.roadWidth * 0.5 });
      cursor = cameFrom.get(cursor);
    }
    path.reverse();
    const route = path.slice();
    const startNode = route[0];
    // Orthogonal connector from the player to the nearest intersection.
    if (isOnRoad(startX, startY) && Math.hypot(startX - startNode.x, startY - startNode.y) < bs * 0.72) {
      const rx = ((startX % bs) + bs) % bs;
      const ry = ((startY % bs) + bs) % bs;
      const corner = rx < cfg.roadWidth
        ? { x: startX, y: startNode.y }
        : { x: startNode.x, y: startY };
      route.unshift(corner);
      route.unshift({ x: startX, y: startY });
    }
    // A destination that lies on a road/sidewalk edge can be reached exactly.
    // Indoor or block-centre destinations stop at the closest intersection.
    const endNode = route[route.length - 1];
    if (isOnRoad(endX, endY) && Math.hypot(endX - endNode.x, endY - endNode.y) < bs * 0.72) {
      const rx = ((endX % bs) + bs) % bs;
      const corner = rx < cfg.roadWidth
        ? { x: endX, y: endNode.y }
        : { x: endNode.x, y: endY };
      route.push(corner);
      route.push({ x: endX, y: endY });
    }
    return route.filter((point, index, list) => index === 0 || Math.hypot(point.x - list[index - 1].x, point.y - list[index - 1].y) > 0.5);
  }

  function getTrafficLightState(light, simTime) {
    const cycle = sigCfg.cycleDuration || 15.0;
    const gDur = sigCfg.greenDuration || 6.0;
    const yDur = sigCfg.yellowDuration || 1.5;
    const halfCycle = gDur + yDur; // 7.5s per axis

    const t = ((simTime + (light.phaseOffset || 0)) % cycle + cycle) % cycle;
    if (t < gDur) {
      return {
        h: 'green',
        v: 'red',
        pedH: 'walk',
        pedV: 'dont_walk',
        remaining: gDur - t
      };
    }
    if (t < halfCycle) {
      return {
        h: 'yellow',
        v: 'red',
        pedH: 'dont_walk',
        pedV: 'dont_walk',
        remaining: halfCycle - t
      };
    }
    if (t < halfCycle + gDur) {
      return {
        h: 'red',
        v: 'green',
        pedH: 'dont_walk',
        pedV: 'walk',
        remaining: halfCycle + gDur - t
      };
    }
    return {
      h: 'red',
      v: 'yellow',
      pedH: 'dont_walk',
      pedV: 'dont_walk',
      remaining: cycle - t
    };
  }

  function getNearestTrafficLight(x, y, maxDist = 140) {
    let best = null;
    let bestDist = maxDist;
    for (let i = 0; i < trafficLights.length; i++) {
      const tl = trafficLights[i];
      const d = Math.hypot(tl.x - x, tl.y - y);
      if (d < bestDist) {
        bestDist = d;
        best = tl;
      }
    }
    return best;
  }

  function getLaneCoords() {
    const lanes = [];
    for (let x = 0; x < cfg.width; x += cfg.blockSize) {
      lanes.push({ axis: 'v', dir: -1, pos: x + 42 });
      lanes.push({ axis: 'v', dir: 1, pos: x + 108 });
    }
    for (let y = 0; y < cfg.height; y += cfg.blockSize) {
      lanes.push({ axis: 'h', dir: -1, pos: y + 42 });
      lanes.push({ axis: 'h', dir: 1, pos: y + 108 });
    }
    return lanes;
  }

  init();

  return {
    config: cfg,
    buildings,
    parks,
    waterZones,
    parkingLots,
    garages,
    hideouts,
    stores,
    parkedSpots,
    sidewalkNodes,
    trafficLights,
    streetLights,
    props,
    getDistrictAt,
    isOnRoad,
    getGarageAt,
    getHideoutAt,
    getStreetRoute,
    getTrafficLightState,
    getNearestTrafficLight,
    getLaneCoords
  };
})();
