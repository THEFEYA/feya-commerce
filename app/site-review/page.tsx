export const instant = false;

import type {Metadata} from 'next';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import {ArrowUpRight,ClipboardCheck,LayoutGrid,PackageSearch,ShieldCheck} from 'lucide-react';
import {Header} from '@/components/Header';
import {Footer} from '@/components/Footer';

/** Preview deployment review directory, never a live duplicate catalog or
 * public marketing route. Exact existing ACTIVE v12 routes stay unchanged. */
export const metadata:Metadata={
  title:'TheFEYA · Owner Site Review',
  description:'Unlisted owner-only checklist of existing pages and checkout/contact proposals.',
  robots:{index:false,follow:false,nocache:true,noarchive:true},
};

const commercial=[
  ['Shoulder Armor','/collections/shoulder-armor','Плечевые элементы'],
  ['Festival Outfits','/collections/festival-outfits','Общие фестивальные комплекты'],
  ['Rave Outfits','/collections/rave-outfits','Rave / EDM'],
  ['Burning Man Outfits','/collections/burning-man-outfits','Пустынные фестивальные образы'],
  ['Performance Costumes','/collections/performance-costumes','Сцена / выступления'],
  ['Bodysuits','/collections/bodysuits','Боди'],
  ['Costume Masks','/collections/costume-masks','Маски'],
  ['Costume Headpieces','/collections/costume-headpieces','Головные уборы'],
  ['Festival Skirts','/collections/festival-skirts','Юбки'],
  ['Costume Belts','/collections/costume-belts','Пояса'],
] as const;
const current=[
  ['Главная','/'],['Все коллекции','/collections'],['Каталог с фильтрами','/shop'],
  ['О студии','/about'],['Размеры','/size-guide'],['Уход за изделиями','/care'],
  ['Условия доставки','/shipping'],['Возвраты','/returns'],['Контакты','/contact'],
  ['Политика приватности','/privacy'],['Условия сайта','/terms'],
] as const;
const proposals=[
  ['Корзина — визуальная концепция','/checkout-review','Вид товара, выбор Standard/Express, €5 за дополнительный листинг и структура итогов. Только предпросмотр.'],
  ['Доставка — новая редакция','/shipping-review','Условия €19/€35, приоритет изготовления, Nova Post по выбору магазина, сроки и доплаты. Не опубликовано на основном сайте.'],
  ['Контакты — новый дизайн','/contact-review','Адаптивные контакты, ссылки помощи и корректное представление Seller Online. Не опубликовано на основном сайте.'],
] as const;

function Links({data}:{data:readonly (readonly [string,string,string?])[]}){
  return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
    {data.map(([name,href,description])=><Link key={href} href={href}
      className="group flex min-w-0 items-start justify-between gap-4 rounded-[12px] border border-[rgba(216,214,211,.16)] bg-[rgba(255,255,255,.025)] p-5 transition-colors hover:border-[rgba(212,178,106,.55)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d4b26a]">
      <span className="min-w-0">
        <span className="block text-[16px] font-medium text-[#f7f3ec] group-hover:text-[#e8ca87]">{name}</span>
        {description&&<span className="mt-2 block text-[12px] leading-5 text-[var(--bone-dim)]">{description}</span>}
      </span>
      <ArrowUpRight size={18} className="mt-1 shrink-0 text-[#d4b26a]" aria-hidden="true"/>
    </Link>)}
  </div>;
}

export default function OwnerSiteReviewPage(){
  if(process.env.VERCEL_ENV!=='preview'&&process.env.NODE_ENV==='production')notFound();
  return <main className="visual-commerce-shell relative min-h-screen">
    <Header/>
    <section className="container-feya pt-32 pb-9 sm:pt-36 lg:pt-44 lg:pb-14">
      <p className="eyebrow-gold">TheFEYA · Owner visual review</p>
      <h1 className="visual-display mt-4 text-[clamp(46px,6vw,84px)] font-medium leading-[.97] tracking-[-.045em] text-[#f7f3ec]">
        Проверка магазина
      </h1>
      <p className="mt-5 max-w-3xl text-[15px] leading-7 text-[var(--bone-dim)]">
        Открой страницы по очереди на компьютере и телефоне. Первые два раздела ведут на существующий сайт и его реальные коллекции; проекты корзины, доставки и контактов ниже — отдельные, неопубликованные концепции для согласования.
      </p>
    </section>

    <section className="container-feya pb-16 lg:pb-24">
      <div className="rounded-xl border border-[rgba(212,178,106,.25)] bg-[rgba(212,178,106,.045)] p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <ShieldCheck size={20} className="mt-1 shrink-0 text-[#d4b26a]" aria-hidden="true"/>
          <p className="text-[13px] leading-6 text-[#e3dcca]">
            SEO Search Release v12 и утверждённые товарные данные не изменены. Этот обзор не добавляет товары в корзину, не оформляет заказы, не публикует тарифы и не включает Seller Online.
          </p>
        </div>
      </div>

      <div className="mt-12">
        <div className="mb-5 flex items-center gap-3">
          <LayoutGrid size={22} className="text-[#d4b26a]" aria-hidden="true"/>
          <div><h2 className="text-[25px] font-medium text-[#f7f3ec]">10 коммерческих посадочных страниц</h2>
            <p className="mt-1 text-[13px] leading-6 text-[var(--bone-dim)]">Кликни в каждую коллекцию и посмотри реальные товары, которые в неё входят. Это действующие страницы Wave A.</p></div>
        </div>
        <Links data={commercial}/>
      </div>

      <div className="mt-14">
        <div className="mb-5 flex items-center gap-3">
          <PackageSearch size={22} className="text-[#d4b26a]" aria-hidden="true"/>
          <div><h2 className="text-[25px] font-medium text-[#f7f3ec]">Остальные страницы магазина</h2>
            <p className="mt-1 text-[13px] leading-6 text-[var(--bone-dim)]">Каталог, текущие юридические разделы, размеры и поддержка. Текущая /cart остаётся закрыта до реальной оплаты.</p></div>
        </div>
        <Links data={current}/>
      </div>

      <div className="mt-14">
        <div className="mb-5 flex items-center gap-3">
          <ClipboardCheck size={22} className="text-[#d4b26a]" aria-hidden="true"/>
          <div><h2 className="text-[25px] font-medium text-[#f7f3ec]">Предлагаемые изменения — на просмотр</h2>
            <p className="mt-1 text-[13px] leading-6 text-[var(--bone-dim)]">Это новые концепции на Preview-домене. В Production они не открываются.</p></div>
        </div>
        <Links data={proposals}/>
      </div>

      <div className="mt-12 border-t border-[rgba(216,214,211,.13)] pt-7">
        <p className="text-[13px] leading-6 text-[var(--bone-dim)]">
          После просмотра достаточно прислать названия страниц и конкретные пожелания. Исправления соберём отдельно, не изменяя все разделы одновременно.
        </p>
      </div>
    </section>
    <Footer/>
  </main>;
}
