'use strict';
const $=s=>document.querySelector(s),D=FLOW_DATA,M=FlowModel,scene=new FlowScene($('#scene'));const demoPlan=D.plan;let plan=structuredClone(demoPlan),inputPlan=structuredClone(demoPlan),result,now,playing=false,last=0,raf=0;
const fmt=n=>Math.round(n).toLocaleString('ko-KR'),date=n=>new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(n));
let phase=1,phaseOnePlan=null,optSolution=null,searchToken=0,applyingOptimization=false;
const mean=a=>a.reduce((x,y)=>x+y,0)/a.length;const dailyIP=mean(D.injectionDaily),dailyUV=mean(D.uvDaily);
function config(){const share=0.25;return{moldInventoryMode:"unlimited",toolChanges:true,colorChangeMinutes:D.setup.colorMinutes,moldChangeMinutes:D.setup.moldMinutes,startHour:6,shiftHours:24,sundayOff:false,injectionRate:dailyIP/16*share,uvRate:dailyUV/16*share,packRate:+$('#packRate').value,waitHours:+$('#wait').value,lotSize:100,injectionMachines:FlowLayout.injection.length,uvMachines:FlowLayout.uv.length};}
function toast(s){$('#toast').textContent=s;$('#toast').style.display='block';setTimeout(()=>$('#toast').style.display='none',2600)}
function pause(){playing=false;$('#play').textContent='▶';$('#play').setAttribute('aria-label','시간 재생');cancelAnimationFrame(raf)}
function marginLabel(o){const mins=Math.abs(Math.floor(o.dueTime/60000)-Math.floor(o.end/60000));if(!mins)return o.end===o.dueTime?'납기 시각에 완료':`1분 미만 ${o.end<o.dueTime?'빠름':'지연'}`;const h=Math.floor(mins/60),m=mins%60;return `${h?h+'시간 ':''}${m?m+'분 ':''}${o.end<=o.dueTime?'빠름':'지연'}`;}
function deadlineChart(o,i,axisEnd){
 const node=document.createElement('div');node.className='deadline-chart';node.id='chart-'+i;
 const start=Math.min(...result.lots.filter(l=>l.order===i).map(l=>l.stages[0].start));
 const pct=t=>Math.max(0,Math.min(100,100*(t-result.start)/(axisEnd-result.start)));
 node.dataset.start=start;node.dataset.axisEnd=axisEnd;
 const track=document.createElement('div');track.className='date-track';
 const run=document.createElement('div');run.className='date-run';run.id='bar-'+i;run.style.left=pct(start)+'%';run.style.width='0%';
 const deadline=document.createElement('i');deadline.className='date-due';deadline.style.left=pct(o.dueTime)+'%';deadline.title='조립일 납기 '+date(o.dueTime);
 track.append(run,deadline);node.append(track);
 const margin=document.createElement('div');margin.className='date-margin';margin.id='margin-'+i;node.append(margin);return node;
}
function compute(){if(!applyingOptimization)invalidateOptimization();try{const next=M.simulate(plan,config());pause();result=next;now=result.start;$('#verdict').dataset.phase='';$('#rates').textContent=`적용 처리량 / h · IP ${fmt(result.config.injectionRate)} · UV ${fmt(result.config.uvRate)} · 출하 준비 ${fmt(result.config.packRate)} (계획 수량단위) · 동일속도 환산: IP 1대 ${(result.config.injectionRate/40).toFixed(1)}/h, UV 1대 ${(result.config.uvRate/8).toFixed(1)}/h`;
$('#orders').replaceChildren();const axisEnd=Math.max(result.end,...result.orders.map(o=>o.dueTime))+M.H*2;const axis=document.createElement('div');axis.className='deadline-key';axis.textContent=`┆ 납기`;$('#orders').append(axis);$('#legend').replaceChildren();result.orders.forEach((o,i)=>{const el=document.createElement('div');el.className='order';const row=document.createElement('div');row.className='order-head';const name=document.createElement('b');name.textContent=`${o.id.replace("order-", "")}. ${o.name}`;const flag=document.createElement('span');flag.id='flag-'+i;row.append(name,flag);const target=document.createElement('small');target.textContent=`납기 ${date(o.dueTime)} · 수량 ${fmt(o.qty)} · ${o.colorName||''}`;const end=document.createElement('small');end.id='end-'+i;end.hidden=true;const current=document.createElement('small');current.id='done-'+i;el.append(row,target,end,deadlineChart(o,i,axisEnd),current);$('#orders').append(el);const legend=document.createElement('span');const dot=document.createElement('i');dot.style.background=FlowColors[(o.colorIndex??i)%FlowColors.length];legend.append(dot,document.createTextNode('주문 '+o.id.replace('order-','')));$('#legend').append(legend)});render();return true}catch(e){pause();$('#verdict').className='result late';$('#verdict').textContent='입력값 확인: '+e.message;toast('입력을 수정하면 다시 계산합니다.');return false}}
function revealResult(){
 const finished=now>=result.end,phase=finished?'finished':now<=result.start?'ready':'running';
 const verdict=$('#verdict');
 if(verdict.dataset.phase!==phase){
  verdict.dataset.phase=phase;verdict.replaceChildren();
  const late=result.orders.filter(o=>!o.onTime).length;
  verdict.className='result'+(finished&&late?' late':finished?'':' pending');
  verdict.append(document.createTextNode(finished?(late?`${late}건 납기 미준수`:'모든 주문 납기 준수'):phase==='ready'?'시뮬레이션 준비 완료':'시뮬레이션 진행 중'));

  $('.kpis').hidden=!finished;
  $('#ontime').textContent=finished?`${result.orders.length-late} / ${result.orders.length}건`:'';
  $('#maxlate').textContent=finished?Math.max(...result.orders.map(o=>o.lateHours)).toFixed(1)+'h':'';
 }
}
function render(){revealResult();const s=M.snapshot(result,now),q=s.sums;$('#clock').textContent=date(now)+' KST';$('#progress').textContent=`완료 ${fmt(q.done)} / ${fmt(result.total)} · ${Math.round(q.done/result.total*100)}%`;$('#timeline').value=1000*(now-result.start)/(result.end-result.start||1);$('#ip-wip').textContent=fmt(q.injection);$('#ip-q').textContent=`대기 ${fmt(q.injectionQueue)} · 미투입 ${fmt(q.unreleased)}`;$('#buffer-wip').textContent=fmt(q.buffer);$('#uv-wip').textContent=fmt(q.uv);$('#uv-q').textContent='대기 '+fmt(q.uvQueue);$('#pack-wip').textContent=fmt(q.pack);$('#pack-q').textContent='대기 '+fmt(q.packQueue);s.done.forEach((n,i)=>{$('#done-'+i).textContent=`생산 진행 ${fmt(n)} / ${fmt(plan[i].qty)} · ${Math.round(n/plan[i].qty*100)}%`;const o=result.orders[i],chart=$('#chart-'+i),start=+chart.dataset.start,axisEnd=+chart.dataset.axisEnd;const cursor=Math.min(now,o.end),late=cursor>o.dueTime;const done=now>=o.end,flag=$('#flag-'+i),end=$('#end-'+i);flag.textContent=done?(o.onTime?'납기 준수':'납기 미준수'):now<start?'투입 대기':late?'납기 초과':'생산 중';flag.className=late?'late':done?'ok':'';end.hidden=!done;end.textContent=done?'IP 완료 '+date(o.end):'';const bar=$('#bar-'+i);bar.style.width=100*Math.max(0,cursor-start)/(axisEnd-result.start)+'%';bar.classList.toggle('overdue',late);const margin=$('#margin-'+i);margin.className='date-margin '+(late?'late':'ok');margin.textContent=now>=o.end?'완료 · '+marginLabel(o):now<start?'투입 대기':late?'생산 중 · 납기 초과':'생산 중 · 납기 이내';chart.setAttribute('aria-label',margin.textContent+', 완료 수량 '+fmt(n)+' / '+fmt(o.qty)+', 납기 '+date(o.dueTime))});const ipActive=result.lots.filter(l=>M.state(l,now)==='injection'),uvActive=result.lots.filter(l=>M.state(l,now)==='uv');const localTime=new Date(now+9*M.H),hour=localTime.getUTCHours()+localTime.getUTCMinutes()/60,off=result.config.shiftHours!==24&&((result.config.sundayOff&&localTime.getUTCDay()===0)||hour<6||hour>=6+result.config.shiftHours);$('#machine-status').textContent=`${off?'작업 외 시간 · 처리 일시 중단':'작업 시간'} · IP ${new Set(ipActive.map(l=>l.stages[0].machine)).size}/40 · UV ${uvActive.length}/8 · 교체 ${new Set(result.setupEvents.filter(e=>e.start<=now&&now<e.end).map(e=>e.machine)).size}대`;scene.set(result,now)}
function tick(t){if(!playing)return;if(last)now=Math.min(result.end,now+(t-last)/1000*+$('#speed').value*M.H);last=t;render();if(now>=result.end){pause();return}raf=requestAnimationFrame(tick)}
$('#play').onclick=()=>{if(playing){pause();return}if(now>=result.end)now=result.start;playing=true;last=0;$('#play').textContent='Ⅱ';$('#play').setAttribute('aria-label','일시 정지');raf=requestAnimationFrame(tick)};$('#restart').onclick=()=>{pause();now=result.start;render()};$('#timeline').oninput=()=>{pause();now=result.start+(result.end-result.start)*+$('#timeline').value/1000;render()};$('#finish').onclick=()=>{pause();now=result.end;render()};
for(const id of ['wait','packRate'])$('#'+id).addEventListener('change',compute);
function sequence(kind){const rows=structuredClone(inputPlan);if(kind==='edd')rows.sort((a,b)=>M.stamp(a.due)-M.stamp(b.due));if(kind==='spt')rows.sort((a,b)=>a.qty-b.qty);if(kind==='reverse')rows.reverse();return rows;}
for(const id of ['base'])$('#'+id).onclick=()=>{plan=sequence(id);document.querySelectorAll('.presets button').forEach(b=>b.classList.toggle('active',b.id===id));compute()};

document.addEventListener('keydown',e=>{if(e.code==='Space'&&!e.target.matches('input,button,select,textarea')&&!$('#planDialog').open){e.preventDefault();$('#play').click()}});
$('#evidenceButton').onclick=()=>window.open('evidence.html','_blank');
// Pointer-based drag handle supports mouse, pen and touch without dragging input text.
function attachOrderDrag(handle,tr){
 let drag=null;const surface=$('#planDialog');
 const finish=()=>{if(!drag)return;tr.classList.remove('dragging');handle.setAttribute('aria-pressed','false');if(surface.hasPointerCapture(drag.pointer))surface.releasePointerCapture(drag.pointer);drag=null;surface.removeEventListener('pointermove',movePointer);};
 handle.addEventListener('pointerdown',e=>{if(e.button!==0)return;e.preventDefault();drag={pointer:e.pointerId};surface.setPointerCapture(e.pointerId);surface.addEventListener('pointermove',movePointer);tr.classList.add('dragging');handle.setAttribute('aria-pressed','true');});
 const movePointer=e=>{if(!drag||drag.pointer!==e.pointerId)return;e.preventDefault();const target=document.elementFromPoint(e.clientX,e.clientY)?.closest('#planRows tr');if(target&&target!==tr){const box=target.getBoundingClientRect();if(e.clientY<box.top+box.height/2)target.before(tr);else target.after(tr);}const dialog=$('#planDialog'),bounds=dialog.getBoundingClientRect();if(e.clientY<bounds.top+65)dialog.scrollTop-=18;else if(e.clientY>bounds.bottom-65)dialog.scrollTop+=18;};
 handle.addEventListener('pointerdown',()=>{surface.addEventListener('pointerup',finish,{once:true});surface.addEventListener('pointercancel',finish,{once:true});surface.addEventListener('lostpointercapture',finish,{once:true});});
 handle.addEventListener('keydown',e=>{if(!['ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();const other=e.key==='ArrowUp'?tr.previousElementSibling:tr.nextElementSibling;if(other){if(e.key==='ArrowUp')other.before(tr);else other.after(tr);handle.focus();}});
}
function row(p){
 const tr=document.createElement('tr');tr._plan=structuredClone(p);
 const grip=document.createElement('td'),handle=document.createElement('button');handle.type='button';handle.className='drag-handle';handle.textContent='⠿';handle.setAttribute('aria-label','드래그로 순서 이동');handle.title='드래그 또는 방향키로 순서 변경';attachOrderDrag(handle,tr);grip.append(handle);tr.append(grip);
 const item=document.createElement('td'),title=document.createElement('strong'),sub=document.createElement('small');title.textContent=p.style||p.name;sub.textContent=`${p.id} · PO ${p.po||'—'} · LOT ${p.lot||'—'}`;item.append(title,sub);tr.append(item);
 for(const value of [fmt(p.qty),date(M.stamp(p.release)),date(M.stamp(p.due))]){const td=document.createElement('td');td.textContent=value;tr.append(td)}$('#planRows').append(tr);
}
function readRows(){return [...$('#planRows').rows].map(tr=>structuredClone(tr._plan))}
function fillRows(rows){$('#planRows').replaceChildren();rows.forEach(row)}
$('#editPlan').onclick=()=>{pause();$('#error').textContent='';fillRows(plan);$('#planDialog').showModal()};$('#closePlan').onclick=()=>$('#planDialog').close();$('#sample').onclick=()=>fillRows(inputPlan);
$('#planForm').onsubmit=e=>{e.preventDefault();try{const draft=readRows();M.simulate(draft,config());plan=draft;document.querySelectorAll('.presets button').forEach(b=>b.classList.remove('active'));compute();$('#planDialog').close();toast('변경한 순서로 다시 계산했습니다.')}catch(err){$('#error').textContent=err.message}};
function invalidateOptimization(){searchToken++;optSolution=null;$('#optResult').hidden=true;$('#applyOptimized').hidden=true;$('#optimize').disabled=false;$('#optStatus').textContent='Phase 1의 현재 순서와 비교합니다.';}
function setPhase(next){
 if(phase===next)return;pause();invalidateOptimization();
 if(next===2)phaseOnePlan=structuredClone(plan);
 else if(phaseOnePlan){plan=structuredClone(phaseOnePlan);compute();}
 phase=next;document.body.classList.toggle('optimizing-phase',next===2);
 $('#phase1').classList.toggle('active',next===1);$('#phase2').classList.toggle('active',next===2);$('#optimization').hidden=next!==2;
 $('.intro .eyebrow').textContent=next===1?'PHASE 1 / 생산계획 시뮬레이션':'PHASE 2 / 생산 순서 최적화';
 $('.intro h1').innerHTML=next===1?'이 계획,<br><em>제때 끝날까요?</em>':'모든 계획을,<br><em>가장 빠르게.</em>';
}
$('#phase1').onclick=()=>setPhase(1);$('#phase2').onclick=()=>setPhase(2);
$('#optimize').onclick=async()=>{
 pause();invalidateOptimization();const token=searchToken,rows=structuredClone(phaseOnePlan||plan),c=config();$('#optimize').disabled=true;
 try{const solution=await FlowOptimizer.optimize(rows,c,{cancelled:()=>token!==searchToken,progress:(n,total)=>$('#optStatus').textContent=`${n} / ${total}개 순서 비교 중`});if(!solution||token!==searchToken)return;optSolution=solution;
 const box=$('#optResult');box.replaceChildren();box.hidden=false;
 if(!solution.best){box.textContent='현재 조건과 주문 순서 범위에서 모든 납기를 지키는 순서가 없습니다.';$('#optStatus').textContent=`${solution.count}개 순서 전수 비교 완료 · 납기 준수 가능 순서 0개`;return;}
 for(const [label,r] of [['현재 순서',solution.baseline],['최적 순서',solution.best]]){const line=document.createElement('p');line.textContent=`${label} · 전체 완료 ${date(r.end)} · 납기 준수 ${r.orders.filter(o=>o.onTime).length}/${r.orders.length}건`;box.append(line);}
 const gain=document.createElement('strong');gain.className='optimization-gain';gain.textContent=solution.savedHours>1/60?`${Math.floor(Math.round(solution.savedHours*60)/60)}시간 ${Math.round(solution.savedHours*60)%60}분 단축 (달력 시간)`:solution.savedHours< -1/60?'모든 납기를 지키기 위해 현재 순서보다 전체 완료가 늦어집니다.':'모든 납기 준수 · 최소 완료 시간 달성';box.append(gain);
 const order=document.createElement('div');order.className='optimal-sequence';order.setAttribute('aria-label','최적 생산 순서');
 solution.best.plan.forEach((p,i)=>{const card=document.createElement('div');card.className='sequence-card';card.style.setProperty('--order-color',FlowColors[p.colorIndex]);
 const step=document.createElement('small');step.textContent=`${i+1}번째 투입`;const number=document.createElement('b');number.textContent='주문 '+p.id.replace('order-','');const style=document.createElement('span');style.textContent=p.style;const color=document.createElement('small');color.textContent=p.colorName;card.append(step,number,style,color);order.append(card);});box.append(order);
 const tools=document.createElement('p');tools.className='tool-comparison';tools.textContent=`색상 전환 ${solution.baseline.toolStats.colorChanges} → ${solution.best.toolStats.colorChanges}회 · 금형 교체 ${solution.baseline.toolStats.moldChanges} → ${solution.best.toolStats.moldChanges}회`;box.append(tools);
 $('#optStatus').textContent=`${solution.count}개 순서 전수 비교 · 모든 납기 준수 ${solution.feasibleCount}개 중 최소 완료 시간`;
 $('#applyOptimized').hidden=false;
 }catch(e){$('#optStatus').textContent=e.message;}finally{if(token===searchToken)$('#optimize').disabled=false;}
};
$('#applyOptimized').onclick=()=>{if(!optSolution?.best)return;plan=structuredClone(optSolution.best.plan);applyingOptimization=true;const ok=compute();applyingOptimization=false;if(ok)$('#play').click();};
compute();

for(const [id,type] of [['flowView','flow'],['layoutView','layout']])$('#'+id).onclick=()=>{scene.view(type);$('#flowView').classList.toggle('active',type==='flow');$('#layoutView').classList.toggle('active',type==='layout');document.querySelector('.model-tag').textContent=type==='layout'?'A동 상대 배치 · IP 40대 / UV 8대':'IP 사출 투입부터 출하 준비까지';};

$('#layoutView').click();
