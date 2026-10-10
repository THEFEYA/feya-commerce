'use client';

import {useMemo,useState} from 'react';
import Link from 'next/link';
import {ArrowRight,Check,ChevronRight,Clock3,LockKeyhole,Package,ShieldCheck,Truck} from 'lucide-react';
import {BUYER_SERVICES_REVIEW,reviewServiceBreakdown,type BuyerService}
  from '@/lib/commerceBuyerServiceReview';

export type CheckoutVisualReviewProduct={
  canonical_product_id:string;
  product_slug:string;
  card_title:string;
  primary_image_url:string;
  display_price_eur:number;
};
type Props={products:CheckoutVisualReviewProduct[];catalogAvailable:boolean};
const money=(minor:number)=>new Intl.NumberFormat('en-IE',{
  style:'currency',currency:'EUR',maximumFractionDigits:2,
}).format(minor/100);
const countries=[
  {code:'US',name:'United States'},
  {code:'DE',name:'Germany'},
  {code:'GB',name:'United Kingdom'},
  {code:'ES',name:'Spain'},
  {code:'CA',name:'Canada'},
  {code:'AU',name:'Australia'},
  {code:'NZ',name:'New Zealand'},
  {code:'MX',name:'Mexico'},
] as const;

/** Owner-only DESIGN REVIEW, not a live order/cart state or merchant quote.
 * Products are real approved storefront *card* samples. Their product options,
 * final unit prices and money authority need the separate active server quote.
 */
export function BuyerCheckoutReviewClient({products,catalogAvailable}:Props){
  const [count,setCount]=useState(2);
  const [method,setMethod]=useState<BuyerService>('standard');
  const [country,setCountry]=useState('US');
  const chosen=useMemo(()=>products.slice(0,count),[products,count]);
  const breakdown=chosen.length
    ?reviewServiceBreakdown({method,country,
      canonical_product_ids:chosen.map(p=>p.canonical_product_id)})
    :null;
  const displaySubtotalMinor=chosen.reduce((n,p)=>n+Math.round(p.display_price_eur*100),0);
  const indicativeMinor=breakdown?displaySubtotalMinor+breakdown.estimate_fees_minor:0;

  return <div className="container-feya pb-20 lg:pb-28">
    <div className="grid gap-7 xl:grid-cols-[minmax(0,1.26fr)_minmax(340px,.74fr)] xl:gap-10">
      <div className="min-w-0 space-y-6">
        <section className="rounded-[16px] border border-[rgba(216,214,211,.15)] bg-[rgba(255,255,255,.025)] p-5 sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-[25px] font-medium tracking-tight text-[#f7f3ec]">Your pieces</h2>
            <Link href="/shop" className="inline-flex items-center gap-1.5 text-[13px] text-[#d4b26a] underline decoration-[rgba(212,178,106,.4)] underline-offset-4 hover:text-white">
              Continue shopping <ArrowRight size={15} aria-hidden="true"/>
            </Link>
          </div>
          <p className="mt-2 text-[13px] leading-6 text-[var(--bone-dim)]">
            For this visual review, the sample pieces below come from the approved TheFEYA catalog. No items are added to a real bag.
          </p>
          <div className="mt-6 flex items-center gap-2" role="group" aria-label="Sample number of different listings">
            {[1,2,3].map(n=><button key={n} type="button"
              aria-pressed={count===n} disabled={!products.length||n>products.length}
              onClick={()=>setCount(n)}
              className={`min-h-11 rounded-full border px-4 text-[13px] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d4b26a] ${count===n?'border-[#d4b26a] bg-[rgba(212,178,106,.12)] text-[#f7f3ec]':'border-[rgba(216,214,211,.16)] text-[var(--bone-dim)] hover:border-[#d4b26a]'}`}>
              {n} {n===1?'listing':'listings'}
            </button>)}
          </div>
          <div className="mt-7 divide-y divide-[rgba(216,214,211,.12)]">
            {chosen.map(p=><div key={p.canonical_product_id} className="flex gap-4 py-5 first:pt-0 sm:gap-6">
              <div className="h-[112px] w-[88px] shrink-0 overflow-hidden rounded-[9px] bg-[rgba(255,255,255,.07)] sm:h-[136px] sm:w-[110px]">
                {/* Real media from the already approved card catalog; no new files or visual assets. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.primary_image_url} alt="" loading="lazy" className="h-full w-full object-cover"/>
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] uppercase tracking-[.15em] text-[#d4b26a]">Handmade · TheFEYA</div>
                <Link href={`/shop/${encodeURIComponent(p.product_slug)}`}
                  className="mt-2 block text-[16px] leading-6 text-[#f7f3ec] hover:text-[#e8ca87] sm:text-[18px]">
                  {p.card_title}
                </Link>
                <p className="mt-2 text-[12px] text-[var(--bone-dim)]">Example: one listing · actual option/size selected on product page</p>
                <p className="mt-3 text-[15px] text-[#f7f3ec]">
                  Catalog card price: {money(Math.round(p.display_price_eur*100))}
                </p>
              </div>
            </div>)}
            {!catalogAvailable&&<div className="py-7 text-[14px] text-[var(--bone-dim)]" role="status">
              Catalog examples are currently unavailable. Shipping option design can still be reviewed, but no illustrative merchandise total is shown.
            </div>}
          </div>
        </section>

        <section className="rounded-[16px] border border-[rgba(216,214,211,.15)] bg-[rgba(255,255,255,.025)] p-5 sm:p-7" aria-labelledby="choose-service">
          <div className="flex items-center gap-3">
            <Truck size={20} strokeWidth={1.5} color="#d4b26a" aria-hidden="true"/>
            <h2 id="choose-service" className="text-[25px] font-medium tracking-tight text-[#f7f3ec]">Delivery preference</h2>
          </div>
          <p className="mt-3 text-[14px] leading-6 text-[var(--bone-dim)]">
            Choose the delivery preference that suits your plans. Express orders receive priority in our preparation and dispatch queue.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {BUYER_SERVICES_REVIEW.map(option=><label key={option.method}
              className={`relative flex min-w-0 cursor-pointer flex-col rounded-xl border p-4 transition-colors ${method===option.method?'border-[#d4b26a] bg-[rgba(212,178,106,.08)]':'border-[rgba(216,214,211,.18)] hover:border-[rgba(212,178,106,.4)]'}`}>
              <span className="flex items-center gap-2">
                <input type="radio" name="sample-shipping" checked={method===option.method}
                  onChange={()=>setMethod(option.method)} className="h-[17px] w-[17px] accent-[#d4b26a]"/>
                {option.method==='express'
                  ?<Clock3 size={18} strokeWidth={1.7} className="shrink-0 text-[#d4b26a]" aria-hidden="true"/>
                  :<Truck size={18} strokeWidth={1.7} className="shrink-0 text-[#d4b26a]" aria-hidden="true"/>}
                <span className="text-[17px] font-medium text-[#f7f3ec]">{option.label}</span>
                {option.method==='express'&&<span className="ml-auto text-[10px] font-medium uppercase tracking-[.07em] text-[#e8ca87]">Priority</span>}
              </span>
              <span className="mt-4 text-[25px] font-medium text-[#f7f3ec]">{money(option.amount_minor)}</span>
              <span className="mt-2 text-[13px] leading-5 text-[var(--bone-dim)]">
                {option.indicative_service_window_business_days.min}–{option.indicative_service_window_business_days.max} business days · indicative service planning range
              </span>
              <span className="mt-2 text-[12px] leading-5 text-[#e0d8c7]">
                {option.method==='express'?'Priority order preparation':'Regular preparation queue'}
              </span>
            </label>)}
          </div>
          <p className="mt-4 text-[12px] leading-6 text-[var(--bone-dim)]">
            These are planning estimates, not guaranteed arrival dates. Production varies by design, and international transport and customs may affect the timing. Contact our team before ordering for a fixed event deadline.
          </p>
        </section>

        <section className="rounded-[16px] border border-[rgba(216,214,211,.15)] bg-[rgba(255,255,255,.025)] p-5 sm:p-7">
          <div className="flex items-center gap-3"><Package size={20} strokeWidth={1.5} color="#d4b26a" aria-hidden="true"/>
            <h2 className="text-[25px] font-medium tracking-tight text-[#f7f3ec]">Destination</h2></div>
          <p className="mt-3 text-[14px] leading-6 text-[var(--bone-dim)]">
            Countries below are visual examples only. At launch, checkout will accept only destinations we can really ship to from Ukraine.
          </p>
          <label className="mt-5 block text-[13px] font-medium text-[#f7f3ec]" htmlFor="review-country">
            Example destination
          </label>
          <select id="review-country" value={country} onChange={e=>setCountry(e.target.value)}
            className="mt-2 min-h-12 w-full rounded-lg border border-[rgba(216,214,211,.25)] bg-[#141418] px-3 text-[16px] text-[#f7f3ec] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d4b26a]">
            {countries.map(c=><option key={c.code} value={c.code}>{c.name}</option>)}
          </select>
          {breakdown?.remote_example_minor
            ?<p className="mt-3 text-[13px] leading-6 text-[var(--bone-dim)]">
              Owner-approved remote-zone example: +€20 per eligible shipment parcel, only where the destination is served.
            </p>
            :<p className="mt-3 text-[13px] leading-6 text-[var(--bone-dim)]">The sample uses the regular shipping price. Live delivery availability has not been verified.</p>}
        </section>

        <div className="flex flex-wrap gap-5 text-[13px] text-[var(--bone-dim)]">
          <Link href="/shipping" className="inline-flex items-center gap-1.5 underline underline-offset-4 hover:text-white">
            Shipping policy <ChevronRight size={14} aria-hidden="true"/>
          </Link>
          <Link href="/returns" className="inline-flex items-center gap-1.5 underline underline-offset-4 hover:text-white">
            Returns <ChevronRight size={14} aria-hidden="true"/>
          </Link>
          <Link href="/contact" className="inline-flex items-center gap-1.5 underline underline-offset-4 hover:text-white">
            Contact <ChevronRight size={14} aria-hidden="true"/>
          </Link>
        </div>
      </div>

      <aside className="min-w-0 xl:sticky xl:top-28 xl:self-start" aria-label="Illustrative order summary">
        <section className="rounded-[16px] border border-[rgba(212,178,106,.22)] bg-[rgba(16,16,20,.95)] p-6 sm:p-7">
          <div className="text-[10px] font-medium uppercase tracking-[.2em] text-[#d4b26a]">Visual concept</div>
          <h2 className="mt-3 text-[27px] font-medium text-[#f7f3ec]">Order summary</h2>
          <p className="mt-2 text-[12px] leading-5 text-[var(--bone-dim)]">This example uses catalog card prices, not selected variants or a live server checkout quote.</p>
          <div className="mt-7 space-y-3 text-[14px]">
            <div className="flex justify-between gap-3 text-[var(--bone-dim)]">
              <span>Sample pieces ({chosen.length} listings)</span><span className="text-[#f7f3ec]">{chosen.length?money(displaySubtotalMinor):'—'}</span>
            </div>
            <div className="flex justify-between gap-3 text-[var(--bone-dim)]">
              <span>{method==='express'?'Express priority':'Standard'} service</span>
              <span className="text-[#f7f3ec]">{breakdown?money(breakdown.shipping_minor):'—'}</span>
            </div>
            {Boolean(breakdown&&breakdown.distinct_listing_count>1)&&<div className="flex justify-between gap-3 text-[var(--bone-dim)]">
              <span>Additional packaging for multiple items</span>
              <span className="text-[#f7f3ec]">{money(breakdown!.handling_minor)}</span>
            </div>}
            {Boolean(breakdown?.remote_example_minor)&&<div className="flex justify-between gap-3 text-[var(--bone-dim)]">
              <span>Remote-zone example (one parcel)</span><span className="text-[#f7f3ec]">{money(breakdown!.remote_example_minor)}</span>
            </div>}
          </div>
          <div className="mt-6 border-t border-[rgba(216,214,211,.16)] pt-5">
            <div className="flex items-start justify-between gap-3">
              <span className="text-[14px] text-[#f7f3ec]">Illustrative subtotal before taxes</span>
              <span className="text-[25px] font-medium text-[#f7f3ec]">{breakdown?money(indicativeMinor):'—'}</span>
            </div>
            <p className="mt-3 text-[12px] leading-5 text-[var(--bone-dim)]">
              The final price and tax, any verified remote parcel charges, delivery availability and actual item options will be recalculated by the server at checkout.
            </p>
          </div>
          <div className="mt-6 rounded-lg border border-[rgba(212,178,106,.20)] bg-[rgba(212,178,106,.055)] p-4">
            <div className="flex items-start gap-3">
              <ShieldCheck size={19} strokeWidth={1.6} className="mt-0.5 shrink-0 text-[#d4b26a]" aria-hidden="true"/>
              <p className="text-[13px] leading-6 text-[#ede7db]">
                Payment is not active. We&apos;re preparing secure checkout and verified shipping availability.
              </p>
            </div>
          </div>
          <button type="button" disabled aria-disabled="true"
            className="mt-5 flex min-h-[50px] w-full cursor-not-allowed items-center justify-center gap-2 rounded-lg border border-[rgba(216,214,211,.20)] bg-[rgba(255,255,255,.07)] px-4 text-[14px] font-medium text-[var(--bone-dim)]">
            <LockKeyhole size={16} aria-hidden="true"/> Checkout not active
          </button>
          <p className="mt-4 flex items-center justify-center gap-2 text-center text-[12px] leading-5 text-[var(--bone-dim)]">
            <Check size={14} aria-hidden="true"/> No registration or marketing signup required to review.
          </p>
        </section>
      </aside>
    </div>
  </div>;
}
