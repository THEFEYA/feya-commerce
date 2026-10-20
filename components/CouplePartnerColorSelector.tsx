'use client';
import {FeyaColorSwatch} from '@/components/FeyaColorSwatch';
import {colorChoiceLabel} from '@/lib/bonanzaColorChoices';

type Partner='women'|'men';
export function CouplePartnerColorSelector({
  available,women,men,onChange,
}:{
  available:readonly string[];
  women:string;men:string;onChange:(partner:Partner,code:string)=>void;
}){
  return <div className="mt-2">
    <div className="eyebrow mb-2 text-[10px]">Colors · Women's {colorChoiceLabel(women)} / Men's {colorChoiceLabel(men)}</div>
    <p className="mb-3 text-[11px] leading-5 text-[var(--bone-dim)]">
      Each outfit can be made in a different color. Select a finish for each person.
    </p>
    <div className="grid grid-cols-2 gap-x-4 gap-y-3">
      {([
        {id:'women' as Partner,title:"Women's Outfit",value:women},
        {id:'men' as Partner,title:"Men's Outfit",value:men},
      ]).map(partner=><div key={partner.id}>
        <div className="mb-2 text-[10px] tracking-[0.11em] text-[var(--smoke)]">{partner.title}</div>
        <div className="flex flex-wrap items-center gap-2" role="radiogroup" aria-label={partner.title+' color'}>
          {available.map(code=><button
            key={code} type="button" role="radio" aria-checked={partner.value===code}
            aria-label={partner.title+': '+colorChoiceLabel(code)}
            title={colorChoiceLabel(code)}
            onClick={()=>onChange(partner.id,code)}
            className="group inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[#e3c887]">
              <FeyaColorSwatch color={colorChoiceLabel(code)} selected={partner.value===code} size={26}/>
          </button>)}
        </div>
      </div>)}
    </div>
  </div>;
}
