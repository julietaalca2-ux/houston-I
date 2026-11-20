/* CIUDAD CERO v0.8.9 — FULL 3D WORLD RENDERER
 * Three.js scene layered over the legacy renderer. The original 2D engine remains
 * available as a safe fallback if WebGL or the Three.js CDN is unavailable.
 */
window.CiudadCero = window.CiudadCero || {};
CiudadCero.Renderer3D = (() => {
  const World = CiudadCero.World;
  let renderer = null, scene = null, camera = null, root = null;
  let playerMesh = null, playerShadow = null;
  let vehicleMeshes = [], pedestrianMeshes = [], npcMeshes = [];
  let active = false, lastResize = 0, lastEngineFrameTime = 0;
  let surfaceTextures = null, qualityProfile = 'high';
  let vehicleTreadTexture = null, vehicleMetalTexture = null, vehicleGlassTexture = null;
  let vehiclePaintTexture = null, vehicleGlass4KTexture = null, fabricTexture = null, skinDetailTexture = null, hairTexture = null;
  const vehiclePaintMaterials = [], vehicleTireMaterials = [], vehicleGlassMaterials = [], characterFabricMaterials = [], characterSkinMaterials = [], characterHairMaterials = [];
  let sunLight = null, hemiLight = null, fillLight = null, rainPoints = null, rainPositions = null;
  let asphaltMaterial = null, sidewalkMaterial = null, facadeMaterial = null, environmentClock = 0, environmentState = { phase: 'day', weather: 'clear', wetness: 0 };
  // Third-person orbit camera: follows the protagonist from behind.
  let cameraYawOffset = 0, cameraPitchOffset = 0; // cameraYawOffset is an absolute world heading
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


  // High-resolution procedural material library. Textures are generated locally,
  // so the game does not depend on external image hosts and remains offline-capable.
  function makeSurfaceTexture(kind, size = 1024) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d', { alpha: false });
    const palettes = {
      asphalt: ['#303638', '#383f40', '#272e30'],
      concrete: ['#a2a39a', '#92968f', '#b1b0a5'],
      grass: ['#435d3d', '#506b43', '#60764a']
    };
    const colors = palettes[kind] || palettes.concrete;
    ctx.fillStyle = colors[0]; ctx.fillRect(0, 0, size, size);
    let seed = kind.length * 7919 + size;
    const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    for (let i = 0; i < (kind === 'grass' ? 26000 : 19000); i++) {
      const x = rand() * size, y = rand() * size;
      const r = kind === 'grass' ? 1 + rand() * 4 : 0.5 + rand() * 2.2;
      ctx.globalAlpha = 0.08 + rand() * 0.22;
      ctx.fillStyle = colors[Math.floor(rand() * colors.length)];
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    if (kind === 'concrete') {
      ctx.strokeStyle = 'rgba(55,60,57,.12)'; ctx.lineWidth = 2;
      for (let y = 0; y < size; y += 256) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(size,y); ctx.stroke(); }
    }
    if (kind === 'asphalt') {
      // Fine aggregate and faint tire-wear streaks.
      for (let i = 0; i < 80; i++) {
        const y = rand() * size; ctx.fillStyle = 'rgba(12,16,17,.10)';
        ctx.fillRect(0, y, size, 1 + rand() * 3);
      }
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.anisotropy = renderer && renderer.capabilities ? Math.min(8, renderer.capabilities.getMaxAnisotropy()) : 4;
    tex.needsUpdate = true;
    return tex;
  }

  function makeFacadeTexture() {
    const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 1024;
    const ctx = canvas.getContext('2d');
    const gradients = ctx.createLinearGradient(0, 0, 1024, 1024);
    gradients.addColorStop(0, '#53666a'); gradients.addColorStop(.5, '#34494f'); gradients.addColorStop(1, '#718083');
    ctx.fillStyle = gradients; ctx.fillRect(0, 0, 1024, 1024);
    let seed = 45231; const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    const cols = 8, rows = 9, cellW = 1024 / cols, cellH = 1024 / rows;
    for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
      const x = col * cellW + 17, y = row * cellH + 15;
      const w = cellW - 34, h = cellH - 30;
      ctx.fillStyle = '#1d2b30'; ctx.fillRect(x-5, y-5, w+10, h+10);
      const lit = rand() > .31;
      const glass = ctx.createLinearGradient(x, y, x+w, y+h);
      glass.addColorStop(0, lit ? '#a9c5c4' : '#263b43');
      glass.addColorStop(.48, lit ? '#718f94' : '#314b55');
      glass.addColorStop(1, lit ? '#3c5a62' : '#172c35');
      ctx.fillStyle = glass; ctx.fillRect(x, y, w, h);
      ctx.fillStyle = 'rgba(230,239,229,.28)'; ctx.fillRect(x+5, y+4, 3, h-8);
      ctx.fillStyle = 'rgba(9,20,24,.45)'; ctx.fillRect(x, y+h-5, w, 5);
      ctx.fillStyle = 'rgba(195,208,201,.55)'; ctx.fillRect(x-3, y+h+2, w+6, 5);
    }
    // Subtle vertical concrete pilasters and horizontal floor bands.
    ctx.fillStyle = 'rgba(190,201,194,.18)';
    for (let x = 0; x < 1024; x += 128) ctx.fillRect(x, 0, 7, 1024);
    for (let y = 0; y < 1024; y += 114) ctx.fillRect(0, y, 1024, 5);
    const tex = new THREE.CanvasTexture(canvas); tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.anisotropy = renderer && renderer.capabilities ? Math.min(8, renderer.capabilities.getMaxAnisotropy()) : 4;
    return tex;
  }

  function createSurfaceLibrary() {
    // Canvas maps are immediate fallbacks; bundled 2K maps replace their pixel
    // sources as soon as local files finish loading (works on GitHub Pages too).
    surfaceTextures = {
      asphalt: makeSurfaceTexture('asphalt'),
      concrete: makeSurfaceTexture('concrete'),
      grass: makeSurfaceTexture('grass'),
      facade: makeFacadeTexture(),
      brick: makeFacadeTexture(),
      roof: makeSurfaceTexture('asphalt'),
      foliage: makeSurfaceTexture('grass'),
      metal: makeSurfaceTexture('concrete')
    };
    const loader = new THREE.TextureLoader();
    const bundled = [
      ['asphalt', 'assets/textures/expansion_v019_2k/urban_asphalt_grain_2k.jpg'],
      ['concrete', 'assets/textures/expansion_v019_2k/urban_concrete_worn_2k.jpg'],
      ['grass', 'assets/textures/expansion_v019_2k/grass_dense_2k.jpg'],
      ['facade', 'assets/textures/expansion_v019_2k/facade_stucco_warm_2k.jpg'],
      ['brick', 'assets/textures/expansion_v019_2k/brick_red_2k.jpg'],
      ['roof', 'assets/textures/expansion_v019_2k/roof_tiles_2k.jpg'],
      ['foliage', 'assets/textures/expansion_v019_2k/leaf_canopy_2k.jpg'],
      ['metal', 'assets/textures/expansion_v019_2k/steel_weathered_2k.jpg']
    ];
    bundled.forEach(([key, url]) => {
      loader.load(url, (loaded) => {
        const target = surfaceTextures[key];
        target.image = loaded.image;
        target.colorSpace = THREE.SRGBColorSpace;
        target.wrapS = target.wrapT = THREE.RepeatWrapping;
        target.needsUpdate = true;
        loaded.dispose();
      }, undefined, () => {
        // Keep the procedural canvas fallback if an asset is unavailable.
      });
    });
    // Physically based detail maps: normal maps add micro-relief and roughness
    // maps control highlights without increasing polygon count.
    const pbrMaps = [
      ['asphalt', 'normalMap', 'assets/textures/asphalt_normal_2k.jpg'],
      ['asphalt', 'roughnessMap', 'assets/textures/asphalt_roughness_2k.jpg'],
      ['concrete', 'normalMap', 'assets/textures/concrete_normal_2k.jpg'],
      ['concrete', 'roughnessMap', 'assets/textures/concrete_roughness_2k.jpg'],
      ['facade', 'normalMap', 'assets/textures/facade_normal_2k.jpg'],
      ['facade', 'roughnessMap', 'assets/textures/facade_roughness_2k.jpg'],
      ['facade', 'emissiveMap', 'assets/textures/building_emissive_2k.jpg']
    ];
    loader.load('assets/textures/vehicle_tire_tread_2k.jpg', (map) => { map.wrapS = map.wrapT = THREE.RepeatWrapping; vehicleTreadTexture = map; }, undefined, () => {});
    loader.load('assets/textures/vehicle_brushed_metal_2k.jpg', (map) => { map.wrapS = map.wrapT = THREE.RepeatWrapping; vehicleMetalTexture = map; }, undefined, () => {});
    loader.load('assets/textures/vehicle_glass_reflection_2k.jpg', (map) => { map.colorSpace = THREE.SRGBColorSpace; map.wrapS = map.wrapT = THREE.RepeatWrapping; vehicleGlassTexture = map; }, undefined, () => {});

    // V0.20 asset expansion: load additional high-resolution texture variants.
    // These variants are attached to existing material slots as they arrive; the
    // renderer keeps its procedural/base texture fallback if any request fails.
    const expansionVariants = [
      ['assets/textures/expansion_v019_2k/urban_asphalt_patch_2k.jpg', 'asphalt'],
      ['assets/textures/expansion_v019_2k/urban_concrete_clean_2k.jpg', 'concrete'],
      ['assets/textures/expansion_v019_2k/brick_dark_2k.jpg', 'brick'],
      ['assets/textures/expansion_v019_2k/facade_panel_2k.jpg', 'facade'],
      ['assets/textures/expansion_v019_2k/roof_tar_2k.jpg', 'roof']
    ];
    expansionVariants.forEach(([url, key]) => loader.load(url, (map) => {
      map.colorSpace = THREE.SRGBColorSpace;
      map.wrapS = map.wrapT = THREE.RepeatWrapping;
      map.anisotropy = renderer && renderer.capabilities ? Math.min(8, renderer.capabilities.getMaxAnisotropy()) : 4;
      // Preserve these as extra detail layers in the shared texture library.
      surfaceTextures[key + 'Variant'] = map;
    }, undefined, () => {}));

    // V0.21 mega expansion: desktop Ultra profile streams selected 4K materials.
    // Avoid loading this texture set on mobile to protect GPU memory and frame time.
    if (qualityProfile === 'ultra' && !/Android|iPhone|iPad|iPod/i.test(navigator.userAgent || '')) {
      const ultraMaterials = [
        ['asphalt', 'assets/textures/expansion_v021_4k/asphalt_fresh_4k.jpg'],
        ['concrete', 'assets/textures/expansion_v021_4k/concrete_blocks_4k.jpg'],
        ['facade', 'assets/textures/expansion_v021_4k/facade_plaster_4k.jpg'],
        ['brick', 'assets/textures/expansion_v021_4k/brick_varied_4k.jpg'],
        ['roof', 'assets/textures/expansion_v021_4k/roof_tiles_4k.jpg'],
        ['grass', 'assets/textures/expansion_v021_4k/grass_urban_4k.jpg'],
        ['foliage', 'assets/textures/expansion_v021_4k/foliage_detail_4k.jpg']
      ];
      ultraMaterials.forEach(([key, url]) => loader.load(url, (map) => {
        map.colorSpace = THREE.SRGBColorSpace;
        map.wrapS = map.wrapT = THREE.RepeatWrapping;
        map.anisotropy = renderer && renderer.capabilities ? Math.min(4, renderer.capabilities.getMaxAnisotropy()) : 2;
        surfaceTextures[key + '4K'] = map;
        if (key === 'asphalt' && asphaltMaterial) { asphaltMaterial.map = map; asphaltMaterial.needsUpdate = true; }
        if (key === 'concrete' && sidewalkMaterial) { sidewalkMaterial.map = map; sidewalkMaterial.needsUpdate = true; }
        if (key === 'facade' && facadeMaterial) { facadeMaterial.map = map; facadeMaterial.needsUpdate = true; }
      }, undefined, () => {}));
    }

    // V0.23.0: complete 4K source library for the world, vehicles and characters.
    // Desktop Ultra streams these maps; mobile keeps the existing 2K/PBR fallbacks
    // to avoid exceeding iPhone GPU memory and thermal budgets.
    if (qualityProfile === 'ultra' && !/Android|iPhone|iPad|iPod/i.test(navigator.userAgent || '')) {
      const ultraLibrary = [
        ['asphalt','road_asphalt_4k.jpg'], ['concrete','sidewalk_concrete_4k.jpg'],
        ['facade','facade_stucco_4k.jpg'], ['brick','brick_red_4k.jpg'],
        ['roof','roof_tiles_4k.jpg'], ['grass','urban_grass_4k.jpg'],
        ['foliage','foliage_leaves_4k.jpg'], ['metal','brushed_steel_4k.jpg']
      ];
      ultraLibrary.forEach(([key,file]) => loader.load('assets/textures/expansion_v023_4k/'+file, (map) => {
        map.colorSpace = THREE.SRGBColorSpace; map.wrapS = map.wrapT = THREE.RepeatWrapping;
        map.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
        const target = surfaceTextures[key]; if (target) { target.image = map.image; target.needsUpdate = true; map.dispose(); }
        if (key === 'asphalt' && asphaltMaterial) asphaltMaterial.map = map;
        if (key === 'concrete' && sidewalkMaterial) sidewalkMaterial.map = map;
        if ((key === 'facade' || key === 'brick') && facadeMaterial) facadeMaterial.map = map;
      }, undefined, () => {}));
      const ultraPBR = [
        ['asphalt','normalMap','road_asphalt_normal_4k.jpg'], ['asphalt','roughnessMap','road_asphalt_roughness_4k.jpg'],
        ['concrete','normalMap','sidewalk_concrete_normal_4k.jpg'], ['concrete','roughnessMap','sidewalk_concrete_roughness_4k.jpg'],
        ['facade','normalMap','facade_stucco_normal_4k.jpg'], ['facade','roughnessMap','facade_stucco_roughness_4k.jpg']
      ];
      ultraPBR.forEach(([key,slot,file]) => loader.load('assets/textures/expansion_v023_4k/'+file, (map) => {
        map.wrapS = map.wrapT = THREE.RepeatWrapping; map.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
        const target = surfaceTextures[key]; if (target) target[slot] = map;
        const mat = key === 'asphalt' ? asphaltMaterial : key === 'concrete' ? sidewalkMaterial : facadeMaterial;
        if (mat) { mat[slot] = map; mat.needsUpdate = true; }
      }, undefined, () => {}));
      loader.load('assets/textures/expansion_v023_4k/vehicle_paint_4k.jpg', (map) => {
        map.colorSpace = THREE.SRGBColorSpace; map.wrapS = map.wrapT = THREE.RepeatWrapping; vehiclePaintTexture = map;
        vehiclePaintMaterials.forEach((m) => { m.map = map; m.needsUpdate = true; });
      }, undefined, () => {});
      loader.load('assets/textures/expansion_v023_4k/vehicle_glass_4k.jpg', (map) => { map.colorSpace = THREE.SRGBColorSpace; map.wrapS = map.wrapT = THREE.RepeatWrapping; vehicleGlass4KTexture = map; vehicleGlassMaterials.forEach((m) => { m.map = map; m.needsUpdate = true; }); }, undefined, () => {});
      loader.load('assets/textures/expansion_v023_4k/hair_strands_4k.jpg', (map) => { map.colorSpace = THREE.SRGBColorSpace; map.wrapS = map.wrapT = THREE.RepeatWrapping; hairTexture = map; characterHairMaterials.forEach((m) => { m.map = map; m.needsUpdate = true; }); }, undefined, () => {});
      loader.load('assets/textures/expansion_v023_4k/tire_rubber_4k.jpg', (map) => {
        map.wrapS = map.wrapT = THREE.RepeatWrapping; vehicleTreadTexture = map; vehicleTireMaterials.forEach((m) => { m.map = map; m.needsUpdate = true; });
      }, undefined, () => {});
      loader.load('assets/textures/expansion_v023_4k/clothing_fabric_4k.jpg', (map) => {
        map.colorSpace = THREE.SRGBColorSpace; map.wrapS = map.wrapT = THREE.RepeatWrapping; fabricTexture = map;
        characterFabricMaterials.forEach((m) => { m.map = map; m.needsUpdate = true; });
      }, undefined, () => {});
      loader.load('assets/textures/expansion_v023_4k/skin_microdetail_4k.jpg', (map) => {
        map.colorSpace = THREE.SRGBColorSpace; map.wrapS = map.wrapT = THREE.RepeatWrapping; skinDetailTexture = map;
        characterSkinMaterials.forEach((m) => { m.map = map; m.needsUpdate = true; });
      }, undefined, () => {});
    }

    pbrMaps.forEach(([key, slot, url]) => loader.load(url, (map) => {
      const target = surfaceTextures[key];
      map.wrapS = map.wrapT = THREE.RepeatWrapping;
      map.anisotropy = renderer && renderer.capabilities ? Math.min(8, renderer.capabilities.getMaxAnisotropy()) : 4;
      if (slot === 'emissiveMap') map.colorSpace = THREE.SRGBColorSpace;
      target[slot] = map;
      if (key === 'asphalt' && asphaltMaterial) asphaltMaterial[slot] = map;
      if (key === 'concrete' && sidewalkMaterial) sidewalkMaterial[slot] = map;
      if (key === 'facade' && facadeMaterial) facadeMaterial[slot] = map;
      if (slot === 'emissiveMap') { target.emissive = new THREE.Color('#82999a'); target.emissiveIntensity = 0.18; if (facadeMaterial) { facadeMaterial.emissiveMap = map; facadeMaterial.emissive.set('#82999a'); } }
      target.needsUpdate = true;
    }, undefined, () => {}));
  }

  function buildGround() {
    const cfg = World.config;
    const groundMat = new THREE.MeshStandardMaterial({ color: '#a2ad91', map: surfaceTextures.grass, roughness: 1 });
    surfaceTextures.grass.repeat.set(18, 12);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(cfg.width, cfg.height), groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(cfg.width / 2, -0.16, cfg.height / 2);
    ground.receiveShadow = true;
    root.add(ground);

    // City blocks and broad asphalt streets follow the original simulation grid.
    const bs = cfg.blockSize || 300;
    surfaceTextures.asphalt.repeat.set(5, 5);
    surfaceTextures.concrete.repeat.set(3, 3);
    asphaltMaterial = new THREE.MeshStandardMaterial({ color: '#aab0ae', map: surfaceTextures.asphalt, normalMap: surfaceTextures.asphalt.normalMap, roughnessMap: surfaceTextures.asphalt.roughnessMap, roughness: 0.96 });
    const road = asphaltMaterial;
    sidewalkMaterial = new THREE.MeshStandardMaterial({ color: '#b8b8ad', map: surfaceTextures.concrete, normalMap: surfaceTextures.concrete.normalMap, roughnessMap: surfaceTextures.concrete.roughnessMap, roughness: 0.94 });
    const sidewalk = sidewalkMaterial;
    for (let x = 0; x <= cfg.width; x += bs) {
      const r = new THREE.Mesh(new THREE.BoxGeometry(cfg.roadWidth || 150, 0.12, cfg.height), road);
      r.position.set(x + (cfg.roadWidth || 150) / 2, -0.045, cfg.height / 2);
      r.receiveShadow = true; root.add(r);
      // Dashed lane separators are lightweight geometry shared by the entire avenue.
      const laneX = x + (cfg.roadWidth || 150) / 2;
      for (let z = 30; z < cfg.height; z += 92) {
        const dash = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.035, 34), material('#d8d2b7'));
        dash.position.set(laneX, 0.035, z); root.add(dash);
      }
    }
    for (let z = 0; z <= cfg.height; z += bs) {
      const r = new THREE.Mesh(new THREE.BoxGeometry(cfg.width, 0.12, cfg.roadWidth || 150), road);
      r.position.set(cfg.width / 2, -0.045, z + (cfg.roadWidth || 150) / 2);
      r.receiveShadow = true; root.add(r);
      const laneZ = z + (cfg.roadWidth || 150) / 2;
      for (let x = 30; x < cfg.width; x += 92) {
        const dash = new THREE.Mesh(new THREE.BoxGeometry(34, 0.035, 2.2), material('#d8d2b7'));
        dash.position.set(x, 0.035, laneZ); root.add(dash);
      }
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
    const crownMat = new THREE.MeshStandardMaterial({ color: '#78906a', map: surfaceTextures.foliage, roughness: 0.94 });
    const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(6.2 * scale, 1), crownMat);
    crown.position.set(x, 11 * scale, z); crown.castShadow = true; root.add(crown);
    const crown2 = new THREE.Mesh(new THREE.IcosahedronGeometry(4.3 * scale, 1), crownMat);
    crown2.position.set(x + 2 * scale, 13 * scale, z - 1.5 * scale); crown2.castShadow = true; root.add(crown2);
  }

  function addBuilding(b, index) {
    const id = b.districtId || 'residencial';
    const role = b.footprintRole || '';
    let floors = id === 'centro' ? 5 + (index % 13) : id === 'comercial' || id === 'loston' ? 2 + (index % 4) : id === 'industrial' || id === 'portuaria' ? 1 + (index % 2) : 1 + (index % 3);
    if (role === 'tower') floors += 8;
    if (role === 'warehouse') floors = 2;
    // V0.24.0: suburban/residential homes are deliberately two full storeys
    // plus roof massing so they read clearly taller than the ~11-unit player.
    if (role === 'detached-home' || role === 'residence') floors = 2.6 + (index % 3) * 0.25;
    if (role === 'apartment') floors = Math.max(floors, 3);
    if (b.isHideoutWall) floors = 1;
    const height = clamp(floors * 8.5, 7, 178);
    const x = b.x + b.w / 2, z = b.y + b.h / 2;
    const baseMat = new THREE.MeshStandardMaterial({ color: districtColor(id, b.shade), map: id === 'industrial' || id === 'portuaria' ? surfaceTextures.roof : surfaceTextures.brick, roughness: 0.88 });
    const body = addBox(root, x, 0.12, z, Math.max(8, b.w - 2), height, Math.max(8, b.h - 2), baseMat);
    body.userData.building = true;

    // Slightly recessed roof cap, parapet and rooftop mechanical equipment.
    const roofMat = new THREE.MeshStandardMaterial({ color: '#8b918b', map: surfaceTextures.roof, roughness: 0.96 });
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
      // Architectural corner pilasters and a visible street-level plinth.
      const trimMat = material(id === 'centro' ? '#aab5b1' : '#777e79', 0.72, 0.08);
      addBox(root, b.x + 1.5, 0.18, b.y + 1.5, 1.8, height, 1.8, trimMat, false);
      addBox(root, b.x + b.w - 3.3, 0.18, b.y + b.h - 3.3, 1.8, height, 1.8, trimMat, false);
      addBox(root, x, 0.18, z, Math.max(8, b.w - 1), 1.1, Math.max(8, b.h - 1), trimMat, false);
      // Repeated recessed window bays and shallow balconies on residential blocks.
      if (role === 'detached-home' || role === 'residence' || role === 'apartment') {
        const windowMat = new THREE.MeshStandardMaterial({ color:'#8db6c5', emissive:'#28434c', emissiveIntensity:0.16, roughness:0.22, metalness:0.18 });
        const frameMat = material('#e0d9c9',0.72,0.04);
        const cols = Math.max(2, Math.min(5, Math.floor(b.w / 24)));
        const rows = Math.max(2, Math.min(4, Math.floor(height / 8)));
        for (let row=0; row<rows; row++) for (let col=0; col<cols; col++) {
          const wx = b.x + (col+1)*b.w/(cols+1);
          const wy = 3.2 + row*(height-5)/(rows);
          addBox(root,wx,wy,b.y+0.82,Math.min(5,b.w/(cols+1)*0.52),3.2,0.28,windowMat,false);
          addBox(root,wx,wy-1.85,b.y+0.72,Math.min(5.8,b.w/(cols+1)*0.62),0.22,0.5,frameMat,false);
          if (row>0 && (col%2===0)) addBox(root,wx,wy-2.1,b.y-1.1,Math.min(6,b.w/(cols+1)*0.7),0.22,2.4,trimMat,false);
        }
      }
    }
  }

  function buildCity() {
    buildGround(); buildParksAndWater();
    World.buildings.forEach(addBuilding);
    // V0.17.0: high-density urban props are generated in instanced batches.
    if (window.CiudadEngine && CiudadEngine.runtime && CiudadEngine.runtime.cityDetails) {
      CiudadEngine.runtime.cityDetails.build(THREE, scene, World, surfaceTextures);
      if (CiudadEngine.runtime.cityExpansion) CiudadEngine.runtime.cityExpansion.build(THREE, scene, World);
    }
    (World.props || []).forEach((p) => {
      if (p.type === 'hydrant' || p.type === 'barrel') {
        const obj = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 2.2, 4.5, 7), material(p.type === 'hydrant' ? '#b84d3e' : (p.color || '#a65a38')));
        obj.position.set(p.x, 2.25, p.y); root.add(obj);
      } else if (p.type === 'billboard') {
        const board = addBox(root, p.x + 8, 10, p.y + 8, 20, 12, 1.4, material(p.color || '#d6b94e'));
      }
    });
  }

  function makeCar(color = '#d5d7d2', police = false, typeId = 'sedan') {
    // Vehicle proportions are authored around the existing city-world scale.
    // Smooth ellipsoids replace the old stacked-box silhouette; all detail stays
    // in one group so the existing actor transform/AI pipeline remains unchanged.
    const group = new THREE.Group();
    const kind = String(typeId || 'sedan').toLowerCase();
    const isSUV = /suv|truck|pickup|van|ambulance|police/.test(kind);
    const isSport = /coupe|muscle|compact/.test(kind);
    const isTaxi = /taxi/.test(kind);
    const isVan = /van|ambulance/.test(kind);
    const isPickup = /pickup|truck/.test(kind);
    const paintColor = police ? '#e7ecee' : color;
    const paint = new THREE.MeshStandardMaterial({ color: paintColor, map: vehiclePaintTexture, roughness: 0.24, metalness: 0.62, envMapIntensity: 1.0 });
    const paintMaterial2 = new THREE.MeshStandardMaterial({ color: police ? '#182d43' : paintColor, map: vehiclePaintTexture, roughness: 0.3, metalness: 0.52 });
    vehiclePaintMaterials.push(paint, paintMaterial2);
    const paintDark = paintMaterial2;
    const trim = new THREE.MeshStandardMaterial({ color: '#171c20', roughness: 0.68, metalness: 0.22, map: vehicleMetalTexture || null });
    const glass = new THREE.MeshPhysicalMaterial({ color: '#172d3b', roughness: 0.12, metalness: 0.28, clearcoat: 0.9, clearcoatRoughness: 0.08, transparent: false, side: THREE.DoubleSide, map: vehicleGlass4KTexture || vehicleGlassTexture || null });
    vehicleGlassMaterials.push(glass);
    const tire = new THREE.MeshStandardMaterial({ color: '#111315', roughness: 0.96, map: vehicleTreadTexture || null });
    vehicleTireMaterials.push(tire);
    const alloy = new THREE.MeshStandardMaterial({ color: '#b7c0c5', roughness: 0.26, metalness: 0.9 });
    const rubber = new THREE.MeshStandardMaterial({ color: '#252a2d', roughness: 0.85 });
    const headlight = new THREE.MeshStandardMaterial({ color: '#fff5d8', emissive: '#ffe5a3', emissiveIntensity: 1.25, roughness: 0.16 });
    const tailLight = new THREE.MeshStandardMaterial({ color: '#a71920', emissive: '#f20c19', emissiveIntensity: 0.9, roughness: 0.22 });
    const indicator = new THREE.MeshStandardMaterial({ color: '#ff9b32', emissive: '#ff6a12', emissiveIntensity: 0.65 });
    const add = (geo, mat, x, y, z, cast = true) => {
      const mesh = new THREE.Mesh(geo, mat); mesh.position.set(x, y, z);
      mesh.castShadow = cast; mesh.receiveShadow = true; group.add(mesh); return mesh;
    };
    const ellipsoid = (mat, x, y, z, sx, sy, sz, seg = 24) => {
      const mesh = add(new THREE.SphereGeometry(1, seg, Math.max(12, Math.floor(seg * 0.65))), mat, x, y, z);
      mesh.scale.set(sx, sy, sz); return mesh;
    };
    const box = (mat, x, y, z, sx, sy, sz, cast = true) => add(new THREE.BoxGeometry(sx, sy, sz), mat, x, y, z, cast);
    const panel = (mat, points) => {
      const geometry = new THREE.BufferGeometry();
      const vertices = new Float32Array(points.flat());
      geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
      geometry.setIndex([0, 1, 2, 0, 2, 3]); geometry.computeVertexNormals();
      return add(geometry, mat, 0, 0, 0, false);
    };

    const bodyLength = isVan ? 9.5 : 8.9;
    // Main lower shell, sculpted hood and rear deck.
    ellipsoid(paint, 0, 1.35, 0.15, 4.45, 0.92, bodyLength, 32);
    ellipsoid(paint, 0, 1.72, -5.15, 4.18, 0.55, 3.35, 28);
    ellipsoid(paint, 0, 1.68, 5.25, 4.12, 0.52, 3.05, 28);
    box(trim, 0, 0.76, 0, 7.7, 0.28, 14.9, false);
    // Front and rear bumpers with lower diffuser and grille.
    box(trim, 0, 0.92, -8.65, 8.35, 0.55, 0.48);
    box(trim, 0, 0.92, 8.55, 8.25, 0.52, 0.48);
    box(rubber, 0, 1.24, -8.91, 3.05, 0.68, 0.12, false);
    box(trim, 0, 1.28, -8.99, 2.35, 0.42, 0.08, false);
    // Cabin is higher and longer on utility vehicles; pickup keeps an open bed.
    const cabinZ = isPickup ? -1.55 : (isVan ? 0.15 : -0.65);
    const cabinLength = isVan ? 5.7 : (isSUV ? 5.0 : (isSport ? 3.95 : 4.35));
    const cabinHeight = isVan ? 1.45 : (isSUV ? 1.38 : (isSport ? 1.02 : 1.18));
    ellipsoid(paintDark, 0, 2.48 + (isSUV ? 0.2 : 0), cabinZ, isVan ? 3.62 : 3.42, cabinHeight, cabinLength, 28);
    // Roof crown and glass inset create a readable roofline rather than a solid box.
    ellipsoid(paint, 0, 3.43 + (isSUV ? 0.18 : 0), cabinZ + 0.05, isVan ? 3.45 : 3.18, 0.34, cabinLength * 0.72, 24);
    const yBase = isSUV ? 2.62 : 2.48;
    const yTop = isSUV ? 3.43 : 3.25;
    const frontZ = cabinZ - cabinLength * 0.72;
    const rearZ = cabinZ + cabinLength * 0.72;
    // Windscreens and rear glass are sloped quadrilateral panes.
    panel(glass, [[-2.72,yBase,frontZ+0.55],[2.72,yBase,frontZ+0.55],[2.48,yTop,frontZ+1.35],[-2.48,yTop,frontZ+1.35]]);
    panel(glass, [[-2.55,yBase,rearZ-0.45],[2.55,yBase,rearZ-0.45],[2.35,yTop,rearZ-1.18],[-2.35,yTop,rearZ-1.18]]);
    // Side glazing split into front/rear windows with visible B-pillars.
    [-1,1].forEach(side => {
      const x = side * (isVan ? 3.25 : 3.05);
      panel(glass, [[x,yBase,cabinZ-1.55],[x,yBase,cabinZ+0.05],[x*0.98,yTop,cabinZ-0.55],[x*0.98,yTop,cabinZ-1.25]]);
      if (!isVan) panel(glass, [[x,yBase,cabinZ+0.28],[x,yBase,cabinZ+1.55],[x*0.98,yTop,cabinZ+1.18],[x*0.98,yTop,cabinZ-0.35]]);
      box(trim, side*3.35, 2.62, cabinZ+0.15, 0.16, 1.35, 0.18, false);
      // Mirrors and door handles.
      ellipsoid(paint, side*3.75, 2.72, cabinZ-1.55, 0.42, 0.22, 0.34, 12);
      box(alloy, side*3.79, 2.73, cabinZ-1.55, 0.08, 0.13, 0.23, false);
      [-2.0, 1.9].forEach(z => box(trim, side*4.02, 1.85, z, 0.12, 0.11, 0.62, false));
      // Subtle door shut-lines and side sill.
      box(paintDark, side*4.25, 1.45, 0.0, 0.08, 0.95, 0.055, false);
      box(trim, side*4.08, 0.83, 0, 0.18, 0.22, 10.2, false);
    });
    // Pickup bed, SUV roof rails, or sedan sunroof detail.
    if (isPickup) {
      box(paintDark, 0, 1.9, 5.45, 6.9, 0.48, 4.4);
      box(trim, 0, 2.16, 5.5, 6.45, 0.08, 3.8, false);
      [-1,1].forEach(side => box(paint, side*3.45, 2.22, 5.45, 0.28, 0.58, 4.35));
    } else if (isSUV || isVan) {
      [-1,1].forEach(side => box(alloy, side*2.65, 3.78, cabinZ, 0.12, 0.1, cabinLength*1.25, false));
    } else {
      box(trim, 0, 3.77, cabinZ, 2.0, 0.045, 2.2, false);
    }
    // Visible cabin interior: dashboard, seats, headrests, steering wheel and console.
    // Kept inside the existing vehicle group so physics/AI transforms are unchanged.
    const interiorMat = new THREE.MeshStandardMaterial({ color: '#171c20', roughness: 0.88 });
    const seatMat = new THREE.MeshStandardMaterial({ color: isSport ? '#292d31' : '#343a3d', roughness: 0.92 });
    const dashMat = new THREE.MeshStandardMaterial({ color: '#20282b', roughness: 0.72 });
    const chromeMat = new THREE.MeshStandardMaterial({ color: '#89969b', roughness: 0.28, metalness: 0.82 });
    box(dashMat, 0, 2.38, cabinZ - cabinLength * 0.55, 5.85, 0.58, 0.72, false);
    box(interiorMat, 0, 1.94, cabinZ + 0.18, 5.9, 0.22, cabinLength * 0.72, false);
    [-1, 1].forEach(side => {
      const seatZ = cabinZ - 0.95;
      box(seatMat, side * 1.42, 2.05, seatZ, 1.48, 0.38, 1.55, false);
      const back = box(seatMat, side * 1.42, 2.82, seatZ + 0.56, 1.42, 1.55, 0.42, false);
      back.rotation.x = -0.10;
      box(interiorMat, side * 1.42, 3.72, seatZ + 0.62, 0.92, 0.62, 0.34, false);
      // Rear passenger seat silhouettes remain visible through the rear glass.
      box(seatMat, side * 1.38, 2.08, cabinZ + 1.42, 1.5, 0.34, 1.05, false);
      box(seatMat, side * 1.38, 2.68, cabinZ + 1.72, 1.42, 1.12, 0.32, false);
    });
    // Steering wheel on the left side, angled toward the driver.
    const steering = add(new THREE.TorusGeometry(0.48, 0.085, 10, 28), chromeMat, -1.62, 2.78, cabinZ - 1.72, false);
    steering.rotation.y = 0.10;
    const steeringHub = add(new THREE.CylinderGeometry(0.13, 0.13, 0.18, 16), interiorMat, -1.62, 2.78, cabinZ - 1.72, false);
    steeringHub.rotation.x = Math.PI / 2;
    box(interiorMat, -1.62, 2.55, cabinZ - 1.48, 0.22, 0.42, 0.58, false);
    box(interiorMat, 0.0, 2.43, cabinZ - 0.95, 1.05, 0.18, 1.35, false);
    box(chromeMat, 0.0, 2.58, cabinZ - 0.62, 0.16, 0.35, 0.16, false);
    // Instrument cluster and center display.
    box(interiorMat, -1.58, 2.62, cabinZ - 2.02, 1.05, 0.38, 0.12, false);
    box(new THREE.MeshStandardMaterial({ color: '#80aeb8', emissive: '#24515b', emissiveIntensity: 0.35 }), 0.0, 2.72, cabinZ - 1.91, 0.72, 0.42, 0.08, false);
    // Door cards and inner handles add depth through the side windows.
    [-1, 1].forEach(side => {
      box(interiorMat, side * 2.78, 2.22, cabinZ + 0.15, 0.18, 0.82, 2.65, false);
      box(chromeMat, side * 2.91, 2.46, cabinZ - 0.25, 0.08, 0.08, 0.42, false);
    });
    // Four correctly proportioned wheels with sidewalls, alloy rims, spokes and hubs.
    const wheelGroups = [];
    const wheelZ = isVan ? 5.75 : 5.35;
    [-1,1].forEach(side => [-1,1].forEach(axle => {
      const wheel = new THREE.Group(); wheel.position.set(side*4.02, 1.28, axle*wheelZ); group.add(wheel); wheelGroups.push(wheel);
      const tread = add(new THREE.CylinderGeometry(1.28,1.28,0.72,28,1,false), tire, 0,0,0);
      tread.rotation.z = Math.PI/2; tread.castShadow = true;
      const sidewall = add(new THREE.TorusGeometry(1.02,0.18,8,28), rubber, side*0.39,0,0); sidewall.rotation.y = Math.PI/2;
      const rim = add(new THREE.CylinderGeometry(0.88,0.88,0.76,24), alloy, 0,0,0); rim.rotation.z = Math.PI/2;
      const hub = add(new THREE.CylinderGeometry(0.24,0.24,0.82,16), trim, 0,0,0); hub.rotation.z = Math.PI/2;
      for (let i=0;i<10;i++) {
        const a = i*Math.PI/5;
        const spoke = box(alloy, side*0.43, Math.sin(a)*0.55, Math.cos(a)*0.55, 0.11, 0.68, 0.13, false);
        spoke.rotation.x = -a;
      }
      // Fender arch is suggested by a dark upper wheel-well lip.
      const arch = add(new THREE.TorusGeometry(1.42,0.09,7,28,Math.PI), trim, side*4.02,1.28,axle*wheelZ);
      arch.rotation.x = Math.PI/2; arch.rotation.z = axle < 0 ? Math.PI : 0;
    }));
    // Modern headlamp clusters, amber indicators and rear light bars.
    [-1,1].forEach(side => {
      const lamp = box(headlight, side*2.92, 1.93, -8.68, 1.45, 0.48, 0.16, false);
      lamp.rotation.y = side*0.08;
      box(indicator, side*3.72, 1.92, -8.62, 0.28, 0.34, 0.15, false);
      box(tailLight, side*3.08, 1.92, 8.42, 1.0, 0.55, 0.18, false);
      box(trim, side*3.7, 1.22, -8.93, 0.58, 0.16, 0.12, false);
    });
    box(trim, 0, 1.48, 8.73, 2.8, 0.12, 0.12, false);
    // Police livery and roof lightbar are an optional visual variant.
    if (isTaxi && !police) {
      box(trim, 0, 3.82, cabinZ, 1.8, 0.14, 0.72, false);
      box(new THREE.MeshStandardMaterial({color:'#f6d44a', emissive:'#7d5b08', emissiveIntensity:0.25}), 0, 3.94, cabinZ, 1.55, 0.12, 0.58, false);
    }
    if (police) {
      [-1,1].forEach(side => box(paintDark, side*4.28, 1.62, 0.1, 0.09, 0.48, 5.4, false));
      box(trim, 0, 3.85, cabinZ, 2.5, 0.2, 0.58, false);
      const red = new THREE.MeshStandardMaterial({color:'#ff2935',emissive:'#e50018',emissiveIntensity:1.7});
      const blue = new THREE.MeshStandardMaterial({color:'#397dff',emissive:'#145dff',emissiveIntensity:1.7});
      box(red,-0.72,3.94,cabinZ,0.92,0.22,0.42,false);
      box(blue,0.72,3.94,cabinZ,0.92,0.22,0.42,false);
    }
    // V0.8.10: scale the model to the physics footprint and give it a proper height
    // (the raw mesh was ~17.8 long x 8.6 wide x 3.9 tall, i.e. flat next to 40x20 physics).
    {
      const cfg = (window.CiudadCero && CiudadCero.Config && CiudadCero.Config.VEHICLE_TYPES) || {};
      const vt = cfg[typeId] || cfg[kind] || { length: 42, width: 20 };
      const BIG = 1.3; // extra visual size so cars read as real cars next to pedestrians
      const sx = (vt.width || 20) / 8.6 * BIG, sz = (vt.length || 42) / 17.8 * BIG;
      const sy = sz * 1.75;
      group.children.slice().forEach((c) => {
        if (wheelGroups.includes(c)) {
          c.position.set(c.position.x * sx, c.position.y * sz, c.position.z * sz);
          c.scale.set(sz, sz, sz);
        } else {
          c.position.set(c.position.x * sx, c.position.y * sy, c.position.z * sz);
          c.scale.set(c.scale.x * sx, c.scale.y * sy, c.scale.z * sz);
        }
      });
    }
    group.userData.wheelGroups = wheelGroups;
    group.userData.vehicleKind = kind;
    group.userData.vehicleMaterials = [paint,paintDark,trim,glass,tire,alloy,rubber,headlight,tailLight,indicator];
    return group;
  }

  // Detailed stylized human model built from softly rounded anatomical parts.
  // All proportions are authored in one local group so player/NPC animation stays cheap.
  function getStoryProfile(id) {
    const profiles = CiudadCero.Characters && CiudadCero.Characters.STORY_PROFILES;
    return profiles && id && profiles[id] ? profiles[id] : null;
  }

  function makePerson(color = '#d6d9d2', options = {}) {
    const g = new THREE.Group();
    const profile = options.profile || {};
    const variant = Math.abs(Number.isFinite(options.variant) ? options.variant : 0);
    const skinTone = profile.skin || options.skin || ['#c88f6d', '#e0b493', '#9b694f', '#f0c9a5', '#d5a17c'][variant % 5];
    const shirtColor = profile.torsoPrimary || options.shirt || color;
    const pantsColor = profile.pants || options.pants || ['#303b45', '#39423b', '#34313d', '#4b4540', '#283746'][variant % 5];
    const shoeColor = profile.shoe || options.shoes || '#202426';
    const hairColor = profile.hairColor || options.hair || ['#292421', '#49352a', '#17191b', '#76543b', '#342331'][variant % 5];
    const shirt = material(shirtColor, 0.78);
    const shirtSecondary = material(profile.torsoSecondary || options.shirtDark || '#202b32', 0.84);
    const pantsMaterial = material(pantsColor, 0.9);
    if (fabricTexture) { shirt.map = fabricTexture; shirtSecondary.map = fabricTexture; pantsMaterial.map = fabricTexture; }
    characterFabricMaterials.push(shirt, shirtSecondary, pantsMaterial);
    const shirtDark = shirtSecondary;
    const pants = pantsMaterial;
    const skin = material(skinTone, 0.92);
    if (skinDetailTexture) skin.map = skinDetailTexture;
    characterSkinMaterials.push(skin);
    const hair = material(hairColor, 0.94);
    if (hairTexture) hair.map = hairTexture;
    characterHairMaterials.push(hair);
    const hairLight = material(profile.hairHighlight || hairColor, 0.9);
    const shoes = material(shoeColor, 0.86);
    const trim = material(profile.accent || options.accent || '#d6d9d2', 0.58, 0.08);
    const fabricDetail = material(profile.trim || '#d5d9d2', 0.72);
    const beltMat = material(options.police ? '#101820' : '#29251f', 0.9);
    const addMesh = (parent, geometry, mat, x, y, z, cast = true) => {
      const m = new THREE.Mesh(geometry, mat);
      m.position.set(x, y, z); m.castShadow = cast; m.receiveShadow = true;
      parent.add(m); return m;
    };
    const capsule = (parent, radius, length, mat, x, y, z, rz = 0) => {
      const m = addMesh(parent, new THREE.CapsuleGeometry(radius, length, 4, 10), mat, x, y, z);
      m.rotation.z = rz; return m;
    };
    const sphere = (parent, rx, ry, rz, mat, x, y, z) => {
      const m = addMesh(parent, new THREE.SphereGeometry(1, 12, 10), mat, x, y, z);
      m.scale.set(rx, ry, rz); return m;
    };

    // Natural silhouette: pelvis, waist, ribcage and shoulders are separate layers.
    capsule(g, 1.9, 1.7, pants, 0, 3.0, 0);
    capsule(g, 2.15, 3.1, shirtDark, 0, 6.45, 0);
    const torso = capsule(g, 2.42, 3.35, shirt, 0, 7.35, 0);
    torso.scale.set(1.08, 1.0, 0.92);
    sphere(g, 2.6, 1.05, 1.28, shirt, 0, 8.75, 0);
    capsule(g, 0.62, 0.8, skin, 0, 9.75, 0);
    // Neckline, collar and layered front placket.
    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.78, 0.2, 6, 14), fabricDetail);
    collar.position.set(0, 9.55, 0.12); collar.rotation.x = Math.PI / 2; g.add(collar);
    addMesh(g, new THREE.BoxGeometry(0.16, 2.45, 0.08), shirtDark, 0, 7.2, 2.05, false);
    if (profile.outfitStyle === 'suit') {
      const lapelL = addMesh(g, new THREE.ConeGeometry(0.85, 2.2, 4), fabricDetail, -0.92, 8.2, 1.82, false);
      lapelL.rotation.z = -0.35; lapelL.rotation.x = -0.22;
      const lapelR = addMesh(g, new THREE.ConeGeometry(0.85, 2.2, 4), fabricDetail, 0.92, 8.2, 1.82, false);
      lapelR.rotation.z = 0.35; lapelR.rotation.x = -0.22;
      addMesh(g, new THREE.BoxGeometry(0.34, 1.8, 0.12), trim, 0, 7.1, 2.08, false);
    } else if (profile.outfitStyle === 'overalls') {
      for (const x of [-1.12, 1.12]) {
        const strap = addMesh(g, new THREE.BoxGeometry(0.55, 3.15, 0.22), trim, x, 7.65, 1.93, false);
        strap.rotation.z = x < 0 ? -0.08 : 0.08;
        addMesh(g, new THREE.BoxGeometry(0.22, 0.22, 0.08), fabricDetail, x, 8.65, 2.08, false);
      }
      addMesh(g, new THREE.BoxGeometry(1.55, 1.0, 0.16), trim, 0, 6.5, 2.05, false);
    } else if (profile.outfitStyle === 'pilot_jacket' || profile.outfitStyle === 'racer_jacket') {
      for (const x of [-1.7, 1.7]) addMesh(g, new THREE.BoxGeometry(0.24, 3.0, 0.12), trim, x, 7.45, 1.98, false);
      addMesh(g, new THREE.BoxGeometry(3.5, 0.18, 0.12), trim, 0, 6.2, 2.0, false);
    } else if (profile.outfitStyle === 'hi_vis_vest') {
      for (const x of [-1.05, 1.05]) addMesh(g, new THREE.BoxGeometry(0.38, 3.6, 0.16), fabricDetail, x, 7.4, 2.02, false);
      addMesh(g, new THREE.BoxGeometry(3.3, 0.22, 0.16), fabricDetail, 0, 6.25, 2.04, false);
    } else if (options.police || profile.outfitStyle === 'police_uniform' || profile.outfitStyle === 'commander') {
      addMesh(g, new THREE.BoxGeometry(4.0, 0.42, 0.18), beltMat, 0, 5.0, 1.88, false);
      addMesh(g, new THREE.BoxGeometry(0.62, 0.72, 0.2), trim, -1.15, 7.7, 2.02, false);
      addMesh(g, new THREE.BoxGeometry(0.62, 0.72, 0.2), trim, 1.15, 7.7, 2.02, false);
      addMesh(g, new THREE.BoxGeometry(0.48, 0.58, 0.18), fabricDetail, -0.92, 7.65, 2.12, false);
    } else {
      // Casual jacket/hoodie seams, pocket and cuff details.
      addMesh(g, new THREE.BoxGeometry(1.2, 0.78, 0.13), shirtDark, 1.05, 6.65, 2.02, false);
      addMesh(g, new THREE.BoxGeometry(0.12, 2.8, 0.1), trim, 0, 7.1, 2.05, false);
    }
    // Belt buckle and side pockets.
    addMesh(g, new THREE.BoxGeometry(0.72, 0.38, 0.16), trim, 0, 4.95, 1.85, false);
    for (const x of [-1.0, 1.0]) addMesh(g, new THREE.BoxGeometry(0.85, 0.95, 0.12), shirtDark, x, 3.1, 1.52, false);

    // Head with jaw, ears and readable facial features.
    sphere(g, 1.48, 1.82, 1.34, skin, 0, 11.55, 0);
    sphere(g, 1.2, 0.75, 1.12, skin, 0, 10.65, 0.28);
    for (const side of [-1, 1]) {
      sphere(g, 0.34, 0.48, 0.28, skin, side * 1.43, 11.45, 0);
      sphere(g, 0.17, 0.19, 0.12, material('#f1d5c4'), side * 0.57, 11.72, 1.22);
      const brow = addMesh(g, new THREE.BoxGeometry(0.48, 0.12, 0.12), hair, side * 0.57, 12.02, 1.23, false);
      brow.rotation.z = side * -0.08;
    }
    sphere(g, 0.17, 0.22, 0.16, skin, 0, 11.25, 1.36);
    addMesh(g, new THREE.BoxGeometry(0.42, 0.09, 0.08), material('#754b42'), 0, 10.95, 1.31, false);

    // Hair cap, fringe and distinct silhouette by named style.
    sphere(g, 1.53, 0.78, 1.42, hair, 0, 12.52, -0.12);
    const hairStyle = profile.hairStyle || options.hairStyle || ['short_crop','long_hair','slick_part','bun','ponytail'][variant % 5];
    if (hairStyle === 'bun') {
      sphere(g, 0.72, 0.72, 0.72, hair, -1.38, 11.8, -0.58);
      sphere(g, 0.22, 0.22, 0.22, hairLight, -1.38, 11.8, 0.06);
      sphere(g, 0.42, 0.92, 0.62, hair, -1.42, 10.9, -0.22);
    } else if (hairStyle === 'ponytail') {
      sphere(g, 0.42, 1.25, 0.46, hair, -1.38, 11.0, -0.48);
      sphere(g, 0.22, 0.28, 0.2, trim, -1.35, 11.72, -0.08);
    } else if (hairStyle === 'long_hair' || hairStyle === 'asym_bob') {
      sphere(g, 1.48, 1.55, 0.52, hair, 0, 10.95, -0.88);
      sphere(g, 0.38, 1.3, 0.52, hair, -1.18, 11.2, 0.32);
      if (hairStyle === 'asym_bob') sphere(g, 0.42, 1.15, 0.55, hair, 1.18, 11.0, 0.38);
    } else {
      // swept fringe and sideburns
      const fringe = addMesh(g, new THREE.SphereGeometry(1, 12, 8), hairLight, 0.38, 12.45, 1.0, false);
      fringe.scale.set(0.92, 0.38, 0.42); fringe.rotation.z = -0.18;
      for (const side of [-1, 1]) sphere(g, 0.25, 0.72, 0.38, hair, side * 1.24, 11.5, 0.42);
    }
    // Headwear is attached after hair, with a fitted shape instead of covering the face.
    const hatType = profile.hatType || 'none';
    if (hatType === 'police_cap' || hatType === 'dock_cap' || hatType === 'cap') {
      const hatMat = material(hatType === 'dock_cap' ? '#243647' : (hatType === 'cap' ? (options.hatColor || '#3898ff') : '#14202e'), 0.78);
      sphere(g, 1.48, 0.42, 1.35, hatMat, 0, 12.85, -0.05);
      const brim = addMesh(g, new THREE.CylinderGeometry(1.02, 1.12, 0.16, 16), hatMat, 0, 12.65, 0.42, false);
      brim.scale.set(1, 1, 0.62);
      if (hatType === 'police_cap') addMesh(g, new THREE.BoxGeometry(0.42, 0.42, 0.12), trim, 0, 12.9, 1.22, false);
    } else if (hatType === 'hardhat') {
      const hatMat = material(profile.hatColor || '#facc15');
      sphere(g, 1.55, 0.52, 1.42, hatMat, 0, 12.9, 0);
      addMesh(g, new THREE.BoxGeometry(2.7, 0.12, 0.52), hatMat, 0, 12.55, 0.72, false);
    } else if (hatType === 'visor') {
      const visor = addMesh(g, new THREE.BoxGeometry(2.35, 0.16, 0.18), trim, 0, 11.95, 1.36, false);
      visor.material = new THREE.MeshStandardMaterial({ color: profile.accent || '#4de0b5', roughness: 0.2, metalness: 0.1, transparent: true, opacity: 0.82, emissive: profile.accent || '#4de0b5', emissiveIntensity: 0.24 });
    }

    // Articulated limbs: upper/lower arms and thighs/shins pivot independently.
    const arms = [], forearms = [], legs = [], shins = [];
    for (const side of [-1, 1]) {
      const arm = new THREE.Group(); arm.position.set(side * 2.45, 8.45, 0); g.add(arm);
      capsule(arm, 0.82, 2.15, shirt, 0, -1.35, 0, side * -0.035);
      sphere(arm, 0.88, 0.88, 0.86, shirt, 0, -0.15, 0);
      const elbow = new THREE.Group(); elbow.position.set(0, -2.55, 0); arm.add(elbow);
      capsule(elbow, 0.62, 1.65, profile.glove ? material(profile.glove) : skin, 0, -1.05, 0);
      const cuff = addMesh(elbow, new THREE.CylinderGeometry(0.64, 0.64, 0.24, 10), trim, 0, -1.9, 0, false);
      cuff.rotation.x = Math.PI / 2;
      sphere(elbow, 0.48, 0.5, 0.48, skin, 0, -2.02, 0.08);
      arms.push(arm); forearms.push(elbow);

      const leg = new THREE.Group(); leg.position.set(side * 0.98, 3.35, 0); g.add(leg);
      capsule(leg, 0.96, 2.35, pants, 0, -1.25, 0);
      sphere(leg, 0.96, 0.88, 0.88, pants, 0, -0.18, 0);
      const shin = new THREE.Group(); shin.position.set(0, -2.35, 0); leg.add(shin);
      capsule(shin, 0.72, 2.0, pants, 0, -1.05, 0);
      const shoe = addMesh(shin, new THREE.BoxGeometry(1.42, 0.78, 2.28), shoes, 0, -2.12, 0.48);
      shoe.rotation.x = -0.04;
      addMesh(leg, new THREE.BoxGeometry(1.48, 0.14, 0.18), trim, 0, -1.65, 0.78, false);
      legs.push(leg); shins.push(shin);
    }

    // Mission/role-specific identity details.
    if (options.police || profile.outfitStyle === 'police_uniform' || profile.outfitStyle === 'commander') {
      addMesh(g, new THREE.BoxGeometry(0.62, 0.76, 0.18), trim, -1.12, 7.65, 2.08, false);
      addMesh(g, new THREE.BoxGeometry(0.42, 0.48, 0.14), beltMat, 1.45, 5.05, 1.92, false);
      addMesh(g, new THREE.BoxGeometry(0.28, 1.0, 0.18), beltMat, -1.55, 5.45, 1.9, false);
    }
    g.userData = {
      arms, forearms, legs, shins,
      walkPhase: (variant * 1.71) % (Math.PI * 2),
      lastX: 0, lastZ: 0, breathPhase: variant * 0.7,
      profileId: profile.id || null
    };
    return g;
  }

  function animatePerson(mesh, item, time, player = false) {
    if (!mesh || mesh.userData.carMode || !mesh.userData.legs) return;
    const dx = Number.isFinite(item && item.x) ? item.x - mesh.userData.lastX : 0;
    const dz = Number.isFinite(item && item.y) ? item.y - mesh.userData.lastZ : 0;
    const rawSpeed = Math.hypot(dx, dz);
    const speed = Math.min(1, rawSpeed / 2.2);
    mesh.userData.lastX = item && item.x || mesh.userData.lastX;
    mesh.userData.lastZ = item && item.y || mesh.userData.lastZ;
    const phase = time * (speed > 0.025 ? 8.5 + speed * 5.2 : 1.25) + mesh.userData.walkPhase;
    const swing = speed > 0.025 ? Math.sin(phase) * 0.58 * speed : Math.sin(time * 1.25 + mesh.userData.breathPhase) * 0.018;
    const bounce = speed > 0.025 ? Math.abs(Math.cos(phase * 2)) * 0.24 * speed : Math.sin(time * 2.0 + mesh.userData.breathPhase) * 0.035;
    mesh.userData.legs[0].rotation.x = swing;
    mesh.userData.legs[1].rotation.x = -swing;
    mesh.userData.shins[0].rotation.x = Math.max(0, -Math.cos(phase)) * 0.48 * speed;
    mesh.userData.shins[1].rotation.x = Math.max(0, Math.cos(phase)) * 0.48 * speed;
    mesh.userData.arms[0].rotation.x = -swing * 0.82;
    mesh.userData.arms[1].rotation.x = swing * 0.82;
    mesh.userData.forearms[0].rotation.x = -0.12 - Math.max(0, swing) * 0.22;
    mesh.userData.forearms[1].rotation.x = -0.12 - Math.max(0, -swing) * 0.22;
    mesh.rotation.z = speed > 0.025 ? Math.sin(phase) * 0.025 * speed : Math.sin(time * 0.8 + mesh.userData.breathPhase) * 0.008;
    mesh.position.y = bounce;
  }

  function createRainSystem() {
    const count = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ? 420 : 1100;
    rainPositions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      rainPositions[i*3] = (Math.random() - 0.5) * 260;
      rainPositions[i*3+1] = Math.random() * 105;
      rainPositions[i*3+2] = (Math.random() - 0.5) * 260;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));
    rainPoints = new THREE.Points(geometry, new THREE.PointsMaterial({ color: '#c8e2ed', size: 1.05, transparent: true, opacity: 0.0, depthWrite: false }));
    rainPoints.visible = false; scene.add(rainPoints);
  }

  function updateEnvironment(dt, player) {
    environmentClock += Math.min(0.05, Math.max(0, dt));
    const cycle = (environmentClock / 420) % 1;
    const sunAngle = cycle * Math.PI * 2 - Math.PI * 0.5;
    const daylight = clamp((Math.sin(sunAngle) + 0.12) / 0.72, 0, 1);
    const night = 1 - daylight;
    const sunrise = Math.max(0, 1 - Math.abs(daylight - 0.5) * 2);
    const sky = new THREE.Color().setRGB(0.035 + daylight * 0.62, 0.055 + daylight * 0.72, 0.10 + daylight * 0.78);
    const fog = new THREE.Color().copy(sky).lerp(new THREE.Color('#b6a18b'), sunrise * 0.20);
    scene.background.copy(sky); scene.fog.color.copy(fog);
    sunLight.intensity = 0.12 + daylight * 3.15;
    sunLight.position.set(Math.cos(sunAngle) * 900, Math.max(35, Math.sin(sunAngle) * 1050), -350);
    sunLight.color.set(night > 0.65 ? '#8aa9d8' : '#fff0d7');
    hemiLight.intensity = 0.32 + daylight * 1.55;
    fillLight.intensity = 0.18 + daylight * 0.62;
    facadeMaterial.emissiveIntensity = 0.12 + night * 1.35;
    const rainCycle = environmentClock % 210;
    const raining = rainCycle > 142 && rainCycle < 184;
    environmentState.phase = daylight > 0.72 ? 'day' : (daylight < 0.18 ? 'night' : 'dawn-dusk');
    environmentState.weather = raining ? 'rain' : 'clear';
    const targetWet = raining ? 1 : 0;
    environmentState.wetness += (targetWet - environmentState.wetness) * Math.min(1, dt * 0.12);
    if (asphaltMaterial) asphaltMaterial.roughness = 0.96 - environmentState.wetness * 0.38;
    if (rainPoints) {
      rainPoints.visible = raining;
      rainPoints.material.opacity = raining ? 0.62 : 0;
      if (player && rainPoints.visible) {
        rainPoints.position.set(player.x, 0, player.y);
        for (let i=0; i<rainPositions.length/3; i++) {
          rainPositions[i*3+1] -= dt * 115;
          rainPositions[i*3] -= dt * 8;
          if (rainPositions[i*3+1] < 0) {
            rainPositions[i*3] = (Math.random()-0.5)*260;
            rainPositions[i*3+1] = 80 + Math.random()*30;
            rainPositions[i*3+2] = (Math.random()-0.5)*260;
          }
        }
        rainPoints.geometry.attributes.position.needsUpdate = true;
      }
    }
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
      // Camera control is exclusive to a drag that begins on the visible world.
      // Also guard the joystick's screen rectangle: on some mobile browsers a
      // transformed overlay can report the canvas as the event target.
      if (event.target !== canvas) return;
      if (event.button !== undefined && event.button !== 0) return;
      const touchLayer = document.getElementById('touch-layer');
      const joyZone = document.getElementById('joy-zone');
      const carJoyZone = document.getElementById('car-joy-zone');
      const inside = (el) => {
        if (!el || el.classList.contains('hidden') || !el.getClientRects().length) return false;
        const r = el.getBoundingClientRect();
        return event.clientX >= r.left && event.clientX <= r.right &&
          event.clientY >= r.top && event.clientY <= r.bottom;
      };
      if (touchLayer && touchLayer.classList.contains('visible') &&
          (inside(joyZone) || inside(carJoyZone))) return;
      event.preventDefault();
      dragPointerId = event.pointerId;
      lastPointerX = event.clientX; lastPointerY = event.clientY;
      try { canvas.setPointerCapture(event.pointerId); } catch (_) {}
    });
    canvas.addEventListener('pointermove', (event) => {
      if (dragPointerId !== event.pointerId) return;
      const dx = event.clientX - lastPointerX;
      const dy = event.clientY - lastPointerY;
      lastPointerX = event.clientX; lastPointerY = event.clientY;
      cameraYawOffset = ((cameraYawOffset - dx * 0.0030 + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
      cameraPitchOffset = clamp(cameraPitchOffset + dy * 0.0032, -0.42, 0.62);
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
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || window.innerWidth < 900;
    qualityProfile = isMobile ? 'mobile-high' : 'ultra';
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.65 : 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.info.autoReset = true;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.18;
    if ('physicallyCorrectLights' in renderer) renderer.physicallyCorrectLights = true;
    scene = new THREE.Scene();
    scene.background = new THREE.Color('#a9c5cf');
    scene.fog = new THREE.Fog('#a9c5cf', 680, 2650);
    camera = new THREE.PerspectiveCamera(62, 1, 0.1, 5000);
    root = new THREE.Group(); scene.add(root);
    // Connect the existing Ciudad Cero 3D pipeline to the independent engine core.
    if (window.CiudadEngine && CiudadEngine.runtime) {
      const platform = CiudadEngine.PlatformAdapter ? CiudadEngine.PlatformAdapter.detect() : { deviceClass: 'unknown' };
      CiudadEngine.runtime.start(platform.deviceClass || 'unknown');
      CiudadEngine.runtime.attachRenderer({ renderer, scene, camera });
      CiudadEngine.runtime.events.emit('game:renderer-ready', { game: 'Ciudad Cero', renderer: 'Three.js' });
    }
    createSurfaceLibrary();
    facadeMaterial = new THREE.MeshStandardMaterial({ map: surfaceTextures.facade, normalMap: surfaceTextures.facade.normalMap, roughnessMap: surfaceTextures.facade.roughnessMap, emissiveMap: surfaceTextures.facade.emissiveMap, emissive: '#82999a', emissiveIntensity: 0.18, roughness: 0.58, metalness: 0.12, side: THREE.DoubleSide });
    hemiLight = new THREE.HemisphereLight('#e5f2ff', '#52604b', 1.85); scene.add(hemiLight);
    fillLight = new THREE.DirectionalLight('#d9e9f5', 0.72);
    fillLight.position.set(380, 260, 520); scene.add(fillLight);
    sunLight = new THREE.DirectionalLight('#fff0d7', 3.35);
    sunLight.position.set(-450, 900, -350); sunLight.castShadow = true;
    sunLight.shadow.mapSize.set(qualityProfile === 'ultra' ? 3072 : 1024, qualityProfile === 'ultra' ? 3072 : 1024);
    sunLight.shadow.bias = -0.00018;
    sunLight.shadow.normalBias = 0.035;
    sunLight.shadow.radius = isMobile ? 1 : 2;
    sunLight.shadow.camera.near = 20; sunLight.shadow.camera.far = 2400;
    sunLight.shadow.camera.updateProjectionMatrix();
    sunLight.shadow.camera.left = -500; sunLight.shadow.camera.right = 500;
    sunLight.shadow.camera.top = 500; sunLight.shadow.camera.bottom = -500;
    scene.add(sunLight);
    createRainSystem();
    buildCity();
    playerMesh = makePerson('#435f70', { variant: 1, profile: getStoryProfile('mateo'), pants: '#26333c' }); scene.add(playerMesh);
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
      if (isVehicle && m.userData.wheelGroups) {
        const spin = Number.isFinite(item.speed) ? item.speed * 0.035 : 0;
        m.userData.wheelGroups.forEach((wheel) => { wheel.rotation.x = spin; });
      }
    }
  }

  function render(state) {
    if (!active || !renderer) return false;
    const frameNow = performance.now();
    const frameDelta = lastEngineFrameTime ? (frameNow - lastEngineFrameTime) / 1000 : 0;
    lastEngineFrameTime = frameNow;
    if (window.CiudadEngine && CiudadEngine.runtime) CiudadEngine.runtime.update(frameDelta);
    const p = state && state.player;
    updateEnvironment(frameDelta, p);
    if (frameNow - lastResize > 500) resize();
    if (!p) return false;
    if (p.inCar && p.vehicle) {
      if (!playerMesh.userData.carMode) {
        scene.remove(playerMesh);
        playerMesh = makeCar(p.vehicle.color || '#d6d8d3', /police|patrol|interceptor|enforcer/.test(String(p.vehicle.typeId || '')), p.vehicle.typeId);
        scene.add(playerMesh); playerMesh.userData.carMode = true;
      }
    } else if (playerMesh.userData.carMode) {
      scene.remove(playerMesh); playerMesh = makePerson('#435f70', { variant: 1, profile: getStoryProfile('mateo'), pants: '#26333c' }); scene.add(playerMesh);
    }
    playerMesh.position.set(p.x, 0, p.y);
    animatePerson(playerMesh, p, performance.now() / 1000, true);
    playerMesh.rotation.y = -(p.angle || 0) - Math.PI / 2;
    playerShadow.position.set(p.x, 0.09, p.y);

    const vehicles = (state.vehicles || []).filter(v => v && v !== p.vehicle && (Math.abs(v.x-p.x) < 620 && Math.abs(v.y-p.y) < 620)).slice(0, 42);
    syncActors(vehicles, vehicleMeshes, (v) => makeCar(v.color || '#9da8a2', /police|patrol|interceptor|enforcer/.test(String(v.typeId || '')), v.typeId), true);
    const pedestrians = (state.pedestrians || []).filter(v => v && Math.abs(v.x-p.x) < 420 && Math.abs(v.y-p.y) < 420).slice(0, 55);
    syncActors(pedestrians, pedestrianMeshes, (v) => makePerson(v.isPolice ? '#263d57' : ['#9b765d','#687b68','#9b9da3','#a67d56','#6e718c','#b06f59'][Math.abs(v.id || 0) % 6], { police: !!v.isPolice, variant: Math.abs(v.id || 0), profile: v.isPolice ? getStoryProfile('police_foot') : null, pants: ['#303b45','#39423b','#34313d','#4b4540','#283746'][Math.abs(v.id || 0) % 5], hairStyle: ['short_crop','slick_part','long_hair','bun','ponytail'][Math.abs(v.id || 0) % 5] } ), false);
    pedestrianMeshes.forEach((m, i) => { if (m.visible) animatePerson(m, pedestrians[i], performance.now() / 1000); });
    const npcs = (state.npcs || []).filter(v => v && Math.abs(v.x-p.x) < 420 && Math.abs(v.y-p.y) < 420).slice(0, 18);
    syncActors(npcs, npcMeshes, (v) => makePerson(v.shirt || v.color || ['#526d83','#84634e','#687b68','#9a765d'][Math.abs(v.id || 0) % 4], { variant: Math.abs(v.id || 0) + 2, profile: getStoryProfile(v.visualId || v.id), pants: '#343b48' }), false);
    npcMeshes.forEach((m, i) => { if (m.visible) animatePerson(m, npcs[i], performance.now() / 1000); });

    // Third-person TPS camera: stay behind the direction of travel, slightly
    // above shoulder height. Drag horizontally to orbit; drag vertically to
    // adjust the viewing pitch. The camera target leads the character a little.
    const angle = p.angle || 0;
    if (!cameraReady) cameraYawOffset = angle;
    const orbitAngle = cameraYawOffset;
    const distance = p.inCar ? 92 : 58;
    const cameraHeight = Math.max(2.5, (p.inCar ? 34 : 29) + cameraPitchOffset * distance);
    const targetHeight = p.inCar ? 8 : 8.5;
    const forwardX = Math.cos(angle), forwardZ = Math.sin(angle);
    const target = new THREE.Vector3(p.x + forwardX * 5, targetHeight, p.y + forwardZ * 5);
    const desired = new THREE.Vector3(
      p.x - Math.cos(orbitAngle) * distance,
      cameraHeight,
      p.y - Math.sin(orbitAngle) * distance
    );
    if (!cameraReady) { camera.position.copy(desired); cameraReady = true; }
    else camera.position.lerp(desired, 0.16);
    camera.lookAt(target);
    renderer.render(scene, camera);
    return true;
  }

  // Camera-relative controls: joystick up follows camera forward, left/right
  // strafe relative to the current camera heading.
  function transformMovement(dx, dy, playerAngle) {
    // Movement is camera-relative, but independent from the character's last facing angle.
    // This prevents a feedback loop that made the player circle when the camera was rotated.
    const heading = cameraYawOffset;
    const fx = Math.cos(heading), fz = Math.sin(heading);
    const rx = -Math.sin(heading), rz = Math.cos(heading);
    return { dx: rx * dx + fx * (-dy), dy: rz * dx + fz * (-dy) };
  }

  function isActive() { return active; }
  function getStatus() { return { active, renderer: Boolean(renderer), buildings: World.buildings.length, environment: { ...environmentState }, qualityProfile, engine: window.CiudadEngine && CiudadEngine.runtime ? CiudadEngine.runtime.getDiagnostics() : null }; }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
  window.addEventListener('resize', resize);
  return { render, resize, isActive, getStatus, transformMovement };
})();
