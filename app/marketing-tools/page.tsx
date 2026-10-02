export const instant = false;

import type {Metadata} from 'next';
import Link from 'next/link';
import {Header} from '@/components/Header';
import {Footer} from '@/components/Footer';

export const metadata:Metadata={
  title:'TheFEYA Marketing Tools',
  description:'Public information page for the internal TheFEYA marketing application that connects authorized Google Ads data for keyword planning and reporting.',
  alternates:{canonical:'/marketing-tools'},
  // OAuth/brand-review trust surface, not a Search Release owner.
  robots:{index:false,follow:true},
};

export default function MarketingToolsPage(){
  return <main className="visual-commerce-shell relative min-h-screen">
    <Header/>

    <section className="container-feya pt-36 pb-14 lg:pt-44 lg:pb-20">
      <div className="max-w-4xl">
        <div className="eyebrow-gold mb-5">TheFEYA · Internal marketing application</div>
        <h1 className="visual-display text-[clamp(48px,6vw,86px)] font-medium leading-[.94] tracking-[-.045em] text-[#f7f3ec]">
          TheFEYA Marketing Tools
        </h1>
        <p className="mt-6 max-w-3xl text-[16px] leading-7 text-[#aaa2a0]">
          This page describes the internal application used by TheFEYA to connect authorized marketing data for our own store. It is not a public advertising network, payment service or customer account product.
        </p>
      </div>
    </section>

    <section className="container-feya pb-16 lg:pb-24">
      <div className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-xl border border-[rgba(216,214,211,.14)] bg-[rgba(255,255,255,.025)] p-6 lg:p-7">
          <h2 className="text-bone text-xl">What the application does</h2>
          <div className="mt-4 space-y-3 text-[15px] leading-7 text-[var(--bone-dim)]">
            <p>The internal tool may connect to Google Ads after an authorized Google account grants OAuth access.</p>
            <p>Its intended functions include reading account context, collecting keyword-planning evidence and marketing reports, and supporting TheFEYA’s internal search and advertising workflows.</p>
            <p>Access to a Google account does not itself activate campaigns, payments, checkout or Merchant Center products.</p>
          </div>
        </article>

        <article className="rounded-xl border border-[rgba(216,214,211,.14)] bg-[rgba(255,255,255,.025)] p-6 lg:p-7">
          <h2 className="text-bone text-xl">Google user data</h2>
          <div className="mt-4 space-y-3 text-[15px] leading-7 text-[var(--bone-dim)]">
            <p>The tool uses Google data only for the authorized TheFEYA marketing functions described here and in our Privacy Policy.</p>
            <p>OAuth credentials are handled server-side. Google user data is not sold or used for an unrelated advertising service.</p>
            <p>Access can be revoked through the relevant Google account controls; after revocation the tool can no longer obtain new authorized data through that connection.</p>
          </div>
        </article>

        <article className="rounded-xl border border-[rgba(216,214,211,.14)] bg-[rgba(255,255,255,.025)] p-6 lg:p-7">
          <h2 className="text-bone text-xl">Who uses it</h2>
          <div className="mt-4 space-y-3 text-[15px] leading-7 text-[var(--bone-dim)]">
            <p>The application is intended for TheFEYA’s own authorized operators and connected marketing accounts. It is not offered as a multi-tenant public SaaS product.</p>
            <p>Administrative tools and raw connected-account data are not exposed as public storefront pages.</p>
          </div>
        </article>

        <article className="rounded-xl border border-[rgba(216,214,211,.14)] bg-[rgba(255,255,255,.025)] p-6 lg:p-7">
          <h2 className="text-bone text-xl">Privacy, terms and support</h2>
          <div className="mt-4 space-y-3 text-[15px] leading-7 text-[var(--bone-dim)]">
            <p>Our Privacy Policy explains how the application accesses, uses, stores and shares data, including Google-authorized data.</p>
            <p>Questions about this application can be sent to <a className="text-bone hover:text-white" href="mailto:manager.feya@gmail.com">manager.feya@gmail.com</a>.</p>
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/privacy" className="btn-ghost">Privacy Policy</Link>
            <Link href="/terms" className="btn-ghost">Terms</Link>
            <Link href="/contact" className="btn-ghost">Contact</Link>
          </div>
        </article>
      </div>

      <div className="mt-6">
        <Link href="/" className="btn-ghost">Back to TheFEYA</Link>
      </div>
    </section>

    <Footer/>
  </main>;
}
