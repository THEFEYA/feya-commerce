export const instant = false;

import type {Metadata} from 'next';
import Link from 'next/link';
import {Header} from '@/components/Header';
import {Footer} from '@/components/Footer';
import {getPublicLegalIdentity} from '@/lib/publicLegalIdentity';
import {isSellerOnlinePaymentsEnabled,SELLER_ONLINE_PROVIDER} from '@/lib/sellerOnlineProvider';

const CONTACT_EMAIL='manager.feya@gmail.com';

export const metadata:Metadata={
  title:'Terms of Use & Sale',
  description:'TheFEYA website, product, shipping, returns and future ordering terms.',
  alternates:{canonical:'/terms'},
  // Terms are public for trust/OAuth review, but are not a Search Release owner yet.
  robots:{index:false,follow:true},
};

export default function TermsPage(){
  const identity=getPublicLegalIdentity();
  const sellerOnlineEnabled=isSellerOnlinePaymentsEnabled();

  return <main className="visual-commerce-shell relative min-h-screen">
    <Header/>
    <section className="container-feya pt-36 pb-14 lg:pt-44 lg:pb-20">
      <div className="max-w-4xl">
        <div className="eyebrow-gold mb-5">TheFEYA · Store terms</div>
        <h1 className="visual-display text-[clamp(48px,6vw,86px)] font-medium leading-[.94] tracking-[-.045em] text-[#f7f3ec]">Terms of Use & Sale</h1>
        <p className="mt-6 max-w-3xl text-[16px] leading-7 text-[#aaa2a0]">
          These terms explain the current catalog website and the rules that apply when a TheFEYA ordering flow is separately activated. Product-specific details shown on the selected product page remain part of the product information.
        </p>
      </div>
    </section>

    <section className="container-feya pb-16 lg:pb-24">
      <div className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-xl border border-[rgba(216,214,211,.14)] bg-[rgba(255,255,255,.025)] p-6 lg:p-7">
          <h2 className="text-bone text-xl">{identity?'Website operator':'Current storefront status'}</h2>
          <div className="mt-4 space-y-2 text-[15px] leading-7 text-[var(--bone-dim)]">
            {identity?<>
              <p>{identity.legalName}, trading as {identity.brandName}</p>
              <p>{identity.address.line1}</p>
              {identity.address.line2?<p>{identity.address.line2}</p>:null}
              <p>{[identity.address.city,identity.address.region,identity.address.postalCode].filter(Boolean).join(', ')}</p>
              <p>{identity.address.country}</p>
              <p className="pt-2">Email: <a className="text-bone hover:text-white" href={`mailto:${identity.contactEmail}`}>{identity.contactEmail}</a></p>
            </>:<>
              <p>TheFEYA is the public brand and studio contact for this catalog website.</p>
              <p>Online checkout and payment processing are not active. No inactive sole-proprietor registration is presented as the current seller, and no payment service is presented as an active transaction party before its integration is confirmed.</p>
              <p>Storefront contact: <a className="text-bone hover:text-white" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.</p>
            </>}
          </div>
        </article>

        <article className="rounded-xl border border-[rgba(216,214,211,.14)] bg-[rgba(255,255,255,.025)] p-6 lg:p-7">
          <h2 className="text-bone text-xl">Made-to-order products</h2>
          <div className="mt-4 space-y-3 text-[15px] leading-7 text-[var(--bone-dim)]">
            <p>TheFEYA creates handmade stage, festival, performance and editorial pieces. Materials, included components, available configurations, size options and any displayed price are defined by the current product page and the option selected by the customer.</p>
            <p>Styled photographs may show a complete look. They do not add components that are not included in the selected configuration.</p>
          </div>
        </article>

        <article className="rounded-xl border border-[rgba(216,214,211,.14)] bg-[rgba(255,255,255,.025)] p-6 lg:p-7">
          <h2 className="text-bone text-xl">Orders and checkout</h2>
          <div className="mt-4 space-y-3 text-[15px] leading-7 text-[var(--bone-dim)]">
            <p>An online order exists only when checkout is active and the order has been submitted through the enabled ordering flow. The current catalog page or bag interface by itself does not create an online purchase contract.</p>
            <p>Before submission, an activated checkout must identify the transaction party and show the selected configuration, current quoted price, currency, shipping method and the policy versions applicable to the order.</p>
          </div>
        </article>

        <article className="rounded-xl border border-[rgba(216,214,211,.14)] bg-[rgba(255,255,255,.025)] p-6 lg:p-7">
          <h2 className="text-bone text-xl">Cancellations, returns and remedies</h2>
          <div className="mt-4 space-y-3 text-[15px] leading-7 text-[var(--bone-dim)]">
            <p>The current made-to-order cancellation, return, exchange, repair, remake and replacement rules are published on the Returns & Exchanges page.</p>
            <p>Nothing in these store terms removes rights that cannot legally be waived under applicable law.</p>
          </div>
          <Link href="/returns" className="btn-ghost mt-5">Returns & exchanges</Link>
        </article>

        <article className="rounded-xl border border-[rgba(216,214,211,.14)] bg-[rgba(255,255,255,.025)] p-6 lg:p-7">
          <h2 className="text-bone text-xl">Shipping, customs and event dates</h2>
          <div className="mt-4 space-y-3 text-[15px] leading-7 text-[var(--bone-dim)]">
            <p>Production and delivery estimates, customs responsibilities and event-date limitations are governed by the current Shipping & Delivery policy.</p>
            <p>A delivery estimate is not an event-date guarantee unless TheFEYA expressly accepts a specific deadline in writing for the particular order.</p>
          </div>
          <Link href="/shipping" className="btn-ghost mt-5">Shipping policy</Link>
        </article>

        <article className="rounded-xl border border-[rgba(216,214,211,.14)] bg-[rgba(255,255,255,.025)] p-6 lg:p-7">
          <h2 className="text-bone text-xl">Website content and intellectual property</h2>
          <div className="mt-4 space-y-3 text-[15px] leading-7 text-[var(--bone-dim)]">
            <p>TheFEYA product photography, text, graphics, designs and branding are provided for viewing and shopping purposes. They may not be copied, republished or commercially exploited without permission except where applicable law permits.</p>
            <p>Links to third-party services are subject to the terms and privacy practices of those services.</p>
          </div>
        </article>

        {sellerOnlineEnabled?<article className="rounded-xl border border-[rgba(212,178,106,.28)] bg-[rgba(212,178,106,.06)] p-6 lg:p-7 lg:col-span-2">
          <h2 className="text-bone text-xl">Seller Online transaction service</h2>
          <div className="mt-4 space-y-3 text-[15px] leading-7 text-[var(--bone-dim)]">
            <p>For the enabled Seller Online checkout flow, {SELLER_ONLINE_PROVIDER.legalName} may act as buyer, reseller, shipper and direct payment recipient under the terms applicable to that service. TheFEYA does not label Seller Online as “merchant of record” unless that exact role is separately confirmed for thefeya.com.</p>
            <p>{SELLER_ONLINE_PROVIDER.contactAddress.line1}, {SELLER_ONLINE_PROVIDER.contactAddress.city}, {SELLER_ONLINE_PROVIDER.contactAddress.region} {SELLER_ONLINE_PROVIDER.contactAddress.postalCode}, {SELLER_ONLINE_PROVIDER.contactAddress.country}.</p>
          </div>
        </article>:null}
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/privacy" className="btn-ghost">Privacy</Link>
        <Link href="/contact" className="btn-ghost">Contact</Link>
      </div>
    </section>
    <Footer/>
  </main>;
}
