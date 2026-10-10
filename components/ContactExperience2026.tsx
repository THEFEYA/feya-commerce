import Link from 'next/link';
import {
  ArrowUpRight,Mail,MessageCircle,Phone,Instagram,Facebook,Pin,
} from 'lucide-react';
import {Header} from '@/components/Header';
import {Footer} from '@/components/Footer';
import {SELLER_ONLINE_PROVIDER} from '@/lib/sellerOnlineProvider';
import {CopySupportEmailButton} from '@/components/CopySupportEmailButton';

const contactEmail='manager.feya@gmail.com';
const supportPhone='+380636556288';

/** Owner-authorized CONTACT-only visual revision in protected PREVIEW.
 * The approved LIVE /contact & its ACTIVE v12 source pin are not modified.
 * These accounts have no confirmed URLs yet: they are strictly visual
 * placeholders, intentionally non-clickable to avoid false social links.
 */
const socialReview=[
  {id:'instagram-1',label:'Instagram 1',Icon:Instagram},
  {id:'instagram-2',label:'Instagram 2',Icon:Instagram},
  {id:'instagram-3',label:'Instagram 3',Icon:Instagram},
  {id:'facebook',label:'Facebook',Icon:Facebook},
  {id:'pinterest',label:'Pinterest',Icon:Pin},
] as const;

/** This page will NOT be made public until owner visual review and separate
 * governed Phase13 content/legal pin migration. No map without verified
 * registered company place; no public social URL without owner source.
 */
export function ContactExperience2026(){
  const op=SELLER_ONLINE_PROVIDER;
  return <main className="visual-commerce-shell relative min-h-screen">
    <Header/>
    <section className="container-feya pt-32 pb-8 sm:pt-36 lg:pt-40 lg:pb-10">
      <div className="max-w-3xl">
        <p className="eyebrow-gold mb-4">TheFEYA · Get in touch</p>
        <h1 className="visual-display text-[clamp(40px,4.4vw,62px)] font-medium leading-[1.04] tracking-[-.035em] text-[#f7f3ec]">
          Contact
        </h1>
        <p className="mt-4 max-w-2xl text-[15px] leading-7 text-[var(--bone-dim)]">
          Questions about a design, your fit or an order? Our studio is here to help.
        </p>
      </div>
    </section>

    <section className="container-feya pb-9 lg:pb-12" aria-labelledby="thefeya-support-heading">
      <div className="rounded-[16px] border border-[rgba(216,214,211,.18)] bg-[rgba(255,255,255,.035)] p-6 sm:p-8 lg:p-10">
        <p className="eyebrow-gold">TheFEYA support</p>
        <h2 id="thefeya-support-heading" className="mt-3 text-[clamp(23px,2.7vw,32px)] font-medium tracking-[-.02em] leading-tight text-[#f7f3ec]">
          Tell us how we can help.
        </h2>
        <p className="mt-3 max-w-2xl text-[14px] leading-7 text-[var(--bone-dim)]">
          Product details, sizes and measurements, existing orders, and after-sales support — reach TheFEYA directly.
        </p>

        <div className="mt-7 grid gap-4 lg:grid-cols-2">
          <div className="min-w-0 rounded-xl border border-[rgba(212,178,106,.19)] bg-[rgba(7,7,10,.42)] p-5 sm:p-6">
            <p className="eyebrow-gold flex items-center gap-2"><Mail size={16} aria-hidden="true"/> Email the studio</p>
            <a href={`mailto:${contactEmail}`} className="group mt-4 flex min-w-0 items-start gap-2 text-[15px] text-[#f7f3ec] underline decoration-[rgba(212,178,106,.5)] underline-offset-4 hover:decoration-[#d4b26a] sm:text-[17px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d4b26a]">
              <span className="min-w-0 flex-1 break-all">{contactEmail}</span>
              <ArrowUpRight size={17} className="shrink-0 text-[#d4b26a]" aria-hidden="true"/>
            </a>
            <div className="mt-5"><CopySupportEmailButton email={contactEmail}/></div>
          </div>

          <div className="min-w-0 rounded-xl border border-[rgba(216,214,211,.14)] bg-[rgba(7,7,10,.38)] p-5 sm:p-6">
            <p className="eyebrow-gold flex items-center gap-2"><Phone size={16} aria-hidden="true"/> Phone & messaging</p>
            <a href={`tel:${supportPhone}`} className="mt-4 inline-flex items-center gap-2 text-[17px] text-[#f7f3ec] hover:text-[#e8ca87] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d4b26a]">
              +380 63 655 62 88 <ArrowUpRight size={16} className="text-[#d4b26a]" aria-hidden="true"/>
            </a>
            <div className="mt-4">
              <a href="https://wa.me/380636556288" target="_blank" rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[rgba(212,178,106,.3)] bg-[rgba(212,178,106,.065)] px-4 text-[14px] text-[#f7f3ec] hover:border-[#d4b26a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d4b26a]">
                <MessageCircle size={17} aria-hidden="true"/> Message on WhatsApp <ArrowUpRight size={14} aria-hidden="true"/>
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            </div>
            <p className="mt-3 text-[12px] leading-5 text-[var(--bone-dim)]">
              The same contact number can be used for Viber and Telegram. Direct app links will be added only after verification.
            </p>
          </div>
        </div>
        <p className="mt-5 text-[12px] leading-6 text-[var(--bone-dim)]">
          For an existing order, include your order number. For a product question, sending the product link helps us answer accurately.
        </p>
      </div>
    </section>

    <section className="container-feya pb-10" aria-labelledby="thefeya-social-heading">
      <div className="border-t border-[rgba(216,214,211,.11)] pt-7">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="eyebrow-gold">TheFEYA community</p>
            <h2 id="thefeya-social-heading" className="mt-2 text-[21px] font-medium text-[#f7f3ec]">Follow our creations</h2>
          </div>
          <p className="text-[11px] leading-5 text-[var(--bone-dim)]">Account links pending owner verification · visual preview only</p>
        </div>
        <div className="mt-5 flex flex-wrap gap-2.5" aria-label="Social platform icons proposed for owner review">
          {socialReview.map(({id,label,Icon})=><span key={id}
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[rgba(216,214,211,.16)] bg-[rgba(255,255,255,.018)] px-4 text-[13px] text-[#c9c3bb]">
            <Icon size={16} strokeWidth={1.6} aria-hidden="true"/> {label}
          </span>)}
        </div>
      </div>
    </section>

    <section className="container-feya pb-16 lg:pb-24" aria-labelledby="payment-operator-heading">
      <div className="rounded-xl border border-[rgba(216,214,211,.09)] bg-[rgba(255,255,255,.012)] px-5 py-6 sm:p-7">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,.94fr)_minmax(0,1.06fr)]">
          <div>
            <h2 id="payment-operator-heading" className="text-[12px] font-medium uppercase tracking-[.14em] text-[#a49c93]">
              Payment and shipping operator · planned integration
            </h2>
            <p className="mt-2 text-[13px] leading-6 text-[#a8a19b]">
              {op.legalName} is TheFEYA’s designated payment recipient and logistics partner
              for planned online checkout. Online payments on thefeya.com are not active yet.
            </p>
            <p className="mt-2 text-[12px] leading-5 text-[#99918c]">
              Partner details are provided for transparency. This is not the product support contact,
              manufacturer identity or a confirmation of TheFEYA’s legal seller.
            </p>
          </div>
          <div className="space-y-1.5 text-[12px] leading-6 text-[#a8a19b]">
            <p className="font-medium text-[#c7bfb5]">Partner US postal contact</p>
            <address className="not-italic">
              {op.legalName}, {op.contactAddress.line1},
              {' '}{op.contactAddress.city}, {op.contactAddress.region} {op.contactAddress.postalCode},
              {' '}{op.contactAddress.country}
            </address>
            <p>
              <a href={`mailto:${op.usOfficeEmail}`} className="break-all underline decoration-[rgba(216,214,211,.35)] underline-offset-4 hover:text-[#f7f3ec]">{op.usOfficeEmail}</a>
              {' · '}<a href="tel:+12678009048" className="hover:underline">{op.usOfficePhone}</a>
            </p>
          </div>
        </div>
      </div>
      <div className="mt-6 flex flex-wrap items-center gap-5 text-[12px] text-[var(--bone-dim)]">
        <Link href="/privacy" className="underline decoration-[rgba(216,214,211,.4)] underline-offset-4 hover:text-[#f7f3ec]">Privacy Policy</Link>
        <Link href="/terms" className="underline decoration-[rgba(216,214,211,.4)] underline-offset-4 hover:text-[#f7f3ec]">Terms of Use</Link>
        <span>Direct email and messaging only — no contact form or automatic marketing signup.</span>
      </div>
    </section>
    <Footer/>
  </main>;
}
