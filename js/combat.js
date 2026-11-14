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
  c.shadowBlur = 14;
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
    const direction = player.angle + Math.PI + (slot % 2 ? 1 : -1) * (.58 + Math.floor(slot / 2) * .32);
    const offset = 66 + Math.floor(slot / 2) * 24;
    const follow = 1 - Math.exp(-spec.speed * dt);
    this.x += (player.x + Math.cos(direction) * offset - this.x) * follow;
    this.y += (player.y + Math.sin(direction) * offset - this.y) * follow;
    this.shield = Math.max(0, this.shield - dt);
    const target = closest(this, targets, 480);
    this.angle = target && this.type !== 'support' ? bearing(this, target) : player.angle;
    if (this.type === 'support' && game.health >= game.maxHealth) return;
    this.timer -= dt;
    if (this.timer > 0) return;
    if (this.type === 'support') {
      game.repair(1);
      game.particles.emit(this.x, this.y, 12, spec.color, 70);
    } else if (target) {
      game.bullets.push(new Bullet(this, { damage: spec.damage + game.build.droneDamage, color: spec.color, offset: this.r }));
    } else return;
    this.timer = spec.interval * game.build.droneInterval;
  }

  draw(c) {
    shipSilhouette(c, this, droneTypes[this.type].color, shipShapes[this.type]);
  }
}

const enemyTypes = {
  raider: { hp: 3, r: 17, speed: 119, color: '#ff8971', shape: 'gunner', score: 180 },
  sniper: { hp: 4, r: 16, speed: 95, color: '#fda4ff', shape: 'scout', score: 260 },
  rammer: { hp: 7, r: 25, speed: 103, color: '#ffad58', shape: 'tank', score: 300 },
  fighter: { hp: 2, r: 13, speed: 150, color: '#ff747e', shape: 'scout', score: 100 },
  medic: { hp: 3, r: 14, speed: 145, color: '#9bffa1', shape: 'support', score: 150 },
  carrier: { hp: 60, r: 49, speed: 57, color: '#ff4e83', shape: 'carrier', score: 2000 }
};

class Enemy {
  constructor(type, x, y, wave) {
    this.type = type;
    this.spec = enemyTypes[type];
    this.x = x;
    this.y = y;
    this.r = this.spec.r;
    this.hp = this.spec.hp + (type === 'carrier' ? Math.floor((wave - 5) / 5) * 20 : Math.min(6, Math.floor((wave - 1) / 4)));
    this.maxHp = this.hp;
    this.score = this.spec.score;
    this.angle = 0;
    this.flash = 0;
    this.timer = rand(.75, 1.4);
    this.spawnTimer = 1.6;
    this.charge = 0;
    this.entered = false;
  }

  move(dt, angle, speed) {
    this.x += Math.cos(angle) * speed * dt;
    this.y += Math.sin(angle) * speed * dt;
  }

  update(dt, game) {
    const player = game.player;
    this.flash = Math.max(0, this.flash - dt);
    if (!this.entered) {
      this.angle = bearing(this, { x: game.w / 2, y: game.h / 2 });
      this.move(dt, this.angle, Math.max(100, this.spec.speed));
      this.entered = this.x >= this.r && this.x <= game.w - this.r && this.y >= this.r && this.y <= game.h - this.r;
      return;
    }

    this.timer -= dt;
    this.spawnTimer -= dt;
    const carrier = this.type === 'medic' && game.enemies.find(enemy => enemy.type === 'carrier' && enemy.hp > 0);
    const target = carrier || player;
    const gap = distance(this, target);
    const aim = bearing(this, target);
    if (!this.charge) this.angle = aim;

    switch (this.type) {
      case 'sniper':
        if (this.charge > 0) {
          this.charge = Math.max(0, this.charge - dt);
          if (this.charge === 0) {
            game.enemyShot(this, this.angle, 1050, '#ff8af4');
            this.timer = 3.3;
          }
        } else if (this.timer <= 0 && gap < 900) {
          this.charge = 1.05;
        } else {
          this.orbit(dt, aim, gap, Math.min(440, game.w * .34));
        }
        break;
      case 'rammer':
        if (this.charge > 0) {
          this.charge = Math.max(0, this.charge - dt);
          if (this.charge < .6) this.move(dt, this.angle, 370);
        } else if (this.timer <= 0 && gap < 460) {
          this.charge = 1.14;
          this.timer = 3.1;
        } else this.move(dt, aim, this.spec.speed);
        break;
      case 'medic':
        if (!carrier) {
          this.orbit(dt, aim, gap, 190);
          if (this.timer <= 0 && gap < 580) {
            game.enemyShot(this, aim, 235);
            this.timer = 2.8;
          }
          break;
        }
        this.orbit(dt, aim, gap, 84);
        if (gap < 160 && this.timer <= 0) {
          carrier.hp = Math.min(carrier.maxHp, carrier.hp + 2);
          this.timer = 1.35;
        }
        break;
      case 'carrier':
        this.orbit(dt, aim, gap, Math.min(290, game.w * .30));
        if (this.timer <= 0) {
          for (const offset of [-.34, 0, .34]) game.enemyShot(this, aim + offset, 275);
          this.timer = this.hp < this.maxHp / 2 ? 1.25 : 1.9;
        }
        if (this.spawnTimer <= 0) {
          for (const type of ['medic', 'fighter']) {
            if (game.enemies.filter(enemy => enemy.type === type).length >= 2) continue;
            const escort = new Enemy(type, this.x + (type === 'medic' ? -45 : 45), this.y, game.wave);
            escort.entered = true;
            game.enemies.push(escort);
          }
          this.spawnTimer = 8;
        }
        break;
      default:
        this.orbit(dt, aim, gap, this.type === 'fighter' ? 150 : 240);
        if (this.timer <= 0 && gap < 620) {
          game.enemyShot(this, aim, this.type === 'fighter' ? 310 : 260);
          this.timer = this.type === 'fighter' ? 1.65 : 2.35;
        }
    }
    this.x = Math.max(this.r, Math.min(game.w - this.r, this.x));
    this.y = Math.max(this.r, Math.min(game.h - this.r, this.y));
  }

  orbit(dt, aim, gap, desired) {
    const direction = gap > desired * 1.18 ? aim : gap < desired * .78 ? aim + 2.45 : aim + 1.2;
    this.move(dt, direction, this.spec.speed);
  }

  draw(c, game) {
    if (this.charge > 0 && this.type === 'sniper') {
      c.save();
      c.strokeStyle = this.spec.color;
      c.globalAlpha = .48 + .52 * (1 - this.charge / 1.05);
      c.lineWidth = this.charge < .26 ? 3 : 1.5;
      c.setLineDash([12, 7]);
      c.beginPath();
      c.moveTo(this.x, this.y);
      const range = Math.hypot(game.w, game.h);
      c.lineTo(this.x + Math.cos(this.angle) * range, this.y + Math.sin(this.angle) * range);
      c.stroke();
      c.restore();
    }
    if (this.charge >= .6 && this.type === 'rammer') {
      c.strokeStyle = '#ffc264';
      c.beginPath();
      c.arc(this.x, this.y, this.r + 6 + this.charge * 7, 0, TAU);
      c.stroke();
    }
    shipSilhouette(c, this, this.spec.color, shipShapes[this.spec.shape]);
  }
}
