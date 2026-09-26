import test from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import pg from 'pg';
import {readFile} from 'node:fs/promises';
import {variantDependenciesSQL} from './helpers/variant-draft.mjs';
import {ensureExecutionReceiptDependency} from './helpers/price-baseline-adoption.mjs';

const migrationSQL=()=>readFile(new URL('../../supabase/migrations/20260926090000_color_price_lane_governance_v1.sql',import.meta.url),'utf8');
const nativeURL=process.env.FEYA_TEST_DATABASE_URL;
const actor='70000000-0000-4000-8000-000000000101';
const products=[
  '7cf4ea37-cd11-4203-860c-7eed4ae965ba',
  '882793f6-15ca-4617-a579-5cd47290ce72',
  'de38a842-37c4-40a7-86b4-393341c4c9aa',
];
const fixtures=[
  {
    product:products[0],existingConfig:'763a7e7b-b6ba-4b4f-a5ea-ce166d751f65',alignedMap:'0fdce36a-e9f6-4dd3-823a-48c6c1b289e8',
    rows:[
      ['12298554-1ab7-4071-a222-3ff871a44a2e','537412d8-11eb-4c58-9824-e33c324c9db0','Черный',120.69],
      ['27d80896-cc1e-4c7e-8e85-204a686e317f','0fdce36a-e9f6-4dd3-823a-48c6c1b289e8','Зеленый',131.25],
      ['66058dbc-f8ed-4189-ba0e-464204df96df','57bddf8c-6206-4b23-bc97-9dbe88bdd855','Коричневый',141.83],
    ]
  },
  {
    product:products[1],existingConfig:'b5b9e545-c862-4793-b3d8-c48557db5da7',alignedMap:'6a5eff7d-7fd1-4db6-af00-794859f5ef1c',
    rows:[
      ['ac83c38f-b1b7-420f-b0a9-7ff5b7eb3b4a','6a5eff7d-7fd1-4db6-af00-794859f5ef1c','Черный',120.69],
      ['86d29b33-ef45-49cf-8682-a7685f4596bf','900a8496-30f8-4908-93a8-90502bc20d60','Зеленый',131.25],
      ['9cf4b355-2c03-4c05-b5ba-2ca8c49ab572','bca7937b-9f7e-43e0-ba19-e41ea1e3e1ca','Коричневый',147.11],
    ]
  },
  {
    product:products[2],existingConfig:'1a194363-9383-4746-9766-5474daab26f0',alignedMap:'12fa4679-9152-4e77-bd02-4c7f3c59363f',
    rows:[
      ['e689d3b4-acc1-4fa2-ad12-4463207fcdd9','7d19a35e-ab4d-4410-b790-4e300ff4c586','Черный',130.35],
      ['9a3cd61f-e87f-4590-b39f-b143e75ca0f7','12fa4679-9152-4e77-bd02-4c7f3c59363f','Зеленый',140.01],
      ['4b56be10-1771-4a5c-9daa-6ae70e8650f0','82047520-818e-4228-86f9-640bb7ec94f3','Коричневый',159.31],
    ]
  },
];

async function connect(){
  const u=new URL(nativeURL);assert.ok(['localhost','127.0.0.1'].includes(u.hostname));assert.equal(u.pathname,'/feya_test');
  const c=new pg.Client({connectionString:nativeURL,statement_timeout:30000,connectionTimeoutMillis:5000});await c.connect();return c;
}
async function service(db,fn){await db.query('set role service_role');try{return await fn();}finally{await db.query('reset role');}}

async function seed(db,{pglite=false}={}){
  if(pglite){
    await db.exec("create function extensions.uuid_generate_v5(namespace uuid,name text) returns uuid language sql immutable strict as $body$ select (substr(md5(namespace::text||':'||name),1,8)||'-'||substr(md5(namespace::text||':'||name),9,4)||'-5'||substr(md5(namespace::text||':'||name),14,3)||'-a'||substr(md5(namespace::text||':'||name),18,3)||'-'||substr(md5(namespace::text||':'||name),21,12))::uuid $body$;");
  }else{
    await db.exec('create extension if not exists "uuid-ossp" with schema extensions;');
  }
  await db.query('insert into auth.users(id) values($1)',[actor]);
  await db.exec("insert into public.feya_commerce_shops(shop_code,shop_name) values('color-price-test','Color price test') on conflict do nothing;");
  for(const p of products)await db.query("insert into public.feya_commerce_product_drafts(canonical_product_id,source_shop_code) values($1,'color-price-test')",[p]);
  for(const fixture of fixtures){
    for(const [,map,label] of fixture.rows){
      await db.query(`insert into public.feya_commerce_option_mappings(
        option_mapping_id,canonical_product_id,raw_option_name,raw_option_value,detected_canonical_axis,
        canonical_option_value,confidence,review_status,sampler_flag,non_catalog_flag
      ) values($1,$2,'Основной цвет',$3,'color',$3,95,'not_reviewed',false,false)`,[map,fixture.product,label]);
    }
    const alignedLabel=fixture.rows.find(r=>r[1]===fixture.alignedMap)[2];
    await db.query(`insert into public.feya_commerce_sellable_configurations(
      sellable_configuration_id,canonical_product_id,option_mapping_id,configuration_name,normalized_key,
      is_public_candidate,is_sampler,review_status
    ) values($1,$2,$3,$4,'whole_product',true,false,'not_reviewed')`,
      [fixture.existingConfig,fixture.product,fixture.alignedMap,alignedLabel]);
    for(const [price,map,,amount] of fixture.rows){
      await db.query(`insert into public.feya_commerce_configuration_prices(
        configuration_price_id,canonical_product_id,sellable_configuration_id,option_mapping_id,
        source_amount,source_currency,confidence,fallback_flag,sampler_excluded_flag,
        public_price_amount,manual_override_amount,review_status,price_status
      ) values($1,$2,$3,$4,$5,'EUR',95,false,false,$5,null,'not_reviewed','draft')`,
        [price,fixture.product,fixture.existingConfig,map,amount]);
    }
  }
}

test('three-product color-price lane stays exact, waits for release repair, and becomes quote-ready without changing amounts',async()=>{
  let db;
  if(nativeURL){
    const c=await connect();db={query:(s,p)=>c.query(s,p),exec:s=>c.query(s),close:()=>c.end()};
    assert.equal((await db.query("select count(*)::int n from pg_tables where schemaname='public'")).rows[0].n,0);
  }else db=new PGlite();
  try{
    await db.exec(await variantDependenciesSQL({pglite:!nativeURL}));
    await ensureExecutionReceiptDependency(db);
    await seed(db,{pglite:!nativeURL});
    await db.exec(await migrationSQL());

    const before=await service(db,async()=> (await db.query('select public.feya_commerce_color_price_lane_evidence_v1() r')).rows[0].r);
    assert.equal(before.product_count,3);assert.equal(before.price_rows,9);assert.equal(before.color_axis_rows,9);
    assert.equal(before.exact_source_rows,9);assert.equal(before.recognized_color_rows,9);
    assert.equal(before.target_aligned_rows,3);assert.equal(before.target_create_rows,6);
    assert.equal(before.target_conflict_rows,0);assert.equal(before.candidate,true);assert.equal(before.already_ready,false);

    const commercialBefore=(await db.query("select configuration_price_id,source_amount,public_price_amount,manual_override_amount,source_currency from public.feya_commerce_configuration_prices order by configuration_price_id")).rows;
    const prepared=await service(db,async()=> (await db.query(
      "select * from public.feya_fn_create_execution_request_v1('ADOPT_COLOR_PRICE_LANE_GOVERNANCE','COMMERCE_PRICE',$1::jsonb,$2::jsonb,$3::jsonb,$4::jsonb,$5::jsonb,'agent',null,$6)",[
        JSON.stringify({entity_type:'PRODUCT_SET',entity_key:'color-price-lane',canonical_product_ids:products}),
        JSON.stringify({release_ref:'feya-review-207-20260924',evidence_sha256:before.evidence_sha256}),
        JSON.stringify({contract_version:'color_price_lane_governance_v1',release_ref:'feya-review-207-20260924',
          canonical_product_ids:products,evidence_sha256:before.evidence_sha256,commercial_values_sha256:before.commercial_values_sha256,
          expected_products:3,expected_price_rows:9,expected_create_configurations:6}),
        JSON.stringify({mode:'explicit_compensating_change'}),
        JSON.stringify({strict_ready_rows:9,commercial_values_unchanged:true,payment_enabled:false,indexing_enabled:false}),
        'color-price-lane:'+before.evidence_sha256
      ])).rows[0]);

    await service(db,()=>assert.rejects(
      db.query('select public.feya_commerce_execute_color_price_lane_governance_v1($1)',[prepared.execution_request_id]),
      /not_approved/
    ));
    await service(db,()=>db.query('select * from public.feya_fn_approve_execution_request_v1($1,$2,$3,$4)',
      [prepared.execution_request_id,'APPROVAL_REQUIRED',actor,'Approve exact color-price lane']));
    await service(db,()=>assert.rejects(
      db.query('select public.feya_commerce_execute_color_price_lane_governance_v1($1)',[prepared.execution_request_id]),
      /release_repair_required/
    ));

    const releaseReq=await service(db,async()=> (await db.query(
      "select * from public.feya_fn_create_execution_request_v1('REPAIR_RELEASE_CONFIGURATION_BINDINGS','COMMERCE_CONFIGURATION',$1::jsonb,'{}'::jsonb,'{}'::jsonb,'{}'::jsonb,'{}'::jsonb,'agent',null,$2)",[
        JSON.stringify({entity_type:'RELEASE',entity_key:'feya-review-207-20260924'}),
        'synthetic-release-repair-complete'
      ])).rows[0]);
    await service(db,()=>db.query('update public.feya_growth_execution_requests_v1 set request_status=\'SUCCEEDED\' where execution_request_id=$1',[releaseReq.execution_request_id]));

    const result=await service(db,async()=> (await db.query(
      'select public.feya_commerce_execute_color_price_lane_governance_v1($1) r',[prepared.execution_request_id]
    )).rows[0].r);
    assert.equal(result.product_count,3);assert.equal(result.price_rows,9);
    assert.equal(result.created_configurations,6);assert.equal(result.rebound_price_rows,6);
    assert.equal(result.approved_configurations,9);assert.equal(result.approved_price_rows,9);
    assert.equal(result.commercial_values_unchanged,true);
    assert.equal(result.variant_color_binding_required,true);assert.equal(result.cartesian_expansion_allowed,false);
    assert.equal(result.payment_enabled,false);assert.equal(result.indexing_enabled,false);

    const after=await service(db,async()=> (await db.query('select public.feya_commerce_color_price_lane_evidence_v1() r')).rows[0].r);
    assert.equal(after.strict_ready_rows,9);assert.equal(after.already_ready,true);assert.equal(after.candidate,false);
    const commercialAfter=(await db.query("select configuration_price_id,source_amount,public_price_amount,manual_override_amount,source_currency from public.feya_commerce_configuration_prices order by configuration_price_id")).rows;
    assert.deepEqual(commercialAfter,commercialBefore);

    const replay=await service(db,async()=> (await db.query(
      'select public.feya_commerce_execute_color_price_lane_governance_v1($1) r',[prepared.execution_request_id]
    )).rows[0].r);
    assert.equal(replay.replayed,true);
    assert.equal((await db.query('select count(*)::int n from public.feya_growth_execution_receipts_v1 where execution_request_id=$1',[prepared.execution_request_id])).rows[0].n,1);
  }finally{await db.close();}
});
