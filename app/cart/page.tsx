import type {Metadata} from 'next';
import Link from 'next/link';
import {Header} from '@/components/Header';
import {Footer} from '@/components/Footer';

export const metadata:Metadata={
  title:'Bag | TheFEYA',
  description:'TheFEYA pre-launch bag and checkout status.',
  alternates:{canonical:'/cart'},
  robots:{index:false,follow:false},
};

export default function CartPage(){
  return <main className="visual-commerce-shell relative min-h-screen">
    <Header/>
    <section className="container-feya pt-36 pb-16 lg:pt-44 lg:pb-24">
      <div className="max-w-3xl rounded-xl border border-[rgba(216,214,211,.14)] bg-[rgba(255,255,255,.025)] p-7 lg:p-10">
        <div className="eyebrow-gold">Pre-launch storefront</div>
        <h1 className="visual-display mt-4 text-[clamp(46px,5.5vw,76px)] font-medium leading-[.94] tracking-[-.045em] text-[#f7f3ec]">Bag</h1>
        <p className="mt-6 text-[15px] leading-7 text-[var(--bone-dim)]">
          Online checkout is not active yet. Product pages and collection pages are available for catalog review while the payment flow is being completed.
        </p>
        <p className="mt-3 text-[15px] leading-7 text-[var(--bone-dim)]">
          If you need help with a product, size, configuration or existing order, contact TheFEYA directly.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link href="/shop" className="btn-chrome">Continue browsing</Link>
          <Link href="/contact" className="btn-ghost">Contact TheFEYA</Link>
        </div>
      </div>
    </section>
    <Footer/>
  </main>;
}
