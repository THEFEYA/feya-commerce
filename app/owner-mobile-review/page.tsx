export const instant = false;
import type {Metadata} from 'next';
import {notFound} from 'next/navigation';
import {Header} from '@/components/Header';
import {Footer} from '@/components/Footer';
import {OwnerMobileReviewClient} from '@/components/OwnerMobileReviewClient';
import {isOwnerUnifiedStorefrontPreview} from '@/lib/ownerUnifiedStorefrontPreview';

export const metadata:Metadata={
  title:'Mobile Storefront Review · TheFEYA',
  robots:{index:false,follow:false,nocache:true,noarchive:true},
};
export default function OwnerMobileReviewPage(){
  if(!isOwnerUnifiedStorefrontPreview(process.env))notFound();
  return <main className="visual-commerce-shell relative min-h-screen">
    <Header/>
    <section className="container-feya pt-20 pb-12 sm:pt-24 lg:pt-24">
      <p className="eyebrow-gold">TheFEYA · Owner review</p>
      <h1 className="mt-4 text-[clamp(26px,3vw,42px)] font-medium text-[#f7f3ec]">
        Мобильная версия магазина
      </h1>
      <p className="mt-4 max-w-3xl text-[14px] leading-7 text-[var(--bone-dim)]">
        Переключай страницы и ширину экрана, чтобы проверить меню, карточки, тексты и корзину.
        Предпросмотр защищён, заказы и платежи отключены.
      </p>
      <OwnerMobileReviewClient/>
    </section>
    <Footer/>
  </main>;
}
