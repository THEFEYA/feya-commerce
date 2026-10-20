import {NextResponse} from 'next/server';
import {isAiLookOwnerPreview} from '@/lib/aiLookPreviewPolicy';

export const maxDuration=15;

const HEADERS={
 'Cache-Control':'private, no-store, max-age=0',
 'X-Robots-Tag':'noindex, nofollow, noarchive',
};

export async function GET(){
 if(!isAiLookOwnerPreview(process.env)){
  return NextResponse.json({ok:false,status:'not_found'},{status:404,headers:HEADERS});
 }
 const flagOn=process.env.FEYA_AI_LOOK_PREVIEW_ENABLED==='true';
 const secret=process.env.OPENAI_API_KEY||'';
 if(!flagOn||!secret.startsWith('sk-')){
  // Only flags, never send or log the secret, partial secret, prefix or length.
  return NextResponse.json({
   ok:false,status:!flagOn&&!secret?'setup_required':!flagOn?'preview_flag_disabled':'api_key_missing',
   flagEnabled:flagOn,keyConfigured:secret.startsWith('sk-'),
   message:'Set both Preview-only Vercel environment variables and redeploy this exact branch.',
  },{headers:HEADERS});
 }
 try{
  // Cheap no-image connectivity probe. This does not create images or consume
  // a generation. It cannot guarantee quota or model-access for an actual edit.
  const response=await fetch('https://api.openai.com/v1/models/gpt-image-1.5',{
   method:'GET',headers:{Authorization:'Bearer '+secret},
   cache:'no-store',signal:AbortSignal.timeout(8000)
  });
  if(response.status===401)return NextResponse.json({
   ok:false,status:'invalid_api_key',message:'This OpenAI API key is not accepted. Check the Platform project and replace it.',
  },{headers:HEADERS});
  if(response.status===403)return NextResponse.json({
   ok:false,status:'provider_permission_denied',message:'The OpenAI Platform project cannot access the chosen image model.',
  },{headers:HEADERS});
  if(!response.ok)return NextResponse.json({
   ok:false,status:'provider_unavailable',message:'The model probe was not accepted. Try again later or check Platform billing.',
  },{headers:HEADERS});
  return NextResponse.json({
   ok:true,status:'provider_reachable',flagEnabled:true,keyConfigured:true,
   message:'OpenAI is connected. Image generation still depends on available API credit and model permissions.',
  },{headers:HEADERS});
 }catch{
  return NextResponse.json({
   ok:false,status:'provider_unreachable',message:'The image service could not be reached. Try again.',
  },{headers:HEADERS});
 }
}
