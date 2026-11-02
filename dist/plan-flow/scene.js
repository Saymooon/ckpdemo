(function(){
const colors=['#a99bd3','#83b5a0','#d9a171','#8fa7c7','#d499ac','#72a6ab'];
class Scene{constructor(canvas){this.canvas=canvas;this.ctx=canvas.getContext('2d');this.yaw=-.22;this.top=false;this.zoom=1;this.time=0;this.drag=null;canvas.addEventListener('pointerdown',e=>{this.drag=e.clientX;canvas.setPointerCapture(e.pointerId)});canvas.addEventListener('pointermove',e=>{if(this.drag!==null){this.yaw+=(e.clientX-this.drag)*.005;this.drag=e.clientX;this.draw()}});canvas.addEventListener('pointerup',()=>this.drag=null);canvas.addEventListener('pointercancel',()=>this.drag=null);canvas.addEventListener('wheel',e=>{e.preventDefault();this.zoom=Math.max(.6,Math.min(1.65,this.zoom-e.deltaY*.001));this.draw()},{passive:false});new ResizeObserver(()=>this.draw()).observe(canvas)}
set(result,t){this.result=result;this.time=t;this.draw()}
view(type){this.top=type==='top';if(type==='reset'){this.yaw=-.22;this.zoom=1;this.top=false}this.draw()}
project(x,y,z){const c=Math.cos(this.yaw),s=Math.sin(this.yaw),xx=x*c-y*s,yy=x*s+y*c;return[this.w*.51+xx*this.scale,this.h*(this.top?.49:.52)+(yy*(this.top?.95:.48)-z*(this.top?.15:.90))*this.scale]}
poly(points,fill,stroke){const ctx=this.ctx;ctx.beginPath();points.forEach((p,i)=>{let v=this.project(...p);i?ctx.lineTo(...v):ctx.moveTo(...v)});ctx.closePath();ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=.7;ctx.stroke()}}
shade(c,n){const rgb=c.match(/\w\w/g).map(x=>parseInt(x,16));return '#'+rgb.map(x=>Math.max(0,Math.min(255,Math.round(x+n))).toString(16).padStart(2,'0')).join('')}
box(x,y,z,w,d,h,color){const a=[x-w/2,y-d/2,z],b=[x+w/2,y-d/2,z],c=[x+w/2,y+d/2,z],d0=[x-w/2,y+d/2,z];let top=[a,b,c,d0].map(p=>[p[0],p[1],z+h]);this.poly([b,c,top[2],top[1]],this.shade(color,-22),'#36504120');this.poly([c,d0,top[3],top[2]],this.shade(color,-8),'#36504120');this.poly(top,this.shade(color,13),'#36504120')}
text(txt,x,y,z,size=13,color='#5c7064'){const p=this.project(x,y,z);this.ctx.fillStyle=color;this.ctx.font=`${size+2}px Segoe UI`;this.ctx.textAlign='center';this.ctx.fillText(txt,...p)}
progress(stage,t){let spent=0,total=0;for(const[a,b]of stage.segments){total+=b-a;spent+=Math.max(0,Math.min(t,b)-a)}return total?Math.max(0,Math.min(1,spent/total)):0}
draw(){const cvs=this.canvas,ctx=this.ctx,r=cvs.getBoundingClientRect();if(!r.width)return;const dpr=Math.min(devicePixelRatio||1,2);if(cvs.width!==Math.round(r.width*dpr)||cvs.height!==Math.round(r.height*dpr)){cvs.width=Math.round(r.width*dpr);cvs.height=Math.round(r.height*dpr)}ctx.setTransform(dpr,0,0,dpr,0,0);this.w=r.width;this.h=r.height;this.scale=Math.min(r.width/1120,r.height/(this.top?1200:780))*this.zoom;ctx.clearRect(0,0,this.w,this.h);
const L=FlowLayout;this.box(0,0,-12,980,540,12,'#d9e2d3');
// Rotated building A: two equipment banks and the central UV aisle.
this.box(0,0,0,940,22,1,'#eef0de');
for(const zone of L.zones){this.box(zone.x,zone.y,0,zone.w,zone.d,1,zone.id%2?'#e4eadd':'#d7e2d3');for(const offset of [-18,18])this.box(zone.x+offset,zone.y,2,8,170,5,'#bccbb9');this.text('ZONE '+zone.id,zone.x,zone.y>0?252:-255,0,11,'#687f64');}
const ipBusy=new Map(),uvBusy=new Map();if(this.result)for(const l of this.result.lots){const st=FlowModel.state(l,this.time);if(st==='injection')ipBusy.set(l.stages[0].machine,l);if(st==='uv')uvBusy.set(l.stages[1].machine,l);}
const lotColor=l=>colors[(this.result.plan[l.order].colorIndex??l.order)%colors.length];
const changing=new Set((this.result?.setupEvents||[]).filter(e=>e.start<=this.time&&this.time<e.end).map(e=>e.machine));
const machines=[...L.injection.map((m,i)=>({...m,type:'IP',busy:ipBusy.get(i),changing:changing.has(i)})),...L.uv.map((m,i)=>({...m,type:'UV',busy:uvBusy.get(i)}))].sort((a,b)=>(a.x*Math.sin(this.yaw)+a.y*Math.cos(this.yaw))-(b.x*Math.sin(this.yaw)+b.y*Math.cos(this.yaw)));
for(const m of machines){const color=m.changing?'#e7b24f':m.busy?lotColor(m.busy):(m.type==='IP'?'#a8bba3':'#b6adcb');if(m.type==='IP'){this.box(m.x,m.y,1,38,49,7,'#a6b29e');this.box(m.x,m.y-12,8,33,19,25,color);this.box(m.x,m.y+14,8,33,15,17,color);this.box(m.x,m.y,17,25,13,7,'#738471');}else{this.box(m.x,m.y,2,91,18,19,color);this.box(m.x,m.y,22,80,14,3,color);}this.text(m.type==='IP'?String(m.number).padStart(2,'0'):'UV '+m.number,m.x,m.y,m.type==='IP'?41:34,10,m.busy?'#293c31':'#61705f');}
// Market and finishing are a logical output area, not an invented counted machine.
this.box(300,153,0,165,180,2,'#e8dfc8');this.text('MARKET',300,130,4,13,'#776d53');this.text('검사 / 출하 준비',300,165,4,11,'#776d53');
if(!this.result)return;
const counters={};const items=[];
for(const l of this.result.lots){const st=FlowModel.state(l,this.time);if(st==='unreleased')continue;const n=counters[st]||0;counters[st]=n+1;if(n>=(st==='injection'?40:st==='uv'?8:24))continue;let x,y,z=10;
if(st==='injectionQueue'){x=-455+(n%3)*10;y=-90+Math.floor(n/3)*11;}
if(st==='injection'){const m=L.injection[l.stages[0].machine],f=this.progress(l.stages[0],this.time);x=m.x;y=m.y-20+40*f;z=35;}
if(st==='uv'){const m=L.uv[l.stages[1].machine],f=this.progress(l.stages[1],this.time);x=m.x-38+76*f;y=m.y;z=29;}
if(st==='buffer'){
 const a=L.injection[l.stages[0].machine],b=L.uv[l.stages[1].machine];
 const f=Math.max(0,Math.min(1,(this.time-l.stages[0].end)/(l.ready-l.stages[0].end||1)));
 // Visual route during the existing wait interval, not distance-calibrated transport.
 const path=[[a.x,a.y,35],[a.x,0,16],[b.x-55,0,16],[b.x-55,b.y,16]];
 const lengths=path.slice(1).map((q,i)=>Math.hypot(q[0]-path[i][0],q[1]-path[i][1],q[2]-path[i][2]));let d=f*lengths.reduce((a,b)=>a+b,0),k=0;
 while(k<lengths.length-1&&d>lengths[k])d-=lengths[k++];const u=lengths[k]?d/lengths[k]:0;[x,y,z]=path[k].map((v,j)=>v+(path[k+1][j]-v)*u);
 ctx.beginPath();path.forEach((q,i)=>{const v=this.project(...q);i?ctx.lineTo(...v):ctx.moveTo(...v)});ctx.strokeStyle=lotColor(l)+'70';ctx.lineWidth=1.5;ctx.setLineDash([4,5]);ctx.stroke();ctx.setLineDash([]);
}
if(st==='uvQueue'){const m=L.uv[l.stages[1].machine];x=m.x-55;y=m.y+(n%3-1)*7;}
if(st==='packQueue'){x=230+(n%4)*11;y=80+Math.floor(n/4)*10;}
if(st==='pack'){const f=this.progress(l.stages[2],this.time);x=300;y=90+110*f;z=13;}
if(st==='done'){x=270+(n%5)*12;y=200+Math.floor(n/5)*11;}
items.push({x,y,z,c:lotColor(l),moving:['injection','buffer','uv','pack'].includes(st)});}
for(const q of items){if(q.moving){const v=this.project(q.x,q.y,q.z+8);ctx.beginPath();ctx.arc(v[0],v[1],8,0,Math.PI*2);ctx.fillStyle='#ffffffb0';ctx.fill();}this.box(q.x,q.y,q.z,q.moving?13:9,q.moving?13:9,q.moving?12:9,q.c);}
this.text('INPUT',-435,15,0,10);this.text('조립 공장으로 공급',300,268,0,11);

}}
window.FlowScene=Scene;window.FlowColors=colors;
})();
