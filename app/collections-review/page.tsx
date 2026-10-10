export const instant = false;

import type {Metadata} from 'next';
import Image from 'next/image';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import {ArrowUpRight} from 'lucide-react';
import {Header} from '@/components/Header';
import {Footer} from '@/components/Footer';
import {COLLECTION_DIRECTORY_GROUPS} from '@/config/discoveryHubs';

/** OWNER ONLY — no alteration of the indexed collections hub and no new
 * navigation entry, sitemap URL, product membership or public Search v12 owner.
 * Matching approved homepage card geometry/tokens are copied precisely.
 */
export const metadata:Metadata={
  title:'TheFEYA · Collection Cards Owner Review',
  description:'Protected larger category-tile typography and geometry comparison, not a published collection.',
  robots:{index:false,follow:false,noarchive:true,nocache:true},
};
const BRANCH='work/collections-home-scale-owner-preview-20261010';
const PROJECT='prj_ePIymo4sUG33wrRjHBxWrSlaxPID';
function enabled(){
  return process.env.VERCEL==='1'
    &&process.env.VERCEL_ENV==='preview'
    &&process.env.VERCEL_PROJECT_ID===PROJECT
    &&process.env.VERCEL_GIT_COMMIT_REF===BRANCH
    &&process.env.FEYA_OWNER_PREVIEW_DISABLED!=='true';
}

export default function CollectionsHomeScalePreview(){
  if(!enabled())notFound();
  return <main className="visual-commerce-shell relative min-h-screen">
    <Header/>
    <section className="container-feya pt-32 pb-9 sm:pt-36 lg:pt-40 lg:pb-12">
      <div className="max-w-4xl">
        <p className="eyebrow-gold mb-4">TheFEYA · Owner design review</p>
        <h1 className="visual-display text-[clamp(38px,4.5vw,60px)] font-medium leading-[1.04] tracking-[-.035em] text-[#f7f3ec]">
          Shop our collections
        </h1>
        <p className="mt-5 max-w-3xl text-[15px] leading-7 text-[var(--bone-dim)]">
          Larger, legible visual cards styled like the approved homepage. Each card
          features one outfit image and a short label. Descriptions live below
          the image instead of obscuring the garment.
        </p>
        <div className="mt-5 flex flex-wrap gap-3 text-[12px]">
          <a href="https://thefeya.com/collections" target="_blank" rel="noopener noreferrer" className="btn-ghost">
            Compare with current live collections ↗
          </a>
          <Link href="/site-review" className="btn-ghost">Review all published landings</Link>
        </div>
      </div>
    </section>

    <div className="container-feya pb-16 lg:pb-24">
      {COLLECTION_DIRECTORY_GROUPS.map(group=><section key={group.code}
        className="border-t border-[rgba(216,214,211,.12)] pt-10 pb-12 lg:pt-14 lg:pb-16">
        <div className="mb-7 max-w-2xl">
          <h2 className="eyebrow-gold">{group.label}</h2>
          <p className="mt-2 text-[14px] leading-6 text-[var(--bone-dim)]">{group.description}</p>
        </div>
        <div className="grid grid-cols-1 gap-x-5 gap-y-9 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {group.tiles.map(tile=><article key={tile.code} className="min-w-0">
            <Link href={tile.href} className="group block rounded-[14px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#d4b26a]">
              <div className="visual-hover-sheen group relative aspect-[4/5] w-full overflow-hidden rounded-[14px] border border-white/[.07] bg-[rgba(255,255,255,.018)] shadow-[0_24px_55px_-36px_rgba(0,0,0,.85)] transition-colors hover:border-[rgba(216,181,109,.25)]">
                {tile.imageUrl?<Image src={tile.imageUrl} alt={tile.imageAlt} fill
                  sizes="(max-width: 639px) calc(100vw - 48px), (max-width: 1023px) 50vw, (max-width: 1279px) 33vw, 25vw"
                  loading="lazy" className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.035]"
                />:<div className="absolute inset-0 bg-[radial-gradient(90%_70%_at_55%_20%,#28262d,#0d0d11)]"/>}
                <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent"/>
                <div className="visual-tile-label-band visual-piece-label-band absolute inset-x-0 bottom-0 flex items-center justify-center px-7 py-4 text-center">
                  <h3 className="font-tall text-[21px] leading-none tracking-[.015em] text-[#f4f1ea]">{tile.label}</h3>
                  <ArrowUpRight size={14} className="absolute right-4 shrink-0 text-[#d8b56d]" aria-hidden="true"/>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between gap-2">
                <span className="eyebrow-gold text-[10px]">{tile.eyebrow}</span>
                {'pieceCount' in tile&&tile.pieceCount?
                  <span className="text-[10px] uppercase tracking-[.1em] text-[var(--bone-dim)]">
                    {tile.pieceCount} pieces
                  </span>:null}
              </div>
              <p className="mt-2 text-[13px] leading-6 text-[var(--bone-dim)]">{tile.description}</p>
            </Link>
          </article>)}
        </div>
      </section>)}
      <p className="mt-5 text-[12px] leading-6 text-[var(--bone-dim)]">
        Owner Preview only: category membership, destinations, product photos, counts and Search v12 URL owners remain unchanged.
        Live category card geometry is not modified until explicit visual approval.
      </p>
    </div>
    <Footer/>
  </main>;
}
