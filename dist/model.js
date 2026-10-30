(function (root) {
  'use strict';
  function calendar(start, end, sundayOff = true, includeDeadline = true) {
    const from = new Date(start + 'T00:00:00Z');
    const until = new Date(end + 'T00:00:00Z');
    if (!Number.isFinite(+from) || !Number.isFinite(+until) || until < from || (until-from)/86400000 > 365) throw new Error('정비일 이후 365일 이내의 납기일을 선택하세요.');
    const days = [];
    for (let day = new Date(from); day <= until; day.setUTCDate(day.getUTCDate()+1)) {
      const date = day.toISOString().slice(0,10);
      if ((!sundayOff || day.getUTCDay() !== 0) && (includeDeadline || date !== end)) days.push(date);
    }
    return { days, maintenanceIsWorkday: days.includes(start), postDays: days.filter(d => d !== start) };
  }
  function calculate({ defectRate, reduction, extraCapacity, baselineDays, postDays, dailyDefects = [401.5, 1951/6] }) {
    if (!(defectRate > 0 && defectRate < 1) || reduction < 0 || reduction > 1 || extraCapacity < 0 || baselineDays < 1 || postDays < 0 || postDays > baselineDays || dailyDefects.some(v=>!Number.isFinite(v)||v<0)) throw new Error('모델 입력 범위를 확인하세요.');
    const afterRate = defectRate*(1-reduction);
    const targetNormalized = baselineDays*(1-defectRate);
    const needGross = targetNormalized/(1-afterRate);
    const grossNormalized = Math.min(needGross, postDays*(1+extraCapacity));
    const deliveredNormalized = grossNormalized*(1-afterRate);
    const capacity = dailyDefects.map(b=>b/defectRate);
    const totalCapacity = capacity.reduce((a,b)=>a+b,0);
    const target = totalCapacity*targetNormalized;
    const good = totalCapacity*deliveredNormalized;
    const defectTotal = dailyDefects.reduce((a,b)=>a+b,0);
    const defects = defectTotal*(1-reduction)*grossNormalized;
    const baselineDefects = defectTotal*baselineDays;
    const requiredExtra = postDays ? Math.max(0,needGross/postDays-1) : null;
    return { target, good, shortage:Math.max(0,target-good), fulfillment:good/target,
      defects, baselineDefects, defectReduction:1-defects/baselineDefects,
      requiredExtra, usedExtra:postDays ? Math.max(0,grossNormalized/postDays-1):0,
      afterRate, baselineDays, postDays,
      fullDelivery:good>=target-1e-6,
      // Closed-form solution of the separable LP: minimize shortage, then extra
      // capacity, then defects. No cross-machine transfers or setup constraints.
      machines:capacity.map((q,i)=>({name:['MCA03','MCA36'][i],
        grossPerDay:postDays ? q*grossNormalized/postDays:0,
        good:q*deliveredNormalized,shortage:Math.max(0,q*(targetNormalized-deliveredNormalized)),
        defects:dailyDefects[i]*(1-reduction)*grossNormalized})) };
  }
  const api = {calendar, calculate};
  if (typeof module !== 'undefined' && module.exports) module.exports=api;
  else root.MESModel=api;
})(typeof window !== 'undefined' ? window : globalThis);
