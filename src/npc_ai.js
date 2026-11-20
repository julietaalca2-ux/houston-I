window.CiudadCero = window.CiudadCero || {};

CiudadCero.NPCAI = (() => {
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  function findVehicleThreat(ped, vehicles) {
    let best = null;
    let bestRisk = Infinity;
    for (let i = 0; i < vehicles.length; i++) {
      const v = vehicles[i];
      const vx = v.vx || 0;
      const vy = v.vy || 0;
      const speed = Math.hypot(vx, vy);
      if (speed < 22) continue;

      const dx = ped.x - v.x;
      const dy = ped.y - v.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 155 || dist < 1) continue;

      // Positive closing means the vehicle is moving toward the pedestrian.
      const closing = (dx * vx + dy * vy) / (dist * speed);
      if (closing < 0.28) continue;
      const reactionRange = clamp(48 + speed * 0.72, 68, 145);
      if (dist > reactionRange) continue;

      const risk = dist / (0.35 + closing) - speed * 0.12;
      if (risk < bestRisk) {
        bestRisk = risk;
        best = { vehicle: v, dx, dy, dist, speed, closing };
      }
    }
    return best;
  }

  function crowdSteering(ped, pedestrians) {
    let sx = 0;
    let sy = 0;
    let count = 0;
    for (let i = 0; i < pedestrians.length; i++) {
      const other = pedestrians[i];
      if (other === ped || other.isDead || other.knockTimer > 0) continue;
      const dx = ped.x - other.x;
      const dy = ped.y - other.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < 1 || d2 > 30 * 30) continue;
      const d = Math.sqrt(d2);
      const weight = (30 - d) / 30;
      sx += (dx / d) * weight;
      sy += (dy / d) * weight;
      count++;
    }
    return count ? { x: sx, y: sy } : null;
  }

  function update(ped, context, dt) {
    const { vehicles, pedestrians, player, Police, Physics } = context;
    ped.aiThinkTimer = Math.max(0, (ped.aiThinkTimer || 0) - dt);
    ped.alertIconTimer = Math.max(0, (ped.alertIconTimer || 0) - dt);

    const threat = findVehicleThreat(ped, vehicles);
    if (threat) {
      ped.panicTimer = Math.max(ped.panicTimer || 0, 1.7);
      ped.aiState = 'flee';
      ped.aiThreatId = threat.vehicle.id;
    }

    if ((ped.panicTimer || 0) > 0) {
      ped.panicTimer = Math.max(0, ped.panicTimer - dt);
      ped.pausedTimer = 0;
      if (ped.alertIconTimer <= 0) ped.alertIconTimer = 0.6;

      const source = threat ? threat.vehicle : player;
      let dx = ped.x - source.x;
      let dy = ped.y - source.y;
      let len = Math.hypot(dx, dy) || 1;
      dx /= len;
      dy /= len;

      // Add a small sideways component so a crowd does not flee in one straight line.
      const side = ((ped.id || 0) % 2 ? 1 : -1) * 0.34;
      let sx = dx - dy * side;
      let sy = dy + dx * side;
      len = Math.hypot(sx, sy) || 1;
      sx /= len;
      sy /= len;
      ped.angle = Math.atan2(sy, sx);
      const speed = ped.speed * 1.85;
      Physics.moveCircleEntity(ped, sx * speed * dt, sy * speed * dt, ped.radius);
      ped.walkPhase += dt * 15;
      return;
    }

    if (ped.isPoliceFoot && Police.state.wanted > 0 &&
        Math.hypot(player.x - ped.x, player.y - ped.y) < 250) {
      ped.aiState = 'alert';
      ped.angle = Math.atan2(player.y - ped.y, player.x - ped.x);
      if (ped.alertIconTimer <= 0) ped.alertIconTimer = 0.65;
      return;
    }

    if (ped.pausedTimer > 0) {
      ped.pausedTimer = Math.max(0, ped.pausedTimer - dt);
      ped.aiState = 'idle';
      return;
    }

    const loop = ped.loop || [];
    if (!loop.length) return;
    let target = loop[ped.targetIdx] || loop[0];
    let dx = target.x - ped.x;
    let dy = target.y - ped.y;
    let dist = Math.hypot(dx, dy);

    if (dist < 11) {
      ped.targetIdx = (ped.targetIdx + (ped.loopDir || 1) + loop.length) % loop.length;
      target = loop[ped.targetIdx];
      dx = target.x - ped.x;
      dy = target.y - ped.y;
      dist = Math.hypot(dx, dy);
      if (!ped.isPoliceFoot && Math.random() < 0.18) {
        ped.pausedTimer = 0.45 + Math.random() * 1.35;
        ped.aiState = 'idle';
        return;
      }
    }

    let sx = dx / (dist || 1);
    let sy = dy / (dist || 1);
    const crowd = crowdSteering(ped, pedestrians);
    if (crowd) {
      sx += crowd.x * 0.85;
      sy += crowd.y * 0.85;
    }

    const nearbyPlayer = !player.inCar && distance(ped, player) < 34;
    if (nearbyPlayer) {
      const awayX = ped.x - player.x;
      const awayY = ped.y - player.y;
      const d = Math.hypot(awayX, awayY) || 1;
      sx += (awayX / d) * 0.55;
      sy += (awayY / d) * 0.55;
      ped.aiState = 'avoid_player';
    } else {
      ped.aiState = crowd ? 'avoid_crowd' : 'walk';
    }

    const length = Math.hypot(sx, sy) || 1;
    sx /= length;
    sy /= length;
    ped.angle = Math.atan2(sy, sx);
    const pace = ped.speed * (ped.aiState === 'avoid_player' ? 1.12 : 1);
    Physics.moveCircleEntity(ped, sx * pace * dt, sy * pace * dt, ped.radius);
    ped.walkPhase += dt * (ped.aiState === 'avoid_player' ? 10 : 8);
  }

  return { update };
})();
