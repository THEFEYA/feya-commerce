import type {Metadata} from 'next';
import Link from 'next/link';
import {Header} from '@/components/Header';
import {Footer} from '@/components/Footer';

export const metadata:Metadata={
  title:'Measurements & Size Guide | TheFEYA',
  description:'How to choose a TheFEYA size and prepare chest, waist, hip and height measurements for made-to-order costume pieces.',
  alternates:{canonical:'/size-guide'},
  robots:{index:false,follow:true},
};

const measures=[
  ['Chest / bust','Measure around the fullest part of the chest, keeping the tape level and comfortably close to the body.'],
  ['Waist','Measure around the natural waist without pulling the tape tight.'],
  ['Hips','Measure around the fullest part of the hips and seat with the tape level.'],
  ['Height','Measure your full standing height without shoes.'],
];

export default function SizeGuidePage(){
  return <main className="relative min-h-screen">
    <Header/>
    <section className="container-feya pt-36 pb-14 lg:pt-44 lg:pb-20">
      <div className="max-w-4xl">
        <div className="eyebrow-gold mb-5">Fit · Measurements · Made to order</div>
        <h1 className="font-tall text-bone leading-[.95]" style={{fontSize:'clamp(52px,7vw,96px)'}}>Measurements & Size Guide</h1>
        <p className="editorial-italic mt-6 max-w-3xl text-lg leading-relaxed text-[var(--bone-dim)]">
          Start with the size options on the product page. When measurements are requested, send accurate body measurements rather than changing them to create extra ease yourself.
        </p>
      </div>
    </section>

    <section className="container-feya pb-16 lg:pb-24">
      <div className="grid gap-4 md:grid-cols-2">
        {measures.map(([title,body])=><article key={title} className="rounded-xl border border-[rgba(216,214,211,.14)] bg-[rgba(255,255,255,.025)] p-6 lg:p-7">
          <h2 className="text-bone text-xl">{title}</h2>
          <p className="mt-4 text-[15px] leading-7 text-[var(--bone-dim)]">{body}</p>
        </article>)}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <article className="rounded-xl border border-[rgba(216,214,211,.14)] bg-[rgba(255,255,255,.025)] p-6 lg:p-7">
          <h2 className="text-bone text-xl">Adjustability varies by design</h2>
          <p className="mt-4 text-[15px] leading-7 text-[var(--bone-dim)]">
            Many TheFEYA pieces use straps or adjustable elements, but adjustability is not a universal collection-level promise. Use the individual product description and configuration as the source for the specific design.
          </p>
        </article>
        <article className="rounded-xl border border-[rgba(216,214,211,.14)] bg-[rgba(255,255,255,.025)] p-6 lg:p-7">
          <h2 className="text-bone text-xl">Non-standard fit requests</h2>
          <p className="mt-4 text-[15px] leading-7 text-[var(--bone-dim)]">
            If you need a non-standard size or another fit adjustment, contact TheFEYA before ordering so the studio can confirm whether the change is possible for that design. Personalized or made-to-measure work may follow different return rules.
          </p>
        </article>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/contact" className="btn-ghost">Ask about sizing</Link>
        <Link href="/returns" className="btn-ghost">Returns & exchanges</Link>
        <Link href="/shop" className="btn-ghost">Shop products</Link>
      </div>
    </section>
    <Footer/>
  </main>;
}
