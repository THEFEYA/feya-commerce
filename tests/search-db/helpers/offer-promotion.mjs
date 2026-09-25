import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import {
  variantDependenciesSQL,variantMigrationSQL,seedVariantProduct,variantDraftRequest,variantTestIds,
} from './variant-draft.mjs';
import { commerceQuoteMigrationSQL } from './commerce-quote.mjs';

export const offerPromotionMigrationSQL=()=>readFile(new URL('../../../supabase/migrations/20260925143000_commerce_offer_promotion_v1.sql',import.meta.url),'utf8');
export {variantDependenciesSQL,variantMigrationSQL,seedVariantProduct,variantTestIds,commerceQuoteMigrationSQL};

export async function saveBaseVariant(db,actor){
  const service=async fn=>{await db.query('set role service_role');try{return await fn();}finally{await db.query('reset role');}};
  const ctx=await service(async()=> (await db.query('select public.feya_commerce_read_variant_draft_v1($1) r',[variantTestIds.product])).rows[0].r);
  const p=variantDraftRequest(ctx,randomUUID());
  const receipt=await service(async()=> (await db.query('select public.feya_commerce_save_variant_draft_v1($1,$2::jsonb) r',[actor,JSON.stringify(p)])).rows[0].r);
  return{payload:p,receipt};
}
export async function approveBaseConfiguration(db){
  const i=variantTestIds;
  await db.query("update public.feya_commerce_sellable_configurations set review_status='approved' where sellable_configuration_id=$1",[i.parent]);
  await db.query("update public.feya_commerce_configuration_prices set review_status='approved',price_status='approved',fallback_flag=false,public_price_amount=123.45,source_currency='EUR' where configuration_price_id=$1",[i.config]);
}
