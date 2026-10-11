import Link from 'next/link';
import {ChevronDown} from 'lucide-react';

/** Shop is a NOINDEX catalog in Search Release v12.
 * This server-rendered buyer guide connects browse journeys to the exact
 * 10 existing indexable collection owners. It does not claim new primary
 * query ownership or fabricate Keyword Planner ranking metrics.
 */
export function OwnerShopSeoText(){
  const linkClass='text-[#e0c37d] underline underline-offset-4 hover:text-[#f7f3ec]';
  return <section className="container-feya pb-8 sm:pb-10" aria-labelledby="shop-collection-guide-title">
    <div className="border-t border-white/[.10] pt-6 sm:pt-7">
      <p className="eyebrow-gold">TheFEYA · Find your look</p>
      <details className="group mt-4">
        <summary aria-label="Expand or collapse the TheFEYA collection guide"
          className="flex cursor-pointer list-none items-start justify-between gap-6 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-[#d4b26a] [&::-webkit-details-marker]:hidden">
          <div className="min-w-0">
            <h2 id="shop-collection-guide-title"
              className="text-[clamp(22px,2.7vw,32px)] font-medium leading-tight tracking-[-.02em] text-[#f7f3ec]">
              Create a look that is unmistakably yours.
            </h2>
            <p className="mt-3 w-full text-[14px] leading-7 text-[var(--bone-dim)] sm:text-[15px]">
              Discover handmade festival outfits, rave looks and stage costumes from TheFEYA. Start with an occasion or build your own combination of sculptural shoulder armor, bodysuits and accessories.
            </p>
          </div>
          <span className="mt-2 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/[.20] text-[#d7b974] transition-colors group-hover:border-[#d4b26a]">
            <ChevronDown size={23} strokeWidth={1.65}
              className="transition-transform duration-200 group-open:rotate-180"
              aria-hidden="true"/>
          </span>
          <span className="sr-only">More information about the collection</span>
        </summary>
        <div className="mt-5 grid gap-4 border-t border-white/[.08] pt-5 text-[14px] leading-7 text-[var(--bone-dim)] sm:text-[15px] lg:grid-cols-2 lg:gap-x-8">
          <p>
            Dressing for an event? Browse our <Link href="/collections/festival-outfits" className={linkClass}>festival outfits</Link> or <Link href="/collections/rave-outfits" className={linkClass}>rave outfits</Link> for electronic-music nights and expressive looks. Discover sculptural <Link href="/collections/burning-man-outfits" className={linkClass}>Burning Man outfits</Link> for desert-event styling, or explore <Link href="/collections/performance-costumes" className={linkClass}>stage and performance costumes</Link> for live shows, artists and photoshoots. Each collection has its own designs and product options.
          </p>
          <p>
            Prefer individual pieces? Start with <Link href="/collections/shoulder-armor" className={linkClass}>shoulder armor</Link>, <Link href="/collections/bodysuits" className={linkClass}>costume bodysuits</Link>, <Link href="/collections/costume-headpieces" className={linkClass}>costume headpieces</Link> or <Link href="/collections/costume-masks" className={linkClass}>costume masks</Link>. For finishing touches, compare <Link href="/collections/costume-belts" className={linkClass}>costume belts</Link> and <Link href="/collections/festival-skirts" className={linkClass}>festival skirts</Link>. Choose a shape and visual effect that work together rather than assuming every photographed piece is part of the same purchase.
          </p>
          <p>
            TheFEYA creates original handmade stage and festival designs with metallic, mirror-like and sculptural effects. Materials and construction vary between products. Some listings offer a complete set; others let you select separate components or a smaller combination. Check the specific product page for what is included, available colors, sizes and the current price before choosing.
          </p>
          <p>
            Looking for a particular fit? Use our <Link href="/size-guide" className={linkClass}>measurements and sizing guide</Link> before ordering, or ask the studio about supported adjustments. Designs are typically made to order, with production time depending on the piece. Our <Link href="/shipping" className={linkClass}>shipping information</Link> explains the current delivery options. Start with the piece that feels right, then make the full look your own.
          </p>
        </div>
      </details>
    </div>
  </section>;
}
