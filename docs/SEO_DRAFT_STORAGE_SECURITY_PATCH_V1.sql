-- FEYA Commerce / TheFEYA
-- Existing SEO draft storage security patch v1
-- Review in Supabase SQL Editor before execution. The application never auto-runs it.

begin;

alter table public.feya_commerce_seo_pack_drafts_v1 enable row level security;
alter table public.feya_commerce_seo_pack_draft_events_v1 enable row level security;

revoke all on table public.feya_commerce_seo_pack_drafts_v1 from anon, authenticated;
revoke all on table public.feya_commerce_seo_pack_draft_events_v1 from anon, authenticated;
revoke all on table public.feya_commerce_v_seo_pack_drafts_latest_v1 from anon, authenticated;
revoke all on table public.feya_commerce_v_seo_pack_review_queue_v1 from anon, authenticated;

grant select, insert, update, delete on table public.feya_commerce_seo_pack_drafts_v1 to service_role;
grant select, insert, update, delete on table public.feya_commerce_seo_pack_draft_events_v1 to service_role;
grant select on table public.feya_commerce_v_seo_pack_drafts_latest_v1 to service_role;
grant select on table public.feya_commerce_v_seo_pack_review_queue_v1 to service_role;

commit;

-- Expected checks (run separately after review/application):
-- select relname, relrowsecurity
-- from pg_class
-- where relname in (
--   'feya_commerce_seo_pack_drafts_v1',
--   'feya_commerce_seo_pack_draft_events_v1'
-- );
