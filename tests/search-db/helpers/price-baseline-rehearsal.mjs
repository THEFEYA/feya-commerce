import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import {
  variantDependenciesSQL,
  ensureExecutionReceiptDependency,
  priceBaselineMigrationSQL,
} from './price-baseline-adoption.mjs';

export { variantDependenciesSQL, ensureExecutionReceiptDependency, priceBaselineMigrationSQL };

function uuidFrom(label){
  const hex=createHash('sha256').update(label).digest('hex').slice(0,32).split('');
  hex[12]='4';
  hex[16]=((parseInt(hex[16],16)&0x3)|0x8).toString(16);
  const s=hex.join('');
  return `${s.slice(0,8)}-${s.slice(8,12)}-${s.slice(12,16)}-${s.slice(16,20)}-${s.slice(20)}`;
}

export async function loadRehearsalRelease(){
  const release=JSON.parse(await readFile(new URL('../../../docs/search/closed-review-source-manifest-20260924.json',import.meta.url),'utf8'));
  const audit=JSON.parse(await readFile(new URL('../../../docs/search/price-baseline-audit-manifest-20260925.json',import.meta.url),'utf8'));
  const manual=new Set(audit.manual_override_product_ids||[]);
  const entries=(release.entries||[]).filter(e=>!manual.has(e?.identity?.canonical_product_id));
  const priceRows=entries.flatMap(e=>(e.product?.configurations||[]).map(c=>({
    canonical_product_id:e.identity.canonical_product_id,
    configuration_price_id:c.configuration_id,
    sellable_configuration_id:c.sellable_configuration_id,
    label:c.public_label||c.component_code||'Option',
    amount:Number(c.display_price_amount ?? c.base_price_amount),
    currency:c.currency||'EUR',
  })));
  return { release,audit,entries,priceRows };
}

async function bulkInsert(db,table,columns,rows,chunkSize=100){
  for(let start=0;start<rows.length;start+=chunkSize){
    const chunk=rows.slice(start,start+chunkSize);
    const params=[];
    const values=chunk.map((row,i)=>{
      const base=i*columns.length;
      for(const c of columns) params.push(row[c] ?? null);
      return '('+columns.map((_,j)=>'$'+(base+j+1)).join(',')+')';
    }).join(',');
    await db.query(`insert into public.${table}(${columns.join(',')}) values ${values}`,params);
  }
}

export async function seedFullPriceBaselineRehearsal(db){
  const {audit,entries,priceRows}=await loadRehearsalRelease();
  if(entries.length!==audit.counts.clean_source_products) throw new Error('rehearsal_product_count_mismatch');
  if(priceRows.length!==audit.counts.clean_source_price_rows) throw new Error('rehearsal_price_row_count_mismatch');

  const shop='rehearsal-release';
  const batch='74000000-0000-4000-8000-000000000041';
  await db.query("insert into public.feya_commerce_shops(shop_code,shop_name) values($1,'Isolated launch rehearsal') on conflict do nothing",[shop]);
  await db.query("insert into public.feya_commerce_import_batches(import_batch_id,source_type,shop_code,file_name) values($1,'other',$2,'isolated-launch-rehearsal')",[batch,shop]);

  await bulkInsert(db,'feya_commerce_product_drafts',
    ['canonical_product_id','source_shop_code'],
    entries.map(e=>({canonical_product_id:e.identity.canonical_product_id,source_shop_code:shop}))
  );

  const configMap=new Map();
  for(const row of priceRows){
    if(!configMap.has(row.sellable_configuration_id)){
      configMap.set(row.sellable_configuration_id,{
        sellable_configuration_id:row.sellable_configuration_id,
        canonical_product_id:row.canonical_product_id,
        configuration_name:'Rehearsal '+row.label,
        normalized_key:'rehearsal-'+row.sellable_configuration_id,
        is_sampler:false,
        is_public_candidate:true,
        review_status:'not_reviewed',
      });
    }
  }
  await bulkInsert(db,'feya_commerce_sellable_configurations',
    ['sellable_configuration_id','canonical_product_id','configuration_name','normalized_key','is_sampler','is_public_candidate','review_status'],
    [...configMap.values()]
  );

  const sourceRows=priceRows.map(row=>({
    source_price_row_id:uuidFrom('source:'+row.configuration_price_id),
    import_batch_id:batch,
    shop_code:shop,
    raw_option_text:row.label,
    parsed_price_amount:row.amount,
    currency:row.currency,
    price_source:'isolated_rehearsal',
    confidence:100,
    fallback_flag:false,
    sampler_non_catalog_flag:false,
    review_status:'not_reviewed',
  }));
  await bulkInsert(db,'feya_commerce_source_price_rows',
    ['source_price_row_id','import_batch_id','shop_code','raw_option_text','parsed_price_amount','currency','price_source','confidence','fallback_flag','sampler_non_catalog_flag','review_status'],
    sourceRows
  );

  const mappings=priceRows.map((row,i)=>({
    option_mapping_id:uuidFrom('mapping:'+row.configuration_price_id),
    canonical_product_id:row.canonical_product_id,
    source_price_row_id:sourceRows[i].source_price_row_id,
    raw_option_text:row.label,
    detected_canonical_axis:'configuration',
    canonical_option_value:row.label,
    confidence:100,
    review_status:'not_reviewed',
    sampler_flag:false,
    non_catalog_flag:false,
    mapping_source:'isolated_rehearsal',
  }));
  await bulkInsert(db,'feya_commerce_option_mappings',
    ['option_mapping_id','canonical_product_id','source_price_row_id','raw_option_text','detected_canonical_axis','canonical_option_value','confidence','review_status','sampler_flag','non_catalog_flag','mapping_source'],
    mappings
  );

  await bulkInsert(db,'feya_commerce_configuration_prices',
    ['configuration_price_id','canonical_product_id','sellable_configuration_id','option_mapping_id','source_price_row_id','source_amount','source_currency','confidence','fallback_flag','sampler_excluded_flag','public_price_amount','manual_override_amount','review_status','price_status'],
    priceRows.map((row,i)=>({
      configuration_price_id:row.configuration_price_id,
      canonical_product_id:row.canonical_product_id,
      sellable_configuration_id:row.sellable_configuration_id,
      option_mapping_id:mappings[i].option_mapping_id,
      source_price_row_id:sourceRows[i].source_price_row_id,
      source_amount:row.amount,
      source_currency:row.currency,
      confidence:95,
      fallback_flag:false,
      sampler_excluded_flag:false,
      public_price_amount:row.amount,
      manual_override_amount:null,
      review_status:'not_reviewed',
      price_status:'draft',
    }))
  );

  return {
    audit,
    productIds:entries.map(e=>e.identity.canonical_product_id).sort(),
    priceRows,
  };
}

export async function commercialValueFingerprint(db){
  const {rows}=await db.query(`
    select configuration_price_id,canonical_product_id,sellable_configuration_id,
           source_amount,public_price_amount,manual_override_amount,source_currency,
           option_mapping_id,source_price_row_id
    from public.feya_commerce_configuration_prices
    order by configuration_price_id
  `);
  return createHash('sha256').update(JSON.stringify(rows)).digest('hex');
}
