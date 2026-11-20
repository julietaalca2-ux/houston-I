/* Lightweight Node smoke test; no network or browser required. */
const fs = require('fs');
const vm = require('vm');
const context = { console, Promise, Map, Set, Date, Error, TypeError };
context.window = context;
context.THREE = {
  GLTFLoader: class {
    load(url, onLoad, onProgress) {
      this.calls = (this.calls || 0) + 1;
      onProgress({ loaded: 5, total: 10, lengthComputable: true });
      const root = {
        name: 'fixture', position: { set() {} }, scale: { setScalar() {}, set() {} },
        rotation: { set() {} }, clone() { return { name: '', position: this.position, scale: this.scale, rotation: this.rotation }; }
      };
      setTimeout(() => onLoad({ scene: root, scenes: [root], animations: [] }), 0);
    }
  }
};
vm.createContext(context);
for (const file of ['engine/core/EventBus.js', 'engine/core/ResourceRegistry.js', 'engine/assets/AssetManager.js']) {
  vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename: file });
}
(async () => {
  const events = new context.CiudadEngine.EventBus();
  const registry = new context.CiudadEngine.ResourceRegistry(events);
  const manager = new context.CiudadEngine.AssetManager(registry, events);
  let loadedEvents = 0;
  events.on('asset:loaded', () => loadedEvents++);
  const [a, b] = await Promise.all([
    manager.loadGLB('fixture', 'fixture.glb'),
    manager.loadGLB('fixture', 'fixture.glb')
  ]);
  if (a !== b || loadedEvents !== 1 || registry.getCount() !== 1) throw new Error('cache/deduplication test failed');
  let added = null;
  const instance = manager.addToScene('fixture', { add(value) { added = value; } }, { name: 'smoke-instance', scale: 2 });
  if (added !== instance || instance.name !== 'smoke-instance') throw new Error('scene instance test failed');
  if (!manager.unload('fixture') || registry.getCount() !== 0) throw new Error('unload test failed');
  console.log('AssetManager smoke test: PASS');
})().catch((error) => { console.error(error); process.exitCode = 1; });
