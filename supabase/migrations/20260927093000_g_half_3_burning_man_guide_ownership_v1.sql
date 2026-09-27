-- G-half-3 ownership reconciliation: bind the already-approved Burning Man guide intent
-- to the already-existing editorial page. This does not authorize indexing.
do $$
declare
  v_cluster uuid;
  v_page uuid;
  v_existing int;
begin
  select query_cluster_id into v_cluster
  from public.feya_commerce_seo_query_clusters_v1
  where cluster_code='QC_US_EN_BURNING_MAN_WHAT_TO_WEAR'
    and cluster_status='approved';

  select seo_page_id into v_page
  from public.feya_commerce_seo_pages_v1
  where market_code='US'
    and locale='en-US'
    and url_path='/guides/what-to-wear-to-burning-man'
    and page_type='editorial';

  if v_cluster is null then raise exception 'burning_man_guide_cluster_missing'; end if;
  if v_page is null then raise exception 'burning_man_guide_page_missing'; end if;

  select count(*) into v_existing
  from public.feya_commerce_seo_page_query_ownership_v1
  where query_cluster_id=v_cluster
    and ownership_role='primary'
    and ownership_status in ('intended','active','protected')
    and effective_to is null;

  if v_existing>1 then raise exception 'burning_man_guide_primary_owner_conflict:%',v_existing; end if;

  insert into public.feya_commerce_seo_page_query_ownership_v1(
    page_query_ownership_id,seo_page_id,query_cluster_id,
    ownership_role,ownership_status,market_code,locale,evidence_json,effective_from
  )
  values(
    extensions.uuid_generate_v5(
      '6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid,
      'thefeya:page-query-ownership:guide-burning-man-what-to-wear:US:en-US'
    ),
    v_page,
    v_cluster,
    'primary',
    'intended',
    'US',
    'en-US',
    jsonb_build_object(
      'phase','G-half-3',
      'decision','EDITORIAL_GUIDE',
      'source','Phase_F_Editorial_Eligibility_Set_1_20260926.md',
      'owner_path','/guides/what-to-wear-to-burning-man',
      'index_authorized',false,
      'reconciliation_date','2026-09-27'
    ),
    now()
  )
  on conflict (seo_page_id,query_cluster_id,market_code,locale) do update set
    ownership_role='primary',
    ownership_status='intended',
    evidence_json=excluded.evidence_json,
    effective_to=null,
    updated_at=now();
end $$;

do $$
declare c int;
begin
  select count(*) into c
  from public.feya_commerce_seo_page_query_ownership_v1 o
  join public.feya_commerce_seo_query_clusters_v1 q using(query_cluster_id)
  where q.cluster_code='QC_US_EN_BURNING_MAN_WHAT_TO_WEAR'
    and o.ownership_role='primary'
    and o.ownership_status='intended'
    and o.effective_to is null;
  if c<>1 then raise exception 'burning_man_guide_owner_reconciliation_failed:%',c; end if;
end $$;
