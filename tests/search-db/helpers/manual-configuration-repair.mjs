import { readFile } from 'node:fs/promises';
import { variantDependenciesSQL } from './variant-draft.mjs';
import { ensureExecutionReceiptDependency } from './price-baseline-adoption.mjs';

export {variantDependenciesSQL,ensureExecutionReceiptDependency};
export const repairMigrationSQL=()=>readFile(new URL('../../../supabase/migrations/20260925193000_manual_configuration_binding_repair_v1.sql',import.meta.url),'utf8');

export const ids={
  p057:'057fbd51-52f5-4404-b126-e5d75b8599f4',
  p560:'5602d557-9d98-454b-bc98-9b9ea84b442f',
  maleCfg:'7f0afd2b-8dbd-41a8-a1de-424404d80b95',
  coupleFullCfg:'fcc1bf40-861a-4c6f-aa3c-bc2c7bd8e13e',
  topCfg:'06f7f6ac-b9a2-477a-b0cb-836017cf7e13',
  femaleCfg:'16832d7d-3d43-4384-a09a-ebe847f46f33',
  skirtCfg:'017451ec-bb37-4ad9-a307-9a59de3412c0',
  full560Cfg:'9b90382e-cacc-4f29-b2e3-8c7d71ce1dea',
  malePrice:'aefa2c61-c430-4675-9964-9cd1e3f1658e',
  femalePrice:'5074ad3c-af6a-4cf7-9624-ce351ee9cafc',
  coupleFullPrice:'26274d0c-81c9-44e6-9ce7-c3056c62040c',
  skirtPrice:'25d14147-338b-4ce9-9254-aa41f6333c00',
  topPrice:'613d93e8-5499-471e-a0e2-e4977d5e2b60',
  full560Price:'48f92e5d-bff1-47ec-89f8-b026b77e3cb9',
  maleMap:'df5c0538-4de2-48a2-9df8-76ffac6bc509',
  femaleMap:'e2792946-b1d4-45e8-8026-cfca80be7778',
  skirtMap:'5c8ad41e-e5a6-4ded-ab1e-ef376ae59226',
  topMap:'1aa8d040-1155-493b-ab71-71b4e49a5e61',
  full560Map:'41149ec4-0681-47af-9030-cc6d529321ba',
};
const sourceIds={
  male:'ae3070cd-ab93-54e2-8878-9a721f23b403',
  female:'61851846-09c2-5c8e-bc77-f26a0f883aa0',
  skirt:'efbda525-08e4-5d51-b5b6-b0f97dee5645',
  top:'269a2b6a-d176-5b01-9756-a612ffafe3b6',
  full560:'e151648b-1652-5082-9b69-4f35fe13d28f',
};

export async function seedManualRepairFixture(db){
  const i=ids,batch='75000000-0000-4000-8000-000000000041';
  await db.query("insert into public.feya_commerce_shops(shop_code,shop_name) values('repair-test','Repair test') on conflict do nothing");
  await db.query("insert into public.feya_commerce_import_batches(import_batch_id,source_type,shop_code,file_name) values($1,'other','repair-test','repair-fixture')",[batch]);
  await db.query("insert into public.feya_commerce_product_drafts(canonical_product_id,source_shop_code) values($1,'repair-test'),($2,'repair-test')",[i.p057,i.p560]);
  const sources=[
    [sourceIds.male,'Мужская одежда',183.44],[sourceIds.female,'Женский наряд',327],
    [sourceIds.skirt,'Юбка',135.10],[sourceIds.top,'Верх и плечи',154.41],[sourceIds.full560,'Полный комплект',164.06],
  ];
  for(const [id,label,amount] of sources)await db.query(
    "insert into public.feya_commerce_source_price_rows(source_price_row_id,import_batch_id,shop_code,raw_option_name,raw_option_value,raw_option_text,parsed_price_amount,currency,price_source,confidence) values($1,$2,'repair-test','Выберите свой набор',$3,$3,$4,'EUR','fixture',95)",
    [id,batch,label,amount]
  );
  const maps=[
    [i.maleMap,i.p057,sourceIds.male,'Мужская одежда'],
    [i.femaleMap,i.p057,sourceIds.female,'Женский наряд'],
    [i.skirtMap,i.p560,sourceIds.skirt,'Юбка'],
    [i.topMap,i.p560,sourceIds.top,'Верх и плечи'],
    [i.full560Map,i.p560,sourceIds.full560,'Полный комплект'],
  ];
  for(const [id,product,source,label] of maps)await db.query(
    "insert into public.feya_commerce_option_mappings(option_mapping_id,canonical_product_id,source_price_row_id,raw_option_name,raw_option_value,raw_option_text,detected_canonical_axis,canonical_option_value,confidence,review_status) values($1,$2,$3,'Выберите свой набор',$4,$4,'configuration',$4,95,'not_reviewed')",
    [id,product,source,label]
  );
  await db.query("insert into public.feya_commerce_sellable_configurations(sellable_configuration_id,canonical_product_id,option_mapping_id,configuration_name,normalized_key,is_default_whole_product,is_public_candidate,sort_order,review_status) values($1,$2,$3,'Мужская одежда','whole_product',false,true,2,'not_reviewed'),($4,$2,null,'Full Set','full_set_couple_owner_20260917',true,true,3,'approved'),($5,$6,$7,'Верх и плечи','whole_product',false,true,1,'not_reviewed')",
    [i.maleCfg,i.p057,i.maleMap,i.coupleFullCfg,i.topCfg,i.p560,i.topMap]);
  const prices=[
    [i.malePrice,i.p057,i.maleCfg,i.maleMap,sourceIds.male,183.44,183.44,null,'not_reviewed','draft'],
    [i.femalePrice,i.p057,i.maleCfg,i.femaleMap,sourceIds.female,327,327,null,'not_reviewed','draft'],
    [i.coupleFullPrice,i.p057,i.coupleFullCfg,null,null,null,460.44,460.44,'approved','approved'],
    [i.skirtPrice,i.p560,i.topCfg,i.skirtMap,sourceIds.skirt,135.10,135.10,null,'not_reviewed','draft'],
    [i.topPrice,i.p560,i.topCfg,i.topMap,sourceIds.top,154.41,154.41,null,'not_reviewed','draft'],
    [i.full560Price,i.p560,i.topCfg,i.full560Map,sourceIds.full560,164.06,260,260,'approved','owner_reviewed'],
  ];
  for(const row of prices)await db.query(
    "insert into public.feya_commerce_configuration_prices(configuration_price_id,canonical_product_id,sellable_configuration_id,option_mapping_id,source_price_row_id,source_amount,source_currency,confidence,fallback_flag,public_price_amount,manual_override_amount,review_status,price_status) values($1,$2,$3,$4,$5,$6,'EUR',95,false,$7,$8,$9,$10)",
    row
  );
}
