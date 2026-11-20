const fs = require('fs');
const vm = require('vm');
const path = require('path');
const root = path.resolve(__dirname, '..', '..');
const context = { console, Math, Object, Array, Number };
context.window = context; vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root, 'engine/rendering/CityDetailSystem.js'), 'utf8'), context);
class Geometry { constructor() {} }
class Material { constructor(options) { Object.assign(this, options); } }
class Group { constructor(){this.children=[];} add(...items){this.children.push(...items);} }
class InstancedMesh { constructor(geometry, material, count){this.geometry=geometry;this.material=material;this.count=count;this.matrices=[];} setMatrixAt(i,m){this.matrices[i]=m;} }
class Object3D { constructor(){this.position={set(){}};this.rotation={set(){}};this.matrix={};} updateMatrix(){} }
const THREE={Group,MeshStandardMaterial:Material,CylinderGeometry:Geometry,BoxGeometry:Geometry,SphereGeometry:Geometry,InstancedMesh,Object3D};
const scene={children:[],add(x){this.children.push(x);},remove(x){this.children=this.children.filter(v=>v!==x);}};
const world={config:{width:900,height:900,blockSize:300,roadWidth:150},buildings:[{x:100,y:100,w:70,h:70,districtId:'centro'},{x:400,y:400,w:60,h:60}],parks:[{x:200,y:200,w:120,h:120}],trafficLights:[{x:300,y:300,phaseOffset:0},{x:600,y:600,phaseOffset:4}]};
const system=new context.CiudadEngine.CityDetailSystem({maxStreetLights:12,maxRoofUnits:10,maxBenches:10});
const stats=system.build(THREE,scene,world);
if(!scene.children.length || !system.group || stats.streetLights<=0 || stats.roofUnits!==2 || stats.benches!==2 || stats.trafficSignals!==8) throw new Error('City detail generation failed');
system.build(THREE,scene,world);
if(scene.children.length!==1) throw new Error('City detail rebuild leaked scene groups');
system.dispose(scene);
if(scene.children.length!==0) throw new Error('City detail disposal failed');
console.log('CityDetailSystem smoke test passed', stats);
