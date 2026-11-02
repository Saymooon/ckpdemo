(function(root){
'use strict';
const H=3600000,DAY=24*H,EPS=1e-7;
// Calendar is deliberately fixed to KST, independent of browser timezone.
function stamp(s){if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s))throw Error('날짜와 시간을 입력하세요.');const n=Date.parse(s+'+09:00');if(!Number.isFinite(n)||new Date(n+9*H).toISOString().slice(0,16)!==s)throw Error('유효한 날짜를 입력하세요.');return n;}
function dayStart(t){return Math.floor((t+9*H)/DAY)*DAY-9*H;}
function openAt(t,c){if(c.shiftHours===24&&!c.sundayOff)return t;for(let i=0;i<370;i++){const d=dayStart(t),sun=new Date(d+9*H).getUTCDay()===0;const a=d+c.startHour*H,b=a+c.shiftHours*H;if(c.sundayOff&&sun){t=d+DAY;continue}if(t<a)return a;if(t<b-EPS)return t;t=d+DAY;}throw Error('작업 달력 범위를 초과했습니다.');}
function work(t,h,c){if(c.shiftHours===24&&!c.sundayOff)return {start:t,end:t+h*H,segments:h>0?[[t,t+h*H]]:[]};let left=h*H,now=openAt(t,c),segments=[];if(left<=EPS)return {start:now,end:now,segments};const start=now;for(let i=0;left>EPS;i++){if(i>370)throw Error('계획 처리 기간이 1년을 초과했습니다.');now=openAt(now,c);const end=dayStart(now)+(c.startHour+c.shiftHours)*H,n=Math.min(left,end-now);segments.push([now,now+n]);left-=n;now+=n;}return{start,end:now,segments};}
function validate(plan,c){if(!Array.isArray(plan)||!plan.length||plan.length>20)throw Error('계획은 1~20행이어야 합니다.');if(!(c.shiftHours>0&&c.shiftHours<=24&&c.startHour===6))throw Error('작업시간은 1~24시간으로 입력하세요.');for(const k of ['injectionRate','uvRate','packRate'])if(!Number.isFinite(c[k])||c[k]<=0)throw Error('처리량은 0보다 커야 합니다.');if(!Number.isFinite(c.waitHours)||c.waitHours<0||c.waitHours>168)throw Error('공정 대기는 0~168시간입니다.');if(!Number.isFinite(c.lotSize)||c.lotSize<1)throw Error('이송 로트 크기는 1 이상입니다.');for(const k of ['injectionMachines','uvMachines'])if(c[k]!==undefined&&(!Number.isInteger(c[k])||c[k]<1||c[k]>200))throw Error('설비 수는 1~200대 정수여야 합니다.');let total=0;plan.forEach(p=>{if(typeof p.name!=='string'||!p.name.trim())throw Error('품목명을 입력하세요.');if(!Number.isFinite(p.qty)||p.qty<=0||!Number.isInteger(p.qty))throw Error('수량은 양의 정수여야 합니다.');if(stamp(p.due)<=stamp(p.release))throw Error('납기는 투입 시각 이후여야 합니다.');total+=Math.ceil(p.qty/c.lotSize)});if(total>5000)throw Error('이송 로트가 5,000개를 넘습니다. 로트 크기를 늘려주세요.');}
function simulate(plan,c){validate(plan,c);let lots=[],seq=0,setupEvents=[];plan.forEach((p,i)=>{
 const batches=c.toolChanges?p.batches:[{qty:p.qty}];
 if(c.toolChanges&&(!p.mold||!p.colorKey||!Array.isArray(batches)||batches.some(b=>!b.size||!Number.isInteger(b.qty)||b.qty<=0)||batches.reduce((n,b)=>n+b.qty,0)!==p.qty))throw Error('주문별 금형·색상·사이즈 수량을 확인하세요.');
 for(const b of batches)for(let q=b.qty;q>0;q-=c.lotSize)lots.push({order:i,id:seq++,qty:Math.min(q,c.lotSize),size:b.size,mold:p.mold,colorKey:p.colorKey,release:stamp(p.release),due:stamp(p.due),stages:[]});
});// Preserve input order even when release dates differ; wait for the next selected order.
lots.sort((a,b)=>a.order-b.order||a.id-b.id);
// Aggregate rate is divided among equal-speed machines: never multiply capacity by count.
function dispatch(queue,count,totalRate,arrival,stage){
 const available=Array(count).fill(-Infinity);let priorityStart=-Infinity;
 for(const l of queue){let machine=0;for(let i=1;i<count;i++)if(available[i]<available[machine])machine=i;
 const ready=Math.max(arrival(l),available[machine],priorityStart),s=work(ready,l.qty/(totalRate/count),c);
 s.machine=machine;s.rate=totalRate/count;l.stages[stage]=s;available[machine]=s.end;priorityStart=s.start;
 }
}
if(c.toolChanges){
 if(!Number.isFinite(c.colorChangeMinutes)||c.colorChangeMinutes<0||!Number.isFinite(c.moldChangeMinutes)||c.moldChangeMinutes<0)throw Error('교체시간을 확인하세요.');
 const machines=Array.from({length:c.injectionMachines||1},()=>({color:null,sides:[{end:-Infinity,pair:null},{end:-Infinity,pair:null}]}));
 const rate=c.injectionRate/(machines.length*2);let priorityStart=-Infinity;
 for(const l of lots){
  const pair=l.mold+'|'+l.size;let best=null;
  for(let m=0;m<machines.length;m++)for(let side=0;side<2;side++){
   const machine=machines[m],slot=machine.sides[side],colorChanged=machine.color!==null&&machine.color!==l.colorKey,moldChanged=slot.pair!==null&&slot.pair!==pair;
   let ready=Math.max(l.release,slot.end,colorChanged?Math.max(...machine.sides.map(s=>s.end)):-Infinity);
   const colorSetup=colorChanged?work(ready,c.colorChangeMinutes/60,c):null;
   if(colorSetup)ready=colorSetup.end;
   const moldSetup=moldChanged?work(ready,c.moldChangeMinutes/60,c):null;
   if(moldSetup)ready=moldSetup.end;
   const start=openAt(Math.max(ready,priorityStart),c),cost=(colorChanged?c.colorChangeMinutes*20:0)+(moldChanged?c.moldChangeMinutes*10:0);
   if(!best||start<best.start-EPS||(Math.abs(start-best.start)<EPS&&cost<best.cost))best={m,side,start,cost,colorSetup,moldSetup};
  }
  const machine=machines[best.m],slot=machine.sides[best.side];
  if(best.colorSetup){for(const side of machine.sides)side.end=best.colorSetup.end;setupEvents.push({...best.colorSetup,type:'color',machine:best.m,side:null,order:l.order,stationMinutes:c.colorChangeMinutes*20});}
  if(best.moldSetup)setupEvents.push({...best.moldSetup,type:'mold',machine:best.m,side:best.side,order:l.order,stationMinutes:c.moldChangeMinutes*10});
  const stage=work(best.start,l.qty/rate,c);Object.assign(stage,{machine:best.m,side:best.side,rate});l.stages[0]=stage;
  slot.end=stage.end;slot.pair=pair;machine.color=l.colorKey;priorityStart=stage.start;
 }
}else dispatch(lots,c.injectionMachines||1,c.injectionRate,l=>l.release,0);
for(const l of lots)l.ready=l.stages[0].end+c.waitHours*H;
let queue=[...lots].sort((a,b)=>a.ready-b.ready||a.id-b.id);
dispatch(queue,c.uvMachines||1,c.uvRate,l=>l.ready,1);
queue.sort((a,b)=>a.stages[1].end-b.stages[1].end||a.id-b.id);
dispatch(queue,1,c.packRate,l=>l.stages[1].end,2);
for(const l of lots)l.end=l.stages[2].end;
const orders=plan.map((p,i)=>{const mine=lots.filter(l=>l.order===i),end=Math.max(...mine.map(l=>l.end)),due=stamp(p.due),onTimeQty=mine.filter(l=>l.end<=due+EPS).reduce((a,l)=>a+l.qty,0);return {...p,end,dueTime:due,onTime:end<=due+EPS,onTimeQty,lateHours:Math.max(0,(end-due)/H)}});
return{plan,config:c,lots,orders,setupEvents,toolStats:{colorChanges:setupEvents.filter(e=>e.type==='color').length,moldChanges:setupEvents.filter(e=>e.type==='mold').length,stationMinutes:setupEvents.reduce((s,e)=>s+e.stationMinutes,0)},start:Math.min(...lots.map(l=>l.release)),end:Math.max(...orders.map(p=>p.end)),total:plan.reduce((a,p)=>a+p.qty,0)};}
function state(l,t){if(t<l.release)return 'unreleased';if(t<l.stages[0].start)return 'injectionQueue';if(t<l.stages[0].end)return 'injection';if(t<l.ready)return 'buffer';if(t<l.stages[1].start)return 'uvQueue';if(t<l.stages[1].end)return 'uv';if(t<l.stages[2].start)return 'packQueue';if(t<l.end)return 'pack';return 'done';}
function snapshot(r,t){const sums={unreleased:0,injectionQueue:0,injection:0,buffer:0,uvQueue:0,uv:0,packQueue:0,pack:0,done:0};const done=r.plan.map(()=>0);for(const l of r.lots){const s=state(l,t);sums[s]+=l.qty;if(s==='done')done[l.order]+=l.qty;}return{sums,done};}
const api={H,stamp,openAt,work,simulate,state,snapshot};if(typeof module!=='undefined')module.exports=api;else root.FlowModel=api;
})(typeof globalThis!=='undefined'?globalThis:this);
