import type {Metadata} from 'next';
import Link from 'next/link';
import {Header} from '@/components/Header';
import {Footer} from '@/components/Footer';

export const metadata:Metadata={
  title:'Shipping & Delivery',
  description:'TheFEYA production times, international shipping estimates, customs and delivery policy.',
  alternates:{canonical:'/shipping'},
  robots:{index:false,follow:true},
};

export default function ShippingPage(){
  return <main className="relative min-h-screen">
    <Header/>
    <section className="container-feya pt-36 pb-14 lg:pt-44 lg:pb-20">
      <div className="max-w-4xl">
        <div className="eyebrow-gold mb-5">Worldwide delivery · Made to order</div>
        <h1 className="font-tall text-bone leading-[.95]" style={{fontSize:'clamp(52px,7vw,96px)'}}>Shipping & Delivery</h1>
        <p className="editorial-italic mt-6 max-w-2xl text-lg leading-relaxed text-[var(--bone-dim)]">
          Each order moves through production first, then international delivery. Shipping estimates are planning ranges rather than event-date guarantees.
        </p>
      </div>
    </section>

    <section className="container-feya pb-16 lg:pb-24">
      <div className="grid gap-4 lg:grid-cols-3">
        <article className="rounded-xl border border-[rgba(216,214,211,.14)] bg-[rgba(255,255,255,.025)] p-6">
          <div className="eyebrow-gold">Production</div>
          <div className="mt-3 text-bone text-3xl">3–5 days</div>
          <p className="mt-3 text-[14px] leading-6 text-[var(--bone-dim)]">Typical made-to-order production time before dispatch.</p>
        </article>
        <article className="rounded-xl border border-[rgba(216,214,211,.14)] bg-[rgba(255,255,255,.025)] p-6">
          <div className="eyebrow-gold">Standard international</div>
          <div className="mt-3 text-bone text-3xl">10–14 business days</div>
          <p className="mt-3 text-[14px] leading-6 text-[var(--bone-dim)]">Typical tracked international delivery estimate after dispatch.</p>
        </article>
        <article className="rounded-xl border border-[rgba(216,214,211,.14)] bg-[rgba(255,255,255,.025)] p-6">
          <div className="eyebrow-gold">Express</div>
          <div className="mt-3 text-bone text-3xl">7–10 business days</div>
          <p className="mt-3 text-[14px] leading-6 text-[var(--bone-dim)]">Typical express delivery estimate after dispatch.</p>
        </article>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <article className="rounded-xl border border-[rgba(216,214,211,.14)] bg-[rgba(255,255,255,.025)] p-6 lg:p-7">
          <h2 className="text-bone text-xl">Event dates are not guaranteed</h2>
          <div className="mt-4 space-y-3 text-[15px] leading-7 text-[var(--bone-dim)]">
            <p>Unless TheFEYA expressly accepts a specific delivery deadline in writing for your order, delivery estimates are not a guarantee that the parcel will arrive before an event, shoot, festival or performance.</p>
            <p>A changed event date, cancelled shoot, weather issue or missed performance is not a reason for a voluntary cancellation or refund.</p>
          </div>
        </article>

        <article className="rounded-xl border border-[rgba(216,214,211,.14)] bg-[rgba(255,255,255,.025)] p-6 lg:p-7">
          <h2 className="text-bone text-xl">Customs, duties and clearance</h2>
          <div className="mt-4 space-y-3 text-[15px] leading-7 text-[var(--bone-dim)]">
            <p>Import duties, taxes, customs charges and carrier clearance fees are the buyer’s responsibility where applicable.</p>
            <p>Please respond promptly to customs or carrier requests required to complete delivery. Failure to cooperate with customs does not create a voluntary cancellation right.</p>
          </div>
        </article>

        <article className="rounded-xl border border-[rgba(216,214,211,.14)] bg-[rgba(255,255,255,.025)] p-6 lg:p-7">
          <h2 className="text-bone text-xl">Carrier delays, loss or damage</h2>
          <div className="mt-4 space-y-3 text-[15px] leading-7 text-[var(--bone-dim)]">
            <p>Carrier or customs delays outside TheFEYA’s control do not create an event-date guarantee or a voluntary cancellation right merely because a planned date was missed.</p>
            <p>If a parcel is lost or damaged, contact TheFEYA so the case can be handled under the applicable law and carrier process.</p>
          </div>
        </article>

        <article className="rounded-xl border border-[rgba(216,214,211,.14)] bg-[rgba(255,255,255,.025)] p-6 lg:p-7">
          <h2 className="text-bone text-xl">Order confirmation</h2>
          <div className="mt-4 space-y-3 text-[15px] leading-7 text-[var(--bone-dim)]">
            <p>Your checkout will show the selected product configuration, authoritative quoted price, shipping method and the current policy versions before the order is submitted.</p>
            <p>Placing the order confirms acceptance of those checkout details, subject to any mandatory rights that cannot legally be waived.</p>
          </div>
        </article>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/returns" className="btn-ghost">Returns & exchanges</Link>
        <Link href="/shop" className="btn-ghost">Back to shop</Link>
      </div>
    </section>
    <Footer/>
  </main>;
}
