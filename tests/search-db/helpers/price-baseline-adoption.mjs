import { readFile } from 'node:fs/promises';
import { variantDependenciesSQL,seedVariantProduct,variantTestIds } from './variant-draft.mjs';

export const priceBaselineMigrationSQL=()=>readFile(new URL('../../../supabase/migrations/20260925170000_price_baseline_adoption_v1.sql',import.meta.url),'utf8');
export const priceBaselineStructuralGuardSQL=()=>readFile(new URL('../../../supabase/migrations/20260925213000_price_baseline_structural_guard_v1.sql',import.meta.url),'utf8');
export {variantDependenciesSQL,seedVariantProduct,variantTestIds};

export async function seedPriceProvenance(db){
  const i=variantTestIds;
  const batch='71000000-0000-4000-8000-000000000041';
  const source='72000000-0000-4000-8000-000000000041';
  const mapping='73000000-0000-4000-8000-000000000041';
  await db.query("insert into public.feya_commerce_import_batches(import_batch_id,source_type,shop_code,file_name) values($1,'other','variant-test','synthetic-price-baseline') on conflict do nothing",[batch]);
  await db.query("insert into public.feya_commerce_source_price_rows(source_price_row_id,import_batch_id,shop_code,parsed_price_amount,currency,price_source,confidence) values($1,$2,'variant-test',123.45,'EUR','synthetic',100) on conflict do nothing",[source,batch]);
  await db.query("insert into public.feya_commerce_option_mappings(option_mapping_id,canonical_product_id,source_price_row_id,detected_canonical_axis,confidence,sampler_flag,non_catalog_flag) values($1,$2,$3,'configuration',100,false,false) on conflict do nothing",[mapping,i.product,source]);
  await db.query("update public.feya_commerce_option_mappings set detected_canonical_axis='configuration',confidence=100,sampler_flag=false,non_catalog_flag=false where option_mapping_id=$1",[mapping]);
  await db.query("update public.feya_commerce_configuration_prices set option_mapping_id=$1,source_price_row_id=$2,source_amount=123.45,public_price_amount=123.45,manual_override_amount=null,source_currency='EUR',confidence=95,fallback_flag=false,review_status='not_reviewed',price_status='draft' where configuration_price_id=$3",[mapping,source,i.config]);
  await db.query("update public.feya_commerce_sellable_configurations set option_mapping_id=$2,review_status='not_reviewed',is_public_candidate=true,is_sampler=false where sellable_configuration_id=$1",[i.parent,mapping]);
}

export async function ensureExecutionReceiptDependency(db){
  await db.exec(`
    create table if not exists public.feya_growth_execution_receipts_v1(
      execution_receipt_id uuid primary key default gen_random_uuid(),
      execution_request_id uuid not null references public.feya_growth_execution_requests_v1(execution_request_id) on delete cascade,
      attempt_no integer not null check(attempt_no>0),
      receipt_status text not null check(receipt_status in ('STARTED','SUCCEEDED','FAILED','ROLLED_BACK')),
      executor_id text not null,
      request_hash text not null,
      result_json jsonb not null default '{}'::jsonb,
      postflight_result_json jsonb not null default '{}'::jsonb,
      rollback_result_json jsonb not null default '{}'::jsonb,
      error_code text,
      error_message text,
      started_at timestamptz not null default now(),
      completed_at timestamptz,
      created_at timestamptz not null default now(),
      unique(execution_request_id,attempt_no)
    );
    alter table public.feya_growth_execution_receipts_v1 enable row level security;
    revoke all on public.feya_growth_execution_receipts_v1 from public,anon,authenticated;
    grant select,insert,update,delete on public.feya_growth_execution_receipts_v1 to service_role;
  `);
}
