/** Historical two verified locations. Optimized lazy loading in SSO-protected preview only. */
'use client';

import {useEffect,useRef,useState} from 'react';
import {ExternalLink,MapPin,MousePointerClick} from 'lucide-react';

/** Verified Google Business Place IDs (11 October 2026).
 * These IDs identify the exact listed businesses. The private review
 * uses an address/name search iframe while Google Maps' official
 * query_place_id anchors the business profile link unambiguously.
 */
const LOCATIONS={
  kyiv:{
    query:'Фея-Портупея, Харківське шосе, 19, Київ, Україна',
    placeId:'ChIJBWr-l83F1EARiaqJ10nf3mA',
    label:'Фея-Портупея · Kyiv showroom',
  },
  'us-warehouse':{
    query:'Ship2C Seller Online LLC, 635 Somers Ave, Trevose, PA 19053, USA',
    placeId:'ChIJQZawTZytxokRn5f9xm8D7xg',
    label:'Ship2C / Seller Online LLC · Pennsylvania fulfillment facility',
  },
} as const;

export function ApprovedOwnerLocationMapPreview({location}:{location:keyof typeof LOCATIONS}){
  // Automatically show genuine interactive maps in the authenticated owner
  // Preview. The public route retains click-to-consent behavior for GDPR.
  // Map iframes are expensive. Fetch each verified Google location only when
  // it approaches the viewport; the direct Google Maps link always works.
  // This component renders exclusively in the protected owner V13 Preview.
  const container=useRef<HTMLDivElement>(null);
  const [loaded,setLoaded]=useState(false);
  const [ready,setReady]=useState(false);
  useEffect(()=>{
    if(loaded)return;
    const node=container.current;
    if(!node||typeof IntersectionObserver==='undefined')return;
    const observer=new IntersectionObserver(entries=>{
      if(entries.some(entry=>entry.isIntersecting))setLoaded(true);
    },{rootMargin:'160px'});
    observer.observe(node);
    return()=>observer.disconnect();
  },[loaded]);
  const data=LOCATIONS[location];
  const external='https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(data.query)
    +'&query_place_id='+encodeURIComponent(data.placeId);
  // Existing no-key Google map embed format. Official Maps Embed API requires
  // a restricted Google API key before adopting /maps/embed/v1/place.
  const embed='https://maps.google.com/maps?q='+encodeURIComponent(data.query)+'&z=16&output=embed';
  return <div ref={container} className="mt-4 min-w-0 max-w-full" aria-label={data.label}>
    <div className="relative aspect-[16/9] min-h-[205px] min-w-0 max-w-full overflow-hidden rounded-xl border border-white/[.16] bg-[radial-gradient(ellipse_at_center,rgba(70,70,80,.27),rgba(16,16,20,.98))]">
      {loaded?<iframe title={data.label+' — interactive Google Maps'}
        src={embed} loading="lazy" onLoad={()=>setReady(true)}
        referrerPolicy="strict-origin-when-cross-origin"
        allowFullScreen className={'absolute inset-0 block h-full w-full max-w-full border-0 transition-opacity duration-200 '+(ready?'opacity-100':'opacity-0')}
      />:null}
      {!ready?<div className="absolute inset-0 flex h-full flex-col items-center justify-center gap-3 p-5 text-center"
        role="status" aria-live="polite">
        <MapPin size={28} className="text-[#d4b26a]" aria-hidden="true"/>
        <p className="max-w-xs text-[13px] leading-6 text-[var(--bone-dim)]">
          {loaded?'Loading the interactive map…':'Interactive Google Maps · zoom and explore the location.'}
        </p>
        {!loaded?<button type="button" onClick={()=>setLoaded(true)}
          className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[rgba(212,178,106,.48)] px-4 text-[13px] text-[#f7f3ec] hover:bg-white/[.07] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#d4b26a]">
          <MousePointerClick size={15} aria-hidden="true"/> Load interactive map
        </button>:null}
      </div>:null}
    </div>
    <a className="mt-3 inline-flex items-center gap-2 text-[12px] text-[#e1c681] underline underline-offset-4 hover:text-[#f7f3ec]"
      href={external} target="_blank" rel="noopener noreferrer">
      Open location in Google Maps <ExternalLink size={14} aria-hidden="true"/>
    </a>
    {loaded?<p className="mt-2 text-[11px] leading-5 text-[#918b84]">Interactive Google Maps · scroll or pinch to zoom. Google may process map usage data.</p>:null}
  </div>;
}
