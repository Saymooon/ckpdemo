"use strict";
const $=id=>document.getElementById(id);
const fmt=(v,d=0)=>v.toLocaleString('ko-KR',{maximumFractionDigits:d,minimumFractionDigits:d});
let repair=true;
const machine=(name,second)=>`<div class="unit ${second?'second':''}"><div class="body cuboid"><div class="front"><span class="nameplate">${name}</span><div class="machine-window"><div class="piston"></div></div><span class="screen">PAUSE</span><span class="buttons"></span></div><div class="right"></div><div class="top"></div></div><div class="cap cuboid"><div class="front"></div><div class="right"></div><div class="top"></div></div><div class="foot cuboid"><div class="front"></div><div class="right"></div><div class="top"></div></div><span class="lamp"></span><span class="repair-badge"><svg viewBox="0 0 32 32" aria-hidden="true"><path d="M19 5a8 8 0 0 0-9 10L3 23a3 3 0 0 0 5 5l8-8a8 8 0 0 0 10-9l-5 5-5-5z"/></svg></span></div>`;
$('machines').innerHTML=machine('MCA03',false)+machine('MCA36',true);
function render(){
 const d=+$('defect').value/100,r=+$('reduction').value/100,u=+$('extra').value/100;
 const result=MESModel.calculate({defectRate:d,reduction:repair?r:0,extraCapacity:repair?u:0,baselineDays:7,postDays:repair?6:7});
 document.body.classList.toggle('running',!repair);
 for(const id of ['normal','repair']){const selected=(id==='repair')===repair;$(id).classList.toggle('selected',selected);$(id).setAttribute('aria-pressed',selected);}
 $('scene-label').textContent=repair?'9/3 · 두 설비 정비 중':'9/3 · 두 설비 정상 가동';
 document.querySelectorAll('.machine-state').forEach(el=>el.textContent=repair?'정비':'가동');
 document.querySelectorAll('.screen').forEach(el=>el.textContent=repair?'PAUSE':'RUN');
 $('day-one').textContent=repair?'9/3 정지':'9/3 가동';$('day-two').textContent=repair?'9/4 재가동':'계속 생산';
 $('fulfillment').innerHTML=fmt(result.fullDelivery?100:Math.min(result.fulfillment*100,99.9),1)+'<small>%</small>';
 $('fill').style.width=(result.fulfillment*100)+'%';
 $('shortage').textContent=result.fullDelivery?'가정 목표 물량 확보':fmt(result.shortage)+'개 미충족 · 모델값';
 $('defects').innerHTML=fmt(result.defects)+'<small>개</small>';
 $('defect-change').textContent=repair?`가동 유지 대비 ${fmt(result.defectReduction*100,1)}% 감소`:'정비 없는 기준 시나리오';
 $('extra-needed').innerHTML='+'+fmt(result.requiredExtra*100,1)+'<small>%</small>';
 $('capacity-note').textContent=repair?`설정한 한도 +${fmt(u*100)}% / 남은 6일`:'추가 능력 없이 정상 생산';
 $('decision').innerHTML=!repair?'정비 없이 <b>7일간 정상 생산</b>하는 기준입니다.':result.fullDelivery?`추가 능력 <b>+${fmt(result.usedExtra*100,1)}%</b>를 사용하면 기준 물량을 맞출 수 있습니다.`:`물량 만회에는 <b>+${fmt(result.requiredExtra*100,1)}%</b>가 필요합니다. 불량 감소에는 생산 미달 효과도 포함됩니다.`;
 $('defect-value').textContent=fmt(d*100)+'%';$('reduction-value').textContent=fmt(r*100)+'%';$('extra-value').textContent='+'+fmt(u*100)+'%';
 $('reduction-note').textContent=`불량률 ${fmt(d*100)}% → ${fmt(d*(1-r)*100,1)}% 가정`;
 $('summary-values').textContent=`불량률 ${fmt(d*100)}% · 개선 ${fmt(r*100)}% · 추가 +${fmt(u*100)}%`;
}
$('normal').onclick=()=>{repair=false;render();};$('repair').onclick=()=>{repair=true;render();};
for(const id of ['defect','reduction','extra'])$(id).addEventListener('input',render);
render();
