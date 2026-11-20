window.CiudadCero = window.CiudadCero || {};

CiudadCero.Renderer = (() => {
  const Config = CiudadCero.Config;
  const World = CiudadCero.World;
  const wCfg = Config.WORLD;

  let worldCache = null;

  function buildWorldCache() {
    const off = document.createElement('canvas');
    off.width = wCfg.width;
    off.height = wCfg.height;
    const c = off.getContext('2d');

    // 1. Base de acera / concreto urbano
    c.fillStyle = '#626e60';
    c.fillRect(0, 0, wCfg.width, wCfg.height);

    // Textura sutil de baldosas en aceras
    c.strokeStyle = 'rgba(34, 42, 34, 0.22)';
    c.lineWidth = 1;
    for (let x = 0; x < wCfg.width; x += 30) {
      c.beginPath();
      c.moveTo(x, 0);
      c.lineTo(x, wCfg.height);
      c.stroke();
    }
    for (let y = 0; y < wCfg.height; y += 30) {
      c.beginPath();
      c.moveTo(0, y);
      c.lineTo(wCfg.width, y);
      c.stroke();
    }

    // 2. Carreteras y cordones (curbs)
    for (let x = 0; x < wCfg.width; x += wCfg.blockSize) {
      for (let y = 0; y < wCfg.height; y += wCfg.blockSize) {
        // Borde de cordón claro
        c.fillStyle = '#7e8a7b';
        c.fillRect(x - 2, y, wCfg.roadWidth + 4, wCfg.blockSize);
        c.fillRect(x, y - 2, wCfg.blockSize, wCfg.roadWidth + 4);
      }
    }

    // Asfalto principal
    c.fillStyle = '#313837';
    for (let x = 0; x < wCfg.width; x += wCfg.blockSize) {
      c.fillRect(x, 0, wCfg.roadWidth, wCfg.height);
    }
    for (let y = 0; y < wCfg.height; y += wCfg.blockSize) {
      c.fillRect(0, y, wCfg.width, wCfg.roadWidth);
    }

    // 3. Pasos de cebra y líneas divisorias de carril
    for (let x = 0; x < wCfg.width; x += wCfg.blockSize) {
      for (let y = 0; y < wCfg.height; y += wCfg.blockSize) {
        // Líneas centrales discontinuas (entre intersecciones)
        c.strokeStyle = '#c5be8b';
        c.lineWidth = 2;
        c.setLineDash([16, 16]);

        // Tramo vertical debajo de intersección
        c.beginPath();
        c.moveTo(x + wCfg.roadWidth * 0.5, y + wCfg.roadWidth + 16);
        c.lineTo(x + wCfg.roadWidth * 0.5, y + wCfg.blockSize - 16);
        c.stroke();

        // Tramo horizontal a la derecha de intersección
        c.beginPath();
        c.moveTo(x + wCfg.roadWidth + 16, y + wCfg.roadWidth * 0.5);
        c.lineTo(x + wCfg.blockSize - 16, y + wCfg.roadWidth * 0.5);
        c.stroke();
        c.setLineDash([]);

        // Pasos de cebra en los 4 bordes de cada cruce
        c.fillStyle = 'rgba(232, 236, 226, 0.52)';
        for (let s = 14; s < wCfg.roadWidth - 14; s += 16) {
          // Norte y Sur del cruce
          c.fillRect(x + s, y + 4, 8, 12);
          c.fillRect(x + s, y + wCfg.roadWidth - 16, 8, 12);
          // Oeste y Este del cruce
          c.fillRect(x + 4, y + s, 12, 8);
          c.fillRect(x + wCfg.roadWidth - 16, y + s, 12, 8);
        }
      }
    }

    // 4. Plazas / Parques urbanos
    World.parks.forEach((p) => {
      c.fillStyle = '#3f5a42';
      c.fillRect(p.x, p.y, p.w, p.h);
      c.strokeStyle = '#73826e';
      c.lineWidth = 2;
      c.strokeRect(p.x, p.y, p.w, p.h);

      // Senderos internos de la plaza
      c.fillStyle = '#6f786b';
      c.fillRect(p.x + p.w * 0.5 - 10, p.y, 20, p.h);
      c.fillRect(p.x, p.y + p.h * 0.5 - 10, p.w, 20);

      // Fuente central
      c.fillStyle = '#4e8396';
      c.beginPath();
      c.arc(p.x + p.w * 0.5, p.y + p.h * 0.5, 16, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = '#9aa89b';
      c.lineWidth = 3;
      c.stroke();

      // Árboles en las esquinas de la plaza
      const treeSpots = [
        [p.x + 22, p.y + 22],
        [p.x + p.w - 22, p.y + 22],
        [p.x + 22, p.y + p.h - 22],
        [p.x + p.w - 22, p.y + p.h - 22]
      ];
      treeSpots.forEach(([tx, ty]) => {
        c.fillStyle = 'rgba(18, 24, 18, 0.35)';
        c.beginPath();
        c.arc(tx + 3, ty + 4, 13, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = '#2d4b31';
        c.beginPath();
        c.arc(tx, ty, 13, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = '#4c754d';
        c.beginPath();
        c.arc(tx - 3, ty - 3, 8, 0, Math.PI * 2);
        c.fill();
      });
    });

    // 5. Edificios
    const wallPalette = ['#879078', '#9a8b70', '#727f79', '#8c7e74'];
    World.buildings.forEach((b) => {
      // Sombra proyectada
      c.fillStyle = 'rgba(16, 22, 18, 0.55)';
      c.fillRect(b.x + 8, b.y + 9, b.w, b.h);

      // Cuerpo exterior
      c.fillStyle = wallPalette[b.shade % wallPalette.length];
      c.fillRect(b.x, b.y, b.w, b.h);

      // Azotea interior
      c.fillStyle = '#4d5d54';
      c.fillRect(b.x + 8, b.y + 8, b.w - 16, b.h - 16);

      // Ventanas perimetrales
      c.fillStyle = '#c8c8a2';
      for (let wx = b.x + 18; wx < b.x + b.w - 14; wx += 32) {
        c.fillRect(wx, b.y + 2, 11, 4);
        c.fillRect(wx, b.y + b.h - 6, 11, 4);
      }
      for (let wy = b.y + 18; wy < b.y + b.h - 14; wy += 32) {
        c.fillRect(b.x + 2, wy, 4, 11);
        c.fillRect(b.x + b.w - 6, wy, 4, 11);
      }

      // Detalles arquitectónicos variados en azotea
      if (b.roofType === 0) {
        c.fillStyle = '#38463c';
        c.fillRect(b.x + b.w * 0.5 - 18, b.y + b.h * 0.5 - 18, 36, 36);
        c.strokeStyle = '#68796c';
        c.lineWidth = 1.5;
        c.strokeRect(b.x + b.w * 0.5 - 18, b.y + b.h * 0.5 - 18, 36, 36);
      } else if (b.roofType === 1) {
        c.fillStyle = '#5c6e64';
        c.fillRect(b.x + 18, b.y + 18, 22, 16);
        c.fillRect(b.x + b.w - 40, b.y + b.h - 34, 22, 16);
      } else {
        c.strokeStyle = '#7b8b7e';
        c.lineWidth = 2;
        c.beginPath();
        c.arc(b.x + b.w * 0.5, b.y + b.h * 0.5, 16, 0, Math.PI * 2);
        c.stroke();
      }
    });

    worldCache = off;
  }

  function drawVehicle(ctx, v, isHighlighted) {
    ctx.save();
    ctx.translate(v.x, v.y);
    ctx.rotate(v.angle);

    const hl = v.length * 0.5;
    const hw = v.width * 0.5;

    // Aro sutil si el jugador está a pie cerca para subir
    if (isHighlighted) {
      ctx.strokeStyle = 'rgba(245, 217, 75, 0.75)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(-hl - 5, -hw - 5, v.length + 10, v.width + 10, 6);
      ctx.stroke();
    }

    // Sombra del vehículo
    ctx.fillStyle = 'rgba(12, 16, 14, 0.5)';
    ctx.fillRect(-hl + 2, -hw + 3, v.length, v.width);

    // Neumáticos
    ctx.fillStyle = '#141816';
    const wheelW = 8;
    const wheelH = 3.5;
    ctx.fillRect(-hl + 5, -hw - 2, wheelW, wheelH);
    ctx.fillRect(hl - 13, -hw - 2, wheelW, wheelH);
    ctx.fillRect(-hl + 5, hw - 1.5, wheelW, wheelH);
    ctx.fillRect(hl - 13, hw - 1.5, wheelW, wheelH);

    // Carrocería principal
    ctx.fillStyle = v.color;
    ctx.beginPath();
    ctx.roundRect(-hl, -hw, v.length, v.width, 4);
    ctx.fill();

    // Detalles según modelo de vehículo
    if (v.typeId === 'van') {
      // Furgoneta: techo amplio de carga + parabrisas delantero
      ctx.fillStyle = 'rgba(255,255,255,0.16)';
      ctx.fillRect(-hl + 4, -hw + 3, v.length - 16, v.width - 6);
      ctx.fillStyle = '#89a39e';
      ctx.fillRect(hl - 11, -hw + 2.5, 6, v.width - 5);
    } else if (v.typeId === 'suv') {
      // Todoterreno 4x4: barras de techo + cabina robusta
      ctx.fillStyle = '#232926';
      ctx.fillRect(-hl + 6, -hw + 3, v.length - 16, v.width - 6);
      ctx.fillStyle = '#89a39e';
      ctx.fillRect(hl - 12, -hw + 3, 5, v.width - 6);
      ctx.fillRect(-hl + 3, -hw + 3, 4, v.width - 6);
    } else if (v.typeId === 'coupe') {
      // Coupé deportivo: franja central + cabina aerodinámica
      ctx.fillStyle = 'rgba(255,255,255,0.22)';
      ctx.fillRect(-hl + 2, -2, v.length - 4, 4);
      ctx.fillStyle = '#89a39e';
      ctx.fillRect(-6, -hw + 2.5, 14, v.width - 5);
      ctx.fillStyle = v.color;
      ctx.fillRect(-4, -hw + 4, 7, v.width - 8);
    } else {
      // Sedán y Taxi
      ctx.fillStyle = '#89a39e';
      ctx.fillRect(-8, -hw + 2.5, 17, v.width - 5);
      ctx.fillStyle = v.color;
      ctx.fillRect(-5, -hw + 3.5, 10, v.width - 7);

      if (v.typeId === 'taxi') {
        // Letrero luminoso TAXI en el techo
        ctx.fillStyle = '#181c1a';
        ctx.fillRect(-3, -5, 6, 10);
        ctx.fillStyle = '#fff59d';
        ctx.fillRect(-2, -4, 4, 8);
      }
    }

    // Faros delanteros
    ctx.fillStyle = '#f6f2c2';
    ctx.fillRect(hl - 2, -hw + 2, 2.5, 4);
    ctx.fillRect(hl - 2, hw - 6, 2.5, 4);

    // Luces traseras (intensas al frenar o dar reversa)
    ctx.fillStyle = v.brakeLights || v.reversing ? '#ff3b2f' : '#8f241e';
    ctx.fillRect(-hl, -hw + 2, 2.5, 4);
    ctx.fillRect(-hl, hw - 6, 2.5, 4);

    ctx.restore();
  }

  function drawPedestrian(ctx, p) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle);

    const swing = Math.sin(p.walkPhase) * 2.5;

    // Sombra
    ctx.fillStyle = 'rgba(14, 18, 15, 0.45)';
    ctx.beginPath();
    ctx.arc(1.5, 2, 7.5, 0, Math.PI * 2);
    ctx.fill();

    // Brazos / hombros animados
    ctx.fillStyle = p.shirt;
    ctx.fillRect(-4, -6 + swing * 0.4, 8, 12);

    // Cabeza
    ctx.fillStyle = '#eab98a';
    ctx.beginPath();
    ctx.arc(1, 0, 4.2, 0, Math.PI * 2);
    ctx.fill();

    // Cabello
    ctx.fillStyle = p.hair;
    ctx.beginPath();
    ctx.arc(-0.5, 0, 4.1, Math.PI * 0.55, Math.PI * 1.45);
    ctx.fill();

    ctx.restore();
  }

  function drawPlayer(ctx, player) {
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(player.angle);

    const swing = Math.sin(player.walkPhase) * 3;

    // Sombra
    ctx.fillStyle = 'rgba(12, 18, 14, 0.55)';
    ctx.beginPath();
    ctx.arc(2, 2.5, 9, 0, Math.PI * 2);
    ctx.fill();

    // Chaqueta del protagonista (identidad visual clara)
    ctx.fillStyle = '#d6f36a';
    ctx.fillRect(-5, -7.5 + swing * 0.45, 10, 15);
    ctx.strokeStyle = '#182019';
    ctx.lineWidth = 1.4;
    ctx.strokeRect(-5, -7.5 + swing * 0.45, 10, 15);

    // Cabeza
    ctx.fillStyle = '#f0c58c';
    ctx.beginPath();
    ctx.arc(2, 0, 4.8, 0, Math.PI * 2);
    ctx.fill();

    // Cabello oscuro
    ctx.fillStyle = '#1c211e';
    ctx.beginPath();
    ctx.arc(0, 0, 4.6, Math.PI * 0.55, Math.PI * 1.45);
    ctx.fill();

    ctx.restore();
  }

  function drawMissionTarget(ctx, mission, timeSec) {
    if (!mission) return;
    const pulse = 1 + Math.sin(timeSec * 5) * 0.16;

    ctx.save();
    ctx.beginPath();
    ctx.arc(mission.x, mission.y, (mission.radius + 10) * pulse, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(245, 217, 75, 0.22)';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(mission.x, mission.y, mission.radius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(245, 217, 75, 0.88)';
    ctx.fill();
    ctx.strokeStyle = '#1b2016';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#1b2016';
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('!', mission.x, mission.y + 1);
    ctx.restore();
  }

  // Flecha direccional cuando el objetivo está fuera de pantalla
  function drawOffscreenIndicator(ctx, viewW, viewH, camera, actor, mission) {
    if (!mission) return;
    const screenX = mission.x - camera.x;
    const screenY = mission.y - camera.y;
    const pad = 34;

    if (
      screenX >= pad &&
      screenX <= viewW - pad &&
      screenY >= pad &&
      screenY <= viewH - pad
    ) {
      return; // Ya es visible en pantalla
    }

    const angle = Math.atan2(mission.y - actor.y, mission.x - actor.x);
    const cx = viewW * 0.5;
    const cy = viewH * 0.5;
    const maxRx = cx - pad;
    const maxRy = cy - pad;

    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const scale = Math.min(
      Math.abs(maxRx / (cos || 0.0001)),
      Math.abs(maxRy / (sin || 0.0001))
    );

    const ix = cx + cos * scale;
    const iy = cy + sin * scale;

    ctx.save();
    ctx.translate(ix, iy);
    ctx.rotate(angle);
    ctx.fillStyle = '#f5d94b';
    ctx.strokeStyle = '#141914';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(11, 0);
    ctx.lineTo(-7, -7);
    ctx.lineTo(-4, 0);
    ctx.lineTo(-7, 7);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  // Mini mapa en tiempo real con calles, manzanas, tráfico, objetivo y jugador
  function drawMinimap(ctx, viewW, state) {
    const mapW = 132;
    const mapH = 98;
    const x0 = viewW - mapW - 14;
    const y0 = 14;

    ctx.save();
    ctx.fillStyle = 'rgba(14, 20, 16, 0.9)';
    ctx.fillRect(x0 - 4, y0 - 4, mapW + 8, mapH + 8);
    ctx.strokeStyle = '#81905d';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x0 - 4, y0 - 4, mapW + 8, mapH + 8);

    // Fondo de carreteras en el radar
    ctx.fillStyle = '#2d3432';
    ctx.fillRect(x0, y0, mapW, mapH);

    const sx = mapW / wCfg.width;
    const sy = mapH / wCfg.height;

    // Manzanas / edificios
    ctx.fillStyle = '#647360';
    for (let i = 0; i < World.buildings.length; i++) {
      const b = World.buildings[i];
      ctx.fillRect(x0 + b.x * sx, y0 + b.y * sy, b.w * sx, b.h * sy);
    }

    // Parques
    ctx.fillStyle = '#416345';
    for (let i = 0; i < World.parks.length; i++) {
      const p = World.parks[i];
      ctx.fillRect(x0 + p.x * sx, y0 + p.y * sy, p.w * sx, p.h * sy);
    }

    // Vehículos del tráfico en radar
    ctx.fillStyle = '#9db3a8';
    for (let i = 0; i < state.vehicles.length; i++) {
      const v = state.vehicles[i];
      if (v === state.player.vehicle) continue;
      ctx.fillRect(x0 + v.x * sx - 1.2, y0 + v.y * sy - 1.2, 2.4, 2.4);
    }

    // Objetivo de misión (amarillo)
    if (state.mission) {
      ctx.fillStyle = '#f5d94b';
      ctx.beginPath();
      ctx.arc(
        x0 + state.mission.x * sx,
        y0 + state.mission.y * sy,
        3.5,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }

    // Jugador (blanco con borde oscuro)
    const actor = state.player.inCar ? state.player.vehicle : state.player;
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#101411';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(x0 + actor.x * sx, y0 + actor.y * sy, 3.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }

  function render(ctx, viewW, viewH, state) {
    if (!worldCache) buildWorldCache();

    const cam = state.camera;
    ctx.clearRect(0, 0, viewW, viewH);

    ctx.save();
    ctx.translate(-cam.x, -cam.y);

    // Blit único del mapa cacheado
    const sx = Math.max(0, Math.floor(cam.x));
    const sy = Math.max(0, Math.floor(cam.y));
    const sw = Math.min(wCfg.width - sx, Math.ceil(viewW) + 2);
    const sh = Math.min(wCfg.height - sy, Math.ceil(viewH) + 2);
    if (sw > 0 && sh > 0) {
      ctx.drawImage(worldCache, sx, sy, sw, sh, sx, sy, sw, sh);
    }

    // Marcas de neumáticos (skid marks) con culling
    for (let i = 0; i < state.skids.length; i++) {
      const s = state.skids[i];
      if (
        s.x < cam.x - 20 || s.x > cam.x + viewW + 20 ||
        s.y < cam.y - 20 || s.y > cam.y + viewH + 20
      ) continue;
      ctx.fillStyle = `rgba(18, 22, 20, ${s.alpha.toFixed(2)})`;
      ctx.fillRect(s.x - 2, s.y - 2, 4, 4);
    }

    // Marcador de misión
    drawMissionTarget(ctx, state.mission, state.time);

    // Peatones con culling
    for (let i = 0; i < state.pedestrians.length; i++) {
      const p = state.pedestrians[i];
      if (
        p.x < cam.x - 30 || p.x > cam.x + viewW + 30 ||
        p.y < cam.y - 30 || p.y > cam.y + viewH + 30
      ) continue;
      drawPedestrian(ctx, p);
    }

    // Vehículos con culling
    for (let i = 0; i < state.vehicles.length; i++) {
      const v = state.vehicles[i];
      if (
        v.x < cam.x - 60 || v.x > cam.x + viewW + 60 ||
        v.y < cam.y - 60 || v.y > cam.y + viewH + 60
      ) continue;
      const highlight = !state.player.inCar && state.nearestVehicle === v;
      drawVehicle(ctx, v, highlight);
    }

    // Protagonista si está a pie
    if (!state.player.inCar) {
      drawPlayer(ctx, state.player);
    }

    // Partículas de chispas / polvo
    for (let i = 0; i < state.particles.length; i++) {
      const pt = state.particles[i];
      ctx.fillStyle = pt.color;
      ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
      ctx.fillRect(pt.x - 2, pt.y - 2, 4, 4);
    }
    ctx.globalAlpha = 1;

    ctx.restore();

    // HUD dibujado sobre el canvas: flecha de dirección + mini mapa
    const actor = state.player.inCar ? state.player.vehicle : state.player;
    drawOffscreenIndicator(ctx, viewW, viewH, cam, actor, state.mission);
    drawMinimap(ctx, viewW, state);
  }

  return {
    render
  };
})();
