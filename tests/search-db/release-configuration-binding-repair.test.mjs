import test from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import pg from 'pg';
import {readFile} from 'node:fs/promises';
import {variantDependenciesSQL} from './helpers/variant-draft.mjs';
import {ensureExecutionReceiptDependency} from './helpers/price-baseline-adoption.mjs';

const migrationSQL=()=>readFile(new URL('../../supabase/migrations/20260925214500_release_configuration_binding_repair_v1.sql',import.meta.url),'utf8');
const nativeURL=process.env.FEYA_TEST_DATABASE_URL;
const actor='70000000-0000-4000-8000-000000000091';
const uid=(prefix,n)=>prefix+'0000000-0000-4000-8000-'+n.toString(16).padStart(12,'0');
const esc=s=>String(s).replaceAll("'","''");
const lit=s=>"'" + esc(s) + "'";

async function connect(){
  const u=new URL(nativeURL);
  assert.ok(['localhost','127.0.0.1'].includes(u.hostname));
  assert.equal(u.pathname,'/feya_test');
  const c=new pg.Client({connectionString:nativeURL,statement_timeout:30000,connectionTimeoutMillis:5000});
  await c.connect();
  return c;
}

async function seed(db,{pglite=false}={}){
  if(pglite){
    await db.exec("create function extensions.uuid_generate_v5(namespace uuid,name text) returns uuid language sql immutable strict as $ select (substr(md5(namespace::text||':'||name),1,8)||'-'||substr(md5(namespace::text||':'||name),9,4)||'-5'||substr(md5(namespace::text||':'||name),14,3)||'-a'||substr(md5(namespace::text||':'||name),18,3)||'-'||substr(md5(namespace::text||':'||name),21,12))::uuid $;");
  }else{
    await db.exec('create extension if not exists "uuid-ossp" with schema extensions;');
  }
  await db.query('insert into auth.users(id) values($1)',[actor]);
  await db.exec("insert into public.feya_commerce_shops(shop_code,shop_name) values('release-repair-test','Release repair test') on conflict do nothing;");

  const productIds=Array.from({length:207},(_,i)=>uid('1',i+1));
  await db.exec("insert into public.feya_commerce_product_drafts(canonical_product_id,source_shop_code) values "+
    productIds.map(id=>"("+lit(id)+",'release-repair-test')").join(',')+";");

  const mappings=[],configs=[],prices=[];
  let rowNo=0,alignedRemaining=215;
  for(let p=0;p<203;p++){
    const product=productIds[p],rows=p<34?5:4;
    for(let j=0;j<rows;j++){
      rowNo++;
      const map=uid('2',rowNo),price=uid('5',rowNo),cfg=uid('4',rowNo);
      const aligned=alignedRemaining>0; if(aligned)alignedRemaining--;
      const cfgMap=aligned?map:uid('3',rowNo);
      mappings.push([map,product,'configuration','Option '+rowNo]);
      if(!aligned)mappings.push([cfgMap,product,'configuration','Wrong '+rowNo]);
      configs.push([cfg,product,cfgMap,'Current '+rowNo,'current_'+rowNo]);
      prices.push([price,product,cfg,map,100+rowNo/100,null,'not_reviewed','draft']);
    }
  }
  assert.equal(rowNo,846);assert.equal(alignedRemaining,0);

  for(let p=203;p<206;p++){
    const product=productIds[p];
    for(let j=0;j<3;j++){
      rowNo++;
      const map=uid('2',rowNo),price=uid('5',rowNo),cfg=uid('4',rowNo);
      mappings.push([map,product,'color','Color '+j]);
      configs.push([cfg,product,map,'Color '+j,'color_'+j]);
      prices.push([price,product,cfg,map,200+j,null,'not_reviewed','draft']);
    }
  }
  const directProduct=productIds[206];rowNo++;
  const directPrice=uid('5',rowNo),directCfg=uid('4',rowNo);
  configs.push([directCfg,directProduct,null,'Owner Full Set','owner_full_set']);
  prices.push([directPrice,directProduct,directCfg,null,null,460.44,'approved','approved']);
  assert.equal(rowNo,856);

  await db.exec("insert into public.feya_commerce_option_mappings(option_mapping_id,canonical_product_id,detected_canonical_axis,canonical_option_value,raw_option_value,confidence,review_status,sampler_flag,non_catalog_flag) values "+
    mappings.map(([id,p,axis,label])=>"("+[lit(id),lit(p),lit(axis),lit(label),lit(label),"95","'not_reviewed'","false","false"].join(',')+")").join(',')+";");

  await db.exec("insert into public.feya_commerce_sellable_configurations(sellable_configuration_id,canonical_product_id,option_mapping_id,configuration_name,normalized_key,is_public_candidate,is_sampler,review_status) values "+
    configs.map(([id,p,map,name,key])=>"("+[lit(id),lit(p),map?lit(map):"null",lit(name),lit(key),"true","false",map?"'not_reviewed'":"'approved'"].join(',')+")").join(',')+";");

  await db.exec("insert into public.feya_commerce_configuration_prices(configuration_price_id,canonical_product_id,sellable_configuration_id,option_mapping_id,source_amount,source_currency,confidence,fallback_flag,public_price_amount,manual_override_amount,review_status,price_status) values "+
    prices.map(([id,p,cfg,map,amount,manual,review,status])=>"("+[lit(id),lit(p),lit(cfg),map?lit(map):"null",map?String(amount):"null","'EUR'","95","false",String(manual??amount),manual===null?"null":String(manual),lit(review),lit(status)].join(',')+")").join(',')+";");
  return productIds;
}

test('catalog-wide release repair compiles, fails closed before approval, preserves commercial values and fixes 631 bindings',async()=>{
  let db;
  if(nativeURL){
    const c=await connect();
    db={query:(sql,params)=>c.query(sql,params),exec:sql=>c.query(sql),close:()=>c.end()};
    assert.equal((await db.query("select count(*)::int n from pg_tables where schemaname='public'")).rows[0].n,0);
  }else{
    db=new PGlite();
  }
  try{
    await db.exec(await variantDependenciesSQL({pglite:!nativeURL}));
    await ensureExecutionReceiptDependency(db);
    const productIds=await seed(db,{pglite:!nativeURL});
    await db.exec(await migrationSQL());

    await db.query('set role service_role');
    const before=(await db.query('select public.feya_commerce_release_configuration_binding_evidence_v1($1::uuid[]) r',[productIds])).rows[0].r;
    assert.equal(before.release_product_count,207);assert.equal(before.price_row_count,856);
    assert.equal(before.configuration_axis_rows,846);assert.equal(before.aligned_configuration_rows,215);
    assert.equal(before.rebind_rows,631);assert.equal(before.create_configuration_rows,631);
    assert.equal(before.color_price_axis_rows,9);assert.equal(before.direct_owner_rows,1);assert.equal(before.candidate,true);

    const commercialBefore=(await db.query("select configuration_price_id,source_amount,public_price_amount,manual_override_amount,source_currency,review_status,price_status from public.feya_commerce_configuration_prices order by configuration_price_id")).rows;
    const request=(await db.query("select * from public.feya_fn_create_execution_request_v1('REPAIR_RELEASE_CONFIGURATION_BINDINGS','COMMERCE_CONFIGURATION',$1::jsonb,$2::jsonb,$3::jsonb,$4::jsonb,$5::jsonb,'agent',null,$6)",[
      JSON.stringify({entity_type:'RELEASE',entity_key:'feya-review-207-20260924'}),
      JSON.stringify({release_ref:'feya-review-207-20260924',evidence_sha256:before.evidence_sha256}),
      JSON.stringify({contract_version:'release_configuration_binding_repair_v1',release_ref:'feya-review-207-20260924',canonical_product_ids:productIds,evidence_sha256:before.evidence_sha256,expected_price_rows:856,expected_configuration_axis_rows:846,expected_rebind_rows:631,expected_create_configurations:631}),
      JSON.stringify({mode:'explicit_compensating_change'}),
      JSON.stringify({commercial_values_unchanged:true,payment_enabled:false,indexing_enabled:false}),
      'release-repair:'+before.evidence_sha256
    ])).rows[0];

    await assert.rejects(db.query('select public.feya_commerce_execute_release_configuration_binding_repair_v1($1)',[request.execution_request_id]),/not_approved/);
    await db.query('select * from public.feya_fn_approve_execution_request_v1($1,$2,$3,$4)',[request.execution_request_id,'APPROVAL_REQUIRED',actor,'Approve exact synthetic release repair']);
    const result=(await db.query('select public.feya_commerce_execute_release_configuration_binding_repair_v1($1) r',[request.execution_request_id])).rows[0].r;
    assert.equal(result.created_configurations,631);assert.equal(result.rebound_price_rows,631);
    assert.equal(result.color_price_axis_rows_held,9);assert.equal(result.direct_owner_rows_preserved,1);
    assert.equal(result.commercial_values_unchanged,true);assert.equal(result.payment_enabled,false);assert.equal(result.indexing_enabled,false);
    const receipt=(await db.query('select rollback_result_json from public.feya_growth_execution_receipts_v1 where execution_request_id=$1',[request.execution_request_id])).rows[0].rollback_result_json;
    assert.equal(receipt.mode,'restore_sellable_configuration_bindings');assert.equal(receipt.binding_count,631);
    assert.equal(receipt.bindings.length,631);assert.equal(receipt.created_configuration_ids.length,631);
    assert.equal(receipt.commercial_values_unchanged,true);assert.equal(receipt.delete_created_configurations_automatically,false);

    const after=(await db.query('select public.feya_commerce_release_configuration_binding_evidence_v1($1::uuid[]) r',[productIds])).rows[0].r;
    assert.equal(after.already_repaired,true);assert.equal(after.rebind_rows,0);assert.equal(after.aligned_configuration_rows,846);
    assert.equal(after.color_price_axis_rows,9);assert.equal(after.direct_owner_rows,1);
    const commercialAfter=(await db.query("select configuration_price_id,source_amount,public_price_amount,manual_override_amount,source_currency,review_status,price_status from public.feya_commerce_configuration_prices order by configuration_price_id")).rows;
    assert.deepEqual(commercialAfter,commercialBefore);

    const replay=(await db.query('select public.feya_commerce_execute_release_configuration_binding_repair_v1($1) r',[request.execution_request_id])).rows[0].r;
    assert.equal(replay.replayed,true);
    await db.query('reset role');
  }finally{await db.close();}
});
