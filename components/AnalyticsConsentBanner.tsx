'use client';

import {useEffect,useState} from 'react';
import {getAnalyticsConsent,setAnalyticsConsent,type FeyaAnalyticsConsent} from '@/lib/measurementClient';

export function AnalyticsConsentBanner({enabled}:{enabled:boolean}){
  const [consent,setConsent]=useState<FeyaAnalyticsConsent>('unset');

  useEffect(()=>{
    if(!enabled)return;
    setConsent(getAnalyticsConsent());
  },[enabled]);

  if(!enabled||consent!=='unset')return null;

  const choose=(value:'granted'|'denied')=>{
    setAnalyticsConsent(value);
    setConsent(value);
  };

  return <aside
    aria-label="Analytics privacy choice"
    className="fixed bottom-4 left-4 right-4 z-[150] mx-auto max-w-3xl rounded-xl border border-[rgba(216,214,211,.22)] bg-[rgba(7,7,10,.96)] p-5 shadow-[0_24px_80px_rgba(0,0,0,.72)] backdrop-blur-xl"
  >
    <div className="text-bone text-[15px]">Optional analytics</div>
    <p className="mt-2 text-[13px] leading-6 text-[var(--bone-dim)]">
      TheFEYA can use optional analytics to understand how the storefront is used. Analytics stay off unless you allow them. Advertising storage remains disabled by this control.
    </p>
    <div className="mt-4 flex flex-wrap gap-3">
      <button type="button" className="btn-chrome" onClick={()=>choose('granted')}>Allow analytics</button>
      <button type="button" className="btn-ghost" onClick={()=>choose('denied')}>Decline</button>
      <a href="/privacy" className="btn-ghost">Privacy policy</a>
    </div>
  </aside>;
}

export function AnalyticsConsentPreferences({enabled}:{enabled:boolean}){
  const [consent,setConsent]=useState<FeyaAnalyticsConsent>('unset');

  useEffect(()=>{
    setConsent(getAnalyticsConsent());
  },[]);

  if(!enabled)return <p className="text-[14px] leading-6 text-[var(--bone-dim)]">Optional analytics are not active in the current storefront configuration.</p>;

  const choose=(value:'granted'|'denied')=>{
    setAnalyticsConsent(value);
    setConsent(value);
  };

  return <div>
    <p className="text-[14px] leading-6 text-[var(--bone-dim)]">
      Current analytics choice: <span className="text-bone">{consent==='granted'?'Allowed':consent==='denied'?'Declined':'Not chosen'}</span>.
    </p>
    <div className="mt-4 flex flex-wrap gap-3">
      <button type="button" className="btn-chrome" onClick={()=>choose('granted')}>Allow analytics</button>
      <button type="button" className="btn-ghost" onClick={()=>choose('denied')}>Decline analytics</button>
    </div>
  </div>;
}
