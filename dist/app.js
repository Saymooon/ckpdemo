'use strict';
const $=id=>document.getElementById(id);
const n=(value,digits=0)=>Number(value).toLocaleString('ko-KR',{maximumFractionDigits:digits,minimumFractionDigits:digits});
const pct=(value,digits=1)=>n(value*100,digits)+'%';
const controls=['maintenance','deadline','sunday','includeDeadline','defect','reduction','extra'];
let current=null;
function input(){return {maintenance:$('maintenance').value,deadline:$('deadline').value,sunday:$('sunday').checked,includeDeadline:$('includeDeadline').checked,defectRate:+$('defect').value/100,reduction:+$('reduction').value/100,extraCapacity:+$('extra').value/100};}
function parameters(p){const c=MESModel.calendar(p.maintenance,p.deadline,p.sunday,p.includeDeadline);return {c,model:{defectRate:p.defectRate,reduction:p.reduction,extraCapacity:p.extraCapacity,baselineDays:c.days.length,postDays:c.postDays.length}};}
function render(){
  try{
    const p=input(),{c,model}=parameters(p),r=MESModel.calculate(model);current={p,c,model,r};
    $('error').hidden=true;$('result-content').hidden=false;
    $('defect-value').textContent=pct(p.defectRate,0);$('reduction-value').textContent=pct(p.reduction,0);$('extra-value').textContent='+'+pct(p.extraCapacity,0);
    $('baseline-days').textContent=c.days.length+'일';$('post-days').textContent=c.postDays.length+'일';
    $('rate-explanation').textContent=`불량률 ${pct(p.defectRate,0)} → ${pct(r.afterRate)}를 가정합니다.`;
    $('fulfillment').innerHTML=n(r.fulfillment*100,1)+'<small>%</small>';
    $('fulfillment-track').style.width=pct(r.fulfillment,3);
    $('shortage-label').textContent=r.fullDelivery?`모델 기준 양품 ${n(r.target)}개 확보`:`가정 목표 대비 ${n(r.shortage)}개 미충족`;
    $('required').innerHTML=r.requiredExtra===null?'—':`+${n(r.requiredExtra*100,1)}<small>%</small>`;
    $('capacity-label').textContent=r.requiredExtra===null?'생산 가능일이 없어 만회 불가':`남은 ${c.postDays.length}일의 정상 능력 대비`;
    $('defects').innerHTML=n(r.defects)+'<small>개</small>';
    $('defect-delta').textContent=`정비 없는 기준 대비 ${pct(r.defectReduction)} 감소`;
    $('status').textContent=r.fullDelivery?'모델상 기준 물량 확보':'만회 능력 추가 필요';$('status').className='status'+(r.fullDelivery?' success':'');
    let title,text;
    if(!c.maintenanceIsWorkday){title='선택한 정비일은 원래 생산일이 아닙니다.';text='캘린더 가정상 정지로 인한 생산일 손실은 없습니다. 정비 다음 생산일부터 설정한 품질 개선을 적용했습니다.';}
    else if(r.fullDelivery){title='설정한 능력 안에서 기준 물량을 확보합니다.';text=`추가 능력 한도 ${pct(p.extraCapacity)} 중 ${pct(r.usedExtra)}를 사용합니다. 정비 없는 기준과 동일한 양품 목표를 충족한 조건에서 기대 불량은 ${pct(r.defectReduction)} 감소합니다.`;}
    else if(r.requiredExtra!==null){title=`추가 생산능력 ${pct(r.requiredExtra)}가 만회 기준입니다.`;text=`현재 한도 ${pct(p.extraCapacity)}에서는 기준 물량의 ${pct(1-r.fulfillment)}가 남습니다. 표시된 불량 감소에는 생산 미달의 영향도 포함됩니다.`;}
    else{title='정비 이후 생산 가능한 날이 없습니다.';text='납기일 또는 납기 당일 생산 사용 여부를 바꾸세요. 해당 조건에서는 생산으로 목표 물량을 확보할 수 없습니다.';}
    $('insight-title').textContent=title;$('insight-text').textContent=text;
    $('bar-percent').textContent=pct(r.fulfillment);$('bar-good').style.width=pct(r.fulfillment,3);$('bar-short').style.width=pct(1-r.fulfillment,3);
    $('baseline-defects').textContent=n(r.baselineDefects)+'개';$('compare-defects').textContent=n(r.defects)+'개';
    $('comparison-note').textContent=r.fullDelivery?'동일 양품 물량을 확보한 조건에서의 불량 비교입니다.':'양품이 미달한 상태입니다. 불량 감소 전부를 정비의 품질 개선으로 해석하지 마세요.';
    $('machine-rows').replaceChildren(...r.machines.map(m=>{const tr=document.createElement('tr');[m.name,n(m.grossPerDay)+'개',n(m.good)+'개',n(m.shortage)+'개',n(m.defects)+'개'].forEach((v,i)=>{const td=document.createElement('td');td.textContent=v;if(i===3&&m.shortage>.01)td.className='short-number';tr.append(td);});return tr;}));
    $('workdays').replaceChildren(...[p.maintenance,...c.postDays].map((day,i)=>{const s=document.createElement('span');s.textContent=day.slice(5).replace('-','/')+(i===0?' 정비':' 생산');if(i===0)s.className='stopped';return s;}));
    const matrix=$('matrix');matrix.replaceChildren();
    for(const head of ['','+0%','+5%','+10%','+15%','+20%']){const el=document.createElement('span');el.className='head';el.textContent=head;matrix.append(el);}
    for(const reduction of [0,.25,.50,.75]){const label=document.createElement('span');label.className='head';label.textContent=pct(reduction,0);matrix.append(label);for(const extraCapacity of [0,.05,.10,.15,.20]){const v=MESModel.calculate({...model,reduction,extraCapacity}),btn=document.createElement('button');btn.type='button';btn.textContent=pct(v.fulfillment,0);btn.style.background=v.fullDelivery?'#b5d6c3':`hsl(36 38% ${94-(v.fulfillment*.07*100)}%)`;btn.title=`불량률 ${pct(reduction,0)} 감소, 추가 능력 ${pct(extraCapacity,0)}: 물량 충족 ${pct(v.fulfillment,2)}`;btn.setAttribute('aria-label',btn.title);if(Math.abs(p.reduction-reduction)<.001&&Math.abs(p.extraCapacity-extraCapacity)<.001){btn.classList.add('selected');btn.setAttribute('aria-pressed','true');}else btn.setAttribute('aria-pressed','false');btn.onclick=()=>{$('reduction').value=reduction*100;$('extra').value=extraCapacity*100;render();};matrix.append(btn);}}
  }catch(err){current=null;$('error').hidden=false;$('error').textContent=err.message;$('result-content').hidden=true;}
}
controls.forEach(id=>$(id).addEventListener('input',render));
$('reset').onclick=()=>{$('maintenance').value='2026-09-03';$('deadline').value='2026-09-10';$('sunday').checked=true;$('includeDeadline').checked=true;$('defect').value=10;$('reduction').value=50;$('extra').value=10;render();};
document.querySelectorAll('[data-preset]').forEach(btn=>btn.onclick=()=>{const [reduction,extra]={none:[0,0],quality:[50,0],recover:[50,20]}[btn.dataset.preset];$('reduction').value=reduction;$('extra').value=extra;render();});
$('download').onclick=()=>{if(!current)return;const{p,model,r}=current;const rows=[['구분','값'],['모델','가정 기반 조건부 모델 / 실제 고객 납기 예측 아님'],['관측 기간','2026-08-27~2026-09-02'],['정비일',p.maintenance],['납기일',p.deadline],['기존 불량률',p.defectRate],['상대 불량 감소율',p.reduction],['추가 능력 한도',p.extraCapacity],['정비 전 생산일',model.baselineDays],['정비 후 생산일',model.postDays],['가정 목표 양품',r.target],['모델 양품',r.good],['미충족',r.shortage],['물량 충족률',r.fulfillment],['전량 충족 최소 추가 능력',r.requiredExtra??'생산일 없음'],['기대 불량',r.defects],['기준 기대 불량',r.baselineDefects]];const csv='\uFEFF'+rows.map(row=>row.map(v=>'"'+String(v).replaceAll('"','""')+'"').join(',')).join('\r\n');const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='MES-maintenance-scenario.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
$('share').onclick=async()=>{if(!current)return;const url=new URL(location.href);url.hash=new URLSearchParams(Object.fromEntries(controls.map(id=>[id,$(id).type==='checkbox'?Number($(id).checked):$(id).value]))).toString();try{await navigator.clipboard.writeText(url.href);$('share').textContent='설정 링크 복사 완료 ✓';setTimeout(()=>$('share').textContent='설정 링크 복사 ↗',2000);}catch{window.prompt('아래 설정 링크를 복사하세요.',url.href);}};
const params=new URLSearchParams(location.hash.slice(1));for(const id of controls){if(!params.has(id))continue;const el=$(id),v=params.get(id);if(el.type==='checkbox'){if(v==='0'||v==='1')el.checked=v==='1';}else if(el.type==='range'){const value=Number(v);if(Number.isFinite(value))el.value=Math.max(+el.min,Math.min(+el.max,value));}else if(/^\d{4}-\d{2}-\d{2}$/.test(v))el.value=v;}
render();
