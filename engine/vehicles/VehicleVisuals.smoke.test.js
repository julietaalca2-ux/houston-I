const fs = require('fs');
const path = require('path');
const source = fs.readFileSync(path.join(__dirname, '../../src/renderer3d.js'), 'utf8');
const required = [
  'function makeCar(color', 'SphereGeometry', 'MeshPhysicalMaterial',
  'wheelGroups', 'TorusGeometry', 'Visible cabin interior', 'Steering wheel on the left side', 'vehicleKind', 'isPickup', 'isSUV',
  'panel(glass', 'emissiveIntensity', 'isSport', 'isTaxi', 'patrol|interceptor|enforcer'
];
for (const token of required) {
  if (!source.includes(token)) throw new Error(`Vehicle visual feature missing: ${token}`);
}
if (!source.includes("makeCar(v.color || '#9da8a2', /police|patrol|interceptor|enforcer/.test(String(v.typeId || '')), v.typeId)")) {
  throw new Error('NPC vehicle type is not forwarded to the visual factory');
}
if (!source.includes('wheel.rotation.x = spin')) throw new Error('Wheel spin animation is missing');
console.log('VehicleVisuals smoke test: PASS');
