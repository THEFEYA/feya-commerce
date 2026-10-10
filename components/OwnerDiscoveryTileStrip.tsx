'use client';

import Image from 'next/image';
import Link from 'next/link';
import {useRef} from 'react';
import {ArrowLeft,ArrowRight,ArrowUpRight} from 'lucide-react';
import type {DiscoveryHubTile} from '@/config/discoveryHubs';

/** Product-first four-across carousel: full image, compact bottom label,
 * keyboard-operable arrows and direct crawlable item links. No new SEO owners.
 */
export function OwnerDiscoveryTileStrip({tiles}:{tiles:readonly DiscoveryHubTile[]}){
  const track=useRef<HTMLDivElement>(null);
  const move=(direction:-1|1)=>track.current?.scrollBy({
    left:direction*Math.max(260,Math.round((track.current?.clientWidth||800)*.77)),
    behavior:'smooth',
  });
  return <section aria-label="Explore by collection or style" className="pb-5">
    <div ref={track} className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {tiles.map(tile=><Link key={tile.code} href={tile.href}
        aria-label={tile.label}
        className="visual-hover-sheen group relative block aspect-[4/5] min-w-0 shrink-0 basis-[77vw] snap-start overflow-hidden rounded-[13px] border border-[rgba(216,181,109,.15)] bg-[#111117] transition-[border-color,box-shadow] duration-300 hover:border-[rgba(216,181,109,.4)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d4b26a] sm:basis-[43vw] lg:basis-[calc((100%-36px)/4)]">
        {tile.imageUrl?<Image src={tile.imageUrl} alt={tile.imageAlt} fill sizes="(max-width:639px) 77vw, (max-width:1023px) 43vw, 24vw" loading="lazy"
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
