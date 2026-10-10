import Link from 'next/link';

/** Human-first content with real SSR markup, not a crawler-only keyword wall.
 * Hub routes remain under their current Search Release indexation policy.
 * This is only the protected owner's content proposal.
 */
export function OwnerHubSeoText({kind}:{kind:'events'|'style'}){
  const events=kind==='events';
  return <section className="mt-9 border-t border-white/[.10] pt-8 pb-8" aria-label={events?'More about event outfits':'More about costume styles'}>
    <div className="mx-auto max-w-4xl">
      <p className="eyebrow-gold">TheFEYA · {events?'Events & Performance':'Style discovery'}</p>
      <h2 className="mt-3 text-[clamp(22px,2.6vw,31px)] font-medium text-[#f7f3ec]">
        {events?'Find the right outfit for your moment':'Explore the design direction that feels like you'}
      </h2>
      <p className="mt-3 text-[14px] leading-7 text-[var(--bone-dim)]">
        {events
          ? 'Explore original stage, festival and performance outfits, from complete statement looks to individual costume pieces that can be combined around your plans.'
          : 'Explore TheFEYA costumes by visual character: futuristic, cyberpunk-inspired, glam, sci-fi, post-apocalyptic, fantasy, goth and punk. Choose a mood first, then refine by the piece, material or color you want.'}
      </p>
      <details className="group mt-5 rounded-xl border border-white/[.14] bg-white/[.018] px-5 py-4">
        <summary className="cursor-pointer select-none text-[13px] font-medium text-[#e3cf9d] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d4b26a]">
          {events?'Read more about event and stage outfits':'Read more about styling your outfit'}
        </summary>
        <div className="mt-5 space-y-4 text-[14px] leading-7 text-[var(--bone-dim)]">
          {events?<>
            <p>Different occasions call for different kinds of statement wear. Festival and rave looks may combine a dramatic bodysuit, shoulder pieces, accessories and an expressive skirt. Burning Man outfits can favor sculptural silhouettes for a desert-event setting; stage and performance costumes are often chosen for their visual presence in photography, video and live shows.</p>
            <p>Start with the occasion, then open an individual product page to confirm what is actually included. Some photographs show an entire styled outfit while the purchasing options allow separate pieces or a full set. Materials, sizes, permitted colors and production timing always belong to the specific listing, rather than being assumed from the category image.</p>
            <p>Explore our <Link href="/collections/festival-outfits" className="underline text-[#e0c37d]">Festival Outfits</Link>, <Link href="/collections/rave-outfits" className="underline text-[#e0c37d]">Rave Outfits</Link> or <Link href="/collections/performance-costumes" className="underline text-[#e0c37d]">Stage & Performance</Link> collections, then narrow your choice by actual design and configuration.</p>
          </>:<>
            <p>Futuristic and sci-fi styling can emphasize metallic shapes, clean symmetry and sculptural detail, while cyberpunk-inspired outfits take on a sharper, more industrial mood. Glam and show-oriented looks may lean toward expressive decorative pieces. Goth, punk and post-apocalyptic directions each suggest a different aesthetic, but no style label changes the physical contents of a product.</p>
            <p>Use the style tiles above as visual browsing shortcuts, not a promise that every piece in a scene is sold together. When you choose a product, read its individual description, available sizes, materials and configurations. A coordinated appearance may be available as individual accessories, combined options or a full set depending on the listing.</p>
            <p>Our style catalog is intended to help you discover an original TheFEYA design that reflects your own aesthetic. For inspiration by practical occasion, explore <Link href="/events-performance" className="underline text-[#e0c37d]">Events & Performance</Link>; if you already know which piece you want, return to <Link href="/shop" className="underline text-[#e0c37d]">Shop by piece</Link>.</p>
          </>}
        </div>
      </details>
    </div>
  </section>;
}
