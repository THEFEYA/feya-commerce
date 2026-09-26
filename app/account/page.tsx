import type {Metadata} from 'next';
import Link from 'next/link';
import {Header} from '@/components/Header';
import {Footer} from '@/components/Footer';

export const metadata:Metadata={
  title:'Account | TheFEYA',
  description:'TheFEYA account access is not active in the current pre-launch storefront.',
  alternates:{canonical:'/account'},
  robots:{index:false,follow:false},
};

export default function AccountPage(){
  return <main className="relative min-h-screen">
    <Header/>
    <section className="container-feya pt-36 pb-16 lg:pt-44 lg:pb-24">
      <div className="max-w-3xl rounded-xl border border-[rgba(216,214,211,.14)] bg-[rgba(255,255,255,.025)] p-7 lg:p-10">
        <div className="eyebrow-gold">Pre-launch storefront</div>
        <h1 className="mt-4 font-tall text-bone leading-[.95]" style={{fontSize:'clamp(48px,6vw,82px)'}}>Account</h1>
        <p className="mt-6 text-[15px] leading-7 text-[var(--bone-dim)]">
          Customer account sign-in is not active yet. This page exists so the current storefront does not send visitors to a broken route while checkout and account services are still disabled.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link href="/shop" className="btn-chrome">Shop catalog</Link>
          <Link href="/contact" className="btn-ghost">Contact TheFEYA</Link>
        </div>
      </div>
    </section>
    <Footer/>
  </main>;
}
