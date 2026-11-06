import {Instagram,Facebook,Pin} from 'lucide-react';
import {FEYA_SOCIAL_PROFILES} from '@/config/socialProfiles';

const icons={instagram:Instagram,facebook:Facebook,pinterest:Pin};
export function SocialProfileLinks({compact=false}:{compact?:boolean}){
  return <div className="flex flex-wrap items-center gap-x-5 gap-y-3" aria-label="TheFEYA social profiles">
    {FEYA_SOCIAL_PROFILES.map(({id,label,href})=>{
      const Icon=icons[id];
      return <a key={id} href={href} target="_blank" rel="noopener noreferrer"
        aria-label={label+' — TheFEYA (opens in a new tab)'}
        title={label} className={compact
          ?'inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/20 text-[var(--bone-dim)] transition-colors hover:border-[#d4b26a] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#d4b26a]'
          :'inline-flex min-h-10 items-center gap-2 text-[12px] text-[#c5bdb3] transition-colors hover:text-[#e1c681] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#d4b26a]'}>
        <Icon size={compact?18:22} strokeWidth={1.7} aria-hidden="true"/>{compact?null:label}
      </a>;
    })}
  </div>;
}
