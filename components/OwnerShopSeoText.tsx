import Link from 'next/link';
import {ChevronDown} from 'lucide-react';

/** Component-first buyer guidance grounded in approved sellable Product DNA,
 * 2026-09-26 US/en demand snapshots, and the ACTIVE v12 search-owner graph.
 * /shop remains NOINDEX; type-specific owners remain the original collections.
 */
export function OwnerShopSeoText(){
  const anchor='font-medium text-[#ddc181] transition-colors hover:text-[#f6deb0] focus-visible:rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d4b26a]';
  return <section className="container-feya pb-8 sm:pb-10" aria-labelledby="shop-collection-guide-title">
    <div className="border-t border-white/[.10] pt-6 sm:pt-7">
      <p className="eyebrow-gold">TheFEYA · Shop by piece</p>
      <details className="group mt-4">
        <summary aria-label="Expand or collapse the guide to choosing costume pieces"
          className="flex cursor-pointer list-none items-start justify-between gap-6 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-[#d4b26a] [&::-webkit-details-marker]:hidden">
          <div className="min-w-0">
            <h2 id="shop-collection-guide-title"
              className="text-[clamp(22px,2.7vw,32px)] font-medium leading-tight tracking-[-.02em] text-[#f7f3ec]">
              Choose the piece that defines your look.
            </h2>
            <p className="mt-3 w-full text-[14px] leading-7 text-[var(--bone-dim)] sm:text-[15px]">
              Shop original handmade costume tops, shoulder armor, skirts, bodysuits and accessories by body area. Start with one standout piece or combine separate elements to create a look that feels like your own.
            </p>
          </div>
          <span className="mt-2 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/[.20] text-[#d7b974] transition-colors group-hover:border-[#d4b26a]">
            <ChevronDown size={23} strokeWidth={1.65} className="transition-transform duration-200 group-open:rotate-180" aria-hidden="true"/>
          </span>
          <span className="sr-only">More information about choosing costume components</span>
        </summary>
        <div className="mt-5 grid gap-5 border-t border-white/[.08] pt-5 text-[14px] leading-7 text-[var(--bone-dim)] sm:text-[15px] lg:grid-cols-2 lg:gap-x-9">
          <div>
            <h3 className="mb-2 text-[17px] font-medium text-[#f7f3ec]">Tops, shoulder armor and harnesses</h3>
            <p>
              Make <Link href="/collections/shoulder-armor" className={anchor}>shoulder armor</Link> the focal point of a dramatic silhouette, or start with <Link href="/shop?piece=Tops%20%26%20Bras" className={anchor}>costume tops and bra tops</Link> for a more flexible base. For a different shape, explore <Link href="/shop?piece=Corset" className={anchor}>corsets</Link> and <Link href="/shop?piece=Harness" className={anchor}>fashion harnesses</Link>. Every design has its own components: check the listing to see which pieces can be ordered individually.
            </p>
          </div>
          <div>
            <h3 className="mb-2 text-[17px] font-medium text-[#f7f3ec]">Skirts, bodysuits and waist details</h3>
            <p>
              Build from <Link href="/shop?piece=Skirt" className={anchor}>costume skirts</Link> and other separates, or choose a <Link href="/collections/bodysuits" className={anchor}>costume bodysuit</Link> as a single-piece starting point. Our <Link href="/collections/festival-skirts" className={anchor}>festival skirts</Link> offer another route to a layered look; <Link href="/collections/costume-belts" className={anchor}>costume belts</Link> can provide a finishing detail. A photograph may show a full styled outfit, so always check what the selected option actually includes.
            </p>
          </div>
          <div>
            <h3 className="mb-2 text-[17px] font-medium text-[#f7f3ec]">Arms, masks and headpieces</h3>
            <p>
              Smaller pieces can make an outfit more personal. Compare <Link href="/shop?piece=Bracelet%20%2F%20Cuff" className={anchor}>bracelets and arm cuffs</Link>, then explore sculptural <Link href="/collections/costume-headpieces" className={anchor}>costume headpieces</Link> and <Link href="/collections/costume-masks" className={anchor}>costume masks</Link>. TheFEYA designs feature expressive shapes and reflective effects, with the exact colors, materials and details stated on each product page.
            </p>
          </div>
          <div>
            <h3 className="mb-2 text-[17px] font-medium text-[#f7f3ec]">Fit, finishes and what comes in a set</h3>
            <p>
              Each handmade piece begins with our original design, with available adjustments depending on the model. Some products offer a complete set; others offer individual items or grouped options. Check the <Link href="/size-guide" className={anchor}>measurements and sizing guide</Link>, compare the selected variant and read our <Link href="/shipping" className={anchor}>production and delivery information</Link> before ordering. If you prefer to start with an occasion rather than a body piece, visit <Link href="/events-performance" className={anchor}>Events &amp; Performance</Link>.
            </p>
          </div>
        </div>
      </details>
    </div>
  </section>;
}
