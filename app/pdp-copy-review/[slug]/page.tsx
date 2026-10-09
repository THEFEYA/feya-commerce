export const instant=false;
export const dynamic='force-dynamic';

import type {Metadata} from 'next';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import {Header} from '@/components/Header';
import {ProductDetailClient} from '@/components/ProductDetailClient';
import {PDP_COPY_REVIEW_SAMPLES,isPdpCopyReviewDeployment,pdpCopyReviewSample} from '@/config/pdpCopyReviewSamples';
import {readPinnedPdpOwnerCopy} from '@/lib/pdpPinnedApprovedCopyReviewServer';

type Props={
  params:Promise<{slug:string}>;
  searchParams:Promise<{mode?:string}>;
};

export const metadata:Metadata={
  title:'TheFEYA · Exact approved copy — Owner preview',
  description:'Protected before/after view of an owner-approved product description; not a published product URL.',
  robots:{index:false,follow:false,noarchive:true,nocache:true},
};

export default async function PinnedPdpCopyReviewPage({params,searchParams}:Props){
  if(!isPdpCopyReviewDeployment(process.env))notFound();

  const {slug}=await params;
  const sample=pdpCopyReviewSample(slug);
  if(!sample)notFound();
  const mode=(await searchParams)?.mode==='before'?'before':'after';
  const source=await readPinnedPdpOwnerCopy(slug);

  if(!source)return <main className="relative min-h-screen">
    <Header/>
    <section className="container-feya pt-40 pb-20">
      <p className="eyebrow-gold">Owner review · fail closed</p>
      <h1 className="mt-5 text-3xl text-[#f7f3ec]">Сохранённый источник не прошёл точную проверку</h1>
      <p className="mt-3 max-w-xl text-[15px] leading-7 text-[var(--bone-dim)]">
        Показ подменяющего или нового описания запрещён. Проверь актуальность source-pin, утверждение и хеш.
        Ни один товар на действующем сайте не изменён.
      </p>
      <Link href="/pdp-copy-review" className="btn-ghost mt-7">К списку эталонов</Link>
    </section>
  </main>;

  const index=PDP_COPY_REVIEW_SAMPLES.findIndex(x=>x.slug===slug);
  const targetIndex=(index+1)%PDP_COPY_REVIEW_SAMPLES.length;
  const nextSample=PDP_COPY_REVIEW_SAMPLES[targetIndex];
  const comparisonMode=mode==='after';
  return <main className="relative min-h-screen">
    <Header/>
    <section className="container-feya pt-28 pb-6 sm:pt-32" aria-label="Owner comparison control">
      <div className="rounded-xl border border-[rgba(212,178,106,.28)] bg-[rgba(12,12,17,.98)] px-5 py-4 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="eyebrow-gold">Owner preview · {index+1}/5</p>
            <h1 className="mt-2 text-[18px] font-semibold text-[#f7f3ec]">
              {comparisonMode?'ПОСЛЕ: четыре оригинальных SEO-блока':'ДО: текущий короткий резервный текст'}
            </h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={`/pdp-copy-review/${slug}?mode=before`}
              aria-current={!comparisonMode?'page':undefined}
              className={!comparisonMode?'btn-chrome':'btn-ghost'}>До</Link>
            <Link href={`/pdp-copy-review/${slug}?mode=after`}
              aria-current={comparisonMode?'page':undefined}
              className={comparisonMode?'btn-chrome':'btn-ghost'}>После</Link>
            <Link href="/pdp-copy-review" className="btn-ghost">Все 5</Link>
          </div>
        </div>
        <p className="mt-3 text-[12px] leading-6 text-[var(--bone-dim)]">
          Одобренный источник: {source.draftId}. SHA-256: {source.contentSha256}.
          Ни состав товара, ни цена, ни правая колонка, ни фотографии не изменяются.
        </p>
      </div>
    </section>
    {/* This IS the frozen existing PDP renderer. Only its `draft` prop differs
        between before and after. The checkout itself remains separately OFF. */}
    <ProductDetailClient
      product={source.product}
      related={[]}
      draft={comparisonMode?source.approvedCopy.draft:null}
      previewMode={false}
    />
    <section className="container-feya pb-12" aria-label="Next sample">
      <div className="flex flex-wrap items-center gap-4 border-t border-[rgba(216,214,211,.12)] pt-8">
        <Link className="btn-ghost" href={`https://thefeya.com/shop/${slug}`}>Открыть существующую карточку ↗</Link>
        <Link className="btn-chrome" href={`/pdp-copy-review/${nextSample.slug}?mode=after`}>Следующий эталон →</Link>
      </div>
    </section>
  </main>;
}
