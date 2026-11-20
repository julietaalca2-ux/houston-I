window.CiudadCero = window.CiudadCero || {};

CiudadCero.World = (() => {
  const Config = CiudadCero.Config;
  const cfg = Config.WORLD;
  const buildings = [];
  const parks = [];
  const garages = [];
  const hideouts = [];
  const parkedSpots = [];
  const sidewalkNodes = [];

  function init() {
    buildings.length = 0;
    parks.length = 0;
    garages.length = 0;
    hideouts.length = 0;
    parkedSpots.length = 0;
    sidewalkNodes.length = 0;

    Config.GARAGES.forEach((g) => garages.push(Object.assign({}, g)));
    Config.HIDEOUTS.forEach((h) => hideouts.push(Object.assign({}, h)));

    const cols = Math.floor(cfg.width / cfg.blockSize);
    const rows = Math.floor(cfg.height / cfg.blockSize);

    for (let gx = 0; gx < cols; gx++) {
      for (let gy = 0; gy < rows; gy++) {
        const x = gx * cfg.blockSize;
        const y = gy * cfg.blockSize;

        const blockLeft = x + cfg.roadWidth;
        const blockTop = y + cfg.roadWidth;
        const blockSize = cfg.blockSize - cfg.roadWidth;

        const garageHere = garages.find((g) => g.gx === gx && g.gy === gy);
        const hideoutHere = hideouts.find((h) => h.gx === gx && h.gy === gy);
        const isPark = (gx === 2 && gy === 2) || (gx === 5 && gy === 3);

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
            isGarageRoof: true
          });
        } else if (hideoutHere) {
          const pad = 16;
          const wall = 26;
          const innerL = blockLeft + pad;
          const innerT = blockTop + pad;
          const innerW = blockSize - pad * 2;
          const innerH = blockSize - pad * 2;

          if (hideoutHere.openSide !== 'north') {
            buildings.push({ x: innerL, y: innerT, w: innerW, h: wall, shade: 2, roofType: 1 });
          }
          if (hideoutHere.openSide !== 'south') {
            buildings.push({ x: innerL, y: innerT + innerH - wall, w: innerW, h: wall, shade: 0, roofType: 1 });
          }
          if (hideoutHere.openSide !== 'west') {
            buildings.push({
              x: innerL,
              y: innerT + (hideoutHere.openSide !== 'north' ? wall : 0),
              w: wall,
              h: innerH - (hideoutHere.openSide !== 'north' ? wall : 0) - (hideoutHere.openSide !== 'south' ? wall : 0),
              shade: 3,
              roofType: 1
            });
          }
          if (hideoutHere.openSide !== 'east') {
            buildings.push({
              x: innerL + innerW - wall,
              y: innerT + (hideoutHere.openSide !== 'north' ? wall : 0),
              w: wall,
              h: innerH - (hideoutHere.openSide !== 'north' ? wall : 0) - (hideoutHere.openSide !== 'south' ? wall : 0),
              shade: 1,
              roofType: 1
            });
          }
        } else if (isPark) {
          parks.push({
            x: blockLeft + cfg.sidewalkWidth,
            y: blockTop + cfg.sidewalkWidth,
            w: blockSize - cfg.sidewalkWidth * 2,
            h: blockSize - cfg.sidewalkWidth * 2
          });
        } else {
          const bx = blockLeft + cfg.sidewalkWidth;
          const by = blockTop + cfg.sidewalkWidth;
          const bw = blockSize - cfg.sidewalkWidth * 2;
          const bh = blockSize - cfg.sidewalkWidth * 2;
          buildings.push({
            x: bx,
            y: by,
            w: bw,
            h: bh,
            shade: (gx * 3 + gy * 5) % 4,
            roofType: (gx + gy) % 3
          });
        }

        if (!garageHere && !hideoutHere) {
          const swPad = cfg.sidewalkWidth * 0.5;
          const n0 = { x: blockLeft + swPad, y: blockTop + swPad };
          const n1 = { x: blockLeft + blockSize - swPad, y: blockTop + swPad };
          const n2 = { x: blockLeft + blockSize - swPad, y: blockTop + blockSize - swPad };
          const n3 = { x: blockLeft + swPad, y: blockTop + blockSize - swPad };
          sidewalkNodes.push([n0, n1, n2, n3]);
        }

        if ((gx + gy) % 2 === 0 && !garageHere && !hideoutHere) {
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
    garages,
    hideouts,
    parkedSpots,
    sidewalkNodes,
    isOnRoad,
    getGarageAt,
    getHideoutAt,
    getLaneCoords
  };
})();
