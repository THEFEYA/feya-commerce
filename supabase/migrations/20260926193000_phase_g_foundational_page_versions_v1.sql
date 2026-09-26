-- Phase G: persist immutable foundational Wave A page versions.
-- This binds current visible source blobs to Page Portfolio versions without changing indexation.
begin;

with source_rows(url_path,family,source_blob_sha,title,h1,content_role) as (
  values
(
  "/"::text,
  "home"::text,
  "9557ec01693a5ffa88a5994d8bec85568961e1c3"::text,
  "TheFEYA | Handmade Stagewear and Festival Looks"::text,
  "Handmade stagewear for unforgettable looks"::text,
  "brand_home"::text
),
(
  "/collections"::text,
  "subhub"::text,
  "f72e34e9df14cdb07e0d5e0cb92f531d3101c1e1"::text,
  "Shop TheFEYA Collections"::text,
  "TheFEYA Collections"::text,
  "collections_discovery_hub"::text
),
(
  "/about"::text,
  "trust"::text,
  "3e0e4ba2c1c24be26a58890517d4c0e17ef8b6be"::text,
  "About TheFEYA Atelier"::text,
  "About TheFEYA"::text,
  "about_atelier"::text
),
(
  "/size-guide"::text,
  "trust"::text,
  "b43a3b40a508e1d6271ab765d81fb86948519f11"::text,
  "Costume Measurements & Size Guide | TheFEYA"::text,
  "Costume Measurements & Size Guide"::text,
  "measurements_size_guide"::text
),
(
  "/care"::text,
  "trust"::text,
  "00506068a54801ed416b2b636ab31335d92b0b29"::text,
  "Costume Care & Storage | TheFEYA"::text,
  "Care & Storage"::text,
  "care_storage"::text
),
(
  "/shipping"::text,
  "trust"::text,
  "3257bda85e32ac4ead534222ba0e60fb9c59ef5c"::text,
  "Shipping & Delivery"::text,
  "Shipping & Delivery"::text,
  "shipping_policy"::text
),
(
  "/returns"::text,
  "trust"::text,
  "68fe35eca407cb0d83e58eec1af76f1c6e98b1b1"::text,
  "Returns & Exchanges"::text,
  "Returns & Exchanges"::text,
  "returns_policy"::text
),
(
  "/contact"::text,
  "trust"::text,
  "3b7209fcee1ee5f70444e21ca6986f8775fca66c"::text,
  "Contact TheFEYA"::text,
  "Contact"::text,
  "contact_support"::text
)
),
resolved as (
  select
    p.seo_page_id,
    p.url_path,
    p.indexation_intent,
    p.portfolio_status,
    s.family as spec_family,
    s.accountable_owner,
    s.review_state,
    s.user_intent,
    s.primary_intent,
    s.unique_value_brief,
    s.intent_evidence_status,
    s.truth_status,
    s.selection_rule_json,
    s.inventory_policy_json,
    s.excluded_queries_json,
    r.family,
    r.source_blob_sha,
    r.title,
    r.h1,
    r.content_role,
    jsonb_build_object(
      'contract_version','foundational_page_content_manifest_v1',
      'path',r.url_path,
      'family',r.family,
      'source_file',
        case r.url_path
          when '/' then 'app/page.tsx'
          when '/collections' then 'app/collections/page.tsx'
          when '/about' then 'app/about/page.tsx'
          when '/size-guide' then 'app/size-guide/page.tsx'
          when '/care' then 'app/care/page.tsx'
          when '/shipping' then 'app/shipping/page.tsx'
          when '/returns' then 'app/returns/page.tsx'
          when '/contact' then 'app/contact/page.tsx'
        end,
      'source_blob_sha',r.source_blob_sha,
      'title',r.title,
      'h1',r.h1,
      'content_role',r.content_role,
      'content_status','CQA_PASS',
      'release_status','HOLD',
      'index_authorized',false
    ) content_json
  from source_rows r
  join public.feya_commerce_seo_pages_v1 p
    on p.market_code='US' and p.locale='en-US' and p.url_path=r.url_path
  join public.feya_search_page_specs_v1 s on s.seo_page_id=p.seo_page_id
)
insert into public.feya_search_page_versions_v1(
  page_version_id,seo_page_id,version_number,membership_snapshot_id,content_hash,
  spec_json,content_json,evidence_refs_json,execution_request_id,change_event_id
)
select
  extensions.uuid_generate_v5(
    '6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid,
    'thefeya:foundational-page-version:2026-09-26:'||seo_page_id::text||':1'
  ),
  seo_page_id,1,null,
  encode(extensions.digest(convert_to(content_json::text,'UTF8'),'sha256'),'hex'),
  jsonb_build_object(
    'family',spec_family,
    'accountable_owner',accountable_owner,
    'review_state',review_state,
    'user_intent',user_intent,
    'primary_intent',primary_intent,
    'unique_value_brief',unique_value_brief,
    'intent_evidence_status',intent_evidence_status,
    'truth_status',case when url_path='/' then 'confirmed' else truth_status end,
    'selection_rule_json',selection_rule_json,
    'inventory_policy_json',inventory_policy_json,
    'excluded_queries_json',excluded_queries_json
  ),
  content_json,
  jsonb_build_array(
    jsonb_build_object('type','content_manifest','ref','docs/search/phase-g-wave-a-foundational-pages-v1.json'),
    jsonb_build_object('type','cqa','ref','docs/search/phase-g-wave-a-foundational-pages-cqa-v1.json','status','PASS'),
    jsonb_build_object('type','git_blob','sha',source_blob_sha)
  ),
  null,null
from resolved
on conflict (seo_page_id,version_number) do nothing;

update public.feya_search_page_specs_v1 s
set truth_status='confirmed',
    review_state='review',
    evidence_refs_json=s.evidence_refs_json||jsonb_build_array(
      jsonb_build_object(
        'type','foundational_page_version',
        'ref','docs/search/phase-g-wave-a-foundational-pages-v1.json',
        'cqa','PASS'
      )
    ),
    updated_at=now()
from public.feya_commerce_seo_pages_v1 p
where p.seo_page_id=s.seo_page_id
  and p.market_code='US'
  and p.locale='en-US'
  and p.url_path in('/','/collections','/about','/size-guide','/care','/shipping','/returns','/contact');

commit;
