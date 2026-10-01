export type ManualRepairExecutionRequestRow={
  action_code?:unknown;
  mutation_domain?:unknown;
  request_status?:unknown;
  requested_by_type?:unknown;
  requested_by_user_id?:unknown;
  target_scope_json?:unknown;
  target_version_refs_json?:unknown;
  request_payload_json?:unknown;
};

function rec(value:unknown):value is Record<string,unknown>{
  return Boolean(value&&typeof value==='object'&&!Array.isArray(value));
}
function str(value:unknown){return typeof value==='string'?value:''}
function exactStringSet(value:unknown,expected:string[]){
  if(!Array.isArray(value)||value.length!==expected.length||!value.every(x=>typeof x==='string'))return false;
  const actual=[...value].sort();
  if(new Set(actual).size!==actual.length)return false;
  return actual.every((x,i)=>x===expected[i]);
}

export function manualRepairApprovalScopeDecision(input:{
  row:ManualRepairExecutionRequestRow;
  actorUserId:string;
  releaseRef:string;
  productIds:string[];
  expectedEvidenceSha256:string;
}){
  const {row,actorUserId,releaseRef,expectedEvidenceSha256}=input;
  const productIds=[...input.productIds].sort();
  const scope=rec(row.target_scope_json)?row.target_scope_json:{};
  const refs=rec(row.target_version_refs_json)?row.target_version_refs_json:{};
  const payload=rec(row.request_payload_json)?row.request_payload_json:{};
  const requester=str(row.requested_by_type);
  const requestedByUserId=str(row.requested_by_user_id);
  const requesterValid=
    (requester==='human'&&requestedByUserId===actorUserId)
    ||((requester==='agent'||requester==='system')&&!requestedByUserId);

  const reasons:string[]=[];
  if(row.action_code!=='REPAIR_MANUAL_CONFIGURATION_BINDINGS')reasons.push('ACTION_CODE_MISMATCH');
  if(row.mutation_domain!=='COMMERCE_CONFIGURATION')reasons.push('MUTATION_DOMAIN_MISMATCH');
  if(row.request_status!=='APPROVAL_REQUIRED')reasons.push('STATUS_MISMATCH');
  if(!requesterValid)reasons.push('REQUESTER_AUTHORITY_MISMATCH');
  if(scope.entity_type!=='PRODUCT_SET'||scope.entity_key!=='manual-price-lane')reasons.push('TARGET_SCOPE_MISMATCH');
  if(payload.contract_version!=='manual_configuration_binding_repair_v1')reasons.push('CONTRACT_MISMATCH');
  if(payload.release_ref!==releaseRef)reasons.push('RELEASE_REF_MISMATCH');
  if(!exactStringSet(payload.canonical_product_ids,productIds))reasons.push('PRODUCT_SET_MISMATCH');
  if(Number(payload.expected_price_rows)!==6||Number(payload.expected_target_configurations)!==6)reasons.push('ROW_COUNT_MISMATCH');
  if(payload.evidence_sha256!==expectedEvidenceSha256||refs.evidence_sha256!==expectedEvidenceSha256)reasons.push('EVIDENCE_MISMATCH');
  if(refs.release_ref!==releaseRef)reasons.push('VERSION_RELEASE_REF_MISMATCH');

  return {ok:reasons.length===0,reasons,requester};
}
