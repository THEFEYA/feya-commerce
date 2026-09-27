import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { variantDependenciesSQL, variantMigrationSQL, seedVariantProduct, variantDraftRequest, variantTestIds } from './variant-draft.mjs';

export const commerceQuoteMigrationSQL = () => readFile(new URL('../../../supabase/migrations/20260925123000_commerce_quote_receipt_v1.sql', import.meta.url), 'utf8');
export { variantDependenciesSQL, variantMigrationSQL, seedVariantProduct, variantTestIds };

export async function prepareVariantIdentity(db, actor) {
  const service = async fn => { await db.query('set role service_role'); try { return await fn(); } finally { await db.query('reset role'); } };
  const context = await service(async()=> (await db.query('select public.feya_commerce_read_variant_draft_v1($1) result',[variantTestIds.product])).rows[0].result);
  const payload = variantDraftRequest(context, randomUUID());
  const receipt = await service(async()=> (await db.query('select public.feya_commerce_save_variant_draft_v1($1,$2::jsonb) result',[actor,JSON.stringify(payload)])).rows[0].result);
  return { context, payload, receipt };
}

export async function seedApprovedOfferProjection(db, { offerRevisionId, priceQuoteId, offerRevision = 1, status = 'active', maxQuantity = 4 } = {}) {
  const i=variantTestIds;
  offerRevisionId ||= '80000000-0000-4000-8000-000000000041';
  priceQuoteId ||= '90000000-0000-4000-8000-000000000041';
  await db.query(`insert into public.feya_commerce_offer_revisions_v1(
    offer_revision_id,canonical_product_id,offer_revision,product_revision,release_ref,approval_ref,status,max_quantity_per_line,snapshot_sha256)
    values($1,$2,$3,1,'synthetic-release','synthetic-approved-offer',$4,$5,$6)`,
    [offerRevisionId,i.product,offerRevision,status,maxQuantity,'a'.repeat(64)]);
  await db.query(`insert into public.feya_commerce_offer_variant_items_v1(
    offer_revision_id,canonical_product_id,variant_id,configuration_price_id,color_id,size_id,item_status,
    price_quote_id,price_revision,amount_minor,currency,price_source,price_evidence_ref)
    values($1,$2,$3,$4,$5,null,'active',$6,1,12345,'EUR','configuration_base','synthetic-approved-price')`,
    [offerRevisionId,i.product,i.variant,i.config,i.gold,priceQuoteId]);
  return { offerRevisionId, priceQuoteId };
}
