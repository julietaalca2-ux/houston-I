window.CiudadCero = window.CiudadCero || {};

/*
 * CityArt (v0.7.5)
 * Dibujo procedural de fachadas, techos, parques, árboles, veredas por barrio
 * y capa base del minimapa. Todo se dibuja UNA sola vez en las caches estáticas
 * del mapa, por lo que no agrega costo por fotograma (ideal para celulares).
 */
CiudadCero.CityArt = (() => {
  const Config = CiudadCero.Config;
  const wCfg = Config.WORLD;

  let detail = 1; // 1 = alta, 0.5 = rendimiento
  function setDetail(q) {
    detail = q === 'performance' ? 0.5 : 1;
  }
  function getDetail() {
    return detail;
  }

  /* ---------- utilidades de color y azar ---------- */
  const hexCache = new Map();
  function rgb(h) {
    let v = hexCache.get(h);
    if (v) return v;
    const s = h.replace('#', '');
    v = [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
    hexCache.set(h, v);
    return v;
  }
  function toHex(a) {
    const f = (n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
    return '#' + f(a[0]) + f(a[1]) + f(a[2]);
  }
  function mix(a, b, t) {
    const A = rgb(a);
    const B = rgb(b);
    return toHex([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t]);
  }
  function tone(h, amt) {
    return amt >= 0 ? mix(h, '#ffffff', amt) : mix(h, '#000000', -amt);
  }
  function rng(seed) {
    let s = (seed >>> 0) || 1;
    return () => {
      s |= 0;
      s = (s + 0x6d2b79f5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function pick(arr, r) {
    return arr[Math.floor(r() * arr.length) % arr.length];
  }
  function rr(c, x, y, w, h, rad) {
    rad = Math.min(rad, w / 2, h / 2);
    c.beginPath();
    c.moveTo(x + rad, y);
    c.lineTo(x + w - rad, y);
    c.quadraticCurveTo(x + w, y, x + w, y + rad);
    c.lineTo(x + w, y + h - rad);
    c.quadraticCurveTo(x + w, y + h, x + w - rad, y + h);
    c.lineTo(x + rad, y + h);
    c.quadraticCurveTo(x, y + h, x, y + h - rad);
    c.lineTo(x, y + rad);
    c.quadraticCurveTo(x, y, x + rad, y);
    c.closePath();
  }
  function ell(c, x, y, rx, ry, col) {
    c.fillStyle = col;
    c.beginPath();
    c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    c.fill();
  }
  function circ(c, x, y, r, col) {
    c.fillStyle = col;
    c.beginPath();
    c.arc(x, y, r, 0, Math.PI * 2);
    c.fill();
  }

  /* ---------- paletas por barrio ---------- */
  const PAL = {
    residencial: {
      walls: ['#c9a58a', '#d8c7a5', '#b9c7bf', '#c7b0a6', '#d9b99b', '#a9b8c4', '#cfc08e'],
      roofs: ['#8b4a3a', '#6e4a3c', '#5d6b73', '#7b5a3e', '#8f5d49'],
      trim: '#efe9dc',
      grass: ['#3f6b3a', '#4a7a42']
    },
    centro: {
      glass: ['#4c7896', '#3f6a8a', '#5a86a3', '#35607f'],
      roofs: ['#4a5d6b', '#3f505c', '#55687a'],
      grass: ['#3f6b3a', '#4a7a42']
    },
    comercial: {
      walls: ['#d9c7a0', '#cfa2a0', '#a8c2c0', '#d8b97c', '#b7a7cf'],
      roofs: ['#6b6559', '#5f5b66', '#695d5b'],
      awnings: ['#e2453c', '#f0b429', '#2f9e8f', '#3a7bd5', '#d6559b'],
      grass: ['#4a8040', '#58944c']
    },
    portuaria: {
      walls: ['#8b9aa0', '#7c8d94', '#95a0a2', '#8a8f86'],
      roofs: ['#5e7078', '#667a82', '#56666d'],
      grass: ['#3b6340', '#4a7448']
    },
    industrial: {
      walls: ['#8b8279', '#7f858a', '#938a7c', '#76706a'],
      roofs: ['#5d5a57', '#666462', '#54504c'],
      grass: ['#3d5a3a', '#4a6b44']
    },
    periferia: {
      walls: ['#d6c6a2', '#c4b79a', '#b7c4a8', '#d3b79c'],
      roofs: ['#9a5f45', '#7e6a55', '#6d7d68', '#8c6a4e'],
      grass: ['#4d7a3d', '#5f8f48']
    }
  };

  /* ---------- árboles ---------- */
  const SPECIES = {
    oak: { leaf: ['#244f2a', '#356b37', '#4f8c4a', '#7eb56a'], trunk: '#5b4030' },
    maple: { leaf: ['#6e2f1a', '#a8472a', '#d17a35', '#efb04e'], trunk: '#4d382b' },
    blossom: { leaf: ['#8f4668', '#c8749c', '#eba5c6', '#fbd3e3'], trunk: '#4a3a33' },
    olive: { leaf: ['#4b5d3a', '#67805a', '#8aa379', '#b4c79f'], trunk: '#6a5846' },
    pine: { leaf: ['#16392a', '#1f5037', '#2f6e49', '#4a8f60'], trunk: '#4a3426' },
    poplar: { leaf: ['#2a5a30', '#3b7a40', '#5a9a52', '#86bd6c'], trunk: '#5a4636' },
    palm: { leaf: ['#25602f', '#359042', '#58b05a', '#8ed07a'], trunk: '#8a6e4b' }
  };

  function drawTree(c, x, y, r, species, seed) {
    const sp = SPECIES[species] || SPECIES.oak;
    const R = rng(seed || 7);
    const L = sp.leaf;
    // sombra proyectada
    c.fillStyle = 'rgba(0,0,0,0.26)';
    c.beginPath();
    c.ellipse(x + r * 0.55, y + r * 0.45, r * (species === 'poplar' ? 0.55 : 1.0), r * 0.62, 0.35, 0, Math.PI * 2);
    c.fill();

    if (species === 'pine') {
      // tronco
      c.fillStyle = sp.trunk;
      c.fillRect(x - r * 0.1, y - r * 0.3, r * 0.2, r * 0.45);
      const tiers = 4;
      for (let t = 0; t < tiers; t++) {
        const k = 1 - t * 0.2;
        const baseY = y - r * 0.2 - t * r * 0.42;
        const hw = r * 0.92 * k;
        const hh = r * 0.8;
        c.fillStyle = L[0];
        c.beginPath();
        c.moveTo(x - hw, baseY);
        c.lineTo(x, baseY - hh);
        c.lineTo(x + hw, baseY);
        c.closePath();
        c.fill();
        c.fillStyle = L[2];
        c.beginPath();
        c.moveTo(x - hw, baseY);
        c.lineTo(x, baseY - hh);
        c.lineTo(x - hw * 0.1, baseY);
        c.closePath();
        c.fill();
        c.fillStyle = 'rgba(0,0,0,0.18)';
        c.beginPath();
        c.moveTo(x + hw * 0.1, baseY);
        c.lineTo(x, baseY - hh);
        c.lineTo(x + hw, baseY);
        c.closePath();
        c.fill();
      }
      circ(c, x - r * 0.12, y - r * 1.6, r * 0.12, L[3]);
      return;
    }

    if (species === 'palm') {
      const th = r * 1.5;
      // tronco curvo con anillos
      c.strokeStyle = sp.trunk;
      c.lineWidth = Math.max(2, r * 0.26);
      c.lineCap = 'round';
      c.beginPath();
      c.moveTo(x, y);
      c.quadraticCurveTo(x + r * 0.35, y - th * 0.55, x + r * 0.15, y - th);
      c.stroke();
      c.strokeStyle = 'rgba(40,28,16,0.45)';
      c.lineWidth = 1;
      for (let k = 1; k < 6; k++) {
        const ty = y - (th / 6) * k;
        c.beginPath();
        c.moveTo(x + r * 0.03 * k - r * 0.12, ty);
        c.lineTo(x + r * 0.03 * k + r * 0.18, ty);
        c.stroke();
      }
      c.lineCap = 'butt';
      const tx = x + r * 0.15;
      const ty = y - th;
      const n = 9;
      for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2 + R() * 0.3;
        const len = r * (0.95 + R() * 0.25);
        const ex = tx + Math.cos(a) * len;
        const ey = ty + Math.sin(a) * len * 0.62 + r * 0.22;
        c.strokeStyle = k % 2 ? L[1] : L[2];
        c.lineWidth = r * 0.34;
        c.lineCap = 'round';
        c.beginPath();
        c.moveTo(tx, ty);
        c.quadraticCurveTo((tx + ex) / 2, ty - r * 0.35, ex, ey);
        c.stroke();
        c.strokeStyle = L[3];
        c.lineWidth = 1;
        c.beginPath();
        c.moveTo(tx, ty);
        c.quadraticCurveTo((tx + ex) / 2, ty - r * 0.35, ex, ey);
        c.stroke();
      }
      c.lineCap = 'butt';
      circ(c, tx, ty, r * 0.2, '#6b4a22');
      return;
    }

    // tronco con base ensanchada y corteza
    const th = r * 0.7;
    c.fillStyle = sp.trunk;
    c.beginPath();
    c.moveTo(x - r * 0.26, y + 1);
    c.lineTo(x - r * 0.13, y - th);
    c.lineTo(x + r * 0.13, y - th);
    c.lineTo(x + r * 0.26, y + 1);
    c.closePath();
    c.fill();
    c.fillStyle = 'rgba(255,255,255,0.14)';
    c.fillRect(x - r * 0.2, y - th * 0.9, r * 0.1, th * 0.9);
    c.strokeStyle = 'rgba(20,12,6,0.5)';
    c.lineWidth = 0.8;
    for (let k = 0; k < 3; k++) {
      c.beginPath();
      c.moveTo(x - r * 0.07 + k * r * 0.09, y - 1);
      c.lineTo(x - r * 0.05 + k * r * 0.09, y - th * 0.8);
      c.stroke();
    }

    const cy = y - th - r * 0.45;
    if (species === 'poplar') {
      const ry = r * 1.35;
      ell(c, x, cy - r * 0.2, r * 0.52, ry, L[0]);
      ell(c, x - r * 0.1, cy - r * 0.3, r * 0.4, ry * 0.82, L[1]);
      ell(c, x - r * 0.16, cy - r * 0.5, r * 0.24, ry * 0.55, L[2]);
      for (let k = 0; k < 7; k++) {
        circ(c, x - r * 0.3 + R() * r * 0.5, cy - ry * 0.9 + R() * ry * 1.4, 1.1, L[3]);
      }
      return;
    }

    // copa con volumen: lóbulos oscuros -> medios -> claros
    const lobes = species === 'olive' ? 6 : 8;
    for (let k = 0; k < lobes; k++) {
      const a = (k / lobes) * Math.PI * 2 + R() * 0.5;
      const d = r * (0.42 + R() * 0.16);
      circ(c, x + Math.cos(a) * d, cy + Math.sin(a) * d * 0.9, r * (0.5 + R() * 0.14), L[0]);
    }
    circ(c, x, cy, r * 0.72, L[0]);
    for (let k = 0; k < lobes - 1; k++) {
      const a = (k / lobes) * Math.PI * 2 + R();
      const d = r * (0.3 + R() * 0.15);
      circ(c, x - r * 0.1 + Math.cos(a) * d, cy - r * 0.12 + Math.sin(a) * d * 0.85, r * (0.4 + R() * 0.1), L[1]);
    }
    circ(c, x - r * 0.22, cy - r * 0.26, r * 0.42, L[2]);
    if (detail > 0.7) {
      for (let k = 0; k < 6; k++) {
        circ(c, x - r * 0.55 + R() * r * 0.8, cy - r * 0.6 + R() * r * 0.7, r * (0.1 + R() * 0.1), L[3]);
      }
      // sombra interna inferior derecha
      c.fillStyle = 'rgba(0,0,0,0.16)';
      c.beginPath();
      c.arc(x + r * 0.12, cy + r * 0.2, r * 0.7, -0.2, Math.PI * 0.75);
      c.arc(x - r * 0.05, cy + r * 0.05, r * 0.5, Math.PI * 0.75, -0.2, true);
      c.fill();
    }
    if (species === 'blossom' && detail > 0.7) {
      for (let k = 0; k < 9; k++) {
        circ(c, x - r * 0.6 + R() * r * 1.2, cy - r * 0.6 + R() * r * 1.1, 1.2, '#fff4f8');
      }
    }
  }

  function drawBush(c, x, y, r, seed, flowerCol) {
    const R = rng(seed || 3);
    ell(c, x + r * 0.35, y + r * 0.35, r * 1.0, r * 0.6, 'rgba(0,0,0,0.24)');
    circ(c, x - r * 0.45, y, r * 0.62, '#2b5a2f');
    circ(c, x + r * 0.45, y + r * 0.05, r * 0.6, '#2b5a2f');
    circ(c, x, y - r * 0.2, r * 0.72, '#356b37');
    circ(c, x - r * 0.2, y - r * 0.35, r * 0.44, '#4c8a49');
    circ(c, x - r * 0.3, y - r * 0.45, r * 0.2, '#79b265');
    if (flowerCol) {
      for (let k = 0; k < 5; k++) {
        circ(c, x - r * 0.6 + R() * r * 1.2, y - r * 0.7 + R() * r * 1.0, 1.1, flowerCol);
      }
    }
  }

  function drawFlowerBed(c, x, y, w, h, seed, kind) {
    const R = rng(seed || 5);
    rr(c, x - 1, y - 1, w + 2, h + 2, 4);
    c.fillStyle = '#6d6a60';
    c.fill();
    rr(c, x, y, w, h, 3.5);
    c.fillStyle = '#4a3526';
    c.fill();
    const cols = kind === 'warm' ? ['#e8453c', '#f5a623', '#ffd84a', '#ff7b54'] : ['#d6559b', '#9b6bd6', '#ffffff', '#f5d94b', '#ff6b6b'];
    const n = Math.round((w * h) / 18);
    for (let k = 0; k < n; k++) {
      const fx = x + 2 + R() * (w - 4);
      const fy = y + 2 + R() * (h - 4);
      circ(c, fx, fy, 0.9 + R() * 0.8, '#2f6a35');
      circ(c, fx, fy - 0.4, 0.9 + R() * 0.6, pick(cols, R));
    }
  }

  function drawBench(c, x, y, horizontal) {
    c.save();
    c.translate(x, y);
    if (!horizontal) c.rotate(Math.PI / 2);
    c.fillStyle = 'rgba(0,0,0,0.26)';
    c.fillRect(-8, -1.5, 18, 6);
    c.fillStyle = '#3b3f3d';
    c.fillRect(-8, -3, 2, 6);
    c.fillRect(6, -3, 2, 6);
    c.fillStyle = '#8a5a34';
    c.fillRect(-9, -2.6, 18, 2.2);
    c.fillStyle = '#a06c40';
    c.fillRect(-9, -0.2, 18, 2.2);
    c.fillStyle = '#5a3a20';
    c.fillRect(-9, -3.4, 18, 0.9);
    c.restore();
  }

  function drawLamp(c, x, y) {
    ell(c, x + 2, y + 2, 3, 1.6, 'rgba(0,0,0,0.3)');
    circ(c, x, y, 2.3, '#2e3532');
    circ(c, x, y, 1.1, '#fff1b8');
    if (detail > 0.7) {
      c.fillStyle = 'rgba(255,230,150,0.10)';
      c.beginPath();
      c.arc(x, y, 13, 0, Math.PI * 2);
      c.fill();
    }
  }

  /* ---------- césped texturizado ---------- */
  function drawGrass(c, x, y, w, h, seed, cols) {
    const R = rng(seed);
    c.fillStyle = cols[0];
    c.fillRect(x, y, w, h);
    // franjas de corte
    c.fillStyle = 'rgba(255,255,255,0.045)';
    for (let yy = y; yy < y + h; yy += 12) c.fillRect(x, yy, w, 6);
    // manchas
    for (let k = 0; k < 6; k++) {
      ell(c, x + R() * w, y + R() * h, 8 + R() * 14, 5 + R() * 9, R() > 0.5 ? 'rgba(0,0,0,0.07)' : 'rgba(255,255,255,0.05)');
    }
    const n = Math.round(((w * h) / 34) * detail);
    for (let k = 0; k < n; k++) {
      const gx = x + R() * w;
      const gy = y + R() * h;
      c.fillStyle = R() > 0.5 ? cols[1] : 'rgba(10,40,12,0.35)';
      c.fillRect(gx, gy, 1, 2 + R() * 1.5);
    }
  }

  /* ---------- parques ---------- */
  function drawHedgeBorder(c, x, y, w, h, gap) {
    c.fillStyle = '#244d2a';
    const t = 5;
    const seg = (sx, sy, sw, sh) => {
      rr(c, sx, sy, sw, sh, 2.5);
      c.fill();
    };
    // gap = aperturas centradas en cada lado
    const hw = (w - gap) / 2;
    const hh = (h - gap) / 2;
    seg(x, y, hw, t);
    seg(x + hw + gap, y, hw, t);
    seg(x, y + h - t, hw, t);
    seg(x + hw + gap, y + h - t, hw, t);
    seg(x, y, t, hh);
    seg(x, y + hh + gap, t, hh);
    seg(x + w - t, y, t, hh);
    seg(x + w - t, y + hh + gap, t, hh);
    c.fillStyle = 'rgba(120,190,110,0.35)';
    c.fillRect(x + 2, y + 1, hw - 4, 1.2);
    c.fillRect(x + hw + gap + 2, y + 1, hw - 4, 1.2);
  }

  function pathStroke(c, pts, width, base, edge) {
    const draw = (lw, col) => {
      c.strokeStyle = col;
      c.lineWidth = lw;
      c.lineCap = 'round';
      c.lineJoin = 'round';
      c.beginPath();
      c.moveTo(pts[0][0], pts[0][1]);
      for (let k = 1; k < pts.length; k++) {
        const p = pts[k];
        if (p.length === 4) c.quadraticCurveTo(p[0], p[1], p[2], p[3]);
        else c.lineTo(p[0], p[1]);
      }
      c.stroke();
    };
    draw(width + 3, edge);
    draw(width, base);
    c.lineCap = 'butt';
  }

  function drawPond(c, x, y, rx, ry, seed) {
    const R = rng(seed);
    ell(c, x, y, rx + 3, ry + 3, '#6f7168');
    ell(c, x, y, rx + 1.5, ry + 1.5, '#8e9185');
    ell(c, x, y, rx, ry, '#2b6b82');
    ell(c, x - rx * 0.15, y - ry * 0.15, rx * 0.8, ry * 0.75, '#3b8aa3');
    c.strokeStyle = 'rgba(255,255,255,0.28)';
    c.lineWidth = 1;
    c.beginPath();
    c.ellipse(x - rx * 0.25, y - ry * 0.2, rx * 0.35, ry * 0.2, 0, 3.4, 5.4);
    c.stroke();
    for (let k = 0; k < 4; k++) {
      const a = R() * 6.28;
      const lx = x + Math.cos(a) * rx * 0.5;
      const ly = y + Math.sin(a) * ry * 0.5;
      circ(c, lx, ly, 2.6, '#3f8f4a');
      circ(c, lx - 0.6, ly - 0.6, 1, '#f7a8c8');
    }
  }

  function drawFountain(c, x, y, r) {
    circ(c, x, y, r + 3, '#9aa29f');
    circ(c, x, y, r + 1, '#6f7a77');
    circ(c, x, y, r, '#3f8fb0');
    circ(c, x - r * 0.15, y - r * 0.15, r * 0.75, '#6cc0dc');
    c.strokeStyle = 'rgba(255,255,255,0.5)';
    c.lineWidth = 1;
    for (let k = 1; k < 3; k++) {
      c.beginPath();
      c.arc(x, y, r * (0.35 + k * 0.22), 0.4, 2.4);
      c.stroke();
    }
    circ(c, x, y, r * 0.26, '#cdd6d2');
    circ(c, x, y, r * 0.14, '#e9fbff');
  }

  function drawPark(c, p, idx) {
    const seed = Math.floor(p.x * 13 + p.y * 7 + 11);
    const R = rng(seed);
    const dId = p.districtId || 'residencial';
    const pal = (PAL[dId] || PAL.residencial).grass;
    const kind = p.isPlaza ? 'plaza' : p.sizeClass || 'medium';
    const trees = [];
    const bushes = [];
    const speciesPool = dId === 'periferia' ? ['oak', 'pine', 'olive', 'poplar'] : dId === 'comercial' ? ['blossom', 'palm', 'oak'] : dId === 'centro' ? ['poplar', 'oak', 'blossom'] : ['oak', 'maple', 'oak', 'blossom', 'poplar'];

    let X = p.x;
    let Y = p.y;
    let W = p.w;
    let H = p.h;

    if (kind === 'plaza') {
      // Plaza dura con adoquín, anillo y fuente
      c.fillStyle = '#586166';
      c.fillRect(X, Y, W, H);
      for (let yy = 0; yy < H; yy += 10) {
        for (let xx = 0; xx < W; xx += 10) {
          const on = ((xx + yy) / 10) % 2 === 0;
          c.fillStyle = on ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.07)';
          c.fillRect(X + xx, Y + yy, 10, 10);
        }
      }
      c.strokeStyle = '#98a8ab';
      c.lineWidth = 2;
      c.strokeRect(X + 3, Y + 3, W - 6, H - 6);
      c.strokeStyle = 'rgba(0,0,0,0.25)';
      c.lineWidth = 1;
      c.strokeRect(X + 7, Y + 7, W - 14, H - 14);
      const cx = X + W * 0.5;
      const cy = Y + H * 0.5;
      // rotonda de adoquines
      circ(c, cx, cy, 36, '#697478');
      circ(c, cx, cy, 31, '#7a868a');
      c.strokeStyle = 'rgba(0,0,0,0.22)';
      c.lineWidth = 1;
      for (let a = 0; a < 16; a++) {
        const an = (a / 16) * Math.PI * 2;
        c.beginPath();
        c.moveTo(cx + Math.cos(an) * 20, cy + Math.sin(an) * 20);
        c.lineTo(cx + Math.cos(an) * 31, cy + Math.sin(an) * 31);
        c.stroke();
      }
      drawFountain(c, cx, cy, 17);
      // canteros en las esquinas
      const corners = [
        [X + 13, Y + 13],
        [X + W - 33, Y + 13],
        [X + 13, Y + H - 33],
        [X + W - 33, Y + H - 33]
      ];
      corners.forEach((q, k) => {
        rr(c, q[0], q[1], 20, 20, 4);
        c.fillStyle = '#8c968f';
        c.fill();
        rr(c, q[0] + 2, q[1] + 2, 16, 16, 3);
        c.fillStyle = '#3d6a3c';
        c.fill();
        bushes.push([q[0] + 10, q[1] + 12, 5, k + seed, k % 2 ? '#ffd84a' : '#ff7b9c']);
        trees.push([q[0] + 10, q[1] + 10, 9, pick(speciesPool, R), seed + k * 31]);
      });
      drawBench(c, cx - 30, Y + 13, true);
      drawBench(c, cx + 30, Y + H - 13, true);
      drawBench(c, X + 13, cy, false);
      drawBench(c, X + W - 13, cy, false);
      drawLamp(c, cx - 26, cy - 26);
      drawLamp(c, cx + 26, cy - 26);
      drawLamp(c, cx - 26, cy + 26);
      drawLamp(c, cx + 26, cy + 26);
    } else if (kind === 'large') {
      // Parque grande: se extiende sobre la vereda, borde con seto y caminos
      const e = Math.max(2, (wCfg.sidewalkWidth || 22) - 6);
      X -= e;
      Y -= e;
      W += e * 2;
      H += e * 2;
      drawGrass(c, X, Y, W, H, seed, pal);
      drawHedgeBorder(c, X + 1, Y + 1, W - 2, H - 2, 26);
      const cx = X + W * 0.5;
      const cy = Y + H * 0.5;
      // camino cruzado curvo + anillo central
      pathStroke(c, [[cx, Y], [cx + 14, cy - 30, cx, cy], [cx - 14, cy + 30, cx, Y + H]], 12, '#cdb98a', '#8f7d55');
      pathStroke(c, [[X, cy], [cx - 30, cy - 14, cx, cy], [cx + 30, cy + 14, X + W, cy]], 12, '#cdb98a', '#8f7d55');
      circ(c, cx, cy, 30, '#8f7d55');
      circ(c, cx, cy, 27, '#d8c795');
      drawFountain(c, cx, cy, 15);
      // canteros de flores en los cuatro cuadrantes
      drawFlowerBed(c, X + 14, Y + 14, 26, 14, seed + 1, 'warm');
      drawFlowerBed(c, X + W - 40, Y + H - 28, 26, 14, seed + 2, 'cool');
      drawFlowerBed(c, X + W - 40, Y + 14, 26, 14, seed + 3, 'cool');
      drawFlowerBed(c, X + 14, Y + H - 28, 26, 14, seed + 4, 'warm');
      // estanque
      drawPond(c, X + W - 34, Y + H * 0.5 - 28 + 56, 15, 10, seed + 9);
      // bancos, farolas
      drawBench(c, cx - 22, cy - 38, true);
      drawBench(c, cx + 22, cy + 38, true);
      drawBench(c, cx - 38, cy + 22, false);
      drawBench(c, cx + 38, cy - 22, false);
      drawLamp(c, cx - 34, cy - 34);
      drawLamp(c, cx + 34, cy + 34);
      drawLamp(c, cx + 34, cy - 34);
      drawLamp(c, cx - 34, cy + 34);
      drawLamp(c, cx, Y + 14);
      drawLamp(c, cx, Y + H - 14);
      // arboles variados, grandes, medianos, chicos
      const spots = [
        [X + 20, Y + 40, 12], [X + 44, Y + 24, 9], [X + W - 22, Y + 44, 13], [X + W - 46, Y + 26, 8],
        [X + 22, Y + H - 40, 12], [X + 48, Y + H - 22, 8], [X + W - 24, Y + H - 44, 11],
        [cx - 52, cy - 52, 10], [cx + 52, cy - 50, 14], [cx - 54, cy + 54, 13], [cx + 54, cy + 52, 9]
      ];
      spots.forEach((s, k) => trees.push([s[0], s[1], s[2], pick(speciesPool, R), seed + k * 17]));
      for (let k = 0; k < 9; k++) {
        bushes.push([X + 12 + R() * (W - 24), Y + 12 + R() * (H - 24), 3 + R() * 2.5, seed + k, k % 3 === 0 ? '#ffd84a' : null]);
      }
    } else if (kind === 'medium') {
      drawGrass(c, X, Y, W, H, seed, pal);
      drawHedgeBorder(c, X + 1, Y + 1, W - 2, H - 2, 20);
      const cx = X + W * 0.5;
      const cy = Y + H * 0.5;
      // sendero diagonal ondulado
      pathStroke(c, [[X, Y + 8], [cx - 20, cy + 6, cx, cy], [cx + 22, cy - 8, X + W, Y + H - 8]], 10, '#cdb98a', '#8f7d55');
      pathStroke(c, [[X + W, Y + 8], [cx + 6, cy - 14, cx, cy]], 7, '#c5b17f', '#8f7d55');
      // glorieta / mirador
      circ(c, cx, cy, 14, '#8f7d55');
      circ(c, cx, cy, 12, '#d8c795');
      if (R() > 0.5) {
        circ(c, cx, cy, 8, '#7a4f33');
        circ(c, cx, cy, 6.5, '#a0623c');
        c.strokeStyle = '#4a2e1c';
        c.lineWidth = 1;
        c.beginPath();
        c.moveTo(cx - 6.5, cy);
        c.lineTo(cx + 6.5, cy);
        c.moveTo(cx, cy - 6.5);
        c.lineTo(cx, cy + 6.5);
        c.stroke();
      } else {
        drawFountain(c, cx, cy, 8);
      }
      drawFlowerBed(c, X + 12, Y + H - 28, 24, 13, seed + 4, 'warm');
      drawFlowerBed(c, X + W - 36, Y + 14, 24, 13, seed + 5, 'cool');
      if (R() > 0.4) drawPond(c, X + W - 30, Y + H - 24, 12, 8, seed + 6);
      drawBench(c, cx - 22, cy + 14, true);
      drawBench(c, cx + 22, cy - 14, true);
      drawLamp(c, cx - 20, cy - 20);
      drawLamp(c, cx + 20, cy + 20);
      const spots = [
        [X + 18, Y + 34, 11], [X + 40, Y + 20, 8], [X + W - 20, Y + 40, 12],
        [X + 20, Y + H - 26, 10], [X + W - 22, Y + H - 40, 9], [cx + 30, cy + 34, 7], [cx - 34, cy - 30, 8]
      ];
      spots.forEach((s, k) => trees.push([s[0], s[1], s[2], pick(speciesPool, R), seed + k * 19]));
      for (let k = 0; k < 6; k++) {
        bushes.push([X + 10 + R() * (W - 20), Y + 10 + R() * (H - 20), 3 + R() * 2, seed + k, k % 2 ? '#ff7b9c' : null]);
      }
    } else {
      // pequeño / pradera con caminito de tierra
      drawGrass(c, X, Y, W, H, seed, pal);
      // flores silvestres
      for (let k = 0; k < Math.round(40 * detail); k++) {
        circ(c, X + 4 + R() * (W - 8), Y + 4 + R() * (H - 8), 0.9, pick(['#ffe66b', '#ffffff', '#ff8fb0', '#b69cff'], R));
      }
      pathStroke(c, [[X + 6, Y + H - 10], [X + W * 0.4, Y + H * 0.55, X + W * 0.7, Y + H * 0.35], [X + W - 6, Y + 12]], 6, '#a58a60', '#6b5738');
      // cerca de madera
      c.strokeStyle = '#6b4a2a';
      c.lineWidth = 1.5;
      c.strokeRect(X + 2, Y + 2, W - 4, H - 4);
      c.fillStyle = '#8a6238';
      for (let xx = X + 6; xx < X + W - 4; xx += 10) {
        c.fillRect(xx, Y + 1, 2, 4);
        c.fillRect(xx, Y + H - 5, 2, 4);
      }
      drawBench(c, X + W * 0.28, Y + H * 0.72, true);
      drawLamp(c, X + 12, Y + 12);
      const spots = [[X + 20, Y + 24, 9], [X + W - 22, Y + H - 28, 11], [X + W - 26, Y + 22, 7], [X + 26, Y + H - 26, 7]];
      spots.forEach((s, k) => trees.push([s[0], s[1], s[2], pick(speciesPool, R), seed + k * 23]));
      for (let k = 0; k < 4; k++) {
        bushes.push([X + 10 + R() * (W - 20), Y + 10 + R() * (H - 20), 3 + R() * 2, seed + k, '#ffd84a']);
      }
    }

    bushes.sort((a, b) => a[1] - b[1]);
    bushes.forEach((b) => drawBush(c, b[0], b[1], b[2], b[3], b[4]));
    trees.sort((a, b) => a[1] - b[1]);
    trees.forEach((t) => drawTree(c, t[0], t[1], t[2], t[3], t[4]));
  }

  /* ---------- edificios ---------- */
  function shadow(c, x, y, w, h, depth) {
    c.fillStyle = 'rgba(0,0,0,0.20)';
    c.fillRect(x + depth, y + depth, w, h);
    c.fillStyle = 'rgba(0,0,0,0.16)';
    c.fillRect(x + depth * 0.55, y + depth * 0.55, w, h);
    c.fillStyle = 'rgba(0,0,0,0.12)';
    c.fillRect(x + 2, y + 2, w + 2, h + 2);
  }

  function bevel(c, x, y, w, h, outline) {
    c.fillStyle = 'rgba(255,255,255,0.22)';
    c.fillRect(x, y, w, 1.6);
    c.fillRect(x, y, 1.6, h);
    c.fillStyle = 'rgba(0,0,0,0.30)';
    c.fillRect(x, y + h - 1.6, w, 1.6);
    c.fillRect(x + w - 1.6, y, 1.6, h);
    c.strokeStyle = outline || '#1f2622';
    c.lineWidth = 1.4;
    c.strokeRect(x + 0.2, y + 0.2, w - 0.4, h - 0.4);
  }

  function speckle(c, x, y, w, h, r, n) {
    n = Math.round(n * detail);
    for (let k = 0; k < n; k++) {
      c.fillStyle = r() > 0.5 ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.11)';
      c.fillRect(x + r() * w, y + r() * h, 1.4, 1.4);
    }
  }

  function windowPane(c, x, y, w, h, o) {
    o = o || {};
    c.fillStyle = o.frame || '#ece6d8';
    c.fillRect(x - 1, y - 1, w + 2, h + 2);
    if (o.lit) {
      c.fillStyle = '#f1b95a';
      c.fillRect(x, y, w, h);
      c.fillStyle = '#ffe9a8';
      c.fillRect(x, y, w, h * 0.5);
    } else {
      c.fillStyle = o.glass || '#4a7ea3';
      c.fillRect(x, y, w, h);
      c.fillStyle = o.glassTop || '#9fcbe6';
      c.fillRect(x, y, w, h * 0.45);
    }
    c.fillStyle = o.frame || '#ece6d8';
    c.fillRect(x + w / 2 - 0.5, y, 1, h);
    c.fillStyle = 'rgba(255,255,255,0.5)';
    c.fillRect(x + 1, y + 1, Math.max(1, w * 0.28), 1);
    c.fillStyle = 'rgba(0,0,0,0.38)';
    c.fillRect(x - 1.5, y + h + 1, w + 3, 1.3);
    if (o.shutter) {
      c.fillStyle = o.shutter;
      c.fillRect(x - 3.4, y - 1, 2.2, h + 2);
      c.fillRect(x + w + 1.2, y - 1, 2.2, h + 2);
    }
  }

  function door(c, x, y, w, h, col, o) {
    o = o || {};
    c.fillStyle = 'rgba(0,0,0,0.3)';
    c.fillRect(x - 1.5, y - 1.5, w + 3, h + 2.5);
    c.fillStyle = o.frame || '#efe8da';
    c.fillRect(x - 1, y - 1, w + 2, h + 1);
    c.fillStyle = col;
    c.fillRect(x, y, w, h);
    c.fillStyle = 'rgba(255,255,255,0.18)';
    c.fillRect(x, y, w * 0.45, h);
    c.fillStyle = 'rgba(0,0,0,0.25)';
    c.fillRect(x + 1.5, y + 2, w - 3, h * 0.38);
    c.fillStyle = '#f2d36b';
    c.fillRect(x + w - 2.4, y + h * 0.55, 1.3, 1.3);
    // escalón
    c.fillStyle = '#b8b2a4';
    c.fillRect(x - 2, y + h, w + 4, 2);
  }

  function railing(c, x, y, w, col) {
    c.fillStyle = col || '#2c3236';
    c.fillRect(x, y, w, 1.2);
    for (let xx = x; xx <= x + w; xx += 3) c.fillRect(xx, y, 0.8, 4);
    c.fillRect(x, y + 4, w, 1);
  }

  function awning(c, x, y, w, h, cols, seedOff) {
    const n = Math.max(4, Math.floor(w / 5));
    const sw = w / n;
    for (let k = 0; k < n; k++) {
      c.fillStyle = k % 2 ? '#f7f3e8' : cols;
      c.fillRect(x + k * sw, y, sw, h);
    }
    for (let k = 0; k < n; k++) {
      c.fillStyle = k % 2 ? '#f7f3e8' : cols;
      c.beginPath();
      c.arc(x + k * sw + sw / 2, y + h, sw / 2, 0, Math.PI);
      c.fill();
    }
    c.fillStyle = 'rgba(0,0,0,0.20)';
    c.fillRect(x, y + h + 3, w, 3);
  }

  function houseUnit(c, x, y, w, h, seed, pal, withBalcony) {
    const R = rng(seed);
    const fh = Math.min(28, h * 0.3);
    const roofH = h - fh;
    const wall = pick(pal.walls, R);
    const roofCol = pick(pal.roofs, R);

    // techo a dos aguas con cumbrera
    const ridgeY = y + roofH * 0.45;
    c.fillStyle = tone(roofCol, 0.12);
    c.fillRect(x, y, w, ridgeY - y);
    c.fillStyle = tone(roofCol, -0.14);
    c.fillRect(x, ridgeY, w, y + roofH - ridgeY);
    c.strokeStyle = 'rgba(0,0,0,0.2)';
    c.lineWidth = 1;
    for (let yy = y + 3; yy < y + roofH; yy += 4) {
      c.beginPath();
      c.moveTo(x, yy);
      c.lineTo(x + w, yy);
      c.stroke();
    }
    if (detail > 0.7) {
      c.strokeStyle = 'rgba(255,255,255,0.07)';
      let off = 0;
      for (let yy = y + 3; yy < y + roofH; yy += 4) {
        off = (off + 3) % 6;
        for (let xx = x + off; xx < x + w; xx += 6) {
          c.beginPath();
          c.moveTo(xx, yy);
          c.lineTo(xx, yy + 4);
          c.stroke();
        }
      }
    }
    c.fillStyle = tone(roofCol, 0.35);
    c.fillRect(x, ridgeY - 1.2, w, 2.4);
    c.fillStyle = 'rgba(0,0,0,0.35)';
    c.fillRect(x, ridgeY + 1.2, w, 1.2);
    // chimenea
    const chx = x + w * (R() > 0.5 ? 0.18 : 0.68);
    c.fillStyle = 'rgba(0,0,0,0.3)';
    c.fillRect(chx + 3, y + roofH * 0.12 + 3, 7, 9);
    c.fillStyle = '#8b5a48';
    c.fillRect(chx, y + roofH * 0.12, 7, 9);
    c.fillStyle = '#33302d';
    c.fillRect(chx + 1.4, y + roofH * 0.12 + 1.4, 4.2, 3.5);
    c.fillStyle = '#b57a63';
    c.fillRect(chx, y + roofH * 0.12, 7, 1.4);
    // buhardilla
    if (w > 40 && R() > 0.35) {
      const dx = x + w * 0.3;
      const dy = ridgeY + 3;
      c.fillStyle = tone(roofCol, -0.3);
      c.fillRect(dx, dy, 14, 12);
      c.fillStyle = '#ece6d8';
      c.fillRect(dx + 3, dy + 4, 8, 7);
      c.fillStyle = '#9fcbe6';
      c.fillRect(dx + 4, dy + 5, 6, 5);
    }
    // alero + sombra
    c.fillStyle = tone(roofCol, -0.45);
    c.fillRect(x - 1, y + roofH - 2.4, w + 2, 2.6);

    // fachada
    const fy = y + roofH;
    c.fillStyle = wall;
    c.fillRect(x, fy, w, fh);
    c.strokeStyle = 'rgba(0,0,0,0.07)';
    c.lineWidth = 1;
    for (let yy = fy + 3; yy < fy + fh; yy += 3) {
      c.beginPath();
      c.moveTo(x, yy);
      c.lineTo(x + w, yy);
      c.stroke();
    }
    c.fillStyle = 'rgba(0,0,0,0.30)';
    c.fillRect(x, fy, w, 3);
    c.fillStyle = 'rgba(0,0,0,0.18)';
    c.fillRect(x, fy + 3, w, 2);
    c.fillStyle = 'rgba(60,48,40,0.55)';
    c.fillRect(x, fy + fh - 3, w, 3);

    const shutter = pick(['#3f6b4d', '#8a3b34', '#355a7d', '#6b4a2e'], R);
    const doorCol = pick(['#6a3d26', '#9b2f2f', '#2f5a73', '#35603f', '#d6a43a'], R);
    const lit = R() > 0.7;
    if (w > 40) {
      windowPane(c, x + 5, fy + 7, 9, 9, { shutter, lit });
      windowPane(c, x + w - 14, fy + 7, 9, 9, { shutter, lit: R() > 0.7 });
      door(c, x + w * 0.5 - 4, fy + fh - 15, 8, 13, doorCol);
      // pequeño techito del porche
      c.fillStyle = tone(roofCol, -0.2);
      c.fillRect(x + w * 0.5 - 7, fy + fh - 19, 14, 3);
      if (withBalcony) {
        c.fillStyle = '#d9d2c2';
        c.fillRect(x + 2, fy + fh - 7, w - 4, 3);
        railing(c, x + 2, fy + fh - 12, w - 4, '#2c3236');
      }
    } else {
      windowPane(c, x + 4, fy + 7, 8, 9, { shutter, lit });
      door(c, x + w - 12, fy + fh - 15, 8, 13, doorCol);
    }
    // marco general
    c.strokeStyle = 'rgba(20,24,20,0.8)';
    c.lineWidth = 1;
    c.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  }

  function apartment(c, x, y, w, h, seed, pal) {
    const R = rng(seed);
    const fh = 38;
    const roofH = h - fh;
    const wall = pick(pal.walls, R);
    c.fillStyle = '#6a6e6a';
    c.fillRect(x, y, w, roofH);
    speckle(c, x, y, w, roofH, R, 120);
    c.fillStyle = '#7b807b';
    c.fillRect(x + 4, y + 4, w - 8, roofH - 8);
    c.strokeStyle = 'rgba(255,255,255,0.18)';
    c.strokeRect(x + 4.5, y + 4.5, w - 9, roofH - 9);
    // tanque de agua y condensadores
    circ(c, x + 22, y + 22, 10, '#8c8f8c');
    circ(c, x + 20, y + 20, 7, '#b0b3b0');
    c.strokeStyle = '#4a4d4a';
    c.lineWidth = 1;
    c.beginPath();
    c.arc(x + 22, y + 22, 10, 0, Math.PI * 2);
    c.stroke();
    for (let k = 0; k < 3; k++) {
      c.fillStyle = '#c7cac6';
      c.fillRect(x + w - 40 + k * 11, y + 14, 8, 8);
      c.fillStyle = '#51554f';
      c.fillRect(x + w - 38 + k * 11, y + 16, 4, 4);
    }
    c.fillStyle = '#51544f';
    c.fillRect(x + w * 0.5 - 7, y + roofH - 22, 14, 12);
    c.fillStyle = '#34372f';
    c.fillRect(x + w * 0.5 - 3, y + roofH - 16, 6, 6);
    const fy = y + roofH;
    c.fillStyle = tone(wall, -0.25);
    c.fillRect(x - 1, fy - 2, w + 2, 3);
    c.fillStyle = wall;
    c.fillRect(x, fy, w, fh);
    c.fillStyle = 'rgba(0,0,0,0.25)';
    c.fillRect(x, fy, w, 3);
    // dos pisos de ventanas con balcones
    const cols = Math.max(3, Math.floor((w - 8) / 20));
    const cw = (w - 8) / cols;
    for (let row = 0; row < 2; row++) {
      for (let k = 0; k < cols; k++) {
        const wx = x + 4 + k * cw + (cw - 10) / 2;
        const wy = fy + 5 + row * 15;
        windowPane(c, wx, wy, 10, 8, { lit: R() > 0.75, frame: '#f2efe6' });
        c.fillStyle = 'rgba(40,46,44,0.85)';
        c.fillRect(wx - 3, wy + 10, 16, 1);
        railing(c, wx - 3, wy + 8.6, 16, '#2c3236');
      }
    }
    door(c, x + w * 0.5 - 5, fy + fh - 12, 10, 12, '#3b4a52');
    bevel(c, x, y, w, h);
  }

  function skyscraper(c, b, i, R) {
    const { x, y, w, h } = b;
    const pal = PAL.centro;
    const glass = pick(pal.glass, R);
    const roofCol = pick(pal.roofs, R);
    const fh = Math.min(34, h * 0.34);
    const roofH = h - fh;
    // techo base y retranqueos
    c.fillStyle = roofCol;
    c.fillRect(x, y, w, roofH);
    speckle(c, x, y, w, roofH, R, 80);
    const t1 = 7;
    c.fillStyle = tone(roofCol, 0.12);
    c.fillRect(x + t1, y + t1, w - t1 * 2, roofH - t1 * 2);
    c.fillStyle = 'rgba(0,0,0,0.28)';
    c.fillRect(x + t1, y + roofH - t1 - 1.6, w - t1 * 2, 1.6);
    c.fillRect(x + w - t1 - 1.6, y + t1, 1.6, roofH - t1 * 2);
    const t2 = 16;
    if (w > 50 && roofH > 40) {
      c.fillStyle = tone(roofCol, 0.24);
      c.fillRect(x + t2, y + t2, w - t2 * 2, roofH - t2 * 2);
      // reflejo diagonal
      c.fillStyle = 'rgba(255,255,255,0.10)';
      c.beginPath();
      c.moveTo(x + t2, y + t2);
      c.lineTo(x + t2 + (w - t2 * 2) * 0.55, y + t2);
      c.lineTo(x + t2, y + t2 + (roofH - t2 * 2) * 0.6);
      c.closePath();
      c.fill();
    }
    if (b.roofType === 0 && w > 50 && h > 50) {
      c.fillStyle = 'rgba(214, 243, 106, 0.5)';
      c.strokeStyle = 'rgba(214, 243, 106, 0.65)';
      c.lineWidth = 1.5;
      c.beginPath();
      c.arc(x + w * 0.5, y + roofH * 0.5, 17, 0, Math.PI * 2);
      c.stroke();
      c.font = 'bold 13px monospace';
      c.textAlign = 'center';
      c.fillText('H', x + w * 0.5, y + roofH * 0.5 + 5);
    } else {
      // equipos de climatización
      for (let k = 0; k < 4; k++) {
        const ax = x + t1 + 3 + (k % 2) * 14;
        const ay = y + t1 + 3 + Math.floor(k / 2) * 11;
        c.fillStyle = 'rgba(0,0,0,0.28)';
        c.fillRect(ax + 2, ay + 2, 10, 8);
        c.fillStyle = '#c7ccce';
        c.fillRect(ax, ay, 10, 8);
        c.fillStyle = '#4a5054';
        c.fillRect(ax + 2, ay + 2, 6, 4);
      }
      // antena con luz
      const ax = x + w - 18;
      const ay = y + 16;
      c.strokeStyle = '#d0d6d8';
      c.lineWidth = 1.2;
      c.beginPath();
      c.moveTo(ax, ay);
      c.lineTo(ax, ay - 9);
      c.stroke();
      circ(c, ax, ay - 9, 1.8, '#ff4a3a');
    }
    // fachada de muro cortina
    const fy = y + roofH;
    c.fillStyle = tone(glass, -0.35);
    c.fillRect(x, fy, w, fh);
    const cellW = 7;
    const cellH = 8;
    const cols = Math.floor((w - 4) / cellW);
    const rows = Math.max(2, Math.floor((fh - 12) / cellH));
    for (let row = 0; row < rows; row++) {
      for (let k = 0; k < cols; k++) {
        const wx = x + 2 + k * cellW;
        const wy = fy + 3 + row * cellH;
        const lit = R() > 0.82;
        c.fillStyle = lit ? '#f4cf7a' : row % 2 ? tone(glass, 0.12) : glass;
        c.fillRect(wx + 0.5, wy + 0.5, cellW - 1, cellH - 1);
        if (!lit) {
          c.fillStyle = 'rgba(255,255,255,0.13)';
          c.fillRect(wx + 0.5, wy + 0.5, cellW - 1, 2);
        }
      }
    }
    // pilares
    c.fillStyle = 'rgba(210,220,226,0.55)';
    for (let k = 0; k <= cols; k += 3) c.fillRect(x + 2 + k * cellW - 0.5, fy + 2, 1, fh - 4);
    // vestíbulo con marquesina
    const lw = Math.min(24, w * 0.3);
    c.fillStyle = 'rgba(0,0,0,0.3)';
    c.fillRect(x + w * 0.5 - lw / 2 + 2, fy + fh - 12, lw, 12);
    c.fillStyle = '#1f2d36';
    c.fillRect(x + w * 0.5 - lw / 2, fy + fh - 11, lw, 11);
    c.fillStyle = '#b9e0f2';
    c.fillRect(x + w * 0.5 - lw / 2 + 1, fy + fh - 10, lw / 2 - 1.5, 9);
    c.fillRect(x + w * 0.5 + 0.5, fy + fh - 10, lw / 2 - 1.5, 9);
    c.fillStyle = '#cfd6da';
    c.fillRect(x + w * 0.5 - lw / 2 - 3, fy + fh - 14, lw + 6, 3);
    bevel(c, x, y, w, h, '#1b2328');
  }

  function shops(c, b, i, R) {
    const { x, y, w, h } = b;
    const pal = PAL.comercial;
    const units = w > 80 ? 2 : 1;
    const uw = (w - (units - 1) * 2) / units;
    const fh = 32;
    const roofH = h - fh;
    // techo plano
    c.fillStyle = pick(pal.roofs, R);
    c.fillRect(x, y, w, roofH);
    speckle(c, x, y, w, roofH, R, 120);
    c.fillStyle = 'rgba(255,255,255,0.06)';
    c.fillRect(x + 4, y + 4, w - 8, roofH - 8);
    c.strokeStyle = 'rgba(0,0,0,0.25)';
    c.lineWidth = 1;
    c.strokeRect(x + 4.5, y + 4.5, w - 9, roofH - 9);
    // claraboya y equipos
    c.fillStyle = '#9cc7d9';
    c.fillRect(x + 12, y + 12, 22, 14);
    c.strokeStyle = '#e8f3f7';
    c.strokeRect(x + 12.5, y + 12.5, 21, 13);
    c.beginPath();
    c.moveTo(x + 23, y + 12);
    c.lineTo(x + 23, y + 26);
    c.stroke();
    for (let k = 0; k < 2; k++) {
      c.fillStyle = '#bfc4c2';
      c.fillRect(x + w - 34 + k * 14, y + 14, 10, 9);
      c.fillStyle = '#4c5250';
      c.fillRect(x + w - 32 + k * 14, y + 16, 6, 5);
    }
    // cartel de techo de neón
    if (R() > 0.4) {
      const nc = pick(pal.awnings, R);
      c.fillStyle = 'rgba(0,0,0,0.3)';
      c.fillRect(x + 14, y + roofH - 22, w - 24, 9);
      c.fillStyle = '#1a1d1e';
      c.fillRect(x + 12, y + roofH - 24, w - 24, 9);
      c.strokeStyle = nc;
      c.lineWidth = 1.5;
      c.strokeRect(x + 13.5, y + roofH - 22.5, w - 27, 6);
      if (detail > 0.7) {
        c.fillStyle = nc;
        c.globalAlpha = 0.16;
        c.fillRect(x + 8, y + roofH - 28, w - 16, 17);
        c.globalAlpha = 1;
      }
    }
    // locales con toldo, vidriera y puerta
    for (let u = 0; u < units; u++) {
      const ux = x + u * (uw + 2);
      const wall = pick(pal.walls, R);
      const fy = y + roofH;
      c.fillStyle = wall;
      c.fillRect(ux, fy, uw, fh);
      c.fillStyle = 'rgba(0,0,0,0.3)';
      c.fillRect(ux, fy, uw, 3);
      const ac = pick(pal.awnings, R);
      awning(c, ux + 3, fy + 3, uw - 6, 5, ac);
      // vidriera iluminada
      const gw = uw - 12;
      c.fillStyle = '#2a2420';
      c.fillRect(ux + 5, fy + 15, gw, fh - 16);
      c.fillStyle = '#ffd98a';
      c.fillRect(ux + 6, fy + 16, gw - 2, fh - 18);
      c.fillStyle = 'rgba(255,255,255,0.35)';
      c.fillRect(ux + 6, fy + 16, gw - 2, 3);
      // mercadería (siluetas de colores)
      for (let k = 0; k < Math.floor(gw / 7); k++) {
        c.fillStyle = pick(['#d6559b', '#3a7bd5', '#2f9e8f', '#e2453c', '#8a63d2'], R);
        c.fillRect(ux + 8 + k * 7, fy + fh - 9 - R() * 3, 4, 5);
      }
      door(c, ux + uw - 12, fy + fh - 14, 7, 13, '#2a3036');
    }
    bevel(c, x, y, w, h);
  }

  function warehouse(c, b, i, R) {
    const { x, y, w, h } = b;
    const pal = PAL.portuaria;
    const fh = 30;
    const roofH = h - fh;
    const roof = pick(pal.roofs, R);
    c.fillStyle = roof;
    c.fillRect(x, y, w, roofH);
    // chapa acanalada
    for (let xx = x + 2; xx < x + w - 2; xx += 4) {
      c.fillStyle = 'rgba(255,255,255,0.10)';
      c.fillRect(xx, y, 1.3, roofH);
      c.fillStyle = 'rgba(0,0,0,0.16)';
      c.fillRect(xx + 2, y, 1.3, roofH);
    }
    // claraboyas
    c.fillStyle = '#a9d3dc';
    c.fillRect(x + 10, y + roofH * 0.35, w - 20, 7);
    c.fillStyle = 'rgba(0,0,0,0.25)';
    c.fillRect(x + 10, y + roofH * 0.35 + 7, w - 20, 2);
    // manchas de óxido
    for (let k = 0; k < 4; k++) {
      ell(c, x + R() * w, y + R() * roofH, 4 + R() * 7, 2 + R() * 4, 'rgba(120,60,30,0.16)');
    }
    c.fillStyle = tone(roof, -0.4);
    c.fillRect(x - 1, y + roofH - 2, w + 2, 2.5);
    // fachada con portones
    const fy = y + roofH;
    c.fillStyle = pick(pal.walls, R);
    c.fillRect(x, fy, w, fh);
    c.fillStyle = 'rgba(0,0,0,0.3)';
    c.fillRect(x, fy, w, 3);
    const doors = w > 80 ? 2 : 1;
    const dw = (w - 14) / doors - 6;
    for (let k = 0; k < doors; k++) {
      const dx = x + 10 + k * (dw + 8);
      c.fillStyle = '#3a4146';
      c.fillRect(dx - 1, fy + 5, dw + 2, fh - 5);
      c.fillStyle = pick(['#c47a2b', '#5f7d8c', '#8a8f86'], R);
      c.fillRect(dx, fy + 6, dw, fh - 6);
      c.strokeStyle = 'rgba(0,0,0,0.28)';
      c.lineWidth = 1;
      for (let yy = fy + 9; yy < fy + fh; yy += 3) {
        c.beginPath();
        c.moveTo(dx, yy);
        c.lineTo(dx + dw, yy);
        c.stroke();
      }
    }
    // franja de seguridad
    c.fillStyle = '#e3b42b';
    for (let xx = x + 2; xx < x + w - 6; xx += 12) c.fillRect(xx, fy + fh - 3, 6, 3);
    c.fillStyle = '#1b1d1c';
    for (let xx = x + 8; xx < x + w - 6; xx += 12) c.fillRect(xx, fy + fh - 3, 6, 3);
    bevel(c, x, y, w, h);
  }

  function containerBlock(c, b, i, R) {
    const { x, y, w, h } = b;
    c.fillStyle = '#4c5457';
    c.fillRect(x, y, w, h);
    c.fillStyle = 'rgba(0,0,0,0.15)';
    for (let yy = y + 4; yy < y + h; yy += 7) c.fillRect(x, yy, w, 1);
    const cols = ['#c83e2b', '#2b7de9', '#e3b42b', '#22a37a', '#8a63d2', '#d9d6cf', '#e67e22'];
    const cw = 22;
    const ch = 10;
    const nx = Math.max(2, Math.floor((w - 8) / (cw + 2)));
    const ny = Math.max(2, Math.floor((h - 8) / (ch + 3)));
    for (let row = 0; row < ny; row++) {
      for (let k = 0; k < nx; k++) {
        if (R() > 0.9) continue;
        const cx = x + 5 + k * (cw + 2);
        const cy = y + 5 + row * (ch + 3);
        const col = pick(cols, R);
        c.fillStyle = 'rgba(0,0,0,0.35)';
        c.fillRect(cx + 2, cy + 2, cw, ch);
        c.fillStyle = col;
        c.fillRect(cx, cy, cw, ch);
        c.fillStyle = 'rgba(255,255,255,0.22)';
        c.fillRect(cx, cy, cw, 2);
        c.fillStyle = 'rgba(0,0,0,0.25)';
        for (let rx = cx + 3; rx < cx + cw - 1; rx += 3) c.fillRect(rx, cy + 2, 0.9, ch - 2);
        c.fillStyle = 'rgba(0,0,0,0.5)';
        c.fillRect(cx + cw - 3, cy + 1, 2.5, ch - 2);
      }
    }
    // grúa pórtico (vista superior)
    c.strokeStyle = '#e3b42b';
    c.lineWidth = 2.2;
    c.beginPath();
    c.moveTo(x + 2, y + h * 0.5);
    c.lineTo(x + w - 2, y + h * 0.5);
    c.stroke();
    c.fillStyle = '#e3b42b';
    c.fillRect(x + w * 0.5 - 4, y + h * 0.5 - 4, 8, 8);
    c.strokeStyle = '#2a2d2b';
    c.lineWidth = 0.8;
    c.strokeRect(x + w * 0.5 - 4, y + h * 0.5 - 4, 8, 8);
    bevel(c, x, y, w, h);
  }

  function factory(c, b, i, R) {
    const { x, y, w, h } = b;
    const pal = PAL.industrial;
    const fh = 28;
    const roofH = h - fh;
    const roof = pick(pal.roofs, R);
    c.fillStyle = roof;
    c.fillRect(x, y, w, roofH);
    // techo dientes de sierra
    const teeth = Math.max(3, Math.floor(roofH / 10));
    const th = roofH / teeth;
    for (let k = 0; k < teeth; k++) {
      const ty = y + k * th;
      c.fillStyle = tone(roof, 0.14);
      c.fillRect(x, ty, w, th * 0.6);
      c.fillStyle = tone(roof, -0.18);
      c.fillRect(x, ty + th * 0.6, w, th * 0.4);
      c.fillStyle = '#9bc0cb';
      c.fillRect(x + 2, ty + th * 0.6, w - 4, 1.5);
    }
    // silos / tanques
    const nSilo = w > 80 ? 2 : 1;
    for (let k = 0; k < nSilo; k++) {
      const sx = x + w * (nSilo === 2 ? 0.28 + k * 0.44 : 0.5);
      const sy = y + roofH * 0.45;
      const rr0 = 15;
      ell(c, sx + 7, sy + 7, rr0, rr0 * 0.8, 'rgba(0,0,0,0.30)');
      const g = c.createRadialGradient(sx - 5, sy - 5, 2, sx, sy, rr0);
      g.addColorStop(0, '#e1e5e4');
      g.addColorStop(1, '#7b8381');
      c.fillStyle = g;
      c.beginPath();
      c.arc(sx, sy, rr0, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = '#4b5250';
      c.lineWidth = 1.2;
      c.stroke();
      c.beginPath();
      c.arc(sx, sy, rr0 * 0.62, 0, Math.PI * 2);
      c.stroke();
      circ(c, sx, sy, 3, '#41484a');
      c.fillStyle = '#c7452f';
      c.fillRect(sx - rr0, sy - 1, rr0 * 2, 2);
    }
    // chimenea con sombra larga
    const chx = x + w - 14;
    const chy = y + 12;
    c.fillStyle = 'rgba(0,0,0,0.25)';
    c.beginPath();
    c.moveTo(chx - 3, chy + 2);
    c.lineTo(chx + 20, chy + 22);
    c.lineTo(chx + 24, chy + 18);
    c.lineTo(chx + 3, chy - 2);
    c.closePath();
    c.fill();
    circ(c, chx, chy, 5.5, '#9a5b45');
    circ(c, chx, chy, 3.2, '#1f1f1f');
    c.strokeStyle = '#e3b42b';
    c.lineWidth = 1;
    c.beginPath();
    c.arc(chx, chy, 5.5, 0, Math.PI * 2);
    c.stroke();
    // tuberías
    c.strokeStyle = '#a6a29a';
    c.lineWidth = 2.2;
    c.beginPath();
    c.moveTo(x + 4, y + roofH - 6);
    c.lineTo(x + w - 20, y + roofH - 6);
    c.lineTo(x + w - 20, y + 6);
    c.stroke();
    // fachada con muelle de carga
    const fy = y + roofH;
    c.fillStyle = pick(pal.walls, R);
    c.fillRect(x, fy, w, fh);
    c.fillStyle = 'rgba(0,0,0,0.3)';
    c.fillRect(x, fy, w, 3);
    const docks = Math.max(2, Math.floor((w - 10) / 24));
    for (let k = 0; k < docks; k++) {
      const dx = x + 6 + k * ((w - 12) / docks);
      c.fillStyle = '#2f3437';
      c.fillRect(dx, fy + 6, 15, fh - 6);
      c.fillStyle = k % 2 ? '#d98e2b' : '#6e7a80';
      c.fillRect(dx + 1, fy + 7, 13, fh - 9);
      c.strokeStyle = 'rgba(0,0,0,0.3)';
      for (let yy = fy + 10; yy < fy + fh - 2; yy += 3) {
        c.beginPath();
        c.moveTo(dx + 1, yy);
        c.lineTo(dx + 14, yy);
        c.stroke();
      }
      c.fillStyle = '#e3b42b';
      c.fillRect(dx, fy + fh - 3, 15, 3);
    }
    bevel(c, x, y, w, h);
  }

  function farmhouse(c, b, i, R) {
    const { x, y, w, h } = b;
    const pal = PAL.periferia;
    const small = w < 60 || h < 50;
    const fh = small ? Math.min(16, h * 0.4) : 26;
    const roofH = h - fh;
    const roof = pick(pal.roofs, R);
    const ridgeY = y + roofH * 0.5;
    c.fillStyle = tone(roof, 0.1);
    c.fillRect(x, y, w, ridgeY - y);
    c.fillStyle = tone(roof, -0.15);
    c.fillRect(x, ridgeY, w, y + roofH - ridgeY);
    c.strokeStyle = 'rgba(0,0,0,0.18)';
    c.lineWidth = 1;
    for (let xx = x + 4; xx < x + w; xx += 5) {
      c.beginPath();
      c.moveTo(xx, y);
      c.lineTo(xx, y + roofH);
      c.stroke();
    }
    c.fillStyle = tone(roof, 0.3);
    c.fillRect(x, ridgeY - 1, w, 2);
    // paneles solares
    if (!small && R() > 0.4) {
      c.fillStyle = '#1f3a5c';
      c.fillRect(x + 10, y + 6, w - 20, ridgeY - y - 10);
      c.strokeStyle = '#7fa8d4';
      c.lineWidth = 0.8;
      for (let xx = x + 10; xx <= x + w - 10; xx += 8) {
        c.beginPath();
        c.moveTo(xx, y + 6);
        c.lineTo(xx, ridgeY - 4);
        c.stroke();
      }
      c.beginPath();
      c.moveTo(x + 10, y + 6 + (ridgeY - y - 10) / 2);
      c.lineTo(x + w - 10, y + 6 + (ridgeY - y - 10) / 2);
      c.stroke();
    }
    c.fillStyle = tone(roof, -0.45);
    c.fillRect(x - 1, y + roofH - 2, w + 2, 2.4);
    const fy = y + roofH;
    c.fillStyle = small ? '#b08a5a' : pick(pal.walls, R);
    c.fillRect(x, fy, w, fh);
    if (small) {
      c.strokeStyle = 'rgba(60,36,16,0.45)';
      for (let xx = x + 3; xx < x + w; xx += 4) {
        c.beginPath();
        c.moveTo(xx, fy);
        c.lineTo(xx, fy + fh);
        c.stroke();
      }
    }
    c.fillStyle = 'rgba(0,0,0,0.28)';
    c.fillRect(x, fy, w, 3);
    if (small) {
      door(c, x + w * 0.5 - 4, fy + fh - 10, 8, 10, '#5a3a24');
    } else {
      windowPane(c, x + 8, fy + 8, 9, 9, { shutter: '#6b4a2e' });
      door(c, x + w * 0.5 - 4, fy + fh - 15, 8, 13, '#6a3d26');
      c.fillStyle = '#c9c3b2';
      c.fillRect(x + w - 30, fy + 6, 22, fh - 6);
      c.strokeStyle = 'rgba(0,0,0,0.3)';
      for (let yy = fy + 9; yy < fy + fh; yy += 3) {
        c.beginPath();
        c.moveTo(x + w - 30, yy);
        c.lineTo(x + w - 8, yy);
        c.stroke();
      }
    }
    bevel(c, x, y, w, h);
  }

  function garageRoof(c, b) {
    const { x, y, w, h } = b;
    c.fillStyle = '#3b463e';
    c.fillRect(x, y, w, h);
    for (let xx = x + 3; xx < x + w - 3; xx += 4) {
      c.fillStyle = 'rgba(255,255,255,0.08)';
      c.fillRect(xx, y, 1.2, h);
      c.fillStyle = 'rgba(0,0,0,0.18)';
      c.fillRect(xx + 2, y, 1.2, h);
    }
    c.fillStyle = '#e3b42b';
    for (let xx = x + 2; xx < x + w - 8; xx += 14) c.fillRect(xx, y + h - 4, 7, 4);
    c.fillStyle = '#1b1d1c';
    for (let xx = x + 9; xx < x + w - 8; xx += 14) c.fillRect(xx, y + h - 4, 7, 4);
    c.strokeStyle = '#f5d94b';
    c.lineWidth = 2;
    c.strokeRect(x + 1, y + 1, w - 2, h - 2);
    c.fillStyle = 'rgba(15,18,16,0.75)';
    c.fillRect(x + w * 0.5 - 40, y + 5, 80, 14);
    c.fillStyle = '#f5d94b';
    c.font = 'bold 9px monospace';
    c.textAlign = 'center';
    c.fillText('TALLER MECÁNICO', x + w * 0.5, y + 15.5);
  }

  function hideoutWall(c, b, i, R) {
    const { x, y, w, h } = b;
    c.fillStyle = '#3a4140';
    c.fillRect(x, y, w, h);
    c.strokeStyle = 'rgba(0,0,0,0.35)';
    c.lineWidth = 1;
    const horiz = w >= h;
    for (let yy = y + 4; yy < y + h; yy += 5) {
      c.beginPath();
      c.moveTo(x, yy);
      c.lineTo(x + w, yy);
      c.stroke();
    }
    for (let k = 0; k < Math.round(60 * detail); k++) {
      c.fillStyle = R() > 0.5 ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.12)';
      c.fillRect(x + R() * w, y + R() * h, 3, 2);
    }
    c.fillStyle = 'rgba(255,255,255,0.18)';
    if (horiz) c.fillRect(x, y, w, 2);
    else c.fillRect(x, y, 2, h);
    // alambre / grafiti de color
    c.fillStyle = 'rgba(77,224,181,0.5)';
    if (horiz) c.fillRect(x + 6, y + h - 4, Math.min(30, w - 12), 1.6);
    else c.fillRect(x + w - 4, y + 6, 1.6, Math.min(30, h - 12));
    bevel(c, x, y, w, h, '#1b211f');
  }

  function drawBuilding(c, b, i) {
    const R = rng(Math.floor(b.x * 7 + b.y * 13 + i * 31));
    const id = b.districtId || 'residencial';
    shadow(c, b.x, b.y, b.w, b.h, 8);

    if (b.isHideoutWall) return hideoutWall(c, b, i, R);
    if (b.isGarageRoof) return garageRoof(c, b);
    if (b.isContainerBlock) return containerBlock(c, b, i, R);

    switch (id) {
      case 'centro':
        if (b.w > 50 && b.h > 50) return skyscraper(c, b, i, R);
        break;
      case 'comercial':
        if (b.w > 45 && b.h > 45) return shops(c, b, i, R);
        break;
      case 'portuaria':
        if (b.w > 50 && b.h > 50) return warehouse(c, b, i, R);
        break;
      case 'industrial':
        if (b.w > 50 && b.h > 50) return factory(c, b, i, R);
        break;
      case 'periferia':
        return farmhouse(c, b, i, R);
      default:
        break;
    }

    // residencial (y cualquier edificio chico de otros barrios)
    const pal = PAL.residencial;
    if (b.w >= 90 && b.h >= 70) {
      const variant = Math.floor(R() * 4);
      if (variant === 0) {
        apartment(c, b.x, b.y, b.w, b.h, Math.floor(R() * 99999), pal);
      } else if (variant === 1) {
        const n = 3;
        const uw = (b.w - 2 * (n - 1)) / n;
        for (let k = 0; k < n; k++) houseUnit(c, b.x + k * (uw + 2), b.y, uw, b.h, Math.floor(R() * 99999), pal, false);
      } else {
        const uw = (b.w - 2) / 2;
        houseUnit(c, b.x, b.y, uw, b.h, Math.floor(R() * 99999), pal, variant === 3);
        houseUnit(c, b.x + uw + 2, b.y, uw, b.h, Math.floor(R() * 99999), pal, variant !== 3);
      }
      bevel(c, b.x, b.y, b.w, b.h);
    } else {
      houseUnit(c, b.x, b.y, b.w, b.h, Math.floor(R() * 99999), pal, false);
      bevel(c, b.x, b.y, b.w, b.h);
    }
  }

  /* ---------- veredas por barrio ---------- */
  const sidewalkCache = {};
  function getSidewalkPattern(ctx, districtId) {
    if (sidewalkCache[districtId]) return sidewalkCache[districtId];
    const s = 48;
    const cv = document.createElement('canvas');
    cv.width = s;
    cv.height = s;
    const g = cv.getContext('2d');
    const R = rng(districtId.length * 977 + districtId.charCodeAt(0));
    if (districtId === 'residencial') {
      // ladrillo en espiga cálido
      g.fillStyle = '#7d7268';
      g.fillRect(0, 0, s, s);
      for (let row = 0; row < s / 6; row++) {
        for (let k = 0; k < s / 12 + 1; k++) {
          const bx = k * 12 + (row % 2 ? 6 : 0) - 6;
          g.fillStyle = pick(['#8e6e5c', '#996f58', '#85685a', '#a07a62'], R);
          g.fillRect(bx + 0.6, row * 6 + 0.6, 10.8, 4.8);
        }
      }
    } else if (districtId === 'centro') {
      // granito pulido con juntas finas
      g.fillStyle = '#8a959b';
      g.fillRect(0, 0, s, s);
      for (let yy = 0; yy < 2; yy++) {
        for (let xx = 0; xx < 2; xx++) {
          g.fillStyle = (xx + yy) % 2 ? '#8f9aa0' : '#7f8a91';
          g.fillRect(xx * 24 + 0.8, yy * 24 + 0.8, 22.4, 22.4);
          g.fillStyle = 'rgba(255,255,255,0.10)';
          g.fillRect(xx * 24 + 0.8, yy * 24 + 0.8, 22.4, 1.5);
        }
      }
      for (let k = 0; k < 60; k++) {
        g.fillStyle = 'rgba(255,255,255,0.07)';
        g.fillRect(R() * s, R() * s, 1, 1);
      }
    } else if (districtId === 'comercial') {
      // damero colorido
      for (let yy = 0; yy < 4; yy++) {
        for (let xx = 0; xx < 4; xx++) {
          g.fillStyle = (xx + yy) % 2 ? '#8a8478' : '#9a9384';
          g.fillRect(xx * 12, yy * 12, 12, 12);
        }
      }
      g.strokeStyle = 'rgba(30,26,20,0.22)';
      g.lineWidth = 1;
      for (let k = 0; k <= 4; k++) {
        g.beginPath();
        g.moveTo(k * 12 + 0.5, 0);
        g.lineTo(k * 12 + 0.5, s);
        g.moveTo(0, k * 12 + 0.5);
        g.lineTo(s, k * 12 + 0.5);
        g.stroke();
      }
      g.fillStyle = 'rgba(226,69,60,0.35)';
      g.fillRect(23, 23, 2, 2);
      g.fillStyle = 'rgba(245,180,41,0.35)';
      g.fillRect(47, 11, 1, 1);
    } else if (districtId === 'portuaria') {
      // losas grandes de hormigón húmedo con grietas
      g.fillStyle = '#5f6c6e';
      g.fillRect(0, 0, s, s);
      g.strokeStyle = 'rgba(10,20,22,0.38)';
      g.lineWidth = 1.2;
      g.strokeRect(0.5, 0.5, s - 1, s - 1);
      for (let k = 0; k < 5; k++) {
        g.fillStyle = 'rgba(20,50,60,0.18)';
        g.beginPath();
        g.ellipse(R() * s, R() * s, 3 + R() * 6, 2 + R() * 3, 0, 0, 6.28);
        g.fill();
      }
      g.strokeStyle = 'rgba(0,0,0,0.3)';
      g.lineWidth = 0.8;
      g.beginPath();
      g.moveTo(10, 4);
      g.lineTo(17, 16);
      g.lineTo(14, 24);
      g.stroke();
    } else if (districtId === 'industrial') {
      // chapa antideslizante
      g.fillStyle = '#6a645d';
      g.fillRect(0, 0, s, s);
      for (let yy = 0; yy < s; yy += 8) {
        for (let xx = 0; xx < s; xx += 8) {
          const o = (yy / 8) % 2 ? 4 : 0;
          g.strokeStyle = 'rgba(255,255,255,0.13)';
          g.lineWidth = 1.2;
          g.beginPath();
          g.moveTo(xx + o + 1, yy + 1);
          g.lineTo(xx + o + 4, yy + 4);
          g.stroke();
          g.strokeStyle = 'rgba(0,0,0,0.22)';
          g.beginPath();
          g.moveTo(xx + o + 4, yy + 1);
          g.lineTo(xx + o + 1, yy + 4);
          g.stroke();
        }
      }
      g.strokeStyle = 'rgba(0,0,0,0.35)';
      g.strokeRect(0.5, 0.5, s - 1, s - 1);
    } else {
      // periferia: grava y tierra con yuyos
      g.fillStyle = '#6f7461';
      g.fillRect(0, 0, s, s);
      for (let k = 0; k < 260; k++) {
        g.fillStyle = pick(['rgba(255,255,255,0.10)', 'rgba(0,0,0,0.14)', 'rgba(150,130,90,0.20)'], R);
        g.fillRect(R() * s, R() * s, 1 + (R() > 0.8 ? 1 : 0), 1);
      }
      for (let k = 0; k < 10; k++) {
        g.fillStyle = 'rgba(70,110,50,0.5)';
        const gx = R() * s;
        const gy = R() * s;
        g.fillRect(gx, gy, 1, 3);
        g.fillRect(gx + 2, gy + 1, 1, 2);
      }
    }
    sidewalkCache[districtId] = ctx.createPattern(cv, 'repeat');
    return sidewalkCache[districtId];
  }

  const ACCENT = {
    residencial: '#8bc34a',
    centro: '#6cb2d1',
    comercial: '#f5d94b',
    portuaria: '#4de0b5',
    industrial: '#e68a3e',
    periferia: '#a3c977'
  };

  function decorateBlock(c, bl, bt, bs, dist, gx, gy) {
    const id = dist.id;
    const R = rng(gx * 211 + gy * 97 + 5);
    const sw = wCfg.sidewalkWidth;
    // franja de color del barrio sobre el cordón
    c.fillStyle = ACCENT[id] || '#999';
    c.globalAlpha = 0.5;
    c.fillRect(bl + 14, bt + 0.5, bs - 28, 1.6);
    c.fillRect(bl + 14, bt + bs - 2.1, bs - 28, 1.6);
    c.fillRect(bl + 0.5, bt + 14, 1.6, bs - 28);
    c.fillRect(bl + bs - 2.1, bt + 14, 1.6, bs - 28);
    c.globalAlpha = 1;

    if (id === 'residencial') {
      // franja de pasto con árboles de calle en el cordón
      c.fillStyle = '#3f6b3a';
      c.fillRect(bl + 14, bt + 3, bs - 28, 4);
      c.fillRect(bl + 14, bt + bs - 7, bs - 28, 4);
      c.fillStyle = '#5a9250';
      for (let k = 0; k < 40 * detail; k++) c.fillRect(bl + 14 + R() * (bs - 28), bt + 3 + R() * 3, 1, 2);
    } else if (id === 'centro') {
      // rejillas de árbol con borde de granito y líneas de guía
      c.fillStyle = 'rgba(255,255,255,0.16)';
      c.fillRect(bl + 14, bt + sw - 4, bs - 28, 1);
      c.fillRect(bl + 14, bt + bs - sw + 3, bs - 28, 1);
    } else if (id === 'comercial') {
      // guirnaldas de luces en el borde interior
      for (let k = 0; k < 9; k++) {
        const lx = bl + 18 + k * ((bs - 36) / 8);
        c.fillStyle = ['#f5d94b', '#e2453c', '#4de0b5', '#6cb2d1'][k % 4];
        c.fillRect(lx, bt + sw - 2, 2, 2);
      }
    } else if (id === 'portuaria') {
      // bolardos amarillos y manchas de agua
      for (let k = 0; k < 5; k++) {
        const bx = bl + 18 + k * ((bs - 36) / 4);
        circ(c, bx, bt + 6, 2.2, '#e3b42b');
        circ(c, bx, bt + 6, 1, '#1b1d1c');
      }
      for (let k = 0; k < 3; k++) ell(c, bl + 20 + R() * (bs - 40), bt + bs - 9, 6 + R() * 8, 1.6, 'rgba(60,120,140,0.22)');
    } else if (id === 'industrial') {
      // manchas de aceite y cinta de peligro
      for (let k = 0; k < 3; k++) ell(c, bl + 20 + R() * (bs - 40), bt + 8 + R() * (bs - 16), 4 + R() * 6, 2 + R() * 3, 'rgba(10,10,10,0.28)');
      c.fillStyle = '#4a4742';
      c.fillRect(bl + 14, bt + bs - 6, bs - 28, 2);
    } else if (id === 'periferia') {
      // banquina de tierra y yuyos
      c.fillStyle = 'rgba(120,98,60,0.35)';
      c.fillRect(bl + 12, bt + 2, bs - 24, 5);
      c.fillRect(bl + 12, bt + bs - 7, bs - 24, 5);
      for (let k = 0; k < 14; k++) {
        const gx2 = bl + 14 + R() * (bs - 28);
        const gy2 = R() > 0.5 ? bt + 3 : bt + bs - 7;
        c.fillStyle = '#4f7a3a';
        c.fillRect(gx2, gy2, 1, 3);
        c.fillRect(gx2 + 2, gy2 + 1, 1, 2);
      }
    }
  }

  /* ---------- mobiliario ---------- */
  function drawProp(c, pr, i) {
    const R = rng(Math.floor(pr.x * 5 + pr.y * 11 + i));
    switch (pr.type) {
      case 'tree':
        drawTree(c, pr.x, pr.y + 3, pr.size || 7.5, pr.species || 'oak', Math.floor(pr.x * 3 + pr.y));
        return;
      case 'planter': {
        const w = pr.w || 26;
        const h = pr.h || 9;
        rr(c, pr.x - w / 2, pr.y - h / 2, w, h, 3);
        c.fillStyle = '#8f9690';
        c.fill();
        rr(c, pr.x - w / 2 + 1.5, pr.y - h / 2 + 1.5, w - 3, h - 3, 2.5);
        c.fillStyle = '#3d6a3c';
        c.fill();
        for (let k = 0; k < Math.floor(w / 4); k++) {
          circ(c, pr.x - w / 2 + 3 + k * 4, pr.y + (k % 2 ? 1 : -1), 1.7, k % 2 ? '#e8453c' : '#ffd84a');
        }
        return;
      }
      case 'pocket_park': {
        // jardín de bolsillo: pequeña plazoleta sobre la vereda
        const w = 16;
        const h = 44;
        rr(c, pr.x - w / 2, pr.y - h / 2, w, h, 5);
        c.fillStyle = '#8f9690';
        c.fill();
        rr(c, pr.x - w / 2 + 1.5, pr.y - h / 2 + 1.5, w - 3, h - 3, 4);
        c.fillStyle = '#477a40';
        c.fill();
        c.fillStyle = 'rgba(255,255,255,0.06)';
        for (let k = 0; k < 5; k++) c.fillRect(pr.x - w / 2 + 2, pr.y - h / 2 + 3 + k * 8, w - 4, 4);
        drawFlowerBed(c, pr.x - 5, pr.y + 8, 10, 8, Math.floor(pr.y), 'warm');
        drawBench(c, pr.x, pr.y + 20, true);
        drawBush(c, pr.x + 1, pr.y - 4, 3.6, Math.floor(pr.y + 3), '#ff7b9c');
        drawTree(c, pr.x, pr.y - 10, 7, pr.species || 'blossom', Math.floor(pr.x + pr.y));
        return;
      }
      case 'hydrant':
        c.fillStyle = 'rgba(0,0,0,0.3)';
        c.fillRect(pr.x - 2, pr.y, 6, 3);
        circ(c, pr.x, pr.y, 3.4, '#dc2626');
        circ(c, pr.x, pr.y - 1, 2.2, '#ef4444');
        c.fillStyle = '#9a1b1b';
        c.fillRect(pr.x - 4.6, pr.y - 0.8, 2, 1.6);
        c.fillRect(pr.x + 2.6, pr.y - 0.8, 2, 1.6);
        return;
      case 'bus_stop':
        c.fillStyle = 'rgba(0,0,0,0.28)';
        c.fillRect(pr.x - 14, pr.y - 1, 32, 9);
        c.fillStyle = '#2d343a';
        c.fillRect(pr.x - 16, pr.y - 5, 32, 3);
        c.fillStyle = 'rgba(120,200,235,0.45)';
        c.fillRect(pr.x - 16, pr.y - 2, 32, 7);
        c.strokeStyle = '#38bdf8';
        c.lineWidth = 1;
        c.strokeRect(pr.x - 16, pr.y - 2, 32, 7);
        c.fillStyle = '#e8eef0';
        c.fillRect(pr.x - 10, pr.y + 0.5, 20, 1.2);
        c.fillStyle = '#f5d94b';
        c.fillRect(pr.x + 17, pr.y - 6, 3, 8);
        return;
      case 'bench':
        drawBench(c, pr.x, pr.y, true);
        return;
      case 'billboard':
        c.fillStyle = 'rgba(0,0,0,0.3)';
        c.fillRect(pr.x - 8, pr.y - 2, 22, 10);
        c.fillStyle = '#181e1b';
        c.fillRect(pr.x - 10, pr.y - 4, 20, 8);
        c.fillStyle = pr.color || '#f5d94b';
        c.globalAlpha = 0.85;
        c.fillRect(pr.x - 8, pr.y - 2, 16, 4);
        c.globalAlpha = 1;
        c.strokeStyle = pr.color || '#f5d94b';
        c.lineWidth = 1.2;
        c.strokeRect(pr.x - 10, pr.y - 4, 20, 8);
        return;
      case 'sign':
        c.fillStyle = '#254e6b';
        c.fillRect(pr.x - 8, pr.y - 4, 16, 8);
        c.strokeStyle = '#fff';
        c.lineWidth = 1;
        c.strokeRect(pr.x - 8, pr.y - 4, 16, 8);
        return;
      case 'bollard':
        ell(c, pr.x + 1, pr.y + 1.5, 2.6, 1.4, 'rgba(0,0,0,0.3)');
        circ(c, pr.x, pr.y, 2.3, '#e3b42b');
        circ(c, pr.x, pr.y, 1, '#1b1d1c');
        return;
      case 'crates':
        for (let k = 0; k < 3; k++) {
          const cx = pr.x + (k % 2) * 6 - 3;
          const cy = pr.y + Math.floor(k / 2) * 6 - 3;
          c.fillStyle = 'rgba(0,0,0,0.28)';
          c.fillRect(cx + 1.5, cy + 1.5, 6, 6);
          c.fillStyle = '#9a7040';
          c.fillRect(cx, cy, 6, 6);
          c.strokeStyle = '#5a3f1f';
          c.lineWidth = 0.8;
          c.strokeRect(cx, cy, 6, 6);
          c.beginPath();
          c.moveTo(cx, cy);
          c.lineTo(cx + 6, cy + 6);
          c.stroke();
        }
        return;
      case 'barrel':
        ell(c, pr.x + 1.5, pr.y + 2, 3.6, 2.2, 'rgba(0,0,0,0.3)');
        circ(c, pr.x, pr.y, 3.6, pr.color || '#b4472f');
        circ(c, pr.x - 0.6, pr.y - 0.6, 2, tone(pr.color || '#b4472f', 0.25));
        c.strokeStyle = 'rgba(0,0,0,0.4)';
        c.lineWidth = 0.7;
        c.beginPath();
        c.arc(pr.x, pr.y, 2.4, 0, 6.3);
        c.stroke();
        return;
      case 'container_yard':
        return;
      default:
        return;
    }
  }

  /* ---------- minimapa: capa base en caché ---------- */
  const miniCache = {};
  const MINI = {
    road: '#232925',
    avenue: '#343c36',
    water: '#1f6a82',
    parking: '#4a5560',
    bld: {
      residencial: '#b78a6e',
      centro: '#6f9db8',
      comercial: '#d6a94c',
      portuaria: '#6f8c92',
      industrial: '#a28265',
      periferia: '#97a97c'
    },
    block: {
      residencial: '#5c6a54',
      centro: '#56656c',
      comercial: '#6a6652',
      portuaria: '#4c5f62',
      industrial: '#5d5750',
      periferia: '#56684a'
    }
  };

  function getMinimapBase(mapW, mapH) {
    const key = `${mapW}x${mapH}`;
    if (miniCache[key]) return miniCache[key];
    const World = CiudadCero.World;
    const dpr = 2;
    const cv = document.createElement('canvas');
    cv.width = Math.round(mapW * dpr);
    cv.height = Math.round(mapH * dpr);
    const m = cv.getContext('2d');
    m.scale(dpr, dpr);
    const sx = mapW / wCfg.width;
    const sy = mapH / wCfg.height;
    const bs = wCfg.blockSize;
    const rw = wCfg.roadWidth;

    // calzada base
    m.fillStyle = MINI.road;
    m.fillRect(0, 0, mapW, mapH);

    // avenidas resaltadas (calles pares) y línea central
    for (let gx = 0; gx * bs < wCfg.width; gx++) {
      if (gx % 2 === 0) {
        m.fillStyle = MINI.avenue;
        m.fillRect(gx * bs * sx, 0, rw * sx, mapH);
        m.fillStyle = 'rgba(245,217,75,0.35)';
        m.fillRect((gx * bs + rw / 2) * sx - 0.3, 0, 0.6, mapH);
      }
    }
    for (let gy = 0; gy * bs < wCfg.height; gy++) {
      if (gy % 2 === 0) {
        m.fillStyle = MINI.avenue;
        m.fillRect(0, gy * bs * sy, mapW, rw * sy);
        m.fillStyle = 'rgba(245,217,75,0.35)';
        m.fillRect(0, (gy * bs + rw / 2) * sy - 0.3, mapW, 0.6);
      }
    }

    // manzanas con color de barrio
    const cols = Math.floor(wCfg.width / bs);
    const rows = Math.floor(wCfg.height / bs);
    for (let gx = 0; gx < cols; gx++) {
      for (let gy = 0; gy < rows; gy++) {
        const bl = gx * bs + rw;
        const bt = gy * bs + rw;
        const d = World.getDistrictAt(bl + (bs - rw) / 2, bt + (bs - rw) / 2);
        m.fillStyle = MINI.block[d.id] || '#566';
        m.fillRect(bl * sx, bt * sy, (bs - rw) * sx, (bs - rw) * sy);
      }
    }

    // estacionamientos, agua
    m.fillStyle = MINI.parking;
    World.parkingLots.forEach((p) => m.fillRect(p.x * sx, p.y * sy, Math.max(2, p.w * sx), Math.max(2, p.h * sy)));
    m.fillStyle = MINI.water;
    World.waterZones.forEach((w) => m.fillRect(w.x * sx, w.y * sy, Math.max(2, w.w * sx), Math.max(2, w.h * sy)));

    // edificios por barrio
    World.buildings.forEach((b) => {
      m.fillStyle = b.isGarageRoof ? '#f5d94b' : b.isContainerBlock ? '#c0573b' : MINI.bld[b.districtId] || '#889';
      m.fillRect(b.x * sx, b.y * sy, Math.max(1.4, b.w * sx), Math.max(1.4, b.h * sy));
    });

    // parques: verde más claro, grandes más intensos
    World.parks.forEach((p) => {
      const big = p.sizeClass === 'large';
      const plaza = p.isPlaza;
      m.fillStyle = plaza ? '#8aa0a6' : big ? '#4fae4f' : p.sizeClass === 'small' ? '#6cb866' : '#5cb85c';
      const e = big ? 4 : 0;
      m.fillRect((p.x - e) * sx, (p.y - e) * sy, Math.max(2.2, (p.w + e * 2) * sx), Math.max(2.2, (p.h + e * 2) * sy));
      if (plaza) {
        m.fillStyle = '#3a86a8';
        m.beginPath();
        m.arc((p.x + p.w / 2) * sx, (p.y + p.h / 2) * sy, 1.1, 0, 6.3);
        m.fill();
      }
    });

    // contorno fino de barrios + nombres abreviados
    const districts = Config.DISTRICTS || [];
    districts.forEach((d) => {
      m.strokeStyle = d.color;
      m.globalAlpha = 0.55;
      m.lineWidth = 0.8;
      const b = d.bounds;
      m.strokeRect(b.x1 * sx + 0.5, b.y1 * sy + 0.5, (b.x2 - b.x1) * sx - 1, (b.y2 - b.y1) * sy - 1);
      if (d.extraBounds) {
        const e = d.extraBounds;
        m.strokeRect(e.x1 * sx + 0.5, e.y1 * sy + 0.5, (e.x2 - e.x1) * sx - 1, (e.y2 - e.y1) * sy - 1);
      }
      m.globalAlpha = 1;
      m.font = `bold ${mapW < 150 ? 5 : 6}px sans-serif`;
      m.textAlign = 'center';
      m.fillStyle = 'rgba(8,12,10,0.55)';
      const label = d.shortName.split(' ')[0].slice(0, 4);
      const lw = m.measureText(label).width + 3;
      m.fillRect(d.center.x * sx - lw / 2, d.center.y * sy - 4, lw, 6);
      m.fillStyle = d.color;
      m.fillText(label, d.center.x * sx, d.center.y * sy + 0.6);
    });

    miniCache[key] = cv;
    return cv;
  }

  function resetCaches() {
    Object.keys(miniCache).forEach((k) => delete miniCache[k]);
  }

  return {
    setDetail,
    getDetail,
    drawBuilding,
    drawPark,
    drawProp,
    drawTree,
    getSidewalkPattern,
    decorateBlock,
    getMinimapBase,
    resetCaches
  };
})();
