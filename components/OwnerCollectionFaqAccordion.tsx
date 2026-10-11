import {ChevronDown} from 'lucide-react';
import type {SearchLandingFaqItem} from '@/lib/searchLandingPageServer';

/** Native keyboard-accessible disclosure, server-rendered with the full
 * original release-approved question and answer text unchanged.
 * This component is used only on the exact private owner visual review branch.
 */
export function OwnerCollectionFaqAccordion({faq}:{faq:readonly SearchLandingFaqItem[]}){
  return <div className="mt-4 divide-y divide-[rgba(216,214,211,.12)] border-y border-[rgba(216,214,211,.12)]">
    {faq.map((item,i)=><details key={item.q+'-'+i} className="group">
      <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-4 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d4b26a] [&::-webkit-details-marker]:hidden">
        <span className="text-[16px] leading-6 text-[#f7f3ec] sm:text-[18px]">{item.q}</span>
        <ChevronDown size={19} strokeWidth={1.7} aria-hidden="true"
          className="shrink-0 text-[#c3ad7d] transition-transform duration-200 group-open:rotate-180"/>
      </summary>
      <p className="max-w-4xl pb-5 pr-7 text-[14px] leading-7 text-[var(--bone-dim)] sm:text-[15px]">{item.a}</p>
    </details>)}
  </div>;
}
