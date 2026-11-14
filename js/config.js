// Playtest tuning: world units, seconds, HP. No external assets or libraries.
const CONFIG={
 world:{width:4800,height:3600},
 xp:level=>Math.round(18+8*(level-1)+1.2*(level-1)**1.5),
 heal:{base:15,minimum:7},
 wave:{maxThreats:28},
 roles:[{type:'raider',wave:1},{type:'sniper',wave:2},{type:'rammer',wave:3},{type:'interceptor',wave:4},{type:'miner',wave:5}],
 enemies:{
  raider:{hp:7,r:18,speed:150,color:'#ff8971',shape:'gunner',score:180,range:310,interval:2.7,shotSpeed:310,burst:3},
  sniper:{hp:9,r:19,speed:125,color:'#fda4ff',shape:'sniper',score:260,range:620,interval:3.8,warning:1.3,shotSpeed:1000,damage:2},
  rammer:{hp:26,r:30,speed:110,color:'#ffad58',shape:'tank',score:350,interval:4.5,warning:1.1,dash:.7,dashSpeed:620,damage:2},
  interceptor:{hp:5,r:14,speed:280,color:'#ff747e',shape:'scout',score:200,range:210,interval:3,shotSpeed:370,burst:2},
  miner:{hp:12,r:23,speed:135,color:'#a9ed79',shape:'miner',score:280,range:340,interval:3.5,maxMines:5},
  mine:{hp:2,r:12,speed:0,color:'#ffcb66',shape:'mine',score:20,arm:1.5,life:18}
 }
};
function drawSector(c,g){
 const {width,height}=CONFIG.world;
 c.strokeStyle='#4e9aba66';c.lineWidth=5;c.strokeRect(18,18,width-36,height-36);
 c.fillStyle='#80c2da';c.font='14px monospace';
 for(let x=400;x<width;x+=800)for(let y=400;y<height;y+=800){
  c.globalAlpha=.25;c.fillText('SECTOR '+Math.floor(x/800)+':'+Math.floor(y/800),x,y);
  c.strokeStyle='#589bb4';c.lineWidth=1;c.beginPath();c.moveTo(x-18,y+22);c.lineTo(x+18,y+22);c.moveTo(x,y+4);c.lineTo(x,y+40);c.stroke();
 }
 c.globalAlpha=1;
 // Fixed procedural nebulae and wreckage provide landmarks without downloaded art.
 for(const [x,y,r,color] of [[700,650,500,'#17485b'],[2900,1000,650,'#29274c'],[3800,2800,500,'#174344']]){
  const gradient=c.createRadialGradient(x,y,0,x,y,r);gradient.addColorStop(0,color+'66');gradient.addColorStop(1,color+'00');c.fillStyle=gradient;c.fillRect(x-r,y-r,r*2,r*2);
 }
 for(let i=0;i<80;i++){
  const x=(i*997+231)%width,y=(i*613+321)%height;
  c.fillStyle='#607c9055';c.save();c.translate(x,y);c.rotate(i*1.7);c.fillRect(-9,-2,18,4);c.fillRect(-3,-7,4,14);c.restore();
 }
}
