import type {Metadata} from 'next';
import {notFound} from 'next/navigation';
import Link from 'next/link';
import {Header} from '@/components/Header';
import {Footer} from '@/components/Footer';
import {ProductCard} from '@/components/ProductCard';
import {getSearchLandingCandidate} from '@/config/searchLandingCandidates';
import {readSearchLandingMembership} from '@/lib/searchLandingMembership';
import {readSearchLandingContent} from '@/lib/searchLandingContent';

export const dynamic='force-dynamic';
export const revalidate=0;

type PageProps={params:Promise<{slug:string}>};

export async function generateMetadata({params}:PageProps):Promise<Metadata>{
  const {slug}=await params;
  const candidate=getSearchLandingCandidate(slug);
  if(!candidate)return {title:'Collection not found',robots:{index:false,follow:true}};

  let content=null;
  try{content=await readSearchLandingContent(slug);}catch{content=null;}

  return {
    title:content?.seo_title||candidate.title,
    description:content?.meta_description||candidate.description,
    alternates:{canonical:`/collections/${candidate.slug}`},
    robots:{index:false,follow:true},
  };
}

export default async function SearchLandingCandidatePage({params}:PageProps){
  const {slug}=await params;
  const [data,content]=await Promise.all([
    readSearchLandingMembership(slug),
    readSearchLandingContent(slug),
  ]);
  if(!data)notFound();

  const {candidate,products,membershipCount,source}=data;
  const isHold=candidate.searchStatus==='hold_noindex';
  const showDebug=process.env.FEYA_SEARCH_PREVIEW_DEBUG==='true';
  const h1=content?.h1||candidate.title;
  const intro=content?.intro||candidate.description;

  return <main className="relative min-h-screen">
    <Header/>
    <section className="container-feya pt-36 pb-10 lg:pt-44 lg:pb-14">
      <div className="max-w-4xl">
        <div className="eyebrow-gold mb-5">{candidate.eyebrow}</div>
        <h1 className="font-tall text-bone leading-[.95]" style={{fontSize:'clamp(52px,7vw,96px)'}}>{h1}</h1>
        <p className="editorial-italic mt-6 max-w-3xl text-lg leading-relaxed text-[var(--bone-dim)]">{intro}</p>
        {content?.chips?.length ? <div className="mt-7 flex flex-wrap gap-2" aria-label="Collection themes">
          {content.chips.map((chip)=><span key={chip} className="rounded-full border border-[rgba(216,214,211,.18)] px-3 py-1.5 text-[10px] uppercase tracking-[.18em] text-[var(--bone-dim)]">{chip}</span>)}
        </div>:null}
      </div>
    </section>

    {showDebug ? <section className="container-feya pb-8">
      <div className="rounded-xl border border-[rgba(212,178,106,.24)] bg-[rgba(212,178,106,.055)] p-5 text-[13px] leading-6 text-[var(--bone-dim)]">
        <span className="text-bone">Search release status:</span>{' '}
        {isHold
          ? `hold / noindex. ${candidate.holdReason||'This prototype has no approved search owner.'}`
          : 'CQA-passed preview / noindex. Membership and content are immutable drafts; selective indexing is still blocked.'}
      </div>
    </section>:null}

    {!isHold ? <>
      <section className="container-feya pb-16 lg:pb-20">
        <div className="flex items-end justify-between gap-6 mb-7">
          <div>
            <div className="eyebrow-gold">Current collection</div>
            <h2 className="mt-3 text-bone text-2xl">{membershipCount} orderable pieces</h2>
            {showDebug ? <div className="mt-2 text-[11px] text-[var(--bone-dim)]">
              Source: {source==='immutable_membership_snapshot'?'immutable Product DNA membership snapshot':source}
            </div>:null}
          </div>
          <Link href="/shop" className="btn-ghost">Shop all</Link>
        </div>

        {products.length
          ? <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 lg:gap-6">
              {products.map((product,index)=><ProductCard key={String(product.canonical_product_id)} product={product} index={index}/>)}
            </div>
          : <div className="rounded-xl border border-[rgba(216,214,211,.14)] p-6 text-[var(--bone-dim)]">No current release products are present in the immutable membership snapshot.</div>}
      </section>

      {content?.modules?.length ? <section className="container-feya pb-12 lg:pb-16">
        <div className="grid gap-4 lg:grid-cols-2">
          {content.modules.map((module)=><article key={module.heading} className="rounded-xl border border-[rgba(216,214,211,.14)] bg-[rgba(255,255,255,.025)] p-6 lg:p-7">
            <h2 className="text-bone text-xl">{module.heading}</h2>
            <p className="mt-4 text-[15px] leading-7 text-[var(--bone-dim)]">{module.body}</p>
          </article>)}
        </div>
      </section>:null}

      {content?.related_links?.length ? <section className="container-feya pb-12 lg:pb-16">
        <div className="eyebrow-gold mb-4">Explore related collections</div>
        <div className="flex flex-wrap gap-3">
          {content.related_links.map((link)=><Link key={link.href} href={link.href} className="btn-ghost">{link.anchor}</Link>)}
        </div>
      </section>:null}

      {content?.faq?.length ? <section className="container-feya pb-16 lg:pb-24">
        <div className="max-w-4xl">
          <div className="eyebrow-gold mb-5">Questions</div>
          <div className="grid gap-4">
            {content.faq.map((item)=><article key={item.q} className="rounded-xl border border-[rgba(216,214,211,.14)] p-6">
              <h2 className="text-bone text-lg">{item.q}</h2>
              <p className="mt-3 text-[15px] leading-7 text-[var(--bone-dim)]">{item.a}</p>
            </article>)}
          </div>
        </div>
      </section>:null}
    </> : <section className="container-feya pb-16 lg:pb-24">
      <div className="rounded-xl border border-[rgba(216,214,211,.14)] p-6 text-[var(--bone-dim)]">
        This prototype remains intentionally empty as an SEO collection. Products continue to be discoverable through Shop and evidence-backed collection owners.
      </div>
    </section>}
    <Footer/>
  </main>;
}
