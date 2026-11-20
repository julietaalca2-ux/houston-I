/* CIUDAD ENGINE V0.17.0 — urban/world expansion. Instanced and bounded. */
(function(global){'use strict'; const ns=global.CiudadEngine=global.CiudadEngine||{};
class CityWorldExpansionSystem{
 constructor(options={}){this.options=Object.assign({maxTrees:420,maxShrubs:700,maxSignals:80,maxSigns:240,maxGrass:900,renderDistance:1800,enabled:true},options);this.group=null;this.elapsed=0;this.signalMaterials=[];this.stats={trees:0,shrubs:0,grass:0,signals:0,signs:0,drawBatches:0};}
 build(THREE,scene,world){if(!this.options.enabled||!THREE||!scene||!world)return this.stats;this.dispose(scene);const g=new THREE.Group();g.name='CiudadCero_17_WorldExpansion';this.group=g;const cfg=world.config||{},parks=world.parks||[];let trees=[],shrubs=[],grass=[],signs=[];
 parks.forEach((p,pi)=>{if(!p||p.w<18||p.h<18)return;const seed=pi*991+Math.floor(p.x*3+p.y);let r=seed>>>0;const rand=()=>{r=(r*1664525+1013904223)>>>0;return r/4294967296;};let count=Math.min(48,Math.floor(p.w*p.h/2200));for(let i=0;i<count;i++){let x=p.x+8+rand()*(p.w-16),z=p.y+8+rand()*(p.h-16);trees.push([x,z,.72+rand()*.65]);for(let j=0;j<3;j++)shrubs.push([x+(rand()-.5)*15,z+(rand()-.5)*15,.6+rand()*.8]);for(let j=0;j<7;j++)grass.push([x+(rand()-.5)*20,z+(rand()-.5)*20,.5+rand()]);}});
 const temp=new THREE.Object3D(),mat=(c,r=.85)=>new THREE.MeshStandardMaterial({color:c,roughness:r});
 function batch(geo,m,arr,max,shadow=false){const n=Math.min(arr.length,max);if(!n)return null;const mesh=new THREE.InstancedMesh(geo,m,n);mesh.count=n;for(let i=0;i<n;i++){const a=arr[i];temp.position.set(a[0],a[2]||0,a[1]);temp.scale.set(a[3]||1,a[3]||1,a[3]||1);temp.rotation.set(0,a[4]||0,0);temp.updateMatrix();mesh.setMatrixAt(i,temp.matrix);}mesh.castShadow=shadow;mesh.receiveShadow=true;g.add(mesh);return mesh;}
 let trunkMat=mat('#65503b'),leafMat=mat('#496d42'),leaf2=mat('#66864d'),shrubMat=mat('#46663b'),grassMat=mat('#657b49');
 batch(new THREE.CylinderGeometry(.65,1.15,9,7),trunkMat,trees.map(a=>[a[0],a[1],4.5,a[2]]),this.options.maxTrees,true);
 batch(new THREE.SphereGeometry(5.7,9,7),leafMat,trees.map(a=>[a[0],a[1],11,a[2]*1.4]),this.options.maxTrees,true);
 batch(new THREE.SphereGeometry(4.2,8,6),leaf2,trees.map(a=>[a[0]+2,a[1]-2,14,a[2]]),this.options.maxTrees,true);
 batch(new THREE.SphereGeometry(1.8,6,5),shrubMat,shrubs.map(a=>[a[0],a[1],1.5,a[2]]),this.options.maxShrubs);
 batch(new THREE.ConeGeometry(.28,1.5,3),grassMat,grass.map(a=>[a[0],a[1],.5,a[2]]),this.options.maxGrass);
 // Junction signals: compact pole/head assemblies with three shared emissive lamp batches.
 const signals=[];const bs=cfg.blockSize||300,rw=cfg.roadWidth||150;for(let x=0;x<=(cfg.width||0);x+=bs)for(let z=0;z<=(cfg.height||0);z+=bs)for(const ox of [rw*.25,rw*.75])for(const oz of [rw*.25,rw*.75])signals.push([x+ox,z+oz]);
 const s=signals.slice(0,this.options.maxSignals);batch(new THREE.CylinderGeometry(.35,.6,8,6),mat('#303638'),s.map(a=>[a[0],a[1],4]),this.options.maxSignals);
 batch(new THREE.BoxGeometry(1.6,4.8,1.3),mat('#252b2c'),s.map(a=>[a[0],a[1],7]),this.options.maxSignals);
 const lampColors=['#ff392f','#ffb92f','#43df66'];this.signalMaterials=lampColors.map(c=>new THREE.MeshStandardMaterial({color:c,emissive:c,emissiveIntensity:.65,roughness:.35}));
 for(let k=0;k<3;k++)batch(new THREE.SphereGeometry(.48,8,6),this.signalMaterials[k],s.map(a=>[a[0],a[1],8.5-k*1.5]),this.options.maxSignals);
 // Basic street signage at sampled grid corners; signs and poles are instanced.
 const signPts=[];for(let x=0;x<=(cfg.width||0);x+=bs)for(let z=0;z<=(cfg.height||0);z+=bs)signPts.push([x+rw+4,z+rw+4]);
 batch(new THREE.CylinderGeometry(.18,.25,5,5),mat('#7b8585'),signPts.map(a=>[a[0],a[1],2.5]),this.options.maxSigns);
 batch(new THREE.BoxGeometry(2.4,1.5,.18),mat('#477a9c'),signPts.map(a=>[a[0],a[1],5.2]),this.options.maxSigns);
 scene.add(g);this.stats={trees:Math.min(trees.length,this.options.maxTrees),shrubs:Math.min(shrubs.length,this.options.maxShrubs),grass:Math.min(grass.length,this.options.maxGrass),signals:s.length,signs:Math.min(signPts.length,this.options.maxSigns),drawBatches:g.children.length};return Object.assign({},this.stats);}
 update(delta,camera){this.elapsed+=Math.max(0,Math.min(.1,delta||0));const phase=Math.floor(this.elapsed/7)%3;this.signalMaterials.forEach((m,i)=>{m.emissiveIntensity=i===phase?1.6:.18;});if(this.group&&camera){const max=this.options.renderDistance;this.group.visible=true;}}
 dispose(scene){if(this.group&&scene)scene.remove(this.group);if(this.group){this.group.traverse&&this.group.traverse(o=>{if(o.geometry&&o.geometry.dispose)o.geometry.dispose();});}this.group=null;this.signalMaterials=[];}
 getDiagnostics(){return Object.assign({},this.stats,{enabled:!!this.options.enabled,renderDistance:this.options.renderDistance});}}
ns.CityWorldExpansionSystem=CityWorldExpansionSystem; })(window);
