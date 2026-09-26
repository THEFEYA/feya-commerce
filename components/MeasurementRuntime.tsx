'use client';

import {useEffect,useState} from 'react';
import {usePathname} from 'next/navigation';
import {getAnalyticsConsent,setMeasurementPageContext,trackPageView} from '@/lib/measurementClient';
import type {FeyaMeasurementPageContext} from '@/lib/measurementContract';

export function MeasurementRuntime(){
  const pathname=usePathname();
  const [consentRevision,setConsentRevision]=useState(0);

  useEffect(()=>{
    const onConsent=()=>setConsentRevision((value)=>value+1);
    window.addEventListener('feya:analytics-consent',onConsent);
    return()=>window.removeEventListener('feya:analytics-consent',onConsent);
  },[]);

  useEffect(()=>{
    if(!pathname||pathname.startsWith('/admin')||pathname.startsWith('/api')||getAnalyticsConsent()!=='granted'){
      setMeasurementPageContext(null);
      return;
    }
    let cancelled=false;
    const controller=new AbortController();

    async function load(){
      try{
        const response=await fetch(`/api/measurement/context?path=${encodeURIComponent(pathname||'/')}`,{
          cache:'no-store',
          signal:controller.signal,
          headers:{Accept:'application/json'},
        });
        if(!response.ok){
          if(!cancelled)setMeasurementPageContext(null);
          return;
        }
        const body=await response.json() as {ok?:boolean;context?:FeyaMeasurementPageContext};
        if(cancelled||!body.ok||!body.context)return;
        setMeasurementPageContext(body.context);
        trackPageView();
      }catch(error){
        if(!cancelled&&(error as {name?:string})?.name!=='AbortError')setMeasurementPageContext(null);
      }
    }

    load();
    return()=>{
      cancelled=true;
      controller.abort();
    };
  },[pathname,consentRevision]);

  return null;
}
