window.CiudadCero = window.CiudadCero || {};

CiudadCero.Physics = (() => {
  const World = CiudadCero.World;
  const cfg = CiudadCero.Config.WORLD;

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function normalizeAngle(a) {
    while (a > Math.PI) a -= Math.PI * 2;
    while (a < -Math.PI) a += Math.PI * 2;
    return a;
  }

  function segmentIntersectsRect(x1, y1, x2, y2, rx, ry, rw, rh) {
    let t0 = 0;
    let t1 = 1;
    const dx = x2 - x1;
    const dy = y2 - y1;

    const checks = [
      [-dx, x1 - rx],
      [dx, rx + rw - x1],
      [-dy, y1 - ry],
      [dy, ry + rh - y1]
    ];

    for (let i = 0; i < 4; i++) {
      const p = checks[i][0];
      const q = checks[i][1];
      if (Math.abs(p) < 1e-8) {
        if (q < 0) return false;
      } else {
        const t = q / p;
        if (p < 0) {
          if (t > t1) return false;
          if (t > t0) t0 = t;
        } else {
          if (t < t0) return false;
          if (t < t1) t1 = t;
        }
      }
    }
    return t0 <= t1;
  }

  function hasLineOfSight(x1, y1, x2, y2) {
    const minX = Math.min(x1, x2);
    const maxX = Math.max(x1, x2);
    const minY = Math.min(y1, y2);
    const maxY = Math.max(y1, y2);

    for (let i = 0; i < World.buildings.length; i++) {
      const b = World.buildings[i];
      if (b.x > maxX || b.x + b.w < minX || b.y > maxY || b.y + b.h < minY) {
        continue;
      }
      if (segmentIntersectsRect(x1, y1, x2, y2, b.x, b.y, b.w, b.h)) {
        return false;
      }
    }
    return true;
  }

  function collidesBuildingCircle(x, y, r) {
    for (let i = 0; i < World.buildings.length; i++) {
      const b = World.buildings[i];
      if (x + r > b.x && x - r < b.x + b.w && y + r > b.y && y - r < b.y + b.h) {
        return true;
      }
    }
    return false;
  }

  function moveCircleEntity(entity, dx, dy, radius) {
    const nx = clamp(entity.x + dx, radius, cfg.width - radius);
    if (!collidesBuildingCircle(nx, entity.y, radius)) {
      entity.x = nx;
    }
    const ny = clamp(entity.y + dy, radius, cfg.height - radius);
    if (!collidesBuildingCircle(entity.x, ny, radius)) {
      entity.y = ny;
    }
  }

  function getVehicleCorners(v) {
    const cos = Math.cos(v.angle);
    const sin = Math.sin(v.angle);
    const hw = v.length * 0.5;
    const hh = v.width * 0.5;
    return [
      { x: v.x + cos * hw - sin * hh, y: v.y + sin * hw + cos * hh },
      { x: v.x + cos * hw + sin * hh, y: v.y + sin * hw - cos * hh },
      { x: v.x - cos * hw + sin * hh, y: v.y - sin * hw - cos * hh },
      { x: v.x - cos * hw - sin * hh, y: v.y - sin * hw + cos * hh }
    ];
  }

  function getAABBOverlap(v, b) {
    const corners = getVehicleCorners(v);
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (let i = 0; i < 4; i++) {
      if (corners[i].x < minX) minX = corners[i].x;
      if (corners[i].x > maxX) maxX = corners[i].x;
      if (corners[i].y < minY) minY = corners[i].y;
      if (corners[i].y > maxY) maxY = corners[i].y;
    }
    const bRight = b.x + b.w;
    const bBottom = b.y + b.h;
    if (maxX <= b.x || minX >= bRight || maxY <= b.y || minY >= bBottom) {
      return null;
    }

    const cos = Math.cos(v.angle);
    const sin = Math.sin(v.angle);
    const axes = [
      { x: 1, y: 0 },
      { x: 0, y: 1 },
      { x: cos, y: sin },
      { x: -sin, y: cos }
    ];

    const bCorners = [
      { x: b.x, y: b.y },
      { x: bRight, y: b.y },
      { x: bRight, y: bBottom },
      { x: b.x, y: bBottom }
    ];

    let minOverlap = Infinity;
    let smallestAxis = null;

    for (let a = 0; a < axes.length; a++) {
      const axis = axes[a];
      let minA = Infinity, maxA = -Infinity;
      let minB = Infinity, maxB = -Infinity;

      for (let i = 0; i < 4; i++) {
        const pA = corners[i].x * axis.x + corners[i].y * axis.y;
        if (pA < minA) minA = pA;
        if (pA > maxA) maxA = pA;

        const pB = bCorners[i].x * axis.x + bCorners[i].y * axis.y;
        if (pB < minB) minB = pB;
        if (pB > maxB) maxB = pB;
      }

      const overlap = Math.min(maxA, maxB) - Math.max(minA, minB);
      if (overlap <= 0) return null;
      if (overlap < minOverlap) {
        minOverlap = overlap;
        smallestAxis = axis;
      }
    }

    const bCenterX = b.x + b.w * 0.5;
    const bCenterY = b.y + b.h * 0.5;
    const dirX = v.x - bCenterX;
    const dirY = v.y - bCenterY;
    const sign = dirX * smallestAxis.x + dirY * smallestAxis.y < 0 ? -1 : 1;

    return {
      nx: smallestAxis.x * sign,
      ny: smallestAxis.y * sign,
      depth: minOverlap
    };
  }

  function resolveVehicleBuildings(v, onImpact) {
    let hitBuilding = false;
    let maxImpact = 0;

    const margin = Math.max(v.length, v.width) * 0.45;
    if (v.x < margin) { v.x = margin; v.vx = Math.max(0, v.vx); hitBuilding = true; }
    if (v.x > cfg.width - margin) { v.x = cfg.width - margin; v.vx = Math.min(0, v.vx); hitBuilding = true; }
    if (v.y < margin) { v.y = margin; v.vy = Math.max(0, v.vy); hitBuilding = true; }
    if (v.y > cfg.height - margin) { v.y = cfg.height - margin; v.vy = Math.min(0, v.vy); hitBuilding = true; }

    for (let i = 0; i < World.buildings.length; i++) {
      const b = World.buildings[i];
      const mtv = getAABBOverlap(v, b);
      if (mtv) {
        v.x += mtv.nx * mtv.depth;
        v.y += mtv.ny * mtv.depth;

        const vn = v.vx * mtv.nx + v.vy * mtv.ny;
        if (vn < 0) {
          const impact = Math.abs(vn);
          if (impact > maxImpact) maxImpact = impact;
          v.vx -= vn * mtv.nx * 1.15;
          v.vy -= vn * mtv.ny * 1.15;
          v.vx *= 0.86;
          v.vy *= 0.86;
          const forwardX = Math.cos(v.angle);
          const forwardY = Math.sin(v.angle);
          v.speed = v.vx * forwardX + v.vy * forwardY;
          hitBuilding = true;
        }
      }
    }

    if (hitBuilding && maxImpact > 70) {
      v.hp = Math.max(15, v.hp - maxImpact * 0.045);
      if (typeof onImpact === 'function') {
        onImpact(v.x, v.y, clamp(maxImpact / 280, 0.2, 1));
      }
    }
  }

  function getOBBOverlap(v1, v2) {
    const distApprox = Math.hypot(v1.x - v2.x, v1.y - v2.y);
    if (distApprox > (v1.length + v2.length) * 0.65) return null;

    const c1 = getVehicleCorners(v1);
    const c2 = getVehicleCorners(v2);

    const axes = [
      { x: Math.cos(v1.angle), y: Math.sin(v1.angle) },
      { x: -Math.sin(v1.angle), y: Math.cos(v1.angle) },
      { x: Math.cos(v2.angle), y: Math.sin(v2.angle) },
      { x: -Math.sin(v2.angle), y: Math.cos(v2.angle) }
    ];

    let minOverlap = Infinity;
    let smallestAxis = null;

    for (let a = 0; a < 4; a++) {
      const axis = axes[a];
      let min1 = Infinity, max1 = -Infinity;
      let min2 = Infinity, max2 = -Infinity;

      for (let i = 0; i < 4; i++) {
        const p1 = c1[i].x * axis.x + c1[i].y * axis.y;
        if (p1 < min1) min1 = p1;
        if (p1 > max1) max1 = p1;

        const p2 = c2[i].x * axis.x + c2[i].y * axis.y;
        if (p2 < min2) min2 = p2;
        if (p2 > max2) max2 = p2;
      }

      const overlap = Math.min(max1, max2) - Math.max(min1, min2);
      if (overlap <= 0) return null;
      if (overlap < minOverlap) {
        minOverlap = overlap;
        smallestAxis = axis;
      }
    }

    const dx = v2.x - v1.x;
    const dy = v2.y - v1.y;
    const sign = dx * smallestAxis.x + dy * smallestAxis.y < 0 ? -1 : 1;

    return {
      nx: smallestAxis.x * sign,
      ny: smallestAxis.y * sign,
      depth: minOverlap
    };
  }

  function resolveVehicleCollisions(vehicles, playerVehicle, onCrash) {
    const n = vehicles.length;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const a = vehicles[i];
        const b = vehicles[j];
        const mtv = getOBBOverlap(a, b);
        if (!mtv) continue;

        const totalMass = a.mass + b.mass;
        const ratioA = b.mass / totalMass;
        const ratioB = a.mass / totalMass;

        a.x -= mtv.nx * mtv.depth * ratioA;
        a.y -= mtv.ny * mtv.depth * ratioA;
        b.x += mtv.nx * mtv.depth * ratioB;
        b.y += mtv.ny * mtv.depth * ratioB;

        const rvx = b.vx - a.vx;
        const rvy = b.vy - a.vy;
        const velAlongNormal = rvx * mtv.nx + rvy * mtv.ny;

        if (velAlongNormal < 0) {
          const restitution = 0.35;
          const jImpulse = (-(1 + restitution) * velAlongNormal) / (1 / a.mass + 1 / b.mass);
          const impulseX = jImpulse * mtv.nx;
          const impulseY = jImpulse * mtv.ny;

          a.vx -= impulseX / a.mass;
          a.vy -= impulseY / a.mass;
          b.vx += impulseX / b.mass;
          b.vy += impulseY / b.mass;

          a.speed = a.vx * Math.cos(a.angle) + a.vy * Math.sin(a.angle);
          b.speed = b.vx * Math.cos(b.angle) + b.vy * Math.sin(b.angle);

          if (!a.isRoadblock) a.isParked = false;
          if (!b.isRoadblock) b.isParked = false;
          if (a.isAI && !a.isRoadblock) a.stunTimer = 0.55;
          if (b.isAI && !b.isRoadblock) b.stunTimer = 0.55;

          const impactSpeed = Math.abs(velAlongNormal);
          if (impactSpeed > 42) {
            const dmg = impactSpeed * 0.065;
            a.hp = Math.max(15, a.hp - dmg * ratioA);
            b.hp = Math.max(15, b.hp - dmg * ratioB);

            if (typeof onCrash === 'function') {
              const involvesPlayer = a === playerVehicle || b === playerVehicle;
              const involvesPolice = a.isPolice || b.isPolice;
              onCrash({
                x: (a.x + b.x) * 0.5,
                y: (a.y + b.y) * 0.5,
                intensity: clamp(impactSpeed / 260, 0.25, 1),
                impactSpeed,
                involvesPlayer,
                involvesPolice
              });
            }
          }
        }
      }
    }
  }

  function findSafeExitSpot(v, vehicles) {
    const perpX = -Math.sin(v.angle);
    const perpY = Math.cos(v.angle);
    const backX = -Math.cos(v.angle);
    const backY = -Math.sin(v.angle);
    const sideOffset = v.width * 0.5 + 16;

    const candidates = [
      { x: v.x - perpX * sideOffset, y: v.y - perpY * sideOffset },
      { x: v.x + perpX * sideOffset, y: v.y + perpY * sideOffset },
      { x: v.x + backX * (v.length * 0.5 + 16), y: v.y + backY * (v.length * 0.5 + 16) }
    ];

    for (let i = 0; i < candidates.length; i++) {
      const c = candidates[i];
      if (
        c.x < 16 || c.x > cfg.width - 16 ||
        c.y < 16 || c.y > cfg.height - 16
      ) {
        continue;
      }
      if (collidesBuildingCircle(c.x, c.y, 10)) continue;

      const blockedByCar = vehicles.some(
        (other) => other !== v && Math.hypot(other.x - c.x, other.y - c.y) < 24
      );
      if (!blockedByCar) return c;
    }

    return {
      x: clamp(v.x - perpX * sideOffset, 16, cfg.width - 16),
      y: clamp(v.y - perpY * sideOffset, 16, cfg.height - 16)
    };
  }

  return {
    clamp,
    normalizeAngle,
    hasLineOfSight,
    collidesBuildingCircle,
    moveCircleEntity,
    resolveVehicleBuildings,
    resolveVehicleCollisions,
    findSafeExitSpot
  };
})();
