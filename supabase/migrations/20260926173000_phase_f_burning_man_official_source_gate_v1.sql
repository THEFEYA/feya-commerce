-- Phase F follow-up: official Burning Man source gate completed.
-- This unlocks drafting, not publication/indexing.
begin;

update public.feya_search_page_specs_v1 s
set truth_status='confirmed',
    review_state='review',
    evidence_refs_json=s.evidence_refs_json || jsonb_build_array(
      jsonb_build_object(
        'type','official_event_sources',
        'ref','docs/search/Burning_Man_Editorial_Source_Brief_2026.md',
        'reviewed_at','2026-09-26',
        'source_owner','Burning Man Project'
      ),
      jsonb_build_object(
        'type','inventory_moop_text_scan',
        'burning_man_members',45,
        'potential_moop_text_hits',0,
        'scope','approved SEO/Product Truth text only'
      )
    ),
    updated_at=now()
from public.feya_commerce_seo_pages_v1 p
where p.seo_page_id=s.seo_page_id
  and p.market_code='US'
  and p.locale='en-US'
  and p.url_path='/guides/what-to-wear-to-burning-man'
  and p.indexation_intent='noindex';

update public.feya_commerce_seo_page_ownership_proposals_v1 op
set evidence_json=op.evidence_json || jsonb_build_object(
      'official_event_guidance_reviewed',true,
      'official_source_brief','docs/search/Burning_Man_Editorial_Source_Brief_2026.md',
      'index_authorized',false
    ),
    updated_at=now()
from public.feya_commerce_seo_pages_v1 p
where p.seo_page_id=op.seo_page_id
  and p.url_path='/guides/what-to-wear-to-burning-man'
  and op.proposal_status='REVIEW';

commit;
