import {NextRequest,NextResponse} from 'next/server';
import {isAiLookOwnerPreview,isAiLookScene,resolveAiLookOwnerTestKey} from '@/lib/aiLookPreviewPolicy';
import {aiLookReadApprovedListing} from '@/lib/aiLookPreviewCatalogServer';
import {generateAiLook,validPhotoFile} from '@/lib/aiLookPreviewGenerationServer';

export const maxDuration=120;
const deny={headers:{'Cache-Control':'private, no-store','X-Robots-Tag':'noindex, nofollow'}};
const failed=(reason:string,status:number)=>NextResponse.json({ok:false,reason},{status,...deny});

export async function POST(request:NextRequest){
 if(!isAiLookOwnerPreview(process.env))return failed('not_found',404);
 // Owner-only ephemeral key is supported on this EXACT protected Preview.
 // Public Product Detail pages, production, and all other branches reject it.
 const requestOrigin=new URL(request.url).origin;
 if(request.headers.get('origin')!==requestOrigin
   ||request.headers.get('sec-fetch-site')==='cross-site'
   ||!request.headers.get('content-type')?.startsWith('multipart/form-data;')){
  return failed('same_origin_required',403);
 }
 let form:FormData;
 try{form=await request.formData();}
 catch{return failed('invalid_form',400);}
 const slug=form.get('slug'),scene=form.get('scene'),configId=form.get('configuration'),
  colorCode=form.get('color'),rawRef=form.get('manualReference');
 const selfie=form.get('selfie'),fullBody=form.get('fullBody');
 const key=resolveAiLookOwnerTestKey(process.env,form.get('ownerApiKey'));
 if(!key)return failed('api_key_not_configured',503);
 if(typeof slug!=='string'||!/^[a-z0-9-]{5,240}$/.test(slug)
   ||!isAiLookScene(scene)||typeof configId!=='string'||configId.length>120
   ||typeof colorCode!=='string'||colorCode.length>60
   ||!(selfie instanceof File)||!(fullBody instanceof File)
   ||!validPhotoFile(selfie)||!validPhotoFile(fullBody))return failed('invalid_selection_or_photos',400);
 const manualReference=rawRef==='auto'?null:
  typeof rawRef==='string'&&/^\d{1,2}$/.test(rawRef)?Number(rawRef):NaN;
 if(manualReference!==null&&!Number.isInteger(manualReference))return failed('invalid_reference',400);
 try{
  const product=await aiLookReadApprovedListing(slug);
  if(!product)return failed('listing_not_approved',404);
  const config=product.configs.find(x=>x.id===configId);
  if(!config)return failed('configuration_not_approved',400);
  if(product.colors.length && !product.colors.some(x=>x.code===colorCode))return failed('color_not_approved',400);
  if(manualReference!==null && (manualReference<0||manualReference>=product.gallery.length))return failed('reference_not_in_gallery',400);
  const output=await generateAiLook({
   product,configuration:config.label,
   color:product.colors.find(x=>x.code===colorCode)?.label||product.colors[0]?.label||'as photographed',
   scene,selfie,fullBody,key,manualReference,
  });
  return NextResponse.json({ok:true,...output},{...deny});
 }catch(e){
  // Never log image bytes, customer names, selfies, prompts or third-party error bodies.
  const reason=e instanceof Error?e.message:'unavailable';
  const allowed=new Set([
   'invalid_customer_photo','invalid_image_signature','listing_reference_unavailable',
   'manual_reference_unavailable','automatic_front_detection_unavailable',
   'reference_not_found','reference_rank_failed','model_quota_or_billing',
   'model_rejected_images','image_provider_unavailable','image_result_invalid',
   'image_api_authentication_failed','image_model_access_denied',
   'image_model_not_found','image_rate_limited',
  ]);
  return failed(allowed.has(reason)?reason:'generation_temporarily_unavailable',503);
 }
}
