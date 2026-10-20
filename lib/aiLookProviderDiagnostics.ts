/**
 * Safe, deterministic OpenAI image edit error taxonomy.
 * Never echo a provider message, image contents, input names, face data, or keys.
 * Provider request identifiers are safe to show for support and can be searched
 * in provider logs without attaching sensitive photos to a ticket.
 */
export type AiLookProviderCategory=
 |'image_api_authentication_failed'|'image_model_access_denied'
 |'image_model_not_found'|'model_quota_or_billing'
 |'image_rate_limited'|'image_content_review_blocked'
 |'image_input_invalid'|'image_request_parameter_invalid'
 |'image_provider_unavailable'|'image_generation_bad_request';

export type AiLookProviderDiagnostic={
 reason:AiLookProviderCategory;
 diagnosticCode:string|null;
 diagnosticParam:string|null;
 requestId:string|null;
};
const KNOWN_CODES=new Set([
 'unknown_parameter','unsupported_parameter','invalid_parameter','invalid_value',
 'invalid_type','missing_required_parameter','invalid_request_error',
 'invalid_image','invalid_image_format','invalid_image_size','invalid_image_data',
 'image_parse_error','image_too_large','file_too_large','unsupported_image',
 'moderation_blocked','content_policy_violation','image_generation_user_error',
 'insufficient_quota','credit_balance_exhausted','project_spend_limit_exceeded',
 'organization_spend_limit_exceeded','organization_usage_limit_exceeded',
 'rate_limit_exceeded','model_not_found','model_not_available',
 'permission_denied','invalid_api_key',
]);
const KNOWN_PARAMS=new Set([
 'image','image[]','model','input_fidelity','quality','size','n',
 'output_format','output_compression','prompt','background',
]);
const LIMIT_CODES=new Set([
 'insufficient_quota','credit_balance_exhausted','project_spend_limit_exceeded',
 'organization_spend_limit_exceeded','organization_usage_limit_exceeded',
]);
const BAD_IMAGES=new Set([
 'invalid_image','invalid_image_format','invalid_image_size','invalid_image_data',
 'image_parse_error','image_too_large','file_too_large','unsupported_image',
]);
const BAD_PARAMETERS=new Set([
 'unknown_parameter','unsupported_parameter','invalid_parameter','invalid_value',
 'invalid_type','missing_required_parameter',
]);
const BLOCKED=new Set(['moderation_blocked','content_policy_violation']);
export function classifyAiLookImageError(
 status:number,providerBody:unknown,providerRequestId:unknown
):AiLookProviderDiagnostic{
 const root=(providerBody&&typeof providerBody==='object')?providerBody as Record<string,unknown>:{};
 const nested=root.error&&typeof root.error==='object'?
  root.error as Record<string,unknown>:{};
 const rawCode=typeof nested.code==='string'?nested.code:'';
 const rawParam=typeof nested.param==='string'?nested.param:'';
 const code=KNOWN_CODES.has(rawCode)?rawCode:null;
 const param=KNOWN_PARAMS.has(rawParam)?rawParam:null;
 const rawRequestId=typeof providerRequestId==='string'?providerRequestId:'';
 const requestId=/^[a-zA-Z0-9_-]{5,128}$/.test(rawRequestId)?rawRequestId:null;
 let reason:AiLookProviderCategory='image_provider_unavailable';
 if(status===401)reason='image_api_authentication_failed';
 else if(status===403)reason='image_model_access_denied';
 else if(status===404)reason='image_model_not_found';
 else if(status===402||(status===429&&LIMIT_CODES.has(rawCode)))reason='model_quota_or_billing';
 else if(status===429)reason='image_rate_limited';
 else if(status===400){
  const errorType=typeof nested.type==='string'?nested.type:'';
  if(BLOCKED.has(rawCode)||errorType==='image_generation_user_error'&&!BAD_IMAGES.has(rawCode))
   reason='image_content_review_blocked';
  else if(BAD_IMAGES.has(rawCode))reason='image_input_invalid';
  else if(BAD_PARAMETERS.has(rawCode)||param!==null)reason='image_request_parameter_invalid';
  else reason='image_generation_bad_request';
 }
 return{reason,diagnosticCode:code,diagnosticParam:param,requestId};
}
