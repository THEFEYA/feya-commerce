import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {classifyAiLookImageError,AiLookProviderError} from '../../lib/aiLookProviderDiagnostics.ts';

test('OpenAI 400 invalid parameter is not a claim about customer photos',()=>{
 const diag=classifyAiLookImageError(400,{error:{
  code:'unknown_parameter',type:'invalid_request_error',
  param:'input_fidelity',message:'Provider message intentionally ignored.',
 }},'req_safeX-123');
 assert.deepEqual(diag,{reason:'image_request_parameter_invalid',
  diagnosticCode:'unknown_parameter',diagnosticParam:'input_fidelity',
  requestId:'req_safeX-123'});
 assert.equal(new AiLookProviderError(diag).message,'image_request_parameter_invalid');
});
test('Image rejection distinguishes invalid input and content review, no automatic retry',()=>{
 assert.equal(classifyAiLookImageError(400,{error:{code:'invalid_image',type:'invalid_request_error'}},null).reason,'image_input_invalid');
 assert.equal(classifyAiLookImageError(400,{error:{code:'moderation_blocked',type:'image_generation_user_error'}},null).reason,'image_content_review_blocked');
 assert.equal(classifyAiLookImageError(400,{error:{code:'unknown',param:null}},null).reason,'image_generation_bad_request');
});
test('Only fixed diagnostic codes, parameters and request IDs may be exposed',()=>{
 const diag=classifyAiLookImageError(400,{error:{
  code:'sk-DO_NOT_LEAK',param:'customer_email@example.com',
  message:'Here is user photo, full prompt and Authorization data.',
 }},'req_bad!@{<x>');
 assert.equal(diag.diagnosticCode,null);
 assert.equal(diag.diagnosticParam,null);
 assert.equal(diag.requestId,null);
 assert.equal(diag.reason,'image_generation_bad_request');
});
test('Auth, model permission and billing remain classified separately',()=>{
 assert.equal(classifyAiLookImageError(401,null,null).reason,'image_api_authentication_failed');
 assert.equal(classifyAiLookImageError(403,null,null).reason,'image_model_access_denied');
 assert.equal(classifyAiLookImageError(404,null,null).reason,'image_model_not_found');
 assert.equal(classifyAiLookImageError(429,{error:{code:'insufficient_quota'}},null).reason,'model_quota_or_billing');
 assert.equal(classifyAiLookImageError(429,{error:{code:'rate_limit_exceeded'}},null).reason,'image_rate_limited');
});
test('The website sends no API keys as model metadata and only maps safe diagnostics',()=>{
 const generation=readFileSync('lib/aiLookPreviewGenerationServer.ts','utf8');
 const route=readFileSync('app/api/experiments/ai-look-preview/generate/route.ts','utf8');
 const client=readFileSync('components/AiLookPreviewClient.tsx','utf8');
 assert.match(generation,/classifyAiLookImageError/);
 assert.match(generation,/AiLookProviderError/);
 assert.match(generation,/selection=\{front:knownFront,detail:null\}/);
 assert.match(route,/e instanceof AiLookProviderError/);
 assert.match(client,/payload\.diagnostic\?\.diagnosticCode/);
 assert.doesNotMatch(generation,/console\.log\(|console\.warn\(/);
});
