-- Phase 12 K20: exact Human Owner approval for immutable Organic Wave A v12.
-- This migration records approval of the already materialized release hash.
-- It MUST NOT recompute release_hash, activate the release, submit a sitemap,
-- or enable checkout/payment/order creation.

begin;

do $$
declare
  rel public.feya_search_releases_v1%rowtype;
  gate_row public.feya_search_release_gate_results_v1%rowtype;
  confirmation_text constant text := 'Подтверждаю и разрешаю активацию Search Release v12, ID 2dc86d7c-6269-5327-9154-6b5178931254, hash 05d79c4ddc07da7e7fc60045f6ad39fabea40cb16f702bcfb6ea3b154d4bcd0b, SHA 7699e7cdcfc1cdf75716f006d5533fe1efbdf4b7.';
begin
  select * into rel
  from public.feya_search_releases_v1
  where release_id='2dc86d7c-6269-5327-9154-6b5178931254'::uuid
  for update;

  if not found then raise exception 'phase12_v12_release_missing'; end if;
  if rel.release_code<>'organic-wave-a-20260926' or rel.release_version<>12
    then raise exception 'phase12_v12_release_identity_conflict'; end if;
  if rel.release_hash<>'05d79c4ddc07da7e7fc60045f6ad39fabea40cb16f702bcfb6ea3b154d4bcd0b'
    then raise exception 'phase12_v12_release_hash_conflict:%',rel.release_hash; end if;
  if rel.git_sha<>'7699e7cdcfc1cdf75716f006d5533fe1efbdf4b7'
    then raise exception 'phase12_v12_git_sha_conflict:%',rel.git_sha; end if;
  if rel.release_status<>'GATE_FAILED'
    then raise exception 'phase12_v12_preapproval_state_invalid:%',rel.release_status; end if;

  select * into gate_row
  from public.feya_search_release_gate_results_v1
  where release_id=rel.release_id and gate_code='K20'
  for update;

  if not found then raise exception 'phase12_v12_k20_missing'; end if;
  if gate_row.gate_status<>'FAIL'
    then raise exception 'phase12_v12_k20_state_invalid:%',gate_row.gate_status; end if;
  if coalesce(gate_row.evidence_json->>'release_hash','')<>rel.release_hash
    then raise exception 'phase12_v12_k20_evidence_hash_conflict'; end if;

  update public.feya_search_release_gate_results_v1
  set gate_status='PASS',
      evidence_json=jsonb_build_object(
        'reason','Human Owner explicitly approved activation of the exact immutable v12 release id/hash/git SHA in chat.',
        'exact_release_hash_approved',true,
        'release_id',rel.release_id,
        'release_hash',rel.release_hash,
        'git_sha',rel.git_sha,
        'confirmation_channel','CHAT_OWNER_CONFIRMATION',
        'confirmation_text_sha256',
          encode(extensions.digest(convert_to(confirmation_text,'UTF8'),'sha256'),'hex'),
        'activation_authorized',true,
        'payment_enabled',false,
        'order_creation_enabled',false
      ),
      evaluated_at=now()
  where release_id=rel.release_id and gate_code='K20' and gate_status='FAIL';

  if not found then raise exception 'phase12_v12_k20_update_conflict'; end if;

  update public.feya_search_releases_v1
  set gate_summary_json=jsonb_build_object(
        'overall','PASS',
        'pass_count',17,
        'fail_count',0,
        'excluded_approved_count',3,
        'ci_run_id',36924805355,
        'vercel_deployment_id','dpl_D3KccMszK6sVmsuib4GT5F3mR9fS',
        'production_crawl_job_id',110579381872,
        'production_crawl_artifact_id',11193221853,
        'exact_release_hash_approved',true
      ),
      updated_at=now()
  where release_id=rel.release_id;

  if (select count(*) from public.feya_search_release_gate_results_v1
      where release_id=rel.release_id)<>20
    then raise exception 'phase12_v12_gate_count_invalid'; end if;
  if (select count(*) from public.feya_search_release_gate_results_v1
      where release_id=rel.release_id and gate_status='FAIL')<>0
    then raise exception 'phase12_v12_failed_gate_remains'; end if;
  if (select count(*) from public.feya_search_release_gate_results_v1
      where release_id=rel.release_id and gate_status='PASS')<>17
    then raise exception 'phase12_v12_pass_count_invalid'; end if;
  if (select count(*) from public.feya_search_release_gate_results_v1
      where release_id=rel.release_id and gate_status='EXCLUDED_APPROVED')<>3
    then raise exception 'phase12_v12_excluded_count_invalid'; end if;
  if (select count(*) from public.feya_search_releases_v1 where release_status='ACTIVE')<>0
    then raise exception 'phase12_v12_unexpected_active_release'; end if;
  if (select release_hash from public.feya_search_releases_v1 where release_id=rel.release_id)
     <>'05d79c4ddc07da7e7fc60045f6ad39fabea40cb16f702bcfb6ea3b154d4bcd0b'
    then raise exception 'phase12_v12_hash_mutated_after_approval'; end if;
end $$;

commit;
