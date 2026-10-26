-- TheFEYA Search v13: evidence-backed activation GATE REVALIDATION, not release activation.
-- Decision: Human Owner authorised opening live checkout and full 207 PDP search exposure
-- once buyer checkout actually works. A second charged merchandise test is not required:
-- production PayPal LIVE EUR 1 installation capture + real Production browser quote
-- + mocked-PayPal buyer/verified capture flow are separately recorded, NEVER conflated.
-- All 207 approved PDP text/metadata/media/prices/visuals remain immutable.
-- This script explicitly leaves K07 (contracting trader disclosure) and
-- K20 (exact-version/hash owner approval) FAIL. It does not activate Search v13.
-- Evidence:
-- main 87db114e84de4c59ca5d7d23d5ebb086ae56e742
-- production dpl_GhUCGrHKXZrojpXkTrRX22VrbfYo READY
-- production buyer browser job 121896805927 SUCCESS 2026-10-26
-- separate paid PayPal LIVE EUR1 test, customer order simulations 13/13
-- Do not publish these statuses as proof of a real paid merchandise sale.
begin;

do $preflight$
declare
  v12 uuid;
  v13 uuid;
  n int;
begin
  select release_id into strict v12 from public.feya_search_releases_v1
  where release_code='organic-wave-a-20260926'
    and release_version=12 and release_status='ACTIVE';

  select release_id into strict v13 from public.feya_search_releases_v1
  where release_code='organic-wave-a-20260926'
    and release_version=13 and release_status='GATE_FAILED'
    and git_sha is null and release_hash is null
  for update;

  if (select count(*) from public.feya_search_releases_v1 where release_status='ACTIVE')<>1
    then raise exception 'feya_v13_gate_active_release_drift'; end if;

  select count(*) into n from public.feya_search_release_gate_results_v1
  where release_id=v13 and gate_status='FAIL'
    and evidence_json->>'status'='NOT_VALIDATED_FOR_NEW_207_PRODUCT_SCOPE';
  if n<>20 then raise exception 'feya_v13_gate_expected_twenty_unvalidated:%',n; end if;

  if (select count(*) from public.feya_search_release_items_v1 where release_id=v13)<>228
   or (select count(*) from public.feya_search_release_items_v1
       where release_id=v13 and page_type_snapshot='product'
         and intended_index_state='index' and item_role='INDEX_CANDIDATE'
         and page_version_id is not null and content_hash ~ '^[0-9a-f]{64}$')<>207
   or (select count(distinct canonical_product_id) from public.feya_search_release_items_v1
       where release_id=v13 and page_type_snapshot='product')<>207
   or (select count(distinct url_path_snapshot) from public.feya_search_release_items_v1
       where release_id=v13 and page_type_snapshot='product')<>207
   or (select count(*) from public.feya_search_release_items_v1
       where release_id=v13 and page_type_snapshot='landing' and intended_index_state='index')<>18
   or (select count(*) from public.feya_search_release_items_v1
       where release_id=v13 and intended_index_state='noindex')<>3
   then raise exception 'feya_v13_gate_exact_207_product_portfolio_drift'; end if;

  if (select count(*) from public.feya_search_release_items_v1 i
      join public.feya_search_page_versions_v1 v on v.page_version_id=i.page_version_id
        and v.content_hash=i.content_hash
      join public.feya_storefront_approved_product_bindings_v1 b on b.seo_page_id=i.seo_page_id
        and b.content_sha256=v.content_json->>'approved_content_sha256'
      where i.release_id=v13 and i.page_type_snapshot='product')<>207
    then raise exception 'feya_v13_gate_immutable_product_pin_mismatch'; end if;

  if (select count(*) from public.feya_search_release_items_v1
      where release_id=v12 and page_type_snapshot='product' and intended_index_state='noindex')<>207
    then raise exception 'feya_v13_gate_v12_pdp_noindex_drift'; end if;

  if not exists(select 1 from public.feya_pay_provider_v1 p
      where p.id=1 and p.provider_code='seller_online' and p.engine='paypal_checkout'
        and p.active=true and p.environment='live'
        and p.store_key_vault_id is not null and p.payee_email is not null
        and p.credentials_verified_version=p.config_version
        and p.payee_verified_version=p.config_version
        and p.webhook_verified_version=p.config_version
        and p.test_verified_version=p.config_version
        and p.test_environment='live')
    then raise exception 'feya_v13_gate_live_checkout_provider_not_ready'; end if;

  if not exists(select 1 from public.feya_pay_orders_v1 o
      where o.kind='test' and o.status='paid' and o.environment='live'
        and o.currency='EUR' and o.total_minor=100 and o.paid_minor=100)
    then raise exception 'feya_v13_gate_real_eur1_provider_test_missing'; end if;
  if not exists(select 1 from public.feya_growth_gsc_observation_receipts_v1
      where data_state='final' and finalized_through>='2026-10-20'::date)
    then raise exception 'feya_v13_gate_gsc_final_source_stale'; end if;
end $preflight$;

with candidate as (
  select release_id from public.feya_search_releases_v1
  where release_code='organic-wave-a-20260926' and release_version=13
),
truth as (
  select g.release_id,g.gate_code,
   case g.gate_code
    when 'K01' then 'Exact main SHA 87db114e passed 30 GitHub checks; Production redeploy READY.'
    when 'K02' then 'thefeya.com Production redeploy dpl_GhUCGrHKXZrojpXkTrRX22VrbfYo serves exact 87db114e.'
    when 'K03' then 'Candidate contains 207 distinct owner-approved PDPs plus 18 index landings, 3 noindex utilities.'
    when 'K04' then '207 immutable page_version/content_hash records match 207 owner-approved source SHA256 pins.'
    when 'K05' then 'Live shopper can choose product configuration and receive correct server-authoritative checkout quote; 207/856 quote test suite green.'
    when 'K06' then 'Live PayPal config v3 verified with genuine EUR1 installation capture; real website buyer checkout active; 13/13 complete simulated merchandise payment flows pass. No paid physical customer order yet; no extra charge authorised.'
    when 'K08' then 'Existing 18 owner-approved landings unchanged; product scope is 207 individually bound immutable approved PDP pages.'
    when 'K09' then 'Existing canonical collection URLs and storefront product links preserved; no renamed product URLs.'
    when 'K10' then 'Source 207 product names/configurations verified; Production direct browser PDP-add-to-bag-to-server-quote passed.'
    when 'K11' then 'All 207 PDPs have unique immutable release page-version identifiers and SHA256 content pins.'
    when 'K12' then 'Product indexability is controlled by exactly one ACTIVE Search Release; v12 remains ACTIVE and noindex until v13 approval.'
    when 'K13' then 'Sitemap reads only ACTIVE release indexed items at request time; no candidate leakage.'
    when 'K14' then 'New Production smoke and established 24-product Origin crawl both passed; full 207 pin/path unique coverage verified in DB.'
    when 'K15' then 'Existing Product/BreadcrumbList and landing structured data contracts remain unchanged, noninvented.'
    when 'K16' then 'Exact GitHub main code CI 30/30 checks successful, including PostgreSQL 17, provider and browser security.'
    when 'K17' then 'Approved V13 storefront UI and four-block 207 PDP contents, prices and media untouched by payment/search PRs.'
    when 'K18' then 'First-party GSC DAILY final observations persist, GA4 event contracts are consent gated and no analytics claim is invented.'
    when 'K19' then 'GSC domain property was owner-verified at Search v12 activation, newer first-party official GSC receipts exist.'
   end as reason
  from public.feya_search_release_gate_results_v1 g join candidate c on c.release_id=g.release_id
  where g.gate_code not in ('K07','K20')
)
update public.feya_search_release_gate_results_v1 g
set gate_status='PASS',
    evidence_json=g.evidence_json||jsonb_build_object(
      'status','REVALIDATED_FOR_NEW_207_PRODUCT_SCOPE',
      'evidence_kind','CHECKED_PRODUCTION_SOURCE_AND_EXACT_CI',
      'verification_reason',t.reason,
      'git_sha','87db114e84de4c59ca5d7d23d5ebb086ae56e742',
      'deployment_id','dpl_GhUCGrHKXZrojpXkTrRX22VrbfYo',
      'production_payment_browser_job',121896805927,
      'no_additional_money_captured',true,
      'live_provider_test_paid',true,
      'actual_paid_customer_order_claimed',false,
      'user_approved_no_repeat_goods_charge',true,
      'human_owner_approval_required',false,
      'automatic_activation',false),
    evaluated_at=now()
from truth t
where g.release_id=t.release_id and g.gate_code=t.gate_code and g.gate_status='FAIL';

with candidate as (
 select release_id from public.feya_search_releases_v1
 where release_code='organic-wave-a-20260926' and release_version=13
)
update public.feya_search_release_gate_results_v1 g
set evidence_json=g.evidence_json||jsonb_build_object(
     'status',case when gate_code='K07' then 'CURRENT_TRANSACTION_TRADER_IDENTITY_UNCONFIRMED'
                  else 'EXACT_FINAL_RELEASE_HASH_OWNER_APPROVAL_NOT_YET_BOUND' end,
     'reason',case when gate_code='K07'
       then 'Seller Online 2026-10-15 general agreement says client remains seller. TheFEYA public Terms identify payment recipient, not a confirmed named contracting trader for this custom website. A historical 2021 unsigned FOP purchase agreement expired 2025-12-31, cannot prove current reseller terms.'
       else 'After K07 is resolved, bind the immutable current 207-scope release hash and exact tested Git SHA and obtain Human Owner version-matched release approval through existing Execution Gateway.' end,
     'commercial_pricing_changed',false,
     'additional_tax_charged_to_buyer',false,
     'automatic_activation',false,
     'human_owner_approval_required',true),
    evaluated_at=now()
from candidate c where c.release_id=g.release_id
  and g.gate_code in ('K07','K20') and g.gate_status='FAIL';

update public.feya_search_releases_v1 r
set gate_summary_json=r.gate_summary_json||jsonb_build_object(
  'overall','FAIL',
  'pass_count',18,
  'fail_count',2,
  'excluded_approved_count',0,
  'v13_real_production_checkout_enabled',true,
  'live_paypal_installation_payment_verified',true,
  'no_paid_customer_merchandise_purchase_claimed',true,
  'owner_scope_approved',true,
  'still_pending_gate_codes',jsonb_build_array('K07','K20'),
  'gate_evidence_sha','87db114e84de4c59ca5d7d23d5ebb086ae56e742',
  'verified_deployment_id','dpl_GhUCGrHKXZrojpXkTrRX22VrbfYo'),
  updated_at=now()
where r.release_code='organic-wave-a-20260926' and r.release_version=13
  and r.release_status='GATE_FAILED'
  and r.release_hash is null and r.git_sha is null;

do $postflight$
declare v13 uuid;
begin
 select release_id into strict v13 from public.feya_search_releases_v1
 where release_code='organic-wave-a-20260926' and release_version=13
   and release_status='GATE_FAILED' and release_hash is null and git_sha is null;
 if (select count(*) from public.feya_search_release_gate_results_v1
     where release_id=v13 and gate_status='PASS')<>18
 or (select count(*) from public.feya_search_release_gate_results_v1
     where release_id=v13 and gate_status='FAIL' and gate_code in ('K07','K20'))<>2
 or (select count(*) from public.feya_search_releases_v1 where release_status='ACTIVE')<>1
 or not exists(select 1 from public.feya_search_releases_v1
     where release_version=12 and release_status='ACTIVE')
 then raise exception 'feya_v13_evidence_postflight_conflict'; end if;
end $postflight$;
commit;
