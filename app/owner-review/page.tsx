export const instant = false;

import type {Metadata} from 'next';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import {ArrowUpRight,CheckCircle2,Clock3,LayoutGrid,Package,ShieldCheck,ShoppingBag} from 'lucide-react';
import {Header} from '@/components/Header';
import {Footer} from '@/components/Footer';
import {PDP_COPY_REVIEW_SAMPLES} from '@/config/pdpCopyReviewSamples';
import {isOwnerUnifiedStorefrontPreview} from '@/lib/ownerUnifiedStorefrontPreview';

export const metadata:Metadata={
  title:'TheFEYA · Owner Final Visual Review',
  description:'Private review of approved product texts, bag variants and collection/contact/shipping proposals.',
  robots:{index:false,follow:false,nocache:true,noarchive:true},
};
const card='group block rounded-[15px] border border-[rgba(216,214,211,.16)] bg-[rgba(255,255,255,.025)] px-5 py-6 transition-colors hover:border-[rgba(212,178,106,.55)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#d4b26a]';

export default function UnifiedOwnerVisualReviewPage(){
  if(!isOwnerUnifiedStorefrontPreview(process.env))notFound();
  return <main className="visual-commerce-shell relative min-h-screen">
    <Header/>
    <section className="container-feya pt-32 pb-10 sm:pt-36 lg:pt-40">
      <p className="eyebrow-gold">TheFEYA · Private owner review</p>
      <h1 className="visual-display mt-5 max-w-4xl text-[clamp(35px,4.6vw,61px)] leading-[1.02] tracking-[-.035em] text-[#f7f3ec]">
        Проверка магазина перед запуском
      </h1>
      <p className="mt-5 max-w-3xl text-[15px] leading-7 text-[var(--bone-dim)]">
        Всё на одном защищённом домене: утверждённые описания, изображения, варианты товара,
        настоящая корзина, доставка, контакты и коллекции. Счёт и оплата здесь не создаются.
      </p>
      <div role="status" className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3 rounded-xl border border-[rgba(212,178,106,.23)] bg-[rgba(212,178,106,.055)] px-5 py-4 text-[12px] leading-6 text-[#dcd4c7]">
        <span className="inline-flex items-center gap-2"><ShieldCheck size={16} className="text-[#d4b26a]" aria-hidden="true"/> Только защищённый предпросмотр</span>
        <span className="inline-flex items-center gap-2"><CheckCircle2 size={16} className="text-[#d4b26a]" aria-hidden="true"/> 207 утверждённых описаний</span>
        <span className="inline-flex items-center gap-2"><Clock3 size={16} className="text-[#d4b26a]" aria-hidden="true"/> Оплата выключена</span>
      </div>
    </section>

    <section className="container-feya py-9 border-t border-[rgba(216,214,211,.12)]">
      <p className="eyebrow-gold">Шаг 1 · От товара до корзины</p>
      <h2 className="mt-2 text-[clamp(23px,2.6vw,32px)] text-[#f7f3ec]">Настоящие варианты товаров</h2>
      <p className="mt-3 max-w-3xl text-[14px] leading-7 text-[var(--bone-dim)]">
        Выбери товар, комплект, цвет и размер, нажми Add to bag.
        Потом открой корзину на этом же домене.
        Чтобы проверить надбавку €5, положи второй отличный от первого товар.
      </p>
      <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {PDP_COPY_REVIEW_SAMPLES.map((p,i)=><Link key={p.canonical_product_id}
          href={'/shop/'+p.slug} className={card}>
          <span className="eyebrow-gold">Изделие {i+1}</span>
          <span className="mt-3 block text-[17px] font-medium text-[#f7f3ec]">{p.kind}</span>
          <span className="mt-3 inline-flex items-center gap-1 text-[12px] text-[#d4b26a]">Выбрать вариант <ArrowUpRight size={14} aria-hidden="true"/></span>
        </Link>)}
        <Link href="/cart" className={card}>
          <ShoppingBag size={22} className="text-[#d4b26a]" aria-hidden="true"/>
          <span className="mt-3 block text-[18px] font-medium text-[#f7f3ec]">Моя корзина</span>
          <span className="mt-2 block text-[12px] leading-5 text-[var(--bone-dim)]">
            Конфигурации, количество, €19/€35, €5 только с двумя разными листингами.
            Контакты и адрес остаются локально в форме.
          </span>
          <span className="mt-3 inline-flex items-center gap-1 text-[12px] text-[#d4b26a]">Проверить корзину <ArrowUpRight size={14} aria-hidden="true"/></span>
        </Link>
      </div>
    </section>

    <section className="container-feya border-t border-[rgba(216,214,211,.12)] py-9">
      <p className="eyebrow-gold">Шаг 2 · Одобренные тексты</p>
      <h2 className="mt-2 text-[clamp(23px,2.6vw,32px)] text-[#f7f3ec]">Сравнение SEO-описаний</h2>
      <p className="mt-3 max-w-3xl text-[14px] leading-7 text-[var(--bone-dim)]">
        Все четыре оригинальных блока сохранены. В списке комплектации показываются реальные
        отдельные детали; варианты покупки справа остаются сгруппированными.
      </p>
      <Link href="/pdp-copy-review" className={card+' mt-6 flex max-w-xl items-center justify-between gap-4'}>
        <span className="flex items-center gap-3">
          <Package size={24} className="shrink-0 text-[#d4b26a]" aria-hidden="true"/>
          <span><strong className="block text-[16px] text-[#f7f3ec]">До и после: пять товаров</strong>
            <span className="mt-1 block text-[12px] text-[var(--bone-dim)]">Без изменения цен и вариантов покупки.</span></span>
        </span>
        <ArrowUpRight size={18} className="shrink-0 text-[#d4b26a]" aria-hidden="true"/>
      </Link>
    </section>

    <section className="container-feya border-t border-[rgba(216,214,211,.12)] py-9 pb-20">
      <p className="eyebrow-gold">Шаг 3 · Визуальные страницы</p>
      <h2 className="mt-2 text-[clamp(23px,2.6vw,32px)] text-[#f7f3ec]">Коллекции, доставка и контакты</h2>
      <div className="mt-6 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {([
          {href:'/collections-review',label:'Большие плитки коллекций',text:'Крупнее изображения, короткие подписи, описание под фото.'},
          {href:'/shipping-review',label:'Доставка',text:'Меньший заголовок, 3–5 дней изготовления, €19/€35 и приоритет Express.'},
          {href:'/contact-review',label:'Контакты и соцсети',text:'Копирование почты, WhatsApp и спокойное оформление Seller Online.'},
          {href:'/checkout-review',label:'Макет корзины',text:'Макет расположения блоков; настоящие товары проверяй выше в /cart.'},
        ] as const).map(item=><Link key={item.href} href={item.href} className={card}>
          <LayoutGrid size={21} className="text-[#d4b26a]" aria-hidden="true"/>
          <span className="mt-3 block text-[17px] font-medium text-[#f7f3ec]">{item.label}</span>
          <span className="mt-2 block text-[12px] leading-6 text-[var(--bone-dim)]">{item.text}</span>
          <span className="mt-4 inline-flex items-center gap-1 text-[12px] text-[#d4b26a]">Посмотреть <ArrowUpRight size={14} aria-hidden="true"/></span>
        </Link>)}
      </div>
      <p className="mt-7 max-w-3xl text-[12px] leading-6 text-[var(--bone-dim)]">
        Изображения, Product Truth, утверждённые SEO-тексты, цены, Search Release v12 и реальные
        способы оплаты не меняются этим предпросмотром. Seller Online подключается отдельно.
      </p>
    </section>
    <Footer/>
  </main>;
}
