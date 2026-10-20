'use client';
import {FeyaColorSwatch} from '@/components/FeyaColorSwatch';
import {ChevronDown} from 'lucide-react';
import {colorChoiceLabel} from '@/lib/bonanzaColorChoices';

type Partner='women'|'men';

/** Existing V13 PDP selection styling, compact for the two-person bundle.
 * Color and size are separately controlled for each partner. This never
 * creates price rows; the exact approved Paired Set controls the amount. */
export function CouplePartnerColorSelector({
  available,women,men,womenSize,menSize,sizes,onChange,onSizeChange,showSizeWarning=false,
}:{
  available:readonly string[];
  women:string;men:string;
  womenSize:string;menSize:string;
  sizes:readonly string[];
  onChange:(partner:Partner,code:string)=>void;
  onSizeChange:(partner:Partner,size:string)=>void;
  showSizeWarning?:boolean;
}){
  return <section className="mt-3" aria-label="Couple colors and sizes">
    <div className="eyebrow mb-2 text-[10px]">Colors &amp; sizes · Paired set</div>
    <div className="divide-y divide-white/[0.07] rounded-lg border border-white/[0.10] bg-white/[0.018] px-2.5">
      {([
        {id:'women' as Partner,title:'Women',color:women,size:womenSize},
        {id:'men' as Partner,title:'Men',color:men,size:menSize},
      ]).map(partner=><div key={partner.id}
        className="grid grid-cols-[60px_minmax(0,1fr)_128px] items-center gap-2 py-2 sm:grid-cols-[70px_minmax(0,1fr)_142px]">
        <div className="min-w-0">
          <div className="text-[11px] text-[#d7d0c4]">{partner.title}</div>
          <div className="truncate text-[9px] text-[var(--smoke)]" title={colorChoiceLabel(partner.color)}>
            {colorChoiceLabel(partner.color)}
          </div>
        </div>
        <div className="flex min-w-0 flex-wrap items-center gap-1" role="radiogroup"
          aria-label={partner.title+' outfit color'}>
          {available.map(code=><button
            key={code} type="button" role="radio" aria-checked={partner.color===code}
            aria-label={partner.title+' outfit: '+colorChoiceLabel(code)}
            title={colorChoiceLabel(code)}
            onClick={()=>onChange(partner.id,code)}
            className="group inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[#e3c887]">
              <FeyaColorSwatch color={colorChoiceLabel(code)} selected={partner.color===code} size={20}/>
          </button>)}
        </div>
        <label className="relative block min-w-0">
          <span className="sr-only">{partner.title} outfit size</span>
          <select value={partner.size} required
            onChange={(e)=>onSizeChange(partner.id,e.target.value)}
            aria-label={partner.title+' outfit size'}
            className="feya-config-trigger h-10 w-full appearance-none rounded-md px-3 pr-8 text-[13px] font-medium tracking-[.02em] text-[#f7f3ec] outline-none focus:border-[#d4b474] focus-visible:ring-2 focus-visible:ring-[#d4b474]">
            <option value="">Size</option>
            {sizes.map(s=><option key={s} value={s}>{s}</option>)}
          </select>
          <ChevronDown aria-hidden="true" size={15}
            className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#d2c7b6]"/>
        </label>
      </div>)}
    </div>
    {showSizeWarning ? <p role="alert" className="mt-2 text-[11px] text-[#e9bd95]">
      Select a size for both outfits to continue.
    </p> : null}
  </section>;
}
