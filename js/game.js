const defaultBindings = Object.freeze({ up: 'KeyW', left: 'KeyA', down: 'KeyS', right: 'KeyD', fire: 'Mouse0', gadget: 'KeyE' });

function readSave(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
}

function writeSave(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); }
  catch { /* The current session still works without storage. */ }
}

const shipRewards = [
  { name: 'Hull Plating', description: '+1 maximum hull and repair 1 segment.', available: g => g.maxHealth < 12,
    apply: g => { g.maxHealth++; g.repair(1); } },
  { name: 'Ion Thrusters', description: '+55 thrust and +35 maximum speed.', available: g => g.build.speed < 525,
    apply: g => { g.build.acceleration += 55; g.build.speed += 35; } },
  { name: 'Rapid Fire', description: '15% shorter time between primary shots.', available: g => g.build.fireInterval > .075,
    apply: g => { g.build.fireInterval *= .85; } },
  { name: 'Heavy Rounds', description: '+1 damage per primary shot.', available: g => g.build.damage < 6,
    apply: g => { g.build.damage++; } }
];

const gadgetRewards = [
  { name: 'Missile Rack', description: 'Launch 2 additional homing missiles per salvo.', available: g => g.build.missiles < 9,
    apply: g => { g.build.missiles += 2; } },
  { name: 'Quick Reload', description: '20% shorter missile cooldown.', available: g => g.build.gadgetInterval > 3,
    apply: g => { g.build.gadgetInterval *= .8; } },
  { name: 'Seeker Warheads', description: '+1 damage per homing missile.', available: g => g.build.missileDamage < 6,
    apply: g => { g.build.missileDamage++; } }
];

const droneRewards = [
  ...Object.entries(droneTypes).map(([type, spec]) => ({
    name: spec.name + ' Drone',
    description: spec.description,
    available: () => true,
    apply: g => g.drones.push(new Drone(type, g.player))
  })),
  { name: 'Drone Targeting', description: '+1 damage per attack from combat drones.', available: g => g.drones.some(d => d.type !== 'support') && g.build.droneDamage < 4,
    apply: g => { g.build.droneDamage++; } },
  { name: 'Drone Overclock', description: '20% shorter drone firing and repair intervals.', available: g => g.drones.length > 0 && g.build.droneInterval > .45,
    apply: g => { g.build.droneInterval *= .8; } }
];

function takeRandom(items) {
  return items.splice(Math.floor(Math.random() * items.length), 1)[0];
}

class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.c = canvas.getContext('2d', { alpha: false });
    this.keys = new Set();
    const saved=readSave('deepSpaceBindings', {});
    this.bindings={...defaultBindings};
    for(const action of Object.keys(defaultBindings))if(typeof saved[action]==='string')this.bindings[action]=saved[action];
    // Legacy thrust is intentionally discarded; preserve compatible weapon bindings.
    if(!saved.up){for(const action of ['fire','gadget'])if(['KeyW','KeyA','KeyS','KeyD'].includes(this.bindings[action]))this.bindings[action]=defaultBindings[action];}
    writeSave('deepSpaceBindings',this.bindings);
    this.camera={x:0,y:0};this.healTimer=0;
    this.tutorialComplete = readSave('deepSpaceTutorialComplete', false) === true;
    this.best = Math.max(0, Number(readSave('deepSpaceBest', 0)) || 0);
    this.score = 0;
    this.health = this.maxHealth = 5;
    this.wave = 1;
    this.level = 1;
    this.xp = 0;
    this.goal = CONFIG.xp(1);
    this.time = 0;
    this.shake = 0;
    this.gadgetCooldown = 0;
    this.background = new Background();
    this.particles = new Particles();
    this.asteroids = [];
    this.enemies = [];
    this.drones = [];
    this.bullets = [];
    this.hostile = [];
    this.sound = new Sound();
    this.resize();
    this.player = new Player(CONFIG.world.width, CONFIG.world.height);
    this.updateCamera(1,true);this.healTimer=0;
    this.ui = new UI(this);
    this.menu();
  }

  resize() {
    this.w=innerWidth;this.h=innerHeight;
    const dpr=Math.min(devicePixelRatio||1,1.5);
    this.canvas.width=Math.round(this.w*dpr);this.canvas.height=Math.round(this.h*dpr);
    this.c.setTransform(dpr,0,0,dpr,0,0);this.background.resize(this.w,this.h);
    if(this.player)this.updateCamera(1,true);
  }

  worldPointer(){return this.pointer ? {x:this.pointer.x+this.camera.x,y:this.pointer.y+this.camera.y}:null;}
  updateCamera(dt,snap=false){
    const target={x:Math.max(0,Math.min(CONFIG.world.width-this.w,this.player.x-this.w/2)),y:Math.max(0,Math.min(CONFIG.world.height-this.h,this.player.y-this.h/2))};
    const t=snap?1:1-Math.exp(-9*dt);
    this.camera.x+=(target.x-this.camera.x)*t;this.camera.y+=(target.y-this.camera.y)*t;
  }

  menu() {
    this.state = 'menu';
    this.keys.clear();
    this.sound.setEngine(false);
    this.asteroids = Array.from({ length: 8 }, () =>
      new Asteroid(rand(this.w * .45, this.w), rand(0, this.h), Math.random() < .6 ? 1 : 2));
    this.bullets = [];
    this.hostile = [];
    this.enemies = [];
    this.drones = [];
    this.particles.items = [];
    this.announce('');
    this.ui.show();
  }

  start(mode) {
    if (mode === 'endless' && !this.tutorialComplete) return;
    this.mode = mode;
    this.state = 'playing';
    this.sound.init();
    this.sound.play('ui');
    this.score = 0;
    this.health = this.maxHealth = 5;
    this.wave = 1;
    this.level = 1;
    this.xp = 0;
    this.goal = mode === 'tutorial' ? 1 : CONFIG.xp(1);
    this.gadgetCooldown = 0;
    this.build = { acceleration: 780, speed: 350, damage: 1, fireInterval: .15,
      gadgetInterval: 9, missiles: 3, missileDamage: 2, droneDamage: 0, droneInterval: 1 };
    this.spawnTimer = 0;
    this.spawned = 0;
    this.quota = 5;
    this.intermission = 0;
    this.shake = 0;
    this.player = new Player(CONFIG.world.width, CONFIG.world.height);
    this.updateCamera(1,true);this.healTimer=0;
    this.bullets = [];
    this.hostile = [];
    this.asteroids = [];
    this.enemies = [];
    this.drones = [];
    this.particles.items = [];
    this.keys.clear();
    this.tutorialStep = 'thrust';
    this.thrustTime = 0;
    this.announce(mode === 'tutorial' ? '' : 'WAVE 01 / ENTER THE VOID');
    this.ui.show();
  }

  pause() {
    if (!['playing', 'paused'].includes(this.state)) return;
    this.state = this.state === 'playing' ? 'paused' : 'playing';
    this.keys.clear();
    this.sound.setEngine(false);
    this.ui.show();
  }

  announce(message) {
    this.announceTimer = 2.5;
    el('announcement').textContent = message;
  }

  edgePoint(margin) {
    const candidates=[];
    for(let i=0;i<80;i++){
      const side=i%4,c=this.camera;
      const point={x:side===0?c.x-margin:side===1?c.x+this.w+margin:rand(c.x,c.x+this.w),y:side===2?c.y-margin:side===3?c.y+this.h+margin:rand(c.y,c.y+this.h)};
      if(point.x>=60&&point.x<=CONFIG.world.width-60&&point.y>=60&&point.y<=CONFIG.world.height-60&&distance(point,this.player)>450)candidates.push(point);
    }
    if(candidates.length)return candidates[Math.floor(Math.random()*candidates.length)];
    return {x:this.player.x<CONFIG.world.width/2?CONFIG.world.width-80:80,y:this.player.y<CONFIG.world.height/2?CONFIG.world.height-80:80};
  }

  spawn(){
    const {x,y}=this.edgePoint(90);
    if(this.spawned%4===3){
      const rock=new Asteroid(x,y,2,this.wave),angle=bearing(rock,this.player),speed=Math.hypot(rock.vx,rock.vy);
      rock.vx=Math.cos(angle)*speed;rock.vy=Math.sin(angle)*speed;this.asteroids.push(rock);
    }else{
      const roles=CONFIG.roles.filter(role=>this.wave>=role.wave);
      const type=roles[(this.spawned+this.wave-1)%roles.length].type;
      this.enemies.push(new Enemy(type,x,y,this.wave));
    }
    this.spawned++;
  }

  destroy(target) {
    const asteroid = target instanceof Asteroid;
    const list = asteroid ? this.asteroids : this.enemies;
    const index = list.indexOf(target);
    if (index < 0) return;
    list.splice(index, 1);
    this.score += target.score;
    if (this.mode === 'endless' && this.score > this.best) {
      this.best = this.score;
      writeSave('deepSpaceBest', this.best);
    }
    this.xp += asteroid ? [1, 2, 3][target.size] : target.type==='mine'?0:5;
    const size = asteroid ? target.size : target.type === 'carrier' ? 4 : 1;
    this.particles.emit(target.x, target.y, 20 + size * 12, asteroid ? '#8ab4c7' : target.spec.color, 130 + size * 50);
    this.particles.emit(target.x, target.y, 9, '#66eaff', 220);
    this.shake = Math.max(this.shake, 2 + size * 1.7);
    this.sound.play('boom');
    if (asteroid && size > 0) {
      for (const sign of [-1, 1]) {
        const child = new Asteroid(target.x + sign * target.r * .3, target.y, size - 1, this.wave);
        child.vx += target.vx * .35;
        child.vy += target.vy * .35;
        this.asteroids.push(child);
      }
    }
    this.ui.update();
  }

  enemyShot(origin, angle, speed, color = '#ff685c') {
    this.hostile.push(new Bullet(origin, { angle, speed, color, offset: origin.r, life: 2.8, damage: origin.spec?.damage||1 }));
  }

  useGadget() {
    if (this.state !== 'playing' || this.gadgetCooldown > 0) return;
    if (this.mode === 'tutorial' && !['gadget', 'practice'].includes(this.tutorialStep)) return;
    const target = closest(this.player, [...this.enemies, ...this.asteroids]);
    const aim = target ? bearing(this.player, target) : this.player.angle;
    for (let i = 0; i < this.build.missiles; i++) {
      const offset = (i - (this.build.missiles - 1) / 2) * .20;
      this.bullets.push(new Bullet(this.player, {
        angle: aim + offset, homing: true, speed: 415, life: 3,
        damage: this.build.missileDamage, color: '#ffc26b'
      }));
    }
    this.gadgetCooldown = this.build.gadgetInterval;
    this.sound.play('laser');
    if (this.mode === 'tutorial') {
      this.tutorialStep = 'practice';
      this.ui.update();
    }
  }

  repair(amount) {
    this.health = Math.min(this.maxHealth, this.health + amount);
    this.ui.update();
  }

  damage(source) {
    if (this.player.invincible > 0) return;
    this.health=Math.max(0,this.health-(source.spec?.damage||source.damage||1));
    this.healTimer=0;
    this.player.invincible = 2;
    this.shake = 14;
    this.particles.emit(this.player.x, this.player.y, 45, '#6beaff', 240);
    this.sound.play('boom');
    if (source instanceof Asteroid) {
      this.player.vx -= source.vx * .8;
      this.player.vy -= source.vy * .8;
    }
    this.ui.update();
    if (this.health <= 0) this.finish('over');
  }

  finish(state) {
    this.state = state;
    this.sound.setEngine(false);
    this.keys.clear();
    this.announce('');
    if (state === 'complete') {
      this.tutorialComplete = true;
      writeSave('deepSpaceTutorialComplete', true);
    }
    this.ui.show();
  }

  offerReward() {
    this.state = 'reward';
    this.keys.clear();
    this.sound.setEngine(false);
    if (this.mode === 'tutorial') {
      this.rewards = droneRewards.slice(0, 4);
      this.rewards.splice(Math.floor(Math.random() * this.rewards.length), 1);
    } else {
      const pools = [shipRewards, gadgetRewards, droneRewards].map(pool => pool.filter(option => option.available(this)));
      this.rewards = pools.filter(pool => pool.length).map(takeRandom);
      const remainder = pools.flat();
      while (this.rewards.length < 3 && remainder.length) this.rewards.push(takeRandom(remainder));
      this.rewards = this.rewards.concat([
        { name: 'Hull Repair', description: 'Restore up to 3 hull segments.', apply: g => g.repair(3) },
        { name: 'Overcharge', description: 'Instantly reload the missile rack.', apply: g => { g.gadgetCooldown = 0; } },
        { name: 'Emergency Shield', description: 'Block incoming damage for 6 seconds.', apply: g => { g.player.invincible = 6; } }
      ]).slice(0, 3);
    }
    this.ui.show();
  }

  chooseReward(index) {
    const option = this.rewards?.[index];
    if (this.state !== 'reward' || !option) return;
    option.apply(this);
    this.rewards = [];
    this.xp -= this.goal;
    this.level++;
    this.goal = this.mode === 'tutorial' ? 5 : CONFIG.xp(this.level);
    this.state = 'playing';
    this.keys.clear();
    if (this.mode === 'tutorial') {
      this.tutorialStep = 'gadget';
      const target = new Enemy('raider', this.player.x+250, this.player.y-100, 1);
      target.entered = true;
      target.hp = target.maxHp = 6;
      target.angle = bearing(target, this.player);
      this.enemies.push(target);
    }
    this.ui.show();
  }

  updateTutorial(dt) {
    if (this.tutorialStep === 'thrust' && this.player.thrust) {
      this.thrustTime += dt;
      if (this.thrustTime >= .55) {
        this.tutorialStep = 'shoot';
        const x = this.player.x+180;
        const y = this.player.y-100;
        const rock = new Asteroid(x, y, 0);
        rock.vx = 0;
        rock.vy = 0;
        this.asteroids.push(rock);
        this.ui.update();
      }
    }
    if (this.tutorialStep === 'shoot' && this.xp >= this.goal) this.offerReward();
    if (this.tutorialStep === 'practice' && this.enemies.length === 0) this.finish('complete');
  }

  updateWaves(dt) {
    this.spawnTimer -= dt;
    if (this.spawned < this.quota && this.spawnTimer <= 0) {
      this.spawn();
      this.spawnTimer = Math.max(.85, 2 - this.wave * .09);
    }
    if (this.spawned < this.quota || this.asteroids.length || this.enemies.length) return;
    this.intermission += dt;
    if (this.intermission < 1.8) return;
    this.wave++;
    this.quota = Math.min(CONFIG.wave.maxThreats, 4 + this.wave*2);
    this.spawned = 0;
    this.spawnTimer = .7;
    this.intermission = 0;
    this.repair(1);
    this.announce('WAVE ' + String(this.wave).padStart(2, '0') + ' / HULL +1');
    this.sound.play('ui');
  }

  updateProjectiles(dt, targets) {
    const onScreen = b => b.life > 0 && b.x > -100 && b.x < CONFIG.world.width + 100 && b.y > -100 && b.y < CONFIG.world.height + 100;
    for (const bullet of this.bullets) {
      bullet.update(dt, targets);
      if (!onScreen(bullet)) continue;
      for (const target of targets) {
        if (target.hp <= 0 || !segmentHit(bullet, target)) continue;
        bullet.life = 0;
        target.hp -= bullet.damage;
        target.flash = .12;
        this.particles.emit(bullet.x, bullet.y, 5, bullet.color, 90);
        if (target.hp <= 0) this.destroy(target);
        else this.sound.play('hit');
        break;
      }
    }
    this.bullets = this.bullets.filter(onScreen);
    for (const bullet of this.hostile) {
      bullet.update(dt);
      if (!onScreen(bullet)) continue;
      const tank = this.drones.find(d => d.type === 'tank' && d.shield === 0 && segmentHit(bullet, d));
      if (tank) {
        tank.shield = .65;
        bullet.life = 0;
        this.particles.emit(tank.x, tank.y, 7, '#ffcf8c', 85);
      } else if (segmentHit(bullet, { x: this.player.x, y: this.player.y, r: 17 })) {
        bullet.life = 0;
        this.damage(bullet);
        if (this.state === 'over') break;
      }
    }
    this.hostile = this.hostile.filter(onScreen);
  }

  update(dt) {
    if (this.state === 'paused' || this.state === 'reward') return;
    this.time += dt;
    const playing = this.state === 'playing';
    this.background.update(dt, playing ? this.player.vx : 8, playing ? this.player.vy : 2);
    this.particles.update(dt);
    this.shake *= Math.exp(-10 * dt);
    if (this.state === 'menu') {
      for (const rock of this.asteroids) rock.update(dt * .2, this.w, this.h);
    }
    if (!playing) return;
    this.announceTimer -= dt;
    if (this.announceTimer <= 0 && el('announcement').textContent) el('announcement').textContent = '';
    this.gadgetCooldown = Math.max(0, this.gadgetCooldown - dt);
    this.player.update(dt, this);
    this.updateCamera(dt);
    this.background.ox=-this.camera.x*.3;this.background.oy=-this.camera.y*.3;
    this.sound.setEngine(this.player.thrust);
    for (const rock of this.asteroids){
      if(this.mode==='endless'&&distance(rock,this.player)>1100){const a=bearing(rock,this.player),speed=Math.max(100,Math.hypot(rock.vx,rock.vy)),t=1-Math.exp(-dt*.6);rock.vx+=(Math.cos(a)*speed-rock.vx)*t;rock.vy+=(Math.sin(a)*speed-rock.vy)*t;}
      rock.update(dt,CONFIG.world.width,CONFIG.world.height);
    }
    const waitingForMissiles = this.mode === 'tutorial' && this.tutorialStep === 'gadget';
    const targets = [...this.asteroids];
    if (!waitingForMissiles) {
      for (const enemy of [...this.enemies]) enemy.update(dt, this);
      this.enemies=this.enemies.filter(e=>e.hp>0);
      targets.unshift(...this.enemies);
    }
    this.drones.forEach((drone, slot) => drone.update(dt, this, targets, slot));
    const supports=this.drones.filter(d=>d.type==='support').length;
    const healInterval=Math.max(CONFIG.heal.minimum,CONFIG.heal.base/(1+Math.log2(Math.max(1,supports))*.45)*this.build.droneInterval);
    if(supports&&this.health<this.maxHealth){this.healTimer+=dt;if(this.healTimer>=healInterval){this.repair(1);this.healTimer=0;}}else this.healTimer=0;
    this.updateProjectiles(dt, targets);
    if (this.state !== 'playing') return;
    const collision = targets.find(target => target.hp > 0 && (target.type!=='mine'||target.age>=target.spec.arm) && distance(target, this.player) < target.r * .8 + 16);
    if (collision) this.damage(collision);
    if (this.state !== 'playing') return;
    if (this.mode === 'tutorial') this.updateTutorial(dt);
    else if (this.xp >= this.goal) this.offerReward();
    else this.updateWaves(dt);
    this.ui.updateCombat();
  }

  draw() {
    const c=this.c,flight=!['menu','settings'].includes(this.state);
    c.save();this.background.draw(c);
    if(flight){c.translate(-this.camera.x,-this.camera.y);drawSector(c,this);}
    const visible=e=>!flight||(e.x>this.camera.x-100&&e.x<this.camera.x+this.w+100&&e.y>this.camera.y-100&&e.y<this.camera.y+this.h+100);
    for(const rock of this.asteroids)if(visible(rock))rock.draw(c);
    for(const enemy of this.enemies)if(visible(enemy)||enemy.charge>0)enemy.draw(c,this);
    this.particles.draw(c);
    for(const bullet of [...this.bullets,...this.hostile])if(visible(bullet))bullet.draw(c);
    for(const drone of this.drones)if(visible(drone))drone.draw(c);
    if(flight&&this.state!=='over')this.player.draw(c,this.time);
    c.restore();
    if(!flight)this.drawMenuShip(c);
    if(this.state==='playing'&&this.pointer&&this.pointerOver){
      const {x,y}=this.pointer;c.save();c.translate(x,y);c.lineWidth=4;c.strokeStyle='#020811';
      const cross=()=>{c.beginPath();c.arc(0,0,7,0,TAU);for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){c.moveTo(dx*10,dy*10);c.lineTo(dx*15,dy*15);}c.stroke();};
      cross();c.lineWidth=1.5;c.strokeStyle='#a8fcff';cross();c.restore();
    }
  }

  drawMenuShip(c) {
    const x = this.w * .74;
    const y = this.h * .46;
    c.save();
    c.translate(x, y);
    c.strokeStyle = '#5daec016';
    for (const r of [130, 165, 200]) {
      c.beginPath();
      c.arc(0, 0, r, 0, TAU);
      c.stroke();
    }
    c.setLineDash([3, 12]);
    c.strokeStyle = '#6bcbdf33';
    c.beginPath();
    c.arc(0, 0, 180, -this.time * .03, TAU - this.time * .03);
    c.stroke();
    c.restore();
    const model = { x, y: y + Math.sin(this.time) * 8, angle: -Math.PI / 2 - .45, thrust: true, invincible: 0 };
    Player.prototype.draw.call(model, c, this.time, Math.min(3.8, this.w / 330), true);
  }
}
