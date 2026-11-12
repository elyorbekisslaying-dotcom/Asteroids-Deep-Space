class Bullet{
 constructor(p){this.x=p.x+Math.cos(p.angle)*29;this.y=p.y+Math.sin(p.angle)*29;this.px=this.x;this.py=this.y;this.vx=Math.cos(p.angle)*690+p.vx*.4;this.vy=Math.sin(p.angle)*690+p.vy*.4;this.life=1.25;}
 update(dt){this.px=this.x;this.py=this.y;this.x+=this.vx*dt;this.y+=this.vy*dt;this.life-=dt;}
 draw(c){c.strokeStyle='#79f6ff';c.lineWidth=2;c.shadowColor='#37dcff';c.shadowBlur=12;c.beginPath();c.moveTo(this.x,this.y);c.lineTo(this.x-this.vx*.018,this.y-this.vy*.018);c.stroke();c.shadowBlur=0;}
}
function segmentHit(b,a){const dx=b.x-b.px,dy=b.y-b.py,t=Math.max(0,Math.min(1,((a.x-b.px)*dx+(a.y-b.py)*dy)/(dx*dx+dy*dy||1)));return Math.hypot(b.px+t*dx-a.x,b.py+t*dy-a.y)<a.r*.85+3;}