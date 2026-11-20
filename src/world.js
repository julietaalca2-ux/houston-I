window.CiudadCero = window.CiudadCero || {};

CiudadCero.World = (() => {
  const cfg = CiudadCero.Config.WORLD;
  const buildings = [];
  const parks = [];
  const parkedSpots = [];
  const sidewalkNodes = [];

  function init() {
    buildings.length = 0;
    parks.length = 0;
    parkedSpots.length = 0;
    sidewalkNodes.length = 0;

    const cols = Math.floor(cfg.width / cfg.blockSize);
    const rows = Math.floor(cfg.height / cfg.blockSize);

    for (let gx = 0; gx < cols; gx++) {
      for (let gy = 0; gy < rows; gy++) {
        const x = gx * cfg.blockSize;
        const y = gy * cfg.blockSize;

        // Área de manzana fuera de las calles
        const blockLeft = x + cfg.roadWidth;
        const blockTop = y + cfg.roadWidth;
        const blockSize = cfg.blockSize - cfg.roadWidth;

        // Dejar 2 plazas urbanas abiertas para variedad visual en Ciudad Cero
        const isPark = (gx === 2 && gy === 2) || (gx === 5 && gy === 3);

        if (isPark) {
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

        // Nodos de acera alrededor de la manzana para peatones
        const swPad = cfg.sidewalkWidth * 0.5;
        const n0 = { x: blockLeft + swPad, y: blockTop + swPad };
        const n1 = { x: blockLeft + blockSize - swPad, y: blockTop + swPad };
        const n2 = { x: blockLeft + blockSize - swPad, y: blockTop + blockSize - swPad };
        const n3 = { x: blockLeft + swPad, y: blockTop + blockSize - swPad };
        sidewalkNodes.push([n0, n1, n2, n3]);

        // Espacios de estacionamiento junto al cordón de la vereda
        if ((gx + gy) % 2 === 0 && !(gx === 1 && gy === 1)) {
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

  // Devuelve carriles de circulación por mano derecha
  // Horizontales: y = k*300 + 42 (Oeste) y y = k*300 + 108 (Este)
  // Verticales:   x = k*300 + 42 (Norte) y x = k*300 + 108 (Sur)
  function getLaneCoords() {
    const lanes = [];
    for (let x = 0; x < cfg.width; x += cfg.blockSize) {
      lanes.push({ axis: 'v', dir: -1, pos: x + 42 });  // Hacia arriba (Norte)
      lanes.push({ axis: 'v', dir: 1, pos: x + 108 });  // Hacia abajo (Sur)
    }
    for (let y = 0; y < cfg.height; y += cfg.blockSize) {
      lanes.push({ axis: 'h', dir: -1, pos: y + 42 });  // Hacia izquierda (Oeste)
      lanes.push({ axis: 'h', dir: 1, pos: y + 108 });  // Hacia derecha (Este)
    }
    return lanes;
  }

  init();

  return {
    config: cfg,
    buildings,
    parks,
    parkedSpots,
    sidewalkNodes,
    isOnRoad,
    getLaneCoords
  };
})();
