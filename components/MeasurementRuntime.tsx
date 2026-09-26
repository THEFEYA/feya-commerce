'use client';

import {useEffect} from 'react';
import {usePathname} from 'next/navigation';
import {setMeasurementPageContext,trackPageView} from '@/lib/measurementClient';
import type {FeyaMeasurementPageContext} from '@/lib/measurementContract';

export function MeasurementRuntime(){
  const pathname=usePathname();

  useEffect(()=>{
    if(!pathname||pathname.startsWith('/admin')||pathname.startsWith('/api')){
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
  },[pathname]);

  return null;
}
