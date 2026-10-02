export const instant = false;

import type {Metadata} from 'next';
import Link from 'next/link';
import {Header} from '@/components/Header';
import {Footer} from '@/components/Footer';
import {getPublicLegalIdentity} from '@/lib/publicLegalIdentity';
import {AnalyticsConsentPreferences} from '@/components/AnalyticsConsentBanner';
import {isSellerOnlinePaymentsEnabled,SELLER_ONLINE_PROVIDER} from '@/lib/sellerOnlineProvider';

const CONTACT_EMAIL='manager.feya@gmail.com';

export const metadata:Metadata={
  title:'Privacy Policy',
  description:'How TheFEYA handles contact, storefront, Google API, analytics and order-related data.',
  alternates:{canonical:'/privacy'},
  // Privacy is intentionally public for trust/OAuth review, but it is not a Search Release owner.
  robots:{index:false,follow:true},
};

export default function PrivacyPage(){
  const identity=getPublicLegalIdentity();
  const sellerOnlineEnabled=isSellerOnlinePaymentsEnabled();
  const analyticsReady=Boolean(identity)
    && process.env.FEYA_ANALYTICS_PRIVACY_READY==='true'
    && process.env.FEYA_ANALYTICS_ENABLED==='true';

  return <main className="visual-commerce-shell relative min-h-screen">
    <Header/>
    <section className="container-feya pt-36 pb-14 lg:pt-44 lg:pb-20">
      <div className="max-w-4xl">
        <div className="eyebrow-gold mb-5">TheFEYA · Privacy</div>
        <h1 className="visual-display text-[clamp(48px,6vw,86px)] font-medium leading-[.94] tracking-[-.045em] text-[#f7f3ec]">Privacy Policy</h1>
        <p className="mt-6 max-w-3xl text-[16px] leading-7 text-[#aaa2a0]">
          This policy describes the information used to operate the TheFEYA website, respond to enquiries and, only when separately activated, connect Google services, measure storefront use or process orders.
        </p>
      </div>
    </section>

    <section className="container-feya pb-16 lg:pb-24">
      <div className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-xl border border-[rgba(216,214,211,.14)] bg-[rgba(255,255,255,.025)] p-6 lg:p-7">
          <h2 className="text-bone text-xl">{identity?'Site operator':'Storefront contact & current status'}</h2>
          <div className="mt-4 space-y-2 text-[15px] leading-7 text-[var(--bone-dim)]">
            {identity?<>
              <p>{identity.legalName}, trading as {identity.brandName}</p>
              <p>{identity.address.line1}</p>
              {identity.address.line2?<p>{identity.address.line2}</p>:null}
              <p>{[identity.address.city,identity.address.region,identity.address.postalCode].filter(Boolean).join(', ')}</p>
              <p>{identity.address.country}</p>
              <p className="pt-2">Privacy contact: <a className="text-bone hover:text-white" href={`mailto:${identity.contactEmail}`}>{identity.contactEmail}</a></p>
            </>:<>
              <p>TheFEYA is the public storefront brand and studio contact for this catalog website.</p>
              <p>Online checkout, payment processing and optional production analytics are not activated until the relevant seller/payment and privacy-controller disclosures are confirmed.</p>
              <p>Privacy and storefront contact: <a className="text-bone hover:text-white" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.</p>
            </>}
          </div>
        </article>

        <article className="rounded-xl border border-[rgba(216,214,211,.14)] bg-[rgba(255,255,255,.025)] p-6 lg:p-7">
          <h2 className="text-bone text-xl">Information you send to TheFEYA</h2>
          <div className="mt-4 space-y-3 text-[15px] leading-7 text-[var(--bone-dim)]">
            <p>If you email TheFEYA, the message may contain your name, email address, order details, measurements, photographs or other information you choose to provide. We use that information to answer your request and handle the relevant product or order issue.</p>
            <p>The current Contact page uses a mail link rather than a website contact form.</p>
          </div>
        </article>

        <article className="rounded-xl border border-[rgba(216,214,211,.14)] bg-[rgba(255,255,255,.025)] p-6 lg:p-7">
          <h2 className="text-bone text-xl">Bag and browser storage</h2>
          <div className="mt-4 space-y-3 text-[15px] leading-7 text-[var(--bone-dim)]">
            <p>The storefront can keep bag selections and the bag count in your browser using local storage. These values support the storefront interface and are not, by themselves, a completed order.</p>
            <p>Where analytics choices are available, your analytics preference is also stored in your browser so the site can respect that choice.</p>
          </div>
        </article>

        <article className="rounded-xl border border-[rgba(216,214,211,.14)] bg-[rgba(255,255,255,.025)] p-6 lg:p-7">
          <h2 className="text-bone text-xl">Optional analytics</h2>
          <div className="mt-4 space-y-3 text-[15px] leading-7 text-[var(--bone-dim)]">
            {analyticsReady?<>
              <p>Optional analytics are loaded only after you choose to allow analytics. Before consent, the TheFEYA analytics runtime does not create its first-party measurement session and does not load the Google Analytics tag.</p>
              <p>TheFEYA analytics events use stable internal identifiers for pages, releases, sessions, events and products. The event contract does not intentionally include direct personal fields such as your name or email address.</p>
              <p>You can change your analytics choice using the privacy control provided by the site.</p>
            </>:<>
              <p>Production analytics collection is currently disabled. The analytics implementation remains off until the privacy-controller identity, consent configuration and production GA4 stream are explicitly confirmed.</p>
            </>}
          </div>
        </article>

        <article className="rounded-xl border border-[rgba(216,214,211,.14)] bg-[rgba(255,255,255,.025)] p-6 lg:p-7">
          <h2 className="text-bone text-xl">Google API / Google Ads access</h2>
          <div className="mt-4 space-y-3 text-[15px] leading-7 text-[var(--bone-dim)]">
            <p>TheFEYA may use a private internal tool to connect to Google services, including Google Ads, only after an authorized Google account grants the requested OAuth access.</p>
            <p>When enabled, that access is used only for the functions requested in the tool, such as account context, keyword-planning evidence or reporting. OAuth credentials are handled server-side and are not intentionally exposed in the public browser bundle.</p>
            <p>Google user data is not sold or used for unrelated advertising. Access can be revoked through the relevant Google account controls; after revocation, the tool can no longer obtain new authorized data through that connection.</p>
          </div>
        </article>

        <article className="rounded-xl border border-[rgba(216,214,211,.14)] bg-[rgba(255,255,255,.025)] p-6 lg:p-7">
          <h2 className="text-bone text-xl">Technical delivery and security</h2>
          <div className="mt-4 space-y-3 text-[15px] leading-7 text-[var(--bone-dim)]">
            <p>Hosting and infrastructure providers may process technical request information needed to deliver and secure the website, such as requested URLs, timestamps, network identifiers and browser/device information.</p>
            <p>Administrative and API surfaces are excluded from TheFEYA storefront analytics.</p>
          </div>
        </article>

        <article className="rounded-xl border border-[rgba(216,214,211,.14)] bg-[rgba(255,255,255,.025)] p-6 lg:p-7">
          <h2 className="text-bone text-xl">Orders and payments</h2>
          <div className="mt-4 space-y-3 text-[15px] leading-7 text-[var(--bone-dim)]">
            {sellerOnlineEnabled?<>
              <p>For the enabled Seller Online ordering/payment flow, information necessary to process, resell, deliver or support the transaction may be shared with {SELLER_ONLINE_PROVIDER.legalName} under the terms and privacy practices applicable to that service.</p>
              <p>{SELLER_ONLINE_PROVIDER.contactAddress.line1}, {SELLER_ONLINE_PROVIDER.contactAddress.city}, {SELLER_ONLINE_PROVIDER.contactAddress.region} {SELLER_ONLINE_PROVIDER.contactAddress.postalCode}, {SELLER_ONLINE_PROVIDER.contactAddress.country}.</p>
            </>:<>
              <p>Online checkout and payment processing are not active in the current catalog storefront. Seller Online is not presented as an active transaction party until the integration and required disclosure for thefeya.com are explicitly confirmed and enabled.</p>
            </>}
          </div>
        </article>

        <article className="rounded-xl border border-[rgba(216,214,211,.14)] bg-[rgba(255,255,255,.025)] p-6 lg:p-7">
          <h2 className="text-bone text-xl">Retention and accuracy</h2>
          <div className="mt-4 space-y-3 text-[15px] leading-7 text-[var(--bone-dim)]">
            <p>Information is kept only as long as reasonably necessary for the purpose for which it was collected, to maintain required business records, resolve disputes, protect the service, or meet applicable legal obligations.</p>
            <p>If information you supplied is inaccurate or no longer needed for an active request, contact TheFEYA using the privacy contact above.</p>
          </div>
        </article>

        <article className="rounded-xl border border-[rgba(216,214,211,.14)] bg-[rgba(255,255,255,.025)] p-6 lg:p-7">
          <h2 className="text-bone text-xl">Analytics preferences</h2>
          <div className="mt-4">
            <AnalyticsConsentPreferences enabled={analyticsReady}/>
          </div>
        </article>

        <article className="rounded-xl border border-[rgba(216,214,211,.14)] bg-[rgba(255,255,255,.025)] p-6 lg:p-7">
          <h2 className="text-bone text-xl">Your privacy requests</h2>
          <div className="mt-4 space-y-3 text-[15px] leading-7 text-[var(--bone-dim)]">
            <p>Depending on the law that applies to you, you may have rights to ask about, access, correct, delete, restrict or object to certain uses of your personal information, or to withdraw consent where processing is based on consent.</p>
            <p>Send privacy requests to <a className="text-bone hover:text-white" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. We may need enough information to verify the request before acting on it.</p>
          </div>
        </article>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/terms" className="btn-ghost">Terms</Link>
        <Link href="/contact" className="btn-ghost">Contact</Link>
      </div>
    </section>
    <Footer/>
  </main>;
}
