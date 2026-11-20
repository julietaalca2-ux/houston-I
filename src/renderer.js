window.CiudadCero = window.CiudadCero || {};

CiudadCero.Renderer = (() => {
  const Config = CiudadCero.Config;
  const World = CiudadCero.World;
  const Characters = CiudadCero.Characters;
  const CityArt = CiudadCero.CityArt;
  const wCfg = Config.WORLD;

  // Tile cache de 2400x1800: permite ampliar el mundo sin crear canvases gigantes en móviles.
  let mapTiles = null;
  let asphaltPattern = null;
  let sidewalkPattern = null;
  const particles = [];
  let highQuality = true;
  let showMinimap = true;
  let showTrafficLightsOnMap = true;

  function setQuality(quality) {
    const prevDetail = CityArt.getDetail();
    highQuality = quality !== 'performance';
    CityArt.setDetail(quality);
    // v0.7.9: si cambió el nivel de detalle se regenera la caché estática del mapa
    if (CityArt.getDetail() !== prevDetail) {
      mapTiles = null;
      CityArt.resetCaches();
    }
  }

  function setShowMinimap(visible) {
    showMinimap = Boolean(visible);
  }

  function setShowTrafficLightsOnMap(visible) {
    showTrafficLightsOnMap = Boolean(visible);
  }

  function createAsphaltPattern(targetCtx) {
    if (asphaltPattern) return asphaltPattern;
    const pCanvas = document.createElement('canvas');
    pCanvas.width = 128;
    pCanvas.height = 128;
    const pCtx = pCanvas.getContext('2d');

    pCtx.fillStyle = '#2c332e';
    pCtx.fillRect(0, 0, 128, 128);

    // Deterministic mineral aggregate speckles & micro-pores
    let seed = 1337;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };

    for (let i = 0; i < 680; i++) {
      const rx = Math.floor(rand() * 128);
      const ry = Math.floor(rand() * 128);
      const tone = rand();
      if (tone < 0.38) {
        pCtx.fillStyle = 'rgba(255, 255, 255, 0.045)';
      } else if (tone < 0.75) {
        pCtx.fillStyle = 'rgba(12, 16, 13, 0.14)';
      } else {
        pCtx.fillStyle = 'rgba(165, 180, 168, 0.035)';
      }
      pCtx.fillRect(rx, ry, tone > 0.85 ? 2 : 1, 1);
    }

    // Subtle bituminous tar seam lines
    pCtx.strokeStyle = 'rgba(14, 18, 15, 0.22)';
    pCtx.lineWidth = 1;
    pCtx.beginPath();
    pCtx.moveTo(0, 64);
    pCtx.lineTo(128, 64);
    pCtx.moveTo(64, 0);
    pCtx.lineTo(64, 128);
    pCtx.stroke();

    asphaltPattern = targetCtx.createPattern(pCanvas, 'repeat');
    return asphaltPattern;
  }

  function createSidewalkPattern(targetCtx) {
    if (sidewalkPattern) return sidewalkPattern;
    const sCanvas = document.createElement('canvas');
    sCanvas.width = 48;
    sCanvas.height = 48;
    const sCtx = sCanvas.getContext('2d');

    sCtx.fillStyle = '#757f72';
    sCtx.fillRect(0, 0, 48, 48);

    // Concrete slab joint lines (24x24 paving tiles)
    sCtx.strokeStyle = 'rgba(22, 28, 24, 0.24)';
    sCtx.lineWidth = 1;
    sCtx.strokeRect(0.5, 0.5, 23, 23);
    sCtx.strokeRect(24.5, 0.5, 23, 23);
    sCtx.strokeRect(0.5, 24.5, 23, 23);
    sCtx.strokeRect(24.5, 24.5, 23, 23);

    // Subtle top highlight inside each concrete paver
    sCtx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    sCtx.beginPath();
    sCtx.moveTo(1, 1.5);
    sCtx.lineTo(23, 1.5);
    sCtx.moveTo(25, 1.5);
    sCtx.lineTo(47, 1.5);
    sCtx.moveTo(1, 25.5);
    sCtx.lineTo(23, 25.5);
    sCtx.moveTo(25, 25.5);
    sCtx.lineTo(47, 25.5);
    sCtx.stroke();

    sidewalkPattern = targetCtx.createPattern(sCanvas, 'repeat');
    return sidewalkPattern;
  }

  function renderWorldToContext(c, ox, oy, tw, th) {
    c.save();
    c.translate(-ox, -oy);

    const aPat = createAsphaltPattern(c);
    const swPat = createSidewalkPattern(c);

    // 1. Textured asphalt base across entire road grid
    c.fillStyle = aPat || '#2c332e';
    c.fillRect(ox, oy, tw, th);

    const startX = Math.floor(ox / wCfg.blockSize) * wCfg.blockSize;
    const startY = Math.floor(oy / wCfg.blockSize) * wCfg.blockSize;

    // 2. Subtle district atmospheric road tint + lane tire wear tracks
    for (let x = startX; x < ox + tw + wCfg.blockSize; x += wCfg.blockSize) {
      for (let y = startY; y < oy + th + wCfg.blockSize; y += wCfg.blockSize) {
        const dist = World.getDistrictAt(x + wCfg.blockSize * 0.5, y + wCfg.blockSize * 0.5);
        c.save();
        c.globalAlpha = 0.26;
        c.fillStyle = dist.groundTint || '#313933';
        c.fillRect(x, y, wCfg.blockSize, wCfg.blockSize);
        c.restore();
      }
    }

    // Tire wear tracks along primary lanes (+42 and +108)
    c.fillStyle = 'rgba(14, 18, 15, 0.22)';
    for (let x = startX; x <= ox + tw + wCfg.blockSize; x += wCfg.blockSize) {
      c.fillRect(x + 31, oy, 22, th);
      c.fillRect(x + 97, oy, 22, th);
    }
    for (let y = startY; y <= oy + th + wCfg.blockSize; y += wCfg.blockSize) {
      c.fillRect(ox, y + 31, tw, 22);
      c.fillRect(ox, y + 97, tw, 22);
    }

    // 3. Road edge shoulder lines, double avenue centerlines & local dashed lines
    for (let x = startX; x <= ox + tw + wCfg.blockSize; x += wCfg.blockSize) {
      const gx = Math.round(x / wCfg.blockSize);
      const isAvenue = gx % 2 === 0;

      // White curb-side shoulder lines
      c.strokeStyle = 'rgba(232, 240, 230, 0.30)';
      c.lineWidth = 1.5;
      c.setLineDash([]);
      c.beginPath();
      c.moveTo(x + 9, oy);
      c.lineTo(x + 9, oy + th);
      c.moveTo(x + wCfg.roadWidth - 9, oy);
      c.lineTo(x + wCfg.roadWidth - 9, oy + th);
      c.stroke();

      // Center divider
      if (isAvenue) {
        c.strokeStyle = 'rgba(245, 217, 75, 0.78)';
        c.lineWidth = 1.8;
        c.beginPath();
        c.moveTo(x + wCfg.roadWidth * 0.5 - 2.2, oy);
        c.lineTo(x + wCfg.roadWidth * 0.5 - 2.2, oy + th);
        c.moveTo(x + wCfg.roadWidth * 0.5 + 2.2, oy);
        c.lineTo(x + wCfg.roadWidth * 0.5 + 2.2, oy + th);
        c.stroke();
      } else {
        c.strokeStyle = 'rgba(227, 198, 92, 0.52)';
        c.lineWidth = 2;
        c.setLineDash([16, 16]);
        c.beginPath();
        c.moveTo(x + wCfg.roadWidth * 0.5, oy);
        c.lineTo(x + wCfg.roadWidth * 0.5, oy + th);
        c.stroke();
        c.setLineDash([]);
      }
    }

    for (let y = startY; y <= oy + th + wCfg.blockSize; y += wCfg.blockSize) {
      const gy = Math.round(y / wCfg.blockSize);
      const isAvenue = gy % 2 === 0;

      // White curb-side shoulder lines
      c.strokeStyle = 'rgba(232, 240, 230, 0.30)';
      c.lineWidth = 1.5;
      c.setLineDash([]);
      c.beginPath();
      c.moveTo(ox, y + 9);
      c.lineTo(ox + tw, y + 9);
      c.moveTo(ox, y + wCfg.roadWidth - 9);
      c.lineTo(ox + tw, y + wCfg.roadWidth - 9);
      c.stroke();

      if (isAvenue) {
        c.strokeStyle = 'rgba(245, 217, 75, 0.78)';
        c.lineWidth = 1.8;
        c.beginPath();
        c.moveTo(ox, y + wCfg.roadWidth * 0.5 - 2.2);
        c.lineTo(ox + tw, y + wCfg.roadWidth * 0.5 - 2.2);
        c.moveTo(ox, y + wCfg.roadWidth * 0.5 + 2.2);
        c.lineTo(ox + tw, y + wCfg.roadWidth * 0.5 + 2.2);
        c.stroke();
      } else {
        c.strokeStyle = 'rgba(227, 198, 92, 0.52)';
        c.lineWidth = 2;
        c.setLineDash([16, 16]);
        c.beginPath();
        c.moveTo(ox, y + wCfg.roadWidth * 0.5);
        c.lineTo(ox + tw, y + wCfg.roadWidth * 0.5);
        c.stroke();
        c.setLineDash([]);
      }
    }

    // 4. Intersections: Clear box, Zebra Crosswalks, White Stop Bars, Manholes & Drains
    const rw = wCfg.roadWidth;
    for (let x = startX; x < ox + tw + wCfg.blockSize; x += wCfg.blockSize) {
      for (let y = startY; y < oy + th + wCfg.blockSize; y += wCfg.blockSize) {
        // Clean intersection asphalt deck
        c.fillStyle = aPat || '#2c332e';
        c.fillRect(x + 9, y + 9, rw - 18, rw - 18);

        // Zebra crosswalks on all 4 approaches of the intersection
        c.fillStyle = 'rgba(238, 244, 236, 0.36)';
        for (let s = 14; s < rw - 14; s += 14) {
          // Top & bottom crosswalks
          c.fillRect(x + s, y + 3, 7, 13);
          c.fillRect(x + s, y + rw - 16, 7, 13);
          // Left & right crosswalks
          c.fillRect(x + 3, y + s, 13, 7);
          c.fillRect(x + rw - 16, y + s, 13, 7);
        }

        // Crisp white stop bars (líneas de detención) before crosswalks
        c.fillStyle = 'rgba(244, 248, 242, 0.68)';
        // North approach (v, dir +1, x+75..x+142)
        c.fillRect(x + rw * 0.5 + 3, y - 6, rw * 0.5 - 12, 4);
        // South approach (v, dir -1, x+9..x+72)
        c.fillRect(x + 9, y + rw + 2, rw * 0.5 - 12, 4);
        // West approach (h, dir +1, y+75..y+142)
        c.fillRect(x - 6, y + rw * 0.5 + 3, 4, rw * 0.5 - 12);
        // East approach (h, dir -1, y+9..y+72)
        c.fillRect(x + rw + 2, y + 9, 4, rw * 0.5 - 12);

        // Manhole cover in intersection center
        c.fillStyle = '#202622';
        c.beginPath();
        c.arc(x + rw * 0.5, y + rw * 0.5, 6.5, 0, Math.PI * 2);
        c.fill();
        c.strokeStyle = '#47524a';
        c.lineWidth = 1.2;
        c.stroke();

        // Storm drain grates near curb corners
        c.fillStyle = '#181d1a';
        c.fillRect(x + rw + 14, y + 3, 12, 5);
        c.fillRect(x + rw + 14, y + rw - 8, 12, 5);
      }
    }

    // 5. Raised Sidewalks & 3D-Beveled Curbs (cordones de vereda) for every city block
    for (let x = startX; x < ox + tw + wCfg.blockSize; x += wCfg.blockSize) {
      for (let y = startY; y < oy + th + wCfg.blockSize; y += wCfg.blockSize) {
        const blockLeft = x + wCfg.roadWidth;
        const blockTop = y + wCfg.roadWidth;
        const blockSize = wCfg.blockSize - wCfg.roadWidth;
        const dist = World.getDistrictAt(blockLeft + blockSize * 0.5, blockTop + blockSize * 0.5);

        // Gutter drop-shadow around block curb
        c.fillStyle = 'rgba(10, 14, 11, 0.52)';
        c.fillRect(blockLeft - 3, blockTop - 3, blockSize + 6, blockSize + 6);

        // Textured concrete paving slab base
        c.fillStyle = CityArt.getSidewalkPattern(c, dist.id) || swPat || dist.blockTint || '#757f72';
        c.fillRect(blockLeft, blockTop, blockSize, blockSize);

        // District subtle sidewalk tint overlay
        c.save();
        c.globalAlpha = 0.22;
        c.fillStyle = dist.blockTint || '#757f72';
        c.fillRect(blockLeft, blockTop, blockSize, blockSize);
        c.restore();

        // 3D Curb Bevel Frame (cordón perimetral)
        c.strokeStyle = 'rgba(238, 245, 236, 0.44)';
        c.lineWidth = 2.2;
        c.beginPath();
        c.moveTo(blockLeft + 1, blockTop + blockSize - 1);
        c.lineTo(blockLeft + 1, blockTop + 1);
        c.lineTo(blockLeft + blockSize - 1, blockTop + 1);
        c.stroke();

        c.strokeStyle = 'rgba(24, 30, 26, 0.62)';
        c.lineWidth = 2.2;
        c.beginPath();
        c.moveTo(blockLeft + blockSize - 1, blockTop + 1);
        c.lineTo(blockLeft + blockSize - 1, blockTop + blockSize - 1);
        c.lineTo(blockLeft + 1, blockTop + blockSize - 1);
        c.stroke();

        // Inner sidewalk joint line separating curb strip from inner block pad
        const sw = wCfg.sidewalkWidth;
        c.strokeStyle = 'rgba(24, 30, 26, 0.28)';
        c.lineWidth = 1;
        c.strokeRect(blockLeft + sw, blockTop + sw, blockSize - sw * 2, blockSize - sw * 2);

        // Corner tactile pedestrian curb-cut ramps (rampas peatonales)
        c.fillStyle = dist.id === 'centro' || dist.id === 'comercial'
          ? 'rgba(245, 217, 75, 0.45)'
          : 'rgba(205, 214, 200, 0.35)';
        c.fillRect(blockLeft + 2, blockTop + 2, 11, 11);
        c.fillRect(blockLeft + blockSize - 13, blockTop + 2, 11, 11);
        c.fillRect(blockLeft + 2, blockTop + blockSize - 13, 11, 11);
        c.fillRect(blockLeft + blockSize - 13, blockTop + blockSize - 13, 11, 11);

        // v0.7.9: decoración propia de cada barrio sobre la vereda
        CityArt.decorateBlock(c, blockLeft, blockTop, blockSize, dist, Math.round(x / wCfg.blockSize), Math.round(y / wCfg.blockSize));

        // Industrial & Port hazard yellow/black curb stripes
        if (dist.id === 'portuaria' || dist.id === 'industrial') {
          c.fillStyle = '#e3b42b';
          for (let cs = 22; cs < blockSize - 24; cs += 24) {
            c.fillRect(blockLeft + cs, blockTop, 10, 3);
            c.fillRect(blockLeft + cs, blockTop + blockSize - 3, 10, 3);
          }
        }
      }
    }

    // 6. Port harbor water zones
    for (let i = 0; i < World.waterZones.length; i++) {
      const w = World.waterZones[i];
      if (w.x + w.w < ox || w.x > ox + tw || w.y + w.h < oy || w.y > oy + th) continue;
      c.fillStyle = '#183d4a';
      c.fillRect(w.x, w.y, w.w, w.h);
      c.strokeStyle = '#4de0b5';
      c.lineWidth = 2;
      c.strokeRect(w.x + 2, w.y + 2, w.w - 4, w.h - 4);

      c.strokeStyle = 'rgba(130, 224, 245, 0.26)';
      c.lineWidth = 1.5;
      for (let wy = w.y + 22; wy < w.y + w.h - 14; wy += 24) {
        c.beginPath();
        c.moveTo(w.x + 14, wy);
        c.lineTo(w.x + w.w - 14, wy);
        c.stroke();
      }
      // v0.7.9: muelle de piedra, espuma y amarras
      c.strokeStyle = '#8b9696';
      c.lineWidth = 3;
      c.strokeRect(w.x - 1.5, w.y - 1.5, w.w + 3, w.h + 3);
      c.strokeStyle = 'rgba(235, 250, 255, 0.32)';
      c.lineWidth = 1.2;
      c.strokeRect(w.x + 4, w.y + 4, w.w - 8, w.h - 8);
      for (let bx = w.x + 14; bx < w.x + w.w - 8; bx += 28) {
        c.fillStyle = '#e3b42b';
        c.beginPath();
        c.arc(bx, w.y - 1.5, 2, 0, Math.PI * 2);
        c.arc(bx, w.y + w.h + 1.5, 2, 0, Math.PI * 2);
        c.fill();
      }
      c.fillStyle = 'rgba(180, 240, 255, 0.55)';
      c.font = 'bold 9px monospace';
      c.textAlign = 'center';
      c.fillText('DÁRSENA PORTUARIA', w.x + w.w * 0.5, w.y + w.h * 0.5 + 3);
    }

    // 6b. Puente de Loston: tablero, veredas, barandas y juntas de expansión.
    for (const bridge of World.bridges || []) {
      c.fillStyle = '#34413f';
      c.fillRect(bridge.x, bridge.y, bridge.w, bridge.h);
      c.fillStyle = '#9aa7a0';
      c.fillRect(bridge.x, bridge.y + 2, bridge.w, 6);
      c.fillRect(bridge.x, bridge.y + bridge.h - 8, bridge.w, 6);
      c.fillStyle = '#202a28';
      for (let px = bridge.x + 90; px < bridge.x + bridge.w - 20; px += 150) {
        c.fillRect(px, bridge.y + 8, 12, bridge.h - 16);
      }
      c.strokeStyle = '#e7c95d';
      c.lineWidth = 3;
      c.setLineDash([28, 20]);
      c.beginPath();
      c.moveTo(bridge.x + 12, bridge.y + bridge.h * 0.5);
      c.lineTo(bridge.x + bridge.w - 12, bridge.y + bridge.h * 0.5);
      c.stroke();
      c.setLineDash([]);
      c.strokeStyle = 'rgba(225, 238, 231, 0.8)';
      c.lineWidth = 2;
      c.strokeRect(bridge.x + 1, bridge.y + 1, bridge.w - 2, bridge.h - 2);
      c.fillStyle = '#e7eef0';
      c.font = 'bold 16px monospace';
      c.textAlign = 'center';
      c.fillText('PUENTE DE LOSTON', bridge.x + bridge.w * 0.5, bridge.y + bridge.h * 0.5 - 13);
    }

    // 7. Parking lots
    for (let i = 0; i < World.parkingLots.length; i++) {
      const pl = World.parkingLots[i];
      if (pl.x + pl.w < ox || pl.x > ox + tw || pl.y + pl.h < oy || pl.y > oy + th) continue;
      c.fillStyle = aPat || '#29302c';
      c.fillRect(pl.x, pl.y, pl.w, pl.h);
      c.strokeStyle = 'rgba(255, 255, 255, 0.46)';
      c.lineWidth = 1.5;
      c.strokeRect(pl.x + 2, pl.y + 2, pl.w - 4, pl.h - 4);

      for (let sx = pl.x + 22; sx < pl.x + pl.w - 16; sx += 26) {
        c.beginPath();
        c.moveTo(sx, pl.y + 4);
        c.lineTo(sx, pl.y + 28);
        c.moveTo(sx, pl.y + pl.h - 4);
        c.lineTo(sx, pl.y + pl.h - 28);
        c.stroke();
      }
      c.fillStyle = 'rgba(108, 178, 209, 0.78)';
      c.font = 'bold 11px monospace';
      c.textAlign = 'center';
      c.fillText('P · ESTACIONAMIENTO', pl.x + pl.w * 0.5, pl.y + pl.h * 0.5 + 4);
    }

    // 8. Parks, plazas & periphery meadows (v0.7.9: césped texturizado, caminos, mobiliario y árboles)
    for (let i = 0; i < World.parks.length; i++) {
      const p = World.parks[i];
      if (p.x + p.w + 30 < ox || p.x - 30 > ox + tw || p.y + p.h + 30 < oy || p.y - 30 > oy + th) continue;
      CityArt.drawPark(c, p, i);
    }

    // 9. Garages
    for (let i = 0; i < World.garages.length; i++) {
      const g = World.garages[i];
      const gx = g.x - g.w * 0.5;
      const gy = g.y - g.h * 0.5;
      if (gx + g.w < ox || gx > ox + tw || gy + g.h < oy || gy > oy + th) continue;

      c.fillStyle = '#484f48';
      c.fillRect(gx + 12, gy - 26, g.w - 24, 28);

      c.fillStyle = '#252e27';
      c.fillRect(gx, gy, g.w, g.h);

      c.strokeStyle = '#f5d94b';
      c.lineWidth = 2.5;
      c.strokeRect(gx + 2, gy + 2, g.w - 4, g.h - 4);

      c.fillStyle = 'rgba(245, 217, 75, 0.22)';
      c.fillRect(gx + 16, gy + 14, g.w - 32, g.h - 28);

      c.fillStyle = '#f5d94b';
      c.font = 'bold 10px monospace';
      c.textAlign = 'center';
      c.fillText('GARAJE', g.x, g.y + 4);
    }

    // 10. Hideouts
    for (let i = 0; i < World.hideouts.length; i++) {
      const h = World.hideouts[i];
      const hx = h.x - h.w * 0.5;
      const hy = h.y - h.h * 0.5;
      if (hx + h.w < ox || hx > ox + tw || hy + h.h < oy || hy > oy + th) continue;

      c.fillStyle = '#1f2d2a';
      c.fillRect(hx, hy, h.w, h.h);

      c.strokeStyle = 'rgba(77, 224, 181, 0.55)';
      c.lineWidth = 1.5;
      c.setLineDash([5, 4]);
      c.strokeRect(hx + 3, hy + 3, h.w - 6, h.h - 6);
      c.setLineDash([]);

      c.fillStyle = 'rgba(77, 224, 181, 0.75)';
      c.font = 'bold 9px monospace';
      c.textAlign = 'center';
      c.fillText('ESCONDITE', h.x, h.y + 3);
    }

    // 11. District-styled Buildings (v0.7.9: fachadas, ventanas, puertas, balcones, techos y sombras)
    for (let i = 0; i < World.buildings.length; i++) {
      const b = World.buildings[i];
      if (b.x + b.w + 14 < ox || b.x > ox + tw || b.y + b.h + 14 < oy || b.y > oy + th) continue;
      CityArt.drawBuilding(c, b, i);
    }

    // 12. Sidewalk urban furniture, trees & pocket parks
    for (let i = 0; i < World.props.length; i++) {
      const pr = World.props[i];
      if (pr.x < ox - 40 || pr.x > ox + tw + 40 || pr.y < oy - 40 || pr.y > oy + th + 40) continue;
      CityArt.drawProp(c, pr, i);
    }

    c.restore();
  }

  function buildStaticMapCache() {
    const tileW = Math.min(2400, wCfg.width);
    const tileH = Math.min(1800, wCfg.height);
    const tiles = [];
    for (let oy = 0; oy < wCfg.height; oy += tileH) {
      for (let ox = 0; ox < wCfg.width; ox += tileW) {
        tiles.push({
          ox,
          oy,
          w: Math.min(tileW, wCfg.width - ox),
          h: Math.min(tileH, wCfg.height - oy)
        });
      }
    }
    mapTiles = tiles.map((q) => {
      const off = document.createElement('canvas');
      off.width = q.w;
      off.height = q.h;
      const c = off.getContext('2d');
      renderWorldToContext(c, q.ox, q.oy, q.w, q.h);
      return { canvas: off, ox: q.ox, oy: q.oy, w: q.w, h: q.h };
    });
  }

  function addSkidParticle(x, y, angle) {
    const maxP = highQuality ? 95 : 40;
    if (particles.length > maxP) particles.shift();
    particles.push({
      type: 'skid',
      x,
      y,
      angle,
      alpha: 0.34,
      life: 0.75
    });
  }

  function addSparkParticles(x, y, count = 6) {
    const actualCount = highQuality ? count : Math.max(2, Math.floor(count * 0.5));
    const maxP = highQuality ? 110 : 45;
    for (let i = 0; i < actualCount; i++) {
      if (particles.length > maxP) particles.shift();
      const a = Math.random() * Math.PI * 2;
      const spd = 40 + Math.random() * 110;
      particles.push({
        type: 'spark',
        x,
        y,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        alpha: 1,
        life: 0.25 + Math.random() * 0.2
      });
    }
  }

  function addSmokeParticle(x, y) {
    const maxP = highQuality ? 110 : 45;
    if (particles.length > maxP) particles.shift();
    particles.push({
      type: 'smoke',
      x: x + (Math.random() - 0.5) * 10,
      y: y + (Math.random() - 0.5) * 10,
      vx: (Math.random() - 0.5) * 14,
      vy: -16 - Math.random() * 14,
      radius: 4 + Math.random() * 4,
      alpha: 0.45,
      life: 0.55
    });
  }

  function addFootstepDust(x, y) {
    if (!highQuality) return;
    if (particles.length > 110) particles.shift();
    particles.push({
      type: 'dust',
      x: x + (Math.random() - 0.5) * 5,
      y: y + (Math.random() - 0.5) * 5,
      vx: (Math.random() - 0.5) * 10,
      vy: (Math.random() - 0.5) * 10,
      radius: 2.2 + Math.random() * 1.5,
      alpha: 0.28,
      life: 0.30
    });
  }

  function updateEffects(dt, vehicles) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        particles.splice(i, 1);
        continue;
      }
      if (p.type === 'spark') {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.alpha = p.life * 2.5;
      } else if (p.type === 'smoke') {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.radius += dt * 9;
        p.alpha = p.life * 0.75;
      } else if (p.type === 'dust') {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.radius += dt * 5.5;
        p.alpha = p.life * 0.85;
      } else {
        p.alpha = p.life * 0.45;
      }
    }

    if (vehicles && Math.random() < (highQuality ? 0.28 : 0.14)) {
      for (let i = 0; i < vehicles.length; i++) {
        const v = vehicles[i];
        if (v.hp < v.maxHp * 0.45) {
          const hoodX = v.x + Math.cos(v.angle) * (v.length * 0.3);
          const hoodY = v.y + Math.sin(v.angle) * (v.length * 0.3);
          addSmokeParticle(hoodX, hoodY);
        }
      }
    }
  }

  function drawSignalHead(ctx, headX, headY, angle, activeAspect, pedWalk, highQ) {
    ctx.save();
    ctx.translate(headX, headY);
    ctx.rotate(angle);

    // 3-aspect housing box (Red / Yellow / Green)
    ctx.fillStyle = '#121619';
    ctx.strokeStyle = '#3b444b';
    ctx.lineWidth = 1;
    ctx.fillRect(-9.5, -3.6, 19, 7.2);
    ctx.strokeRect(-9.5, -3.6, 19, 7.2);

    const aspects = [
      { id: 'red', ox: -5.5, on: '#ff3b30', off: '#4a1816', glow: 'rgba(255, 59, 48, 0.32)' },
      { id: 'yellow', ox: 0, on: '#facc15', off: '#4a3d12', glow: 'rgba(250, 204, 21, 0.28)' },
      { id: 'green', ox: 5.5, on: '#4ade80', off: '#164226', glow: 'rgba(74, 222, 128, 0.28)' }
    ];

    for (let i = 0; i < aspects.length; i++) {
      const a = aspects[i];
      const isLit = activeAspect === a.id;
      if (isLit && highQ) {
        ctx.fillStyle = a.glow;
        ctx.beginPath();
        ctx.arc(a.ox, 0, 8.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = isLit ? a.on : a.off;
      ctx.beginPath();
      ctx.arc(a.ox, 0, 2.1, 0, Math.PI * 2);
      ctx.fill();
    }

    // Miniature pedestrian crossing indicator attached to post side
    ctx.fillStyle = pedWalk ? '#e0f7ff' : '#ff594d';
    ctx.fillRect(-11.8, -1.6, 1.8, 3.2);

    ctx.restore();
  }

  function drawTrafficLightsAndUrbanGlow(ctx, cam, viewW, viewH, simTime) {
    const pad = 140;
    const rw = wCfg.roadWidth;

    for (let i = 0; i < World.trafficLights.length; i++) {
      const tl = World.trafficLights[i];
      if (
        tl.x < cam.x - pad || tl.x > cam.x + viewW + pad ||
        tl.y < cam.y - pad || tl.y > cam.y + viewH + pad
      ) {
        continue;
      }

      const st = World.getTrafficLightState(tl, simTime);

      // Subtle stop-line ground signal glow on asphalt when red/yellow
      if (st.h !== 'green') {
        ctx.fillStyle = st.h === 'red' ? 'rgba(255, 59, 48, 0.34)' : 'rgba(250, 204, 21, 0.30)';
        ctx.fillRect(tl.ix - 6, tl.iy + rw * 0.5 + 3, 4, rw * 0.5 - 12);
        ctx.fillRect(tl.ix + rw + 2, tl.iy + 9, 4, rw * 0.5 - 12);
      }
      if (st.v !== 'green') {
        ctx.fillStyle = st.v === 'red' ? 'rgba(255, 59, 48, 0.34)' : 'rgba(250, 204, 21, 0.30)';
        ctx.fillRect(tl.ix + rw * 0.5 + 3, tl.iy - 6, rw * 0.5 - 12, 4);
        ctx.fillRect(tl.ix + 9, tl.iy + rw + 2, rw * 0.5 - 12, 4);
      }

      // 4 corner cantilever mast assemblies
      const corners = [
        // Top-Left corner controls Northbound-approaching vertical lane (v)
        { px: tl.ix - 3, py: tl.iy - 3, mx: tl.ix + 34, my: tl.iy - 2, angle: 0, aspect: st.v, ped: st.pedH === 'walk' },
        // Bottom-Right corner controls Southbound-approaching vertical lane (v)
        { px: tl.ix + rw + 3, py: tl.iy + rw + 3, mx: tl.ix + rw - 34, my: tl.iy + rw + 2, angle: Math.PI, aspect: st.v, ped: st.pedH === 'walk' },
        // Top-Right corner controls Westbound-approaching horizontal lane (h)
        { px: tl.ix + rw + 3, py: tl.iy - 3, mx: tl.ix + rw + 2, my: tl.iy + 34, angle: Math.PI / 2, aspect: st.h, ped: st.pedV === 'walk' },
        // Bottom-Left corner controls Eastbound-approaching horizontal lane (h)
        { px: tl.ix - 3, py: tl.iy + rw + 3, mx: tl.ix - 2, my: tl.iy + rw - 34, angle: -Math.PI / 2, aspect: st.h, ped: st.pedV === 'walk' }
      ];

      for (let c = 0; c < corners.length; c++) {
        const pt = corners[c];

        // Cantilever arm
        ctx.strokeStyle = '#68737a';
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(pt.px, pt.py);
        ctx.lineTo(pt.mx, pt.my);
        ctx.stroke();

        // Corner pole base
        ctx.fillStyle = '#262d31';
        ctx.beginPath();
        ctx.arc(pt.px, pt.py, 3.6, 0, Math.PI * 2);
        ctx.fill();

        // 3-aspect signal housing over lane
        drawSignalHead(ctx, pt.mx, pt.my, pt.angle, pt.aspect, pt.ped, highQuality);
      }
    }

    if (highQuality) {
      for (let i = 0; i < World.streetLights.length; i++) {
        const sl = World.streetLights[i];
        if (
          sl.x < cam.x - pad || sl.x > cam.x + viewW + pad ||
          sl.y < cam.y - pad || sl.y > cam.y + viewH + pad
        ) {
          continue;
        }
        ctx.fillStyle = 'rgba(255, 224, 145, 0.08)';
        ctx.beginPath();
        ctx.arc(sl.x, sl.y, 38, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#fff3c4';
        ctx.beginPath();
        ctx.arc(sl.x, sl.y, 2.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function drawVehicle(ctx, v, now, isPlayerDriver = false) {
    ctx.save();
    ctx.translate(v.x, v.y);
    ctx.rotate(v.angle);

    const hl = v.length * 0.5;
    const hw = v.width * 0.5;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.36)';
    ctx.fillRect(-hl + 3, -hw + 4, v.length, v.width);

    // Animated driver-side door swing on enter/exit
    if (v.doorAnim && v.doorAnim.timer > 0) {
      const progress = 1 - v.doorAnim.timer / (v.doorAnim.duration || 0.35);
      const swingAngle = -Math.sin(Math.max(0, Math.min(1, progress)) * Math.PI) * 0.78;
      ctx.save();
      ctx.translate(hl * 0.16, -hw);
      ctx.rotate(swingAngle);
      ctx.fillStyle = v.isPolice ? '#f2f6fa' : v.color;
      ctx.strokeStyle = '#141915';
      ctx.lineWidth = 1.2;
      ctx.fillRect(-v.length * 0.32, -2.2, v.length * 0.32, 2.4);
      ctx.strokeRect(-v.length * 0.32, -2.2, v.length * 0.32, 2.4);
      ctx.restore();
    }

    if (v.isPolice) {
      ctx.fillStyle = v.color || '#141c24';
      ctx.fillRect(-hl, -hw, v.length, v.width);

      ctx.fillStyle = '#f2f6fa';
      ctx.fillRect(-hl * 0.45, -hw + 1, v.length * 0.52, v.width - 2);

      ctx.fillStyle = v.policeRole === 'interceptor' ? '#3898ff' : '#d6f36a';
      ctx.fillRect(hl * 0.48, -hw + 3, hl * 0.42, 2.5);
      ctx.fillRect(hl * 0.48, hw - 5.5, hl * 0.42, 2.5);

      ctx.fillStyle = '#18242e';
      ctx.fillRect(hl * 0.14, -hw + 3, hl * 0.32, v.width - 6);
      ctx.fillRect(-hl * 0.68, -hw + 3, hl * 0.24, v.width - 6);

      const phase = Math.sin(v.sirenPhase || 0);
      const redOn = v.sirenActive && phase >= 0;
      const blueOn = v.sirenActive && phase < 0;

      ctx.fillStyle = '#222831';
      ctx.fillRect(-3, -hw + 3, 6, v.width - 6);

      ctx.fillStyle = redOn ? '#ff3b30' : '#6e211d';
      ctx.fillRect(-2.5, -hw + 3.5, 5, (v.width - 7) * 0.5);

      ctx.fillStyle = blueOn ? '#3898ff' : '#1b3f6b';
      ctx.fillRect(-2.5, 0, 5, (v.width - 7) * 0.5);

      if (v.sirenActive) {
        if (redOn) {
          ctx.fillStyle = 'rgba(255, 59, 48, 0.26)';
          ctx.beginPath();
          ctx.arc(0, -hw * 0.6, 26, 0, Math.PI * 2);
          ctx.fill();
        }
        if (blueOn) {
          ctx.fillStyle = 'rgba(56, 152, 255, 0.26)';
          ctx.beginPath();
          ctx.arc(0, hw * 0.6, 26, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    } else {
      ctx.fillStyle = v.color;
      ctx.fillRect(-hl, -hw, v.length, v.width);

      if (v.typeId === 'coupe') {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
        ctx.fillRect(-hl + 3, -2, v.length - 6, 4);
      } else if (v.typeId === 'muscle') {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.34)';
        ctx.fillRect(-hl + 2, -4, v.length - 4, 2.5);
        ctx.fillRect(-hl + 2, 1.5, v.length - 4, 2.5);
      }

      ctx.fillStyle = '#182226';
      if (v.typeId === 'truck') {
        ctx.fillRect(hl * 0.38, -hw + 3, hl * 0.42, v.width - 6);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.16)';
        ctx.fillRect(-hl + 3, -hw + 2.5, v.length * 0.64, v.width - 5);
      } else {
        ctx.fillRect(hl * 0.14, -hw + 3, hl * 0.34, v.width - 6);
        ctx.fillRect(-hl * 0.66, -hw + 3, hl * 0.26, v.width - 6);

        ctx.fillStyle = 'rgba(255, 255, 255, 0.14)';
        if (v.typeId === 'van') {
          ctx.fillRect(-hl + 4, -hw + 3, v.length * 0.68, v.width - 6);
        } else if (v.typeId === 'compact') {
          ctx.fillRect(-hl * 0.55, -hw + 3.5, v.length * 0.48, v.width - 7);
        } else {
          ctx.fillRect(-hl * 0.38, -hw + 3.5, v.length * 0.36, v.width - 7);
        }
      }

      if (v.typeId === 'taxi') {
        ctx.fillStyle = '#141715';
        ctx.fillRect(-4, -5, 8, 10);
        ctx.fillStyle = '#fff59d';
        ctx.fillRect(-3, -4, 6, 8);
      }
    }

    if (Characters && Characters.drawVehicleOccupant) {
      Characters.drawVehicleOccupant(ctx, v, isPlayerDriver);
    }

    ctx.strokeStyle = v.isChaseTarget
      ? '#ff3b30'
      : v.isMissionTarget
        ? '#d6f36a'
        : '#141915';
    ctx.lineWidth = (v.isMissionTarget || v.isChaseTarget) ? 2.2 : 1.3;
    ctx.strokeRect(-hl, -hw, v.length, v.width);

    ctx.fillStyle = '#fff7bf';
    ctx.fillRect(hl - 2.5, -hw + 2.5, 2.5, 4);
    ctx.fillRect(hl - 2.5, hw - 6.5, 2.5, 4);

    ctx.fillStyle = v.brakeLights ? '#ff3b30' : '#8e241d';
    ctx.fillRect(-hl, -hw + 2.5, 2.5, 4);
    ctx.fillRect(-hl, hw - 6.5, 2.5, 4);

    if (v.reversing) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-hl, -hw + 7, 2, 2.5);
      ctx.fillRect(-hl, hw - 9.5, 2, 2.5);
    }

    ctx.restore();

    if (v.isChaseTarget) {
      const pulse = 26 + Math.sin((now || performance.now()) / 140) * 5;
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 59, 48, 0.85)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(v.x, v.y, pulse, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#ff594d';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`OBJETIVO (${Math.max(0, Math.round(v.hp))} HP)`, v.x, v.y - pulse - 5);
      ctx.restore();
    }
  }

  function drawPedestrian(ctx, p, now) {
    if (Characters && Characters.drawPedestrianCharacter) {
      Characters.drawPedestrianCharacter(ctx, p, now, highQuality);
    }
  }

  function drawStoreMarkers(ctx, stores, now) {
    if (!Array.isArray(stores)) return;
    for (const store of stores) {
      const weapon = store.type === 'weapons';
      const color = weapon ? '#f5d94b' : '#4de0b5';
      const pulse = 1 + Math.sin((now || 0) / 260 + store.x * 0.01) * 0.12;
      ctx.save();
      ctx.translate(store.x, store.y);
      ctx.fillStyle = 'rgba(8, 13, 10, 0.78)';
      ctx.beginPath(); ctx.arc(0, 0, 17 * pulse, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = color; ctx.lineWidth = 2.5; ctx.stroke();
      ctx.fillStyle = color; ctx.font = 'bold 17px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(weapon ? '✚' : '▣', 0, 0.5);
      ctx.fillStyle = '#f4f7ee'; ctx.font = 'bold 10px sans-serif';
      ctx.fillText(weapon ? 'ARMERÍA' : 'COMERCIO', 0, -23);
      ctx.restore();
    }
  }

  function drawNavigationPolyline(ctx, points, xOffset, yOffset, sx, sy, color, width) {
    if (!Array.isArray(points) || points.length < 2) return;
    ctx.save();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = color; ctx.lineWidth = width + 2.2;
    ctx.globalAlpha = 0.24;
    ctx.beginPath();
    ctx.moveTo(xOffset + points[0].x * sx, yOffset + points[0].y * sy);
    for (let i = 1; i < points.length; i++) ctx.lineTo(xOffset + points[i].x * sx, yOffset + points[i].y * sy);
    ctx.stroke();
    ctx.globalAlpha = 0.92; ctx.strokeStyle = color; ctx.lineWidth = width;
    ctx.setLineDash([4, 2]);
    ctx.beginPath();
    ctx.moveTo(xOffset + points[0].x * sx, yOffset + points[0].y * sy);
    for (let i = 1; i < points.length; i++) ctx.lineTo(xOffset + points[i].x * sx, yOffset + points[i].y * sy);
    ctx.stroke(); ctx.restore();
  }

  function drawStoryNPCs(ctx, npcs, player, activeMission, now) {
    if (!Array.isArray(npcs)) return;
    for (let i = 0; i < npcs.length; i++) {
      const npc = npcs[i];
      const isMissionTargetNpc =
        activeMission &&
        (activeMission.npcId === npc.id ||
          (activeMission.stage === 'pickup' && activeMission.pickupNpcId === npc.id));
      const isNearby =
        player &&
        !player.inCar &&
        Math.hypot(npc.x - player.x, npc.y - player.y) < Config.PLAYER.talkRadius;

      if (Characters && Characters.drawStoryNPCCharacter) {
        Characters.drawStoryNPCCharacter(ctx, npc, isMissionTargetNpc, isNearby, now, highQuality);
      }
    }
  }

  function drawPlayer(ctx, player, missionInfo) {
    if (missionInfo && (missionInfo.hasPassenger || missionInfo.hasPackage)) {
      ctx.save();
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      const label = missionInfo.hasPassenger
        ? `A BORDO: ${missionInfo.passengerName || 'PASAJERO'}`
        : 'PAQUETE EN POSESIÓN';
      ctx.fillStyle = 'rgba(14, 20, 16, 0.88)';
      ctx.fillRect(player.x - 62, player.y - 36, 124, 13);
      ctx.fillStyle = '#4de0b5';
      ctx.fillText(label, player.x, player.y - 26);
      ctx.restore();
    }

    if (Characters && Characters.drawPlayerCharacter) {
      Characters.drawPlayerCharacter(ctx, player, highQuality);
    }
  }

  function drawRoadblocks(ctx, roadblocks, now) {
    if (!roadblocks || !roadblocks.length) return;
    const blink = Math.floor(now / 180) % 2 === 0;
    for (let i = 0; i < roadblocks.length; i++) {
      const rb = roadblocks[i];
      ctx.save();
      ctx.translate(rb.x, rb.y);
      if (!rb.horizontal) ctx.rotate(Math.PI / 2);

      ctx.fillStyle = '#e5e7eb';
      ctx.fillRect(-52, -3, 104, 6);
      ctx.fillStyle = '#dc2626';
      for (let x = -48; x < 48; x += 20) {
        ctx.fillRect(x, -3, 10, 6);
      }

      ctx.fillStyle = blink ? '#ff3b30' : '#3898ff';
      ctx.beginPath();
      ctx.arc(-52, 0, 4.5, 0, Math.PI * 2);
      ctx.arc(52, 0, 4.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  function drawMarkerAndArrow(ctx, player, target, color, fillRgba, camera, viewW, viewH, now, labelText) {
    if (!target) return;
    const pulse = 18 + Math.sin(now / 170) * 6;

    ctx.save();
    ctx.translate(-camera.x, -camera.y);
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(target.x, target.y, pulse, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = fillRgba;
    ctx.beginPath();
    ctx.arc(target.x, target.y, 13, 0, Math.PI * 2);
    ctx.fill();

    if (labelText) {
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(12, 18, 15, 0.85)';
      ctx.fillRect(target.x - 36, target.y - pulse - 16, 72, 12);
      ctx.fillStyle = color;
      ctx.fillText(labelText, target.x, target.y - pulse - 7);
    }
    ctx.restore();

    const dx = target.x - player.x;
    const dy = target.y - player.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 140) return;

    const screenX = target.x - camera.x;
    const screenY = target.y - camera.y;
    if (screenX >= 30 && screenX <= viewW - 30 && screenY >= 30 && screenY <= viewH - 30) {
      return;
    }

    const angle = Math.atan2(dy, dx);
    const cx = viewW * 0.5;
    const cy = viewH * 0.5;
    const radiusX = viewW * 0.5 - 46;
    const radiusY = viewH * 0.5 - 46;
    const ax = cx + Math.cos(angle) * radiusX;
    const ay = cy + Math.sin(angle) * radiusY;

    ctx.save();
    ctx.translate(ax, ay);
    ctx.rotate(angle);
    ctx.fillStyle = color;
    ctx.strokeStyle = '#151b16';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(12, 0);
    ctx.lineTo(-8, -8);
    ctx.lineTo(-4, 0);
    ctx.lineTo(-8, 8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  function drawMinimap(ctx, viewW, state, policeHUD) {
    if (!showMinimap) return;
    const mapW = viewW < 640 ? 190 : 248;
    const mapH = Math.round(mapW * (wCfg.height / wCfg.width));
    const mx = viewW - mapW - 12;
    const my = 12;
    const simTime = state.simTime || performance.now() / 1000;

    ctx.save();
    ctx.fillStyle = 'rgba(13, 18, 14, 0.92)';
    ctx.fillRect(mx - 3, my - 3, mapW + 6, mapH + 6);
    ctx.strokeStyle = '#738268';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(mx - 3, my - 3, mapW + 6, mapH + 6);

    const sx = mapW / wCfg.width;
    const sy = mapH / wCfg.height;

    // v0.7.9: capa base (barrios, calles, manzanas, edificios, parques y agua) en caché
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(CityArt.getMinimapBase(mapW, mapH), mx, my, mapW, mapH);
    ctx.fillStyle = 'rgba(8, 13, 10, 0.78)'; ctx.fillRect(mx + 3, my + 3, Math.min(88, mapW - 6), 11);
    ctx.fillStyle = '#dce9d6'; ctx.font = 'bold 7px monospace'; ctx.textAlign = 'left'; ctx.fillText('CIUDAD CERO · GPS', mx + 7, my + 11);

    // Live Traffic Light indicators at major intersections
    if (showTrafficLightsOnMap) {
      for (let i = 0; i < World.trafficLights.length; i++) {
        const tl = World.trafficLights[i];
        if (!tl.isMajor) continue;
        const st = World.getTrafficLightState(tl, simTime);
        ctx.fillStyle = st.h === 'green' ? '#4ade80' : st.h === 'yellow' ? '#facc15' : '#ff3b30';
        ctx.fillRect(mx + tl.x * sx - 1, my + tl.y * sy - 1, 2, 2);
      }
    }

    // GPS follows the road grid: no diagonal shortcut across city blocks.
    drawNavigationPolyline(
      ctx, state.navigationRoute, mx, my, sx, sy,
      state.customWaypoint ? '#38bdf8' : '#f5d94b', 2.2
    );

    // Store points are visible even when the player is far away.
    for (const store of World.stores || []) {
      const weapon = store.type === 'weapons';
      ctx.fillStyle = weapon ? '#f5d94b' : '#4de0b5';
      ctx.strokeStyle = '#101611'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(mx + store.x * sx, my + store.y * sy, 3.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }

    // Garages
    ctx.fillStyle = '#f5d94b';
    for (let i = 0; i < World.garages.length; i++) {
      const g = World.garages[i];
      ctx.fillRect(mx + g.x * sx - 2.5, my + g.y * sy - 2.5, 5, 5);
    }

    // Hideouts
    ctx.fillStyle = '#4de0b5';
    for (let i = 0; i < World.hideouts.length; i++) {
      const h = World.hideouts[i];
      ctx.fillRect(mx + h.x * sx - 2, my + h.y * sy - 2, 4, 4);
    }

    // NPCs
    if (Array.isArray(state.npcs)) {
      ctx.fillStyle = '#6cb2d1';
      for (let i = 0; i < state.npcs.length; i++) {
        const npc = state.npcs[i];
        ctx.beginPath();
        ctx.arc(mx + npc.x * sx, my + npc.y * sy, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    if (policeHUD && policeHUD.wanted > 0 && policeHUD.hasLastKnown) {
      ctx.strokeStyle = 'rgba(255, 59, 48, 0.75)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(
        mx + policeHUD.lastKnownX * sx,
        my + policeHUD.lastKnownY * sy,
        policeHUD.searchRadius * sx,
        0,
        Math.PI * 2
      );
      ctx.stroke();
    }

    const blink = Math.floor(performance.now() / 160) % 2 === 0;
    for (let i = 0; i < state.vehicles.length; i++) {
      const v = state.vehicles[i];
      if (v.isChaseTarget) {
        ctx.fillStyle = blink ? '#ff3b30' : '#f5d94b';
        ctx.beginPath();
        ctx.arc(mx + v.x * sx, my + v.y * sy, 3.2, 0, Math.PI * 2);
        ctx.fill();
      } else if (v.isPolice) {
        ctx.fillStyle = blink ? '#ff3b30' : '#3898ff';
        ctx.beginPath();
        ctx.arc(mx + v.x * sx, my + v.y * sy, 2.4, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = v === state.player.vehicle ? '#ffffff' : 'rgba(210, 220, 210, 0.45)';
        ctx.fillRect(mx + v.x * sx - 1, my + v.y * sy - 1, 2, 2);
      }
    }

    // Custom GPS Waypoint
    if (state.customWaypoint) {
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(mx + state.customWaypoint.x * sx, my + state.customWaypoint.y * sy, 3.4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Active Mission
    if (state.mission) {
      ctx.fillStyle = state.mission.isSide ? '#4de0b5' : '#f5d94b';
      ctx.beginPath();
      ctx.arc(mx + state.mission.x * sx, my + state.mission.y * sy, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Player Position + Heading
    const px = mx + state.player.x * sx;
    const py = my + state.player.y * sy;
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(state.player.angle);
    ctx.fillStyle = '#d6f36a';
    ctx.beginPath();
    ctx.moveTo(4.5, 0);
    ctx.lineTo(-3, -2.8);
    ctx.lineTo(-2, 0);
    ctx.lineTo(-3, 2.8);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Compact badge at bottom-right of minimap indicating tap-to-expand
    ctx.fillStyle = 'rgba(12, 18, 14, 0.86)';
    ctx.fillRect(mx + mapW - 44, my + mapH - 13, 44, 13);
    ctx.fillStyle = '#d6f36a';
    ctx.font = 'bold 8px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('MAPA [M]', mx + mapW - 22, my + mapH - 3.5);

    ctx.restore();
  }

  function renderFullMap(canvasEl, viewState, gameData) {
    if (!canvasEl) return;
    if (!mapTiles) buildStaticMapCache();

    const cw = canvasEl.width;
    const ch = canvasEl.height;
    const ctx = canvasEl.getContext('2d');
    const simTime = gameData.simTime || performance.now() / 1000;
    ctx.clearRect(0, 0, cw, ch);

    ctx.fillStyle = '#0e1410';
    ctx.fillRect(0, 0, cw, ch);

    const zoom = viewState.zoom || 1;
    const panX = viewState.panX || 0;
    const panY = viewState.panY || 0;

    const baseScale = Math.min(cw / wCfg.width, ch / wCfg.height);
    const scale = baseScale * zoom;
    const drawW = wCfg.width * scale;
    const drawH = wCfg.height * scale;
    const offsetX = (cw - drawW) * 0.5 + panX;
    const offsetY = (ch - drawH) * 0.5 + panY;

    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);

    // Draw cached city tiles
    for (let i = 0; i < mapTiles.length; i++) {
      const tile = mapTiles[i];
      ctx.drawImage(tile.canvas, tile.ox, tile.oy);
    }

    // District borders & names
    const districts = Config.DISTRICTS || [];
    // v0.7.9: leve velo de color por barrio para distinguirlos mejor
    for (let i = 0; i < districts.length; i++) {
      const d = districts[i];
      ctx.save();
      ctx.globalAlpha = 0.09;
      ctx.fillStyle = d.color || '#fff';
      ctx.fillRect(d.bounds.x1, d.bounds.y1, d.bounds.x2 - d.bounds.x1, d.bounds.y2 - d.bounds.y1);
      if (d.extraBounds) {
        const eb = d.extraBounds;
        ctx.fillRect(eb.x1, eb.y1, eb.x2 - eb.x1, eb.y2 - eb.y1);
      }
      ctx.restore();
    }
    for (let i = 0; i < districts.length; i++) {
      const d = districts[i];
      ctx.strokeStyle = d.color || '#d6f36a';
      ctx.lineWidth = 8 / scale;
      ctx.setLineDash([28 / scale, 18 / scale]);
      ctx.strokeRect(
        d.bounds.x1 + 10,
        d.bounds.y1 + 10,
        d.bounds.x2 - d.bounds.x1 - 20,
        d.bounds.y2 - d.bounds.y1 - 20
      );
      ctx.setLineDash([]);

      const fontSize = Math.max(11, Math.round(14 / scale));
      ctx.font = `bold ${fontSize}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(10, 15, 12, 0.80)';
      const labelW = ctx.measureText(d.shortName).width + 24 / scale;
      const labelH = fontSize * 1.45;
      ctx.fillRect(d.center.x - labelW * 0.5, d.center.y - labelH * 0.5, labelW, labelH);
      ctx.fillStyle = d.color || '#fff';
      ctx.fillText(d.shortName, d.center.x, d.center.y + fontSize * 0.35);
      if (Array.isArray(d.neighborhoods)) {
        for (const n of d.neighborhoods) {
          ctx.font = `bold ${Math.max(10, Math.round(11 / scale))}px sans-serif`;
          ctx.fillStyle = 'rgba(8, 15, 17, 0.78)';
          const nw = ctx.measureText(n.name).width + 18 / scale;
          ctx.fillRect(n.center.x - nw * 0.5, n.center.y - 11 / scale, nw, 22 / scale);
          ctx.fillStyle = '#d7f7fa';
          ctx.textAlign = 'center';
          ctx.fillText(n.name.toUpperCase(), n.center.x, n.center.y + 4 / scale);
        }
      }
    }

    // Major Avenue & Highway Labels along roads
    const aveLabels = Config.AVENUE_LABELS || [];
    const aveFont = Math.max(9, Math.round(10 / scale));
    ctx.font = `bold ${aveFont}px monospace`;
    ctx.textAlign = 'center';
    for (let i = 0; i < aveLabels.length; i++) {
      const al = aveLabels[i];
      ctx.save();
      ctx.translate(al.x, al.y);
      if (al.axis === 'v') ctx.rotate(-Math.PI / 2);
      const tw = ctx.measureText(al.text).width + 14 / scale;
      const th = aveFont * 1.35;
      ctx.fillStyle = 'rgba(15, 22, 18, 0.78)';
      ctx.fillRect(-tw * 0.5, -th * 0.5, tw, th);
      ctx.fillStyle = '#e2ece0';
      ctx.fillText(al.text, 0, aveFont * 0.34);
      ctx.restore();
    }

    // Live Traffic Light Indicators on Full Map
    if (showTrafficLightsOnMap) {
      const tlRad = 10 / scale;
      for (let i = 0; i < World.trafficLights.length; i++) {
        const tl = World.trafficLights[i];
        const st = World.getTrafficLightState(tl, simTime);
        ctx.fillStyle = st.h === 'green' ? '#4ade80' : st.h === 'yellow' ? '#facc15' : '#ff3b30';
        ctx.beginPath();
        ctx.arc(tl.x, tl.y, tlRad, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#101411';
        ctx.lineWidth = 2 / scale;
        ctx.stroke();
      }
    }

    const rIcon = 24 / scale;
    const labelFont = Math.max(10, Math.round(11 / scale));
    ctx.font = `bold ${labelFont}px monospace`;
    ctx.textAlign = 'center';

    // Landmarks
    const landmarks = Config.LANDMARKS || [];
    for (let i = 0; i < landmarks.length; i++) {
      const lm = landmarks[i];
      ctx.fillStyle = '#1b262c';
      ctx.beginPath();
      ctx.arc(lm.x, lm.y, rIcon * 0.85, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#6cb2d1';
      ctx.lineWidth = 3 / scale;
      ctx.stroke();

      ctx.fillStyle = '#d7f0fc';
      ctx.fillText(lm.name, lm.x, lm.y - rIcon - 4 / scale);
    }

    // Garages
    for (let i = 0; i < World.garages.length; i++) {
      const g = World.garages[i];
      ctx.fillStyle = '#f5d94b';
      ctx.beginPath();
      ctx.arc(g.x, g.y, rIcon * 0.9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#141715';
      ctx.fillText('G', g.x, g.y + labelFont * 0.35);
    }

    // Hideouts
    for (let i = 0; i < World.hideouts.length; i++) {
      const h = World.hideouts[i];
      ctx.fillStyle = '#4de0b5';
      ctx.beginPath();
      ctx.arc(h.x, h.y, rIcon * 0.72, 0, Math.PI * 2);
      ctx.fill();
    }

    // Weapon store and robbery-store locations.
    for (const store of World.stores || []) {
      const weapon = store.type === 'weapons';
      ctx.fillStyle = weapon ? '#f5d94b' : '#4de0b5';
      ctx.strokeStyle = '#101411'; ctx.lineWidth = 3 / scale;
      ctx.beginPath(); ctx.arc(store.x, store.y, rIcon * 0.92, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#101411'; ctx.font = `bold ${Math.max(9, Math.round(11 / scale))}px sans-serif`;
      ctx.textAlign = 'center'; ctx.fillText(weapon ? 'A' : '$', store.x, store.y + Math.max(3, 4 / scale));
      ctx.fillStyle = '#f4f7ee'; ctx.fillText(store.name, store.x, store.y - rIcon - 5 / scale);
    }

    // Story NPCs
    if (Array.isArray(gameData.npcs)) {
      for (let i = 0; i < gameData.npcs.length; i++) {
        const npc = gameData.npcs[i];
        ctx.fillStyle = npc.color || '#6cb2d1';
        ctx.beginPath();
        ctx.arc(npc.x, npc.y, rIcon * 0.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.fillText(npc.name.split(' ')[0], npc.x, npc.y + rIcon + labelFont);
      }
    }

    // Street-following GPS route, shared with the minimap.
    const navRoute = gameData.navigationRoute || [];
    if (navRoute.length > 1) {
      ctx.save();
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.strokeStyle = 'rgba(8, 14, 10, 0.82)'; ctx.lineWidth = 15 / scale;
      ctx.beginPath(); ctx.moveTo(navRoute[0].x, navRoute[0].y);
      for (let i = 1; i < navRoute.length; i++) ctx.lineTo(navRoute[i].x, navRoute[i].y);
      ctx.stroke();
      ctx.strokeStyle = gameData.customWaypoint ? '#38bdf8' : '#f5d94b';
      ctx.lineWidth = 7 / scale; ctx.setLineDash([20 / scale, 12 / scale]);
      ctx.beginPath(); ctx.moveTo(navRoute[0].x, navRoute[0].y);
      for (let i = 1; i < navRoute.length; i++) ctx.lineTo(navRoute[i].x, navRoute[i].y);
      ctx.stroke(); ctx.restore();
    }

    // Active Mission
    if (gameData.mission) {
      const m = gameData.mission;
      ctx.strokeStyle = m.isSide ? '#4de0b5' : '#f5d94b';
      ctx.lineWidth = 5 / scale;
      ctx.beginPath();
      ctx.arc(m.x, m.y, rIcon * 1.45, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = m.isSide ? '#4de0b5' : '#f5d94b';
      ctx.fillText('OBJETIVO', m.x, m.y - rIcon * 1.7);
    }

    // Custom GPS Waypoint
    if (gameData.customWaypoint) {
      const wp = gameData.customWaypoint;
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 5 / scale;
      ctx.beginPath();
      ctx.arc(wp.x, wp.y, rIcon * 1.35, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#38bdf8';
      ctx.fillText(`GPS: ${wp.label || 'DESTINO'}`, wp.x, wp.y - rIcon * 1.6);
    }

    // Player Marker
    if (gameData.player) {
      const p = gameData.player;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      ctx.fillStyle = '#d6f36a';
      ctx.strokeStyle = '#101411';
      ctx.lineWidth = 3 / scale;
      ctx.beginPath();
      ctx.moveTo(rIcon * 1.4, 0);
      ctx.lineTo(-rIcon * 0.95, -rIcon * 0.85);
      ctx.lineTo(-rIcon * 0.55, 0);
      ctx.lineTo(-rIcon * 0.95, rIcon * 0.85);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    ctx.restore();

    return { offsetX, offsetY, scale, worldW: wCfg.width, worldH: wCfg.height };
  }

  function render(ctx, viewW, viewH, state) {
    if (!mapTiles) buildStaticMapCache();

    const now = performance.now();
    const simTime = state.simTime || now / 1000;
    const cam = state.camera;
    const policeHUD = state.policeHUD;

    ctx.clearRect(0, 0, viewW, viewH);

    ctx.save();
    ctx.translate(-cam.x, -cam.y);

    // Blit only visible quadrants from the 4-tile cache
    for (let i = 0; i < mapTiles.length; i++) {
      const tile = mapTiles[i];
      const ix0 = Math.max(tile.ox, Math.floor(cam.x));
      const iy0 = Math.max(tile.oy, Math.floor(cam.y));
      const ix1 = Math.min(tile.ox + tile.w, Math.ceil(cam.x + viewW) + 2);
      const iy1 = Math.min(tile.oy + tile.h, Math.ceil(cam.y + viewH) + 2);
      const sw = ix1 - ix0;
      const sh = iy1 - iy0;
      if (sw > 0 && sh > 0) {
        ctx.drawImage(
          tile.canvas,
          ix0 - tile.ox,
          iy0 - tile.oy,
          sw,
          sh,
          ix0,
          iy0,
          sw,
          sh
        );
      }
    }

    drawTrafficLightsAndUrbanGlow(ctx, cam, viewW, viewH, simTime);
    drawStoreMarkers(ctx, state.stores || World.stores, now);

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      if (p.type === 'skid') {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        ctx.fillStyle = `rgba(18, 20, 18, ${p.alpha.toFixed(2)})`;
        ctx.fillRect(-4, -7, 8, 3);
        ctx.fillRect(-4, 4, 8, 3);
        ctx.restore();
      } else if (p.type === 'smoke') {
        ctx.fillStyle = `rgba(175, 180, 175, ${p.alpha.toFixed(2)})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'dust') {
        ctx.fillStyle = `rgba(195, 202, 185, ${p.alpha.toFixed(2)})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = `rgba(255, 214, 92, ${p.alpha.toFixed(2)})`;
        ctx.fillRect(p.x - 1.5, p.y - 1.5, 3, 3);
      }
    }

    if (policeHUD && policeHUD.wanted > 0 && policeHUD.hasLastKnown && !policeHUD.playerInSight) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 193, 7, 0.45)';
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 8]);
      ctx.beginPath();
      ctx.arc(policeHUD.lastKnownX, policeHUD.lastKnownY, 34 + Math.sin(now / 220) * 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(255, 193, 7, 0.85)';
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('?', policeHUD.lastKnownX, policeHUD.lastKnownY + 5);
      ctx.restore();
    }

    if (state.roadblocks) {
      drawRoadblocks(ctx, state.roadblocks, now);
    }

    drawStoryNPCs(ctx, state.npcs, state.player, state.mission, now);

    const pad = 80;
    for (let i = 0; i < state.pedestrians.length; i++) {
      const p = state.pedestrians[i];
      if (
        p.x < cam.x - pad || p.x > cam.x + viewW + pad ||
        p.y < cam.y - pad || p.y > cam.y + viewH + pad
      ) {
        continue;
      }
      drawPedestrian(ctx, p, now);
    }

    drawPlayer(ctx, state.player, state.missionInfo);

    for (let i = 0; i < state.vehicles.length; i++) {
      const v = state.vehicles[i];
      if (
        v.x < cam.x - pad || v.x > cam.x + viewW + pad ||
        v.y < cam.y - pad || v.y > cam.y + viewH + pad
      ) {
        continue;
      }
      drawVehicle(ctx, v, now, v === state.player.vehicle);
    }

    ctx.restore();

    // Mission marker + directional arrow
    if (state.mission) {
      const mColor = state.mission.isSide ? '#4de0b5' : '#f5d94b';
      const mFill = state.mission.isSide ? 'rgba(77, 224, 181, 0.22)' : 'rgba(245, 217, 75, 0.25)';
      drawMarkerAndArrow(ctx, state.player, state.mission, mColor, mFill, cam, viewW, viewH, now, null);
    }

    // Custom GPS Waypoint marker + directional arrow
    if (state.customWaypoint) {
      drawMarkerAndArrow(
        ctx,
        state.player,
        state.customWaypoint,
        '#38bdf8',
        'rgba(56, 189, 248, 0.22)',
        cam,
        viewW,
        viewH,
        now,
        'GPS'
      );
    }

    drawMinimap(ctx, viewW, state, policeHUD);
  }

  return {
    setQuality,
    setShowMinimap,
    setShowTrafficLightsOnMap,
    addSkidParticle,
    addSparkParticles,
    addFootstepDust,
    updateEffects,
    render,
    renderFullMap
  };
})();
