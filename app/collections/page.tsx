export const instant = false;

import type {Metadata} from 'next';
import Link from 'next/link';
import {ArrowUpRight} from 'lucide-react';
import {Header} from '@/components/Header';
import {Footer} from '@/components/Footer';
import {STOREFRONT_NAVIGATION_PANELS, type StorefrontNavigationItem} from '@/config/storefrontNavigation';
import {releaseRobotsForPath} from '@/lib/searchReleaseIndexationServer';

export async function generateMetadata():Promise<Metadata>{
  return{
    title:'Shop TheFEYA Collections',
    description:'Browse TheFEYA by product type, event, performance use and visual direction through the current pre-index storefront architecture.',
    alternates:{canonical:'/collections'},
    robots:await releaseRobotsForPath('/collections'),
  };
}

function DestinationCard({item}:{item:StorefrontNavigationItem}){
  if(!item.enabled || !item.href)return null;
  return <div className="rounded-xl border border-white/[.08] bg-[#111117] p-5 transition-colors hover:border-[rgba(216,181,109,.32)]">
    <Link href={item.href} className="group flex items-start justify-between gap-4 transition-colors hover:text-white">
      <h3 className="text-bone text-xl">{item.label}</h3>
      <ArrowUpRight size={15} className="mt-1 shrink-0 text-[var(--bone-dim)] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"/>
    </Link>
    {item.children?.length ? <div className="mt-4 border-l border-white/10 pl-4">
      {item.children.filter((child)=>child.enabled&&child.href).map((child)=>
        <Link key={child.code} href={child.href!} className="flex items-center justify-between border-b border-white/[.06] py-2 text-[11px] uppercase tracking-[.16em] text-[var(--bone-dim)] hover:text-white">
          {child.label}<ArrowUpRight size={10}/>
        </Link>
      )}
    </div> : null}
  </div>;
}

function DiscoverySection({id,title,description,panelCode}:{id:string;title:string;description:string;panelCode:string}){
  const panel=STOREFRONT_NAVIGATION_PANELS[panelCode];
  if(!panel)return null;
  const groups=panel.groups.filter((group)=>group.code!=='shop_help'&&group.items.some((item)=>item.enabled));
  return <section id={id} className="scroll-mt-32 border-t border-[rgba(216,214,211,.10)] py-12 lg:py-16">
    <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
      <div>
        <div className="eyebrow-gold mb-3">{title}</div>
        <p className="max-w-sm text-[14px] leading-6 text-[var(--bone-dim)]">{description}</p>
      </div>
      <div className={`grid gap-8 ${groups.length > 1 ? 'xl:grid-cols-2' : ''}`}>
        {groups.map((group)=><div key={group.code}>
          <div className="mb-4 text-[10px] uppercase tracking-[0.30em] text-[var(--gold-warm)]">{group.label}</div>
          <div className="grid gap-3 sm:grid-cols-2">
            {group.items.filter((item)=>item.enabled).map((item)=><DestinationCard key={item.code} item={item}/>)}
          </div>
        </div>)}
      </div>
    </div>
  </section>;
}

export default function CollectionsHubPage(){
  return <main className="visual-commerce-shell relative min-h-screen">
    <Header/>
    <section className="container-feya pt-36 pb-8 lg:pt-44 lg:pb-10">
      <div className="max-w-4xl">
        <div className="eyebrow-gold mb-5">Explore TheFEYA</div>
        <h1 className="visual-display text-[clamp(48px,6vw,86px)] font-medium leading-[.94] tracking-[-.045em] text-[#f7f3ec]">Shop by what matters to you</h1>
        <p className="mt-6 max-w-3xl text-[16px] leading-7 text-[#aaa2a0]">
          Start with the piece, event, performance context or visual direction. Proven search owners keep their collection URLs; shopper refinements use the catalog without creating duplicate SEO pages.
        </p>
      </div>
    </section>

    <div className="container-feya pb-16 lg:pb-24">
      <DiscoverySection
        id="shop"
        title="Shop by piece"
        description="Use the physical product structure first. Search-owner wording does not replace the simpler shopper taxonomy."
        panelCode="shop"
      />
      <DiscoverySection
        id="events-performance"
        title="Events & performance"
        description="Choose by occasion or performance role. Stage, fashion-show, showgirl, drag queen, go-go and pole paths are grouped into one Performance branch."
        panelCode="events_performance"
      />
      <DiscoverySection
        id="style"
        title="Shop by style"
        description="Styles and personas are both available for browsing, but remain distinct Product DNA axes and do not create duplicate SEO owners automatically."
        panelCode="style"
      />

      <section className="border-t border-[rgba(216,214,211,.10)] pt-12 lg:pt-16">
        <div className="rounded-xl border border-[rgba(212,178,106,.24)] bg-[rgba(212,178,106,.05)] p-6 lg:p-7">
          <div className="eyebrow-gold">Before you order</div>
          <h2 className="mt-3 text-bone text-xl">Fit, care, shipping and store policies</h2>
          <p className="mt-3 max-w-3xl text-[14px] leading-6 text-[var(--bone-dim)]">
            Check measurements, material care, delivery timing and the current exchange policy before choosing a product configuration.
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
    </div>
    <Footer/>
  </main>;
}
