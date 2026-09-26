import type {Metadata} from 'next';
import Link from 'next/link';
import {Header} from '@/components/Header';
import {Footer} from '@/components/Footer';
import {releaseRobotsForPath} from '@/lib/searchReleaseIndexationServer';

export async function generateMetadata():Promise<Metadata>{
  return{
    title:'About TheFEYA Atelier',
      description:'Learn how TheFEYA approaches handmade stage, festival and performance pieces, from sculptural design to made-to-order production.',
      alternates:{canonical:'/about'},
      
    };
    robots:await releaseRobotsForPath('/about'),
  };
}

export default function AboutPage(){
  return <main className="relative min-h-screen">
    <Header/>
    <section className="container-feya pt-36 pb-14 lg:pt-44 lg:pb-20">
      <div className="max-w-4xl">
        <div className="eyebrow-gold mb-5">Independent designer studio · Made to order</div>
        <h1 className="font-tall text-bone leading-[.95]" style={{fontSize:'clamp(52px,7vw,96px)'}}>About TheFEYA</h1>
        <p className="editorial-italic mt-6 max-w-3xl text-lg leading-relaxed text-[var(--bone-dim)]">
          TheFEYA creates handmade statement pieces for stage, festival, rave, performance and editorial styling. The catalog is built around sculptural silhouettes, metallic and mirror effects, and coordinated costume components rather than everyday basics.
        </p>
      </div>
    </section>

    <section className="container-feya pb-16 lg:pb-24">
      <div className="grid gap-4 lg:grid-cols-3">
        <article className="rounded-xl border border-[rgba(216,214,211,.14)] bg-[rgba(255,255,255,.025)] p-6 lg:p-7">
          <div className="eyebrow-gold">Design language</div>
          <h2 className="mt-3 text-bone text-xl">Built for visual impact</h2>
          <p className="mt-4 text-[15px] leading-7 text-[var(--bone-dim)]">
            TheFEYA designs often combine sharp silhouettes, mirror-like surfaces, vegan leather, acrylic mirror details and coordinated accessories. Each product page defines the actual materials and components for that design.
          </p>
        </article>
        <article className="rounded-xl border border-[rgba(216,214,211,.14)] bg-[rgba(255,255,255,.025)] p-6 lg:p-7">
          <div className="eyebrow-gold">Production</div>
          <h2 className="mt-3 text-bone text-xl">Made to order</h2>
          <p className="mt-4 text-[15px] leading-7 text-[var(--bone-dim)]">
            Standard production is typically 3–5 days before dispatch. Because products enter production promptly, the current store policy does not offer discretionary order cancellation after placement.
          </p>
        </article>
        <article className="rounded-xl border border-[rgba(216,214,211,.14)] bg-[rgba(255,255,255,.025)] p-6 lg:p-7">
          <div className="eyebrow-gold">Product truth</div>
          <h2 className="mt-3 text-bone text-xl">What you select is what matters</h2>
          <p className="mt-4 text-[15px] leading-7 text-[var(--bone-dim)]">
            Photos may show a complete styled look, but the selectable product configuration is the purchase authority. Product pages identify the current pieces, variants and quoted price available to order.
          </p>
        </article>
      </div>

      <div className="mt-6 rounded-xl border border-[rgba(212,178,106,.28)] bg-[rgba(212,178,106,.06)] p-6 lg:p-7">
        <h2 className="text-bone text-xl">Plan the order before production starts</h2>
        <p className="mt-3 text-[15px] leading-7 text-[var(--bone-dim)]">
          If you need sizing help or want to ask whether a specific adjustment is possible for an existing TheFEYA design, contact the studio before placing the order. Availability of non-standard changes depends on the product and must be confirmed rather than assumed.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href="/size-guide" className="btn-ghost">Measurements & sizing</Link>
          <Link href="/contact" className="btn-ghost">Contact TheFEYA</Link>
          <Link href="/collections" className="btn-ghost">Explore collections</Link>
        </div>
      </div>
    </section>
    <Footer/>
  </main>;
}
