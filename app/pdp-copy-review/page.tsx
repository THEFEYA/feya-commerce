export const instant=false;
export const dynamic='force-dynamic';

import type {Metadata} from 'next';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import {Header} from '@/components/Header';
import {Footer} from '@/components/Footer';
import {PDP_COPY_REVIEW_SAMPLES,isPdpCopyReviewDeployment} from '@/config/pdpCopyReviewSamples';

export const metadata:Metadata={
  title:'TheFEYA · Approved PDP Copy Review — Owner only',
  description:'Unlisted protected comparison of five exactly pinned approved product descriptions.',
  robots:{index:false,follow:false,nocache:true,noarchive:true},
};

export default function ApprovedCopyReviewIndex(){
  if(!isPdpCopyReviewDeployment(process.env))notFound();
  return <main className="visual-commerce-shell relative min-h-screen">
    <Header/>
    <section className="container-feya pt-36 pb-16 lg:pt-44 lg:pb-24">
      <p className="eyebrow-gold">Owner approval · SEO product copy</p>
      <h1 className="mt-5 max-w-4xl text-[clamp(34px,4vw,56px)] font-medium leading-tight tracking-[-.03em] text-[#f7f3ec]">
        Восстановление одобренных описаний — 5 товаров
      </h1>
      <p className="mt-4 max-w-3xl text-[15px] leading-7 text-[var(--bone-dim)]">
        В публичных карточках сейчас отображается короткий резервный текст. Одобренные черновики
        сохранены и закреплены за конкретными товарами. Сравни две версии одной карточки:
        справа и слева одинаковая товарная компоновка; меняется только источник описания.
      </p>
      <div className="mt-7 rounded-xl border border-[rgba(212,178,106,.25)] bg-[rgba(212,178,106,.05)] p-5 text-[13px] leading-6 text-[#e4ded2]">
        Проверяются ID товара, утверждённый ID черновика, дата версии и SHA-256.
        Если они не совпадут, текст не подставляется. На действующем сайте ничего
        не изменено: опубликованные метаданные, Search v12, цены и покупка останутся прежними до одобрения.
      </div>
      <div className="mt-10 grid gap-4">
        {PDP_COPY_REVIEW_SAMPLES.map((sample,i)=><article key={sample.canonical_product_id}
          className="rounded-xl border border-[rgba(216,214,211,.16)] bg-[rgba(255,255,255,.025)] p-5 sm:p-6">
          <p className="eyebrow-gold">Эталон {i+1} / 5 · {sample.kind}</p>
          <h2 className="mt-3 break-words text-[17px] font-medium leading-7 text-[#f7f3ec]">
            {sample.slug.replace(/-\d{10}$/, '').replace(/-/g,' ')}
          </h2>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href={`/pdp-copy-review/${sample.slug}?mode=before`}
              className="btn-ghost">Сейчас: короткий текст</Link>
            <Link href={`/pdp-copy-review/${sample.slug}?mode=after`}
              className="btn-chrome">После: четыре одобренных блока</Link>
            <a href={`https://thefeya.com/shop/${sample.slug}`} target="_blank" rel="noopener noreferrer"
              className="btn-ghost">Действующий товар ↗</a>
          </div>
          <p className="mt-4 text-[11px] leading-5 text-[var(--bone-dim)]">
            Canonical product: {sample.canonical_product_id}. Закреплённый черновик: {sample.pinned_draft_id}.
          </p>
        </article>)}
      </div>
      <p className="mt-8 text-[13px] leading-6 text-[var(--bone-dim)]">
        После просмотра сообщи, совпадает ли формат с ранее утверждённым.
        Без твоего подтверждения массовой публикации 207 товаров не будет.
      </p>
    </section>
    <Footer/>
  </main>;
}
