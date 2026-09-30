import Link from 'next/link';
import {ArrowUpRight} from 'lucide-react';
import {ShopClient} from '@/components/ShopClient';
import type {DiscoveryHubTile} from '@/config/discoveryHubs';
import type {StorefrontProduct} from '@/lib/types';

export function DiscoveryTileRow({tiles}:{tiles:DiscoveryHubTile[]}){
  return <div className="-mx-4 overflow-x-auto px-4 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
    <div className="flex min-w-max gap-3 lg:grid lg:min-w-0 lg:grid-cols-5">
      {tiles.map((tile)=>(
        <Link
          key={tile.code}
          href={tile.href}
          className="visual-hover-sheen group relative aspect-[4/5] w-[42vw] min-w-[165px] max-w-[260px] overflow-hidden rounded-[14px] border border-[rgba(216,181,109,.10)] bg-[#111117] transition-[border-color,box-shadow] duration-300 hover:border-[rgba(216,181,109,.24)] hover:shadow-[0_22px_48px_-30px_rgba(216,181,109,.16)] lg:w-auto lg:max-w-none"
        >
          {tile.imageUrl ? <img src={tile.imageUrl} alt={tile.imageAlt} loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.035]"/> : <div className="absolute inset-0 bg-[radial-gradient(90%_70%_at_55%_20%,#28262d,#0d0d11)]"/>}
          <div className="absolute inset-0 bg-gradient-to-t from-black/82 via-black/12 to-transparent"/>
          <div className="visual-tile-label-band absolute inset-x-0 bottom-0 z-10 px-4 pb-4 pt-3">
            <div className="text-[9px] uppercase tracking-[.18em] text-[#e7cf96]">{tile.eyebrow}</div>
            <div className="font-tall mt-1.5 text-[clamp(22px,2vw,30px)] leading-none text-[#f7f3ec]">{tile.label}</div>
            <div className="mt-2 line-clamp-2 text-[11px] leading-4 text-[#d0c9c0]">{tile.description}</div>
            <span className="mt-3 inline-flex items-center gap-1.5 text-[9px] uppercase tracking-[.15em] text-[#d9d2c8]">Explore <ArrowUpRight size={10}/></span>
          </div>
        </Link>
      ))}
    </div>
  </div>;
}

export function DiscoveryHubProducts({products}:{products:StorefrontProduct[]}){
  return <ShopClient products={products} embedded/>;
}
