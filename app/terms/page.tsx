import type {Metadata} from 'next';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import {Header} from '@/components/Header';
import {Footer} from '@/components/Footer';
import {getPublicLegalIdentity} from '@/lib/publicLegalIdentity';
import {releaseRobotsForPath} from '@/lib/searchReleaseIndexationServer';
import {isSellerOnlinePaymentsEnabled,SELLER_ONLINE_PROVIDER} from '@/lib/sellerOnlineProvider';

export async function generateMetadata():Promise<Metadata>{
  const identity=getPublicLegalIdentity();
  if(!identity)return{title:'Terms',robots:{index:false,follow:false}};
  return{
    title:'Terms of Use & Sale',
    description:'TheFEYA website, order, product, shipping and returns terms.',
    alternates:{canonical:'/terms'},
    robots:await releaseRobotsForPath('/terms'),
  };
}

export default function TermsPage(){
  const identity=getPublicLegalIdentity();
  if(!identity)notFound();
  const sellerOnlineEnabled=isSellerOnlinePaymentsEnabled();

  return <main className="relative min-h-screen">
    <Header/>
    <section className="container-feya pt-36 pb-14 lg:pt-44 lg:pb-20">
      <div className="max-w-4xl">
        <div className="eyebrow-gold mb-5">TheFEYA · Store terms</div>
        <h1 className="font-tall text-bone leading-[.95]" style={{fontSize:'clamp(52px,7vw,96px)'}}>Terms of Use & Sale</h1>
        <p className="editorial-italic mt-6 max-w-3xl text-lg leading-relaxed text-[var(--bone-dim)]">
          These terms explain how this website and any activated TheFEYA ordering flow operate. Product-specific details shown on the selected product page and configuration remain part of the order information.
        </p>
      </div>
    </section>

    <section className="container-feya pb-16 lg:pb-24">
      <div className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-xl border border-[rgba(216,214,211,.14)] bg-[rgba(255,255,255,.025)] p-6 lg:p-7">
          <h2 className="text-bone text-xl">Website operator</h2>
          <div className="mt-4 space-y-1 text-[15px] leading-7 text-[var(--bone-dim)]">
            <p>{identity.legalName}, trading as {identity.brandName}</p>
            <p>{identity.address.line1}</p>
            {identity.address.line2?<p>{identity.address.line2}</p>:null}
            <p>{[identity.address.city,identity.address.region,identity.address.postalCode].filter(Boolean).join(', ')}</p>
            <p>{identity.address.country}</p>
            <p className="pt-2">Email: <a className="text-bone hover:text-white" href={`mailto:${identity.contactEmail}`}>{identity.contactEmail}</a></p>
          </div>
        </article>

        <article className="rounded-xl border border-[rgba(216,214,211,.14)] bg-[rgba(255,255,255,.025)] p-6 lg:p-7">
          <h2 className="text-bone text-xl">Made-to-order products</h2>
          <div className="mt-4 space-y-3 text-[15px] leading-7 text-[var(--bone-dim)]">
            <p>TheFEYA creates handmade stage, festival, performance and editorial pieces. Materials, included components, available configurations, size options and the quoted price are defined by the current product page and the option selected by the customer.</p>
            <p>Styled photographs may show a complete look. They do not add components that are not included in the selected configuration.</p>
          </div>
        </article>

        <article className="rounded-xl border border-[rgba(216,214,211,.14)] bg-[rgba(255,255,255,.025)] p-6 lg:p-7">
          <h2 className="text-bone text-xl">Orders and checkout</h2>
          <div className="mt-4 space-y-3 text-[15px] leading-7 text-[var(--bone-dim)]">
            <p>An online order exists only when checkout is active and the order has been submitted through the enabled ordering flow. A catalog or pre-launch page by itself does not create a purchase contract.</p>
            <p>Before submission, the checkout must show the selected configuration, current quoted price, currency, shipping method and the policy versions applicable to the order.</p>
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
          <h2 className="text-bone text-xl">Seller Online payment/resale service</h2>
          <div className="mt-4 space-y-3 text-[15px] leading-7 text-[var(--bone-dim)]">
            <p>For an enabled Seller Online checkout flow, {SELLER_ONLINE_PROVIDER.legalName} may act as buyer, reseller, shipper and direct payment recipient under the terms applicable to that service.</p>
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
