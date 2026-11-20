(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const keys = new Set();
  const ui = {
    money: document.getElementById('money'),
    status: document.getElementById('status'),
    wanted: document.getElementById('wanted'),
    mission: document.getElementById('mission-title'),
    help: document.getElementById('mission-help'),
    toast: document.getElementById('toast')
  };

  const world = { w: 1800, h: 1400, road: 150, block: 300 };
  const player = { x: 380, y: 390, angle: 0, inCar: false, speed: 0 };
  const car = { x: 520, y: 390, angle: 0, speed: 0, color: '#d94f3d' };
  const target = { x: 1220, y: 820, r: 24 };
  let camera = { x: 0, y: 0 };
  let money = 500, completed = false, wanted = 0, toastTimer = 0;

  const buildings = [];
  for (let x = 0; x < world.w; x += world.block) {
    for (let y = 0; y < world.h; y += world.block) {
      const bx = x + world.road/2 + 22, by = y + world.road/2 + 22;
      const bw = world.block - world.road - 44, bh = world.block - world.road - 44;
      buildings.push({x:bx,y:by,w:bw,h:bh,shade:(Math.floor(x/300)+Math.floor(y/300))%3});
    }
  }

  function say(message) {
    ui.toast.textContent = message;
    ui.toast.classList.add('show');
    toastTimer = 2.2;
  }
  function reset() {
    player.x=380; player.y=390; player.angle=0; player.inCar=false;
    car.x=520; car.y=390; car.angle=0; car.speed=0;
    money=500; wanted=0; completed=false; updateUI(); say('Ciudad Cero te espera');
  }
  function updateUI() {
    ui.money.textContent = '$ ' + money;
    ui.status.textContent = player.inCar ? 'CONDUCIENDO' : 'A PIE';
    ui.wanted.textContent = '★'.repeat(wanted) + '☆'.repeat(5-wanted);
    ui.mission.textContent = completed ? 'Primer recorrido completado' : 'Llega al punto amarillo';
    ui.help.textContent = completed ? '¡Buen trabajo! Puedes seguir explorando.' :
      (player.inCar ? 'Conduce hasta el marcador amarillo.' : 'Muévete con WASD o las flechas.');
  }
  function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
  function collidesBuilding(x,y,r=10) {
    return buildings.some(b => x+r>b.x && x-r<b.x+b.w && y+r>b.y && y-r<b.y+b.h);
  }
  function moveEntity(entity, dx, dy, radius) {
    const nx=clamp(entity.x+dx, radius, world.w-radius);
    if(!collidesBuilding(nx,entity.y,radius)) entity.x=nx;
    const ny=clamp(entity.y+dy, radius, world.h-radius);
    if(!collidesBuilding(entity.x,ny,radius)) entity.y=ny;
  }
  function onRoad(x,y) {
    const rx=((x%world.block)+world.block)%world.block;
    const ry=((y%world.block)+world.block)%world.block;
    return rx<world.road || ry<world.road;
  }
  function update(dt) {
    const up=keys.has('w')||keys.has('arrowup');
    const down=keys.has('s')||keys.has('arrowdown');
    const left=keys.has('a')||keys.has('arrowleft');
    const right=keys.has('d')||keys.has('arrowright');
    if(player.inCar) {
      if(left) car.angle-=2.6*dt;
      if(right) car.angle+=2.6*dt;
      if(up) car.speed=Math.min(car.speed+240*dt, keys.has('shift')?310:230);
      else if(down) car.speed=Math.max(car.speed-300*dt,-100);
      else car.speed*=Math.pow(.94,dt*60);
      const oldX=car.x,oldY=car.y;
      moveEntity(car,Math.cos(car.angle)*car.speed*dt,Math.sin(car.angle)*car.speed*dt,13);
      if(Math.hypot(car.x-oldX,car.y-oldY)<Math.abs(car.speed*dt)*.25) car.speed=0;
    } else {
      let dx=(right?1:0)-(left?1:0), dy=(down?1:0)-(up?1:0);
      const len=Math.hypot(dx,dy)||1, speed=keys.has('shift')?190:135;
      if(dx||dy){dx=dx/len*speed*dt;dy=dy/len*speed*dt;player.angle=Math.atan2(dy,dx);moveEntity(player,dx,dy,9);}
    }
    const actor=player.inCar?car:player;
    if(!completed && Math.hypot(actor.x-target.x,actor.y-target.y)<target.r+16){
      completed=true; money+=250; updateUI(); say('Missione completata! +$250');
    }
    camera.x=clamp(actor.x-W/2,0,world.w-W);
    camera.y=clamp(actor.y-H/2,0,world.h-H);
    if(toastTimer>0){toastTimer-=dt;if(toastTimer<=0)ui.toast.classList.remove('show');}
  }
  function rect(x,y,w,h,color){ctx.fillStyle=color;ctx.fillRect(x,y,w,h);}
  function drawRoads(){
    rect(0,0,world.w,world.h,'#52604b');
    for(let x=0;x<world.w;x+=world.block) for(let y=0;y<world.h;y+=world.block){
      rect(x,y,world.road,world.block,'#343b3a');
      rect(x,y,world.block,world.road,'#343b3a');
      ctx.strokeStyle='#b8b38a';ctx.lineWidth=2;ctx.setLineDash([18,18]);
      ctx.beginPath();ctx.moveTo(x+world.road/2,y);ctx.lineTo(x+world.road/2,y+world.block);ctx.stroke();
      ctx.beginPath();ctx.moveTo(x,y+world.road/2);ctx.lineTo(x+world.block,y+world.road/2);ctx.stroke();
      ctx.setLineDash([]);
    }
  }
  function drawBuilding(b){
    const colors=['#879078','#9a8b70','#727f79'];
    rect(b.x+8,b.y+9,b.w,b.h,'#202822');
    rect(b.x,b.y,b.w,b.h,colors[b.shade]);
    rect(b.x+9,b.y+9,b.w-18,b.h-18,'#53645b');
    ctx.fillStyle='#c7c7a1';
    for(let wx=b.x+20;wx<b.x+b.w-12;wx+=36) for(let wy=b.y+20;wy<b.y+b.h-12;wy+=34) ctx.fillRect(wx,wy,13,9);
    rect(b.x+b.w/2-18,b.y+b.h/2-18,36,36,'#39483d');
  }
  function drawCar(x,y,angle,color){
    ctx.save();ctx.translate(x,y);ctx.rotate(angle);
    rect(-17,-10,38,20,'#171c19');rect(-19,-8,38,16,color);
    rect(-7,-7,13,14,'#8da5a0');rect(11,-6,5,12,'#d9d3a0');
    rect(-16,-12,8,4,'#171c19');rect(8,-12,8,4,'#171c19');
    rect(-16,8,8,4,'#171c19');rect(8,8,8,4,'#171c19');
    ctx.restore();
  }
  function render(){
    ctx.clearRect(0,0,W,H);ctx.save();ctx.translate(-camera.x,-camera.y);
    drawRoads(); buildings.forEach(drawBuilding);
    // decorative parked cars
    for(let i=0;i<12;i++){const x=170+(i%4)*300,y=76+Math.floor(i/4)*300;drawCar(x,y,Math.PI/2,i%2?'#4e91a0':'#d1b94d');}
    ctx.beginPath();ctx.arc(target.x,target.y,target.r+9,0,Math.PI*2);ctx.fillStyle='#f5d94b33';ctx.fill();
    ctx.beginPath();ctx.arc(target.x,target.y,target.r,0,Math.PI*2);ctx.fillStyle='#f5d94b';ctx.fill();
    ctx.fillStyle='#25291d';ctx.font='bold 16px monospace';ctx.textAlign='center';ctx.fillText('!',target.x,target.y+6);
    drawCar(car.x,car.y,car.angle,car.color);
    if(!player.inCar){
      ctx.save();ctx.translate(player.x,player.y);ctx.rotate(player.angle);
      ctx.fillStyle='#172019';ctx.fillRect(-7,-8,15,18);
      ctx.fillStyle='#f0c58c';ctx.fillRect(1,-6,9,10);
      ctx.fillStyle='#d9e6a2';ctx.fillRect(-6,-9,12,12);
      ctx.restore();
    }
    ctx.restore();
    // minimal radar
    ctx.fillStyle='#101610dd';ctx.fillRect(W-148,16,130,92);
    ctx.strokeStyle='#8b9a79';ctx.strokeRect(W-148,16,130,92);
    ctx.fillStyle='#71806a';ctx.fillRect(W-138,26,110,72);
    ctx.fillStyle='#333c38';ctx.fillRect(W-138+world.road/world.w*110,26,110-world.road/world.w*110,72);
    ctx.fillStyle='#f5d94b';ctx.beginPath();ctx.arc(W-138+target.x/world.w*110,26+target.y/world.h*72,3,0,7);ctx.fill();
    const a=player.inCar?car:player;ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(W-138+a.x/world.w*110,26+a.y/world.h*72,3,0,7);ctx.fill();
  }
  let last=performance.now();
  function loop(now){const dt=Math.min((now-last)/1000,.04);last=now;update(dt);render();requestAnimationFrame(loop);}
  window.addEventListener('keydown',e=>{
    const k=e.key.toLowerCase();
    if(['arrowup','arrowdown','arrowleft','arrowright',' '].includes(k))e.preventDefault();
    keys.add(k);
    if(k==='e'){
      if(player.inCar){player.inCar=false;player.x=car.x+25;player.y=car.y;car.speed=0;say('Has bajado del vehículo.');}
      else if(Math.hypot(player.x-car.x,player.y-car.y)<55){player.inCar=true;say('Vehículo ocupado. ¡A conducir!');}
      else say('Acércate a un vehículo para subir.');
      updateUI();
    }
    if(k==='r')reset();
  });
  window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
  window.addEventListener('blur',()=>keys.clear());
  updateUI();requestAnimationFrame(loop);
})();