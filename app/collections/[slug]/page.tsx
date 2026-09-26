import type {Metadata} from 'next';
import {notFound} from 'next/navigation';
import Link from 'next/link';
import {Header} from '@/components/Header';
import {Footer} from '@/components/Footer';
import {ProductCard} from '@/components/ProductCard';
import {getSearchLandingCandidate} from '@/config/searchLandingCandidates';
import {readSearchLandingMembership} from '@/lib/searchLandingMembership';

export const dynamic='force-dynamic';
export const revalidate=0;

type PageProps={params:Promise<{slug:string}>};

export async function generateMetadata({params}:PageProps):Promise<Metadata>{
  const {slug}=await params;
  const candidate=getSearchLandingCandidate(slug);
  if(!candidate)return {title:'Collection not found',robots:{index:false,follow:true}};
  return {
    title:candidate.title,
    description:candidate.description,
    alternates:{canonical:`/collections/${candidate.slug}`},
    robots:{index:false,follow:true},
  };
}

export default async function SearchLandingCandidatePage({params}:PageProps){
  const {slug}=await params;
  const data=await readSearchLandingMembership(slug);
  if(!data)notFound();
  const {candidate,products,membershipCount,source}=data;
  const isHold=candidate.searchStatus==='hold_noindex';

  return <main className="relative min-h-screen">
    <Header/>
    <section className="container-feya pt-36 pb-10 lg:pt-44 lg:pb-14">
      <div className="max-w-4xl">
        <div className="eyebrow-gold mb-5">{candidate.eyebrow}</div>
        <h1 className="font-tall text-bone leading-[.95]" style={{fontSize:'clamp(52px,7vw,96px)'}}>{candidate.title}</h1>
        <p className="editorial-italic mt-6 max-w-2xl text-lg leading-relaxed text-[var(--bone-dim)]">{candidate.description}</p>
      </div>
    </section>

    <section className="container-feya pb-8">
      <div className="rounded-xl border border-[rgba(212,178,106,.24)] bg-[rgba(212,178,106,.055)] p-5 text-[13px] leading-6 text-[var(--bone-dim)]">
        <span className="text-bone">Search release status:</span>{' '}
        {isHold
          ? `hold / noindex. ${candidate.holdReason || 'This prototype has no approved search owner.'}`
          : 'business-case preview / noindex. Product membership is read from the immutable Phase D snapshot; indexing still requires design-family, differentiation, content/CQA and technical release gates.'}
      </div>
    </section>

    {!isHold ? <section className="container-feya pb-16 lg:pb-24">
      <div className="flex items-end justify-between gap-6 mb-7">
        <div>
          <div className="eyebrow-gold">Approved semantic membership · Preview</div>
          <h2 className="mt-3 text-bone text-2xl">{membershipCount} orderable pieces in this evidence snapshot</h2>
          <div className="mt-2 text-[11px] text-[var(--bone-dim)]">
            Source: {source === 'immutable_membership_snapshot' ? 'immutable Product DNA membership snapshot' : source}
          </div>
        </div>
        <Link href="/shop" className="btn-ghost">Shop all</Link>
      </div>

      {products.length
        ? <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 lg:gap-6">
            {products.map((product,index)=><ProductCard key={String(product.canonical_product_id)} product={product} index={index}/>)}
          </div>
        : <div className="rounded-xl border border-[rgba(216,214,211,.14)] p-6 text-[var(--bone-dim)]">No current release products are present in the immutable membership snapshot.</div>}
    </section> : <section className="container-feya pb-16 lg:pb-24">
      <div className="rounded-xl border border-[rgba(216,214,211,.14)] p-6 text-[var(--bone-dim)]">
        This prototype remains intentionally empty as an SEO collection. Products continue to be discoverable through Shop and evidence-backed collection owners.
      </div>
    </section>}
    <Footer/>
  </main>;
}
