-- Phase F trust shell: register existing and newly added trust/support pages.
-- All remain noindex until legal identity/Terms/Privacy and selective release gates are complete.
begin;

with pages(url_path,canonical_url,metadata_json) as (
  values
    ('/about'::text,'https://thefeya.com/about'::text,'{"phase":"F","role":"about_atelier","index_authorized":false}'::jsonb),
    ('/size-guide','https://thefeya.com/size-guide','{"phase":"F","role":"measurements_size_guide","index_authorized":false}'::jsonb),
    ('/care','https://thefeya.com/care','{"phase":"F","role":"care_storage","index_authorized":false}'::jsonb),
    ('/shipping','https://thefeya.com/shipping','{"phase":"F","role":"shipping_policy","index_authorized":false}'::jsonb),
    ('/returns','https://thefeya.com/returns','{"phase":"F","role":"returns_policy","index_authorized":false}'::jsonb),
    ('/contact','https://thefeya.com/contact','{"phase":"F","role":"contact_support","index_authorized":false}'::jsonb)
)
insert into public.feya_commerce_seo_pages_v1(
  seo_page_id,page_type,canonical_product_id,url_path,canonical_url,market_code,locale,
  lifecycle_state,indexation_intent,portfolio_status,protected_winner_flag,source_type,metadata_json
)
select
  extensions.uuid_generate_v5(
    '6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid,
    'thefeya:seo-page:US:en-US:'||url_path
  ),
  'landing',null,url_path,canonical_url,'US','en-US','deployed','noindex','hold',false,'phase_f_trust_shell',metadata_json
from pages
on conflict (market_code,locale,url_path) do update set
  canonical_url=excluded.canonical_url,
  lifecycle_state='deployed',
  indexation_intent='noindex',
  portfolio_status='hold',
  metadata_json=public.feya_commerce_seo_pages_v1.metadata_json||excluded.metadata_json,
  updated_at=now();

with root as (
  select seo_page_id
  from public.feya_commerce_seo_pages_v1
  where market_code='US' and locale='en-US' and url_path='/'
  limit 1
),
specs(url_path,user_intent,primary_intent,unique_value,truth_status,evidence_refs) as (
  values
    ('/about'::text,
      'Understand who TheFEYA is, what the studio makes and how made-to-order product truth works.',
      'brand and atelier trust',
      'Explains the independent handmade designer proposition without inventing seller/legal identity or capabilities.',
      'confirmed'::text,
      '[{"type":"research","ref":"competitor trust-page architecture"},{"type":"product_truth","ref":"current FEYA catalog"}]'::jsonb),
    ('/size-guide',
      'Prepare accurate body measurements and understand how to use product-specific size and adjustment information.',
      'measurements and sizing help',
      'Separates universal measuring guidance from product-specific fit claims and custom availability.',
      'confirmed',
      '[{"type":"project_bible","ref":"Sizing & fit"},{"type":"owner_truth","ref":"chest/waist/hips/height workflow"}]'::jsonb),
    ('/care',
      'Understand basic care/storage principles before cleaning or storing a TheFEYA piece.',
      'costume care and storage',
      'Uses conservative material-aware guidance and keeps the product page as authority for the actual construction.',
      'confirmed',
      '[{"type":"project_bible","ref":"Care"},{"type":"product_truth","ref":"material-specific current catalog"}]'::jsonb),
    ('/shipping',
      'Understand production time, shipping estimates, customs and event-date limitations.',
      'shipping and delivery policy',
      'Canonical current fulfillment policy.',
      'confirmed',
      '[{"type":"business_truth","codes":["STANDARD_MADE_TO_ORDER_PRODUCTION_TIME","STANDARD_INTERNATIONAL_TRACKED_SHIPPING_TIME","EXPRESS_SHIPPING_TIME","CARRIER_DELAY_EVENT_DEADLINE_POLICY","CUSTOMS_DUTIES_RESPONSIBILITY"]}]'::jsonb),
    ('/returns',
      'Understand current cancellation, return, exchange, remake and custom-order rules.',
      'returns and exchanges policy',
      'Canonical current anti-free-rental store policy with mandatory-rights guardrails.',
      'confirmed',
      '[{"type":"business_truth","codes":["ORDER_CANCELLATIONS","RETURN_POLICY_CURRENT","RETURN_NOTICE_WINDOW","DISCOUNTED_ITEM_RETURN_TREATMENT","CUSTOM_OR_MADE_TO_MEASURE_RETURNS"]}]'::jsonb),
    ('/contact',
      'Contact TheFEYA about products, sizing, an order or store policy.',
      'store contact and support',
      'Public customer-support channel; payment-provider disclosure remains gated until active.',
      'confirmed',
      '[{"type":"business_truth","code":"PUBLIC_CONTACT_EMAIL"},{"type":"payment_provider","status":"not_active"}]'::jsonb)
)
insert into public.feya_search_page_specs_v1(
  seo_page_id,family,primary_parent_page_id,accountable_owner,review_state,user_intent,primary_intent,
  unique_value_brief,intent_evidence_status,truth_status,utility_rationale,selection_rule_json,
  inventory_policy_json,excluded_queries_json,evidence_refs_json
)
select
  p.seo_page_id,'trust',r.seo_page_id,'OSPM','review',
  s.user_intent,s.primary_intent,s.unique_value,
  'confirmed',s.truth_status,
  'Trust/support page required by the pre-index architecture; not a commercial collection owner.',
  '{"version":"trust_v1","all":[],"unknown_policy":"exclude_and_queue_review"}'::jsonb,
  null,'[]'::jsonb,s.evidence_refs
from specs s
join public.feya_commerce_seo_pages_v1 p
  on p.market_code='US' and p.locale='en-US' and p.url_path=s.url_path
cross join root r
on conflict (seo_page_id) do update set
  family=excluded.family,
  primary_parent_page_id=excluded.primary_parent_page_id,
  accountable_owner=excluded.accountable_owner,
  review_state=excluded.review_state,
  user_intent=excluded.user_intent,
  primary_intent=excluded.primary_intent,
  unique_value_brief=excluded.unique_value_brief,
  intent_evidence_status=excluded.intent_evidence_status,
  truth_status=excluded.truth_status,
  utility_rationale=excluded.utility_rationale,
  selection_rule_json=excluded.selection_rule_json,
  inventory_policy_json=excluded.inventory_policy_json,
  excluded_queries_json=excluded.excluded_queries_json,
  evidence_refs_json=excluded.evidence_refs_json,
  updated_at=now();

with edges(from_path,to_path,placement) as (
  values
    ('/collections'::text,'/about'::text,'collections_hub_trust'),
    ('/collections','/size-guide','collections_hub_trust'),
    ('/collections','/care','collections_hub_trust'),
    ('/collections','/shipping','collections_hub_trust'),
    ('/collections','/returns','collections_hub_trust'),
    ('/collections','/contact','collections_hub_trust')
)
insert into public.feya_search_link_edges_v1(
  link_edge_id,from_page_id,to_page_id,link_kind,generation_mode,status,evidence_refs_json,source_version
)
select
  extensions.uuid_generate_v5(
    '6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid,
    'thefeya:phase-f-trust-link:'||e.from_path||'>'||e.to_path
  ),
  fp.seo_page_id,tp.seo_page_id,'navigation','deterministic','proposed',
  jsonb_build_array(jsonb_build_object('phase','F','placement',e.placement,'index_authorized',false)),
  'phase-f-trust-20260926'
from edges e
join public.feya_commerce_seo_pages_v1 fp
  on fp.market_code='US' and fp.locale='en-US' and fp.url_path=e.from_path
join public.feya_commerce_seo_pages_v1 tp
  on tp.market_code='US' and tp.locale='en-US' and tp.url_path=e.to_path
on conflict (from_page_id,to_page_id,link_kind,source_version) do nothing;

-- Record that Terms and Privacy are still real launch blockers rather than silently inventing them.
insert into public.feya_growth_registry_items_v1(
  registry_type,item_code,item_name,owner_role,item_state,implementation_state,
  public_summary,limitations_summary,config_json,evidence_json,version_no,active_flag
)
values
(
  'policy','PUBLIC_TERMS_AND_SELLER_IDENTITY','Terms + seller identity','HUMAN_OWNER',
  'UNAVAILABLE','facts_required',
  'Public Terms and contracting-seller identity are required before the final legal/search release.',
  'Do not invent the legal seller name/address from a bank, payment processor or Seller-Online provider contact.',
  '{"phase":"F","blocks":["final_public_terms","merchant_release"],"indexing_scope":"trust_shell"}'::jsonb,
  '{"known":{"domain":"https://thefeya.com","email":"manager.feya@gmail.com"},"missing":["contracting_seller_legal_identity","seller_geographical_address"]}'::jsonb,
  1,true
),
(
  'policy','PUBLIC_PRIVACY_POLICY','Privacy policy','HUMAN_OWNER',
  'UNAVAILABLE','data_flow_inventory_required',
  'Privacy policy must reflect the actual analytics, checkout, payment and contact data flows before final release.',
  'Do not publish a generic template that claims processors or tracking tools that are not actually active.',
  '{"phase":"F","blocks":["final_public_privacy"],"indexing_scope":"trust_shell"}'::jsonb,
  '{"known":["contact_email","current_site_stack"],"pending":["final_analytics_configuration","checkout_data_flows","payment_provider_activation"]}'::jsonb,
  1,true
)
on conflict (registry_type,item_code,version_no) do update set
  item_state=excluded.item_state,
  implementation_state=excluded.implementation_state,
  public_summary=excluded.public_summary,
  limitations_summary=excluded.limitations_summary,
  config_json=excluded.config_json,
  evidence_json=excluded.evidence_json,
  active_flag=excluded.active_flag,
  updated_at=now();

commit;
