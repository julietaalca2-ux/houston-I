(function (global) {
  'use strict';
  const ns = global.CiudadEngine = global.CiudadEngine || {};
  const PROFILES = { mobile: { shadowSize: 1024, exposure: 1.08 }, balanced: { shadowSize: 1536, exposure: 1.12 }, high: { shadowSize: 2048, exposure: 1.16 }, ultra: { shadowSize: 3072, exposure: 1.2 } };
  class AdvancedLightingSystem {
    constructor(options) { const cfg=options||{}; this.profile=PROFILES[cfg.profile]?cfg.profile:'balanced'; this.scene=null; this.renderer=null; this.elapsed=0; this.stats={applied:false,shadowSize:PROFILES[this.profile].shadowSize,profile:this.profile}; }
    attach(ctx) { if(!ctx||!ctx.scene||!ctx.renderer) throw new Error('Scene and renderer required'); this.scene=ctx.scene;this.renderer=ctx.renderer;this.apply();return this; }
    setProfile(name) { if(!PROFILES[name]) throw new Error('Unknown lighting profile: '+name);this.profile=name;this.apply();return this.getDiagnostics(); }
    apply() { if(!this.renderer||!this.scene)return false;const p=PROFILES[this.profile];this.renderer.toneMappingExposure=p.exposure;if(this.renderer.shadowMap)this.renderer.shadowMap.enabled=true;
      if(this.scene.traverse)this.scene.traverse(o=>{if(o&&o.isDirectionalLight&&o.shadow&&o.shadow.mapSize){o.castShadow=true;o.shadow.mapSize.set(p.shadowSize,p.shadowSize);o.shadow.bias=-0.00012;o.shadow.normalBias=0.025;o.shadow.radius=this.profile==='mobile'?1:2;o.shadow.needsUpdate=true;}});
      const THREE=global.THREE;if(THREE&&this.renderer.shadowMap&&THREE.PCFSoftShadowMap!==undefined)this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
      this.stats={applied:true,shadowSize:p.shadowSize,profile:this.profile,shadows:true};return true; }
    update(dt){this.elapsed+=Math.max(0,Math.min(Number(dt)||0,0.1));}
    getDiagnostics(){return Object.assign({},this.stats,{elapsed:Number(this.elapsed.toFixed(2))});}
    dispose(){this.scene=null;this.renderer=null;this.stats.applied=false;}
  }
  AdvancedLightingSystem.PROFILES=Object.freeze(Object.keys(PROFILES));ns.AdvancedLightingSystem=AdvancedLightingSystem;
})(window);
