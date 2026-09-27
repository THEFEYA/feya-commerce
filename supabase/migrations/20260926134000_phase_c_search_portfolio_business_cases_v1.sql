-- Phase C: materialize reviewed query clusters and noindex landing business cases.
-- This migration creates only internal search-planning state. It does not publish or index pages.
begin;

-- Stable root/search hub registrations.
with pages(url_path, family, lifecycle_state, indexation_intent, portfolio_status, metadata_json) as (
  values
    ('/'::text,'home'::text,'deployed'::text,'candidate'::text,'active'::text,
      '{"phase":"phase_c","role":"brand_home","index_authorized":false}'::jsonb),
    ('/shop','shop','deployed','candidate','active',
      '{"phase":"phase_c","role":"shop_hub","index_authorized":false}'::jsonb),
    ('/collections/shoulder-armor','type_hub','planned','noindex','hold',
      '{"phase":"phase_c","candidate_code":"SHOULDER_ARMOR","decision":"PROPOSE_LANDING_BUSINESS_CASE","index_authorized":false}'::jsonb),
    ('/collections/festival-outfits','event_hub','planned','noindex','hold',
      '{"phase":"phase_c","candidate_code":"FESTIVAL_OUTFITS","decision":"PROPOSE_LANDING_BUSINESS_CASE","index_authorized":false}'::jsonb),
    ('/collections/rave-outfits','event_hub','planned','noindex','hold',
      '{"phase":"phase_c","candidate_code":"RAVE_OUTFITS","decision":"PROPOSE_LANDING_BUSINESS_CASE","index_authorized":false}'::jsonb),
    ('/collections/burning-man-looks','event_hub','planned','noindex','hold',
      '{"phase":"phase_c","candidate_code":"BURNING_MAN_OUTFITS","decision":"PROPOSE_LANDING_BUSINESS_CASE","index_authorized":false}'::jsonb),
    ('/collections/stage-outfits','subhub','planned','noindex','hold',
      '{"phase":"phase_c","candidate_code":"PERFORMANCE_COSTUMES","decision":"PROPOSE_LANDING_BUSINESS_CASE","index_authorized":false}'::jsonb),
    ('/collections/bodysuits','type_hub','planned','noindex','hold',
      '{"phase":"phase_c","candidate_code":"COSTUME_BODYSUITS","decision":"PROPOSE_LANDING_BUSINESS_CASE","index_authorized":false}'::jsonb),
    ('/collections/costume-masks','type_hub','planned','noindex','hold',
      '{"phase":"phase_c","candidate_code":"COSTUME_MASKS","decision":"PROPOSE_LANDING_BUSINESS_CASE","index_authorized":false}'::jsonb),
    ('/collections/costume-headpieces','type_hub','planned','noindex','hold',
      '{"phase":"phase_c","candidate_code":"COSTUME_HEADPIECES","decision":"PROPOSE_LANDING_BUSINESS_CASE","index_authorized":false}'::jsonb),
    ('/collections/festival-skirts','subhub','planned','noindex','hold',
      '{"phase":"phase_c","candidate_code":"FESTIVAL_SKIRTS","decision":"PROPOSE_LANDING_BUSINESS_CASE","index_authorized":false}'::jsonb),
    ('/collections/costume-belts','type_hub','planned','noindex','hold',
      '{"phase":"phase_c","candidate_code":"COSTUME_BELTS","decision":"PROPOSE_LANDING_BUSINESS_CASE","index_authorized":false}'::jsonb)
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
  'landing',null,url_path,'https://thefeya.com'||case when url_path='/' then '' else url_path end,
  'US','en-US',lifecycle_state,indexation_intent,portfolio_status,false,'phase_c_search_business_case',metadata_json
from pages
on conflict (market_code,locale,url_path) do update set
  canonical_url=excluded.canonical_url,
  metadata_json=public.feya_commerce_seo_pages_v1.metadata_json||excluded.metadata_json,
  updated_at=now();

-- Specs: reviewed business cases, never publication authority.
with ids as (
  select
    (select seo_page_id from public.feya_commerce_seo_pages_v1 where market_code='US' and locale='en-US' and url_path='/') home_id,
    (select seo_page_id from public.feya_commerce_seo_pages_v1 where market_code='US' and locale='en-US' and url_path='/shop') shop_id,
    (select seo_page_id from public.feya_commerce_seo_pages_v1 where market_code='US' and locale='en-US' and url_path='/collections/festival-outfits') festival_id
),
specs(url_path,family,parent_path,user_intent,primary_intent,unique_value,selection_rule,excluded_queries,evidence_refs) as (
  values
  (
    '/'::text,'home'::text,null::text,
    'Understand TheFEYA and reach the most important shopping, trust and guide paths.',
    'brand and general TheFEYA discovery',
    'Brand hub; does not own product-type or event query clusters.',
    '{"version":"selection_v1","all":[],"unknown_policy":"exclude_and_queue_review"}'::jsonb,
    '[]'::jsonb,
    '[{"type":"phase_c","ref":"Phase_B_Q02_Q01_Q04_Checkpoint_20260926.md"}]'::jsonb
  ),
  (
    '/shop','shop','/',
    'Browse the complete current TheFEYA catalog.',
    'all-products shopping',
    'Broad catalog hub; category/event owners must not be replaced by /shop.',
    '{"version":"selection_v1","all":[{"field":"orderability","op":"eq","value":"confirmed"}],"unknown_policy":"exclude_and_queue_review"}'::jsonb,
    '[]'::jsonb,
    '[{"type":"phase_c","ref":"Phase_B_Q02_Q01_Q04_Checkpoint_20260926.md"}]'::jsonb
  ),
  (
    '/collections/shoulder-armor','type_hub','/shop',
    'Shop decorative shoulder armor for costume, stage, cosplay and festival styling.',
    'commercial decorative shoulder armor',
    'Sculptural FEYA shoulder pieces with explicit decorative/non-protective positioning; separates fashion/performance use from tactical or historical protective armor.',
    '{"version":"selection_v1","all":[{"field":"sellable_component","op":"contains","value":"shoulders"},{"field":"orderability","op":"eq","value":"confirmed"}],"unknown_policy":"exclude_and_queue_review"}'::jsonb,
    '["tactical shoulder armor","ballistic shoulder armor","motorcycle shoulder armor","protective shoulder armor","football shoulder pads"]'::jsonb,
    '[{"type":"keyword_metrics","source_request_id":"5c524139-03dc-43c0-984b-5d530c4ebb9d"},{"type":"serp","ref":"phase-b-serp-classification-20260926.json"},{"type":"inventory","eligible_products":80}]'::jsonb
  ),
  (
    '/collections/festival-outfits','event_hub','/shop',
    'Shop TheFEYA statement pieces suitable for festival styling.',
    'commercial festival outfits',
    'Event-led selection across multiple FEYA product types, with practical merchandising instead of a generic tag-filter page.',
    '{"version":"selection_v1","all":[{"field":"event","op":"contains","value":"festival"},{"field":"orderability","op":"eq","value":"confirmed"}],"unknown_policy":"exclude_and_queue_review"}'::jsonb,
    '["renaissance festival costumes","oktoberfest outfits"]'::jsonb,
    '[{"type":"keyword_metrics","source_request_id":"5c524139-03dc-43c0-984b-5d530c4ebb9d"},{"type":"serp","ref":"phase-b-serp-classification-20260926.json"},{"type":"inventory","eligible_products":111}]'::jsonb
  ),
  (
    '/collections/rave-outfits','event_hub','/shop',
    'Shop TheFEYA rave outfits and statement performance pieces for EDM/nightlife styling.',
    'commercial rave outfits',
    'Rave-specific assortment and merchandising, distinct from generic festival ownership.',
    '{"version":"selection_v1","all":[{"field":"event","op":"contains","value":"rave"},{"field":"orderability","op":"eq","value":"confirmed"}],"unknown_policy":"exclude_and_queue_review"}'::jsonb,
    '[]'::jsonb,
    '[{"type":"keyword_metrics","source_request_id":"5c524139-03dc-43c0-984b-5d530c4ebb9d"},{"type":"serp","ref":"phase-b-serp-classification-20260926.json"},{"type":"inventory","eligible_products":40}]'::jsonb
  ),
  (
    '/collections/burning-man-looks','event_hub','/shop',
    'Shop TheFEYA pieces selected for Burning Man and desert-event styling.',
    'commercial Burning Man outfits',
    'Burning Man-specific product curation and practical outfit paths without claiming event affiliation or weather/safety guarantees.',
    '{"version":"selection_v1","all":[{"field":"event","op":"contains","value":"burning man"},{"field":"orderability","op":"eq","value":"confirmed"}],"unknown_policy":"exclude_and_queue_review"}'::jsonb,
    '["what to wear to burning man"]'::jsonb,
    '[{"type":"keyword_metrics","source_request_id":"5c524139-03dc-43c0-984b-5d530c4ebb9d"},{"type":"serp","ref":"phase-b-serp-classification-20260926.json"},{"type":"inventory","eligible_products":45}]'::jsonb
  ),
  (
    '/collections/stage-outfits','subhub','/shop',
    'Shop visual stage and performance costumes for performers.',
    'commercial performance costumes',
    'Performance-first FEYA assortment for dancers, DJs, drag performers and shows; avoids claiming broad recital/dancewear intent that the catalog has not proven.',
    '{"version":"selection_v1","all":[{"field":"event","op":"contains","value":"stage"},{"field":"orderability","op":"eq","value":"confirmed"}],"unknown_policy":"exclude_and_queue_review"}'::jsonb,
    '["dance costumes","dance recital costumes","competition dance costumes","stage costume design"]'::jsonb,
    '[{"type":"keyword_metrics","source_request_id":"5c524139-03dc-43c0-984b-5d530c4ebb9d"},{"type":"serp","ref":"phase-b-serp-classification-20260926.json"},{"type":"inventory","eligible_products":96},{"type":"competitor_gap","ref":"Phase_B_Q02_Q01_Q04_Checkpoint_20260926.md"}]'::jsonb
  ),
  (
    '/collections/bodysuits','type_hub','/shop',
    'Shop TheFEYA costume bodysuits.',
    'commercial costume bodysuits',
    'Product-type owner for complete bodysuit designs; event-specific variants remain separate candidates until differentiation is proven.',
    '{"version":"selection_v1","all":[{"field":"sellable_component","op":"contains","value":"bodysuit"},{"field":"orderability","op":"eq","value":"confirmed"}],"unknown_policy":"exclude_and_queue_review"}'::jsonb,
    '["licensed character bodysuit","superhero bodysuit"]'::jsonb,
    '[{"type":"keyword_metrics","source_request_id":"5c524139-03dc-43c0-984b-5d530c4ebb9d"},{"type":"serp","ref":"phase-b-serp-classification-20260926.json"},{"type":"inventory","eligible_products":30}]'::jsonb
  ),
  (
    '/collections/costume-masks','type_hub','/shop',
    'Shop decorative TheFEYA costume masks.',
    'commercial costume masks',
    'FEYA decorative/fashion mask selection; excludes respirator/safety and licensed-character intent.',
    '{"version":"selection_v1","all":[{"field":"sellable_component","op":"contains","value":"mask"},{"field":"orderability","op":"eq","value":"confirmed"}],"unknown_policy":"exclude_and_queue_review"}'::jsonb,
    '["respirator mask","gas mask safety","jason mask","licensed character mask"]'::jsonb,
    '[{"type":"keyword_metrics","source_request_id":"5c524139-03dc-43c0-984b-5d530c4ebb9d"},{"type":"serp","ref":"phase-b-serp-classification-20260926.json"},{"type":"inventory","eligible_products":11}]'::jsonb
  ),
  (
    '/collections/costume-headpieces','type_hub','/shop',
    'Shop TheFEYA costume headpieces and sculptural headdresses.',
    'commercial costume headpieces',
    'Product-type owner for statement headpieces; DIY/tutorial intent is excluded.',
    '{"version":"selection_v1","all":[{"field":"sellable_component","op":"contains","value":"headpiece"},{"field":"orderability","op":"eq","value":"confirmed"}],"unknown_policy":"exclude_and_queue_review"}'::jsonb,
    '["how to make a headpiece","headpiece tutorial"]'::jsonb,
    '[{"type":"keyword_metrics","source_request_id":"5c524139-03dc-43c0-984b-5d530c4ebb9d"},{"type":"serp","ref":"phase-b-serp-classification-20260926.json"},{"type":"inventory","eligible_products":34}]'::jsonb
  ),
  (
    '/collections/festival-skirts','subhub','/collections/festival-outfits',
    'Shop TheFEYA skirts selected for festival styling.',
    'commercial festival skirts',
    'Intersection page justified by a collection-dominant festival-skirt SERP; generic costume-skirt intent remains PDP/filter.',
    '{"version":"selection_v1","all":[{"field":"sellable_component","op":"contains","value":"skirt"},{"field":"event","op":"contains","value":"festival"},{"field":"orderability","op":"eq","value":"confirmed"}],"unknown_policy":"exclude_and_queue_review"}'::jsonb,
    '["costume skirt"]'::jsonb,
    '[{"type":"keyword_metrics","source_request_id":"5c524139-03dc-43c0-984b-5d530c4ebb9d"},{"type":"serp","ref":"phase-b-serp-classification-20260926.json"},{"type":"inventory","eligible_products":56}]'::jsonb
  ),
  (
    '/collections/costume-belts','type_hub','/shop',
    'Shop TheFEYA costume belts and decorative waist pieces.',
    'commercial costume belts',
    'Decorative costume/fashion belt owner; excludes utility, weapon and everyday belt intent.',
    '{"version":"selection_v1","all":[{"field":"sellable_component","op":"contains","value":"belt"},{"field":"orderability","op":"eq","value":"confirmed"}],"unknown_policy":"exclude_and_queue_review"}'::jsonb,
    '["utility belt","gun belt","tool belt","everyday leather belt"]'::jsonb,
    '[{"type":"keyword_metrics","source_request_id":"5c524139-03dc-43c0-984b-5d530c4ebb9d"},{"type":"serp","ref":"phase-b-serp-classification-20260926.json"},{"type":"inventory","eligible_products":13}]'::jsonb
  )
)
insert into public.feya_search_page_specs_v1(
  seo_page_id,family,primary_parent_page_id,accountable_owner,review_state,user_intent,primary_intent,
  unique_value_brief,intent_evidence_status,truth_status,utility_rationale,selection_rule_json,
  inventory_policy_json,excluded_queries_json,evidence_refs_json
)
select
  p.seo_page_id,
  s.family,
  pp.seo_page_id,
  'OSPM',
  case when s.url_path in ('/','/shop') then 'review' else 'review' end,
  s.user_intent,s.primary_intent,s.unique_value,
  case when s.url_path in ('/','/shop') then 'unknown' else 'confirmed' end,
  'unknown',
  case when s.url_path='/' then 'Brand/navigation utility.'
       when s.url_path='/shop' then 'All-products browsing utility.'
       else null end,
  s.selection_rule,
  case when s.url_path in ('/','/shop') then null
       else '{"status":"proposed","minimum_distinct_designs":3,"minimum_epd":4,"policy_version":"Product DNA Search Architecture Decision Framework v1"}'::jsonb end,
  s.excluded_queries,
  s.evidence_refs
from specs s
join public.feya_commerce_seo_pages_v1 p
  on p.market_code='US' and p.locale='en-US' and p.url_path=s.url_path
left join public.feya_commerce_seo_pages_v1 pp
  on pp.market_code='US' and pp.locale='en-US' and pp.url_path=s.parent_path
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
  evidence_refs_json=excluded.evidence_refs_json;

-- Canonical semantic clusters. 'approved' here means the semantic cluster definition is accepted by OSPM;
-- it does NOT authorize a page to publish or index.
with clusters(cluster_code,cluster_label,normalized_intent,intent_type,cluster_status,evidence_json) as (
  values
  ('QC_US_EN_SHOULDER_ARMOR','Shoulder Armor','decorative shoulder armor shopping','commercial','approved',
    '{"seed":"shoulder armor","ams":2900,"demand_score":100,"serp_gate":"pass","candidate":"SHOULDER_ARMOR"}'::jsonb),
  ('QC_US_EN_SHOULDER_ARMOR_COSTUME','Shoulder Armor Costume','costume-specific shoulder armor','commercial','hold',
    '{"seed":"shoulder armor costume","ams":170,"demand_score":70,"serp_gate":"fail"}'::jsonb),
  ('QC_US_EN_COSPLAY_SHOULDER_ARMOR','Cosplay Shoulder Armor','cosplay shoulder armor','commercial','hold',
    '{"seed":"cosplay shoulder armor","ams":140,"demand_score":70,"serp_gate":"fail"}'::jsonb),
  ('QC_US_EN_FASHION_HARNESS','Fashion Harness','fashion body harness shopping','commercial','hold',
    '{"seed":"fashion harness","ams":590,"demand_score":100,"serp_gate":"fail","outcome":"NON_INDEXABLE_FILTER"}'::jsonb),
  ('QC_US_EN_FESTIVAL_HARNESS','Festival Harness','festival harness shopping','commercial','hold',
    '{"seed":"festival harness","ams":40,"demand_score":40,"serp_gate":"fail","outcome":"NON_INDEXABLE_FILTER"}'::jsonb),
  ('QC_US_EN_VEGAN_LEATHER_HARNESS','Vegan Leather Harness','vegan leather harness shopping','commercial','hold',
    '{"seed":"vegan leather harness","ams":30,"demand_score":40,"depth_products":2,"outcome":"PDP_KEYWORD_OR_FILTER"}'::jsonb),
  ('QC_US_EN_FESTIVAL_OUTFITS','Festival Outfits','festival outfit shopping','commercial','approved',
    '{"seed":"festival outfits","ams":18100,"demand_score":100,"serp_gate":"pass","candidate":"FESTIVAL_OUTFITS"}'::jsonb),
  ('QC_US_EN_FESTIVAL_COSTUMES','Festival Costumes','festival costume shopping','commercial','hold',
    '{"seed":"festival costumes","ams":320,"demand_score":70,"serp_gate":"fail"}'::jsonb),
  ('QC_US_EN_RAVE_OUTFITS','Rave Outfits','rave outfit shopping','commercial','approved',
    '{"seed":"rave outfits","ams":60500,"demand_score":100,"serp_gate":"pass","candidate":"RAVE_OUTFITS"}'::jsonb),
  ('QC_US_EN_RAVE_COSTUMES','Rave Costumes','rave costume shopping','commercial','approved',
    '{"seed":"rave costumes","ams":1600,"demand_score":100,"serp_gate":"pass","candidate_same_page":"RAVE_OUTFITS"}'::jsonb),
  ('QC_US_EN_BURNING_MAN_OUTFITS','Burning Man Outfits','burning man outfit shopping','commercial','approved',
    '{"seed":"burning man outfits","ams":2900,"demand_score":100,"serp_gate":"pass","candidate":"BURNING_MAN_OUTFITS"}'::jsonb),
  ('QC_US_EN_BURNING_MAN_COSTUMES','Burning Man Costumes','burning man costume shopping','commercial','approved',
    '{"seed":"burning man costumes","ams":880,"demand_score":100,"serp_gate":"pass","candidate_same_page":"BURNING_MAN_OUTFITS"}'::jsonb),
  ('QC_US_EN_STAGE_COSTUMES','Stage Costumes','stage costume intent','commercial','hold',
    '{"seed":"stage costumes","ams":170,"demand_score":70,"serp_gate":"fail"}'::jsonb),
  ('QC_US_EN_STAGE_OUTFITS','Stage Outfits','stage outfit intent','commercial','hold',
    '{"seed":"stage outfits","ams":390,"demand_score":70,"serp_gate":"fail"}'::jsonb),
  ('QC_US_EN_PERFORMANCE_COSTUMES','Performance Costumes','performance costume shopping','commercial','approved',
    '{"seed":"performance costumes","ams":140,"demand_score":70,"serp_gate":"pass","candidate":"PERFORMANCE_COSTUMES"}'::jsonb),
  ('QC_US_EN_PERFORMANCE_OUTFITS','Performance Outfits','performance outfit intent','commercial','hold',
    '{"seed":"performance outfits","ams":260,"demand_score":70,"serp_gate":"fail"}'::jsonb),
  ('QC_US_EN_DANCE_COSTUMES','Dance Costumes','dance recital and performance costume market','commercial','hold',
    '{"seed":"dance costumes","ams":27100,"demand_score":100,"serp_gate":"pass","hold_reason":"BROADER_MARKET_PRODUCT_FIT_UNPROVEN"}'::jsonb),
  ('QC_US_EN_SHOWGIRL_COSTUMES','Showgirl Costumes','showgirl costume intent','commercial','hold',
    '{"seed":"showgirl costumes","ams":9900,"demand_score":100,"serp_gate":"fail","future_batch":"Q05/persona"}'::jsonb),
  ('QC_US_EN_COSTUME_SETS','Costume Sets','generic costume set shopping','commercial','hold',
    '{"seed":"costume sets","ams":140,"demand_score":70,"serp_gate":"fail","outcome":"NO_DEDICATED_LANDING"}'::jsonb),
  ('QC_US_EN_COSTUME_BODYSUIT','Costume Bodysuits','costume bodysuit shopping','commercial','approved',
    '{"seed":"costume bodysuit","ams":720,"demand_score":100,"serp_gate":"pass","candidate":"COSTUME_BODYSUITS"}'::jsonb),
  ('QC_US_EN_FESTIVAL_BODYSUIT','Festival Bodysuits','festival bodysuit shopping','commercial','hold',
    '{"seed":"festival bodysuit","ams":320,"demand_score":70,"serp_gate":"pass","hold_reason":"DESIGN_FAMILY_AND_DIFFERENTIATION"}'::jsonb),
  ('QC_US_EN_COSTUME_MASKS','Costume Masks','costume mask shopping','commercial','approved',
    '{"seed":"costume masks","ams":2900,"demand_score":100,"serp_gate":"pass","candidate":"COSTUME_MASKS"}'::jsonb),
  ('QC_US_EN_FESTIVAL_MASKS','Festival Masks','festival mask shopping','commercial','hold',
    '{"seed":"festival masks","ams":390,"demand_score":70,"serp_gate":"pass","hold_reason":"DESIGN_FAMILY_AND_DIFFERENTIATION"}'::jsonb),
  ('QC_US_EN_COSTUME_HEADPIECE','Costume Headpieces','costume headpiece shopping','commercial','approved',
    '{"seed":"costume headpiece","ams":70,"demand_score":40,"serp_gate":"pass","candidate":"COSTUME_HEADPIECES"}'::jsonb),
  ('QC_US_EN_FESTIVAL_HEADPIECE','Festival Headpieces','festival headpiece shopping','commercial','hold',
    '{"seed":"festival headpiece","ams":50,"demand_score":40,"serp_gate":"pass","hold_reason":"NARROW_DEMAND_AND_DIFFERENTIATION"}'::jsonb),
  ('QC_US_EN_COSTUME_SKIRT','Costume Skirts','generic costume skirt shopping','commercial','hold',
    '{"seed":"costume skirt","ams":260,"demand_score":70,"serp_gate":"fail","outcome":"PDP_KEYWORD_OR_FILTER"}'::jsonb),
  ('QC_US_EN_FESTIVAL_SKIRT','Festival Skirts','festival skirt shopping','commercial','approved',
    '{"seed":"festival skirt","ams":720,"demand_score":100,"serp_gate":"pass","candidate":"FESTIVAL_SKIRTS"}'::jsonb),
  ('QC_US_EN_COSTUME_BELT','Costume Belts','costume belt shopping','commercial','approved',
    '{"seed":"costume belt","ams":210,"demand_score":70,"serp_gate":"pass","candidate":"COSTUME_BELTS"}'::jsonb),
  ('QC_US_EN_COSTUME_WINGS','Costume Wings','costume wings shopping','commercial','hold',
    '{"seed":"costume wings","ams":1600,"demand_score":100,"serp_gate":"fail","outcome":"PDP_KEYWORD_OR_FILTER"}'::jsonb)
)
insert into public.feya_commerce_seo_query_clusters_v1(
  query_cluster_id,cluster_code,cluster_label,normalized_intent,intent_type,language_code,market_scope,
  cluster_status,source_type,evidence_json
)
select
  extensions.uuid_generate_v5(
    '6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid,
    'thefeya:query-cluster:US:en:'||cluster_code
  ),
  cluster_code,cluster_label,normalized_intent,intent_type,'en','US',cluster_status,
  'phase_b_hypd_serp_20260926',
  evidence_json||jsonb_build_object(
    'keyword_source_request_id','5c524139-03dc-43c0-984b-5d530c4ebb9d',
    'serp_evidence_ref','docs/search/phase-b-serp-classification-20260926.json',
    'policy_version','Product DNA Search Architecture Decision Framework v1'
  )
from clusters
on conflict (cluster_code) do update set
  cluster_label=excluded.cluster_label,
  normalized_intent=excluded.normalized_intent,
  intent_type=excluded.intent_type,
  language_code=excluded.language_code,
  market_scope=excluded.market_scope,
  cluster_status=excluded.cluster_status,
  source_type=excluded.source_type,
  evidence_json=excluded.evidence_json,
  updated_at=now();

-- Semantic members. Different SERP intents stay different clusters even if one future page may own more than one cluster.
with members(cluster_code,keyword_norm,member_role) as (
  values
  ('QC_US_EN_SHOULDER_ARMOR','shoulder armor','seed'),
  ('QC_US_EN_SHOULDER_ARMOR','shoulder armour','member'),
  ('QC_US_EN_SHOULDER_ARMOR_COSTUME','shoulder armor costume','seed'),
  ('QC_US_EN_SHOULDER_ARMOR_COSTUME','costume shoulder armor','member'),
  ('QC_US_EN_COSPLAY_SHOULDER_ARMOR','cosplay shoulder armor','seed'),
  ('QC_US_EN_FASHION_HARNESS','fashion harness','seed'),
  ('QC_US_EN_FASHION_HARNESS','body harness fashion','member'),
  ('QC_US_EN_FASHION_HARNESS','clothing harness','member'),
  ('QC_US_EN_FASHION_HARNESS','women''s body harness','member'),
  ('QC_US_EN_FESTIVAL_HARNESS','festival harness','seed'),
  ('QC_US_EN_VEGAN_LEATHER_HARNESS','vegan leather harness','seed'),
  ('QC_US_EN_FESTIVAL_OUTFITS','festival outfits','seed'),
  ('QC_US_EN_FESTIVAL_OUTFITS','festival clothes','member'),
  ('QC_US_EN_FESTIVAL_OUTFITS','festival wear','member'),
  ('QC_US_EN_FESTIVAL_OUTFITS','festival outfits women','member'),
  ('QC_US_EN_FESTIVAL_COSTUMES','festival costumes','seed'),
  ('QC_US_EN_RAVE_OUTFITS','rave outfits','seed'),
  ('QC_US_EN_RAVE_OUTFITS','rave clothes','member'),
  ('QC_US_EN_RAVE_OUTFITS','rave wear','member'),
  ('QC_US_EN_RAVE_OUTFITS','rave attire','member'),
  ('QC_US_EN_RAVE_OUTFITS','rave outfits women','member'),
  ('QC_US_EN_RAVE_COSTUMES','rave costumes','seed'),
  ('QC_US_EN_BURNING_MAN_OUTFITS','burning man outfits','seed'),
  ('QC_US_EN_BURNING_MAN_COSTUMES','burning man costumes','seed'),
  ('QC_US_EN_STAGE_COSTUMES','stage costumes','seed'),
  ('QC_US_EN_STAGE_OUTFITS','stage outfits','seed'),
  ('QC_US_EN_PERFORMANCE_COSTUMES','performance costumes','seed'),
  ('QC_US_EN_PERFORMANCE_OUTFITS','performance outfits','seed'),
  ('QC_US_EN_DANCE_COSTUMES','dance costumes','seed'),
  ('QC_US_EN_SHOWGIRL_COSTUMES','showgirl costumes','seed'),
  ('QC_US_EN_COSTUME_SETS','costume sets','seed'),
  ('QC_US_EN_COSTUME_BODYSUIT','costume bodysuit','seed'),
  ('QC_US_EN_COSTUME_BODYSUIT','costume bodysuits','member'),
  ('QC_US_EN_FESTIVAL_BODYSUIT','festival bodysuit','seed'),
  ('QC_US_EN_COSTUME_MASKS','costume masks','seed'),
  ('QC_US_EN_COSTUME_MASKS','costume mask','member'),
  ('QC_US_EN_FESTIVAL_MASKS','festival masks','seed'),
  ('QC_US_EN_COSTUME_HEADPIECE','costume headpiece','seed'),
  ('QC_US_EN_COSTUME_HEADPIECE','costume headpieces','member'),
  ('QC_US_EN_FESTIVAL_HEADPIECE','festival headpiece','seed'),
  ('QC_US_EN_COSTUME_SKIRT','costume skirt','seed'),
  ('QC_US_EN_FESTIVAL_SKIRT','festival skirt','seed'),
  ('QC_US_EN_FESTIVAL_SKIRT','festival skirts','member'),
  ('QC_US_EN_COSTUME_BELT','costume belt','seed'),
  ('QC_US_EN_COSTUME_BELT','costume belts','member'),
  ('QC_US_EN_COSTUME_WINGS','costume wings','seed')
)
insert into public.feya_commerce_seo_query_cluster_members_v1(
  query_cluster_id,keyword_id,keyword_norm,member_role,source_type,evidence_json
)
select
  c.query_cluster_id,
  km.keyword_id,
  m.keyword_norm,
  m.member_role,
  'phase_c_semantic_registry',
  jsonb_build_object(
    'keyword_metric_snapshot_id',ms.snapshot_id,
    'avg_monthly_searches',ms.avg_monthly_searches,
    'source_request_id',ms.source_request_id,
    'freshness',ms.data_freshness_status
  )
from members m
join public.feya_commerce_seo_query_clusters_v1 c on c.cluster_code=m.cluster_code
left join lateral (
  select keyword_id
  from public.feya_commerce_seo_keyword_master_v1 k
  where lower(k.keyword_norm)=lower(m.keyword_norm)
  order by keyword_id
  limit 1
) km on true
left join lateral (
  select snapshot_id,avg_monthly_searches,source_request_id,data_freshness_status
  from public.feya_commerce_seo_keyword_metric_snapshots_v1 s
  where lower(s.keyword_norm)=lower(m.keyword_norm)
  order by fetched_at desc nulls last,snapshot_id desc
  limit 1
) ms on true
on conflict (query_cluster_id,keyword_norm) do update set
  keyword_id=excluded.keyword_id,
  member_role=excluded.member_role,
  source_type=excluded.source_type,
  evidence_json=excluded.evidence_json;

-- Page-ownership recommendations. These remain REVIEW proposals and do not create active ownership.
with mapping(cluster_code,url_path,rationale) as (
  values
  ('QC_US_EN_SHOULDER_ARMOR','/collections/shoulder-armor',
   'Dedicated decorative shoulder-armor business case; exact page stays noindex until membership/differentiation/link gates pass.'),
  ('QC_US_EN_FESTIVAL_OUTFITS','/collections/festival-outfits',
   'Festival outfits has strong US demand, collection-dominant SERP and deep FEYA inventory.'),
  ('QC_US_EN_RAVE_OUTFITS','/collections/rave-outfits',
   'Rave outfits has strong independent demand and collection-dominant SERP.'),
  ('QC_US_EN_RAVE_COSTUMES','/collections/rave-outfits',
   'Rave costumes remains a separate semantic cluster but can be served by the same Rave page; no duplicate URL is proposed.'),
  ('QC_US_EN_BURNING_MAN_OUTFITS','/collections/burning-man-looks',
   'Burning Man outfit intent has strong seasonal demand and commercial SERP.'),
  ('QC_US_EN_BURNING_MAN_COSTUMES','/collections/burning-man-looks',
   'Burning Man costumes is a separate query cluster proposed to the same event landing rather than a second near-duplicate page.'),
  ('QC_US_EN_PERFORMANCE_COSTUMES','/collections/stage-outfits',
   'Performance costumes has collection-dominant SERP and strong FEYA stage inventory; stage/dance clusters remain separate holds.'),
  ('QC_US_EN_COSTUME_BODYSUIT','/collections/bodysuits',
   'Costume bodysuits has commercial SERP, strong demand and sufficient inventory.'),
  ('QC_US_EN_COSTUME_MASKS','/collections/costume-masks',
   'Costume masks has strong commercial SERP and enough current sellable masks.'),
  ('QC_US_EN_COSTUME_HEADPIECE','/collections/costume-headpieces',
   'Costume headpieces passes demand/SERP/depth search gates; final differentiation still required.'),
  ('QC_US_EN_FESTIVAL_SKIRT','/collections/festival-skirts',
   'Festival skirts has independent commercial intent; generic costume-skirt intent is PDP-dominant and is not assigned here.'),
  ('QC_US_EN_COSTUME_BELT','/collections/costume-belts',
   'Costume belts has collection-dominant SERP and a real 13-product sellable subset.')
),
run as (
  select extensions.uuid_generate_v5(
    '6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid,
    'thefeya:phase-c-page-ownership:2026-09-26'
  ) run_id
)
insert into public.feya_commerce_seo_page_ownership_proposals_v1(
  proposal_id,query_cluster_id,seo_page_id,ownership_role,market_code,locale,rationale,evidence_json,
  proposal_status,model_name,prompt_version,run_id,proposal_hash
)
select
  extensions.uuid_generate_v5(
    '6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid,
    'thefeya:ownership-proposal:'||m.cluster_code||':'||m.url_path
  ),
  c.query_cluster_id,
  p.seo_page_id,
  'primary','US','en-US',m.rationale,
  jsonb_build_object(
    'phase','C',
    'keyword_source_request_id','5c524139-03dc-43c0-984b-5d530c4ebb9d',
    'serp_evidence_ref','docs/search/phase-b-serp-classification-20260926.json',
    'eligibility_ref','docs/search/phase-b-preliminary-eligibility-20260926.json',
    'index_authorized',false
  ),
  'REVIEW',
  'GPT-5.6 Sol',
  'FEYA_PreIndex_Search_Architecture_Master_Prompt_v2',
  run.run_id,
  encode(extensions.digest(convert_to(
    jsonb_build_object(
      'cluster_code',m.cluster_code,'url_path',m.url_path,'role','primary',
      'market','US','locale','en-US','phase','C'
    )::text,'UTF8'
  ),'sha256'),'hex')
from mapping m
join public.feya_commerce_seo_query_clusters_v1 c on c.cluster_code=m.cluster_code
join public.feya_commerce_seo_pages_v1 p on p.market_code='US' and p.locale='en-US' and p.url_path=m.url_path
cross join run
on conflict (proposal_id) do update set
  rationale=excluded.rationale,
  evidence_json=excluded.evidence_json,
  proposal_status='REVIEW',
  proposal_hash=excluded.proposal_hash,
  updated_at=now();

commit;
