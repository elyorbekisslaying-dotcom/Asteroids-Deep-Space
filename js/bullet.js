class Bullet {
  constructor(origin, { angle = origin.angle, speed = 690, damage = 1, color = '#79f6ff', offset = 29, life = 1.25, homing = false } = {}) {
    this.x = this.px = origin.x + Math.cos(angle) * offset;
    this.y = this.py = origin.y + Math.sin(angle) * offset;
    this.vx = Math.cos(angle) * speed + (origin.vx || 0) * .4;
    this.vy = Math.sin(angle) * speed + (origin.vy || 0) * .4;
    this.damage = damage;
    this.color = color;
    this.life = life;
    this.homing = homing;
    this.angle = angle;
    this.speed = speed;
  }

  update(dt, targets) {
    if (this.homing) {
      if (!targets.includes(this.target)) this.target = closest(this, targets);
      if (this.target) {
        const desired = bearing(this, this.target);
        const turn = Math.atan2(Math.sin(desired - this.angle), Math.cos(desired - this.angle));
        this.angle += Math.max(-9 * dt, Math.min(9 * dt, turn));
        this.vx = Math.cos(this.angle) * this.speed;
        this.vy = Math.sin(this.angle) * this.speed;
      }
    }
    this.px = this.x;
    this.py = this.y;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.life -= dt;
  }

  draw(c) {
    c.strokeStyle = this.color;
    c.lineWidth = this.homing ? 3 : 2;
    c.shadowColor = this.color;
    c.shadowBlur = 12;
    c.beginPath();
    c.moveTo(this.x, this.y);
    c.lineTo(this.x - this.vx * .018, this.y - this.vy * .018);
    c.stroke();
    c.shadowBlur = 0;
  }
}

function segmentHit(b, a) {
  const dx = b.x - b.px;
  const dy = b.y - b.py;
  const t = Math.max(0, Math.min(1, ((a.x - b.px) * dx + (a.y - b.py) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(b.px + t * dx - a.x, b.py + t * dy - a.y) < a.r * .85 + 3;
}
