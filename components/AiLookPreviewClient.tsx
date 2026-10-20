'use client';
import Image from 'next/image';
import Link from 'next/link';
import {useEffect,useMemo,useRef,useState} from 'react';
import {Camera,Check,ChevronLeft,ChevronRight,Download,ImageUp,Info,LoaderCircle,
   Search,Sparkles,Sun,Music2,Video,Clapperboard,UserRound,ScanFace,
   X,ShoppingBag,Heart,RefreshCcw,ShieldCheck,ArrowUpRight} from 'lucide-react';
import {FeyaColorSwatch} from '@/components/FeyaColorSwatch';
import type {AiLookCatalogEntry,AiLookView} from '@/lib/aiLookPreviewCatalogServer';
import type {AiLookScene} from '@/lib/aiLookPreviewPolicy';

const scenes:{id:AiLookScene;label:string;hint:string;Icon:typeof Camera}[]=[
 {id:'studio',label:'Studio',hint:'Soft dimensional gray',Icon:Camera},
 {id:'festival',label:'Festival',hint:'Golden-hour lights',Icon:Sun},
 {id:'burning-man',label:'Burning Man',hint:'Desert at sunset',Icon:Sun},
 {id:'stage',label:'Stage',hint:'Atmospheric spotlights',Icon:Music2},
 {id:'red-carpet',label:'Red carpet',hint:'Editorial flash',Icon:Clapperboard},
];
type Photo={file:File;url:string};
type Result={imageDataUrl:string;referenceIndex:number;referenceDetailIndex:number|null};
const maxFileBytes=15*1024*1024;
async function normalizePhoto(file:File,face:boolean):Promise<Photo>{
 if(file.size>maxFileBytes||file.size<1000||!['image/jpeg','image/png','image/webp'].includes(file.type))
  throw new Error('Use a JPG, PNG or WebP photo up to 15 MB.');
 const origin=URL.createObjectURL(file);
 try{
  const element=document.createElement('img');
  element.src=origin;
  await element.decode();
  if(element.naturalWidth<300||element.naturalHeight<300)throw new Error('Please choose a clearer, higher-resolution photo.');
  const longest=face?1200:1700;
  const scale=Math.min(1,longest/Math.max(element.naturalWidth,element.naturalHeight));
  const canvas=document.createElement('canvas');
  canvas.width=Math.round(element.naturalWidth*scale);
  canvas.height=Math.round(element.naturalHeight*scale);
  const ctx=canvas.getContext('2d');
  if(!ctx)throw new Error('Your browser cannot prepare the image.');
  ctx.drawImage(element,0,0,canvas.width,canvas.height);
  // Two photos must stay below Vercel's 4.5 MB request-body limit.
  // Resize/encode on the device rather than storing customer portraits online.
  // Keep enough pixels for facial identity and garment/body proportions.
  const targetBytes=face?750_000:1_550_000;
  let blob:Blob|null=null;
  let quality=.82;
  for(let attempt=0;attempt<7;attempt++){
   blob=await new Promise<Blob>((resolve,reject)=>{
    canvas.toBlob(b=>b?resolve(b):reject(new Error('Cannot prepare this photo.')),'image/jpeg',quality);
   });
   if(blob.size<=targetBytes)break;
   if(quality>.66){quality=Math.max(.62,quality-.08);}
   else{
    const downsized=document.createElement('canvas');
    downsized.width=Math.round(canvas.width*.82);
    downsized.height=Math.round(canvas.height*.82);
    downsized.getContext('2d')?.drawImage(canvas,0,0,downsized.width,downsized.height);
    canvas.width=downsized.width;canvas.height=downsized.height;
    canvas.getContext('2d')?.drawImage(downsized,0,0);
   }
  }
  if(!blob||blob.size>targetBytes)throw new Error('Photo remains too large. Try a less detailed JPG.');
  const normalized=new File([blob],face?'face.jpg':'full-body.jpg',{type:'image/jpeg'});
  return{file:normalized,url:URL.createObjectURL(normalized)};
 }finally{URL.revokeObjectURL(origin);}
}
const errors:Record<string,string>={
 api_key_not_configured:'OpenAI generation is not connected to this Preview yet. The owner must enable the private API key in Vercel.',
 invalid_selection_or_photos:'Check your product options and upload two clear JPG, PNG or WebP photos.',
 listing_reference_unavailable:'The listing images could not be loaded. Try again later.',
 automatic_front_detection_unavailable:'Automatic front-view selection is temporarily unavailable. Select a frontal gallery photo manually and retry.',
 model_quota_or_billing:'OpenAI account credit or rate limit prevented generation. No result was created.',
 model_rejected_images:'The generator could not process these photos. Try different front-facing pictures.',
 image_provider_unavailable:'Image generation is temporarily unavailable. Try again.',
 image_api_authentication_failed:'OpenAI rejected the API key during image generation. Check that the exact full secret is active.',
 image_model_access_denied:'The OpenAI organization or project is not authorized for this image model. Check Platform model access and verification.',
 image_model_not_found:'The selected image model is unavailable to this OpenAI project.',
 image_rate_limited:'The image model is rate-limited. Please wait a minute and retry.',
 image_result_invalid:'The provider returned an incomplete image. Try again.',
 generation_temporarily_unavailable:'The preview could not be generated. Please try again later.',
};

export default function AiLookPreviewClient({look,catalog,configured}:{
 look:AiLookView;catalog:AiLookCatalogEntry[];configured:boolean;
}){
 const [searchOpen,setSearchOpen]=useState(false);
 const [query,setQuery]=useState('');
 const [color,setColor]=useState(look.defaultColor);
 const [configuration,setConfiguration]=useState(look.defaultConfig);
 const [displayReference,setDisplayReference]=useState(Math.min(look.recommendedReferenceIndex,look.gallery.length-1));
 const [manualReference,setManualReference]=useState<number|null>(null);
 const [scene,setScene]=useState<AiLookScene>('studio');
 const [face,setFace]=useState<Photo|null>(null);
 const [body,setBody]=useState<Photo|null>(null);
 const [cameraOpen,setCameraOpen]=useState(false);
 const [cameraError,setCameraError]=useState('');
 const [error,setError]=useState('');
 const [generating,setGenerating]=useState(false);
 const [elapsed,setElapsed]=useState(0);
 const [result,setResult]=useState<Result|null>(null);
 const [used,setUsed]=useState(0);
 const [saved,setSaved]=useState(false);
 const [connection,setConnection]=useState<{ok:boolean;status:string;message:string}|null>(null);
 const [checkingConnection,setCheckingConnection]=useState(false);
 const [ownerKeyVerified,setOwnerKeyVerified]=useState(false);
 const ownerKeyInput=useRef<HTMLInputElement>(null);
 // Keep a verified credential only in the current tab's memory. The key input
 // unmounts when connected; without this ref the generation request loses it.
 const verifiedOwnerKeyRef=useRef('');
 const selfieInput=useRef<HTMLInputElement>(null);
 const bodyInput=useRef<HTMLInputElement>(null);
 const videoRef=useRef<HTMLVideoElement>(null);
 const activeStream=useRef<MediaStream|null>(null);
 const abortRef=useRef<AbortController|null>(null);
 const remaining=Math.max(0,3-used);
 const connected=ownerKeyVerified||(connection?.ok??configured);
 const price=look.configs.find(c=>c.id===configuration)?.price??null;
 const label=look.configs.find(c=>c.id===configuration)?.label||'Full Set';
 const chosenColor=look.colors.find(c=>c.code===color)?.label||'As photographed';
 const image=look.gallery[displayReference]?.url||look.image;
 const filtered=useMemo(()=>{
  const needle=query.trim().toLowerCase();
  return (needle?catalog.filter(x=>x.title.toLowerCase().includes(needle)||x.slug.includes(needle)):catalog).slice(0,30);
 },[query,catalog]);

 useEffect(()=>{
  let cancelled=false;
  void fetch('/api/experiments/ai-look-preview/health',{cache:'no-store'})
   .then(async(response)=>{
    const json=await response.json() as {ok:boolean;status:string;message:string};
    if(!cancelled)setConnection(json);
   }).catch(()=>{if(!cancelled)setConnection({ok:false,status:'connection_check_failed',message:'Cannot check OpenAI connection. Retry.'});});
  return()=>{cancelled=true;};
 },[]);
 async function checkConnection(){
  if(checkingConnection)return;
  setCheckingConnection(true);setError('');
  // Read directly from the password input. The secret is never placed in URL,
  // React state, local/session storage, image metadata or analytics.
  const supplied=ownerKeyInput.current?.value.trim()||'';
  const suppliedKey=Boolean(supplied);
  try{
   const response=await fetch('/api/experiments/ai-look-preview/health',{
    method:suppliedKey?'POST':'GET',
    headers:suppliedKey?{'Content-Type':'application/json'}:undefined,
    body:suppliedKey?JSON.stringify({apiKey:supplied}):undefined,
    cache:'no-store',
   });
   const json=await response.json() as {ok:boolean;status:string;message:string};
   verifiedOwnerKeyRef.current=suppliedKey&&json.ok?supplied:'';
   setConnection(json);
   setOwnerKeyVerified(suppliedKey&&json.ok);
  }catch{
   verifiedOwnerKeyRef.current='';
   setOwnerKeyVerified(false);
   setConnection({ok:false,status:'connection_check_failed',message:'Cannot reach the image service diagnostics. Try again.'});
  }finally{setCheckingConnection(false);}
 }

 useEffect(()=>{
  const key='feya_tryon_beta_local_'+look.canonicalId;
  try{setUsed(Math.min(3,Math.max(0,Number(localStorage.getItem(key)||0))));}
  catch{setUsed(0);}
 },[look.canonicalId]);
 useEffect(()=>{
  if(!generating)return;
  const timer=window.setInterval(()=>setElapsed(value=>value+1),1000);
  return()=>window.clearInterval(timer);
 },[generating]);
 useEffect(()=>()=>{
  face?.url&&URL.revokeObjectURL(face.url);
  body?.url&&URL.revokeObjectURL(body.url);
  activeStream.current?.getTracks().forEach(t=>t.stop());
  abortRef.current?.abort();
 },[]);

 async function choosePhoto(file:File|undefined,kind:'face'|'body'){
  if(!file)return;
  setError('');
  try{
   const next=await normalizePhoto(file,kind==='face');
   if(kind==='face'){
    if(face)URL.revokeObjectURL(face.url);
    setFace(next);
   }else{
    if(body)URL.revokeObjectURL(body.url);
    setBody(next);
   }
   setResult(null);setSaved(false);
  }catch(e){setError(e instanceof Error?e.message:'Cannot read this photo.');}
 }
 async function openCamera(){
  setCameraError('');
  if(!navigator.mediaDevices?.getUserMedia){
   setCameraError('Camera is unavailable. Upload a selfie instead.');return;
  }
  try{
   const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user'},audio:false});
   activeStream.current=stream;setCameraOpen(true);
   requestAnimationFrame(()=>{if(videoRef.current)videoRef.current.srcObject=stream;});
  }catch{setCameraError('Camera permission was not granted. Upload a selfie instead.');}
 }
 function closeCamera(){
  activeStream.current?.getTracks().forEach(t=>t.stop());
  activeStream.current=null;setCameraOpen(false);
 }
 async function captureSelfie(){
  const video=videoRef.current;
  if(!video||!video.videoWidth)return;
  const canvas=document.createElement('canvas');
  canvas.width=video.videoWidth;canvas.height=video.videoHeight;
  canvas.getContext('2d')?.drawImage(video,0,0);
  const blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,'image/jpeg',.85));
  if(blob)await choosePhoto(new File([blob],'camera.jpg',{type:'image/jpeg'}),'face');
  closeCamera();
 }
 async function generate(){
  if(generating)return;
  if(!face||!body){setError('Please upload your face selfie and front-facing full-body photo.');return;}
  if(remaining<1){setError('Three free demo previews for this listing were used in this browser. Additional previews are not available in the Beta.');return;}
  if(!connected){setError(connection?.message||errors.api_key_not_configured);return;}
  setError('');setResult(null);setGenerating(true);setElapsed(0);setSaved(false);
  const ctrl=new AbortController();abortRef.current=ctrl;
  const form=new FormData();
  form.set('slug',look.slug);form.set('scene',scene);
  form.set('configuration',configuration);form.set('color',color);
  form.set('manualReference',manualReference===null?'auto':String(manualReference));
  form.set('selfie',face.file);form.set('fullBody',body.file);
  // Sent over HTTPS in this single private owner request only.
  // No secret is stored by the app or added to a URL.
  if(ownerKeyVerified&&verifiedOwnerKeyRef.current){
   form.set('ownerApiKey',verifiedOwnerKeyRef.current);
  }
  try{
   const response=await fetch('/api/experiments/ai-look-preview/generate',{
    method:'POST',body:form,signal:ctrl.signal,cache:'no-store'
   });
   const payload=await response.json() as {ok:boolean;reason?:string}&Partial<Result>;
   if(!response.ok||!payload.ok||!payload.imageDataUrl){
    throw new Error(errors[payload.reason||'']||errors.generation_temporarily_unavailable);
   }
   setResult({imageDataUrl:payload.imageDataUrl,referenceIndex:payload.referenceIndex||0,
    referenceDetailIndex:payload.referenceDetailIndex??null});
   setDisplayReference(payload.referenceIndex||0);
   setManualReference(null);
   setUsed(count=>{
    const next=Math.min(3,count+1);
    try{localStorage.setItem('feya_tryon_beta_local_'+look.canonicalId,String(next));}catch{}
    return next;
   });
  }catch(e){
   if(ctrl.signal.aborted)setError('The request was cancelled.');
   else setError(e instanceof Error?e.message:errors.generation_temporarily_unavailable);
  }finally{setGenerating(false);abortRef.current=null;}
 }
 function downloadResult(){
  if(!result)return;
  const a=document.createElement('a');
  a.href=result.imageDataUrl;a.download='FEYA-look-preview-'+scene+'.jpg';
  document.body.appendChild(a);a.click();a.remove();setSaved(true);
 }
 const progress=generating?Math.min(93,Math.round(9+84*(1-Math.exp(-elapsed/52)))):result?100:0;
 const formattedPrice=price===null?'Select option':new Intl.NumberFormat('en-IE',{style:'currency',currency:look.currency,maximumFractionDigits:0}).format(price);
 return <div className="tryon-page">
  <div className="tryon-heading">
   <div><p className="tryon-eyebrow">AI LOOK PREVIEW · PRIVATE BETA</p>
    <h1>See it on you.</h1>
    <p className="tryon-subtitle">Choose a real FEYA look, add two photos and imagine yourself wearing it.</p>
   </div>
   <div className="tryon-stepper" aria-label="Preview steps">
    {['Select look','Upload photos','Generate preview'].map((t,i)=><div className={'tryon-step '+(i===0?'current':i===1?face&&body?'current':'':result?'current':'')} key={t}>
      <span>{i+1}</span><small>{t}</small>
     </div>)}
   </div>
  </div>
  <div className="tryon-columns">
   <section className="tryon-panel tryon-product">
    <div className="tryon-panel-title"><span>01 / SELECTED LOOK</span>
     <button type="button" className="tryon-inline-link" onClick={()=>setSearchOpen(true)}>Change look <ArrowUpRight size={14}/></button>
    </div>
    <div className="tryon-main-photo">
     <Image src={image} alt={look.title+' reference photograph'} fill sizes="(max-width:700px) 90vw,(max-width:1200px) 44vw,31vw" className="tryon-object" priority/>
     {look.gallery.length>1?<><button type="button" aria-label="Previous gallery photo" className="tryon-photo-prev" onClick={()=>{
      const next=(displayReference-1+look.gallery.length)%look.gallery.length;setDisplayReference(next);setManualReference(next);
     }}><ChevronLeft size={19}/></button>
     <button type="button" aria-label="Next gallery photo" className="tryon-photo-next" onClick={()=>{
      const next=(displayReference+1)%look.gallery.length;setDisplayReference(next);setManualReference(next);
     }}><ChevronRight size={19}/></button></>:null}
     <div className="tryon-photo-caption">Real listing photo · {displayReference+1}/{look.gallery.length}</div>
    </div>
    <div className="tryon-reference-row">
      <span>Reference gallery · AI selects the best front view</span>
      {manualReference!==null?<button type="button" onClick={()=>setManualReference(null)}>Restore Auto</button>:null}
    </div>
    <div className="tryon-gallery" aria-label="Listing photo references">
      {look.gallery.slice(0,10).map((photo,i)=><button type="button"
        key={photo.url} className={i===displayReference?'active':''}
        onClick={()=>{setDisplayReference(i);setManualReference(i);}}
        aria-label={'Use listing reference photo '+(i+1)}
        title="Click to override the automatic front-view choice">
        <Image src={photo.url} alt="" width={78} height={88} sizes="65px" className="tryon-object" loading="lazy"/>
       </button>)}
    </div>
    <h2 className="tryon-product-name">{look.title}</h2>
    <strong className="tryon-price">{formattedPrice}</strong>
    <div className="tryon-rule"/>
    <label className="tryon-field-label" htmlFor="tryon-config">Configuration</label>
    <select id="tryon-config" className="tryon-select" value={configuration} onChange={e=>{setConfiguration(e.target.value);setResult(null);}}>
     {look.configs.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}
    </select>
    {look.colors.length>0?<div className="tryon-color-field">
      <p className="tryon-field-label">Color · <em>{chosenColor}</em></p>
      <div className="tryon-swatches">{look.colors.map(c=><button type="button" key={c.code}
       aria-label={'Select '+c.label} aria-pressed={color===c.code} title={c.label}
       onClick={()=>{setColor(c.code);setResult(null);}}>
       <FeyaColorSwatch color={c.label} selected={color===c.code} size={23}/></button>)}</div>
     </div>:null}
    <p className="tryon-balance"><Sparkles size={16}/> {remaining}/3 complimentary Beta previews left for this listing</p>
   </section>

   <section className="tryon-panel tryon-creator">
    <div className="tryon-panel-title"><span>02 / ADD YOUR PHOTOS</span></div>
    <div className="tryon-upload-grid">
     <div className={'tryon-upload '+(face?'filled':'')}>
       <div className="tryon-upload-icon">{face?<Check size={22}/>:<ScanFace size={28}/>}</div>
       <strong>Face selfie</strong><p>Look directly at the camera in clear, natural light.</p>
       {face?<img src={face.url} className="tryon-upload-photo" alt="Selected face selfie"/>:null}
       <input ref={selfieInput} type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>{void choosePhoto(e.target.files?.[0],'face');e.target.value='';}}/>
       <div className="tryon-upload-actions">
        <button type="button" onClick={()=>selfieInput.current?.click()}><ImageUp size={15}/> {face?'Replace':'Upload selfie'}</button>
        <button type="button" aria-label="Take selfie using camera" title="Take selfie" onClick={()=>void openCamera()}><Camera size={16}/></button>
       </div>
     </div>
     <div className={'tryon-upload '+(body?'filled':'')}>
       <div className="tryon-upload-icon">{body?<Check size={22}/>:<UserRound size={28}/>}</div>
       <strong>Front full-body photo</strong><p>Stand facing forward, arms visible, in simple fitted clothes.</p>
       {body?<img src={body.url} className="tryon-upload-photo" alt="Selected full-body photograph"/>:null}
       <input ref={bodyInput} type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>{void choosePhoto(e.target.files?.[0],'body');e.target.value='';}}/>
       <div className="tryon-upload-actions"><button type="button" onClick={()=>bodyInput.current?.click()}><ImageUp size={15}/> {body?'Replace photo':'Upload photo'}</button></div>
     </div>
    </div>
    {cameraError?<p className="tryon-error">{cameraError}</p>:null}
    {cameraOpen?<div className="tryon-camera">
      <video ref={videoRef} autoPlay playsInline muted/>
      <div><button type="button" className="tryon-gold-small" onClick={()=>void captureSelfie()}><Camera size={16}/> Take selfie</button>
       <button type="button" onClick={closeCamera}><X size={16}/> Close camera</button></div>
     </div>:null}
    <p className="tryon-tip"><Info size={17}/> Good lighting, sharp photos and a fully visible body improve realism. No side photo needed.</p>
    <div className="tryon-scene-header">03 / CHOOSE A SCENE <span>Optional</span></div>
    <div className="tryon-scenes">
      {scenes.map((choice)=><button type="button" key={choice.id}
       className={'tryon-scene scene-'+choice.id+(scene===choice.id?' active':'')}
       onClick={()=>{setScene(choice.id);setResult(null);}}
       title={choice.hint} aria-pressed={scene===choice.id}>
        <choice.Icon size={25} strokeWidth={1.5}/><span>{choice.label}</span>{scene===choice.id?<Check className="tryon-scene-check" size={13}/>:null}
       </button>)}
    </div>
    <div className="tryon-progress-wrap" aria-live="polite" aria-label="Generation progress">
     <div className="tryon-progress-top">
      <span>{generating?<LoaderCircle size={19} className="tryon-spin"/>:result?<Check size={19}/>:<Sparkles size={19}/>}
      {generating?'Creating your look…':result?'Your preview is ready':'Ready when you are'}</span>
      <b>{generating?'≈'+progress+'%':result?'100%':'—'}</b>
     </div>
     <div className="tryon-progress-bar"><span style={{width:progress+'%'}}/></div>
     <p>{generating?'Estimated progress · '+elapsed+' s elapsed; image generation can take around a minute.':
       result?'Generated from real listing references. Review garment details before buying.':
       'Upload two photos and choose a scene to start.'}</p>
    </div>
    {!connected?<div className="tryon-connection" role="group" aria-labelledby="tryon-owner-connection-label">
      <div className="tryon-connection-title" id="tryon-owner-connection-label"><Info size={17}/> One-time connection · private owner test</div>
      <p>Enter your OpenAI API key here to activate real image generation in this protected Beta. You can use your existing key. It is held only while this browser tab stays open.</p>
      <label className="tryon-owner-label" htmlFor="tryon-private-key">OpenAI API key</label>
      <input id="tryon-private-key" ref={ownerKeyInput} type="password" name="feya-preview-owner-key"
       autoComplete="off" spellCheck={false} maxLength={240}
       className="tryon-owner-secret" placeholder="sk-proj-…"
       onChange={()=>{verifiedOwnerKeyRef.current='';setOwnerKeyVerified(false);setConnection({ok:false,status:'key_changed',message:'Press Verify connection to confirm this key.'});}}
       aria-describedby="tryon-private-key-help"/>
      <p id="tryon-private-key-help">Important: The API Keys table only shows a masked key and a Tracking ID. Neither can be used for authentication. You need the full secret value copied when the key was created. Never use the key name. The secret is not stored by TheFEYA; generation incurs OpenAI API charges.</p>
      {connection&&!connection.ok&&connection.status!=='setup_required'?<p className="tryon-owner-feedback" role="status">{connection.message}</p>:null}
      <button type="button" onClick={()=>void checkConnection()} disabled={checkingConnection}>
        {checkingConnection?'Verifying connection…':'Verify connection'} <RefreshCcw size={14}/>
      </button>
      <details className="tryon-owner-alternative"><summary>Alternatively, connect a Vercel Preview secret</summary>
        <p>For a permanent owner-only setup, set encrypted <code>OPENAI_API_KEY</code> and <code>FEYA_AI_LOOK_PREVIEW_ENABLED=true</code> on this branch, then redeploy. This is not required for the one-time test.</p>
      </details>
     </div>:<p className="tryon-connection-ready"><Check size={16}/> OpenAI connection verified. Upload two photos and press Generate my preview.</p>}
    {error?<div className="tryon-error" role="alert">{error}</div>:null}
    <button type="button" className="tryon-generate" onClick={()=>void generate()} disabled={generating||remaining===0||!connected}>
     {generating?<LoaderCircle size={18} className="tryon-spin"/>:<Sparkles size={18}/>}
     {generating?'Generating…':remaining===0?'Three previews used':!connected?'Awaiting OpenAI connection':'Generate my preview'}
    </button>
    <p className="tryon-consent"><ShieldCheck size={15}/> Your photos are sent to OpenAI only when you generate. They are not saved in the FEYA catalog or attached to your order.</p>
    <div className="tryon-token-note">
      <span>Want more previews? <strong>5 for $2 · 10 for $3 · 20 for $5</strong></span>
      <span className="tryon-token-pending">Paid previews unavailable until checkout activation</span>
    </div>
   </section>

   <section className="tryon-panel tryon-result">
    <div className="tryon-panel-title"><span>03 / YOUR AI PREVIEW</span>
      {result?<button type="button" aria-label="Download AI look preview" onClick={downloadResult}><Download size={17}/></button>:null}
    </div>
    <div className={'tryon-preview-image '+(!result?'waiting':'')}>
      {result?<img src={result.imageDataUrl} alt={'Generated FEYA look preview in '+scene+' scene'}/>:
        <><div className="tryon-preview-abstract"><Sparkles size={43}/></div>
         <div className="tryon-preview-prompt"><Camera size={27}/><strong>Your look will appear here</strong>
          <p>Upload two photos and see yourself in the selected FEYA design.</p>
         </div></>}
    </div>
    <div className="tryon-preview-meta">{result?'AI image · '+scenes.find(x=>x.id===scene)?.label:
      'Private Beta · no image is generated until you press the button'}</div>
    <p className="tryon-preview-disclaimer"><Info size={16}/> Artistic visualization only. AI may change costume details or fit; the original product photos and description define what is sold.</p>
    <div className="tryon-result-actions">
      <button type="button" disabled={!result} onClick={downloadResult}><Heart size={16}/>{saved?'Saved':'Save image'}</button>
      <button type="button" onClick={()=>{setResult(null);setError('');}}><RefreshCcw size={16}/>Try again</button>
      <Link href={'/shop/'+look.slug}><ShoppingBag size={16}/>View real product</Link>
    </div>
   </section>
  </div>
  {searchOpen?<div className="tryon-dialog" role="dialog" aria-modal="true" aria-label="Choose a FEYA look">
    <div className="tryon-dialog-content">
     <div className="tryon-dialog-header"><div><p className="tryon-eyebrow">REAL FEYA COLLECTION</p><h2>Choose your look</h2></div>
      <button type="button" onClick={()=>setSearchOpen(false)} aria-label="Close"><X/></button></div>
     <div className="tryon-search"><Search size={18}/><input autoFocus value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search among 207 approved FEYA designs"/></div>
     <div className="tryon-product-list">
      {filtered.map(item=><button key={item.id} type="button" onClick={()=>window.location.assign('/experiments/ai-look-preview?slug='+encodeURIComponent(item.slug))}>
       <img src={item.image} alt=""/><span>{item.title}</span><ArrowUpRight size={18}/></button>)}
      {filtered.length===0?<p>No matching FEYA products.</p>:null}
     </div>
    </div>
   </div>:null}
 </div>;
}
