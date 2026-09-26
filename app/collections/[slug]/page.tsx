import type {Metadata} from 'next';
import {notFound} from 'next/navigation';
import Link from 'next/link';
import {Header} from '@/components/Header';
import {Footer} from '@/components/Footer';
import {ProductCard} from '@/components/ProductCard';
import {getSearchLandingCandidate} from '@/config/searchLandingCandidates';
import {readSearchLandingRelease} from '@/lib/searchLandingPageServer';
import {releaseRobotsForPath} from '@/lib/searchReleaseIndexationServer';

export const dynamic='force-dynamic';
export const revalidate=0;

type PageProps={params:Promise<{slug:string}>};

function jsonLd(value:unknown){
  return {__html:JSON.stringify(value).replace(/</g,'\\u003c')};
}

export async function generateMetadata({params}:PageProps):Promise<Metadata>{
  const {slug}=await params;
  const candidate=getSearchLandingCandidate(slug);
  if(!candidate)return {title:'Collection not found',robots:{index:false,follow:true}};

  const release=await readSearchLandingRelease(slug);
  const content=release?.content;

  return {
    title:content?.seo_title || candidate.title,
    description:content?.meta_description || candidate.description,
    alternates:{canonical:`/collections/${candidate.slug}`},
    robots:await releaseRobotsForPath(`/collections/${candidate.slug}`),
  };
}

export default async function SearchLandingCandidatePage({params}:PageProps){
  const {slug}=await params;
  const release=await readSearchLandingRelease(slug);
  if(!release)notFound();

  const {candidate,content,products,breadcrumbs,relatedLinks,membershipCount,holdReason,version,contentHash}=release;
  const isHold=candidate.searchStatus==='hold_noindex';

  const breadcrumbLd={
    '@context':'https://schema.org',
    '@type':'BreadcrumbList',
    itemListElement:breadcrumbs.map((crumb,index)=>({
      '@type':'ListItem',
      position:index+1,
      name:crumb.label,
      item:crumb.href==='/'?'https://thefeya.com':`https://thefeya.com${crumb.href}`,
    })),
  };

  const collectionLd=!isHold&&content?{
    '@context':'https://schema.org',
    '@type':'CollectionPage',
    name:content.h1,
    description:content.meta_description,
    url:`https://thefeya.com${content.path}`,
    isPartOf:{'@type':'WebSite',name:'TheFEYA',url:'https://thefeya.com'},
    mainEntity:{
      '@type':'ItemList',
      numberOfItems:products.length,
      itemListElement:products.map((product,index)=>({
        '@type':'ListItem',
        position:index+1,
        url:`https://thefeya.com/shop/${product.product_slug || product.canonical_product_id}`,
        name:product.card_title || product.h1 || 'TheFEYA product',
      })),
    },
  }:null;

  return <main className="relative min-h-screen">
    <Header/>
    <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(breadcrumbLd)}/>
    {collectionLd?<script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(collectionLd)}/>:null}

    <section className="container-feya pt-32 pb-6 lg:pt-40">
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-[var(--smoke)]">
        {breadcrumbs.map((crumb,index)=>(
          <span key={crumb.href} className="inline-flex items-center gap-2">
            {index>0?<span aria-hidden="true">/</span>:null}
            {index===breadcrumbs.length-1
              ? <span className="text-[var(--bone-dim)]">{crumb.label}</span>
              : <Link href={crumb.href} className="transition-colors hover:text-bone">{crumb.label}</Link>}
          </span>
        ))}
      </nav>
    </section>

    <section className="container-feya pb-10 lg:pb-14">
      <div className="max-w-4xl">
        <div className="eyebrow-gold mb-5">{candidate.eyebrow}</div>
        <h1 className="font-tall text-bone leading-[.95]" style={{fontSize:'clamp(52px,7vw,96px)'}}>{content?.h1 || candidate.title}</h1>
        <p className="editorial-italic mt-6 max-w-3xl text-lg leading-relaxed text-[var(--bone-dim)]">{content?.intro || candidate.description}</p>

        {content?.chips?.length?<div className="mt-7 flex flex-wrap gap-2" aria-label="Collection themes">
          {content.chips.map((chip)=><span key={chip} className="rounded-full border border-[rgba(216,214,211,.18)] px-3 py-1.5 text-[10px] uppercase tracking-[0.16em] text-[var(--bone-dim)]">{chip}</span>)}
        </div>:null}
      </div>
    </section>

    <section className="container-feya pb-8">
      <div className="rounded-xl border border-[rgba(212,178,106,.24)] bg-[rgba(212,178,106,.055)] p-5 text-[13px] leading-6 text-[var(--bone-dim)]">
        <span className="text-bone">Search release status:</span>{' '}
        {isHold
          ? `hold / noindex. ${holdReason || 'This prototype has no approved search owner.'}`
          : `CQA-passed preview / noindex. Page version v${version} and its immutable product membership are rendered together. Indexing is still blocked until the selective release gate.`}
        {!isHold&&contentHash?<span className="ml-2 text-[10px] text-[var(--smoke)]">Content {contentHash.slice(0,12)}…</span>:null}
      </div>
    </section>

    {!isHold&&content?<>
      <section className="container-feya pb-10">
        <div className="grid gap-4 lg:grid-cols-2">
          {content.modules.map((module)=>(
            <article key={module.heading} className="rounded-xl border border-[rgba(216,214,211,.14)] bg-[rgba(255,255,255,.025)] p-6 lg:p-7">
              <h2 className="text-bone text-xl">{module.heading}</h2>
              <p className="mt-4 text-[15px] leading-7 text-[var(--bone-dim)]">{module.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="container-feya pb-12 lg:pb-16">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between mb-7">
          <div>
            <div className="eyebrow-gold">Current collection snapshot</div>
            <h2 className="mt-3 text-bone text-2xl">{membershipCount} orderable pieces</h2>
          </div>
          <Link href="/shop" className="btn-ghost">Shop all</Link>
        </div>

        {products.length
          ? <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 lg:gap-6">
              {products.map((product,index)=><ProductCard key={String(product.canonical_product_id)} product={product} index={index}/>)}
            </div>
          : <div className="rounded-xl border border-[rgba(216,214,211,.14)] p-6 text-[var(--bone-dim)]">No current release products are present in this immutable membership snapshot.</div>}
      </section>

      <section className="container-feya pb-12 lg:pb-16">
        <div className="rounded-xl border border-[rgba(216,214,211,.14)] bg-[rgba(255,255,255,.02)] p-6 lg:p-8">
          <div className="eyebrow-gold">Explore related collections</div>
          <div className="mt-5 flex flex-wrap gap-3">
            {relatedLinks.map((link)=><Link key={link.href} href={link.href} className="btn-ghost">{link.anchor}</Link>)}
          </div>
        </div>
      </section>

      <section className="container-feya pb-12 lg:pb-16">
        <div className="rounded-xl border border-[rgba(212,178,106,.22)] bg-[rgba(212,178,106,.04)] p-6 lg:p-7">
          <div className="eyebrow-gold">Before you order</div>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/size-guide" className="btn-ghost">Measurements & sizing</Link>
            <Link href="/care" className="btn-ghost">Care & storage</Link>
            <Link href="/shipping" className="btn-ghost">Shipping</Link>
            <Link href="/returns" className="btn-ghost">Returns & exchanges</Link>
            <Link href="/contact" className="btn-ghost">Contact</Link>
          </div>
        </div>
      </section>

      {content.faq.length?<section className="container-feya pb-16 lg:pb-24">
        <div className="max-w-4xl">
          <div className="eyebrow-gold">Questions</div>
          <div className="mt-5 divide-y divide-[rgba(216,214,211,.12)] border-y border-[rgba(216,214,211,.12)]">
            {content.faq.map((item)=>(
              <article key={item.q} className="py-6">
                <h2 className="text-bone text-lg">{item.q}</h2>
                <p className="mt-3 text-[15px] leading-7 text-[var(--bone-dim)]">{item.a}</p>
              </article>
            ))}
          </div>
        </div>
      </section>:null}
    </>:<section className="container-feya pb-16 lg:pb-24">
      <div className="rounded-xl border border-[rgba(216,214,211,.14)] p-6 text-[var(--bone-dim)]">
        This prototype remains intentionally empty as an SEO collection. Products continue to be discoverable through Shop and evidence-backed collection owners.
      </div>
    </section>}

    <Footer/>
  </main>;
}
