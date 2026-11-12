class Particles{
 constructor(){this.items=[];}
 emit(x,y,n,color,speed=130){for(let i=0;i<n;i++){if(this.items.length>=450)this.items.shift();const a=rand(0,TAU),v=rand(speed*.15,speed);this.items.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:rand(.2,.8),max:.8,r:rand(1,3),color});}}
 exhaust(p,dt){this.emit(p.x-Math.cos(p.angle)*24,p.y-Math.sin(p.angle)*24,2,'#57dfff',30);const a=this.items;for(let i=Math.max(0,a.length-2);i<a.length;i++){a[i].vx-=Math.cos(p.angle)*110;a[i].vy-=Math.sin(p.angle)*110;a[i].life=.25;}}
 update(dt){for(const p of this.items){p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;}this.items=this.items.filter(p=>p.life>0);}
 draw(c){c.save();c.globalCompositeOperation='lighter';for(const p of this.items){c.globalAlpha=Math.min(1,p.life/p.max);c.fillStyle=p.color;c.fillRect(p.x,p.y,p.r,p.r);}c.restore();}
}