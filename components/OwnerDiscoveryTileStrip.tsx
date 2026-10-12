'use client';

import Image from 'next/image';
import Link from 'next/link';
import {useEffect,useRef,useState} from 'react';
import {ArrowLeft,ArrowRight,ArrowUpRight} from 'lucide-react';
import type {DiscoveryHubTile} from '@/config/discoveryHubs';

/** Product-first four-across carousel: full image, compact bottom label,
 * keyboard-operable arrows and direct crawlable item links. No new SEO owners.
 */
export function OwnerDiscoveryTileStrip({tiles}:{tiles:readonly DiscoveryHubTile[]}){
  const track=useRef<HTMLDivElement>(null);
  const [pause,setPause]=useState(false);
  // The visual strip advances ONE tile every 3 seconds, loops to the start,
  // and pauses while the shopper explores it. Honor reduced-motion settings.
  useEffect(()=>{
    const node=track.current;
    if(!node||pause||tiles.length<=4||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
    const timer=window.setInterval(()=>{
      if(document.visibilityState!=='visible')return;
      const first=node.querySelector('a');
      if(!first)return;
      const itemWidth=first.getBoundingClientRect().width+12;
      const max=Math.max(0,node.scrollWidth-node.clientWidth);
      if(max<1)return;
      const target=node.scrollLeft+itemWidth;
      node.scrollTo({left:target>=max+itemWidth/2?0:Math.min(max,target),
        behavior:target>=max+itemWidth/2?'auto':'smooth'});
    },3000);
    return ()=>window.clearInterval(timer);
  },[tiles.length,pause]);
  const move=(direction:-1|1)=>track.current?.scrollBy({
    left:direction*Math.max(260,Math.round((track.current?.clientWidth||800)*.77)),
    behavior:'smooth',
  });
  return <section aria-label="Explore by collection or style" className="pb-1">
    <div ref={track} onMouseEnter={()=>setPause(true)} onMouseLeave={()=>setPause(false)}
      onFocusCapture={()=>setPause(true)}
      onBlurCapture={(event)=>{if(!event.currentTarget.contains(event.relatedTarget as Node|null))setPause(false);}}
      className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {tiles.map((tile,i)=><Link key={tile.code} href={tile.href}
        aria-label={tile.label}
        className="visual-hover-sheen group relative block aspect-[4/5] min-w-0 shrink-0 basis-[77vw] snap-start overflow-hidden rounded-[13px] border border-[rgba(216,181,109,.15)] bg-[#111117] transition-[border-color,box-shadow] duration-300 hover:border-[rgba(216,181,109,.4)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d4b26a] sm:basis-[43vw] lg:basis-[calc((100%-36px)/4)]">
        {tile.imageUrl?<Image src={tile.imageUrl} alt={tile.imageAlt} fill sizes="(max-width:639px) 77vw, (max-width:1023px) 43vw, 24vw" loading={i<4?'eager':'lazy'} fetchPriority={i===0?'high':'auto'}
          className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.025]"/>:<div className="absolute inset-0 bg-[#1c1b21]"/>}
        <div className="absolute inset-x-0 bottom-0 z-10 flex min-h-[68px] items-center justify-between gap-3 bg-[rgba(11,10,13,.88)] px-4 py-3 backdrop-blur-sm">
          <span className="font-tall text-[clamp(23px,2vw,28px)] leading-tight text-[#f7f3ec]">{tile.label}</span>
          <ArrowUpRight size={15} className="shrink-0 text-[#d4b26a]" aria-hidden="true"/>
        </div>
        <span className="sr-only">{tile.description}</span>
      </Link>)}
    </div>
    <div className="mt-2 flex justify-end gap-2">
      <button type="button" onClick={()=>move(-1)} aria-label="Previous collections or styles" className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 text-[#d4cfc7] hover:border-[#d4b26a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#d4b26a]"><ArrowLeft size={16}/></button>
      <button type="button" onClick={()=>move(1)} aria-label="Next collections or styles" className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 text-[#d4cfc7] hover:border-[#d4b26a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#d4b26a]"><ArrowRight size={16}/></button>
    </div>
  </section>;
}
