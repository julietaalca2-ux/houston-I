/* CIUDAD CERO v0.8.9 — FULL 3D WORLD RENDERER
 * Three.js scene layered over the legacy renderer. The original 2D engine remains
 * available as a safe fallback if WebGL or the Three.js CDN is unavailable.
 */
window.CiudadCero = window.CiudadCero || {};
CiudadCero.Renderer3D = (() => {
  const World = CiudadCero.World;
  let renderer = null, scene = null, camera = null, root = null;
  let playerMesh = null, playerShadow = null, facadeMaterial = null;
  let vehicleMeshes = [], pedestrianMeshes = [], npcMeshes = [];
  let active = false, lastResize = 0;
  // Third-person orbit camera: follows the protagonist from behind.
  let cameraYawOffset = 0, cameraPitchOffset = 0;
  let dragPointerId = null, lastPointerX = 0, lastPointerY = 0;
  let cameraReady = false;
  const THREE = window.THREE;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function material(color, roughness = 0.88, metalness = 0.02) {
    return new THREE.MeshStandardMaterial({ color, roughness, metalness });
  }

  function addBox(parent, x, y, z, w, h, d, mat, cast = true) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.position.set(x, y + h / 2, z);
    mesh.castShadow = cast;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }

  function districtColor(id, shade) {
    const palettes = {
      centro: ['#9ba7a8', '#87999d', '#b2b8b2', '#76888d'],
      comercial: ['#c1a889', '#a98d72', '#d0b69a', '#927b68'],
      loston: ['#b68f76', '#9e806e', '#c5a58b', '#806b62'],
      industrial: ['#858d87', '#747f7c', '#9ca19a', '#66736f'],
      portuaria: ['#8a9690', '#778781', '#a2aaa1', '#6b7975'],
      periferia: ['#b5a78c', '#9d967f', '#c7b99d', '#898875']
    };
    const p = palettes[id] || ['#a5aa9b', '#929b8e', '#b7b9a7', '#818b80'];
    return p[Math.abs(shade || 0) % p.length];
  }

  function buildGround() {
    const cfg = World.config;
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(cfg.width, cfg.height), material('#52634d'));
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(cfg.width / 2, -0.16, cfg.height / 2);
    ground.receiveShadow = true;
    root.add(ground);

    // City blocks and broad asphalt streets follow the original simulation grid.
    const bs = cfg.blockSize || 300;
    const road = material('#303a3b');
    const sidewalk = material('#92968d');
    for (let x = 0; x <= cfg.width; x += bs) {
      const r = new THREE.Mesh(new THREE.BoxGeometry(cfg.roadWidth || 150, 0.12, cfg.height), road);
      r.position.set(x + (cfg.roadWidth || 150) / 2, -0.045, cfg.height / 2);
      r.receiveShadow = true; root.add(r);
      const line = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.025, cfg.height), material('#c8c6a5'));
      line.position.set(x + (cfg.roadWidth || 150) / 2, 0.025, cfg.height / 2); root.add(line);
    }
    for (let z = 0; z <= cfg.height; z += bs) {
      const r = new THREE.Mesh(new THREE.BoxGeometry(cfg.width, 0.12, cfg.roadWidth || 150), road);
      r.position.set(cfg.width / 2, -0.045, z + (cfg.roadWidth || 150) / 2);
      r.receiveShadow = true; root.add(r);
    }
    // Sidewalk ribbons along both sides of each street.
    const sw = Math.max(8, cfg.sidewalkWidth || 18);
    for (let x = 0; x <= cfg.width; x += bs) {
      for (const offset of [sw * 0.5, (cfg.roadWidth || 150) - sw * 0.5]) {
        const s = new THREE.Mesh(new THREE.BoxGeometry(sw, 0.18, cfg.height), sidewalk);
        s.position.set(x + offset, 0.025, cfg.height / 2); root.add(s);
      }
    }
    for (let z = 0; z <= cfg.height; z += bs) {
      for (const offset of [sw * 0.5, (cfg.roadWidth || 150) - sw * 0.5]) {
        const s = new THREE.Mesh(new THREE.BoxGeometry(cfg.width, 0.18, sw), sidewalk);
        s.position.set(cfg.width / 2, 0.025, z + offset); root.add(s);
      }
    }
  }

  function buildParksAndWater() {
    World.waterZones.forEach((a) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(a.w, 0.3, a.h), new THREE.MeshStandardMaterial({ color: '#286b82', roughness: 0.25, metalness: 0.18 }));
      m.position.set(a.x + a.w / 2, 0.02, a.y + a.h / 2); root.add(m);
    });
    World.parks.forEach((p, i) => {
      const grass = new THREE.Mesh(new THREE.BoxGeometry(p.w, 0.22, p.h), material(p.isMeadow ? '#667d4e' : (p.isPlaza ? '#71866a' : '#55734f')));
      grass.position.set(p.x + p.w / 2, 0.035, p.y + p.h / 2); grass.receiveShadow = true; root.add(grass);
      const count = p.sizeClass === 'large' ? 12 : 5;
      for (let n = 0; n < count; n++) {
        const tx = p.x + 16 + ((n * 47 + i * 19) % Math.max(24, p.w - 32));
        const tz = p.y + 16 + ((n * 61 + i * 13) % Math.max(24, p.h - 32));
        addTree(tx, tz, 0.72 + (n % 3) * 0.13);
      }
    });
  }

  function addTree(x, z, scale = 1) {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(1.2 * scale, 1.8 * scale, 9 * scale, 7), material('#66513d'));
    trunk.position.set(x, 4.5 * scale, z); trunk.castShadow = true; root.add(trunk);
    const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(6.2 * scale, 1), material('#456d49'));
    crown.position.set(x, 11 * scale, z); crown.castShadow = true; root.add(crown);
    const crown2 = new THREE.Mesh(new THREE.IcosahedronGeometry(4.3 * scale, 1), material('#5e8050'));
    crown2.position.set(x + 2 * scale, 13 * scale, z - 1.5 * scale); crown2.castShadow = true; root.add(crown2);
  }

  function addBuilding(b, index) {
    const id = b.districtId || 'residencial';
    const role = b.footprintRole || '';
    let floors = id === 'centro' ? 5 + (index % 13) : id === 'comercial' || id === 'loston' ? 2 + (index % 4) : id === 'industrial' || id === 'portuaria' ? 1 + (index % 2) : 1 + (index % 3);
    if (role === 'tower') floors += 8;
    if (role === 'warehouse') floors = 2;
    if (role === 'detached-home' || role === 'residence') floors = 1 + (index % 2);
    if (b.isHideoutWall) floors = 1;
    const height = clamp(floors * 8.5, 7, 178);
    const x = b.x + b.w / 2, z = b.y + b.h / 2;
    const baseMat = material(districtColor(id, b.shade));
    const body = addBox(root, x, 0.12, z, Math.max(8, b.w - 2), height, Math.max(8, b.h - 2), baseMat);
    body.userData.building = true;

    // Slightly recessed roof cap, parapet and rooftop mechanical equipment.
    const roofMat = material(id === 'centro' ? '#69777a' : '#777d73');
    addBox(root, x, height + 0.12, z, Math.max(7, b.w - 7), 1.2, Math.max(7, b.h - 7), roofMat, false);
    if (height > 22 && b.w > 28 && b.h > 28) {
      const units = Math.max(1, Math.floor(Math.min(b.w, b.h) / 44));
      for (let u = 0; u < Math.min(4, units); u++) {
        const ux = x - b.w * 0.22 + u * 8;
        const vent = addBox(root, ux, height + 1.35, z - b.h * 0.18, 5, 2.2, 5, material('#59635f'), false);
        vent.castShadow = false;
      }
    }

    // Repeated facade bands create visible scale and depth without hundreds of textures.
    if (b.w > 24 && b.h > 24 && !b.isHideoutWall && facadeMaterial) {
      // One textured facade per visible side keeps the city detailed without
      // creating thousands of individual window meshes on mobile devices.
      const front = new THREE.Mesh(new THREE.PlaneGeometry(Math.max(5, b.w * 0.70), Math.max(5, height * 0.82)), facadeMaterial);
      front.position.set(x, height * 0.52 + 0.12, b.y + 1.05);
      root.add(front);
      const side = new THREE.Mesh(new THREE.PlaneGeometry(Math.max(5, b.h * 0.66), Math.max(5, height * 0.82)), facadeMaterial);
      side.rotation.y = Math.PI / 2;
      side.position.set(b.x + b.w - 1.05, height * 0.52 + 0.12, z);
      root.add(side);
    }
  }

  function buildCity() {
    buildGround(); buildParksAndWater();
    World.buildings.forEach(addBuilding);
    (World.props || []).forEach((p) => {
      if (p.type === 'hydrant' || p.type === 'barrel') {
        const obj = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 2.2, 4.5, 7), material(p.type === 'hydrant' ? '#b84d3e' : (p.color || '#a65a38')));
        obj.position.set(p.x, 2.25, p.y); root.add(obj);
      } else if (p.type === 'billboard') {
        const board = addBox(root, p.x + 8, 10, p.y + 8, 20, 12, 1.4, material(p.color || '#d6b94e'));
      }
    });
  }

  function makeCar(color = '#d5d7d2', police = false) {
    const group = new THREE.Group();
    const bodyMat = material(police ? '#e7e9e7' : color, 0.48, 0.16);
    const glass = new THREE.MeshStandardMaterial({ color: '#263b46', roughness: 0.2, metalness: 0.25 });
    addBox(group, 0, 1.4, 0, 10, 2.2, 18, bodyMat);
    addBox(group, 0, 3.0, -1, 8.2, 2.0, 9, glass);
    if (police) {
      addBox(group, 0, 4.15, -1, 4.5, 0.55, 2.0, material('#d93f3b'), false);
      addBox(group, -2.5, 4.15, -1, 1.4, 0.55, 2.0, material('#3d80d5'), false);
    }
    const wheelMat = material('#171b1d');
    [[-5,1, -5.8],[5,1,-5.8],[-5,1,5.8],[5,1,5.8]].forEach(([x,y,z]) => {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(2.0,2.0,1.2,10), wheelMat);
      wheel.rotation.z = Math.PI / 2; wheel.position.set(x,y,z); group.add(wheel);
    });
    return group;
  }

  function makePerson(color = '#d6d9d2') {
    const g = new THREE.Group();
    const shirt = material(color);
    const skin = material('#c89d7d');
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(2.1, 4.2, 3, 6), shirt); torso.position.y = 6.5; torso.castShadow = true; g.add(torso);
    const head = new THREE.Mesh(new THREE.SphereGeometry(1.8, 10, 8), skin); head.position.y = 11.2; head.castShadow = true; g.add(head);
    return g;
  }

  function init() {
    if (!THREE || !THREE.WebGLRenderer) return false;
    const frame = document.getElementById('game-frame');
    const baseCanvas = document.getElementById('game');
    if (!frame || !baseCanvas) return false;
    const canvas = document.createElement('canvas');
    canvas.id = 'game-3d';
    canvas.setAttribute('aria-label', 'Vista 3D en tercera persona de Ciudad Cero. Arrastrá para girar la cámara.');
    canvas.style.touchAction = 'none';
    canvas.style.pointerEvents = 'auto';
    frame.insertBefore(canvas, frame.firstChild);
    // Dragging on the world rotates the orbit camera; gameplay controls remain
    // available because the touch joystick/buttons are separate overlay elements.
    canvas.addEventListener('pointerdown', (event) => {
      if (event.button !== undefined && event.button !== 0) return;
      dragPointerId = event.pointerId;
      lastPointerX = event.clientX; lastPointerY = event.clientY;
      try { canvas.setPointerCapture(event.pointerId); } catch (_) {}
    });
    canvas.addEventListener('pointermove', (event) => {
      if (dragPointerId !== event.pointerId) return;
      const dx = event.clientX - lastPointerX;
      const dy = event.clientY - lastPointerY;
      lastPointerX = event.clientX; lastPointerY = event.clientY;
      cameraYawOffset = clamp(cameraYawOffset - dx * 0.006, -Math.PI * 0.92, Math.PI * 0.92);
      cameraPitchOffset = clamp(cameraPitchOffset + dy * 0.0035, -0.12, 0.34);
    });
    const releaseCameraDrag = (event) => { if (dragPointerId === event.pointerId) dragPointerId = null; };
    canvas.addEventListener('pointerup', releaseCameraDrag);
    canvas.addEventListener('pointercancel', releaseCameraDrag);
    canvas.addEventListener('lostpointercapture', releaseCameraDrag);
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
    } catch (err) {
      canvas.remove(); renderer = null; return false;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    scene = new THREE.Scene();
    scene.background = new THREE.Color('#a9c5cf');
    scene.fog = new THREE.Fog('#a9c5cf', 520, 2100);
    camera = new THREE.PerspectiveCamera(62, 1, 0.1, 5000);
    root = new THREE.Group(); scene.add(root);
    const facadeCanvas = document.createElement('canvas');
    facadeCanvas.width = 128; facadeCanvas.height = 128;
    const facadeCtx = facadeCanvas.getContext('2d');
    facadeCtx.fillStyle = '#536c72'; facadeCtx.fillRect(0, 0, 128, 128);
    for (let fy = 5; fy < 128; fy += 18) {
      for (let fx = 5; fx < 128; fx += 18) {
        facadeCtx.fillStyle = ((fx + fy) / 18) % 3 === 0 ? '#b4c5bf' : '#9ab4b8';
        facadeCtx.fillRect(fx, fy, 11, 10);
        facadeCtx.fillStyle = 'rgba(20,35,39,.35)'; facadeCtx.fillRect(fx, fy + 9, 11, 2);
      }
    }
    const facadeTexture = new THREE.CanvasTexture(facadeCanvas);
    facadeTexture.colorSpace = THREE.SRGBColorSpace;
    facadeTexture.wrapS = THREE.RepeatWrapping; facadeTexture.wrapT = THREE.RepeatWrapping;
    facadeMaterial = new THREE.MeshStandardMaterial({ map: facadeTexture, transparent: true, roughness: 0.38, metalness: 0.16, emissive: '#14252a', emissiveIntensity: 0.10, side: THREE.DoubleSide });
    scene.add(new THREE.HemisphereLight('#dceeff', '#59634d', 2.0));
    const sun = new THREE.DirectionalLight('#fff1d5', 3.0);
    sun.position.set(-450, 900, -350); sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -500; sun.shadow.camera.right = 500;
    sun.shadow.camera.top = 500; sun.shadow.camera.bottom = -500;
    scene.add(sun);
    buildCity();
    playerMesh = makePerson('#d4e0ce'); scene.add(playerMesh);
    playerShadow = new THREE.Mesh(new THREE.CircleGeometry(5.5, 16), new THREE.MeshBasicMaterial({ color: '#17231c', transparent: true, opacity: 0.28 }));
    playerShadow.rotation.x = -Math.PI / 2; playerShadow.position.y = 0.08; scene.add(playerShadow);
    active = true;
    resize();
    baseCanvas.style.opacity = '0';
    baseCanvas.style.pointerEvents = 'auto';
    return true;
  }

  function resize() {
    if (!renderer || !camera) return;
    const frame = document.getElementById('game-frame');
    const w = Math.max(1, frame.clientWidth), h = Math.max(1, frame.clientHeight);
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    lastResize = performance.now();
  }

  function syncActors(list, meshes, factory, isVehicle) {
    const items = Array.isArray(list) ? list : [];
    while (meshes.length < items.length) {
      const m = factory(items[meshes.length]); scene.add(m); meshes.push(m);
    }
    for (let i = 0; i < meshes.length; i++) {
      const m = meshes[i], item = items[i];
      m.visible = Boolean(item && Number.isFinite(item.x) && Number.isFinite(item.y));
      if (!m.visible) continue;
      m.position.x = item.x; m.position.z = item.y;
      // Simulation angle 0 points along +X; Three.js models face local -Z.
      m.rotation.y = -(item.angle || 0) - Math.PI / 2;
    }
  }

  function render(state) {
    if (!active || !renderer) return false;
    if (performance.now() - lastResize > 500) resize();
    const p = state && state.player;
    if (!p) return false;
    if (p.inCar && p.vehicle) {
      if (!playerMesh.userData.carMode) {
        scene.remove(playerMesh);
        playerMesh = makeCar(p.vehicle.color || '#d6d8d3', p.vehicle.typeId === 'police');
        scene.add(playerMesh); playerMesh.userData.carMode = true;
      }
    } else if (playerMesh.userData.carMode) {
      scene.remove(playerMesh); playerMesh = makePerson('#d4e0ce'); scene.add(playerMesh);
    }
    playerMesh.position.set(p.x, 0, p.y);
    playerMesh.rotation.y = -(p.angle || 0) - Math.PI / 2;
    playerShadow.position.set(p.x, 0.09, p.y);

    const vehicles = (state.vehicles || []).filter(v => v && v !== p.vehicle && (Math.abs(v.x-p.x) < 620 && Math.abs(v.y-p.y) < 620)).slice(0, 42);
    syncActors(vehicles, vehicleMeshes, (v) => makeCar(v.color || '#9da8a2', v.typeId === 'police'), true);
    const pedestrians = (state.pedestrians || []).filter(v => v && Math.abs(v.x-p.x) < 420 && Math.abs(v.y-p.y) < 420).slice(0, 55);
    syncActors(pedestrians, pedestrianMeshes, (v) => makePerson(v.isPolice ? '#263d57' : '#b5b8a9'), false);
    const npcs = (state.npcs || []).filter(v => v && Math.abs(v.x-p.x) < 420 && Math.abs(v.y-p.y) < 420).slice(0, 18);
    syncActors(npcs, npcMeshes, () => makePerson('#d3b77d'), false);

    // Third-person TPS camera: stay behind the direction of travel, slightly
    // above shoulder height. Drag horizontally to orbit; drag vertically to
    // adjust the viewing pitch. The camera target leads the character a little.
    const angle = p.angle || 0;
    const orbitAngle = angle + cameraYawOffset;
    const distance = p.inCar ? 76 : 43;
    const cameraHeight = (p.inCar ? 27 : 22) + cameraPitchOffset * 34;
    const targetHeight = p.inCar ? 8 : 8.5;
    const forwardX = Math.cos(angle), forwardZ = Math.sin(angle);
    const target = new THREE.Vector3(p.x + forwardX * 5, targetHeight, p.y + forwardZ * 5);
    const desired = new THREE.Vector3(
      p.x - Math.cos(orbitAngle) * distance,
      cameraHeight,
      p.y - Math.sin(orbitAngle) * distance
    );
    if (!cameraReady) { camera.position.copy(desired); cameraReady = true; }
    else camera.position.lerp(desired, 0.11);
    camera.lookAt(target);
    renderer.render(scene, camera);
    return true;
  }

  function isActive() { return active; }
  function getStatus() { return { active, renderer: Boolean(renderer), buildings: World.buildings.length }; }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
  window.addEventListener('resize', resize);
  return { render, resize, isActive, getStatus };
})();
