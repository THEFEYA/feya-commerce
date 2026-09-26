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
  return <main className="relative min-h-screen">
    <Header/>
    <section className="container-feya pt-36 pb-16 lg:pt-44 lg:pb-24">
      <div className="max-w-3xl rounded-xl border border-[rgba(216,214,211,.14)] bg-[rgba(255,255,255,.025)] p-7 lg:p-10">
        <div className="eyebrow-gold">Pre-launch storefront</div>
        <h1 className="mt-4 font-tall text-bone leading-[.95]" style={{fontSize:'clamp(48px,6vw,82px)'}}>Bag</h1>
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
