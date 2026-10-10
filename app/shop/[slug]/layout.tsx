import Link from 'next/link';
import type {ReactNode} from 'react';
import {Footer} from '@/components/Footer';
import {isOwnerUnifiedStorefrontPreview,OWNER_VISUAL_V2_REVIEW_BRANCH} from '@/lib/ownerUnifiedStorefrontPreview';
import './ownerPdpPolishV2.css';

/** Owner-only presentation wrapper. The original ProductDetailClient + source
 * pins + right-side price/options/media remain byte-frozen; production output
 * is unchanged until a separately approved visual release.
 */
export default function ProductReviewLayout({children}:{children:ReactNode}){
  const review=isOwnerUnifiedStorefrontPreview(process.env)
    &&process.env.VERCEL_GIT_COMMIT_REF===OWNER_VISUAL_V2_REVIEW_BRANCH;
  if(!review)return children;
  return <div className="owner-pdp-polish-v2">
    {children}
    <section className="container-feya border-t border-white/[.10] py-10 lg:py-14" aria-labelledby="pdp-support-title">
      <p className="eyebrow-gold">TheFEYA · Customer care</p>
      <h2 id="pdp-support-title" className="mt-3 text-[clamp(22px,2.6vw,32px)] text-[#f7f3ec]">Questions before you choose?</h2>
      <p className="mt-3 max-w-2xl text-[14px] leading-7 text-[var(--bone-dim)]">
        Compare sizes and configurations, learn about delivery or ask the studio for available real product photographs.
      </p>
      <nav aria-label="Product support" className="mt-5 flex flex-wrap gap-3 text-[12px]">
        <Link href="/size-guide-review" className="btn-ghost">Size guide</Link>
        <Link href="/shipping-review" className="btn-ghost">Shipping</Link>
        <Link href="/returns-review" className="btn-ghost">Returns</Link>
        <Link href="/contact-review" className="btn-chrome">Contact our studio</Link>
      </nav>
    </section>
    <Footer/>
  </div>;
}
