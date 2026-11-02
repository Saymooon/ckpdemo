(function(){
const LayoutScene=window.FlowScene;
class Overview extends LayoutScene {
 constructor(c){super(c);this.detail=false;this.yaw=-.08;}
 view(type){if(type==='layout'||type==='flow'){this.detail=type==='layout';this.draw();return}super.view(type);}
 draw(){if(this.detail){super.draw();return}const cvs=this.canvas,ctx=this.ctx,r=cvs.getBoundingClientRect();if(!r.width)return;const dpr=Math.min(devicePixelRatio||1,2);if(cvs.width!==Math.round(r.width*dpr)||cvs.height!==Math.round(r.height*dpr)){cvs.width=Math.round(r.width*dpr);cvs.height=Math.round(r.height*dpr)}ctx.setTransform(dpr,0,0,dpr,0,0);this.w=r.width;this.h=r.height;this.scale=Math.min(r.width/1100,r.height/760)*this.zoom;ctx.clearRect(0,0,r.width,r.height);
 const nodes=[{x:-310,label:'INJECTION',sub:'40 MACHINES',n:40},{x:-85,label:'AGING / TRANSFER',sub:'',n:0},{x:140,label:'WASH / UV',sub:'8 UV MACHINES',n:8},{x:365,label:'SHIP PREP',sub:'',n:0}];
 this.box(0,0,-10,1080,185,9,'#dce7d4');this.box(-475,0,0,85,65,5,'#d9cfb7');this.text('MATERIAL READY',-475,-75,0,9);for(let i=0;i<3;i++)this.box(-495+i*20,0,6,13,20,10,'#c5b997');
 for(let i=0;i<3;i++){const a=nodes[i],b=nodes[i+1],p=this.project(a.x+65,0,12),q=this.project(b.x-65,0,12);ctx.beginPath();ctx.moveTo(...p);ctx.lineTo(...q);ctx.strokeStyle='#8fa58d';ctx.lineWidth=4;ctx.stroke();const v=this.project((a.x+b.x)/2,0,12);ctx.fillStyle='#537b59';ctx.font='22px Segoe UI';ctx.fillText('›',...v);}
 for(const [index,n] of nodes.entries()){this.box(n.x,0,0,140,80,index===1?8:35,index===1?'#c3d0b8':n.n?'#9bb293':'#c9bb97');if(n.n){const cols=Math.min(n.n,10);for(let i=0;i<n.n;i++)this.box(n.x-50+(i%cols)*100/(cols-1),-27+Math.floor(i/cols)*14,37,7,7,5,'#eef1e7');}this.text(n.label,n.x,-75,25,11,'#334e40');this.text(n.sub,n.x,70,0,10);if(index===1)this.text(this.result?this.result.config.waitHours+' h':'',n.x,70,0,10);}
 if(!this.result)return;const snap=FlowModel.snapshot(this.result,this.time);this.text('INPUT',-475,70,0,10);this.text('COMPLETE '+Math.round(snap.sums.done).toLocaleString(),365,115,0,11);const counts={};
 for(const l of this.result.lots){const st=FlowModel.state(l,this.time);if(st==='unreleased')continue;const n=counts[st]||0;counts[st]=n+1;if(n>=16)continue;let x=0,y=0,z=45;
 if(st==='injection'||st==='uv'||st==='pack'){const k=st==='injection'?0:st==='uv'?1:2;const node=nodes[[0,2,3][k]];x=node.x-52+104*this.progress(l.stages[k],this.time);y=(n%4-1.5)*12;z+=Math.floor(n/4)*12;}
 else if(st==='buffer'){const f=Math.max(0,Math.min(1,(this.time-l.stages[0].end)/(l.ready-l.stages[0].end||1)));x=nodes[0].x+75+(nodes[2].x-nodes[0].x-150)*f;y=(n%4-1.5)*9;z=28;}
 else {const k=st==='injectionQueue'?0:st==='uvQueue'?2:3;x=nodes[k].x+(st==='done'?75:-100)+(n%3)*10;y=15+Math.floor(n/3)*10;z=8;}
 this.box(x,y,z,14,14,12,FlowColors[(this.result.plan[l.order].colorIndex??l.order)%FlowColors.length]);
 }
 }
}
window.FlowScene=Overview;
})();
