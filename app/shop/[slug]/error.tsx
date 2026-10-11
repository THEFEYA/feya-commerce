'use client';

import {useEffect,useState} from 'react';
import {RefreshCw} from 'lucide-react';

/** Only the exact protected owner Preview retries one transient streamed
 * product-navigation error. Public behavior is not silently auto-retried.
 * A 15-second session cooldown stops infinite retry loops on persistent failures.
 */
export default function ProductRouteError({reset}:{error:Error&{digest?:string};reset:()=>void}){
  const [retrying,setRetrying]=useState(process.env.NEXT_PUBLIC_FEYA_OWNER_V2_COPY_REVIEW==='1');
  useEffect(()=>{
    if(process.env.NEXT_PUBLIC_FEYA_OWNER_V2_COPY_REVIEW!=='1')return;
    let allow=true;
    try{
      const key='feya-owner-pdp-retry:'+window.location.pathname;
      const now=Date.now();
      const previous=Number(window.sessionStorage.getItem(key)||0);
      if(Number.isFinite(previous)&&now-previous<15000)allow=false;
      else window.sessionStorage.setItem(key,String(now));
    }catch{
      // A blocked storage API does not block ordinary manual recovery.
      allow=false;
    }
    if(!allow){setRetrying(false);return;}
    const handle=window.setTimeout(()=>{reset();},350);
    return()=>window.clearTimeout(handle);
  },[reset]);
  return <main className="flex min-h-[76vh] items-center justify-center bg-[#09090c] px-5 text-[#f7f3ec]">
    <div className="max-w-md text-center">
      {retrying?<div aria-live="polite" className="text-[14px] text-[#c7c0b5]">
        <RefreshCw size={24} className="mx-auto mb-4 animate-spin text-[#d4b26a]" aria-hidden="true"/>
        Opening your item…
      </div>:<>
        <h1 className="text-[22px] font-medium">We couldn’t open this item just now.</h1>
        <p className="mt-3 text-[14px] leading-6 text-[#a9a39b]">Please try again. Your bag is unchanged.</p>
        <button type="button" className="mt-5 min-h-11 rounded-lg border border-[#d4b26a]/40 px-5 text-[13px] text-[#e9c982]"
          onClick={()=>{setRetrying(true);reset();}}>Try again</button>
      </>}
    </div>
  </main>;
}
