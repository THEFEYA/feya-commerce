export const instant = false;

import type {Metadata} from 'next';
import {notFound} from 'next/navigation';
import {Header} from '@/components/Header';
import {Footer} from '@/components/Footer';
import {BuyerCheckoutReviewClient,type CheckoutVisualReviewProduct} from '@/components/BuyerCheckoutReviewClient';
import {readCachedApprovedStorefrontCatalogV1} from '@/lib/storefrontCatalogCacheServer';

/** Owner visual review ONLY. All real transactions remain /cart with the
 * existing blocked noindex checkout; production /checkout-review always 404.
 * Only approved live card catalog prices/media are shown, not fake sample SKUs.
 */
export const metadata:Metadata={
  title:'TheFEYA · Bag Visual Review',
  description:'Unlisted visual-only checkout composition; does not create orders or accept payment.',
  robots:{index:false,follow:false,noarchive:true,nocache:true},
};

async function approvedCardSamples():Promise<CheckoutVisualReviewProduct[]>{
  try{
    const catalog=await readCachedApprovedStorefrontCatalogV1();
    return catalog
      .filter(p=>p.currency==='EUR'&&
        typeof p.product_slug==='string'&&p.product_slug.length>0&&
        typeof p.card_title==='string'&&p.card_title.length>0&&
        typeof p.primary_image_url==='string'&&/^https:\/\//.test(p.primary_image_url)&&
        typeof p.full_set_display_price_amount==='number'&&
        Number.isFinite(p.full_set_display_price_amount)&&p.full_set_display_price_amount>0&&
        p.full_set_display_price_amount<1_000_000)
      .slice(0,3)
      .map(p=>({
        canonical_product_id:p.canonical_product_id,
        product_slug:p.product_slug!,
        card_title:p.card_title!,
        primary_image_url:p.primary_image_url!,
        display_price_eur:p.full_set_display_price_amount!,
      }));
  }catch{return [];}
}

export default async function CheckoutReviewPage(){
  if(process.env.VERCEL_ENV!=='preview'&&process.env.NODE_ENV==='production')notFound();
  const products=await approvedCardSamples();
  return <main className="visual-commerce-shell relative min-h-screen">
    <Header/>
    <section className="container-feya pt-32 pb-9 sm:pt-36 lg:pt-44 lg:pb-14">
      <p className="eyebrow-gold">Owner visual review · Not live checkout</p>
      <h1 className="visual-display mt-4 text-[clamp(46px,6vw,82px)] font-medium leading-[.95] tracking-[-.045em] text-[#f7f3ec]">
        Your Bag
      </h1>
      <p className="mt-5 max-w-2xl text-[15px] leading-7 text-[var(--bone-dim)]">
        Review the layout, service choices and order summary before the payment integration is activated.
        All amounts here are illustrative; no order can be placed.
      </p>
    </section>
    <BuyerCheckoutReviewClient products={products} catalogAvailable={products.length>0}/>
    <Footer/>
  </main>;
}
