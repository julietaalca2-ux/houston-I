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
    const shirtDark = material(profile.torsoSecondary || options.shirtDark || '#202b32', 0.84);
    const pants = material(pantsColor, 0.9);
    const skin = material(skinTone, 0.92);
    const hair = material(hairColor, 0.94);
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
      scene.remove(playerMesh); playerMesh = makePerson('#435f70', { variant: 1, profile: getStoryProfile('mateo'), pants: '#26333c' }); scene.add(playerMesh);
    }
    playerMesh.position.set(p.x, 0, p.y);
    animatePerson(playerMesh, p, performance.now() / 1000, true);
    playerMesh.rotation.y = -(p.angle || 0) - Math.PI / 2;
    playerShadow.position.set(p.x, 0.09, p.y);

    const vehicles = (state.vehicles || []).filter(v => v && v !== p.vehicle && (Math.abs(v.x-p.x) < 620 && Math.abs(v.y-p.y) < 620)).slice(0, 42);
    syncActors(vehicles, vehicleMeshes, (v) => makeCar(v.color || '#9da8a2', v.typeId === 'police'), true);
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
  function getStatus() { return { active, renderer: Boolean(renderer), buildings: World.buildings.length }; }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
  window.addEventListener('resize', resize);
  return { render, resize, isActive, getStatus, transformMovement };
})();
