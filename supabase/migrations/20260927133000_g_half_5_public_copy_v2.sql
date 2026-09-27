-- G-half-5 public copy sanitization.
-- Creates immutable landing page version v2 and matching landing brief v2.
-- No ownership, membership, publication, checkout or indexation authority is changed.

with replacements(url_path,old_heading,new_heading,new_body) as (
  values
  (
    '/collections/bodysuits',
    'Choose by visual direction',
    'Choose by visual direction',
    'Glam, fantasy and futuristic directions appear throughout the current bodysuit selection. Use these visual themes to narrow the catalog, then open each product to confirm the exact pieces and configurations available.'
  ),
  (
    '/collections/burning-man-looks',
    'Choose the silhouette before the details',
    'Choose the silhouette before the details',
    'Shoulder pieces, skirts, arm accessories and tops appear throughout this Burning Man selection. Start with the silhouette you want, then open each product to see which pieces can be ordered together or separately.'
  ),
  (
    '/collections/burning-man-looks',
    'Commercial looks here, practical guidance in the guide',
    'Shop the look here, use the guide for planning',
    'Browse this collection when you are ready to compare pieces and build a look. For practical preparation and clothing considerations, continue to the Burning Man guide.'
  ),
  (
    '/collections/costume-belts',
    'Decorative, not utility equipment',
    'Decorative, not utility equipment',
    'These belts are decorative costume and fashion pieces. They are not utility, tool or weapon-carrying belts; choose them for styling an outfit or defining the waist.'
  ),
  (
    '/collections/costume-headpieces',
    'Choose the visual role of the headpiece',
    'Choose the visual role of the headpiece',
    'Some headpieces help build a full character; others work as a final sculptural accent for stage or festival styling. Compare the shapes, finishes and outfit context to find the direction that fits your look.'
  ),
  (
    '/collections/costume-headpieces',
    'Connect the headpiece to the full outfit',
    'Connect the headpiece to the full outfit',
    'Move between headpieces, masks, performance costumes and festival looks to compare coordinated pieces. A single design may work across more than one styling context, so related collections can help you see different ways to build the outfit.'
  ),
  (
    '/collections/costume-masks',
    'Decorative masks, not safety equipment',
    'Decorative masks, not safety equipment',
    'These masks are decorative pieces for costume and fashion styling. They are not respirators, medical devices or protective masks.'
  ),
  (
    '/collections/costume-masks',
    'Build the look around the mask',
    'Build the look around the mask',
    'Continue into headpieces, performance costumes or event collections to compare coordinated pieces and build a complete look around the mask.'
  ),
  (
    '/collections/festival-outfits',
    'Use finish and visual direction as filters',
    'Use finish and visual direction to narrow the look',
    'The current selection includes vegan-leather pieces, metallic finishes, mirror details and a smaller group of holographic designs. Futuristic and glam directions are especially common, so finish and visual character are useful ways to narrow the collection.'
  ),
  (
    '/collections/festival-skirts',
    'A narrower job than Festival Outfits',
    'When you want to start with the skirt',
    'Festival Outfits is the broader event collection. This page is for shoppers who want to begin with a skirt, whether they need a skirt-only option or a coordinated set built around it.'
  ),
  (
    '/collections/rave-outfits',
    'Futuristic, glam and cyber directions',
    'Futuristic, glam and cyber directions',
    'Glam and futuristic looks are especially common here, with cyberpunk and post-apocalyptic directions appearing in part of the selection. Use those visual themes to narrow the catalog and compare the pieces that fit your look.'
  ),
  (
    '/collections/shoulder-armor',
    'From stage styling to futuristic costume',
    'From stage styling to futuristic costume',
    'Glam, futuristic, post-apocalyptic and cosmic directions appear throughout this shoulder selection, with performer and warrior styling especially common. Use those visual cues to compare silhouettes, finishes and coordinating pieces.'
  ),
  (
    '/collections/stage-outfits',
    'Build a coherent stage image',
    'Build a coherent stage image',
    'Glam and futuristic directions are strongest here, with metallic, mirror and selected holographic finishes across the collection. Related product-type collections make it easier to compare bodysuit-led, armor-inspired and headpiece-led stage looks.'
  )
),
intro_replacements(url_path,new_intro) as (
  values
  (
    '/collections/costume-belts',
    'TheFEYA costume belts are decorative waist pieces built for statement styling rather than everyday utility. Vegan leather is prominent in the current selection, with silver, gold and metallic finishes appearing across futuristic, glam and cosmic designs. Many products also include tops, shoulder pieces, chokers or leg accessories, so open the product page to confirm the exact belt-only or set configuration available to order.'
  ),
  (
    '/collections/costume-headpieces',
    'TheFEYA headpieces are built as visual anchors for costume and performance styling. Glam, fantasy and futuristic directions appear throughout the current selection, with vegan leather common and gold, silver, acrylic and mirror finishes represented across different designs. Many headpieces are offered within broader configurations with bodysuits, tops, masks, shoulder pieces or skirts, so the product page defines the exact combination available to order.'
  ),
  (
    '/collections/festival-skirts',
    'This page narrows the broader Festival collection to designs with a confirmed skirt option for festival styling. Glam and futuristic directions are especially common, with vegan leather, gold, silver, mirror, metallic and selected holographic finishes represented. Many designs also offer a top, shoulder piece or another coordinated component, while the product page shows whether the skirt is available alone or only within a set.'
  )
),
candidate_pages as (
  select distinct p.seo_page_id,p.url_path
  from public.feya_search_v_candidate_membership_current_v1 c
  join public.feya_commerce_seo_pages_v1 p
    on p.market_code='US' and p.locale='en-US' and p.url_path=c.url_path
),
source_v1 as (
  select distinct on (v.seo_page_id)
    v.*
  from public.feya_search_page_versions_v1 v
  join candidate_pages cp using(seo_page_id)
  order by v.seo_page_id,v.version_number desc
),
rewritten as (
  select
    s.*,
    cp.url_path,
    jsonb_set(
      jsonb_set(
        s.content_json,
        '{modules}',
        (
          select jsonb_agg(
            case
              when r.url_path is not null then
                jsonb_set(
                  jsonb_set(m.elem,'{heading}',to_jsonb(r.new_heading),false),
                  '{body}',to_jsonb(r.new_body),false
                )
              else m.elem
            end
            order by m.ord
          )
          from jsonb_array_elements(s.content_json->'modules') with ordinality m(elem,ord)
          left join replacements r
            on r.url_path=cp.url_path
           and r.old_heading=m.elem->>'heading'
        ),
        false
      ),
      '{intro}',
      case when ir.url_path is not null then to_jsonb(ir.new_intro) else s.content_json->'intro' end,
      false
    ) new_content_json
  from source_v1 s
  join candidate_pages cp using(seo_page_id)
  left join intro_replacements ir on ir.url_path=cp.url_path
),
prepared as (
  select
    extensions.uuid_generate_v5(
      '6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid,
      'thefeya:search-page-version:'||seo_page_id::text||':2'
    ) page_version_id,
    seo_page_id,
    2 version_number,
    membership_snapshot_id,
    encode(extensions.digest(convert_to(new_content_json::text,'UTF8'),'sha256'),'hex') content_hash,
    spec_json,
    new_content_json content_json,
    evidence_refs_json || jsonb_build_array(
      jsonb_build_object(
        'type','g_half_5_public_copy_cqa',
        'ref','docs/search/G_half_5_Public_Copy_Sanitization_20260927.json',
        'status','PASS'
      )
    ) evidence_refs_json,
    execution_request_id,
    change_event_id
  from rewritten
)
insert into public.feya_search_page_versions_v1(
  page_version_id,seo_page_id,version_number,membership_snapshot_id,
  content_hash,spec_json,content_json,evidence_refs_json,
  execution_request_id,change_event_id
)
select
  page_version_id,seo_page_id,version_number,membership_snapshot_id,
  content_hash,spec_json,content_json,evidence_refs_json,
  execution_request_id,change_event_id
from prepared
on conflict (seo_page_id,version_number) do nothing;

-- Matching immutable landing brief v2; generation remains blocked pending Human Owner visual approval.
with page_v2 as (
  select v.*
  from public.feya_search_page_versions_v1 v
  where v.version_number=2
),
brief_v1 as (
  select b.*
  from public.feya_search_landing_briefs_v1 b
  where b.brief_version=1
),
prepared as (
  select
    extensions.uuid_generate_v5(
      '6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid,
      'thefeya:landing-brief:'||b.seo_page_id::text||':2'
    ) landing_brief_id,
    b.seo_page_id,
    2 brief_version,
    v.page_version_id source_page_version_id,
    v.membership_snapshot_id,
    v.content_hash source_content_hash,
    b.brief_contract_version,
    'G4_RECONCILED_VISUAL_PENDING'::text brief_status,
    jsonb_set(
      jsonb_set(
        jsonb_set(
          jsonb_set(
            b.brief_json,
            '{identity,source_page_version_id}',
            to_jsonb(v.page_version_id::text),
            false
          ),
          '{identity,source_page_version_number}',
          '2'::jsonb,
          false
        ),
        '{identity,source_content_hash}',
        to_jsonb(v.content_hash),
        false
      ),
      '{visual_plan}',
      jsonb_build_object(
        'status','architecture_defined_owner_visual_pending',
        'owner_action','Review the exact G-half-5 preview before publication or regeneration.'
      ),
      false
    ) brief_json
  from brief_v1 b
  join page_v2 v on v.seo_page_id=b.seo_page_id
),
hashed as (
  select p.*,
         encode(extensions.digest(convert_to(p.brief_json::text,'UTF8'),'sha256'),'hex') brief_hash
  from prepared p
)
insert into public.feya_search_landing_briefs_v1(
  landing_brief_id,seo_page_id,brief_version,source_page_version_id,membership_snapshot_id,
  source_content_hash,brief_contract_version,brief_status,brief_hash,brief_json,
  can_generate_draft,can_publish,can_index
)
select
  landing_brief_id,seo_page_id,brief_version,source_page_version_id,membership_snapshot_id,
  source_content_hash,brief_contract_version,brief_status,brief_hash,brief_json,
  false,false,false
from hashed
on conflict (seo_page_id,brief_version) do nothing;

do $$
declare
  v_pages int;
  v_briefs int;
  v_bad int;
  v_drift int;
begin
  select count(*) into v_pages
  from public.feya_search_page_versions_v1 v
  join public.feya_commerce_seo_pages_v1 p using(seo_page_id)
  where v.version_number=2
    and p.market_code='US'
    and p.locale='en-US'
    and p.url_path like '/collections/%';

  if v_pages<>10 then
    raise exception 'g5_expected_10_page_v2_got:%',v_pages;
  end if;

  select count(*) into v_briefs
  from public.feya_search_landing_briefs_v1
  where brief_version=2;

  if v_briefs<>10 then
    raise exception 'g5_expected_10_brief_v2_got:%',v_briefs;
  end if;

  with rendered as (
    select
      p.url_path,
      concat_ws(
        ' ',
        v.content_json->>'seo_title',
        v.content_json->>'h1',
        v.content_json->>'meta_description',
        v.content_json->>'intro',
        (select string_agg(coalesce(x->>'heading','')||' '||coalesce(x->>'body',''),' ')
         from jsonb_array_elements(coalesce(v.content_json->'modules','[]'::jsonb)) x),
        (select string_agg(coalesce(x->>'q','')||' '||coalesce(x->>'a',''),' ')
         from jsonb_array_elements(coalesce(v.content_json->'faq','[]'::jsonb)) x),
        (select string_agg(coalesce(x->>'anchor',''),' ')
         from jsonb_array_elements(coalesce(v.content_json->'related_links','[]'::jsonb)) x),
        (select string_agg(x#>>'{}',' ')
         from jsonb_array_elements(coalesce(v.content_json->'chips','[]'::jsonb)) x)
      ) public_text
    from public.feya_search_page_versions_v1 v
    join public.feya_commerce_seo_pages_v1 p using(seo_page_id)
    where v.version_number=2
      and p.market_code='US'
      and p.locale='en-US'
      and p.url_path like '/collections/%'
  )
  select count(*) into v_bad
  from rendered
  where public_text ~* '(\mmembership\M|\mSERP\M|\mindexable\M|\mindexed pages?\M|\mSEO pages?\M|\mSEO URLs?\M|query ownership|query cluster|review candidates?|approved Product DNA|approved styles?)';

  if v_bad<>0 then
    raise exception 'g5_public_search_jargon_remaining:%',v_bad;
  end if;

  select count(*) into v_drift
  from public.feya_search_landing_briefs_v1 b
  join public.feya_search_page_versions_v1 v
    on v.page_version_id=b.source_page_version_id
  where b.brief_version=2
    and (
      b.source_content_hash<>v.content_hash
      or b.membership_snapshot_id is distinct from v.membership_snapshot_id
      or b.can_generate_draft
      or b.can_publish
      or b.can_index
    );

  if v_drift<>0 then
    raise exception 'g5_brief_page_binding_drift:%',v_drift;
  end if;
end $$;
