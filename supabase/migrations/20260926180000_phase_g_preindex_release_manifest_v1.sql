-- Phase G: immutable pre-index release manifest model and Wave A draft.
-- This does NOT switch any page to indexable and does NOT enable search indexing.
begin;

create table if not exists public.feya_search_releases_v1(
  release_id uuid primary key,
  release_code text not null,
  release_version integer not null check(release_version>0),
  release_status text not null check(release_status in ('DRAFT','GATE_FAILED','APPROVAL_REQUIRED','APPROVED','ACTIVE','RETIRED')),
  target_origin text not null,
  source_commerce_release_ref text not null,
  source_db_ref text not null,
  git_sha text,
  release_hash text,
  gate_policy_version text not null,
  scope_json jsonb not null check(jsonb_typeof(scope_json)='object'),
  gate_summary_json jsonb not null check(jsonb_typeof(gate_summary_json)='object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(release_code,release_version),
  check(git_sha is null or git_sha~'^[0-9a-f]{40}$'),
  check(release_hash is null or release_hash~'^[0-9a-f]{64}$')
);

create table if not exists public.feya_search_release_items_v1(
  release_id uuid not null references public.feya_search_releases_v1(release_id) on delete restrict,
  seo_page_id uuid not null references public.feya_commerce_seo_pages_v1(seo_page_id) on delete restrict,
  url_path_snapshot text not null,
  page_type_snapshot text not null,
  item_role text not null check(item_role in ('INDEX_CANDIDATE','NOINDEX_DEPENDENCY')),
  intended_index_state text not null check(intended_index_state in ('index','noindex')),
  canonical_product_id uuid,
  page_version_id uuid references public.feya_search_page_versions_v1(page_version_id) on delete restrict,
  membership_snapshot_id uuid references public.feya_search_membership_snapshots_v1(membership_snapshot_id) on delete restrict,
  content_hash text,
  item_hash text not null check(item_hash~'^[0-9a-f]{64}$'),
  evidence_json jsonb not null check(jsonb_typeof(evidence_json)='object'),
  created_at timestamptz not null default now(),
  primary key(release_id,seo_page_id),
  unique(release_id,url_path_snapshot),
  check(content_hash is null or content_hash~'^[0-9a-f]{64}$')
);

create table if not exists public.feya_search_release_gate_results_v1(
  release_id uuid not null references public.feya_search_releases_v1(release_id) on delete restrict,
  gate_code text not null check(gate_code~'^K(0[1-9]|1[0-9]|20)$'),
  gate_status text not null check(gate_status in ('PASS','FAIL','EXCLUDED_APPROVED')),
  scope_label text not null,
  evidence_json jsonb not null check(jsonb_typeof(evidence_json)='object'),
  evaluated_at timestamptz not null default now(),
  primary key(release_id,gate_code)
);

alter table public.feya_search_releases_v1 enable row level security;
alter table public.feya_search_release_items_v1 enable row level security;
alter table public.feya_search_release_gate_results_v1 enable row level security;

revoke all on table public.feya_search_releases_v1 from public,anon,authenticated;
revoke all on table public.feya_search_release_items_v1 from public,anon,authenticated;
revoke all on table public.feya_search_release_gate_results_v1 from public,anon,authenticated;
grant select on table public.feya_search_releases_v1 to service_role;
grant select on table public.feya_search_release_items_v1 to service_role;
grant select on table public.feya_search_release_gate_results_v1 to service_role;

-- Utility routes that remove dead public targets while checkout/account remain off.
with utility(url_path,role) as (
  values
    ('/cart'::text,'prelaunch_cart_status'::text),
    ('/account','prelaunch_account_status')
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
  'landing',null,url_path,'https://thefeya.com'||url_path,'US','en-US',
  'deployed','noindex','hold',false,'phase_g_utility',
  jsonb_build_object('phase','G','role',role,'index_authorized',false)
from utility
on conflict (market_code,locale,url_path) do update set
  lifecycle_state='deployed',
  indexation_intent='noindex',
  portfolio_status='hold',
  metadata_json=public.feya_commerce_seo_pages_v1.metadata_json||excluded.metadata_json,
  updated_at=now();

with constants as (
  select
    extensions.uuid_generate_v5(
      '6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid,
      'thefeya:search-release:organic-wave-a:2026-09-26:v1'
    ) release_id
),
upsert_release as (
  insert into public.feya_search_releases_v1(
    release_id,release_code,release_version,release_status,target_origin,
    source_commerce_release_ref,source_db_ref,git_sha,release_hash,gate_policy_version,
    scope_json,gate_summary_json
  )
  select
    release_id,
    'organic-wave-a-20260926',
    1,
    'GATE_FAILED',
    'https://thefeya.com',
    'feya-review-207-20260924',
    'supabase:ysnizcgzhdwdfdkjkhud',
    null,
    null,
    'FEYA_Search_Architecture_v1_K01_K20',
    jsonb_build_object(
      'release_kind','organic_selective_preindex',
      'payment_scope','excluded_from_wave_a',
      'index_candidate_paths',jsonb_build_array(
        '/',
        '/collections',
        '/collections/shoulder-armor',
        '/collections/festival-outfits',
        '/collections/rave-outfits',
        '/collections/burning-man-looks',
        '/collections/stage-outfits',
        '/collections/bodysuits',
        '/collections/costume-masks',
        '/collections/costume-headpieces',
        '/collections/festival-skirts',
        '/collections/costume-belts',
        '/about',
        '/size-guide',
        '/care',
        '/shipping',
        '/returns',
        '/contact'
      ),
      'noindex_dependencies',jsonb_build_object(
        'shop',true,
        'cart',true,
        'account',true,
        'product_pdp_count',207
      ),
      'excluded_future_pages',jsonb_build_array(
        '/guides/what-to-wear-to-burning-man',
        '/terms',
        '/privacy'
      )
    ),
    '{"overall":"FAIL","reason":"pre-index release prepared but launch gates are not all PASS"}'::jsonb
  from constants
  on conflict (release_code,release_version) do update set
    release_status='GATE_FAILED',
    scope_json=excluded.scope_json,
    gate_policy_version=excluded.gate_policy_version,
    updated_at=now()
  returning release_id
),
index_paths(url_path) as (
  values
    ('/'::text),
    ('/collections'),
    ('/collections/shoulder-armor'),
    ('/collections/festival-outfits'),
    ('/collections/rave-outfits'),
    ('/collections/burning-man-looks'),
    ('/collections/stage-outfits'),
    ('/collections/bodysuits'),
    ('/collections/costume-masks'),
    ('/collections/costume-headpieces'),
    ('/collections/festival-skirts'),
    ('/collections/costume-belts'),
    ('/about'),
    ('/size-guide'),
    ('/care'),
    ('/shipping'),
    ('/returns'),
    ('/contact')
),
latest_versions as (
  select distinct on (v.seo_page_id)
    v.seo_page_id,v.page_version_id,v.membership_snapshot_id,v.content_hash,v.version_number
  from public.feya_search_page_versions_v1 v
  order by v.seo_page_id,v.version_number desc
),
index_items as (
  select
    r.release_id,p.seo_page_id,p.url_path,p.page_type,p.canonical_product_id,
    v.page_version_id,v.membership_snapshot_id,v.content_hash,
    jsonb_build_object(
      'source','page_portfolio',
      'current_indexation_intent',p.indexation_intent,
      'portfolio_status',p.portfolio_status,
      'page_version',v.version_number,
      'index_authorized',false
    ) evidence
  from upsert_release r
  cross join index_paths x
  join public.feya_commerce_seo_pages_v1 p
    on p.market_code='US' and p.locale='en-US' and p.url_path=x.url_path
  left join latest_versions v on v.seo_page_id=p.seo_page_id
),
dependency_pages as (
  select
    p.seo_page_id,p.url_path,p.page_type,p.canonical_product_id,
    null::uuid page_version_id,null::uuid membership_snapshot_id,
    case
      when p.page_type='product' then (
        select d.proposal_hash
        from public.feya_commerce_seo_pack_drafts_v1 d
        where d.canonical_product_id=p.canonical_product_id
          and d.review_status='approved'
          and d.archived_at is null
        order by coalesce(d.reviewed_at,d.created_at) desc,d.id desc
        limit 1
      )
      else null::text
    end content_hash,
    jsonb_build_object(
      'source','dependency_noindex',
      'current_indexation_intent',p.indexation_intent,
      'portfolio_status',p.portfolio_status,
      'index_authorized',false
    ) evidence
  from public.feya_commerce_seo_pages_v1 p
  where p.market_code='US' and p.locale='en-US'
    and (
      p.url_path in ('/shop','/cart','/account')
      or (
        p.page_type='product'
        and p.canonical_product_id in (
          select distinct (x#>>'{}')::uuid
          from public.feya_growth_execution_requests_v1 r,
               jsonb_array_elements(r.request_payload_json->'canonical_product_ids') x
          where r.execution_request_id='9f1151e3-4fb5-41b9-8922-878c85bfa81a'::uuid
            and r.request_status='SUCCEEDED'
        )
      )
    )
),
all_items as (
  select release_id,seo_page_id,url_path,page_type,canonical_product_id,page_version_id,membership_snapshot_id,content_hash,
         'INDEX_CANDIDATE'::text item_role,'index'::text intended_index_state,evidence
  from index_items
  union all
  select r.release_id,d.seo_page_id,d.url_path,d.page_type,d.canonical_product_id,d.page_version_id,d.membership_snapshot_id,d.content_hash,
         'NOINDEX_DEPENDENCY','noindex',d.evidence
  from upsert_release r cross join dependency_pages d
)
insert into public.feya_search_release_items_v1(
  release_id,seo_page_id,url_path_snapshot,page_type_snapshot,item_role,intended_index_state,
  canonical_product_id,page_version_id,membership_snapshot_id,content_hash,item_hash,evidence_json
)
select
  release_id,seo_page_id,url_path,page_type,item_role,intended_index_state,
  canonical_product_id,page_version_id,membership_snapshot_id,
  case when content_hash~'^[0-9a-f]{64}$' then content_hash else null end,
  encode(extensions.digest(convert_to(
    jsonb_build_object(
      'release_id',release_id,
      'seo_page_id',seo_page_id,
      'url_path',url_path,
      'page_type',page_type,
      'item_role',item_role,
      'intended_index_state',intended_index_state,
      'canonical_product_id',canonical_product_id,
      'page_version_id',page_version_id,
      'membership_snapshot_id',membership_snapshot_id,
      'content_hash',case when content_hash~'^[0-9a-f]{64}$' then content_hash else null end
    )::text,'UTF8'
  ),'sha256'),'hex'),
  evidence
from all_items
on conflict (release_id,seo_page_id) do update set
  url_path_snapshot=excluded.url_path_snapshot,
  page_type_snapshot=excluded.page_type_snapshot,
  item_role=excluded.item_role,
  intended_index_state=excluded.intended_index_state,
  canonical_product_id=excluded.canonical_product_id,
  page_version_id=excluded.page_version_id,
  membership_snapshot_id=excluded.membership_snapshot_id,
  content_hash=excluded.content_hash,
  item_hash=excluded.item_hash,
  evidence_json=excluded.evidence_json;

-- Binary K01-K20 draft gate. Payment is explicitly excluded from this organic-only wave.
with r as (
  select release_id from public.feya_search_releases_v1
  where release_code='organic-wave-a-20260926' and release_version=1
),
gates(gate_code,gate_status,scope_label,evidence_json) as (
  values
    ('K01','FAIL','Global','{"reason":"exact deployment SHA not yet bound to the manifest"}'::jsonb),
    ('K02','FAIL','Global','{"reason":"thefeya.com is owner-confirmed but canonical production deployment/anonymous host proof is not yet bound"}'::jsonb),
    ('K03','PASS','Release','{"reason":"exact immutable release items are materialized; paths/IDs unique; suppressed source is not in the 207-product dependency set"}'::jsonb),
    ('K04','FAIL','URL','{"reason":"product truth/content is approved, but final release-wide media/truth parity proof is not yet attached to this manifest"}'::jsonb),
    ('K05','FAIL','Commerce URL','{"reason":"variants/offers/quotes are authoritative, but order creation remains disabled and UI/server/order parity cannot yet be complete"}'::jsonb),
    ('K06','EXCLUDED_APPROVED','Commerce','{"reason":"Wave A is an organic selective release; checkout/order/payment activation is explicitly outside this release scope"}'::jsonb),
    ('K07','FAIL','Global/Commerce','{"reason":"contact/shipping/returns exist; public Terms, Privacy and contracting-seller identity are still incomplete"}'::jsonb),
    ('K08','PASS','Page portfolio','{"reason":"10 commercial landing business cases have demand/SERP/ownership/membership evidence; primary ownership conflicts are zero"}'::jsonb),
    ('K09','PASS','URL','{"reason":"collection/trust content and product links are server-rendered in the current implementation"}'::jsonb),
    ('K10','FAIL','Graph','{"reason":"crawl graph is modeled, but exact Wave A anonymous crawl/reachability proof is not yet attached"}'::jsonb),
    ('K11','FAIL','URL','{"reason":"collections bind page version+membership; global release binding across home/trust/schema is not yet complete"}'::jsonb),
    ('K12','FAIL','Global/URL','{"reason":"current global indexing flag is not yet release-manifest aware; activation could expose unintended pages"}'::jsonb),
    ('K13','FAIL','Release','{"reason":"sitemap policy is portfolio-driven, but no release-aware activation/sitemap proof exists yet"}'::jsonb),
    ('K14','FAIL','Graph','{"reason":"cart/account dead routes are repaired and public admin footer link removed; full anonymous dead/private/soft-404 crawl still pending"}'::jsonb),
    ('K15','PASS','Schema','{"reason":"current collection structured data contains breadcrumbs/item lists only; product Offer is suppressed when approved storefront copy is active"}'::jsonb),
    ('K16','FAIL','Global','{"reason":"auth/RLS/API checks exist in CI, but exact release SHA CI proof is not yet bound"}'::jsonb),
    ('K17','FAIL','Release','{"reason":"visual freeze is preserved by contract, but exact release performance/mobile/keyboard proof is pending"}'::jsonb),
    ('K18','FAIL','Measurement','{"reason":"post-launch GA4/GSC/commerce event pipeline and consent/env separation are not yet release-complete"}'::jsonb),
    ('K19','FAIL','Measurement/API','{"reason":"GSC/domain property verification is not complete; Ads/Keyword research access is separate and does not satisfy this gate"}'::jsonb),
    ('K20','FAIL','Release','{"reason":"rollback design exists, but exact Wave A Human Owner approval/receipt and activation postflight do not exist yet"}'::jsonb)
)
insert into public.feya_search_release_gate_results_v1(
  release_id,gate_code,gate_status,scope_label,evidence_json
)
select r.release_id,g.gate_code,g.gate_status,g.scope_label,g.evidence_json
from r cross join gates g
on conflict (release_id,gate_code) do update set
  gate_status=excluded.gate_status,
  scope_label=excluded.scope_label,
  evidence_json=excluded.evidence_json,
  evaluated_at=now();

-- Hash the exact item set + gate snapshot. git_sha remains outside the hash until K01 is satisfied;
-- at that point a new release version must be produced rather than mutating an approved manifest.
with r as (
  select release_id from public.feya_search_releases_v1
  where release_code='organic-wave-a-20260926' and release_version=1
),
material as (
  select jsonb_build_object(
    'release_code','organic-wave-a-20260926',
    'release_version',1,
    'target_origin','https://thefeya.com',
    'source_commerce_release_ref','feya-review-207-20260924',
    'items',(
      select jsonb_agg(jsonb_build_object(
        'seo_page_id',i.seo_page_id,
        'path',i.url_path_snapshot,
        'role',i.item_role,
        'index_state',i.intended_index_state,
        'item_hash',i.item_hash
      ) order by i.url_path_snapshot)
      from public.feya_search_release_items_v1 i
      where i.release_id=r.release_id
    ),
    'gates',(
      select jsonb_agg(jsonb_build_object(
        'code',g.gate_code,'status',g.gate_status
      ) order by g.gate_code)
      from public.feya_search_release_gate_results_v1 g
      where g.release_id=r.release_id
    )
  ) body
  from r
)
update public.feya_search_releases_v1 x
set release_hash=encode(extensions.digest(convert_to(material.body::text,'UTF8'),'sha256'),'hex'),
    release_status='GATE_FAILED',
    gate_summary_json=jsonb_build_object(
      'overall','FAIL',
      'pass_count',(select count(*) from public.feya_search_release_gate_results_v1 g where g.release_id=x.release_id and g.gate_status='PASS'),
      'fail_count',(select count(*) from public.feya_search_release_gate_results_v1 g where g.release_id=x.release_id and g.gate_status='FAIL'),
      'excluded_approved_count',(select count(*) from public.feya_search_release_gate_results_v1 g where g.release_id=x.release_id and g.gate_status='EXCLUDED_APPROVED')
    ),
    updated_at=now()
from material
where x.release_code='organic-wave-a-20260926' and x.release_version=1;

commit;
