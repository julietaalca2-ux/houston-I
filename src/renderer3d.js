/* CIUDAD CERO v0.8.9 — FULL 3D WORLD RENDERER (edificios V0.25: Building Kit)
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

  // ======================================================================
  // V0.25.0 — BUILDING KIT (edificios y casas con detalle real)
  // Todo es procedural (canvas + geometría), sin descargas externas.
  //  - Rascacielos con retranqueos, muro cortina de vidrio y corona/antena.
  //  - Edificios de ladrillo/piedra con locales, toldos, cornisa y azotea.
  //  - Casas con techo a cuatro aguas, porche, columnas, escalones y ala trasera.
  //  - Casa moderna de playa (techo plano + garaje) y departamentos con balcones.
  //  - Bodegas de chapa con portones. Palmeras y arbustos en instancias.
  // Cada edificio se fusiona por material (pocos draw calls) y sus ventanas
  // se encienden de noche con un emissiveMap.
  // ======================================================================
  const bldgMaterials = [];
  const BK = { mats: {}, roofMats: {}, cm: {}, geo: {}, palms: [], shrubs: [], propTex: null };
  const hash32 = (n) => { n = Math.imul(n ^ (n >>> 16), 0x45d9f3b); n = Math.imul(n ^ (n >>> 16), 0x45d9f3b); return (n ^ (n >>> 16)) >>> 0; };
  const mkRng = (seed) => { let s = (seed >>> 0) || 1; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; };
  const hashStr = (str) => { let h = 7; for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619); return h >>> 0; };
  function shade(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    const r = clamp((n >> 16) + a, 0, 255) | 0, g = clamp(((n >> 8) & 255) + a, 0, 255) | 0, b = clamp((n & 255) + a, 0, 255) | 0;
    return 'rgb(' + r + ',' + g + ',' + b + ')';
  }

  // ---- Estilos de fachada: 1 tile = cols x rows ventanas (se repite por UV)
  const BSTYLE = {
    glassBlue:   { pat: 'glass', wall: '#3f5b69', glass: ['#a5cbdc', '#628a9f', '#2f4b59'], frame: '#cdd8db', cols: 4, rows: 2, bayW: 5.5, floorH: 8.5, winW: .94, winH: .82, lit: .42, rough: .26, metal: .12 },
    glassGrey:   { pat: 'glass', wall: '#56707a', glass: ['#bdd0d8', '#809ca7', '#445961'], frame: '#d5dcdd', cols: 4, rows: 2, bayW: 5.5, floorH: 8.5, winW: .94, winH: .82, lit: .40, rough: .26, metal: .12 },
    glassTeal:   { pat: 'glass', wall: '#3b5a55', glass: ['#a9d4cb', '#639a8e', '#2c5249'], frame: '#cfdcd8', cols: 4, rows: 2, bayW: 5.5, floorH: 8.5, winW: .94, winH: .82, lit: .40, rough: .26, metal: .12 },
    stoneLight:  { pat: 'stone', wall: '#c9cbc3', glass: ['#7f98a2', '#4d636c', '#26363c'], frame: '#ebe8dc', sill: '#efece1', lintel: '#dedbce', cols: 4, rows: 2, bayW: 5.5, floorH: 8.5, winW: .44, winH: .52, lit: .38 },
    stoneTan:    { pat: 'stone', wall: '#bfab8a', glass: ['#7d95a0', '#4b616b', '#26363c'], frame: '#ece3cf', sill: '#efe7d4', lintel: '#dfd5bf', cols: 4, rows: 2, bayW: 5.5, floorH: 8.5, winW: .44, winH: .52, lit: .38 },
    brickRed:    { pat: 'brick', wall: '#93503f', glass: ['#7d96a2', '#465c66', '#222f35'], frame: '#e8ddc9', sill: '#efe5d1', lintel: '#d9cdb7', cols: 3, rows: 2, bayW: 6, floorH: 8.5, winW: .40, winH: .52, lit: .36 },
    brickDark:   { pat: 'brick', wall: '#5e4540', glass: ['#7d96a2', '#465c66', '#222f35'], frame: '#d9ccb4', sill: '#e2d6bf', lintel: '#c9bca4', cols: 3, rows: 2, bayW: 6, floorH: 8.5, winW: .40, winH: .52, lit: .36 },
    brickTan:    { pat: 'brick', wall: '#a98c6d', glass: ['#7d96a2', '#465c66', '#222f35'], frame: '#efe6d2', sill: '#f2ead8', lintel: '#e0d6c0', cols: 3, rows: 2, bayW: 6, floorH: 8.5, winW: .40, winH: .52, lit: .36 },
    stuccoCream: { pat: 'stucco', wall: '#e2d6b9', glass: ['#7c97a5', '#44596a', '#222f38'], frame: '#f4eddb', sill: '#f4eddb', cols: 3, rows: 1, bayW: 12, floorH: 9.5, winW: .34, winH: .50, winY: .42, lit: .30 },
    stuccoSand:  { pat: 'stucco', wall: '#c8aa7c', glass: ['#7c97a5', '#44596a', '#222f38'], frame: '#efe5cd', sill: '#efe5cd', shutter: '#6b4b3a', cols: 3, rows: 1, bayW: 12, floorH: 9.5, winW: .30, winH: .50, winY: .42, lit: .30 },
    woodSiding:  { pat: 'siding', wall: '#a67e4e', glass: ['#7c97a5', '#44596a', '#222f38'], frame: '#eadfc8', sill: '#eadfc8', cols: 3, rows: 1, bayW: 12, floorH: 9.5, winW: .32, winH: .50, winY: .42, lit: .30 },
    modernGrey:  { pat: 'stucco', wall: '#bab7ae', glass: ['#8fa9b6', '#53697a', '#27343e'], frame: '#6e6a62', cols: 2, rows: 1, bayW: 14, floorH: 9.5, winW: .56, winH: .50, winY: .45, lit: .30 },
    aptGreen:    { pat: 'stucco', wall: '#72884f', glass: ['#7c97a5', '#44596a', '#222f38'], frame: '#e9dfc7', shutter: '#b79c78', cols: 4, rows: 1, bayW: 9, floorH: 9, winW: .26, winH: .38, winY: .42, lit: .34 },
    aptSand:     { pat: 'stucco', wall: '#d2ba8f', glass: ['#7c97a5', '#44596a', '#222f38'], frame: '#f2e9d3', shutter: '#8a6a52', cols: 4, rows: 1, bayW: 9, floorH: 9, winW: .26, winH: .38, winY: .42, lit: .34 },
    metal:       { pat: 'metal', wall: '#99a19c', glass: ['#8aa2ad', '#52687a', '#2b3a44'], frame: '#59625f', cols: 4, rows: 1, bayW: 10, floorH: 9, winW: .78, winH: .15, winY: .22, lit: .28, rough: .7, metal: .25 }
  };
  ['#b3392f', '#2f5d8a', '#2f7a58', '#c28a2a'].forEach((c, i) => {
    BSTYLE['store' + i] = { pat: 'store', wall: '#3c4145', glass: ['#aac6cf', '#587783', '#26363c'], frame: '#dcd6c8', awn: c, cols: 2, rows: 1, bayW: 9, floorH: 10, lit: .85 };
  });

  function canvasTex(cv, srgb = true) {
    const t = new THREE.CanvasTexture(cv);
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = renderer && renderer.capabilities ? Math.min(8, renderer.capabilities.getMaxAnisotropy()) : 4;
    return t;
  }

  function buildBayTextures(name) {
    const st = BSTYLE[name]; const S = 512;
    const c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d');
    const e = document.createElement('canvas'); e.width = e.height = S; const ge = e.getContext('2d');
    ge.fillStyle = '#000'; ge.fillRect(0, 0, S, S);
    const R = mkRng(hashStr(name));
    // --- muro
    g.fillStyle = st.wall; g.fillRect(0, 0, S, S);
    if (st.pat === 'brick') {
      g.fillStyle = shade(st.wall, -48); g.fillRect(0, 0, S, S);
      const bh = 16, bw = 32;
      for (let y = 0; y < S; y += bh) { const off = ((y / bh) & 1) ? bw / 2 : 0; for (let x = -bw; x < S; x += bw) { g.fillStyle = shade(st.wall, (R() - .5) * 30); g.fillRect(x + off + 1, y + 1, bw - 2, bh - 2); } }
    } else if (st.pat === 'stone') {
      for (let y = 0; y < S; y += 32) { g.fillStyle = 'rgba(0,0,0,.16)'; g.fillRect(0, y, S, 2); const off = ((y / 32) & 1) ? 64 : 0; for (let x = off; x < S; x += 128) g.fillRect(x, y, 2, 32); }
    } else if (st.pat === 'siding') {
      for (let y = 0; y < S; y += 12) { g.fillStyle = 'rgba(0,0,0,.22)'; g.fillRect(0, y, S, 2); g.fillStyle = 'rgba(255,255,255,.07)'; g.fillRect(0, y + 2, S, 2); }
    } else if (st.pat === 'metal') {
      for (let x = 0; x < S; x += 8) { g.fillStyle = (x / 8) & 1 ? 'rgba(0,0,0,.14)' : 'rgba(255,255,255,.09)'; g.fillRect(x, 0, 4, S); }
    }
    for (let i = 0; i < 1100; i++) { g.globalAlpha = .04 + R() * .07; g.fillStyle = R() < .5 ? '#000' : '#fff'; g.fillRect(R() * S, R() * S, 1 + R() * 7, 1 + R() * 7); }
    g.globalAlpha = 1;
    // --- celdas (ventanas / locales)
    const cw = S / st.cols, ch = S / st.rows;
    for (let r = 0; r < st.rows; r++) for (let cl = 0; cl < st.cols; cl++) {
      const cx = cl * cw, cy = r * ch;
      if (st.pat === 'store') {
        const px = cx + 12, py = ch * .30, pw = cw - 24, ph = ch * .62;
        g.fillStyle = st.frame; g.fillRect(px - 5, py - 5, pw + 10, ph + 10);
        const gr = g.createLinearGradient(px, py, px + pw, py + ph); gr.addColorStop(0, st.glass[0]); gr.addColorStop(.5, st.glass[1]); gr.addColorStop(1, st.glass[2]);
        g.fillStyle = gr; g.fillRect(px, py, pw, ph);
        g.fillStyle = st.frame; g.fillRect(px + pw * .5 - 3, py, 6, ph);
        if (cl === 1) { g.fillRect(px + pw * .2, py, 5, ph); g.fillRect(px + pw * .8 - 5, py, 5, ph); g.fillRect(px + pw * .68, py + ph * .5, 4, 22); }
        for (let sx = 0; sx < 6; sx++) { g.fillStyle = sx & 1 ? '#f1ece0' : st.awn; g.fillRect(cx + sx * cw / 6, ch * .10, cw / 6 + 1, ch * .17); }
        g.fillStyle = 'rgba(0,0,0,.28)'; g.fillRect(cx, ch * .27, cw, 7);
        g.fillStyle = '#25282b'; g.fillRect(cx, 0, cw, ch * .10);
        if (R() < st.lit) { const eg = ge.createLinearGradient(px, py, px, py + ph); eg.addColorStop(0, '#ffe3b0'); eg.addColorStop(1, '#ffc470'); ge.fillStyle = eg; ge.fillRect(px, py, pw, ph); }
        continue;
      }
      const ww = cw * st.winW, wh = ch * st.winH; const wx = cx + (cw - ww) / 2, wy = cy + (ch - wh) * (st.winY === undefined ? .5 : st.winY);
      const fp = st.pat === 'glass' ? 0 : Math.max(2, cw * .02);
      if (st.pat !== 'glass') {
        g.fillStyle = st.frame; g.fillRect(wx - fp, wy - fp, ww + fp * 2, wh + fp * 2);
        if (st.lintel) { g.fillStyle = st.lintel; g.fillRect(wx - fp - 3, wy - fp - 7, ww + fp * 2 + 6, 7); }
        if (st.sill) { g.fillStyle = st.sill; g.fillRect(wx - fp - 4, wy + wh + fp, ww + fp * 2 + 8, 6); }
        if (st.shutter) { const sw = ww * .38; g.fillStyle = st.shutter; g.fillRect(wx - fp - sw - 2, wy - fp, sw, wh + fp * 2); g.fillRect(wx + ww + fp + 2, wy - fp, sw, wh + fp * 2); }
      }
      const gr = g.createLinearGradient(wx, wy, wx + ww, wy + wh); gr.addColorStop(0, st.glass[0]); gr.addColorStop(.5, st.glass[1]); gr.addColorStop(1, st.glass[2]);
      g.fillStyle = gr; g.fillRect(wx, wy, ww, wh);
      g.fillStyle = 'rgba(255,255,255,.15)'; g.beginPath(); g.moveTo(wx, wy + wh * .55); g.lineTo(wx + ww * .55, wy); g.lineTo(wx + ww * .8, wy); g.lineTo(wx, wy + wh * .85); g.fill();
      if (st.pat === 'glass') { g.fillStyle = 'rgba(0,0,0,' + (R() * .2).toFixed(2) + ')'; g.fillRect(wx, wy, ww, wh); g.fillStyle = st.frame; g.fillRect(wx + ww / 2 - 1.5, wy, 3, wh); g.fillRect(wx, wy + wh - 3, ww, 3); }
      else { g.fillStyle = st.frame; g.fillRect(wx + ww / 2 - 1.5, wy, 3, wh); if (wh > ww * .9) g.fillRect(wx, wy + wh * .45, ww, 3); }
      if (R() < st.lit) { ge.fillStyle = R() < .25 ? '#cfe6ff' : '#ffd79a'; ge.fillRect(wx, wy, ww, wh); }
    }
    return { map: canvasTex(c), emissive: canvasTex(e) };
  }

  function bmat(name) {
    if (BK.mats[name]) return BK.mats[name];
    const st = BSTYLE[name]; const t = buildBayTextures(name);
    const m = new THREE.MeshStandardMaterial({ map: t.map, emissiveMap: t.emissive, emissive: new THREE.Color('#ffffff'), emissiveIntensity: 0.05, roughness: st.rough === undefined ? .84 : st.rough, metalness: st.metal === undefined ? .03 : st.metal });
    bldgMaterials.push(m); BK.mats[name] = m; return m;
  }

  function roofMat(kind) {
    if (BK.roofMats[kind]) return BK.roofMats[kind];
    const base = { terracotta: '#a65b3f', shingleBrown: '#62503f', shingleGrey: '#6d6f6b', tar: '#4f5351' }[kind] || '#5b5f5c';
    const S = 256, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d'); const R = mkRng(hashStr(kind));
    g.fillStyle = shade(base, -40); g.fillRect(0, 0, S, S);
    if (kind === 'tar') {
      g.fillStyle = base; g.fillRect(0, 0, S, S);
      for (let i = 0; i < 900; i++) { g.globalAlpha = .08 + R() * .12; g.fillStyle = R() < .5 ? '#000' : '#9a9a90'; g.fillRect(R() * S, R() * S, 1 + R() * 4, 1 + R() * 4); }
      g.globalAlpha = 1;
    } else {
      const rh = 8, tw = 16;
      for (let y = 0; y < S; y += rh) { const off = ((y / rh) & 1) ? tw / 2 : 0; for (let x = -tw; x < S; x += tw) { g.fillStyle = shade(base, (R() - .5) * 34); g.fillRect(x + off + 1, y, tw - 2, rh - 1); } g.fillStyle = 'rgba(0,0,0,.28)'; g.fillRect(0, y + rh - 2, S, 2); }
    }
    const t = canvasTex(c);
    const m = new THREE.MeshStandardMaterial({ map: t, roughness: .92, metalness: .02 });
    BK.roofMats[kind] = m; return m;
  }

  function cm(color, rough = .85, metal = .03) {
    const key = color + '|' + rough + '|' + metal;
    return BK.cm[key] || (BK.cm[key] = new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal }));
  }
  const ugeo = (k) => BK.geo[k] || (BK.geo[k] = k === 'box' ? new THREE.BoxGeometry(1, 1, 1) : k === 'cyl' ? new THREE.CylinderGeometry(1, 1, 1, 10) : new THREE.ConeGeometry(1, 1, 8));

  // caja con color plano (geometría unitaria escalada)
  function tb(g, x, y0, z, w, h, d, color, cast = false, rough, metal) {
    const m = new THREE.Mesh(ugeo('box'), typeof color === 'string' ? cm(color, rough, metal) : color);
    m.scale.set(w, h, d); m.position.set(x, y0 + h / 2, z); m.castShadow = cast; m.receiveShadow = true; g.add(m); return m;
  }
  function tcyl(g, x, y0, z, r, h, color, cone = false, cast = false) {
    const m = new THREE.Mesh(ugeo(cone ? 'cone' : 'cyl'), typeof color === 'string' ? cm(color) : color);
    m.scale.set(r, h, r); m.position.set(x, y0 + h / 2, z); m.castShadow = cast; g.add(m); return m;
  }

  // caja con UV repetidas según tamaño real (la ventana mantiene su proporción)
  function uvBox(w, h, d, tileW, tileH, snap) {
    const geo = new THREE.BoxGeometry(w, h, d), uv = geo.attributes.uv;
    const sx = (l) => snap ? Math.max(1, Math.round(l / tileW)) : l / tileW;
    const sy = (l) => snap ? Math.max(1, Math.round(l / tileH)) : l / tileH;
    const f = [[sx(d), sy(h)], [sx(d), sy(h)], [sx(w), sx(d)], [sx(w), sx(d)], [sx(w), sy(h)], [sx(w), sy(h)]];
    for (let i = 0; i < 6; i++) for (let j = 0; j < 4; j++) { const k = i * 4 + j; uv.setXY(k, uv.getX(k) * f[i][0], uv.getY(k) * f[i][1]); }
    return geo;
  }
  // muro con ventanas; devuelve su altura (pisos enteros)
  function wall(g, name, x, y0, z, w, d, floors) {
    const st = BSTYLE[name]; const rows = st.rows;
    const F = Math.max(rows, Math.round(floors / rows) * rows); const h = F * st.floorH;
    const m = new THREE.Mesh(uvBox(w, h, d, st.cols * st.bayW, rows * st.floorH, true), bmat(name));
    m.position.set(x, y0 + h / 2, z); m.castShadow = true; m.receiveShadow = true; g.add(m); return h;
  }
  function flatTop(g, x, y, z, w, d, parapet = true) {
    const tar = roofMat('tar'); const geo = uvBox(w, 1, d, 14, 14, false);
    const m = new THREE.Mesh(geo, tar); m.position.set(x, y + .5, z); m.receiveShadow = true; g.add(m);
    if (parapet) { const pc = '#cfc9bb', t = .9, hh = 1.3;
      tb(g, x, y, z + d / 2 - t / 2, w, hh, t, pc); tb(g, x, y, z - d / 2 + t / 2, w, hh, t, pc);
      tb(g, x - w / 2 + t / 2, y, z, t, hh, d - t * 2, pc); tb(g, x + w / 2 - t / 2, y, z, t, hh, d - t * 2, pc); }
  }

  // techo a 2 o 4 aguas con UV propias (la cumbrera siempre va en X local)
  function roofMesh(w, d, rise, type, kind) {
    const hw = w / 2, hd = d / 2, P = [];
    const tri = (a, b, c) => P.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);
    const quad = (a, b, c, e) => { tri(a, b, c); tri(a, c, e); };
    if (type === 'gable') {
      quad([-hw, 0, hd], [hw, 0, hd], [hw, rise, 0], [-hw, rise, 0]);
      quad([hw, 0, -hd], [-hw, 0, -hd], [-hw, rise, 0], [hw, rise, 0]);
      tri([-hw, 0, -hd], [-hw, 0, hd], [-hw, rise, 0]); tri([hw, 0, hd], [hw, 0, -hd], [hw, rise, 0]);
    } else {
      const rl = Math.max(0, hw - hd), A = [-rl, rise, 0], B = [rl, rise, 0];
      quad([-hw, 0, hd], [hw, 0, hd], B, A); quad([hw, 0, -hd], [-hw, 0, -hd], A, B);
      tri([-hw, 0, -hd], [-hw, 0, hd], A); tri([hw, 0, hd], [hw, 0, -hd], B);
    }
    const geo = new THREE.BufferGeometry(); const pos = new Float32Array(P); const uv = new Float32Array(P.length / 3 * 2); const s = 22;
    for (let i = 0; i < P.length / 3; i++) { const x = P[i * 3], y = P[i * 3 + 1], z = P[i * 3 + 2]; uv[i * 2] = (x + z * .35) / s; uv[i * 2 + 1] = (y * 1.5 + z * .9 + x * .12) / s; }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, roofMat(kind)); m.castShadow = true; m.receiveShadow = true; return m;
  }
  function addRoof(g, x, y, z, w, d, rise, type, kind) {
    if (w < d) { const m = roofMesh(d, w, rise, type, kind); m.rotation.y = Math.PI / 2; m.position.set(x, y, z); g.add(m); }
    else { const m = roofMesh(w, d, rise, type, kind); m.position.set(x, y, z); g.add(m); }
  }

  // ---- fusiona los meshes de un edificio por material (menos draw calls)
  function mergeGeos(list) {
    let n = 0; const geos = list.map((x) => x.index ? x.toNonIndexed() : x); geos.forEach((x) => { n += x.attributes.position.count; });
    const P = new Float32Array(n * 3), N = new Float32Array(n * 3), U = new Float32Array(n * 2); let o = 0;
    geos.forEach((x) => { P.set(x.attributes.position.array, o * 3); N.set(x.attributes.normal.array, o * 3); if (x.attributes.uv) U.set(x.attributes.uv.array, o * 2); o += x.attributes.position.count; });
    const out = new THREE.BufferGeometry(); out.setAttribute('position', new THREE.BufferAttribute(P, 3)); out.setAttribute('normal', new THREE.BufferAttribute(N, 3)); out.setAttribute('uv', new THREE.BufferAttribute(U, 2));
    out.computeBoundingSphere(); return out;
  }
  function mergeBuilding(g) {
    const buckets = new Map();
    g.children.slice().forEach((m) => {
      if (!m.isMesh) return;
      const key = m.material.uuid + (m.castShadow ? 'c' : 'n'); let b = buckets.get(key);
      if (!b) { b = { mat: m.material, cast: m.castShadow, geos: [] }; buckets.set(key, b); }
      m.updateMatrix(); const geo = m.geometry.clone(); geo.applyMatrix4(m.matrix); b.geos.push(geo); g.remove(m);
    });
    buckets.forEach((b) => { const mesh = new THREE.Mesh(mergeGeos(b.geos), b.mat); mesh.castShadow = b.cast; mesh.receiveShadow = true; g.add(mesh); });
  }

  // ---- props instanciados (palmeras y arbustos)
  function addProp(g, type, lx, lz, s) {
    const v = new THREE.Vector3(lx, 0, lz); g.localToWorld(v);
    (type === 'palm' ? BK.palms : BK.shrubs).push({ x: v.x, z: v.z, s, r: (hash32(Math.floor(v.x * 7 + v.z * 13)) % 628) / 100 });
  }
  function frondGeo() {
    const segs = 5, L = 8.5, P = [], U = [], I = [];
    for (let i = 0; i <= segs; i++) { const t = i / segs, x = t * L, y = -t * t * 3.4, hw = 1.55 * Math.sin(Math.PI * Math.min(1, t * 1.05 + .1)) * (1 - t * .4) + .15; P.push(x, y, -hw, x, y, hw); U.push(t, 0, t, 1); }
    for (let i = 0; i < segs; i++) { const a = i * 2; I.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2)); geo.setIndex(I); geo.computeVertexNormals(); return geo;
  }
  function finishProps() {
    const dummy = new THREE.Object3D();
    if (BK.palms.length) {
      const tc = document.createElement('canvas'); tc.width = 64; tc.height = 128; const tg = tc.getContext('2d'); tg.fillStyle = '#7a5a3e'; tg.fillRect(0, 0, 64, 128);
      for (let y = 0; y < 128; y += 8) { tg.fillStyle = 'rgba(40,24,12,.55)'; tg.fillRect(0, y, 64, 2); tg.fillStyle = 'rgba(255,220,170,.12)'; tg.fillRect(0, y + 2, 64, 2); }
      const trunkTex = canvasTex(tc);
      const fc = document.createElement('canvas'); fc.width = 128; fc.height = 64; const fg = fc.getContext('2d');
      fg.strokeStyle = '#2f5a2a'; fg.lineWidth = 3; fg.beginPath(); fg.moveTo(0, 32); fg.lineTo(128, 32); fg.stroke();
      for (let x = 2; x < 120; x += 5) { fg.strokeStyle = (x / 5) & 1 ? '#3f7536' : '#4c8a3f'; fg.lineWidth = 3; fg.beginPath(); fg.moveTo(x, 32); fg.lineTo(x + 12, 2); fg.moveTo(x, 32); fg.lineTo(x + 12, 62); fg.stroke(); }
      const frondTex = canvasTex(fc);
      const trunkGeo = new THREE.CylinderGeometry(.55, .95, 15, 7, 1); trunkGeo.translate(0, 7.5, 0);
      const fr = []; for (let k = 0; k < 9; k++) { const f = frondGeo(); f.rotateZ(.3 + (k % 3) * .13); f.rotateY(k * Math.PI * 2 / 9 + (k % 2) * .25); f.translate(0, 15, 0); fr.push(f); }
      const crownGeo = mergeGeos(fr);
      const n = BK.palms.length;
      const trunks = new THREE.InstancedMesh(trunkGeo, new THREE.MeshStandardMaterial({ map: trunkTex, roughness: .95 }), n);
      const crowns = new THREE.InstancedMesh(crownGeo, new THREE.MeshStandardMaterial({ map: frondTex, alphaTest: .4, side: THREE.DoubleSide, roughness: .8 }), n);
      BK.palms.forEach((p, i) => { dummy.position.set(p.x, 0, p.z); dummy.rotation.set(0, p.r, 0); dummy.scale.setScalar(p.s); dummy.updateMatrix(); trunks.setMatrixAt(i, dummy.matrix); crowns.setMatrixAt(i, dummy.matrix); });
      trunks.castShadow = true; trunks.frustumCulled = false; crowns.frustumCulled = false; root.add(trunks); root.add(crowns);
    }
    if (BK.shrubs.length) {
      const sh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(2.1, 1), new THREE.MeshStandardMaterial({ color: '#46663d', roughness: .95, flatShading: true }), BK.shrubs.length);
      BK.shrubs.forEach((p, i) => { dummy.position.set(p.x, 1.2 * p.s, p.z); dummy.rotation.set(0, p.r, 0); dummy.scale.set(p.s * 1.3, p.s * .9, p.s * 1.1); dummy.updateMatrix(); sh.setMatrixAt(i, dummy.matrix); });
      sh.castShadow = true; sh.frustumCulled = false; root.add(sh);
    }
  }

  // ====================== constructores por tipo ======================
  function rooftopStuff(g, y, w, d, R, spire) {
    const n = 1 + Math.floor(R() * 2);
    for (let i = 0; i < n; i++) tb(g, (R() - .5) * w * .5, y, (R() - .5) * d * .5, 4 + R() * 4, 2.2 + R() * 1.6, 4 + R() * 3, '#6b7471', true);
    if (spire === 'cone') tcyl(g, 0, y, 0, 1.4, 16, '#c9a35a', true, true);
    else if (spire === 'mast') { tcyl(g, 0, y, 0, .35, 22, '#b9c0c0', false, true); tcyl(g, 0, y + 20, 0, .8, .8, '#ff3b2f', true); }
    else if (spire === 'tank') { tcyl(g, w * .15, y + 3, d * .1, 3.2, 5, '#7a5a42', false, true); tcyl(g, w * .15, y + 8, d * .1, 3.4, 2.4, '#5a4331', true, true); [[-2, -2], [2, -2], [-2, 2], [2, 2]].forEach(([a, b]) => tb(g, w * .15 + a, y, d * .1 + b, .5, 3, .5, '#4a4a46')); }
  }

  function buildTower(g, w, d, floors, R, tall) {
    const names = ['glassBlue', 'glassGrey', 'glassTeal', 'stoneLight', 'stoneTan']; const nm = names[Math.floor(R() * names.length)];
    const glass = nm.indexOf('glass') === 0; const pod = glass ? (R() < .5 ? 'stoneLight' : 'stoneTan') : nm;
    const Ft = Math.min(20, floors); let y = wall(g, pod, 0, 0, 0, w, d, 3);
    tb(g, 0, y, 0, w + 1.6, 1.1, d + 1.6, '#d8d5c8', true); y += 1.1;
    const hasCrown = Ft > 12; const shaftF = Math.max(2, Ft - 3 - (hasCrown ? 3 : 0));
    const sw = w * .84, sd = d * .84; y += wall(g, nm, 0, y, 0, sw, sd, shaftF);
    tb(g, 0, y, 0, sw + 1, .9, sd + 1, '#cfd2cb'); y += .9;
    let tw = sw, td = sd;
    if (hasCrown) { tw = sw * .68; td = sd * .68; y += wall(g, nm, 0, y, 0, tw, td, 3); tb(g, 0, y, 0, tw + 1, 1.1, td + 1, '#d8d5c8'); y += 1.1; }
    tb(g, 0, y, 0, tw * .98, 1.4, td * .98, '#9ea5a2', true); y += 1.4;
    rooftopStuff(g, y, tw, td, R, glass ? 'mast' : 'cone');
  }

  function buildMidrise(g, w, d, floors, R, id, store) {
    const set = id === 'centro' ? ['stoneLight', 'stoneTan', 'brickDark'] : id === 'loston' ? ['brickDark', 'brickRed', 'brickTan'] : ['brickRed', 'brickTan', 'stoneTan', 'brickRed'];
    const nm = set[Math.floor(R() * set.length)]; let y = 0;
    if (store) {
      const sn = 'store' + Math.floor(R() * 4); const sdef = BSTYLE[sn];
      const m = new THREE.Mesh(uvBox(w + .5, sdef.floorH, d + .5, sdef.cols * sdef.bayW, sdef.floorH, true), bmat(sn)); m.position.set(0, sdef.floorH / 2, 0); m.castShadow = true; m.receiveShadow = true; g.add(m);
      y = sdef.floorH; tb(g, 0, y, 0, w + 1.2, .8, d + 1.2, '#d6cfbf'); y += .8;
    }
    y += wall(g, nm, 0, y, 0, w, d, Math.max(1, floors - (store ? 1 : 0)));
    tb(g, 0, y, 0, w + 1.6, 1.3, d + 1.6, '#d7d0bf', true); y += 1.3;
    flatTop(g, 0, y, 0, w, d); y += 1.3;
    const r = R(); rooftopStuff(g, y, w, d, R, r < .3 ? 'tank' : r < .55 ? 'cone' : null);
  }

  function buildHouse(g, w, d, R) {
    const names = ['stuccoCream', 'stuccoSand', 'woodSiding', 'modernGrey']; const wn = names[Math.floor(R() * 4)];
    const modern = wn === 'modernGrey', fh = BSTYLE[wn].floorH, rk = wn === 'woodSiding' ? 'shingleBrown' : 'terracotta';
    const frontD = Math.min(d, Math.max(18, d * .62)), zMain = d / 2 - frontD / 2, wingD = d - frontD;
    const mainH = wall(g, wn, 0, 0, zMain, w, frontD, 2);
    const doorX = (R() < .5 ? -1 : 1) * w * .18, z0 = zMain + frontD / 2;
    if (modern) {
      tb(g, 0, mainH, zMain, w + 3, .9, frontD + 3, '#6a5b4d', true);
      const gx = -Math.sign(doorX) * w * .22; tb(g, gx, 0, z0 + .15, w * .38, 8, .5, '#d9d8d2'); for (let i = 1; i < 6; i++) tb(g, gx, i * 1.3, z0 + .42, w * .38, .12, .15, '#a9a8a2');
      tb(g, doorX, 0, z0 + .12, 5.2, 8, .4, '#2f2a26'); tb(g, doorX, 0, z0 + .3, 4.2, 7.4, .3, '#8a6a4a');
    } else {
      addRoof(g, 0, mainH, zMain, w + 2.4, frontD + 2.4, Math.min(7.5, frontD * .22), 'hip', rk);
      tb(g, doorX, 0, z0 + .1, 5.4, 8.2, .4, '#3d342d'); tb(g, doorX, 0, z0 + .28, 4.2, 7.4, .3, '#f1ece0');
      const pw = Math.min(w * .5, 22);
      tb(g, doorX, 0, z0 + 2.4, pw, .7, 4.8, '#bdb9ac', true);
      tb(g, doorX, 8.6, z0 + 2.5, pw + 1.4, .7, 5.4, rk === 'terracotta' ? '#8c4b35' : '#54443a', true);
      [-1, 1].forEach((s) => tb(g, doorX + s * (pw / 2 - .9), .7, z0 + 4.5, .9, 7.9, .9, '#f0eadb', true));
      tb(g, doorX, 0, z0 + 5.4, 6.6, .55, 1.4, '#c9c5b8'); tb(g, doorX, 0, z0 + 6.4, 6.6, .3, 1.2, '#d4d0c4');
      if (R() < .55) tb(g, (R() < .5 ? -1 : 1) * w * .3, mainH + 1, zMain - frontD * .15, 3.2, 7, 3.2, '#8a6a58', true);
    }
    if (wingD >= 8) {
      const wh = wall(g, wn, 0, 0, -d / 2 + wingD / 2, w, wingD, 1);
      if (modern) flatTop(g, 0, wh, -d / 2 + wingD / 2, w, wingD); else addRoof(g, 0, wh, -d / 2 + wingD / 2, w + 1.6, wingD + 1.6, 3, 'hip', rk);
    }
    tb(g, doorX, 0, z0 + 8.2, 9, .1, 5, '#b9b6ab'); // acceso al garaje/calle
    const side = -Math.sign(doorX);
    addProp(g, 'shrub', doorX + Math.sign(doorX) * (w * .2), z0 + 3, .9 + R() * .5); addProp(g, 'shrub', doorX - Math.sign(doorX) * 6, z0 + 3.2, .8 + R() * .4);
    if (R() < .75) addProp(g, 'palm', side * w * .38, z0 + 4.5, .9 + R() * .45);
    if (R() < .35) addProp(g, 'palm', side * w * .1, z0 + 5.5, .8 + R() * .3);
  }

  function buildApartment(g, w, d, R) {
    const nm = R() < .6 ? 'aptGreen' : 'aptSand', fh = BSTYLE[nm].floorH;
    let y = wall(g, nm, 0, 0, 0, w, d, 3);
    tb(g, 0, y, 0, w + 1.4, 1.2, d + 1.4, '#d8c9a4', true); y += 1.2; flatTop(g, 0, y, 0, w, d); y += 1.3;
    for (let f = 1; f <= 2; f++) { tb(g, 0, fh * f - .6, d / 2 + 1.6, w * .82, .6, 3.4, '#bfb08f', true); tb(g, 0, fh * f, d / 2 + 3.1, w * .82, 2.8, .3, '#d9d0bd'); }
    tb(g, 0, 0, d / 2 + .1, 5.4, 8, .4, '#3a312b'); tb(g, 0, 0, d / 2 + .28, 4.2, 7.2, .3, '#f1ece0');
    tb(g, 0, 7.8, d / 2 + 2.2, 11, .6, 4.4, '#c8b690', true);
    tb(g, 0, 0, d / 2 + 4.4, 8, .5, 1.4, '#c9c5b8'); tb(g, 0, 0, d / 2 + 5.4, 8, .3, 1.2, '#d4d0c4');
    [-1, 1].forEach((s) => { tb(g, s * w * .32, 0, d / 2 + 4, w * .2, 1.2, 3.6, '#c8ad7c', true); addProp(g, 'shrub', s * w * .32, d / 2 + 4, 1); addProp(g, 'palm', s * w * .4, d / 2 + 5, 1 + R() * .3); });
    if (R() < .6) addProp(g, 'palm', 0, d / 2 + 7.5, .9 + R() * .3);
    rooftopStuff(g, y, w, d, R, null);
  }

  function buildWarehouse(g, w, d, R, small) {
    const h = wall(g, 'metal', 0, 0, 0, w, d, small ? 1 : 2);
    addRoof(g, 0, h, 0, w + 1.2, d + 1.2, small ? 1.6 : 3.2, 'gable', 'tar');
    const n = small ? 1 : Math.max(1, Math.min(3, Math.floor(w / 36)));
    for (let i = 0; i < n; i++) { const x = (i - (n - 1) / 2) * (w / n); tb(g, x, 0, d / 2 + .12, 9.4, 9.4, .5, '#454c4f'); tb(g, x, .2, d / 2 + .4, 8.6, 8.6, .3, '#7f8b90'); for (let k = 1; k < 6; k++) tb(g, x, k * 1.5, d / 2 + .6, 8.6, .12, .12, '#5f6a6e'); }
    if (!small) { tb(g, 0, 0, d / 2 + 2.4, w * .7, 1.1, 4.6, '#8b8e88', true); for (let i = 0; i < 2; i++) tb(g, (R() - .5) * w * .5, h + 1.2, (R() - .5) * d * .4, 5, 2.6, 5, '#6f7875', true); }
  }

  function addBuilding(b, index) {
    if (b.isHideoutWall || b.isGarageRoof || b.isContainerBlock) return addLegacyBuilding(b, index);
    const id = b.districtId || 'residencial', role = b.footprintRole || '';
    const R = mkRng(hash32(Math.imul(b.x | 0, 73856093) ^ Math.imul(b.y | 0, 19349663) ^ Math.imul(index + 1, 83492791)));
    const cfg = World.config || {}, bs = cfg.blockSize || 300, rw = cfg.roadWidth || 150;
    const cx = b.x + b.w / 2, cz = b.y + b.h / 2;
    const left = Math.floor(cx / bs) * bs + rw, top = Math.floor(cz / bs) * bs + rw, right = left + bs - rw, bottom = top + bs - rw;
    const dists = [[b.x - left, 'w'], [right - (b.x + b.w), 'e'], [b.y - top, 'n'], [bottom - (b.y + b.h), 's']].sort((p, q) => p[0] - q[0]);
    const face = dists[0][1]; const yaw = { s: 0, n: Math.PI, e: Math.PI / 2, w: -Math.PI / 2 }[face];
    const lw = (face === 'e' || face === 'w') ? b.h : b.w, ld = (face === 'e' || face === 'w') ? b.w : b.h;
    let floors = id === 'centro' ? 5 + (index % 13) : id === 'comercial' || id === 'loston' ? 2 + (index % 4) : 2 + (index % 3);
    const g = new THREE.Group(); g.position.set(cx, 0.12, cz); g.rotation.y = yaw; root.add(g); g.updateMatrixWorld(true);
    const w = Math.max(8, lw - 2), d = Math.max(8, ld - 2);
    const centro = id === 'centro', retail = id === 'comercial' || id === 'loston', ind = id === 'industrial' || id === 'portuaria';
    if (role === 'tower') buildTower(g, w, d, floors + 8, R);
    else if (role === 'annex' || role === 'podium') buildMidrise(g, w, d, Math.min(floors, role === 'podium' ? 6 : 9), R, id, false);
    else if (role === 'shop' || role === 'corner-shop') buildMidrise(g, w, d, floors, R, id, true);
    else if (role === 'warehouse') buildWarehouse(g, w, d, R, false);
    else if (role === 'service' || role === 'garage') buildWarehouse(g, w, d, R, true);
    else if (role === 'detached-home' || role === 'residence') buildHouse(g, w, d, R);
    else if (role === 'apartment') buildApartment(g, w, d, R);
    else if (centro) buildMidrise(g, w, d, floors, R, id, false);
    else if (retail) buildMidrise(g, w, d, floors, R, id, true);
    else if (ind) buildWarehouse(g, w, d, R, w < 40 || d < 40);
    else if (w > 110 && d > 50) buildApartment(g, w, d, R);
    else buildHouse(g, w, d, R);
    mergeBuilding(g);
  }

  // Constructor simple original (se conserva para muros de escondite, garajes y contenedores).
  function addLegacyBuilding(b, index) {
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
    BK.palms.length = 0; BK.shrubs.length = 0;
    World.buildings.forEach(addBuilding);
    finishProps();
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
    // V0.8.12: low-poly "GTA San Andreas" look. No more smooth ellipsoids:
    // the body is an extruded side profile (flat faces, sharp edges), the cabin is a
    // tapered box with a raked windscreen/rear window, windows are dark flat panes,
    // bumpers are chrome bars and wheels have grey hubcaps. Everything is built directly
    // at final size from the physics footprint (VEHICLE_TYPES), front faces -Z.
    const group = new THREE.Group();
    const kind = String(typeId || 'sedan').toLowerCase();
    const types = (window.CiudadCero && CiudadCero.Config && CiudadCero.Config.VEHICLE_TYPES) || {};
    const vt = types[typeId] || types[kind] || { length: 42, width: 20 };
    const BIG = 1.3; // visual size so cars read as real cars next to pedestrians
    const L = (vt.length || 42) * BIG, W = (vt.width || 20) * BIG;
    const isVan = /van|ambulance/.test(kind);
    const isPickup = /truck|pickup/.test(kind);
    const isSUV = /suv|enforcer/.test(kind);
    const isMuscle = /muscle|interceptor/.test(kind);
    const isCoupe = /coupe/.test(kind);
    const isCompact = /compact/.test(kind);
    const isTaxi = /taxi/.test(kind) && !police;

    // Shape parameters as fractions of the car length (z: -0.5 front ... +0.5 rear, y: up).
    let P;
    if (isVan)         P = { nose: .19,  belt: .245, cowl: -.30, deck: .47, rear: .245, zbF: -.30, zbR: .47,  ztF: -.255, ztR: .455, roof: .43,  win: 'van' };
    else if (isPickup) P = { nose: .20,  belt: .235, cowl: -.20, deck: .06, rear: .20,  zbF: -.17, zbR: .055, ztF: -.095, ztR: .02,  roof: .37,  win: 'single' };
    else if (isSUV)    P = { nose: .20,  belt: .235, cowl: -.22, deck: .39, rear: .235, zbF: -.21, zbR: .385, ztF: -.15,  ztR: .365, roof: .385, win: 'two' };
    else if (isMuscle) P = { nose: .165, belt: .212, cowl: -.13, deck: .32, rear: .205, zbF: -.12, zbR: .25,  ztF: .0,    ztR: .14,  roof: .318, win: 'single' };
    else if (isCoupe)  P = { nose: .17,  belt: .212, cowl: -.17, deck: .32, rear: .20,  zbF: -.17, zbR: .22,  ztF: -.03,  ztR: .12,  roof: .322, win: 'single' };
    else if (isCompact)P = { nose: .19,  belt: .222, cowl: -.20, deck: .30, rear: .21,  zbF: -.21, zbR: .27,  ztF: -.12,  ztR: .22,  roof: .358, win: 'two' };
    else               P = { nose: .185, belt: .218, cowl: -.19, deck: .30, rear: .205, zbF: -.20, zbR: .20,  ztF: -.085, ztR: .11,  roof: .344, win: 'two' };

    const paint = new THREE.MeshStandardMaterial({ color: police ? '#e9eef0' : color, roughness: 0.52, metalness: 0.18, flatShading: true, side: THREE.DoubleSide });
    const paintDark = new THREE.MeshStandardMaterial({ color: police ? '#16304e' : color, roughness: 0.55, metalness: 0.18, flatShading: true });
    const glass = new THREE.MeshStandardMaterial({ color: '#0b1620', roughness: 0.12, metalness: 0.55, flatShading: true, side: THREE.DoubleSide });
    const trim = new THREE.MeshStandardMaterial({ color: '#14181b', roughness: 0.82, metalness: 0.1, flatShading: true });
    const chrome = new THREE.MeshStandardMaterial({ color: '#aab1b4', roughness: 0.34, metalness: 0.8, flatShading: true });
    const tire = new THREE.MeshStandardMaterial({ color: '#121416', roughness: 0.95 });
    const hubMat = new THREE.MeshStandardMaterial({ color: '#8f989b', roughness: 0.4, metalness: 0.6 });
    const lugMat = new THREE.MeshStandardMaterial({ color: '#3a4044', roughness: 0.6, metalness: 0.4 });
    const headlight = new THREE.MeshStandardMaterial({ color: '#f1ead0', emissive: '#d9c98a', emissiveIntensity: 0.55, roughness: 0.3 });
    const tailLight = new THREE.MeshStandardMaterial({ color: '#a71920', emissive: '#e00a18', emissiveIntensity: 0.6, roughness: 0.35 });
    const indicator = new THREE.MeshStandardMaterial({ color: '#ff9b32', emissive: '#ff6a12', emissiveIntensity: 0.4, roughness: 0.4 });
    const plateMat = new THREE.MeshStandardMaterial({ color: '#d9d7c8', roughness: 0.6 });

    const mk = (geo, mat, x, y, z, cast = false, parent = group) => {
      const mesh = new THREE.Mesh(geo, mat); mesh.position.set(x, y, z);
      mesh.castShadow = cast; mesh.receiveShadow = true; parent.add(mesh); return mesh;
    };
    const box = (mat, x, y, z, sx, sy, sz, cast = false) => mk(new THREE.BoxGeometry(sx, sy, sz), mat, x, y, z, cast);
    // Flat quads -> one non-indexed mesh (hard edges, no smoothing).
    const soup = (mat, quads, cast = true) => {
      const pos = [];
      quads.forEach(([a, b, c, d]) => pos.push(...a, ...b, ...c, ...a, ...c, ...d));
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.computeVertexNormals();
      return mk(g, mat, 0, 0, 0, cast);
    };

    const bw = W / 2 * 0.96;                       // body half width
    const sill = 0.07;                             // underbody height (fraction of L)
    const rf = (isSUV || isPickup || isVan) ? 0.075 : 0.072; // wheel radius (fraction of L)
    const r = rf * L;
    const ww = Math.min(0.045 * L, W * 0.17);      // wheel width
    const wz = isVan ? 0.30 : (isPickup ? 0.315 : 0.31);
    const wheelX = bw + 0.3 - ww / 2;

    // ---- Lower body: side profile with low-poly wheel arches, extruded across the width.
    const arch = (zc) => [[zc - .105, sill], [zc - .092, rf + .05], [zc - .05, rf + .088], [zc + .05, rf + .088], [zc + .092, rf + .05], [zc + .105, sill]];
    const pts = [[-.495, sill], ...arch(-wz), ...arch(wz), [.495, sill], [.495, P.rear]];
    if (isPickup) pts.push([.06, P.rear], [.06, P.belt]); else pts.push([P.deck, P.belt]);
    pts.push([P.cowl, P.belt], [-.46, P.nose], [-.495, P.nose - .02]);
    const shape = new THREE.Shape();
    pts.forEach(([zf, yf], i) => { if (i) shape.lineTo(zf * L, yf * L); else shape.moveTo(zf * L, yf * L); });
    const bodyGeo = new THREE.ExtrudeGeometry(shape, { depth: bw * 2, bevelEnabled: false, steps: 1 });
    bodyGeo.translate(0, 0, -bw);
    bodyGeo.rotateY(-Math.PI / 2); // shape x -> world z, extrusion -> world x
    mk(bodyGeo, paint, 0, 0, 0, true);
    // Dark underbody fills the arch tunnel between the wheels so you never see through the car.
    const ubH = (rf + .088 - sill) * L;
    box(trim, 0, sill * L + 0.004 * L + ubH / 2, 0, 2 * (wheelX - ww / 2 - 0.1), ubH, 0.84 * L);

    // ---- Cabin: tapered box with raked glass.
    const hb = bw * 0.94, ht = bw * 0.80;
    const y0 = (P.belt - 0.006) * L, y1 = P.roof * L;
    const zbF = P.zbF * L, zbR = P.zbR * L, ztF = P.ztF * L, ztR = P.ztR * L;
    const v = [[-hb, y0, zbF], [hb, y0, zbF], [hb, y0, zbR], [-hb, y0, zbR], [-ht, y1, ztF], [ht, y1, ztF], [ht, y1, ztR], [-ht, y1, ztR]];
    const F = {
      front: [v[0], v[1], v[5], v[4]], rear: [v[2], v[3], v[7], v[6]],
      left: [v[0], v[3], v[7], v[4]], right: [v[1], v[2], v[6], v[5]], top: [v[4], v[5], v[6], v[7]]
    };
    soup(paint, Object.values(F));
    const cc = [0, (y0 + y1) / 2, (zbF + zbR) / 2];
    const lerp3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
    const pane = (face, u0, u1, v0, v1, off) => {
      const [A, B, C, D] = face;
      const pt = (u, w) => lerp3(lerp3(A, B, u), lerp3(D, C, u), w);
      const e1 = [B[0] - A[0], B[1] - A[1], B[2] - A[2]], e2 = [D[0] - A[0], D[1] - A[1], D[2] - A[2]];
      let n = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
      const nl = Math.hypot(n[0], n[1], n[2]) || 1; n = n.map((c) => c / nl);
      const mid = pt(.5, .5);
      if ((mid[0] - cc[0]) * n[0] + (mid[1] - cc[1]) * n[1] + (mid[2] - cc[2]) * n[2] < 0) n = n.map((c) => -c);
      return [[u0, v0], [u1, v0], [u1, v1], [u0, v1]].map(([u, w]) => { const p = pt(u, w); return [p[0] + n[0] * off, p[1] + n[1] * off, p[2] + n[2] * off]; });
    };
    const off = 0.004 * L;
    const panes = [pane(F.front, .06, .94, .10, .88, off), pane(F.rear, .08, .92, .14, .86, off)];
    const sideWin = P.win === 'two' ? [[.06, .47], [.53, .94]] : (P.win === 'van' ? [[.05, .28]] : [[.06, .94]]);
    sideWin.forEach(([a, b]) => { panes.push(pane(F.left, a, b, .10, .90, off)); panes.push(pane(F.right, a, b, .10, .90, off)); });
    soup(glass, panes, false);

    // ---- Roof extras.
    const zc = (ztF + ztR) / 2;
    if (isTaxi) {
      box(new THREE.MeshStandardMaterial({ color: '#f2c230', emissive: '#7d5b08', emissiveIntensity: 0.35, roughness: 0.5 }), 0, y1 + 0.02 * L, zc, W * 0.18, 0.035 * L, 0.055 * L);
    }
    if (police) {
      box(trim, 0, y1 + 0.012 * L, zc, bw * 1.0, 0.02 * L, 0.05 * L);
      box(new THREE.MeshStandardMaterial({ color: '#ff2935', emissive: '#e50018', emissiveIntensity: 1.5 }), -bw * 0.25, y1 + 0.032 * L, zc, bw * 0.42, 0.026 * L, 0.042 * L);
      box(new THREE.MeshStandardMaterial({ color: '#397dff', emissive: '#145dff', emissiveIntensity: 1.5 }), bw * 0.25, y1 + 0.032 * L, zc, bw * 0.42, 0.026 * L, 0.042 * L);
    }
    if (isSUV || isVan) {
      [-1, 1].forEach((s) => box(chrome, s * ht * 0.78, y1 + 0.006 * L, zc, 0.5, 0.012 * L, Math.abs(ztR - ztF) * 0.8));
    }

    // ---- Bumpers, grille, lamps, plates.
    box(chrome, 0, 0.092 * L, -0.5035 * L, bw * 2.03, 0.05 * L, 0.02 * L, true);
    box(chrome, 0, 0.092 * L, 0.5035 * L, bw * 2.03, 0.05 * L, 0.02 * L, true);
    box(trim, 0, (P.nose - 0.03) * L, -0.4975 * L, W * 0.34, 0.035 * L, 0.01 * L);
    [-1, 1].forEach((s) => {
      box(headlight, s * bw * 0.6, (P.nose - 0.028) * L, -0.4975 * L, W * 0.2, 0.034 * L, 0.012 * L);
      box(indicator, s * bw * 0.92, (P.nose - 0.028) * L, -0.4975 * L, W * 0.05, 0.03 * L, 0.012 * L);
      box(tailLight, s * bw * 0.66, (P.rear - 0.035) * L, 0.4975 * L, W * 0.22, 0.034 * L, 0.012 * L);
    });
    box(plateMat, 0, 0.092 * L, -0.5155 * L, W * 0.2, 0.03 * L, 0.006 * L);
    box(plateMat, 0, (P.rear - 0.075) * L, 0.4985 * L, W * 0.2, 0.03 * L, 0.008 * L);
    if (isVan) box(trim, 0, 0.15 * L, 0.497 * L, 0.3, 0.17 * L, 0.01 * L);

    // ---- Side details: door seams, handles, rocker panel, mirrors, police livery.
    const midZ = (zbF + zbR) / 2;
    const seams = isPickup || P.win === 'single' ? [zbF, midZ] : [zbF, midZ, zbR];
    [-1, 1].forEach((s) => {
      seams.forEach((z) => box(trim, s * (bw + 0.1), 0.15 * L, z, 0.25, 0.12 * L, 0.006 * L));
      const handleZ = P.win === 'single' || isPickup ? [zbF + (midZ - zbF) * 0.8] : [zbF + (midZ - zbF) * 0.8, midZ + (zbR - midZ) * 0.8];
      handleZ.forEach((z) => box(chrome, s * (bw + 0.2), (P.belt - 0.03) * L, z, 0.3, 0.012 * L, 0.035 * L));
      box(trim, s * (bw + 0.1), 0.083 * L, 0, 0.4, 0.02 * L, 0.4 * L);
      box(paint, s * (hb + 1.0), (P.belt + 0.028) * L, zbF + 0.05 * L, 1.5, 0.03 * L, 0.028 * L);
      if (police) box(paintDark, s * (bw + 0.14), 0.125 * L, midZ, 0.28, 0.06 * L, 0.38 * L);
    });

    // ---- Pickup bed.
    if (isPickup) {
      const bedZ = 0.2775 * L, bedLen = 0.435 * L, wallH = 0.05 * L, by = P.rear * L + wallH / 2;
      [-1, 1].forEach((s) => box(paint, s * (bw - 0.25), by, bedZ, 0.5, wallH, bedLen, true));
      box(paint, 0, by, 0.4925 * L, bw * 2, wallH, 0.014 * L, true);
      box(paint, 0, by, 0.0675 * L, bw * 2, wallH, 0.014 * L, true);
      box(trim, 0, P.rear * L + 0.003 * L, bedZ, 2 * (bw - 0.5), 0.004 * L, bedLen * 0.96);
    }

    // ---- Wheels: tyre, grey hubcap, centre cap and lug nuts (spin around local X).
    const wheelGroups = [];
    [-1, 1].forEach((side) => [-1, 1].forEach((axle) => {
      const w = new THREE.Group(); w.position.set(side * wheelX, r, axle * wz * L); group.add(w); wheelGroups.push(w);
      const tr = mk(new THREE.CylinderGeometry(r, r, ww, 14), tire, 0, 0, 0, true, w); tr.rotation.z = Math.PI / 2;
      const hub = mk(new THREE.CylinderGeometry(r * 0.64, r * 0.64, ww * 0.12, 12), hubMat, side * ww * 0.5, 0, 0, false, w); hub.rotation.z = Math.PI / 2;
      const cap = mk(new THREE.CylinderGeometry(r * 0.26, r * 0.26, ww * 0.1, 10), chrome, side * (ww * 0.5 + ww * 0.05), 0, 0, false, w); cap.rotation.z = Math.PI / 2;
      for (let i = 0; i < 5; i++) {
        const a = i * Math.PI * 2 / 5;
        const lug = mk(new THREE.CylinderGeometry(r * 0.07, r * 0.07, ww * 0.1, 6), lugMat, side * (ww * 0.5 + ww * 0.05), Math.sin(a) * r * 0.45, Math.cos(a) * r * 0.45, false, w);
        lug.rotation.z = Math.PI / 2;
      }
    }));

    group.userData.wheelGroups = wheelGroups;
    group.userData.vehicleKind = kind;
    group.userData.vehicleMaterials = [paint, paintDark, trim, glass, tire, chrome, hubMat, headlight, tailLight, indicator];
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
    for (let i = 0; i < bldgMaterials.length; i++) bldgMaterials[i].emissiveIntensity = 0.05 + night * 1.6;
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
