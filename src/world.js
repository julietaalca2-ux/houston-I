window.CiudadCero = window.CiudadCero || {};

CiudadCero.World = (() => {
  const Config = CiudadCero.Config;
  const cfg = Config.WORLD;

  const buildings = [];
  const parks = [];
  const waterZones = [];
  const parkingLots = [];
  const garages = [];
  const hideouts = [];
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
        if ((gx + gy) % 2 === 0 && gx > 0 && gy > 0) {
          streetLights.push({
            x: x + cfg.roadWidth - 8,
            y: y + cfg.roadWidth - 8,
            districtId: district.id
          });
        }

        // Traffic lights at major avenue intersections
        if (gx > 0 && gy > 0 && gx % 2 === 0 && gy % 2 === 0) {
          trafficLights.push({
            x: x + cfg.roadWidth * 0.5,
            y: y + cfg.roadWidth * 0.5,
            ix: x,
            iy: y,
            phaseOffset: ((gx + gy) % 4) * 3.5,
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
            buildings.push({ x: innerL, y: innerT, w: innerW, h: wall, shade: 2, roofType: 1, districtId: district.id });
          }
          if (hideoutHere.openSide !== 'south') {
            buildings.push({ x: innerL, y: innerT + innerH - wall, w: innerW, h: wall, shade: 0, roofType: 1, districtId: district.id });
          }
          if (hideoutHere.openSide !== 'west') {
            buildings.push({
              x: innerL,
              y: innerT + (hideoutHere.openSide !== 'north' ? wall : 0),
              w: wall,
              h: innerH - (hideoutHere.openSide !== 'north' ? wall : 0) - (hideoutHere.openSide !== 'south' ? wall : 0),
              shade: 3,
              roofType: 1,
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
            isPlaza: district.id === 'centro' || district.id === 'comercial'
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
          // Add 2 parked car spots inside each dedicated parking lot
          parkedSpots.push({ x: px + pw * 0.3, y: py + ph * 0.35, angle: 0 });
          parkedSpots.push({ x: px + pw * 0.7, y: py + ph * 0.65, angle: Math.PI });
        } else {
          const bx = blockLeft + cfg.sidewalkWidth;
          const by = blockTop + cfg.sidewalkWidth;
          const bw = blockSize - cfg.sidewalkWidth * 2;
          const bh = blockSize - cfg.sidewalkWidth * 2;

          // Port container yards & industrial open yards add variety
          if (district.id === 'portuaria' && (gx + gy) % 3 === 0) {
            props.push({
              type: 'container_yard',
              x: bx,
              y: by,
              w: bw,
              h: bh,
              seed: gx * 7 + gy * 13
            });
            // Keep center collision small for container stack so player can drive around yard
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
            // Open green periphery field with small rural shed
            parks.push({
              x: bx,
              y: by,
              w: bw,
              h: bh,
              districtId: district.id,
              isMeadow: true
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

          // District decorative props on sidewalks
          if (district.id === 'comercial' && (gx + gy) % 2 === 0) {
            props.push({ type: 'billboard', x: blockLeft + 10, y: blockTop + 10, color: '#f5d94b' });
          } else if (district.id === 'centro' && (gx + gy) % 3 === 1) {
            props.push({ type: 'sign', x: blockLeft + 10, y: blockTop + blockSize - 10, label: 'AV. CENTRAL' });
          } else if (district.id === 'residencial' && (gx + gy) % 2 === 1) {
            props.push({ type: 'tree', x: blockLeft + 11, y: blockTop + 11 });
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

  function getTrafficLightState(light, simTime) {
    // 14-second full cycle: 0..5.5s H-green, 5.5..7s H-yellow, 7..12.5s V-green, 12.5..14s V-yellow
    const t = ((simTime + (light.phaseOffset || 0)) % 14 + 14) % 14;
    if (t < 5.5) return { h: 'green', v: 'red' };
    if (t < 7.0) return { h: 'yellow', v: 'red' };
    if (t < 12.5) return { h: 'red', v: 'green' };
    return { h: 'red', v: 'yellow' };
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
    parkedSpots,
    sidewalkNodes,
    trafficLights,
    streetLights,
    props,
    getDistrictAt,
    isOnRoad,
    getGarageAt,
    getHideoutAt,
    getTrafficLightState,
    getLaneCoords
  };
})();
