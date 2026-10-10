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
  return <div className="rounded-[18px] border border-[rgba(212,178,106,.24)] bg-[radial-gradient(ellipse_at_top_left,rgba(212,178,106,.09),rgba(255,255,255,.014)_70%)] p-6 sm:p-8 lg:p-10">
    <div className="grid items-center gap-7 lg:grid-cols-[minmax(0,1fr)_minmax(0,.96fr)]">
      <div>
        <Mail size={29} strokeWidth={1.45} className="text-[#d4b26a]" aria-hidden="true"/>
        <p className="eyebrow-gold mt-5">From the studio</p>
        <h2 id="newsletter-title" className="mt-3 text-[clamp(24px,3vw,34px)] font-medium text-[#f7f3ec]">Be first to discover what’s next.</h2>
        <p className="mt-3 max-w-xl text-[14px] leading-7 text-[var(--bone-dim)]">New collections, special offers and creative updates from TheFEYA, delivered to your inbox.</p>
      </div>
      <form className="space-y-3" onSubmit={e=>{e.preventDefault();setNotice(true);}}>
        <label htmlFor="feya-newsletter-email" className="block text-[12px] text-[#e1dace]">Your email address</label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input id="feya-newsletter-email" type="email" required value={email}
            onChange={e=>{setEmail(e.target.value);setNotice(false);}} placeholder="you@example.com"
            className="min-h-12 w-full min-w-0 flex-1 rounded-lg border border-white/[.20] bg-[#101014] px-4 text-[14px] text-[#f7f3ec] focus:outline-none focus:ring-2 focus:ring-[#d4b26a]"/>
          <button type="submit" className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-lg border border-[#d4b26a]/50 bg-[#d4b26a]/10 px-5 text-[13px] font-medium text-[#f3e2b8] hover:bg-[#d4b26a]/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#d4b26a]">
            Subscribe <ArrowRight size={16} aria-hidden="true"/>
          </button>
        </div>
        <label className="flex cursor-pointer items-start gap-2 text-[12px] leading-5 text-[#b6afa5]">
          <input required type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)} className="mt-1 h-4 w-4 accent-[#d4b26a]"/>
          <span>I agree to receive TheFEYA emails and can unsubscribe at any time. <Link href="/privacy" className="underline underline-offset-4">Privacy Policy</Link>.</span>
        </label>
        {notice&&<p role="status" className="text-[12px] leading-5 text-[#d0b779]">Email subscriptions are being prepared. Nothing has been stored or sent yet.</p>}
        <p className="text-[11px] leading-5 text-[#a8a097]">Email subscriptions open when our mailing service is connected.</p>
      </form>
    </div>
  </div>;
}
