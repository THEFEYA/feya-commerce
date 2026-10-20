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
  const blob=await new Promise<Blob>((resolve,reject)=>{
   canvas.toBlob(b=>b?resolve(b):reject(new Error('Cannot prepare this photo.')),'image/jpeg',.84);
  });
  if(blob.size>6*1024*1024)throw new Error('Photo remains too large. Try a smaller file.');
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
 const selfieInput=useRef<HTMLInputElement>(null);
 const bodyInput=useRef<HTMLInputElement>(null);
 const videoRef=useRef<HTMLVideoElement>(null);
 const activeStream=useRef<MediaStream|null>(null);
 const abortRef=useRef<AbortController|null>(null);
 const remaining=Math.max(0,3-used);
 const connected=connection?.ok??configured;
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
  setCheckingConnection(true);
  try{
   const response=await fetch('/api/experiments/ai-look-preview/health',{cache:'no-store'});
   const json=await response.json() as {ok:boolean;status:string;message:string};
   setConnection(json);
  }catch{setConnection({ok:false,status:'connection_check_failed',message:'Cannot reach the image service diagnostics. Try again.'});}
  finally{setCheckingConnection(false);}
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
    {connection&&!connection.ok?<div className="tryon-connection" role="status">
      <div className="tryon-connection-title"><Info size={17}/> OpenAI image generation is not connected</div>
      <p>{connection.message}</p>
      <p>Vercel → feya-commerce → Settings → Environment Variables → Preview, branch <code>work/ai-look-preview-prototype-20261020</code>.</p>
      <p>Add encrypted <code>OPENAI_API_KEY</code> and <code>FEYA_AI_LOOK_PREVIEW_ENABLED=true</code>; redeploy this Preview.</p>
      <button type="button" onClick={()=>void checkConnection()} disabled={checkingConnection}>
        {checkingConnection?'Checking…':'Recheck connection'} <RefreshCcw size={14}/>
      </button>
     </div>:connection?.ok?<p className="tryon-connection-ready"><Check size={16}/> OpenAI connected. You can generate a real preview.</p>:null}
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
