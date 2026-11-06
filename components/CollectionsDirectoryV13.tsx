import Link from 'next/link';
import {Suspense} from 'react';
import {Header} from '@/components/Header';
import {Footer} from '@/components/Footer';
import {OwnerDiscoveryTileStrip} from '@/components/OwnerDiscoveryTileStrip';
import {COLLECTION_DIRECTORY_GROUPS} from '@/config/discoveryHubs';

export function CollectionsDirectoryV13(){
  return <main className="visual-commerce-shell relative min-h-screen">
    <Suspense fallback={null}><Header/></Suspense>
    <section className="container-feya pt-36 pb-8 lg:pt-44 lg:pb-10">
      <div className="max-w-4xl">
        <div className="eyebrow-gold mb-5">TheFEYA collections</div>
        <h1 className="visual-display text-[clamp(48px,6vw,86px)] font-medium leading-[.94] tracking-[-.045em] text-[#f7f3ec]">Find your way into the collection.</h1>
        <p className="mt-6 max-w-3xl text-[16px] leading-7 text-[#aaa2a0]">Start with the piece, event or performance context that matches what you are looking for. Style browsing stays available as a separate discovery path.</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/shop" className="visual-primary-cta">Shop all</Link>
          <Link href="/events-performance" className="visual-secondary-cta">Events & Performance</Link>
          <Link href="/style" className="visual-secondary-cta">Browse by Style</Link>
        </div>
      </div>
    </section>

    <div className="container-feya pb-16 lg:pb-24">
      {COLLECTION_DIRECTORY_GROUPS.map((group)=>(
        <section key={group.code} className="border-t border-[rgba(216,214,211,.10)] py-12 lg:py-16">
          <div className="mb-7 max-w-2xl">
            <div className="eyebrow-gold mb-2">{group.label}</div>
            <p className="text-[14px] leading-6 text-[var(--bone-dim)]">{group.description}</p>
          </div>
          <OwnerDiscoveryTileStrip tiles={group.tiles}/>

        </section>
      ))}

      <section className="border-t border-[rgba(216,214,211,.10)] pt-12 lg:pt-16">
        <div className="rounded-xl border border-[rgba(212,178,106,.24)] bg-[rgba(212,178,106,.05)] p-6 lg:p-7">
          <div className="eyebrow-gold">Need another way in?</div>
          <h2 className="mt-3 text-bone text-xl">Browse the full catalog or start from a visual style.</h2>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/shop" className="btn-ghost">Shop all pieces</Link>
            <Link href="/style" className="btn-ghost">Browse styles</Link>
            <Link href="/size-guide" className="btn-ghost">Measurements & sizing</Link>
            <Link href="/shipping" className="btn-ghost">Shipping</Link>
            <Link href="/returns" className="btn-ghost">Returns & exchanges</Link>
          </div>
        </div>
      </section>
    </div>
    <Footer/>
  </main>;
}
