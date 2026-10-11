import Link from 'next/link';
import {
  ArrowUpRight,Mail,MessageCircle,Phone,Instagram,Facebook,Pin,
  MapPinned,Send,ShieldCheck,
} from 'lucide-react';
import {Header} from '@/components/Header';
import {Footer} from '@/components/Footer';
import {SELLER_ONLINE_PROVIDER} from '@/lib/sellerOnlineProvider';
import {CopySupportEmailButton} from '@/components/CopySupportEmailButton';
import {OwnerLocationMapPreview} from '@/components/OwnerLocationMapPreview';
import {OwnerContactFormPreview} from '@/components/OwnerContactFormPreview';
import {OwnerNewsletterSignupPreview} from '@/components/OwnerNewsletterSignupPreview';

const contactEmail='manager.feya@gmail.com';
const supportPhone='+380636556288';
const socialReview=[
  {id:'instagram-1',label:'Instagram',Icon:Instagram},
  {id:'facebook',label:'Facebook',Icon:Facebook},
  {id:'pinterest',label:'Pinterest',Icon:Pin},
] as const;
// Account links pending owner verification: show real platform icons, no fake URLs.

export function ContactExperience2026(){
  const op=SELLER_ONLINE_PROVIDER;
  return <main className="visual-commerce-shell relative min-h-screen">
    <Header/>
    <section className="container-feya pt-20 pb-7 sm:pt-24 lg:pt-24 lg:pb-9">
      <div className="max-w-4xl">
        <p className="eyebrow-gold mb-4">TheFEYA · Get in touch</p>
        <h1 className="visual-display text-[clamp(34px,4vw,54px)] leading-[1.04] tracking-[-.035em] text-[#f7f3ec]">Contact</h1>
        <p className="mt-4 text-[15px] leading-7 text-[var(--bone-dim)]">
          Questions about a design, your size or your order? We would love to hear from you.
        </p>
      </div>
    </section>

    <section className="container-feya pb-10 lg:pb-14" aria-label="Contact TheFEYA">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,.85fr)_minmax(0,1.15fr)] lg:items-stretch">
        <div className="rounded-[18px] border border-[rgba(216,214,211,.16)] bg-[radial-gradient(ellipse_at_top_left,rgba(212,178,106,.055),rgba(255,255,255,.018)_60%)] p-6 sm:p-8">
          <p className="eyebrow-gold">TheFEYA support</p>
          <h2 className="mt-3 text-[clamp(23px,2.7vw,31px)] font-medium text-[#f7f3ec]">We are here to help.</h2>
          <p className="mt-3 text-[14px] leading-6 text-[var(--bone-dim)]">Our studio can help you choose a design, confirm details or answer a question about an existing order.</p>

          <div className="mt-8 space-y-6">
            <div>
              <p className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[.16em] text-[#d9b873]"><Mail size={18} aria-hidden="true"/> Email the studio</p>
              <div className="mt-2 flex min-w-0 items-center gap-1">
                <a href={`mailto:${contactEmail}`} className="min-w-0 break-all text-[15px] text-[#f7f3ec] underline decoration-[rgba(212,178,106,.35)] underline-offset-4 hover:text-[#e3cb93] sm:text-[16px]">{contactEmail}</a>
                <CopySupportEmailButton email={contactEmail}/>
              </div>
            </div>
            <div>
              <p className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[.16em] text-[#d9b873]"><Phone size={18} aria-hidden="true"/> Phone & messaging</p>
              <div className="mt-2 flex items-center gap-1">
                <a href={`tel:${supportPhone}`} className="text-[16px] text-[#f7f3ec] hover:text-[#e3cb93]">+380 63 655 62 88</a>
                <CopySupportEmailButton email={supportPhone} label="phone number"/>
              </div>
              <a href="https://wa.me/380636556288" target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full border border-[rgba(212,178,106,.30)] bg-[rgba(212,178,106,.065)] px-5 text-[13px] font-medium text-[#f7f3ec] hover:border-[#d4b26a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#d4b26a]">
                <MessageCircle size={18} aria-hidden="true"/> WhatsApp <ArrowUpRight size={15} aria-hidden="true"/>
              </a>
            </div>
          </div>
          <div className="mt-4 border-t border-white/[.10] pt-4" aria-label="Contact and social media">
          <div className="mt-1" aria-label="TheFEYA social profiles">
            <span className="text-[11px] uppercase tracking-[.16em] text-[#aaa39a]">Follow TheFEYA</span>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-3">
              {socialReview.map(({id,label,Icon})=><span key={id} aria-label={label}
                className="inline-flex items-center gap-2 text-[12px] text-[#c5bdb3]" title={label}>
                <Icon size={22} strokeWidth={1.7} aria-hidden="true"/>{label}
              </span>)}
            </div>
          </div>
          </div>
        </div>

        <div className="rounded-[18px] border border-[rgba(212,178,106,.24)] bg-[rgba(255,255,255,.027)] p-6 sm:p-8" aria-labelledby="contact-message-heading">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[#d4b26a]/20 bg-[#d4b26a]/[.075] text-[#d4b26a]"><Send size={24} strokeWidth={1.5} aria-hidden="true"/></div>
            <div>
              <p className="eyebrow-gold">Your message</p>
              <h2 id="contact-message-heading" className="mt-2 text-[clamp(22px,2.4vw,29px)] font-medium text-[#f7f3ec]">Ask us a question.</h2>
            </div>
          </div>
          <OwnerContactFormPreview/>
        </div>
      </div>
    </section>

    <section className="container-feya pb-12 lg:pb-16" aria-label="Where we work">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div><p className="eyebrow-gold">Studio & logistics</p><h2 className="mt-2 text-[clamp(22px,2.7vw,31px)] font-medium text-[#f7f3ec]">Explore our locations</h2></div>
        <p className="max-w-sm text-[12px] leading-5 text-[var(--bone-dim)]">Maps are interactive and load only when you choose to view them.</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-[16px] border border-white/[.14] bg-white/[.016] p-5 sm:p-6">
          <div className="flex items-center gap-2 text-[#d4b26a]"><MapPinned size={22} aria-hidden="true"/><span className="text-[10px] uppercase tracking-[.16em]">Ukraine · showroom reference</span></div>
          <h3 className="mt-3 text-[21px] text-[#f7f3ec]">Фея-Портупея</h3>
          <p className="mt-1 text-[13px] text-[var(--bone-dim)]">Харківське шосе, 19, Київ, Україна</p>
          <OwnerLocationMapPreview location="kyiv"/>
          <p className="mt-3 text-[12px] leading-5 text-[var(--bone-dim)]">Please contact TheFEYA before planning a visit. The current public listing and visiting hours still require confirmation.</p>
        </article>
        <article className="rounded-[16px] border border-white/[.14] bg-white/[.016] p-5 sm:p-6">
          <div className="flex items-center gap-2 text-[#d4b26a]"><MapPinned size={22} aria-hidden="true"/><span className="text-[10px] uppercase tracking-[.16em]">United States · partner warehouse</span></div>
          <h3 className="mt-3 text-[21px] text-[#f7f3ec]">US fulfillment partner</h3>
          <p className="mt-1 text-[13px] text-[var(--bone-dim)]">635 Somers Ave, Feasterville-Trevose, PA 19053, USA</p>
          <OwnerLocationMapPreview location="us-warehouse"/>
          <p className="mt-3 text-[12px] leading-5 text-[var(--bone-dim)]">Partner fulfillment address, not a TheFEYA showroom. Any US-based dispatch depends on exact verified product availability.</p>
        </article>
      </div>
    </section>

    <section className="container-feya pb-4 lg:pb-5" aria-labelledby="newsletter-title">
      <OwnerNewsletterSignupPreview/>
    </section>

    <section className="container-feya pb-5 lg:pb-6" aria-labelledby="payment-operator-heading">
      <div className="px-0 py-1">
        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <h2 id="payment-operator-heading" className="text-[11px] font-medium tracking-[.10em] text-[#89837b]">Payment & shipping partner details</h2>
            <p className="mt-2 text-[12px] leading-6 text-[#817b74]">
              {op.legalName} is a designated payment and logistics partner for planned online checkout. Online payments on thefeya.com are not active yet.
            </p>
            <p className="mt-1 text-[11px] leading-5 text-[#817b74]">Partner details are provided for transparency and are not the contact for product support or confirmation of the legal seller.</p>
          </div>
          <div className="text-[12px] leading-6 text-[#817b74]">
            <p>{op.legalName}, {op.contactAddress.line1}, {op.contactAddress.city}, {op.contactAddress.region} {op.contactAddress.postalCode}, {op.contactAddress.country}</p>
            <p className="break-all">{op.usOfficeEmail} · {op.usOfficePhone}</p>
          </div>
        </div>
        <div className="mt-2 flex flex-wrap gap-5 text-[12px] text-[#817b74]">
          <Link href="/privacy" className="underline underline-offset-4 hover:text-white">Privacy Policy</Link>
          <Link href="/terms" className="underline underline-offset-4 hover:text-white">Terms of Use</Link>
        </div>
      </div>
    </section>
    <Footer/>
  </main>;
}
