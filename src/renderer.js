window.CiudadCero = window.CiudadCero || {};

CiudadCero.Renderer = (() => {
  const Config = CiudadCero.Config;
  const World = CiudadCero.World;
  const wCfg = Config.WORLD;

  let mapCache = null;
  const particles = [];

  function buildStaticMapCache() {
    const off = document.createElement('canvas');
    off.width = wCfg.width;
    off.height = wCfg.height;
    const c = off.getContext('2d');

    c.fillStyle = '#333b35';
    c.fillRect(0, 0, wCfg.width, wCfg.height);

    c.fillStyle = '#6f796c';
    for (let x = 0; x < wCfg.width; x += wCfg.blockSize) {
      for (let y = 0; y < wCfg.height; y += wCfg.blockSize) {
        c.fillRect(
          x + wCfg.roadWidth,
          y + wCfg.roadWidth,
          wCfg.blockSize - wCfg.roadWidth,
          wCfg.blockSize - wCfg.roadWidth
        );
      }
    }

    c.strokeStyle = 'rgba(227, 198, 92, 0.52)';
    c.lineWidth = 2;
    c.setLineDash([16, 16]);
    for (let x = 0; x < wCfg.width; x += wCfg.blockSize) {
      c.beginPath();
      c.moveTo(x + wCfg.roadWidth * 0.5, 0);
      c.lineTo(x + wCfg.roadWidth * 0.5, wCfg.height);
      c.stroke();
    }
    for (let y = 0; y < wCfg.height; y += wCfg.blockSize) {
      c.beginPath();
      c.moveTo(0, y + wCfg.roadWidth * 0.5);
      c.lineTo(wCfg.width, y + wCfg.roadWidth * 0.5);
      c.stroke();
    }
    c.setLineDash([]);

    c.fillStyle = 'rgba(235, 240, 232, 0.24)';
    for (let x = 0; x < wCfg.width; x += wCfg.blockSize) {
      for (let y = 0; y < wCfg.height; y += wCfg.blockSize) {
        for (let s = 14; s < wCfg.roadWidth - 14; s += 16) {
          c.fillRect(x + s, y + wCfg.roadWidth - 12, 8, 10);
          c.fillRect(x + wCfg.roadWidth - 12, y + s, 10, 8);
        }
      }
    }

    for (let i = 0; i < World.parks.length; i++) {
      const p = World.parks[i];
      c.fillStyle = '#385d3c';
      c.fillRect(p.x, p.y, p.w, p.h);
      c.strokeStyle = '#537b54';
      c.lineWidth = 2;
      c.strokeRect(p.x + 4, p.y + 4, p.w - 8, p.h - 8);

      c.fillStyle = '#4f4a3f';
      c.fillRect(p.x + p.w * 0.5 - 8, p.y, 16, p.h);
      c.fillRect(p.x, p.y + p.h * 0.5 - 8, p.w, 16);

      const trees = [
        [p.x + 22, p.y + 22],
        [p.x + p.w - 22, p.y + 22],
        [p.x + 22, p.y + p.h - 22],
        [p.x + p.w - 22, p.y + p.h - 22]
      ];
      for (let t = 0; t < trees.length; t++) {
        c.fillStyle = 'rgba(0, 0, 0, 0.25)';
        c.beginPath();
        c.arc(trees[t][0] + 3, trees[t][1] + 4, 13, 0, Math.PI * 2);
        c.fill();

        c.fillStyle = '#2b4c2d';
        c.beginPath();
        c.arc(trees[t][0], trees[t][1], 13, 0, Math.PI * 2);
        c.fill();

        c.fillStyle = '#477647';
        c.beginPath();
        c.arc(trees[t][0] - 3, trees[t][1] - 3, 8, 0, Math.PI * 2);
        c.fill();
      }
    }

    for (let i = 0; i < World.garages.length; i++) {
      const g = World.garages[i];
      const gx = g.x - g.w * 0.5;
      const gy = g.y - g.h * 0.5;

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

    for (let i = 0; i < World.hideouts.length; i++) {
      const h = World.hideouts[i];
      const hx = h.x - h.w * 0.5;
      const hy = h.y - h.h * 0.5;

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

    const palettes = [
      { base: '#4a554c', top: '#5a665c' },
      { base: '#444e52', top: '#535f64' },
      { base: '#575248', top: '#686256' },
      { base: '#4d4c56', top: '#5d5c68' }
    ];

    for (let i = 0; i < World.buildings.length; i++) {
      const b = World.buildings[i];
      const pal = palettes[b.shade || 0];

      c.fillStyle = 'rgba(0, 0, 0, 0.34)';
      c.fillRect(b.x + 8, b.y + 9, b.w, b.h);

      c.fillStyle = b.isGarageRoof ? '#374238' : pal.base;
      c.fillRect(b.x, b.y, b.w, b.h);

      c.fillStyle = b.isGarageRoof ? '#485649' : pal.top;
      c.fillRect(b.x + 5, b.y + 5, Math.max(4, b.w - 10), Math.max(4, b.h - 10));

      c.strokeStyle = b.isGarageRoof ? '#f5d94b' : '#2d342e';
      c.lineWidth = 2;
      c.strokeRect(b.x, b.y, b.w, b.h);

      if (b.isGarageRoof) {
        c.fillStyle = '#f5d94b';
        c.font = 'bold 9px monospace';
        c.textAlign = 'center';
        c.fillText('TALLER MECÁNICO', b.x + b.w * 0.5, b.y + 16);
      } else if (b.roofType === 1 && b.w > 40 && b.h > 40) {
        c.fillStyle = '#38413a';
        c.fillRect(b.x + 16, b.y + 16, 22, 16);
        c.strokeStyle = '#6f7c71';
        c.lineWidth = 1;
        c.strokeRect(b.x + 16, b.y + 16, 22, 16);
      } else if (b.roofType === 2 && b.w > 40 && b.h > 40) {
        c.strokeStyle = 'rgba(255,255,255,0.14)';
        c.lineWidth = 2;
        c.strokeRect(b.x + 14, b.y + 14, b.w - 28, b.h - 28);
      }
    }

    mapCache = off;
  }

  function addSkidParticle(x, y, angle) {
    if (particles.length > 90) particles.shift();
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
    for (let i = 0; i < count; i++) {
      if (particles.length > 105) particles.shift();
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
    if (particles.length > 110) particles.shift();
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
      } else {
        p.alpha = p.life * 0.45;
      }
    }

    if (vehicles && Math.random() < 0.28) {
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

  function drawVehicle(ctx, v) {
    ctx.save();
    ctx.translate(v.x, v.y);
    ctx.rotate(v.angle);

    const hl = v.length * 0.5;
    const hw = v.width * 0.5;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.36)';
    ctx.fillRect(-hl + 3, -hw + 4, v.length, v.width);

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
      }

      ctx.fillStyle = '#182226';
      ctx.fillRect(hl * 0.14, -hw + 3, hl * 0.34, v.width - 6);
      ctx.fillRect(-hl * 0.66, -hw + 3, hl * 0.26, v.width - 6);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.14)';
      if (v.typeId === 'van') {
        ctx.fillRect(-hl + 4, -hw + 3, v.length * 0.68, v.width - 6);
      } else {
        ctx.fillRect(-hl * 0.38, -hw + 3.5, v.length * 0.36, v.width - 7);
      }

      if (v.typeId === 'taxi') {
        ctx.fillStyle = '#141715';
        ctx.fillRect(-4, -5, 8, 10);
        ctx.fillStyle = '#fff59d';
        ctx.fillRect(-3, -4, 6, 8);
      }
    }

    ctx.strokeStyle = v.isMissionTarget ? '#d6f36a' : '#141915';
    ctx.lineWidth = v.isMissionTarget ? 2 : 1.3;
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
  }

  function drawPedestrian(ctx, p) {
    ctx.save();
    ctx.translate(p.x, p.y);

    if (p.knockTimer > 0) {
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath();
      ctx.ellipse(0, 2, 10, 6, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = p.shirt;
      ctx.fillRect(-8, -4, 16, 8);
      ctx.fillStyle = p.hair;
      ctx.beginPath();
      ctx.arc(7, 0, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }

    ctx.rotate(p.angle);
    const swing = Math.sin(p.walkPhase) * 2.6;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
    ctx.beginPath();
    ctx.arc(1.5, 2, p.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#252b27';
    ctx.beginPath();
    ctx.arc(swing, -3.5, 2.4, 0, Math.PI * 2);
    ctx.arc(-swing, 3.5, 2.4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = p.shirt;
    ctx.beginPath();
    ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = p.hair;
    ctx.beginPath();
    ctx.arc(1.2, 0, 4.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  function drawPlayer(ctx, player) {
    if (player.inCar) return;
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(player.angle);

    const swing = Math.sin(player.walkPhase) * 3.2;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.34)';
    ctx.beginPath();
    ctx.arc(2, 2.5, player.radius + 1, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#1e2420';
    ctx.beginPath();
    ctx.arc(swing, -4.5, 3, 0, Math.PI * 2);
    ctx.arc(-swing, 4.5, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#d6f36a';
    ctx.beginPath();
    ctx.arc(0, 0, player.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#151b16';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#1c201d';
    ctx.beginPath();
    ctx.arc(2, 0, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
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

  function drawMissionMarker(ctx, mission, now) {
    if (!mission) return;
    const pulse = 18 + Math.sin(now / 170) * 6;

    ctx.save();
    ctx.strokeStyle = '#f5d94b';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(mission.x, mission.y, pulse, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = 'rgba(245, 217, 75, 0.25)';
    ctx.beginPath();
    ctx.arc(mission.x, mission.y, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawDirectionArrow(ctx, player, mission, camera, viewW, viewH) {
    if (!mission) return;
    const dx = mission.x - player.x;
    const dy = mission.y - player.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 140) return;

    const screenX = mission.x - camera.x;
    const screenY = mission.y - camera.y;
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
    ctx.fillStyle = '#f5d94b';
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
    const mapW = 160;
    const mapH = 120;
    const mx = viewW - mapW - 14;
    const my = 14;

    ctx.save();
    ctx.fillStyle = 'rgba(13, 18, 14, 0.90)';
    ctx.fillRect(mx - 4, my - 4, mapW + 8, mapH + 8);
    ctx.strokeStyle = '#738268';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(mx - 4, my - 4, mapW + 8, mapH + 8);

    const sx = mapW / wCfg.width;
    const sy = mapH / wCfg.height;

    ctx.fillStyle = '#2d352e';
    ctx.fillRect(mx, my, mapW, mapH);

    ctx.fillStyle = '#3d6340';
    for (let i = 0; i < World.parks.length; i++) {
      const p = World.parks[i];
      ctx.fillRect(mx + p.x * sx, my + p.y * sy, p.w * sx, p.h * sy);
    }

    ctx.fillStyle = '#5f695c';
    for (let i = 0; i < World.buildings.length; i++) {
      const b = World.buildings[i];
      ctx.fillRect(mx + b.x * sx, my + b.y * sy, Math.max(1.5, b.w * sx), Math.max(1.5, b.h * sy));
    }

    ctx.fillStyle = '#f5d94b';
    for (let i = 0; i < World.garages.length; i++) {
      const g = World.garages[i];
      ctx.fillRect(mx + g.x * sx - 3, my + g.y * sy - 3, 6, 6);
    }

    ctx.fillStyle = '#4de0b5';
    for (let i = 0; i < World.hideouts.length; i++) {
      const h = World.hideouts[i];
      ctx.fillRect(mx + h.x * sx - 2.5, my + h.y * sy - 2.5, 5, 5);
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
      if (v.isPolice) {
        ctx.fillStyle = blink ? '#ff3b30' : '#3898ff';
        ctx.beginPath();
        ctx.arc(mx + v.x * sx, my + v.y * sy, 2.7, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = v === state.player.vehicle ? '#ffffff' : 'rgba(210, 220, 210, 0.55)';
        ctx.fillRect(mx + v.x * sx - 1.5, my + v.y * sy - 1.5, 3, 3);
      }
    }

    if (state.mission) {
      ctx.fillStyle = '#f5d94b';
      ctx.beginPath();
      ctx.arc(mx + state.mission.x * sx, my + state.mission.y * sy, 3.6, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = '#d6f36a';
    ctx.beginPath();
    ctx.arc(mx + state.player.x * sx, my + state.player.y * sy, 3.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  function render(ctx, viewW, viewH, state) {
    if (!mapCache) buildStaticMapCache();

    const now = performance.now();
    const cam = state.camera;
    const policeHUD = state.policeHUD;

    ctx.clearRect(0, 0, viewW, viewH);

    ctx.save();
    ctx.translate(-cam.x, -cam.y);

    const sx = Math.max(0, Math.floor(cam.x));
    const sy = Math.max(0, Math.floor(cam.y));
    const sw = Math.min(wCfg.width - sx, Math.ceil(viewW) + 2);
    const sh = Math.min(wCfg.height - sy, Math.ceil(viewH) + 2);
    if (sw > 0 && sh > 0) {
      ctx.drawImage(mapCache, sx, sy, sw, sh, sx, sy, sw, sh);
    }

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

    drawMissionMarker(ctx, state.mission, now);

    const pad = 80;
    for (let i = 0; i < state.pedestrians.length; i++) {
      const p = state.pedestrians[i];
      if (
        p.x < cam.x - pad || p.x > cam.x + viewW + pad ||
        p.y < cam.y - pad || p.y > cam.y + viewH + pad
      ) {
        continue;
      }
      drawPedestrian(ctx, p);
    }

    drawPlayer(ctx, state.player);

    for (let i = 0; i < state.vehicles.length; i++) {
      const v = state.vehicles[i];
      if (
        v.x < cam.x - pad || v.x > cam.x + viewW + pad ||
        v.y < cam.y - pad || v.y > cam.y + viewH + pad
      ) {
        continue;
      }
      drawVehicle(ctx, v);
    }

    ctx.restore();

    drawDirectionArrow(ctx, state.player, state.mission, cam, viewW, viewH);
    drawMinimap(ctx, viewW, state, policeHUD);
  }

  return {
    addSkidParticle,
    addSparkParticles,
    updateEffects,
    render
  };
})();
