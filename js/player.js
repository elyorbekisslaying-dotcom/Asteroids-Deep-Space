class Player{
 constructor(w,h){this.x=w/2;this.y=h/2;this.vx=0;this.vy=0;this.angle=-Math.PI/2;this.cooldown=0;this.invincible=2.5;this.thrust=false;}
 update(dt, game) {
  const { build, keys, bindings } = game;
  let dx=Number(keys.has(bindings.right))-Number(keys.has(bindings.left));
  let dy=Number(keys.has(bindings.down))-Number(keys.has(bindings.up));
  const length=Math.hypot(dx,dy); if(length){dx/=length;dy/=length;}
  this.thrust=length>0;
  const response=1-Math.exp(-(length ? build.acceleration/65 : 12)*dt);
  this.vx+=(dx*build.speed-this.vx)*response;
  this.vy+=(dy*build.speed-this.vy)*response;
  this.x+=this.vx*dt; this.y+=this.vy*dt;
  const r=28;
  if(this.x<r||this.x>CONFIG.world.width-r){this.x=Math.max(r,Math.min(CONFIG.world.width-r,this.x));this.vx=0;}
  if(this.y<r||this.y>CONFIG.world.height-r){this.y=Math.max(r,Math.min(CONFIG.world.height-r,this.y));this.vy=0;}
  if(this.thrust)game.particles.exhaust(this,dt);
  if(!keys.has(bindings.fire)&&length)this.angle=Math.atan2(dy,dx);
  this.cooldown-=dt;this.invincible-=dt;
  if(keys.has(bindings.fire))this.fire(game);
 }
 fire(game){
  const pointer=game.worldPointer();
  if(pointer)this.angle=bearing(this,pointer);
  if(this.cooldown>0)return;
  game.bullets.push(new Bullet(this,{damage:game.build.damage}));
  this.cooldown=game.build.fireInterval;game.sound.play('laser');
 }
 draw(c,time,scale=1,display=false){c.save();c.translate(this.x,this.y);c.rotate(this.angle+Math.PI/2);c.scale(scale,scale);if(this.invincible>0&&!display){c.strokeStyle='#66eaff66';c.lineWidth=1;c.beginPath();c.arc(0,0,34,0,TAU);c.stroke();}
 const poly=(pts,fill,stroke='#45677f')=>{c.beginPath();pts.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));c.closePath();c.fillStyle=fill;c.fill();c.strokeStyle=stroke;c.lineWidth=.75;c.stroke();};
 c.globalCompositeOperation='lighter';for(const x of [-10,10]){const len=(this.thrust||display?26:10)+Math.sin(time*35+x)*4;const g=c.createLinearGradient(x,16,x,20+len);g.addColorStop(0,'#c7ffff');g.addColorStop(.25,'#32ceffbb');g.addColorStop(1,'#218cff00');c.fillStyle=g;c.beginPath();c.moveTo(x-3,16);c.quadraticCurveTo(x-7,26,x,20+len);c.quadraticCurveTo(x+7,26,x+3,16);c.fill();}c.globalCompositeOperation='source-over';
 poly([[-7,-15],[-15,-6],[-31,18],[-29,24],[-12,17],[-7,21]],'#102c46');poly([[7,-15],[15,-6],[31,18],[29,24],[12,17],[7,21]],'#153650');poly([[-14,1],[-25,17],[-17,14],[-9,-7]],'#2a506d');poly([[14,1],[25,17],[17,14],[9,-7]],'#244964');
 for(const x of [-10,10]){poly([[x-4,3],[x+4,3],[x+4,20],[x-4,20]],'#152c42');c.fillStyle='#75faff';c.shadowColor='#24dcff';c.shadowBlur=10;c.fillRect(x-3,17,6,3);c.shadowBlur=0;c.fillStyle='#6c91a6';for(let y=5;y<15;y+=3)c.fillRect(x-2,y,4,1);}
 const hull=c.createLinearGradient(-9,0,9,0);hull.addColorStop(0,'#18354e');hull.addColorStop(.48,'#52778f');hull.addColorStop(.52,'#2f5673');hull.addColorStop(1,'#10283d');poly([[0,-33],[-7,-16],[-9,9],[-5,18],[5,18],[9,9],[7,-16]],hull);poly([[0,-21],[-4,-10],[-3,1],[3,1],[4,-10]],'#59cae4','#8cefff');poly([[0,-17],[-2,-9],[-1,-1],[1,-1],[2,-9]],'#143b58','#3a8ca9');c.strokeStyle='#8df4ff';c.lineWidth=1.2;for(const s of [-1,1]){c.beginPath();c.moveTo(s*16,3);c.lineTo(s*24,15);c.stroke();}c.fillStyle='#a6e7f4';c.fillRect(-1,-30,2,6);c.restore();}
}