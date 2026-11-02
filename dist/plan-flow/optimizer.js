(function(root){
'use strict';
const M=typeof module!=='undefined'?require('./model.js'):root.FlowModel;
function score(r){return [r.end,r.orders.filter(o=>!o.onTime).length,r.orders.reduce((s,o)=>s+o.lateHours,0)];}
function better(a,b){for(let i=0;i<a.length;i++){if(Math.abs(a[i]-b[i])<1e-6)continue;return a[i]<b[i]}return false;}
async function optimize(plan,config,{progress=()=>{},cancelled=()=>false}={}){
 if(plan.length>8)throw Error('전체 순서 탐색은 8개 계획까지 지원합니다.');
 const baseline=M.simulate(plan,config);let best=null,bestScore=null,count=0,feasibleCount=0;
 const total=plan.reduce((s,_,i)=>s*(i+1),1);
 function* permutations(a,prefix=[]){if(!a.length){yield prefix;return}for(let i=0;i<a.length;i++)yield*permutations([...a.slice(0,i),...a.slice(i+1)],[...prefix,a[i]]);}
 for(const rows of permutations([...plan].sort((a,b)=>a.id.localeCompare(b.id,undefined,{numeric:true})))){
  if(cancelled())return null;
  const r=M.simulate(rows,config),s=score(r);
  if(r.orders.every(o=>o.onTime)){feasibleCount++;if(!best||better(s,bestScore)){best=r;bestScore=s;}}
  count++;if(count%24===0||count===total){progress(count,total);await new Promise(resolve=>setTimeout(resolve,0));}
 }
 if(cancelled())return null;
 return {baseline,best,count,total,feasibleCount,savedHours:best?(baseline.end-best.end)/M.H:null};
}
const api={optimize};if(typeof module!=='undefined')module.exports=api;else root.FlowOptimizer=api;
})(globalThis);
