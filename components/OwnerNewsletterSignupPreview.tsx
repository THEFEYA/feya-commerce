'use client';

import Link from 'next/link';
import {useState} from 'react';
import {Mail,ArrowRight} from 'lucide-react';

/** Subscriber transport is intentionally not active before a consented CRM exists.
 * Never pretend to save consent, issue a coupon, or send an email.
 */
export function OwnerNewsletterSignupPreview(){
  const [email,setEmail]=useState('');
  const [consent,setConsent]=useState(false);
  const [notice,setNotice]=useState(false);
  return <div data-testid="owner-newsletter-panel" className="w-full max-w-full min-w-0 rounded-[18px] border border-[rgba(212,178,106,.24)] bg-[radial-gradient(ellipse_at_top_left,rgba(212,178,106,.09),rgba(255,255,255,.014)_70%)] px-5 py-5 sm:px-7 sm:py-6 lg:px-8 lg:py-6">
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] items-center gap-5 lg:grid-cols-[minmax(0,.82fr)_minmax(0,1.18fr)] lg:gap-8">
      <div>
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[rgba(212,178,106,.20)] bg-[rgba(212,178,106,.05)] text-[#d4b26a]">
            <Mail size={23} strokeWidth={1.5} aria-hidden="true"/>
          </span>
          <div className="min-w-0 flex-1">
            <p className="eyebrow-gold">From the studio</p>
            <h2 id="newsletter-title" className="mt-1.5 text-[clamp(22px,2.5vw,28px)] font-medium leading-tight text-[#f7f3ec]">Be first to discover what’s next.</h2>
          </div>
        </div>
        <p className="mt-2 text-[13px] leading-6 text-[var(--bone-dim)]">
          New collections, special offers and creative updates from TheFEYA, delivered to your inbox.
        </p>
      </div>
      <p role="status" className="text-[12px] leading-5 text-[#d0b779]">
        Newsletter subscriptions are coming soon. No email addresses are being collected or stored here yet.
      </p>
      <form aria-disabled="true" className="min-w-0 max-w-full space-y-3" onSubmit={e=>{e.preventDefault();setNotice(true);}}>
        <label htmlFor="feya-newsletter-email" className="block text-[12px] text-[#e1dace]">Your email address</label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input id="feya-newsletter-email" type="email" disabled value={email}
            onChange={e=>{setEmail(e.target.value);setNotice(false);}} placeholder="you@example.com"
            className="min-h-12 w-full min-w-0 flex-1 rounded-lg border border-white/[.20] bg-[#101014] px-4 text-[14px] text-[#f7f3ec] focus:outline-none focus:ring-2 focus:ring-[#d4b26a]"/>
          <button type="submit" disabled className="inline-flex min-h-12 shrink-0 cursor-not-allowed opacity-65 items-center justify-center gap-2 rounded-lg border border-[#d4b26a]/50 bg-[#d4b26a]/10 px-5 text-[13px] font-medium text-[#f3e2b8] hover:bg-[#d4b26a]/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#d4b26a]">
            Coming soon <ArrowRight size={16} aria-hidden="true"/>
          </button>
        </div>
        <label className="flex cursor-pointer items-start gap-2 text-[12px] leading-5 text-[#b6afa5]">
          <input disabled type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)} className="mt-1 h-4 w-4 accent-[#d4b26a]"/>
          <span>I agree to receive TheFEYA emails and can unsubscribe at any time. <Link href="/privacy" className="underline underline-offset-4">Privacy Policy</Link>.</span>
        </label>
        {notice&&<p role="status" className="text-[12px] leading-5 text-[#d0b779]">Email subscriptions are being prepared. Nothing has been stored or sent yet.</p>}

      </form>
    </div>
  </div>;
}
