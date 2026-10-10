export const instant = false;

import type {Metadata} from 'next';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import {ArrowRight,Clock3,Package,ShieldCheck,Truck} from 'lucide-react';
import {Header} from '@/components/Header';
import {Footer} from '@/components/Footer';

/** Vercel-preview-only proposed SHIPPING COPY for owner review.
 * The existing ACTIVE Search v12 /shipping source stays byte-for-byte frozen
 * until a separately governed versioned content migration is approved.
 */
export const metadata:Metadata={
  title:'TheFEYA · Shipping Policy Review',
  description:'Unlisted proposed shipping presentation; no public rate activation.',
  robots:{index:false,follow:false,nocache:true,noarchive:true},
};

export default function ShippingReviewPage(){
  if(process.env.VERCEL_ENV!=='preview'&&process.env.NODE_ENV==='production')notFound();
  return <main className="visual-commerce-shell relative min-h-screen">
    <Header/>
    <section className="container-feya pt-32 pb-10 sm:pt-36 lg:pt-44 lg:pb-14">
      <p className="eyebrow-gold mb-4">TheFEYA · Shipping review</p>
      <h1 className="visual-display max-w-4xl text-[clamp(38px,4.8vw,66px)] font-medium leading-[.97] tracking-[-.045em] text-[#f7f3ec]">Shipping & Delivery</h1>
      <p className="mt-6 max-w-2xl text-[16px] leading-7 text-[var(--bone-dim)]">
        Made to order, prepared in our workshop, then shipped internationally. Choose how urgently you need your order prepared; we will select the suitable courier.
      </p>
    </section>

    <section className="container-feya pb-16 lg:pb-24" aria-label="Shipping information">
      <div className="grid gap-4 lg:grid-cols-3">
        <article className="rounded-xl border border-[rgba(216,214,211,.14)] bg-[rgba(255,255,255,.025)] p-6">
          <Package size={22} strokeWidth={1.6} className="text-[#d4b26a]" aria-hidden="true"/>
          <p className="eyebrow-gold mt-5">Made for you</p>
          <h2 className="mt-3 text-[27px] font-medium text-[#f7f3ec]">Production first</h2>
          <p className="mt-3 text-[14px] leading-6 text-[var(--bone-dim)]">
            Typical production is 3–5 business days, depending on the design, materials and order complexity. Preparation time is separate from international transit.
          </p>
        </article>
        <article className="rounded-xl border border-[rgba(216,214,211,.14)] bg-[rgba(255,255,255,.025)] p-6">
          <Truck size={22} strokeWidth={1.6} className="text-[#d4b26a]" aria-hidden="true"/>
          <p className="eyebrow-gold mt-5">Standard</p>
          <h2 className="mt-3 text-[35px] font-medium text-[#f7f3ec]">€19</h2>
          <p className="mt-2 text-[14px] text-[#f7f3ec]">Indicative service planning: 10–14 business days</p>
          <p className="mt-3 text-[14px] leading-6 text-[var(--bone-dim)]">
            Regular order preparation. This is our general planning range, not a guaranteed carrier transit speed. Making time depends on the items in the order.
          </p>
        </article>
        <article className="rounded-xl border border-[rgba(212,178,106,.30)] bg-[rgba(212,178,106,.045)] p-6">
          <Clock3 size={22} strokeWidth={1.6} className="text-[#d4b26a]" aria-hidden="true"/>
          <p className="eyebrow-gold mt-5">Express · Priority</p>
          <h2 className="mt-3 text-[35px] font-medium text-[#f7f3ec]">€35</h2>
          <p className="mt-2 text-[14px] text-[#f7f3ec]">Indicative priority planning: 6–9 business days</p>
          <p className="mt-3 text-[14px] leading-6 text-[var(--bone-dim)]">
            A priority option for time-sensitive orders: we give your order extra attention in the preparation and dispatch queue. The stated timing is an estimate, not a guaranteed arrival date.
          </p>
        </article>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <article className="rounded-xl border border-[rgba(216,214,211,.14)] bg-[rgba(255,255,255,.025)] p-6 lg:p-8">
          <h2 className="text-[22px] font-medium text-[#f7f3ec]">One delivery choice per order</h2>
          <p className="mt-3 text-[15px] leading-7 text-[var(--bone-dim)]">
            Choose one Standard or Express service for the whole order. Orders containing two or more different designs may require additional packing space; this adds €5 for each additional distinct product listing. Different sizes, options or quantities within one listing do not create an extra charge.
          </p>
          <p className="mt-4 text-[14px] leading-6 text-[var(--bone-dim)]">
            Some destinations, including Australia, Mexico and New Zealand, can require an additional €20 per eligible parcel. Any applicable amount must be displayed before payment.
          </p>
        </article>

        <article className="rounded-xl border border-[rgba(216,214,211,.14)] bg-[rgba(255,255,255,.025)] p-6 lg:p-8">
          <h2 className="text-[22px] font-medium text-[#f7f3ec]">We choose the courier</h2>
          <p className="mt-3 text-[15px] leading-7 text-[var(--bone-dim)]">
            TheFEYA selects the carrier when preparing your parcel. We normally prefer Nova Post and can use another appropriate carrier if needed. You do not need to enter package size or weight.
          </p>
          <p className="mt-4 text-[14px] leading-6 text-[var(--bone-dim)]">
            Shipping is offered only to destinations we can actually serve from Ukraine. Availability is checked for the destination before an order can be paid.
          </p>
        </article>

        <article className="rounded-xl border border-[rgba(216,214,211,.14)] bg-[rgba(255,255,255,.025)] p-6 lg:p-8">
          <h2 className="text-[22px] font-medium text-[#f7f3ec]">Estimated arrival, not a deadline</h2>
          <p className="mt-3 text-[15px] leading-7 text-[var(--bone-dim)]">
            Production time and international transit are separate. Customs, holidays and destination-specific conditions may change the estimate. Please contact us before ordering for a fixed event date.
          </p>
          <p className="mt-4 text-[14px] leading-6 text-[var(--bone-dim)]">
            Delivery estimates do not remove statutory rights for missing, delayed, defective or non-conforming orders.
          </p>
        </article>

        <article className="rounded-xl border border-[rgba(216,214,211,.14)] bg-[rgba(255,255,255,.025)] p-6 lg:p-8">
          <h2 className="text-[22px] font-medium text-[#f7f3ec]">Payment and import duties</h2>
          <p className="mt-3 text-[15px] leading-7 text-[var(--bone-dim)]">
            Available payment methods and the final order total will be shown during checkout when online payments are activated. Customs duties or import-related charges, where applicable, are explained before ordering.
          </p>
          <p className="mt-4 text-[14px] leading-6 text-[var(--bone-dim)]">
            Online checkout is not active at this stage. Contact our team if you need help with an existing order.
          </p>
        </article>
      </div>

      <div className="mt-6 rounded-xl border border-[rgba(212,178,106,.25)] bg-[rgba(212,178,106,.045)] p-6 sm:p-7">
        <div className="flex items-start gap-3">
          <ShieldCheck size={21} strokeWidth={1.6} className="mt-1 shrink-0 text-[#d4b26a]" aria-hidden="true"/>
          <div>
            <h2 className="text-[18px] font-medium text-[#f7f3ec]">Clear information before ordering</h2>
            <p className="mt-2 max-w-3xl text-[14px] leading-7 text-[var(--bone-dim)]">
              A final checkout will state the available destination, chosen service, product configuration, charges and relevant store policies before you submit payment. We do not promise an exact event arrival date unless we have agreed to it for that order.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/checkout-review" className="btn-chrome inline-flex items-center gap-2">
          Preview the bag <ArrowRight size={16} aria-hidden="true"/>
        </Link>
        <Link href="/returns" className="btn-ghost">Returns & Exchanges</Link>
        <Link href="/contact" className="btn-ghost">Contact TheFEYA</Link>
      </div>
    </section>
    <Footer/>
  </main>;
}
