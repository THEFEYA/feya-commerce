import type {Metadata} from 'next';
import Link from 'next/link';
import {Header} from '@/components/Header';
import {Footer} from '@/components/Footer';

export const metadata:Metadata={
  title:'Costume Care & Storage | TheFEYA',
  description:'Basic care and storage guidance for TheFEYA mirror-coated vegan leather, structured costume pieces and mixed-material designs.',
  alternates:{canonical:'/care'},
  robots:{index:false,follow:true},
};

export default function CarePage(){
  return <main className="relative min-h-screen">
    <Header/>
    <section className="container-feya pt-36 pb-14 lg:pt-44 lg:pb-20">
      <div className="max-w-4xl">
        <div className="eyebrow-gold mb-5">Care · Storage · Materials</div>
        <h1 className="font-tall text-bone leading-[.95]" style={{fontSize:'clamp(52px,7vw,96px)'}}>Care & Storage</h1>
        <p className="editorial-italic mt-6 max-w-3xl text-lg leading-relaxed text-[var(--bone-dim)]">
          TheFEYA products can combine structured parts, coated vegan leather, fabric, acrylic mirror elements and other decorative details. The product page remains the source for the actual materials used in a specific design.
        </p>
      </div>
    </section>

    <section className="container-feya pb-16 lg:pb-24">
      <div className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-xl border border-[rgba(216,214,211,.14)] bg-[rgba(255,255,255,.025)] p-6 lg:p-7">
          <h2 className="text-bone text-xl">Mirror-coated vegan leather</h2>
          <div className="mt-4 space-y-3 text-[15px] leading-7 text-[var(--bone-dim)]">
            <p>Clean surface marks carefully by hand. A mild cleaning product or an alcohol wipe may be used for the coated vegan-leather surfaces where the product care information allows it.</p>
            <p>Machine washing is not recommended for structured coated pieces.</p>
          </div>
        </article>
        <article className="rounded-xl border border-[rgba(216,214,211,.14)] bg-[rgba(255,255,255,.025)] p-6 lg:p-7">
          <h2 className="text-bone text-xl">Keep the shape</h2>
          <div className="mt-4 space-y-3 text-[15px] leading-7 text-[var(--bone-dim)]">
            <p>Store structured pieces carefully and avoid tight folding, crushing or long-term heavy pressure. Hanging can be useful for suitable designs when it does not place stress on delicate parts.</p>
            <p>Keep separate rigid and decorative elements from being bent or pressed by heavier items during storage and travel.</p>
          </div>
        </article>
        <article className="rounded-xl border border-[rgba(216,214,211,.14)] bg-[rgba(255,255,255,.025)] p-6 lg:p-7">
          <h2 className="text-bone text-xl">Mixed-material pieces</h2>
          <p className="mt-4 text-[15px] leading-7 text-[var(--bone-dim)]">
            A single look may combine fabric with vegan-leather, acrylic, mirror or holographic details. Do not assume one cleaning method is suitable for every part. Follow the material-specific information on the product page or contact TheFEYA before cleaning an unfamiliar construction.
          </p>
        </article>
        <article className="rounded-xl border border-[rgba(216,214,211,.14)] bg-[rgba(255,255,255,.025)] p-6 lg:p-7">
          <h2 className="text-bone text-xl">Before an event or shoot</h2>
          <p className="mt-4 text-[15px] leading-7 text-[var(--bone-dim)]">
            Check straps, closures and decorative parts before wearing the piece. If something appears damaged or materially different from the order when delivered, document it and contact TheFEYA promptly rather than altering the item first.
          </p>
        </article>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/contact" className="btn-ghost">Ask about care</Link>
        <Link href="/size-guide" className="btn-ghost">Measurements & sizing</Link>
        <Link href="/returns" className="btn-ghost">Returns & exchanges</Link>
      </div>
    </section>
    <Footer/>
  </main>;
}
