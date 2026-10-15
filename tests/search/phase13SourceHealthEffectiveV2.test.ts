import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=(name:string)=>readFileSync(name,'utf8');
const sql=read('supabase/migrations/20261014235000_phase13_source_health_effective_v2.sql');
const view='feya_commerce_v_data_source_health_effective_safe_v2';

test('Phase13 source health V2 is an additive dated evidence overlay, not a replacement for source truth',()=>{
 assert.ok(sql.includes('create view public.'+view));
 assert.ok(sql.includes('with (security_invoker=true,security_barrier=true)'));
 assert.ok(sql.includes('from public.feya_commerce_v_data_source_health_latest_safe_v1 h'));
 assert.ok(sql.includes('h.checked_at < now()'));
 assert.ok(sql.includes('h.watermark_at < now()'));
 assert.ok(sql.includes('expected_max_age_seconds'));
 assert.ok(sql.includes('604800'));
 assert.ok(sql.includes("health_state in ('HEALTHY','DEGRADED')"));
 assert.ok(sql.includes("then 'STALE'::text else health_state"));
 assert.ok(sql.includes("freshness_state in ('FRESH','AGING')"));
 assert.ok(sql.includes('FEYA_PHASE13_HEALTH_ROW_PARITY_FAILED'));
 assert.ok(sql.includes('FEYA_PHASE13_HEALTH_STATE_UNEXPECTED'));
 assert.ok(sql.includes('revoke all on public.'+view));
 assert.ok(sql.includes('grant select on public.'+view+' to anon,authenticated,service_role'));
 assert.ok(!sql.includes('update public.feya_growth_data_source_health_v1'));
 assert.ok(!sql.includes('drop view'));
 assert.ok(!sql.includes('create or replace view'));
 assert.ok(!sql.includes('insert into'));
});

test('all three existing Russian owner source-health screens use effective source freshness',()=>{
 for(const path of ['app/admin/data-health/page.tsx','app/admin/company/growth/page.tsx','app/admin/company/system/page.tsx']){
  const src=read(path);
  assert.ok(src.includes(".from('"+view+"')"),path);
  assert.ok(!src.includes(".from('feya_commerce_v_data_source_health_latest_safe_v1')"),path);
 }
 const page=read('app/admin/data-health/page.tsx');
 assert.ok(page.includes("row.health_state === 'NOT_OBSERVABLE' || row.health_state === 'STALE'"));
 assert.ok(page.includes('Нет свежей проверки'));
 assert.ok(page.includes('OwnerDataSourceDrawerClient'));
});
