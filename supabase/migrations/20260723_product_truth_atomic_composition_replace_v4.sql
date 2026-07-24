-- FEYA Commerce Product Truth composition replacement v4
--
-- Purpose:
-- Replace the complete human-confirmed component set in one database
-- transaction. This prevents a partially updated Product Truth when a
-- multi-request admin action fails between approving and revoking rows.

create or replace function public.feya_commerce_replace_product_component_assertions_v1(
  p_canonical_product_id uuid,
  p_presence_scope text,
  p_component_family_ids uuid[],
  p_evidence_json jsonb default '{}'::jsonb,
  p_reviewed_by text default 'admin',
  p_review_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_now timestamptz := now();
  v_component_family_ids uuid[];
  v_active_family_count integer;
  v_approved_count integer;
begin
  if p_presence_scope not in ('fixed_base', 'canonical_listing') then
    raise exception 'Unsupported Product Truth presence scope: %', p_presence_scope
      using errcode = '22023';
  end if;

  if nullif(btrim(coalesce(p_reviewed_by, '')), '') is null then
    raise exception 'Product Truth reviewer is required'
      using errcode = '22023';
  end if;

  select array_agg(distinct requested.component_family_id order by requested.component_family_id)
  into v_component_family_ids
  from unnest(coalesce(p_component_family_ids, array[]::uuid[]))
    as requested(component_family_id);

  if coalesce(array_length(v_component_family_ids, 1), 0) = 0 then
    raise exception 'At least one Product Truth component family is required'
      using errcode = '22023';
  end if;

  -- The canonical product row is the transaction lock for all composition
  -- confirmations for this product.
  perform 1
  from public.feya_commerce_product_drafts
  where canonical_product_id = p_canonical_product_id
  for update;

  if not found then
    raise exception 'Canonical Product Truth product not found: %', p_canonical_product_id
      using errcode = 'P0002';
  end if;

  select count(*)
  into v_active_family_count
  from public.feya_commerce_component_families
  where active_flag is true
    and component_family_id = any(v_component_family_ids);

  if v_active_family_count <> array_length(v_component_family_ids, 1) then
    raise exception 'One or more Product Truth component families are missing or inactive'
      using errcode = '22023';
  end if;

  insert into public.feya_commerce_product_component_assertions_v1 (
    canonical_product_id,
    component_family_id,
    presence_scope,
    evidence_source,
    evidence_json,
    review_status,
    reviewed_at,
    reviewed_by,
    review_note,
    active_flag,
    updated_at
  )
  select
    p_canonical_product_id,
    component_family_id,
    p_presence_scope,
    'manual_admin_review',
    coalesce(p_evidence_json, '{}'::jsonb),
    'approved',
    v_now,
    btrim(p_reviewed_by),
    p_review_note,
    true,
    v_now
  from unnest(v_component_family_ids) as selected(component_family_id)
  on conflict (canonical_product_id, component_family_id, presence_scope)
  do update set
    evidence_source = excluded.evidence_source,
    evidence_json = excluded.evidence_json,
    review_status = excluded.review_status,
    reviewed_at = excluded.reviewed_at,
    reviewed_by = excluded.reviewed_by,
    review_note = excluded.review_note,
    active_flag = true,
    updated_at = excluded.updated_at;

  update public.feya_commerce_product_component_assertions_v1
  set
    review_status = 'rejected',
    active_flag = false,
    reviewed_at = v_now,
    reviewed_by = btrim(p_reviewed_by),
    review_note = 'Replaced by an explicit Listing Master composition confirmation.',
    updated_at = v_now
  where canonical_product_id = p_canonical_product_id
    and presence_scope = p_presence_scope
    and active_flag is true
    and not (component_family_id = any(v_component_family_ids));

  select count(*)
  into v_approved_count
  from public.feya_commerce_product_component_assertions_v1
  where canonical_product_id = p_canonical_product_id
    and presence_scope = p_presence_scope
    and review_status = 'approved'
    and active_flag is true;

  if v_approved_count <> array_length(v_component_family_ids, 1) then
    raise exception 'Product Truth composition verification failed'
      using errcode = 'P0001';
  end if;

  return jsonb_build_object(
    'canonical_product_id', p_canonical_product_id,
    'presence_scope', p_presence_scope,
    'component_family_ids', to_jsonb(v_component_family_ids),
    'approved_count', v_approved_count,
    'reviewed_at', v_now
  );
end;
$function$;

comment on function public.feya_commerce_replace_product_component_assertions_v1(
  uuid,
  text,
  uuid[],
  jsonb,
  text,
  text
) is
  'Atomically replaces the complete approved Product Truth component set for one product and one presence scope.';

revoke all on function public.feya_commerce_replace_product_component_assertions_v1(
  uuid,
  text,
  uuid[],
  jsonb,
  text,
  text
) from public;
revoke all on function public.feya_commerce_replace_product_component_assertions_v1(
  uuid,
  text,
  uuid[],
  jsonb,
  text,
  text
) from anon;
revoke all on function public.feya_commerce_replace_product_component_assertions_v1(
  uuid,
  text,
  uuid[],
  jsonb,
  text,
  text
) from authenticated;
grant execute on function public.feya_commerce_replace_product_component_assertions_v1(
  uuid,
  text,
  uuid[],
  jsonb,
  text,
  text
) to service_role;
