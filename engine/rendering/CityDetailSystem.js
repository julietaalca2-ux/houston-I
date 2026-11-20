/* CIUDAD ENGINE V0.16.0 — modular urban detail generator.
 * Uses InstancedMesh for repeated street furniture to keep draw calls bounded.
 */
(function (global) {
  'use strict';
  const ns = global.CiudadEngine = global.CiudadEngine || {};
  class CityDetailSystem {
    constructor(options = {}) {
      this.options = Object.assign({ lampSpacing: 145, maxStreetLights: 3000, maxRoofUnits: 360, maxBenches: 100, maxTrafficSignals: 900 }, options);
      this.signalMeshes = [];
      this.stats = { streetLights: 0, roofUnits: 0, benches: 0, trafficSignals: 0 };
      this.group = null;
    }
    build(THREE, scene, world, textureSet = {}) {
      if (!THREE || !scene || !world || !Array.isArray(world.buildings)) return this.stats;
      if (this.group) scene.remove(this.group);
      const group = new THREE.Group(); group.name = 'CiudadCero_24_CityDetails'; this.group = group;
      const metal = new THREE.MeshStandardMaterial({ color: '#8d999a', map: textureSet.metal || null, metalness: .78, roughness: .36 });
      const concrete = new THREE.MeshStandardMaterial({ color: '#777e79', roughness: .94 });
      const lampGlass = new THREE.MeshStandardMaterial({ color: '#fff1c2', emissive: '#ffce72', emissiveIntensity: .8, roughness: .24 });
      const benchWood = new THREE.MeshStandardMaterial({ color: '#76543a', roughness: .82 });
      const acMat = new THREE.MeshStandardMaterial({ color: '#aeb8b5', metalness: .35, roughness: .58 });
      const temp = new THREE.Object3D();
      const cfg = world.config || {}; const bs = cfg.blockSize || 300; const rw = cfg.roadWidth || 150;
      const lamps = [];
      // Street lamps on both sidewalk edges, aligned to the existing city grid.
      for (let x = 0; x <= (cfg.width || 0); x += bs) for (let z = 90; z < (cfg.height || 0); z += this.options.lampSpacing) {
        for (const side of [18, rw - 18]) lamps.push([x + side, z, 0]);
      }
      for (let z = 0; z <= (cfg.height || 0); z += bs) for (let x = 90; x < (cfg.width || 0); x += this.options.lampSpacing) {
        for (const side of [18, rw - 18]) lamps.push([x, z + side, Math.PI / 2]);
      }
      const poleGeo = new THREE.CylinderGeometry(.65, 1.05, 25, 8);
      const poleMesh = new THREE.InstancedMesh(poleGeo, metal, Math.min(lamps.length, this.options.maxStreetLights));
      const armGeo = new THREE.BoxGeometry(7, .65, .65), armMesh = new THREE.InstancedMesh(armGeo, metal, poleMesh.count);
      const bulbGeo = new THREE.SphereGeometry(1.5, 8, 6), bulbMesh = new THREE.InstancedMesh(bulbGeo, lampGlass, poleMesh.count);
      for (let i = 0; i < poleMesh.count; i++) {
        const [x,z,rot] = lamps[i]; temp.position.set(x, 12.5, z); temp.rotation.set(0,rot,0); temp.updateMatrix(); poleMesh.setMatrixAt(i,temp.matrix);
        temp.position.set(x + Math.cos(rot)*3.7, 24.2, z - Math.sin(rot)*3.7); temp.rotation.set(0,rot,0); temp.updateMatrix(); armMesh.setMatrixAt(i,temp.matrix);
        temp.position.set(x + Math.cos(rot)*7.1, 23.4, z - Math.sin(rot)*7.1); temp.rotation.set(0,0,0); temp.updateMatrix(); bulbMesh.setMatrixAt(i,temp.matrix);
      }
      poleMesh.castShadow = true; armMesh.castShadow = true; group.add(poleMesh,armMesh,bulbMesh); this.stats.streetLights = poleMesh.count;
      // V0.24.0: four-corner traffic signal sets at every generated intersection.
      // The world grid already supplies synchronized phase offsets for each junction.
      const junctions = Array.isArray(world.trafficLights) ? world.trafficLights : [];
      const signalPosts = [];
      junctions.forEach((j, ji) => {
        const cx = Number(j.x), cz = Number(j.y);
        if (!Number.isFinite(cx) || !Number.isFinite(cz)) return;
        const offsets = [[-1,-1],[1,-1],[-1,1],[1,1]];
        offsets.forEach(([sx,sz], corner) => {
          const px = cx + sx * (rw * 0.42), pz = cz + sz * (rw * 0.42);
          signalPosts.push({ x:px, z:pz, phase:Number(j.phaseOffset)||0, corner, junction:ji });
        });
      });
      const signalCount = Math.min(signalPosts.length, this.options.maxTrafficSignals);
      const signalMetal = new THREE.MeshStandardMaterial({ color:'#252b2d', metalness:.72, roughness:.38 });
      const signalHousing = new THREE.MeshStandardMaterial({ color:'#171d20', roughness:.62 });
      const redLamp = new THREE.MeshStandardMaterial({ color:'#ff2638', emissive:'#ff1024', emissiveIntensity:1.25, roughness:.2 });
      const amberLamp = new THREE.MeshStandardMaterial({ color:'#ffc247', emissive:'#ff9d16', emissiveIntensity:.95, roughness:.2 });
      const greenLamp = new THREE.MeshStandardMaterial({ color:'#35e078', emissive:'#0bc85a', emissiveIntensity:1.1, roughness:.2 });
      const postGeo = new THREE.CylinderGeometry(.48,.72,13,8);
      const postMesh = new THREE.InstancedMesh(postGeo,signalMetal,signalCount);
      const headGeo = new THREE.BoxGeometry(2.6,7.2,2.1);
      const headMesh = new THREE.InstancedMesh(headGeo,signalHousing,signalCount);
      const lensGeo = new THREE.SphereGeometry(.72,10,8);
      const redMesh = new THREE.InstancedMesh(lensGeo,redLamp,signalCount);
      const amberMesh = new THREE.InstancedMesh(lensGeo,amberLamp,signalCount);
      const greenMesh = new THREE.InstancedMesh(lensGeo,greenLamp,signalCount);
      for (let i=0;i<signalCount;i++) {
        const q=signalPosts[i], rot=(q.corner%2===0?0:Math.PI/2);
        temp.position.set(q.x,6.5,q.z); temp.rotation.set(0,rot,0); temp.updateMatrix(); postMesh.setMatrixAt(i,temp.matrix);
        temp.position.set(q.x,14.2,q.z); temp.rotation.set(0,rot,0); temp.updateMatrix(); headMesh.setMatrixAt(i,temp.matrix);
        const faceZ=q.z-1.12;
        temp.position.set(q.x,16.1,faceZ); temp.rotation.set(0,0,0); temp.updateMatrix(); redMesh.setMatrixAt(i,temp.matrix);
        temp.position.set(q.x,14.2,faceZ); temp.updateMatrix(); amberMesh.setMatrixAt(i,temp.matrix);
        temp.position.set(q.x,12.3,faceZ); temp.updateMatrix(); greenMesh.setMatrixAt(i,temp.matrix);
      }
      group.add(postMesh,headMesh,redMesh,amberMesh,greenMesh);
      this.stats.trafficSignals=signalCount;

      // Rooftop air-conditioning banks, vents and water tanks add a readable skyline silhouette.
      const roofCandidates = world.buildings.filter(b => b && b.w > 25 && b.h > 25 && !b.isHideoutWall).slice(0,this.options.maxRoofUnits);
      const acGeo = new THREE.BoxGeometry(8,4,6); const ac = new THREE.InstancedMesh(acGeo,acMat,roofCandidates.length);
      roofCandidates.forEach((b,i) => { const floors = (b.districtId === 'centro' ? 5 + (i%13) : 2 + (i%4)) + (b.footprintRole === 'tower' ? 8 : 0); const h = Math.max(7,Math.min(178,floors*8.5)); temp.position.set(b.x+b.w*.28,h+3,b.y+b.h*.28); temp.rotation.set(0,(i%4)*Math.PI/2,0); temp.updateMatrix(); ac.setMatrixAt(i,temp.matrix); });
      ac.castShadow = true; group.add(ac); this.stats.roofUnits = ac.count;
      // Benches in parks: one shared instanced batch, with legs and slats.
      const parks = world.parks || []; const benchPositions=[];
      parks.forEach((p,pi)=>{ if (!p || p.w<35 || p.h<35) return; const n=Math.min(3,Math.floor(p.w/100)+1); for(let j=0;j<n;j++) benchPositions.push([p.x+20+((j*67+pi*23)%(p.w-25)),p.y+18+((j*43+pi*17)%(p.h-25))]); });
      const benchGeo=new THREE.BoxGeometry(12,1.1,3.2), bench=new THREE.InstancedMesh(benchGeo,benchWood,Math.min(benchPositions.length,this.options.maxBenches));
      bench.count=Math.min(benchPositions.length,this.options.maxBenches);
      for(let i=0;i<bench.count;i++){const [x,z]=benchPositions[i];temp.position.set(x,3.4,z);temp.rotation.set(0,(i%2)*Math.PI/2,0);temp.updateMatrix();bench.setMatrixAt(i,temp.matrix);} group.add(bench); this.stats.benches=bench.count;
      scene.add(group); return Object.assign({},this.stats);
    }
    dispose(scene) { if (this.group && scene) scene.remove(this.group); this.group = null; }
  }
  ns.CityDetailSystem = CityDetailSystem;
})(window);
