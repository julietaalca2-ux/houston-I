const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '../..');
const renderer = fs.readFileSync(path.join(root, 'src/renderer3d.js'), 'utf8');
const assets = path.join(root, 'assets/textures/expansion_v023_4k');
const required = [
  'road_asphalt_4k.jpg','sidewalk_concrete_4k.jpg','facade_stucco_4k.jpg',
  'brick_red_4k.jpg','roof_tiles_4k.jpg','urban_grass_4k.jpg',
  'foliage_leaves_4k.jpg','brushed_steel_4k.jpg','vehicle_paint_4k.jpg',
  'tire_rubber_4k.jpg','vehicle_glass_4k.jpg','clothing_fabric_4k.jpg','skin_microdetail_4k.jpg','hair_strands_4k.jpg'
];
for (const file of required) {
  if (!fs.existsSync(path.join(assets, file))) throw new Error(`Missing 4K asset: ${file}`);
}
if (!renderer.includes("qualityProfile === 'ultra' && !/Android|iPhone|iPad|iPod/i.test")) throw new Error('4K desktop-only quality gate missing');
for (const token of ['vehiclePaintMaterials','vehicleTireMaterials','vehicleGlassMaterials','characterFabricMaterials','characterSkinMaterials','characterHairMaterials']) {
  if (!renderer.includes(token)) throw new Error(`4K material registry missing: ${token}`);
}
if (!renderer.includes('vehicle_paint_4k.jpg') || !renderer.includes('clothing_fabric_4k.jpg') || !renderer.includes('skin_microdetail_4k.jpg') || !renderer.includes('hair_strands_4k.jpg') || !renderer.includes('vehicle_glass_4k.jpg')) throw new Error('Vehicle/character 4K maps are not wired');
console.log('HighResolutionAssetIntegration smoke test: PASS');
