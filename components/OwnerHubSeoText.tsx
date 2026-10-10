import Link from 'next/link';
import {ChevronDown} from 'lucide-react';

/** Buyer-first SSR content. No SEO keyword wall, no crawler-only hidden markup.
 * Review route current release noindex rules are unchanged.
 */
export function OwnerHubSeoText({kind}:{kind:'events'|'style'}){
  const events=kind==='events';
  return <section className="border-t border-white/[.10] pb-8 pt-6 sm:pt-7"
    aria-label={events?'About our event outfits':'About our costume styles'}>
    <div className="mx-auto w-full max-w-[1100px]">
      <p className="eyebrow-gold">TheFEYA · {events?'Dressing for the occasion':'Style inspiration'}</p>
      <details className="group mt-4">
        <summary aria-label={events?'Expand or collapse information about event outfits':'Expand or collapse information about styles'}
          className="flex cursor-pointer list-none items-start justify-between gap-6 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-[#d4b26a] [&::-webkit-details-marker]:hidden">
          <div className="min-w-0">
            <h2 className="text-[clamp(22px,2.7vw,32px)] font-medium leading-tight tracking-[-.02em] text-[#f7f3ec]">
              {events?'Make every occasion your own':'Find the look that feels like you'}
            </h2>
            <p className="mt-3 max-w-5xl text-[14px] leading-7 text-[var(--bone-dim)]">
              {events
                ? 'Explore handmade festival outfits, rave looks and performance costumes from TheFEYA. Discover complete statement designs or choose the individual pieces that express your style.'
                : 'Explore original costume styles from futuristic and sci-fi to glam, fantasy, goth and punk. Use the visual categories to find your direction, then choose the right piece, size and finish.'}
            </p>
          </div>
          <span className="mt-2 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/[.20] text-[#d7b974] transition-colors group-hover:border-[#d4b26a]">
            <ChevronDown size={23} strokeWidth={1.65} className="transition-transform duration-200 group-open:rotate-180" aria-hidden="true"/>
          </span>
          <span className="sr-only">More information</span>
        </summary>
        <div className="mt-6 grid gap-5 border-t border-white/[.08] pt-6 text-[14px] leading-7 text-[var(--bone-dim)] lg:grid-cols-2 lg:gap-x-10">
          {events?<>
            <p>Festival and rave outfits allow you to build a look around the occasion, from a dramatic bodysuit to sculptural shoulders, skirts, masks and smaller accents. For Burning Man-inspired styling, our catalog includes bold forms for creative desert looks. Performers and stage artists can explore designs suited to visually distinctive live shows, photoshoots and music videos.</p>
            <p>Each product is an individual TheFEYA design. Some images show a styled full look, while the available purchasing options may let you choose a separate piece, a combination or a complete set. Consult each product description for the exact contents, material, sizing, colors and production estimate rather than relying on the category photo alone.</p>
            <p>Choose a starting point from our <Link href="/collections/festival-outfits" className="text-[#e0c37d] underline underline-offset-4">Festival Outfits</Link>, <Link href="/collections/rave-outfits" className="text-[#e0c37d] underline underline-offset-4">Rave Outfits</Link>, <Link href="/collections/burning-man-outfits" className="text-[#e0c37d] underline underline-offset-4">Burning Man Looks</Link> and <Link href="/collections/performance-costumes" className="text-[#e0c37d] underline underline-offset-4">Stage & Performance</Link> collections.</p>
            <p>Find pieces that match your actual event, then refine the catalog by product type, color and fit. We specialize in memorable handmade performance and festival designs that help you express your own visual identity.</p>
          </>:<>
            <p>For a futuristic mood, explore metallic effects and sculptural construction. Cyberpunk-inspired designs can suggest a sharper, more industrial visual character, while sci-fi pieces draw on imaginative silhouettes. Glam looks, fantasy accents, gothic styling and punk elements offer different ways to put together a standout costume.</p>
            <p>These directions are browsing filters, not promises about the material or available parts of a particular outfit. TheFEYA products may be purchased as separate pieces, grouped configurations or a full set where the listing explicitly supports them. Always check the individual product options and photos before choosing.</p>
            <p>Start with a design style and refine by your preferred body piece, color or occasion. For festival or stage-specific inspiration, browse <Link href="/events-performance" className="text-[#e0c37d] underline underline-offset-4">Events & Performance</Link>. If you already know what you need, <Link href="/shop" className="text-[#e0c37d] underline underline-offset-4">shop all costumes and accessories</Link>.</p>
            <p>Our original outfits are designed for creative expression — from photoshoots and live performances to festivals and distinctive personal looks. Each look begins with the way you want to express yourself.</p>
          </>}
        </div>
      </details>
    </div>
  </section>;
}
