'use strict';
const TAU=Math.PI*2, rand=(a,b)=>a+Math.random()*(b-a);
class Background{
 constructor(){this.stars=Array.from({length:260},()=>({x:Math.random(),y:Math.random(),r:rand(.4,1.6),z:rand(.15,1),phase:rand(0,TAU)}));this.time=0;this.ox=0;this.oy=0;}
 resize(w,h){this.w=w;this.h=h;this.nebula=document.createElement('canvas');this.nebula.width=w;this.nebula.height=h;const c=this.nebula.getContext('2d');c.fillStyle='#030914';c.fillRect(0,0,w,h);for(let i=0;i<17;i++){const x=rand(w*.25,w),y=h*.55-(x-w*.5)*.4+rand(-h*.3,h*.3),r=rand(w*.12,w*.4);const g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,i%3?'#0b537618':'#45397420');g.addColorStop(1,'#00000000');c.fillStyle=g;c.fillRect(0,0,w,h);}}
 update(dt,vx=6,vy=1){this.time+=dt;this.ox-=vx*dt*.035;this.oy-=vy*dt*.035;}
 draw(c){c.drawImage(this.nebula,0,0);for(const s of this.stars){const x=((s.x*this.w+this.ox*s.z)%this.w+this.w)%this.w,y=((s.y*this.h+this.oy*s.z)%this.h+this.h)%this.h;c.globalAlpha=.35+s.z*.45+Math.sin(this.time*.6+s.phase)*.12;c.fillStyle=s.z>.8?'#c7ebff':'#628eae';c.fillRect(x,y,s.r,s.r);if(s.z>.97){c.fillStyle='#6fcaff33';c.fillRect(x-4,y,9,1);c.fillRect(x,y-4,1,9);}}c.globalAlpha=1;}
}