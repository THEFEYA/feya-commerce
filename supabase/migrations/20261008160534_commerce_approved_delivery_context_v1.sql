-- Additive, service-only read. No heads, tariffs, orders or payments are written.
begin;
create function public.feya_commerce_approved_delivery_context_v1(p_quote_receipt_ids uuid[]) returns jsonb
language plpgsql stable security invoker set search_path = '' as $$
declare approval public.feya_commerce_delivery_approvals_v1;
  workspace public.feya_commerce_delivery_workspace_versions_v1;
  catalog jsonb; catalog_hash text; merchandise jsonb; valid_count integer; currency_count integer; release_count integer;
begin
  if has_function_privilege('anon','public.feya_commerce_approved_delivery_context_v1(uuid[])','EXECUTE')
    or has_function_privilege('authenticated','public.feya_commerce_approved_delivery_context_v1(uuid[])','EXECUTE')
    or not has_function_privilege('service_role','public.feya_commerce_approved_delivery_context_v1(uuid[])','EXECUTE')
    or exists(select 1 from pg_catalog.pg_proc p where p.oid='public.feya_commerce_approved_delivery_context_v1(uuid[])'::regprocedure
      and (p.prosecdef or p.provolatile<>'s' or not coalesce(p.proconfig@>array['search_path=""'],false)))
    or (public.feya_commerce_delivery_approval_health_v1()->>'ready')::boolean is not true
    or (public.feya_commerce_quote_health_v1()->>'ready')::boolean is not true
    then raise exception 'approved_delivery_boundary_not_ready'; end if;
  if p_quote_receipt_ids is null or cardinality(p_quote_receipt_ids) not between 1 and 20
    or array_ndims(p_quote_receipt_ids)<>1 or array_position(p_quote_receipt_ids,null) is not null
    or (select count(distinct id) from unnest(p_quote_receipt_ids) id)<>cardinality(p_quote_receipt_ids)
    then raise exception 'approved_delivery_request_invalid'; end if;
  -- STABLE guarantees one statement snapshot across these reads. The editable draft
  -- head is intentionally absent: an unapproved edit cannot become a customer rate.
  select a.* into approval from public.feya_commerce_delivery_approval_head_v1 h
    join public.feya_commerce_delivery_approvals_v1 a on a.approval_id=h.approval_id and a.revision=h.revision
    where h.workspace_key='thefeya';
  if not found then raise exception 'approved_delivery_approval_required'; end if;
  select * into workspace from public.feya_commerce_delivery_workspace_versions_v1
    where version_id=approval.workspace_version_id and revision=approval.workspace_revision;
  if not found or workspace.snapshot_sha256<>approval.snapshot_sha256 then raise exception 'approved_delivery_authority_mismatch'; end if;
  catalog := public.feya_commerce_delivery_catalog_v1();
  catalog_hash := encode(pg_catalog.sha256(convert_to(catalog::text,'UTF8')),'hex');
  if catalog_hash<>approval.catalog_sha256 then raise exception 'approved_delivery_catalog_changed'; end if;
  select count(*),count(distinct q.currency),count(distinct o.release_ref),
    jsonb_agg(jsonb_build_object('quote_receipt_id',q.quote_receipt_id,'canonical_product_id',q.canonical_product_id,
      'configuration_price_id',q.configuration_price_id,'variant_id',q.variant_id,'color_id',q.color_id,'size_id',q.size_id,
      'quantity',q.quantity,'unit_amount_minor',q.unit_amount_minor,'line_amount_minor',q.line_amount_minor,'currency',q.currency,
      'offer_revision_id',q.offer_revision_id,'price_quote_id',q.price_quote_id,'price_revision',q.price_revision,'release_ref',o.release_ref)
      order by q.quote_receipt_id)
    into valid_count,currency_count,release_count,merchandise
    from public.feya_commerce_quote_receipts_v1 q
    join public.feya_commerce_offer_heads_v1 h on h.canonical_product_id=q.canonical_product_id and h.current_offer_revision_id=q.offer_revision_id
    join public.feya_commerce_offer_revisions_v1 o on o.offer_revision_id=q.offer_revision_id and o.canonical_product_id=q.canonical_product_id
      and o.product_revision=q.product_revision and o.status='active'
    join public.feya_commerce_offer_variant_items_v1 i on i.offer_revision_id=q.offer_revision_id and i.canonical_product_id=q.canonical_product_id
      and i.variant_id=q.variant_id and i.configuration_price_id=q.configuration_price_id and i.item_status='active'
      and i.color_id is not distinct from q.color_id and i.size_id is not distinct from q.size_id
      and i.amount_minor=q.unit_amount_minor and i.currency=q.currency and i.price_quote_id=q.price_quote_id
      and i.price_revision=q.price_revision and i.price_source=q.price_source
    where q.quote_receipt_id=any(p_quote_receipt_ids) and q.quantity<=o.max_quantity_per_line
      and q.line_amount_minor=q.unit_amount_minor::numeric*q.quantity
      and (q.expires_at is null or q.expires_at>now());
  if valid_count<>cardinality(p_quote_receipt_ids) then raise exception 'approved_delivery_quote_not_current'; end if;
  if currency_count<>1 or release_count<>1 then raise exception 'approved_delivery_basket_mismatch'; end if;
  return jsonb_build_object('contract_version','commerce_approved_delivery_context_v1',
    'approval',public.feya_commerce_read_delivery_approval_v1(),
    'approved_workspace',jsonb_build_object('contract_version','commerce_delivery_workspace_draft_v1',
      'version_id',workspace.version_id,'revision',workspace.revision,'snapshot_sha256',workspace.snapshot_sha256,
      'draft',workspace.draft,'updated_at',workspace.created_at,'public_rates_enabled',false,'payment_enabled',false,'provider_session_enabled',false),
    'catalog',catalog,'catalog_sha256',catalog_hash,'merchandise',merchandise,'calculated_at',now(),
    'public_rates_enabled',false,'payment_enabled',false,'provider_session_enabled',false);
end $$;
revoke all on function public.feya_commerce_approved_delivery_context_v1(uuid[]) from public,anon,authenticated,service_role;
grant execute on function public.feya_commerce_approved_delivery_context_v1(uuid[]) to service_role;
comment on function public.feya_commerce_approved_delivery_context_v1(uuid[]) is
  'Private read of exact approved delivery settings and current immutable merchandise receipts. No public shipping publication, payable receipt, order or payment creation.';
notify pgrst, 'reload schema';
commit;
