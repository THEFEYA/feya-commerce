'use client';

import {useState} from 'react';
import {ExternalLink,MapPin,MousePointerClick} from 'lucide-react';

const LOCATIONS={
  kyiv:{
    query:'Фея-Портупея, Харківське шосе 19, Київ, Україна',
    label:'Фея-Портупея · Kyiv showroom location',
  },
  'us-warehouse':{
    query:'635 Somers Avenue, Feasterville-Trevose, Pennsylvania 19053 USA',
    label:'Seller Online partner warehouse · Pennsylvania, USA',
  },
} as const;

export function OwnerLocationMapPreview({location}:{location:keyof typeof LOCATIONS}){
  const [loaded,setLoaded]=useState(false);
  const data=LOCATIONS[location];
  const external='https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(data.query);
  const embed='https://www.google.com/maps?q='+encodeURIComponent(data.query)+'&output=embed';
  return <div className="mt-4" aria-label={data.label}>
    <div className="relative aspect-[16/9] min-h-[205px] overflow-hidden rounded-xl border border-white/[.16] bg-[radial-gradient(ellipse_at_center,rgba(70,70,80,.27),rgba(16,16,20,.98))]">
      {loaded?<iframe title={data.label+' — interactive Google Maps'}
        src={embed} loading="lazy" referrerPolicy="no-referrer-when-downgrade"
        allowFullScreen className="absolute inset-0 h-full w-full border-0"
      />:<div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
        <MapPin size={28} className="text-[#d4b26a]" aria-hidden="true"/>
        <p className="max-w-xs text-[13px] leading-6 text-[var(--bone-dim)]">
          Interactive map with zoom and pan. Google Maps loads only after you choose to show it.
        </p>
        <button type="button" onClick={()=>setLoaded(true)}
          className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[rgba(212,178,106,.48)] px-4 text-[13px] text-[#f7f3ec] hover:bg-white/[.07] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#d4b26a]">
          <MousePointerClick size={15} aria-hidden="true"/> Load interactive map
        </button>
      </div>}
    </div>
    <a className="mt-3 inline-flex items-center gap-2 text-[12px] text-[#e1c681] underline underline-offset-4 hover:text-[#f7f3ec]"
      href={external} target="_blank" rel="noopener noreferrer">
      Open location in Google Maps <ExternalLink size={14} aria-hidden="true"/>
    </a>
  </div>;
}
