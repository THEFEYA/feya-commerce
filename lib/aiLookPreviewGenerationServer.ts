import 'server-only';
import {buildAiLookPreviewPrompt} from './aiLookPreviewPrompt';
import {AiLookProviderError,classifyAiLookImageError} from './aiLookProviderDiagnostics';
import type {AiLookScene} from './aiLookPreviewPolicy';
import type {AiLookReference,AiLookView} from './aiLookPreviewCatalogServer';

type SourceImage={buffer:Buffer;mime:string;label:string;index:number};
const API='https://api.openai.com/v1/';
const FETCH_LIMIT_MS=14000;
const IMAGE_MODEL='gpt-image-1.5';
const VISION_MODEL='gpt-4.1-mini';

function safeImageMime(value:string):string|null{
 const mime=value.split(';')[0].trim().toLowerCase();
 return ['image/jpeg','image/png','image/webp'].includes(mime)?mime:null;
}
function sourceAllowed(value:string):boolean{
 try{
  const url=new URL(value);
  return url.protocol==='https:'&&url.hostname==='i.etsystatic.com'
    &&url.username===''&&url.password===''&&url.port===''&&url.pathname.startsWith('/');
 }catch{return false;}
}
export function validPhotoFile(file:File):boolean{
 return file.size>1000&&file.size<=6*1024*1024&&Boolean(safeImageMime(file.type));
}
export async function readUserPhoto(file:File,label:string):Promise<SourceImage>{
 if(!validPhotoFile(file))throw new Error('invalid_customer_photo');
 const buffer=Buffer.from(await file.arrayBuffer());
 const signature=file.type==='image/jpeg'
  ? buffer[0]===0xff&&buffer[1]===0xd8&&buffer[2]===0xff
  : file.type==='image/png'
  ? buffer[0]===137&&buffer[1]===80&&buffer[2]===78&&buffer[3]===71
  : buffer.subarray(0,4).toString()==='RIFF'&&buffer.subarray(8,12).toString()==='WEBP';
 if(!signature)throw new Error('invalid_image_signature');
 return{buffer,mime:file.type,label,index:-1};
}
async function fetchApprovedReference(item:AiLookReference,index:number):Promise<SourceImage|null>{
 if(!sourceAllowed(item.url))return null;
 const response=await fetch(item.url,{
  redirect:'error',cache:'no-store',signal:AbortSignal.timeout(FETCH_LIMIT_MS),
  headers:{Accept:'image/jpeg,image/png,image/webp'}
 });
 if(!response.ok)return null;
 const mime=safeImageMime(response.headers.get('content-type')||'');
 if(!mime)return null;
 if(Number(response.headers.get('content-length')||0)>6*1024*1024)return null;
 const bytes=Buffer.from(await response.arrayBuffer());
 if(bytes.length<1000||bytes.length>6*1024*1024)return null;
 return{buffer:bytes,mime,label:item.alt,index};
}
async function rankReferenceImages(
 files:SourceImage[],key:string
):Promise<{front:number;detail:number|null}>{
 if(files.length===1)return{front:files[0].index,detail:null};
 const payload={
  model:VISION_MODEL,temperature:0,max_tokens:130,
  response_format:{type:'json_object'},
  messages:[
   {role:'system',content:'You inspect real ecommerce costume photographs. Output ONLY JSON {"front":integer,"detail":integer|null}. The front image must show a mostly front-facing person with maximum costume pieces visible, ideally full body or to knees; avoid profile/back closeups. The detail is optional and should show useful true costume material detail. Only choose indexes present in the user images.'},
   {role:'user',content:[
    {type:'text',text:'Select the best approved FRONTAL outfit photograph for a faithful customer look preview. Photo indices follow. Choose a second image only if it clarifies detail. Do not invent a product.'},
    ...files.map((file)=>[
     {type:'text',text:'PHOTO INDEX '+file.index+' — '+file.label.slice(0,100)},
     {type:'image_url',image_url:{url:'data:'+file.mime+';base64,'+file.buffer.toString('base64'),detail:'low'}}
    ]).flat(),
   ]}
  ],
 };
 const r=await fetch(API+'chat/completions',{
  method:'POST',
  headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},
  body:JSON.stringify(payload),signal:AbortSignal.timeout(35000),cache:'no-store'
 });
 if(!r.ok)throw new Error('reference_rank_failed');
 const output=await r.json() as {choices?:{message?:{content?:string}}[]};
 const content=output.choices?.[0]?.message?.content;
 if(!content)throw new Error('reference_rank_empty');
 let parsed:{front?:unknown;detail?:unknown};
 try{parsed=JSON.parse(content);}catch{throw new Error('reference_rank_invalid');}
 const valid=new Set(files.map(file=>file.index));
 const front=Number(parsed.front);
 if(!Number.isInteger(front)||!valid.has(front))throw new Error('reference_rank_out_of_range');
 const detail=parsed.detail==null?null:Number(parsed.detail);
 return{front,detail:detail!==null&&Number.isInteger(detail)&&valid.has(detail)&&detail!==front?detail:null};
}
export type AiLookResult={imageDataUrl:string;referenceIndex:number;referenceDetailIndex:number|null};
export async function generateAiLook(args:{
 product:AiLookView;configuration:string;color:string;scene:AiLookScene;
 selfie:File;fullBody:File;key:string;manualReference:number|null;
}):Promise<AiLookResult>{
 const [face,body]=await Promise.all([
  readUserPhoto(args.selfie,'customer face selfie'),
  readUserPhoto(args.fullBody,'customer frontal full-body image'),
 ]);
 const candidates=args.product.gallery.slice(0,7);
 const fetched=await Promise.allSettled(candidates.map((photo,index)=>fetchApprovedReference(photo,index)));
 const files=fetched.flatMap(r=>r.status==='fulfilled'&&r.value?[r.value]:[]);
 if(!files.length)throw new Error('listing_reference_unavailable');
 let selection:{front:number;detail:number|null};
 if(args.manualReference!==null){
  if(!files.some(x=>x.index===args.manualReference))throw new Error('manual_reference_unavailable');
  selection={front:args.manualReference,detail:null};
 }else{
  // For the owner-inspected product, skip the extra paid vision API call:
  // photo #2 was already checked as frontal. Only send one real garment image.
  const knownFront=args.product.recommendedReferenceIndex;
  if(knownFront>0&&files.some(file=>file.index===knownFront)){
   selection={front:knownFront,detail:null};
  }else{
   try{selection=await rankReferenceImages(files,args.key);}
   catch{throw new Error('automatic_front_detection_unavailable');}
  }
 }
 const first=files.find(x=>x.index===selection.front);
 if(!first)throw new Error('reference_not_found');
 const detail=selection.detail===null?null:files.find(x=>x.index===selection.detail);
 const form=new FormData();
 form.set('model',IMAGE_MODEL);form.set('size','1024x1536');
 form.set('quality','medium');form.set('output_format','jpeg');
 form.set('output_compression','78');form.set('input_fidelity','high');
 form.set('n','1');
 const sources=[first,...(detail?[detail]:[]),body,face];
 for(const source of sources){
  form.append('image[]',new Blob([new Uint8Array(source.buffer)],{type:source.mime}),
   source.label.replace(/[^a-z0-9-]/gi,'_').slice(0,35)+'.'+(source.mime==='image/png'?'png':source.mime==='image/webp'?'webp':'jpg'));
 }
 form.set('prompt',buildAiLookPreviewPrompt({
  title:args.product.title,configuration:args.configuration,color:args.color,
  scene:args.scene,referenceCount:detail?2:1,
 }));
 const response=await fetch(API+'images/edits',{
  method:'POST',headers:{Authorization:'Bearer '+args.key},
  body:form,signal:AbortSignal.timeout(110000),cache:'no-store',
 });
 if(!response.ok){
  // OpenAI 400 covers unsupported parameters, bad files AND safety decisions.
  // Parse only stable, allowlisted diagnostics. No provider messages, photos,
  // Authorization header or user details leave the server.
  let providerBody:unknown=null;
  try{providerBody=await response.json();}catch{}
  throw new AiLookProviderError(classifyAiLookImageError(
   response.status,providerBody,response.headers.get('x-request-id')
  ));
 }
 const result=await response.json() as {data?:Array<{b64_json?:string}>};
 const data=result.data?.[0]?.b64_json;
 // Vercel Functions cannot send JSON responses larger than 4.5 MB.
 if(!data||data.length>3_700_000)throw new Error('image_result_invalid');
 return {imageDataUrl:'data:image/jpeg;base64,'+data,
  referenceIndex:selection.front,referenceDetailIndex:selection.detail};
}
