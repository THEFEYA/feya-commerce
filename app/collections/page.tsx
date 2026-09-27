import type {Metadata} from 'next';
import Link from 'next/link';
import {ArrowUpRight} from 'lucide-react';
import {Header} from '@/components/Header';
import {Footer} from '@/components/Footer';
import {SEARCH_DISCOVERY_GROUPS} from '@/config/searchDiscoveryArchitecture';
import {releaseRobotsForPath} from '@/lib/searchReleaseIndexationServer';

export async function generateMetadata():Promise<Metadata>{
  return{
    title:'Shop TheFEYA Collections',
    description:'Browse TheFEYA collections by product type, event and performance use, with curated paths into the current handmade catalog.',
    alternates:{canonical:'/collections'},
    robots:await releaseRobotsForPath('/collections'),
  };
}

export default function CollectionsHubPage(){
  const ownerGroups=SEARCH_DISCOVERY_GROUPS
    .map((group)=>({...group,items:group.items.filter((item)=>item.role==='OWNER'||item.role==='INTERSECTION_OWNER')}))
    .filter((group)=>group.items.length);
  const filterGroup=SEARCH_DISCOVERY_GROUPS.find((group)=>group.code==='styles');
  return <main className="relative min-h-screen">
    <Header/>
    <section className="container-feya pt-36 pb-12 lg:pt-44 lg:pb-16">
      <div className="max-w-4xl">
        <div className="eyebrow-gold mb-5">Shop by collection</div>
        <h1 className="font-tall text-bone leading-[.95]" style={{fontSize:'clamp(52px,7vw,96px)'}}>TheFEYA Collections</h1>
        <p className="editorial-italic mt-6 max-w-3xl text-lg leading-relaxed text-[var(--bone-dim)]">
          Browse TheFEYA by product type, event and performance use through a curated collection structure built around the current catalog.
        </p>
      </div>
    </section>

    <section className="container-feya pb-16 lg:pb-24">
      <div className="space-y-12">
        {ownerGroups.map((group)=>(
          <section key={group.code} aria-labelledby={`collection-group-${group.code}`}>
            <div className="mb-5 flex items-end justify-between gap-4">
              <div>
                <div className="eyebrow-gold">Browse by</div>
                <h2 id={`collection-group-${group.code}`} className="mt-2 text-bone text-2xl">{group.title}</h2>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {group.items.map((item)=>(
                <Link
                  key={item.href}
                  href={item.href}
                  data-discovery-role={item.role}
                  className="group rounded-xl border border-[rgba(216,214,211,.14)] bg-[rgba(255,255,255,.025)] p-6 lg:p-7 transition-all hover:border-[rgba(212,178,106,.45)] hover:bg-[rgba(212,178,106,.05)]"
                >
                  <div className="eyebrow-gold">{item.role==='INTERSECTION_OWNER'?'Focused collection':'Collection'}</div>
                  <div className="mt-4 flex items-start justify-between gap-4">
                    <h3 className="text-bone text-2xl">{item.label}</h3>
                    <ArrowUpRight size={16} className="mt-1 shrink-0 text-[var(--bone-dim)] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"/>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>

      {filterGroup?.items.length?<div className="mt-12 rounded-xl border border-[rgba(216,214,211,.14)] bg-[rgba(255,255,255,.02)] p-6 lg:p-7">
        <div className="eyebrow-gold">Explore the catalog</div>
        <h2 className="mt-3 text-bone text-xl">Explore by visual direction</h2>
        <p className="mt-3 max-w-3xl text-[14px] leading-6 text-[var(--bone-dim)]">
          Use these shortcuts to narrow the catalog by the visual direction you want.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          {filterGroup.items.map((item)=>(
            <Link key={item.href} href={item.href} data-discovery-role="FILTER" className="btn-ghost">{item.label}</Link>
          ))}
        </div>
      </div>:null}

      <div className="mt-8 rounded-xl border border-[rgba(212,178,106,.24)] bg-[rgba(212,178,106,.05)] p-6 lg:p-7">
        <div className="eyebrow-gold">Before you order</div>
        <h2 className="mt-3 text-bone text-xl">Fit, care, shipping and store policies</h2>
        <p className="mt-3 max-w-3xl text-[14px] leading-6 text-[var(--bone-dim)]">
          Use the trust pages to check measurements, material care, delivery timing and the current exchange policy before choosing a product configuration.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href="/size-guide" className="btn-ghost">Measurements & sizing</Link>
          <Link href="/care" className="btn-ghost">Care & storage</Link>
          <Link href="/shipping" className="btn-ghost">Shipping</Link>
          <Link href="/returns" className="btn-ghost">Returns & exchanges</Link>
          <Link href="/about" className="btn-ghost">About TheFEYA</Link>
          <Link href="/contact" className="btn-ghost">Contact</Link>
        </div>
      </div>
    </section>
    <Footer/>
  </main>;
}
