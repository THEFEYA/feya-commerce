import Link from 'next/link';
import {ArrowUpRight, Mail, MessageCircle, Phone, ChevronRight} from 'lucide-react';
import {Header} from '@/components/Header';
import {Footer} from '@/components/Footer';
import {SELLER_ONLINE_PROVIDER} from '@/lib/sellerOnlineProvider';

const contactEmail='manager.feya@gmail.com';
const supportPhone='+380636556288';

const helpLinks=[
  {href:'/size-guide',label:'Measurements & sizing',detail:'Choosing sizes and taking measurements'},
  {href:'/shipping',label:'Shipping & delivery',detail:'Production, transit times and customs'},
  {href:'/returns',label:'Returns & exchanges',detail:'What happens if something is wrong'},
] as const;

/**
 * New owner-authorized Contact composition in an isolated PREVIEW.
 * Shipping/SEO Wave A source pin of the existing /contact stays untouched.
 * Future deployment of this composition as /contact requires an explicitly
 * versioned Phase 13 content/release change and production visual QA.
 */
export function ContactExperience2026(){
  const op=SELLER_ONLINE_PROVIDER;
  return <main className="visual-commerce-shell relative min-h-screen">
    <Header/>
    <section className="container-feya pt-32 pb-9 sm:pt-36 lg:pt-44 lg:pb-14">
      <div className="max-w-3xl">
        <p className="eyebrow-gold mb-4">TheFEYA · Get in touch</p>
        <h1 className="visual-display text-[clamp(48px,6.4vw,84px)] font-medium leading-[.97] tracking-[-.045em] text-[#f7f3ec]">
          Contact
        </h1>
        <p className="mt-5 max-w-2xl text-[16px] leading-7 text-[var(--bone-dim)]">
          Questions about a design, your fit or an order? We’re happy to help.
        </p>
      </div>
    </section>

    <section className="container-feya pb-12 lg:pb-16" aria-label="Contact options">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,.85fr)]">
        <section className="rounded-[16px] border border-[rgba(216,214,211,.17)] bg-[rgba(255,255,255,.035)] p-6 sm:p-8 lg:p-10">
          <p className="eyebrow-gold">TheFEYA support</p>
          <h2 className="mt-3 text-[26px] font-medium tracking-[-.025em] text-[#f7f3ec] sm:text-[30px]">
            Tell us how we can help.
          </h2>
          <p className="mt-3 max-w-lg text-[15px] leading-7 text-[var(--bone-dim)]">
            Product details, measurements, existing orders and after-sales support — all in one place.
          </p>

          <div className="mt-7 space-y-2.5">
            <a href={`mailto:${contactEmail}`} className="group flex min-w-0 items-center gap-3 rounded-lg border border-[rgba(216,214,211,.14)] bg-[rgba(7,7,10,.4)] px-4 py-4 text-[#f7f3ec] transition-colors hover:border-[rgba(212,178,106,.42)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4B26A]">
              <Mail aria-hidden="true" size={19} strokeWidth={1.7} className="shrink-0 text-[#D4B26A]"/>
              <span className="min-w-0 flex-1 break-all text-[15px] sm:text-[17px]">{contactEmail}</span>
              <ArrowUpRight aria-hidden="true" size={18} className="shrink-0 text-[var(--bone-dim)] group-hover:text-white"/>
            </a>
            <a href={`tel:${supportPhone}`} className="group flex items-center gap-3 rounded-lg border border-[rgba(216,214,211,.14)] bg-[rgba(7,7,10,.4)] px-4 py-4 text-[#f7f3ec] transition-colors hover:border-[rgba(212,178,106,.42)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4B26A]">
              <Phone aria-hidden="true" size={19} strokeWidth={1.7} className="shrink-0 text-[#D4B26A]"/>
              <span className="flex-1 text-[15px] sm:text-[17px]">+380 63 655 62 88</span>
              <ArrowUpRight aria-hidden="true" size={18} className="shrink-0 text-[var(--bone-dim)] group-hover:text-white"/>
            </a>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-4">
            <a href="https://wa.me/380636556288" target="_blank" rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center gap-2 text-[14px] font-medium text-[#f7f3ec] underline decoration-[rgba(212,178,106,.55)] underline-offset-4 hover:decoration-[#D4B26A] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#D4B26A]">
              <MessageCircle aria-hidden="true" size={18} strokeWidth={1.6}/> WhatsApp <ArrowUpRight aria-hidden="true" size={15}/>
              <span className="sr-only">(opens in a new tab)</span>
            </a>
            <span className="text-[13px] text-[var(--bone-dim)]">Viber & Telegram: same number</span>
          </div>
          <p className="mt-6 text-[13px] leading-6 text-[var(--bone-dim)]">
            For an existing order, please include your order number. For a product question, a link to the item helps us find it.
          </p>
        </section>

        <section className="rounded-[16px] border border-[rgba(216,214,211,.14)] bg-[rgba(255,255,255,.02)] p-6 sm:p-8 lg:p-10" aria-label="Useful information">
          <p className="eyebrow-gold">Helpful links</p>
          <h2 className="mt-3 text-[26px] font-medium tracking-[-.025em] text-[#f7f3ec] sm:text-[30px]">
            Find an answer.
          </h2>
          <div className="mt-7 divide-y divide-[rgba(216,214,211,.12)]">
            {helpLinks.map(link=><Link key={link.href} href={link.href}
              className="group flex items-start justify-between gap-3 py-4 first:pt-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4B26A]">
              <span className="min-w-0">
                <span className="block text-[15px] font-medium text-[#f7f3ec] transition-colors group-hover:text-[#E6C886]">{link.label}</span>
                <span className="mt-1 block text-[13px] leading-5 text-[var(--bone-dim)]">{link.detail}</span>
              </span>
              <ChevronRight aria-hidden="true" size={19} className="mt-1 shrink-0 text-[#D4B26A]"/>
            </Link>)}
          </div>
          <p className="mt-7 text-[13px] leading-6 text-[var(--bone-dim)]">
            If you can’t find what you need, just email our team.
          </p>
        </section>
      </div>
    </section>

    <section className="container-feya pb-16 lg:pb-24" aria-labelledby="payment-operator-heading">
      <div className="rounded-[16px] border border-[rgba(212,178,106,.21)] bg-[rgba(212,178,106,.04)] p-6 sm:p-8 lg:p-9">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <div>
            <p className="eyebrow-gold">Payment & logistics information</p>
            <h2 id="payment-operator-heading" className="mt-3 text-[22px] font-medium tracking-[-.015em] text-[#f7f3ec] sm:text-[25px]">
              {op.legalName}
            </h2>
            <p className="mt-3 max-w-lg text-[14px] leading-7 text-[var(--bone-dim)]">
              Our designated payment recipient and logistics partner for the planned online checkout.
              Online payments on thefeya.com are not active yet.
            </p>
            <p className="mt-3 text-[13px] leading-6 text-[var(--bone-dim)]">
              Seller-Online LLC is listed here in its payment and logistics role, not as TheFEYA’s manufacturer or confirmed legal seller.
            </p>
          </div>
          <div className="space-y-2 text-[14px] leading-6 text-[var(--bone-dim)]">
            <p className="font-medium text-[#f7f3ec]">Payment & shipping operator address</p>
            <address className="not-italic">
              {op.legalName}<br/>
              {op.contactAddress.line1}<br/>
              {op.contactAddress.city}, {op.contactAddress.region} {op.contactAddress.postalCode}<br/>
              {op.contactAddress.country}
            </address>
            <p className="pt-2">
              Email: <a className="break-all text-[#f7f3ec] underline decoration-[rgba(212,178,106,.4)] underline-offset-4 hover:decoration-[#D4B26A]" href={`mailto:${op.usOfficeEmail}`}>{op.usOfficeEmail}</a>
            </p>
            <p>Phone: <a className="text-[#f7f3ec] hover:underline" href="tel:+12678009048">{op.usOfficePhone}</a></p>
            <p className="pt-2 text-[13px]">For TheFEYA product and order questions, use the store support contact above.</p>
          </div>
        </div>
      </div>
      <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3 text-[13px] text-[var(--bone-dim)]">
        <Link href="/privacy" className="underline decoration-[rgba(212,178,106,.4)] underline-offset-4 hover:text-white">Privacy Policy</Link>
        <Link href="/terms" className="underline decoration-[rgba(212,178,106,.4)] underline-offset-4 hover:text-white">Terms of Use</Link>
        <span>This page opens email and messaging apps; it does not submit a website form.</span>
      </div>
    </section>
    <Footer/>
  </main>;
}
