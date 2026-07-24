-- FEYA Commerce / TheFEYA
-- Existing SEO draft storage security patch v1
-- Applied to project ysnizcgzhdwdfdkjkhud on 2026-07-12 as
-- feya_commerce_seo_draft_storage_security_v1.
-- Server-only storage contract: no client role may read or mutate review drafts.

begin;

alter table public.feya_commerce_seo_pack_drafts_v1 enable row level security;
alter table public.feya_commerce_seo_pack_draft_events_v1 enable row level security;

revoke all on table public.feya_commerce_seo_pack_drafts_v1 from public, anon, authenticated, service_role;
revoke all on table public.feya_commerce_seo_pack_draft_events_v1 from public, anon, authenticated, service_role;
revoke all on table public.feya_commerce_v_seo_pack_drafts_latest_v1 from public, anon, authenticated, service_role;
revoke all on table public.feya_commerce_v_seo_pack_review_queue_v1 from public, anon, authenticated, service_role;

grant select, insert, update, delete on table public.feya_commerce_seo_pack_drafts_v1 to service_role;
grant select, insert, update, delete on table public.feya_commerce_seo_pack_draft_events_v1 to service_role;
grant select on table public.feya_commerce_v_seo_pack_drafts_latest_v1 to service_role;
grant select on table public.feya_commerce_v_seo_pack_review_queue_v1 to service_role;

commit;

-- Expected checks (run separately after review/application):
-- select relname, relrowsecurity, relacl
-- from pg_class
-- where relname in (
--   'feya_commerce_seo_pack_drafts_v1',
--   'feya_commerce_seo_pack_draft_events_v1',
--   'feya_commerce_v_seo_pack_drafts_latest_v1',
--   'feya_commerce_v_seo_pack_review_queue_v1'
-- );
