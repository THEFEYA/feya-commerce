export const instant = false;

import type {Metadata} from 'next';
import Link from 'next/link';
import {Header} from '@/components/Header';
import {Footer} from '@/components/Footer';
import {SELLER_ONLINE_PROVIDER} from '@/lib/sellerOnlineProvider';

export const metadata:Metadata={
  title:'Seller Online integration · TheFEYA',
  description:'Public technical details for reviewing Seller Online API v2 payment integration with thefeya.com.',
  robots:{index:false,follow:false,nocache:true},
};

const pages=[
  {label:'Storefront',href:'/'},
  {label:'Shop and products',href:'/shop'},
  {label:'Shipping & payment',href:'/shipping'},
  {label:'Terms',href:'/terms'},
  {label:'Privacy',href:'/privacy'},
  {label:'Returns & exchanges',href:'/returns'},
  {label:'Contact',href:'/contact'},
] as const;

/** Public, non-privileged integration guide. Never exposes admin data or API credentials. */
export default function SellerOnlineIntegrationPage(){
  const partner=SELLER_ONLINE_PROVIDER;
  return <main className="visual-commerce-shell relative min-h-screen">
    <Header/>
    <section className="container-feya pt-28 pb-12 lg:pt-40 lg:pb-16">
      <p className="eyebrow-gold mb-5">TheFEYA · Payment integration</p>
      <h1 className="visual-display max-w-4xl text-[clamp(36px,5vw,68px)] leading-[1.05] text-[#f7f3ec]">
        Seller Online technical access
      </h1>
      <p className="mt-6 max-w-3xl text-[15px] leading-7 text-[var(--bone-dim)]">
        This page is publicly available on thefeya.com without a password for the Seller Online technical team.
        TheFEYA is a custom Next.js storefront, not WooCommerce or a CMS with an installable payment plugin.
        Seller Online confirmed API v2 as the integration method for this store.
      </p>
      <p className="mt-4 max-w-3xl text-[14px] leading-7 text-[#d4b26a]">
        Status: online checkout is not active. Opening the site or an admin page does not itself authorize a payment connection.
      </p>
    </section>

    <section className="container-feya pb-14 lg:pb-20">
      <div className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-xl border border-[rgba(216,214,211,.18)] bg-white/[.025] p-6 lg:p-8">
          <h2 className="text-bone text-xl">Review the live public store</h2>
          <p className="mt-3 text-[14px] leading-6 text-[var(--bone-dim)]">
            These are the real, customer-facing pages on the primary domain. No login, password or preview URL is required.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {pages.map(page=><Link key={page.href} href={page.href} className="rounded-full border border-white/[.20] px-4 py-2 text-[12px] text-[#e9e2d8] hover:border-[#d4b26a]">{page.label}</Link>)}
          </div>
        </article>
        <article className="rounded-xl border border-[rgba(216,214,211,.18)] bg-white/[.025] p-6 lg:p-8">
          <h2 className="text-bone text-xl">Approved integration route</h2>
          <p className="mt-3 text-[14px] leading-6 text-[var(--bone-dim)]">
            Provider: {partner.legalName} · integration: {partner.officialIntegration} · intended role: payment recipient and logistics partner.
          </p>
          <div className="mt-5 flex flex-col items-start gap-3 text-[13px]">
            <a href={partner.apiDocumentationUrl} target="_blank" rel="noopener noreferrer" className="text-[#d4b26a] underline underline-offset-4">Official API v2 Swagger documentation</a>
            <a href={partner.connectionApplicationUrl} target="_blank" rel="noopener noreferrer" className="text-[#d4b26a] underline underline-offset-4">Seller Online custom-store connection application</a>
            <a href={`mailto:${partner.supportEmail}`} className="text-[#d4b26a] underline underline-offset-4">Seller Online technical support</a>
          </div>
        </article>
      </div>
      <article className="mt-4 rounded-xl border border-[rgba(216,214,211,.18)] bg-white/[.025] p-6 lg:p-8">
        <h2 className="text-bone text-xl">What is required to enable real payments</h2>
        <p className="mt-3 max-w-4xl text-[14px] leading-7 text-[var(--bone-dim)]">
          Seller Online must approve the custom-store application and provide the official API v2 onboarding details
          through an authorized private support/account channel, including API credentials, payment/session creation
          specification, transaction status, callback verification, refunds and testing instructions.
          TheFEYA engineering must then implement and test server-side checkout, final amount verification,
          payment status and refunds. Please do not paste API keys, passwords or card data into this public page.
        </p>
        <p className="mt-4 max-w-4xl text-[13px] leading-6 text-[var(--bone-dim)]">
          This public page is for technical review; it intentionally does not grant access to private orders,
          customer addresses, payment settings or source-code deployment. Those operations require specifically
          authorized engineering access. TheFEYA contact: <a href="mailto:manager.feya@gmail.com" className="text-[#d4b26a] underline underline-offset-4">manager.feya@gmail.com</a>.
        </p>
        <p className="mt-4 text-[12px] leading-6 text-[#948d85]">
          Seller Online support references: #738609 (API v2 confirmation) and #264386 (store-connection application).
          Payments are not collected on thefeya.com until integration and required approvals are complete.
        </p>
      </article>
      <div className="mt-6 text-[12px] text-[var(--bone-dim)]">
        Already an authorized TheFEYA administrator? <Link href="/admin/login" className="text-[#d4b26a] underline underline-offset-4">Open private owner sign-in</Link>.
      </div>
    </section>
    <Footer/>
  </main>;
}
