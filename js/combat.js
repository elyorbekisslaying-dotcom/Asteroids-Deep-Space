const droneTypes = {
  gunner: { name: 'Gunner', color: '#79f6ff', description: 'Fires steady bursts at nearby targets.', speed: 5, interval: .75, damage: 1 },
  scout: { name: 'Scout', color: '#c2ff93', description: 'Fast escort with rapid light fire.', speed: 8, interval: .36, damage: 1 },
  tank: { name: 'Tank', color: '#ffcf8c', description: 'Slow escort with a heavy cannon. Intercepts hostile shots.', speed: 2.8, interval: 1.35, damage: 3 },
  support: { name: 'Support', color: '#eea3ff', description: 'Repairs one hull segment every 15 seconds while damaged.', speed: 5, interval: 15 }
};

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function closest(origin, targets, range = Infinity) {
  let nearest;
  for (const target of targets) {
    const gap = distance(origin, target);
    if (gap < range) {
      nearest = target;
      range = gap;
    }
  }
  return nearest;
}

function bearing(from, to) {
  return Math.atan2(to.y - from.y, to.x - from.x);
}

function shipSilhouette(c, ship, color, shape) {
  c.save();
  c.translate(ship.x, ship.y);
  c.rotate(ship.angle);
  c.scale(ship.r, ship.r);
  c.shadowBlur = 0;
  c.shadowColor = color;
  c.strokeStyle = color;
  c.lineWidth = 1.4 / ship.r;
  c.fillStyle = ship.flash > 0 ? '#f4fbff' : '#142538';
  c.beginPath();
  shape.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y));
  c.closePath();
  c.fill();
  c.stroke();
  c.fillStyle = color;
  c.fillRect(-.48, -.09, .8, .18);
  c.restore();
}

const shipShapes = {
  gunner: [[1,0],[-.7,-.9],[-.4,0],[-.7,.9]],
  scout: [[1.4,0],[-.9,-.48],[-.45,0],[-.9,.48]],
  tank: [[.9,-.35],[.4,-.85],[-.75,-.85],[-1,0],[-.75,.85],[.4,.85],[.9,.35]],
  support: [[.95,0],[.45,-.28],[0,-.9],[-.75,-.48],[-.75,.48],[0,.9],[.45,.28]],
  carrier: [[.95,0],[.72,-.6],[-.18,-.65],[-.82,-1],[-.95,-.35],[-.56,0],[-.95,.35],[-.82,1],[-.18,.65],[.72,.6]]
};

class Drone {
  constructor(type, player) {
    this.type = type;
    this.x = player.x;
    this.y = player.y;
    this.angle = player.angle;
    this.r = type === 'tank' ? 15 : 11;
    this.timer = type === 'support' ? droneTypes[type].interval : 0;
    this.shield = 0;
  }

  update(dt, game, targets, slot) {
    const spec = droneTypes[this.type];
    const player = game.player;
    // Sunflower formation expands indefinitely, independent of ship facing.
    const direction=slot*2.3999632297,offset=65+Math.sqrt(slot)*32;
    const follow=1-Math.exp(-spec.speed*dt),oldX=this.x,oldY=this.y;
    const padding=Math.min(1500,85+Math.sqrt(game.drones.length)*32);
    const cx=Math.max(padding,Math.min(CONFIG.world.width-padding,player.x));
    const cy=Math.max(padding,Math.min(CONFIG.world.height-padding,player.y));
    this.x+=(cx+Math.cos(direction)*offset-this.x)*follow;
    this.y+=(cy+Math.sin(direction)*offset-this.y)*follow;
    this.vx=(this.x-oldX)/Math.max(dt,.001);this.vy=(this.y-oldY)/Math.max(dt,.001);
    this.shield=Math.max(0,this.shield-dt);
    if(this.type==='support'){this.angle=player.angle;return;}
    this.search=(this.search??(slot%11)*.025)-dt;
    if(this.search<=0){this.target=closest(this,targets.filter(t=>t.hp>0),700);this.search=.25;}
    const target=this.target;
    if(!target||target.hp<=0||distance(this,target)>800){this.target=null;return;}
    this.angle=target instanceof Asteroid?interceptAngle(this,target,690,1.25,this.r):bearing(this,target);
    this.timer-=dt;
    if(this.timer<=0){
      game.bullets.push(new Bullet(this,{damage:spec.damage+game.build.droneDamage,color:spec.color,offset:this.r}));
      this.timer=spec.interval*game.build.droneInterval;
    }
  }

  draw(c) {
    shipSilhouette(c, this, droneTypes[this.type].color, shipShapes[this.type]);
  }
}

// Solve |relativePosition + relativeVelocity*t| = muzzleOffset + speed*t.
function interceptAngle(origin,target,speed,life,offset=0){
 const px=target.x-origin.x,py=target.y-origin.y;
 const vx=target.vx-(origin.vx||0)*.4,vy=target.vy-(origin.vy||0)*.4;
 const a=vx*vx+vy*vy-speed*speed,b=2*(px*vx+py*vy-speed*offset),c=px*px+py*py-offset*offset;
 let roots=[];
 if(Math.abs(a)<1e-8){if(Math.abs(b)>1e-8)roots=[-c/b];}
 else {const d=b*b-4*a*c;if(d>=0)roots=[(-b-Math.sqrt(d))/(2*a),(-b+Math.sqrt(d))/(2*a)];}
 const t=roots.filter(t=>t>0&&t<=life).sort((a,b)=>a-b)[0];
 return t===undefined?bearing(origin,target):Math.atan2(py+vy*t,px+vx*t);
}
Object.assign(shipShapes,{
 sniper:[[1.6,0],[-.8,-.6],[-.25,0],[-.8,.6]],
 miner:[[1,0],[.5,-.9],[-.65,-.9],[-1,0],[-.65,.9],[.5,.9]],
 mine:[[1,0],[.35,-.35],[0,-1],[-.35,-.35],[-1,0],[-.35,.35],[0,1],[.35,.35]]
});
const enemyTypes=CONFIG.enemies;
class Enemy{
 constructor(type,x,y,wave=1){
  this.type=type;this.spec=enemyTypes[type];this.x=x;this.y=y;this.r=this.spec.r;
  this.hp=this.spec.hp+(type==='mine'?0:Math.floor((wave-1)*.65));this.maxHp=this.hp;
  this.score=this.spec.score;this.angle=0;this.flash=0;this.timer=rand(.8,2);this.charge=0;this.age=0;this.burst=0;this.burstTimer=0;this.dash=0;this.recovery=0;
 }
 move(dt,angle,speed){this.vx=Math.cos(angle)*speed;this.vy=Math.sin(angle)*speed;this.x+=this.vx*dt;this.y+=this.vy*dt;}
 update(dt,g){
  const s=this.spec,p=g.player,gap=distance(this,p),aim=bearing(this,p);
  this.vx=0;this.vy=0;this.age+=dt;this.timer-=dt;this.flash=Math.max(0,this.flash-dt);
  if(this.type==='mine'){
   if(this.age>s.life){this.hp=0;return;}
   if(this.age>s.arm&&gap<65){g.damage(this);this.hp=0;g.particles.emit(this.x,this.y,25,s.color,160);}
   return;
  }
  if(this.burst>0){this.burstTimer-=dt;if(this.burstTimer<=0){g.enemyShot(this,aim,s.shotSpeed);this.burst--;this.burstTimer=.16;g.sound.play(this.type);}}
  if(this.type==='sniper'){
   if(this.charge>0){this.charge-=dt;if(this.charge<=0){g.enemyShot(this,this.angle,s.shotSpeed,s.color);g.sound.play('sniper');this.timer=s.interval;}}
   else {this.angle=aim;this.orbit(dt,aim,gap,s.range);if(this.timer<=0&&gap<1000){this.charge=s.warning;g.sound.play('warning');}}
  }else if(this.type==='rammer'){
   if(this.charge>0){this.charge-=dt;if(this.charge<=0){this.dash=s.dash;g.sound.play('rammer');}}
   else if(this.dash>0){this.dash-=dt;this.move(dt,this.angle,s.dashSpeed);if(this.dash<=0){this.recovery=1.3;this.timer=s.interval;}}
   else if(this.recovery>0)this.recovery-=dt;
   else {this.angle=aim;this.move(dt,aim,s.speed);if(this.timer<=0&&gap<600){this.charge=s.warning;g.sound.play('warning');}}
  }else{
   this.angle=aim;
   const orbit=aim+(this.type==='interceptor'?(Math.sin(this.age*1.8)>0?1.4:-1.4):1.2);
   const retreat=this.type==='interceptor'&&this.timer>s.interval-1;
   this.move(dt,retreat?aim+2.3:gap>s.range*1.25?aim:gap<s.range*.7?aim+2.5:orbit,s.speed);
   if(this.timer<=0&&gap<750){
    if(this.type==='miner'){
     if(g.enemies.filter(e=>e.type==='mine'&&e.owner===this&&e.hp>0).length<s.maxMines&&g.enemies.filter(e=>e.type==='mine').length<24){const mine=new Enemy('mine',this.x,this.y);mine.owner=this;g.enemies.push(mine);g.sound.play('miner');}
    }else{this.burst=s.burst;this.burstTimer=0;}
    this.timer=s.interval;
   }
  }
  this.x=Math.max(this.r,Math.min(CONFIG.world.width-this.r,this.x));this.y=Math.max(this.r,Math.min(CONFIG.world.height-this.r,this.y));
 }
 orbit(dt,aim,gap,desired){this.move(dt,gap>desired*1.15?aim:gap<desired*.85?aim+2.6:aim+1.5,this.spec.speed);}
 draw(c,g){
  if(this.type==='sniper'&&this.charge>0){c.save();c.strokeStyle=this.spec.color;c.lineWidth=this.charge<.3?3:1.5;c.setLineDash([14,8]);c.beginPath();c.moveTo(this.x,this.y);c.lineTo(this.x+Math.cos(this.angle)*1400,this.y+Math.sin(this.angle)*1400);c.stroke();c.restore();}
  if((this.type==='rammer'&&this.charge>0)||this.type==='mine'){
   c.strokeStyle=this.spec.color;c.lineWidth=2;c.beginPath();c.arc(this.x,this.y,this.type==='mine'? (this.age<this.spec.arm?18:28):this.r+10,0,TAU);c.stroke();
  }
  if(['raider','interceptor','miner'].includes(this.type)&&this.timer<.5){c.strokeStyle=this.spec.color;c.beginPath();c.arc(this.x,this.y,this.r+5,0,TAU);c.stroke();}
  shipSilhouette(c,this,this.spec.color,shipShapes[this.spec.shape]);
  if(this.hp<this.maxHp){c.fillStyle=this.spec.color;c.fillRect(this.x-this.r,this.y-this.r-9,this.r*2*this.hp/this.maxHp,3);}
 }
}
