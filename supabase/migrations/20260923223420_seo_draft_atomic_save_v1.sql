-- Additive, review-only storage. Historical drafts, approvals, prices and IDs stay intact.
-- Depends on the observed v1 draft + event tables. Deploy before the updated save route.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '60s';

create table public.feya_commerce_seo_draft_save_receipts_v1 (
  request_key text primary key check (request_key ~ '^[a-f0-9]{64}$'),
  payload_sha256 text not null check (payload_sha256 ~ '^[a-f0-9]{64}$'),
  draft_id uuid not null unique references public.feya_commerce_seo_pack_drafts_v1(id) on delete restrict,
  event_id uuid not null unique references public.feya_commerce_seo_pack_draft_events_v1(id) on delete restrict,
  created_at timestamptz not null default now()
);
alter table public.feya_commerce_seo_draft_save_receipts_v1 enable row level security;
revoke all on public.feya_commerce_seo_draft_save_receipts_v1 from public, anon, authenticated, service_role;
grant select, insert on public.feya_commerce_seo_draft_save_receipts_v1 to service_role;

create function public.feya_commerce_save_seo_review_draft_v1(p_request_key text, p_payload jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_hash text;
  v_receipt public.feya_commerce_seo_draft_save_receipts_v1;
  v_draft public.feya_commerce_seo_pack_drafts_v1;
  v_event public.feya_commerce_seo_pack_draft_events_v1;
  v_replayed boolean := false;
  v_fields constant text[] := array[
    'canonical_product_id','matched_etsy_listing_id','product_slug','pack_version','source_brief_version',
    'output_contract_version','status','review_status','source_mode','seo_title','h1','meta_description',
    'intro','bullet_highlights','faq','image_alt_candidates','internal_linking_hints','product_truth_snapshot',
    'manual_focus_snapshot','keyword_roles_snapshot','metrics_status_snapshot','qa_self_report',
    'similarity_check_snapshot','agent_input_snapshot','agent_output_snapshot','validation_result_snapshot','created_by'
  ];
begin
  if p_request_key is null or p_request_key !~ '^[a-f0-9]{64}$'
    or jsonb_typeof(p_payload) is distinct from 'object' then
    raise exception 'Invalid atomic draft save request' using errcode = '22023';
  end if;
  if exists (select 1 from jsonb_object_keys(p_payload) k where not (k = any(v_fields))) then
    raise exception 'Unsupported draft payload field' using errcode = '22023';
  end if;
  if coalesce(p_payload->>'status', '') not in ('draft_generated','needs_human_review')
    or p_payload->>'review_status' is distinct from 'not_reviewed'
    or p_payload#>'{validation_result_snapshot,ok}' is distinct from 'true'::jsonb
    or p_payload#>>'{agent_output_snapshot,editorial_policy_version}' is distinct from 'brand_mission_v2'
    or p_payload#>'{validation_result_snapshot,assembled_seo_pack,quality_gate,ready_for_publish}' is distinct from 'false'::jsonb
    or p_payload#>>'{validation_result_snapshot,assembled_seo_pack,apply,status}' is distinct from 'blocked_until_approval' then
    raise exception 'Only validated, unapproved current-policy review drafts may be saved' using errcode = '23514';
  end if;
  v_hash := encode(sha256(convert_to(p_payload::text, 'UTF8')), 'hex');
  -- One transaction-level lock per request key, released on commit/rollback.
  -- Hash collisions only serialize unrelated requests; full keys/hashes decide identity.
  perform pg_advisory_xact_lock(hashtextextended('feya-seo-review-v1:' || p_request_key, 0));
  select * into v_receipt from public.feya_commerce_seo_draft_save_receipts_v1 where request_key = p_request_key;
  if found then
    if v_receipt.payload_sha256 <> v_hash then
      raise exception 'Idempotency key already used for different draft content' using errcode = '23505';
    end if;
    select * into strict v_draft from public.feya_commerce_seo_pack_drafts_v1 where id = v_receipt.draft_id;
    select * into strict v_event from public.feya_commerce_seo_pack_draft_events_v1 where id = v_receipt.event_id;
    v_replayed := true;
  else
    -- Explicit insert list excludes IDs, review decisions, CQA and publish fields.
    insert into public.feya_commerce_seo_pack_drafts_v1 (
      canonical_product_id,matched_etsy_listing_id,product_slug,pack_version,source_brief_version,
      output_contract_version,status,review_status,source_mode,seo_title,h1,meta_description,
      intro,bullet_highlights,faq,image_alt_candidates,internal_linking_hints,product_truth_snapshot,
      manual_focus_snapshot,keyword_roles_snapshot,metrics_status_snapshot,qa_self_report,
      similarity_check_snapshot,agent_input_snapshot,agent_output_snapshot,validation_result_snapshot,created_by
    ) select
      p.canonical_product_id,p.matched_etsy_listing_id,p.product_slug,p.pack_version,p.source_brief_version,
      p.output_contract_version,p.status,p.review_status,p.source_mode,p.seo_title,p.h1,p.meta_description,
      p.intro,p.bullet_highlights,p.faq,p.image_alt_candidates,p.internal_linking_hints,p.product_truth_snapshot,
      p.manual_focus_snapshot,p.keyword_roles_snapshot,p.metrics_status_snapshot,p.qa_self_report,
      p.similarity_check_snapshot,p.agent_input_snapshot,p.agent_output_snapshot,p.validation_result_snapshot,p.created_by
    from jsonb_populate_record(null::public.feya_commerce_seo_pack_drafts_v1, p_payload) p
    returning * into v_draft;

    insert into public.feya_commerce_seo_pack_draft_events_v1 (
      draft_id,canonical_product_id,event_type,from_status,to_status,actor,note,payload
    ) values (
      v_draft.id,v_draft.canonical_product_id,'draft_created',null,v_draft.status,v_draft.created_by,
      'SEO review draft saved atomically. No approval or publish action was performed.',
      jsonb_build_object('source_mode',v_draft.source_mode,'output_contract_version',v_draft.output_contract_version,
        'validation_status',v_draft.validation_result_snapshot->>'status',
        'validation_issue_count',jsonb_array_length(coalesce(v_draft.validation_result_snapshot->'issues','[]'::jsonb)),
        'review_status',v_draft.review_status,'storage_contract','atomic_review_save_v1')
    ) returning * into v_event;

    insert into public.feya_commerce_seo_draft_save_receipts_v1(request_key,payload_sha256,draft_id,event_id)
      values(p_request_key,v_hash,v_draft.id,v_event.id);
  end if;
  return jsonb_build_object(
    'draft', jsonb_build_object('id',v_draft.id,'canonical_product_id',v_draft.canonical_product_id,
      'product_slug',v_draft.product_slug,'status',v_draft.status,'review_status',v_draft.review_status,
      'source_mode',v_draft.source_mode,'created_at',v_draft.created_at),
    'event', jsonb_build_object('id',v_event.id,'draft_id',v_event.draft_id,
      'canonical_product_id',v_event.canonical_product_id,'event_type',v_event.event_type,
      'to_status',v_event.to_status,'created_at',v_event.created_at),
    'replayed',v_replayed
  );
end;
$function$;
revoke all on function public.feya_commerce_save_seo_review_draft_v1(text,jsonb) from public, anon, authenticated;
grant execute on function public.feya_commerce_save_seo_review_draft_v1(text,jsonb) to service_role;

create function public.feya_commerce_seo_draft_save_contract_v1()
returns text language sql stable security invoker set search_path = ''
as $function$ select 'atomic_review_save_v1'::text; $function$;
revoke all on function public.feya_commerce_seo_draft_save_contract_v1() from public, anon, authenticated;
grant execute on function public.feya_commerce_seo_draft_save_contract_v1() to service_role;
comment on table public.feya_commerce_seo_draft_save_receipts_v1 is
  'Private immutable-by-service-ACL request receipts. No historical draft backfill; not a publish authority.';
notify pgrst, 'reload schema';
commit;
