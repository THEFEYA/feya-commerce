import {NextRequest,NextResponse} from 'next/server';
import {isAiLookOwnerPreview,resolveAiLookOwnerTestKey,aiLookKeyInputIssue,aiLookKeyIssueMessage} from '@/lib/aiLookPreviewPolicy';

export const maxDuration=15;

const HEADERS={
 'Cache-Control':'private, no-store, max-age=0',
 'X-Robots-Tag':'noindex, nofollow, noarchive',
};
function json(data:Record<string,unknown>,status=200){
 return NextResponse.json(data,{status,headers:HEADERS});
}
function isOwnOrigin(request:NextRequest){
 const expected=new URL(request.url).origin;
 return request.headers.get('origin')===expected
   &&request.headers.get('sec-fetch-site')!=='cross-site';
}
async function probeModel(secret:string){
 try{
  // A no-image credentials check. This does not create an image or incur
  // a generation charge. It cannot guarantee current image-edit quota.
  const response=await fetch('https://api.openai.com/v1/models/gpt-image-1.5',{
   method:'GET',headers:{Authorization:'Bearer '+secret},
   cache:'no-store',signal:AbortSignal.timeout(8000),
  });
  if(response.status===401)return json({
   ok:false,status:'invalid_api_key',
   message:'OpenAI did not accept this key. Verify your Platform key.',
  });
  if(response.status===403)return json({
   ok:false,status:'provider_permission_denied',
   message:'The OpenAI project cannot access the image model.',
  });
  if(!response.ok)return json({
   ok:false,status:'provider_unavailable',
   message:'The OpenAI model could not be checked. Review Platform billing and try again.',
  });
  return json({
   ok:true,status:'provider_reachable',
   message:'OpenAI responds to the owner test key. You can start your first real image preview.',
  });
 }catch{
  return json({
   ok:false,status:'provider_unreachable',
   message:'Could not reach the OpenAI service. Try checking again.',
  });
 }
}
export async function GET(){
 if(!isAiLookOwnerPreview(process.env))return json({ok:false,status:'not_found'},404);
 // A server key already used by TheFEYA's SEO engine can be reused in
 // this ONE exact SSO-protected Preview. No browser-supplied key is needed.
 const secret=resolveAiLookOwnerTestKey(process.env,null);
 if(!secret){
  return json({
   ok:false,status:'setup_required',
   keyConfigured:false,
   message:'There is no server-side OpenAI key available on this exact private Preview. The owner-only temporary test input is available; customers never need this input.',
  });
 }
 return probeModel(secret);
}
export async function POST(request:NextRequest){
 // NEVER accept owner-key POST outside the exact SSO-protected experiment.
 if(!isAiLookOwnerPreview(process.env))return json({ok:false,status:'not_found'},404);
 if(!isOwnOrigin(request))return json({ok:false,status:'same_origin_required'},403);
 if(!request.headers.get('content-type')?.startsWith('application/json'))return json({ok:false,status:'invalid_content_type'},415);
 const size=Number(request.headers.get('content-length')||0);
 if(size>1024)return json({ok:false,status:'invalid_payload'},413);
 let body:unknown;
 try{body=await request.json();}catch{return json({ok:false,status:'invalid_json'},400);}
 const raw=body&&typeof body==='object'?'apiKey' in body?(body as {apiKey?:unknown}).apiKey:null:null;
 const issue=aiLookKeyInputIssue(raw);
 if(issue)return json({ok:false,status:issue,message:aiLookKeyIssueMessage(issue)},400);
 const key=resolveAiLookOwnerTestKey(process.env,raw);
 if(!key)return json({ok:false,status:'owner_key_missing',message:'Этот режим доступен только в защищённом предпросмотре владельца.'},403);
 // No key fragments, error bodies, or request contents are logged/returned.
 return probeModel(key);
}
