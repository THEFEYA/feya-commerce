-- Phase13 P0C: derived health freshness, not a rewrite of dated evidence.
-- Retain the original feya_growth_data_source_health_v1 append-only observations
-- and feya_commerce_v_data_source_health_latest_safe_v1 historical snapshot.
-- This safe V2 projects effective status from evidence age on every read.
create view public.feya_commerce_v_data_source_health_effective_safe_v2
with (security_invoker=true,security_barrier=true) as
with evidence as (
  select h.*,
    (
      coalesce(h.checked_at < now() - make_interval(secs => least(
        case when coalesce(h.expected_max_age_seconds,0)>0
          then h.expected_max_age_seconds else 604800 end,604800
      )),false)
      or coalesce(
        h.expected_max_age_seconds>0
        and h.watermark_at is not null
        and h.watermark_at < now() - make_interval(secs=>h.expected_max_age_seconds),
        false
      )
    ) as evidence_stale
  from public.feya_commerce_v_data_source_health_latest_safe_v1 h
)
select
  source_code,source_name,authority_tier,authority_domain,
  registry_source_state,primary_source,source_instance_key,
  case when evidence_stale and health_state in ('HEALTHY','DEGRADED')
    then 'STALE'::text else health_state end as health_state,
  case when evidence_stale and freshness_state in ('FRESH','AGING')
    then 'STALE'::text else freshness_state end as freshness_state,
  watermark_at,last_success_at,expected_max_age_seconds,observed_row_count,
  coverage_json,error_code,error_message,evidence_json,recorded_by,checked_at
from evidence;

comment on view public.feya_commerce_v_data_source_health_effective_safe_v2 is
 'Phase13 GDAE effective source-health view. Older than documented source max age or seven-day verification ceiling becomes STALE, never healthy by a stale September snapshot. Preserves raw evidence, unobservable, unavailable and not-applicable states. No automated agents or metrics ingestion enabled.';

-- Same safe source fields and access audience as existing V1, no new private source.
revoke all on public.feya_commerce_v_data_source_health_effective_safe_v2 from public,anon,authenticated,service_role;
grant select on public.feya_commerce_v_data_source_health_effective_safe_v2 to anon,authenticated,service_role;

do $feya_p13_health$
declare original_n integer;effective_n integer;unexpected_n integer;
begin
  select count(*) into original_n from public.feya_commerce_v_data_source_health_latest_safe_v1;
  select count(*) into effective_n from public.feya_commerce_v_data_source_health_effective_safe_v2;
  if original_n<>effective_n then
    raise exception 'FEYA_PHASE13_HEALTH_ROW_PARITY_FAILED:%/%',original_n,effective_n;
  end if;
  select count(*) into unexpected_n
    from public.feya_commerce_v_data_source_health_latest_safe_v1 o
    join public.feya_commerce_v_data_source_health_effective_safe_v2 e on e.source_code=o.source_code
      and e.source_instance_key is not distinct from o.source_instance_key
   where e.health_state is distinct from o.health_state
     and not (o.health_state in ('HEALTHY','DEGRADED') and e.health_state='STALE');
  if unexpected_n<>0 then raise exception 'FEYA_PHASE13_HEALTH_STATE_UNEXPECTED:%',unexpected_n;end if;
  if not has_table_privilege('anon','public.feya_commerce_v_data_source_health_effective_safe_v2','select')
    or not has_table_privilege('authenticated','public.feya_commerce_v_data_source_health_effective_safe_v2','select')
    or not has_table_privilege('service_role','public.feya_commerce_v_data_source_health_effective_safe_v2','select')
  then raise exception 'FEYA_PHASE13_HEALTH_SAFE_READ_DENIED';end if;
end
$feya_p13_health$;
