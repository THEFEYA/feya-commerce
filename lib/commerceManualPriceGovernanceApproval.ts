export type ManualPriceGovernanceRequestRow={
  action_code?:unknown;mutation_domain?:unknown;request_status?:unknown;
  requested_by_type?:unknown;requested_by_user_id?:unknown;
  target_scope_json?:unknown;target_version_refs_json?:unknown;request_payload_json?:unknown;
};
const rec=(v:unknown):v is Record<string,unknown>=>Boolean(v&&typeof v==='object'&&!Array.isArray(v));
const str=(v:unknown)=>typeof v==='string'?v:'';
function exactSet(v:unknown,expected:string[]){
  if(!Array.isArray(v)||v.length!==expected.length||!v.every(x=>typeof x==='string'))return false;
  const a=[...v].sort(),b=[...expected].sort();
  return new Set(a).size===a.length&&a.every((x,i)=>x===b[i]);
}
export function manualPriceGovernanceApprovalDecision(input:{
  row:ManualPriceGovernanceRequestRow;actorUserId:string;releaseRef:string;productIds:string[];currentEvidenceSha256:string;
}){
  const {row,actorUserId,releaseRef,currentEvidenceSha256}=input;
  const scope=rec(row.target_scope_json)?row.target_scope_json:{};
  const refs=rec(row.target_version_refs_json)?row.target_version_refs_json:{};
  const payload=rec(row.request_payload_json)?row.request_payload_json:{};
  const requester=str(row.requested_by_type),requestedBy=str(row.requested_by_user_id);
  const requesterValid=(requester==='human'&&requestedBy===actorUserId)||((requester==='agent'||requester==='system')&&!requestedBy);
  const reasons:string[]=[];
  if(row.action_code!=='ADOPT_MANUAL_PRICE_LANE_GOVERNANCE')reasons.push('ACTION_CODE_MISMATCH');
  if(row.mutation_domain!=='COMMERCE_PRICE')reasons.push('MUTATION_DOMAIN_MISMATCH');
  if(row.request_status!=='APPROVAL_REQUIRED')reasons.push('STATUS_MISMATCH');
  if(!requesterValid)reasons.push('REQUESTER_AUTHORITY_MISMATCH');
  if(scope.entity_type!=='PRODUCT_SET'||scope.entity_key!=='manual-price-lane')reasons.push('TARGET_SCOPE_MISMATCH');
  if(!exactSet(scope.canonical_product_ids,input.productIds))reasons.push('TARGET_PRODUCT_SET_MISMATCH');
  if(payload.contract_version!=='manual_price_lane_governance_v1')reasons.push('CONTRACT_MISMATCH');
  if(payload.release_ref!==releaseRef)reasons.push('RELEASE_REF_MISMATCH');
  if(!exactSet(payload.canonical_product_ids,input.productIds))reasons.push('PRODUCT_SET_MISMATCH');
  if(Number(payload.expected_price_rows)!==6||Number(payload.expected_configuration_rows)!==6)reasons.push('ROW_COUNT_MISMATCH');
  if(str(payload.evidence_sha256)!==currentEvidenceSha256||str(refs.evidence_sha256)!==currentEvidenceSha256)reasons.push('EVIDENCE_MISMATCH');
  if(refs.release_ref!==releaseRef)reasons.push('VERSION_RELEASE_REF_MISMATCH');
  return{ok:reasons.length===0,reasons,requester};
}
