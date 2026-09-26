import type {Metadata} from 'next';
import Link from 'next/link';
import {Header} from '@/components/Header';
import {Footer} from '@/components/Footer';

export const metadata:Metadata={
  title:'What to Wear to Burning Man: Practical Costume Guide | TheFEYA',
  description:'Plan a Burning Man costume around official desert, dust, visibility and Leave No Trace guidance, then build the visual look with TheFEYA.',
  alternates:{canonical:'/guides/what-to-wear-to-burning-man'},
  robots:{index:false,follow:true},
};

const OFFICIAL={
  preparation:'https://burningman.org/black-rock-city/preparation/',
  survival:'https://survival.burningman.org/survival-health-and-safety/survival/',
  packing:'https://survival.burningman.org/leave-no-trace/what-to-pack-and-what-to-leave-at-home/',
  weather:'https://burningman.org/black-rock-city/preparation/playa-living/weather/',
};

export default function BurningManGuidePage(){
  return <main className="relative min-h-screen">
    <Header/>

    <article>
      <header className="container-feya pt-36 pb-12 lg:pt-44 lg:pb-16">
        <div className="max-w-4xl">
          <div className="eyebrow-gold mb-5">Burning Man · Practical outfit planning</div>
          <h1 className="font-tall text-bone leading-[.95]" style={{fontSize:'clamp(50px,7vw,92px)'}}>What to Wear to Burning Man</h1>
          <p className="editorial-italic mt-6 max-w-3xl text-lg leading-relaxed text-[var(--bone-dim)]">
            Start with the official survival requirements, then build the costume around them. Burning Man takes place in a remote desert environment where dust, temperature changes, visibility and Leave No Trace matter more than any single styling rule.
          </p>
          <p className="mt-5 max-w-3xl text-[13px] leading-6 text-[var(--smoke)]">
            TheFEYA is an independent designer brand and is not affiliated with or endorsed by Burning Man Project. Official event guidance takes priority over styling suggestions on this page.
          </p>
        </div>
      </header>

      <section className="container-feya pb-10">
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-xl border border-[rgba(216,214,211,.14)] bg-[rgba(255,255,255,.025)] p-6 lg:p-8">
            <div className="eyebrow-gold">1 · Safety first</div>
            <h2 className="mt-3 text-bone text-2xl">Build around the official survival checklist</h2>
            <p className="mt-4 text-[15px] leading-7 text-[var(--bone-dim)]">
              Burning Man’s current preparation guidance asks participants to prepare for a remote desert environment. Its personal checklist includes warm clothing, sunscreen, sunglasses, a particle or dust mask, goggles, rain gear and appropriate footwear. Treat those as the foundation of the packing plan—not as accessories a costume can replace.
            </p>
            <a className="btn-ghost mt-5 inline-flex" href={OFFICIAL.survival} target="_blank" rel="noreferrer">Official Survival Guide</a>
          </section>

          <section className="rounded-xl border border-[rgba(216,214,211,.14)] bg-[rgba(255,255,255,.025)] p-6 lg:p-8">
            <div className="eyebrow-gold">2 · Dust & visibility</div>
            <h2 className="mt-3 text-bone text-2xl">Plan for whiteouts separately from the outfit</h2>
            <p className="mt-4 text-[15px] leading-7 text-[var(--bone-dim)]">
              Official weather guidance warns that dust storms and whiteouts can arrive quickly and recommends goggles and a dust mask. Night visibility is also a safety issue. A metallic, mirror or holographic costume is a visual choice; it is not a substitute for required visibility, dust or weather preparation.
            </p>
            <a className="btn-ghost mt-5 inline-flex" href={OFFICIAL.weather} target="_blank" rel="noreferrer">Official weather guidance</a>
          </section>
        </div>
      </section>

      <section className="container-feya pb-10">
        <div className="rounded-xl border border-[rgba(212,178,106,.26)] bg-[rgba(212,178,106,.055)] p-6 lg:p-8">
          <div className="eyebrow-gold">3 · Leave No Trace</div>
          <h2 className="mt-3 text-bone text-2xl">Choose details that are less likely to become MOOP</h2>
          <p className="mt-4 max-w-4xl text-[15px] leading-7 text-[var(--bone-dim)]">
            Burning Man’s official packing guidance treats anything that can fall, break off or blow away as potential MOOP. It specifically warns against loose or easily detached decoration such as glitter, feathers, rhinestones, sequins and similar materials. Check every costume, accessory and fastening before packing, and avoid assuming that a decorative material is automatically suitable for the playa.
          </p>
          <a className="btn-ghost mt-5 inline-flex" href={OFFICIAL.packing} target="_blank" rel="noreferrer">Official packing & Leave No Trace guidance</a>
        </div>
      </section>

      <section className="container-feya pb-10">
        <div className="max-w-4xl">
          <div className="eyebrow-gold">4 · Build the visual direction</div>
          <h2 className="mt-3 text-bone text-3xl">Choose the silhouette after the practical layer is solved</h2>
          <p className="mt-5 text-[15px] leading-7 text-[var(--bone-dim)]">
            Within the current TheFEYA Burning Man collection, futuristic, post-apocalyptic, desert, warrior and glam directions appear repeatedly in the approved Product DNA. Use those visual systems to choose the silhouette: a sculptural shoulder piece, coordinated skirt and top, headpiece, bodysuit or smaller accessories. The individual product page is always the authority for the exact components, materials and configurations available to order.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/collections/burning-man-looks" className="btn-chrome">Shop Burning Man looks</Link>
            <Link href="/collections/shoulder-armor" className="btn-ghost">Shoulder armor</Link>
            <Link href="/collections/costume-headpieces" className="btn-ghost">Headpieces</Link>
            <Link href="/collections/festival-skirts" className="btn-ghost">Festival skirts</Link>
          </div>
        </div>
      </section>

      <section className="container-feya pb-10">
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-xl border border-[rgba(216,214,211,.14)] bg-[rgba(255,255,255,.025)] p-6 lg:p-8">
            <div className="eyebrow-gold">5 · Day and night</div>
            <h2 className="mt-3 text-bone text-2xl">Styling and survival are two different systems</h2>
            <p className="mt-4 text-[15px] leading-7 text-[var(--bone-dim)]">
              A daytime costume can still require sun protection, and a dramatic night look can still require warmth, rain preparation and dedicated visibility. Plan the practical layers first, then make sure the costume can coexist with them rather than forcing safety gear out of the look.
            </p>
          </section>

          <section className="rounded-xl border border-[rgba(216,214,211,.14)] bg-[rgba(255,255,255,.025)] p-6 lg:p-8">
            <div className="eyebrow-gold">6 · Fit & care</div>
            <h2 className="mt-3 text-bone text-2xl">Check fit and construction before the trip</h2>
            <p className="mt-4 text-[15px] leading-7 text-[var(--bone-dim)]">
              Confirm the exact product configuration and fit before travel. For structured, coated or mixed-material pieces, review the product-specific care information and avoid assuming one cleaning or storage method works for every construction.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href="/size-guide" className="btn-ghost">Measurements & sizing</Link>
              <Link href="/care" className="btn-ghost">Care & storage</Link>
            </div>
          </section>
        </div>
      </section>

      <section className="container-feya pb-16 lg:pb-24">
        <div className="rounded-xl border border-[rgba(216,214,211,.14)] p-6 lg:p-8">
          <div className="eyebrow-gold">Official resources</div>
          <h2 className="mt-3 text-bone text-2xl">Check the current Burning Man guidance before you go</h2>
          <p className="mt-4 max-w-4xl text-[15px] leading-7 text-[var(--bone-dim)]">
            Event guidance can change. Before each season, review the official preparation and Survival Guide pages directly instead of relying on an older packing list.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <a className="btn-ghost" href={OFFICIAL.preparation} target="_blank" rel="noreferrer">Preparation resources</a>
            <a className="btn-ghost" href={OFFICIAL.survival} target="_blank" rel="noreferrer">Survival Guide</a>
            <a className="btn-ghost" href={OFFICIAL.packing} target="_blank" rel="noreferrer">What to pack</a>
            <a className="btn-ghost" href={OFFICIAL.weather} target="_blank" rel="noreferrer">Weather & whiteouts</a>
          </div>
        </div>
      </section>
    </article>

    <Footer/>
  </main>;
}
