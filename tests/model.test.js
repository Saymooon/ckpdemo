'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {calculate,calendar}=require('../dist/model.js');
const refs=JSON.parse(fs.readFileSync(path.join(__dirname,'lp-reference.json'),'utf8'));
for(const s of refs){
  const r=calculate({defectRate:s.baseline_defect_rate,reduction:s.relative_defect_reduction,extraCapacity:s.max_extra_capacity,baselineDays:7,postDays:6});
  for(const [key,source] of [['target','modeled_target_good_ea'],['shortage','modeled_shortage_good_ea'],['fulfillment','delivery_fraction'],['defects','expected_defects'],['requiredExtra','minimum_extra_capacity_for_full_delivery']]) assert.ok(Math.abs(r[key]-s[source])<1e-6,`${key}: ${r[key]} vs ${s[source]}`);
}
assert.equal(calendar('2026-09-03','2026-09-10',true,true).postDays.length,6);
assert.equal(calendar('2026-09-03','2026-09-10',true,false).postDays.length,5);
assert.equal(calendar('2026-09-03','2026-09-10',false,true).postDays.length,7);
assert.equal(calendar('2026-09-06','2026-09-10',true,true).maintenanceIsWorkday,false);
assert.throws(()=>calendar('2026-09-10','2026-09-03'));
const noDays=calculate({defectRate:.1,reduction:.5,extraCapacity:.2,baselineDays:1,postDays:0});
assert.equal(noDays.fulfillment,0);assert.equal(noDays.requiredExtra,null);
const full=calculate({defectRate:.1,reduction:1,extraCapacity:.2,baselineDays:7,postDays:6});
assert.equal(full.defects,0);assert.ok(full.fullDelivery);
console.log('PASS: 27 Python LP reference cases; calendar, no-capacity and perfect-repair cases.');
