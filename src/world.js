window.CiudadCero = window.CiudadCero || {};

CiudadCero.World = (() => {
  const Config = CiudadCero.Config;
  const cfg = Config.WORLD;
  const sigCfg = Config.TRAFFIC_SIGNAL || { cycleDuration: 15.0, greenDuration: 6.0, yellowDuration: 1.5 };

  const buildings = [];
  const parks = [];
  const waterZones = [];
  const alleyways = [];
  const parkingLots = [];
  const garages = [];
  const hideouts = [];
  const stores = (Config.STORES || []).map((store) => Object.assign({}, store));
  const parkedSpots = [];
  const sidewalkNodes = [];
  const trafficLights = [];
  const streetLights = [];
  const props = [];
  const bridges = [];
  const mainCityWidth = cfg.mainCityWidth || 4800;

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


  // V0.8.8: parcel-based urban footprints. The road grid stays compatible with
  // traffic/collision systems, while each block gains a distinct built form.
  function addUrbanBlockFootprints(gx, gy, x, y, w, h, baseStyle, districtId) {
    const seed = Math.abs((gx * 73856093) ^ (gy * 19349663));
    const variant = seed % 4;
    const gap = 7 + (seed % 4);
    const add = (rx, ry, rw, rh, role, roof) => {
      if (rw < 18 || rh < 18) return;
      buildings.push(Object.assign({}, baseStyle, {
        x: Math.round(rx), y: Math.round(ry), w: Math.round(rw), h: Math.round(rh),
        footprintRole: role, roofType: roof === undefined ? baseStyle.roofType : roof,
        footprintSeed: seed % 997
      }));
    };

    if (districtId === 'centro') {
      // Dense downtown: tower footprints with setbacks and service wings.
      if (variant === 0) {
        add(x + 5, y + 5, w * 0.56, h * 0.58, 'tower', 2);
        add(x + w * 0.64, y + 8, w * 0.29, h * 0.40, 'annex', 1);
        add(x + w * 0.62, y + h * 0.54, w * 0.31, h * 0.38, 'podium', 3);
      } else if (variant === 1) {
        add(x + 6, y + 6, w - 12, h * 0.42, 'tower', 2);
        add(x + 8, y + h * 0.53, w * 0.40, h * 0.39, 'podium', 3);
        add(x + w * 0.52, y + h * 0.53, w * 0.40, h * 0.39, 'annex', 1);
      } else {
        add(x + 7, y + 7, w * 0.42, h - 14, 'tower', 2);
        add(x + w * 0.52, y + 7, w * 0.40, h * 0.48, 'annex', 1);
        add(x + w * 0.52, y + h * 0.58, w * 0.40, h * 0.34, 'podium', 3);
      }
      return;
    }

    if (districtId === 'comercial' || districtId === 'loston') {
      // Storefront strips and corner units leave readable pedestrian courts.
      const count = variant === 0 ? 3 : 2;
      const unitW = (w - gap * (count + 1)) / count;
      for (let i = 0; i < count; i++) {
        const hh = h * (i % 2 === 0 ? 0.78 : 0.68);
        add(x + gap + i * (unitW + gap), y + (h - hh) * 0.5, unitW, hh,
          i === 0 ? 'corner-shop' : 'shop', i % 2);
      }
      return;
    }

    if (districtId === 'industrial' || districtId === 'portuaria') {
      // Long sheds, loading annexes and open service yards.
      if (variant % 2 === 0) {
        add(x + 5, y + h * 0.12, w * 0.68, h * 0.72, 'warehouse', 3);
        add(x + w * 0.76, y + h * 0.18, w * 0.18, h * 0.28, 'service', 1);
      } else {
        add(x + w * 0.12, y + 5, w * 0.72, h * 0.62, 'warehouse', 3);
        add(x + w * 0.18, y + h * 0.72, w * 0.34, h * 0.18, 'service', 1);
      }
      return;
    }

    if (districtId === 'periferia') {
      // Low-density lots with detached homes and broad yards.
      const houseW = w * (variant % 2 ? 0.46 : 0.58);
      const houseH = h * (variant % 2 ? 0.48 : 0.40);
      add(x + (w - houseW) * 0.5, y + (h - houseH) * 0.5, houseW, houseH, 'detached-home', 0);
      if (variant === 3) add(x + w * 0.68, y + h * 0.12, w * 0.20, h * 0.22, 'garage', 1);
      return;
    }

    // Residential: paired homes or a small apartment court.
    if (variant === 0) {
      const half = (w - gap * 3) / 2;
      add(x + gap, y + gap, half, h - gap * 2, 'residence', 0);
      add(x + gap * 2 + half, y + gap, half, h - gap * 2, 'residence', 1);
    } else if (variant === 1) {
      add(x + gap, y + gap, w - gap * 2, h * 0.42, 'apartment', 2);
      add(x + gap, y + h * 0.56, w * 0.42, h * 0.34, 'residence', 0);
      add(x + w * 0.55, y + h * 0.56, w * 0.34, h * 0.34, 'residence', 1);
    } else {
      const hw = (w - gap * 3) / 2;
      const hh = (h - gap * 3) / 2;
      add(x + gap, y + gap, hw, hh, 'residence', 0);
      add(x + gap * 2 + hw, y + gap, hw, hh, 'residence', 1);
      add(x + gap, y + gap * 2 + hh, w - gap * 2, hh, 'residence', 2);
    }
  }

  function init() {
    buildings.length = 0;
    parks.length = 0;
    waterZones.length = 0;
    alleyways.length = 0;
    parkingLots.length = 0;
    garages.length = 0;
    hideouts.length = 0;
    parkedSpots.length = 0;
    sidewalkNodes.length = 0;
    trafficLights.length = 0;
    streetLights.length = 0;
    props.length = 0;
    bridges.length = 0;

    Config.GARAGES.forEach((g) => garages.push(Object.assign({}, g)));
    Config.HIDEOUTS.forEach((h) => hideouts.push(Object.assign({}, h)));

    const cols = Math.floor(mainCityWidth / cfg.blockSize);
    const rows = Math.floor(cfg.height / cfg.blockSize);

    // Special block definitions (gx, gy)
    const parkSet = new Set([
      '2,2',   // Parque Central (Residencial)
      '3,1',   // Plaza Residencial Norte
      '5,3',   // Parque Urbano Este
      '7,2',   // Plaza Torre Cero (Centro)
      '12,2',  // Plaza Galerías (Comercial)
      '13,9',  // Mirador de las Colinas (Periferia)
      '5,9',   // Parque Costero
      '10,10'  // Área Verde Periferia Sur
    ]);

    // v0.7.5: clasificación visual de parques (grande / mediano / pequeño)
    const largeParks = new Set(['2,2', '5,3', '13,9']);

    // V0.25: costa oeste y bahía sur (mar al oeste y al sur, como en el mapa de referencia).
    const waterSet = new Set();
    for (let wy = 4; wy <= 11; wy++) waterSet.add('0,' + wy);
    for (let wx = 1; wx <= 9; wx++) waterSet.add(wx + ',11');
    ['1,10', '2,10', '3,10'].forEach((k) => waterSet.add(k));

    const alleyBlockMap = new Map([
      ['4,3', { orientation: 'vertical', name: 'Pasaje de los Álamos' }],
      ['6,1', { orientation: 'horizontal', name: 'Pasaje Central' }],
      ['9,4', { orientation: 'vertical', name: 'Callejón de la Torre' }],
      ['12,4', { orientation: 'horizontal', name: 'Pasaje de las Galerías' }],
      ['3,8', { orientation: 'vertical', name: 'Callejón del Muelle' }],
      ['7,7', { orientation: 'horizontal', name: 'Pasaje de los Talleres' }],
      ['12,8', { orientation: 'vertical', name: 'Callejón del Sur' }],
      ['2,5', { orientation: 'horizontal', name: 'Pasaje de la Estación' }],
      ['5,5', { orientation: 'vertical', name: 'Callejón del Astillero' }],
      ['8,2', { orientation: 'horizontal', name: 'Pasaje de la Torre Norte' }],
      ['10,6', { orientation: 'vertical', name: 'Callejón de los Talleres Sur' }],
      ['14,5', { orientation: 'horizontal', name: 'Pasaje del Bulevar Este' }]
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
          // Costa oeste y borde sur se dibujan como mar continuo (ver zonas isSea abajo).
          if (!(gx === 0 && gy >= 4) && gy !== 11) {
            waterZones.push({
              x: blockLeft + 8,
              y: blockTop + 8,
              w: blockSize - 16,
              h: blockSize - 16,
              districtId: district.id
            });
          }
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
            const alleySpec = alleyBlockMap.get(key);
            const buildingStyle = {
              shade: (gx * 3 + gy * 5) % 4,
              roofType: (gx + gy) % 4,
              districtId: district.id
            };
            if (alleySpec) {
              const alleyWidth = 40;
              if (alleySpec.orientation === 'vertical') {
                const alleyX = blockLeft + blockSize * 0.5 - alleyWidth * 0.5;
                alleyways.push({
                  id: `alley_${gx}_${gy}`,
                  name: alleySpec.name,
                  x: alleyX, y: blockTop, w: alleyWidth, h: blockSize,
                  orientation: 'vertical', gx, gy, districtId: district.id
                });
                const leftWidth = alleyX - bx;
                const rightX = alleyX + alleyWidth;
                const rightWidth = bx + bw - rightX;
                if (leftWidth > 8) buildings.push(Object.assign({ x: bx, y: by, w: leftWidth, h: bh }, buildingStyle));
                if (rightWidth > 8) buildings.push(Object.assign({ x: rightX, y: by, w: rightWidth, h: bh }, buildingStyle));
              } else {
                const alleyY = blockTop + blockSize * 0.5 - alleyWidth * 0.5;
                alleyways.push({
                  id: `alley_${gx}_${gy}`,
                  name: alleySpec.name,
                  x: blockLeft, y: alleyY, w: blockSize, h: alleyWidth,
                  orientation: 'horizontal', gx, gy, districtId: district.id
                });
                const topHeight = alleyY - by;
                const bottomY = alleyY + alleyWidth;
                const bottomHeight = by + bh - bottomY;
                if (topHeight > 8) buildings.push(Object.assign({ x: bx, y: by, w: bw, h: topHeight }, buildingStyle));
                if (bottomHeight > 8) buildings.push(Object.assign({ x: bx, y: bottomY, w: bw, h: bottomHeight }, buildingStyle));
              }
            } else {
              addUrbanBlockFootprints(gx, gy, bx, by, bw, bh, buildingStyle, district.id);
            }
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

    buildLoston();
  }

  function getLostonNeighborhoodAt(x, y) {
    const list = Config.LOSTON_NEIGHBORHOODS || [];
    for (let i = 0; i < list.length; i++) {
      const b = list[i].bounds;
      if (x >= b.x1 && x < b.x2 && y >= b.y1 && y < b.y2) return list[i];
    }
    return null;
  }

  function buildLoston() {
    const bounds = Config.LOSTON_BOUNDS || { x1: 5400, y1: 900, x2: 6600, y2: 2700 };
    const bs = cfg.blockSize;
    const rw = cfg.roadWidth;
    const sw = cfg.sidewalkWidth;
    const firstGX = Math.round(bounds.x1 / bs);
    const lastGX = Math.round(bounds.x2 / bs);
    const firstGY = Math.round(bounds.y1 / bs);
    const lastGY = Math.round(bounds.y2 / bs);
    const parkBlocks = new Set(['19,4', '20,7']);
    const alleySpecs = new Map([
      ['19,3', { orientation: 'vertical', name: 'Pasaje de los Faros' }],
      ['20,5', { orientation: 'horizontal', name: 'Callejón del Mercado' }],
      ['18,7', { orientation: 'vertical', name: 'Pasaje de las Palmeras' }],
      ['21,6', { orientation: 'horizontal', name: 'Callejón Costero' }]
    ]);

    for (let gx = firstGX; gx < lastGX; gx++) {
      for (let gy = firstGY; gy < lastGY; gy++) {
        const x = gx * bs;
        const y = gy * bs;
        const blockLeft = x + rw;
        const blockTop = y + rw;
        const blockSize = bs - rw;
        const cx = blockLeft + blockSize * 0.5;
        const cy = blockTop + blockSize * 0.5;
        const district = getDistrictAt(cx, cy);
        const neighborhood = getLostonNeighborhoodAt(cx, cy);
        const neighborhoodId = neighborhood ? neighborhood.id : 'loston_centro';
        const key = `${gx},${gy}`;
        const bx = blockLeft + sw;
        const by = blockTop + sw;
        const bw = blockSize - sw * 2;
        const bh = blockSize - sw * 2;

        // Every island block has a pedestrian loop, so foot traffic can populate Loston.
        const pad = sw * 0.5;
        sidewalkNodes.push([
          { x: blockLeft + pad, y: blockTop + pad, districtId: 'loston', neighborhoodId },
          { x: blockLeft + blockSize - pad, y: blockTop + pad, districtId: 'loston', neighborhoodId },
          { x: blockLeft + blockSize - pad, y: blockTop + blockSize - pad, districtId: 'loston', neighborhoodId },
          { x: blockLeft + pad, y: blockTop + blockSize - pad, districtId: 'loston', neighborhoodId }
        ]);

        if (parkBlocks.has(key)) {
          parks.push({
            x: bx, y: by, w: bw, h: bh, districtId: 'loston',
            neighborhoodId, neighborhoodName: neighborhood ? neighborhood.name : 'Loston',
            isPlaza: true, sizeClass: 'medium', isIslandPark: true
          });
          props.push({ type: 'bench', x: cx, y: cy, districtId: 'loston' });
          props.push({ type: 'tree', x: bx + 18, y: by + 18, species: 'palm', size: 9 });
          props.push({ type: 'tree', x: bx + bw - 18, y: by + bh - 18, species: 'palm', size: 9 });
        } else {
          const style = {
            shade: (gx * 5 + gy * 3) % 4,
            roofType: (gx + gy) % 4,
            districtId: 'loston',
            neighborhoodId,
            neighborhoodName: neighborhood ? neighborhood.name : 'Loston'
          };
          const alley = alleySpecs.get(key);
          if (alley) {
            const aw = 34;
            if (alley.orientation === 'vertical') {
              const ax = blockLeft + blockSize * 0.5 - aw * 0.5;
              alleyways.push({ id: `alley_loston_${gx}_${gy}`, name: alley.name, x: ax, y: blockTop, w: aw, h: blockSize, orientation: 'vertical', gx, gy, districtId: 'loston', neighborhoodId });
              const leftW = ax - bx;
              const rightX = ax + aw;
              const rightW = bx + bw - rightX;
              if (leftW > 8) buildings.push(Object.assign({ x: bx, y: by, w: leftW, h: bh }, style));
              if (rightW > 8) buildings.push(Object.assign({ x: rightX, y: by, w: rightW, h: bh }, style));
            } else {
              const ay = blockTop + blockSize * 0.5 - aw * 0.5;
              alleyways.push({ id: `alley_loston_${gx}_${gy}`, name: alley.name, x: blockLeft, y: ay, w: blockSize, h: aw, orientation: 'horizontal', gx, gy, districtId: 'loston', neighborhoodId });
              const topH = ay - by;
              const bottomY = ay + aw;
              const bottomH = by + bh - bottomY;
              if (topH > 8) buildings.push(Object.assign({ x: bx, y: by, w: bw, h: topH }, style));
              if (bottomH > 8) buildings.push(Object.assign({ x: bx, y: bottomY, w: bw, h: bottomH }, style));
            }
          } else {
            addUrbanBlockFootprints(gx, gy, bx, by, bw, bh, style, 'loston');
          }
          // Coastal planting, street furniture and a few distinct storefronts.
          props.push({ type: 'tree', x: blockLeft + 10, y: blockTop + 10, species: 'palm', size: 8 });
          if ((gx + gy) % 2 === 0) props.push({ type: 'planter', x: blockLeft + blockSize - 24, y: blockTop + blockSize - 10, w: 22, h: 7 });
          if (neighborhoodId === 'loston_centro' && (gx + gy) % 2 === 1) props.push({ type: 'billboard', x: blockLeft + 12, y: blockTop + 12, color: '#55c9d8' });
        }

        if (gx % 2 === 0 && gy % 2 === 0) {
          streetLights.push({ x: x + rw - 7, y: y + rw - 7, districtId: 'loston' });
          trafficLights.push({ id: `tl_loston_${gx}_${gy}`, gx, gy, isMajor: true, x: x + rw * 0.5, y: y + rw * 0.5, ix: x, iy: y, phaseOffset: ((gx * 1.65 + gy * 1.65) % sigCfg.cycleDuration), districtId: 'loston' });
        }
        if ((gx + gy) % 3 === 0) parkedSpots.push({ x: cx, y: blockTop - 18, angle: 0 });
      }
    }

    // Ocean surrounds the island. The only dry corridor across the western channel is the bridge deck.
    // V0.25: mar al oeste y al sur de la ciudad principal (cubre también las calles de la costa).
    waterZones.push(
      { id: 'coast_sea_west', x: 0, y: 1350, w: 300, h: 2250, isSea: true },
      { id: 'coast_sea_south', x: 0, y: 3300, w: 3000, h: 300, isSea: true }
    );
    waterZones.push(
      { id: 'loston_sea_west_north', x: 4800, y: 0, w: 600, h: 1800, isSea: true },
      { id: 'loston_sea_west_south', x: 4800, y: 1950, w: 600, h: 1650, isSea: true },
      { id: 'loston_sea_north', x: 5400, y: 0, w: 1500, h: 900, isSea: true },
      { id: 'loston_sea_south', x: 5400, y: 2700, w: 1500, h: 900, isSea: true },
      { id: 'loston_sea_east', x: 6600, y: 900, w: 300, h: 1800, isSea: true }
    );
    bridges.push({ id: 'bridge_loston', name: 'Puente de Loston', x: 4800, y: 1800, w: 600, h: 150, orientation: 'horizontal', districtId: 'loston' });
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
    } else if (id === 'loston') {
      for (let k = 1; k <= 3; k++) T(bl + (bs * k) / 4, bt + (k % 2 ? 9 : bs - 9), 'palm', 8 + (k % 2));
      props.push({ type: 'planter', x: bl + bs * 0.5, y: bt + bs - 8, w: 28, h: 8 });
      if (h === 2) props.push({ type: 'bench', x: bl + bs * 0.5, y: bt + bs * 0.35 });
    } else if (id === 'periferia') {
      const sp = ['oak', 'pine', 'olive'][(gx + gy) % 3];
      T(bl + 12, bt + 10, sp, 9);
      T(bl + bs - 12, bt + bs - 10, sp, 10);
      T(bl + bs * 0.5, bt + bs - 8, 'pine', 8);
      if (h === 4 || h === 1) props.push({ type: 'pocket_park', x: bl + bs - 11, y: bt + bs * 0.64, species: 'oak' });
    }
  }

  function isInWater(x, y, margin = 0) {
    for (let i = 0; i < waterZones.length; i++) {
      const w = waterZones[i];
      if (x + margin > w.x && x - margin < w.x + w.w && y + margin > w.y && y - margin < w.y + w.h) return true;
    }
    return false;
  }

  function isOnRoad(x, y) {
    if (isInWater(x, y, 2)) return false;
    const rx = ((x % cfg.blockSize) + cfg.blockSize) % cfg.blockSize;
    const ry = ((y % cfg.blockSize) + cfg.blockSize) % cfg.blockSize;
    if (rx < cfg.roadWidth || ry < cfg.roadWidth) return true;
    // Los callejones son calzadas reales: se puede circular por ellos y los peatones
    // los reconocen como superficie vial, sin cambiar la cuadrícula principal.
    for (let i = 0; i < alleyways.length; i++) {
      const a = alleyways[i];
      if (x >= a.x && x <= a.x + a.w && y >= a.y && y <= a.y + a.h) return true;
    }
    return false;
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
        const nodeX = nx * bs + cfg.roadWidth * 0.5;
        const nodeY = ny * bs + cfg.roadWidth * 0.5;
        if (isInWater(nodeX, nodeY, 4)) continue;
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
    alleyways,
    parkingLots,
    garages,
    hideouts,
    stores,
    parkedSpots,
    sidewalkNodes,
    trafficLights,
    streetLights,
    props,
    bridges,
    getDistrictAt,
    getLostonNeighborhoodAt,
    isInWater,
    isOnRoad,
    getGarageAt,
    getHideoutAt,
    getStreetRoute,
    getTrafficLightState,
    getNearestTrafficLight,
    getLaneCoords
  };
})();
