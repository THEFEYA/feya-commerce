export const instant = false;
import type {Metadata} from 'next';
import {Suspense} from 'react';
import {connection} from 'next/server';
import {notFound} from 'next/navigation';
import {Header} from '@/components/Header';
import {Footer} from '@/components/Footer';
import {OwnerHubSeoText} from '@/components/OwnerHubSeoText';
import {OwnerHubCatalogSkeleton} from '@/components/OwnerHubCatalogSkeleton';
import {OwnerDiscoveryTileStrip} from '@/components/OwnerDiscoveryTileStrip';
import {DiscoveryHubProducts} from '@/components/DiscoveryHubPage';
import {STYLE_HUB_TILES} from '@/config/discoveryHubs';
import {readStyleHubProducts} from '@/lib/discoveryHubServer';
import {isOwnerUnifiedStorefrontPreview} from '@/lib/ownerUnifiedStorefrontPreview';

export const metadata:Metadata={title:'Style · Owner Visual Review',robots:{index:false,follow:false,nocache:true,noarchive:true}};

async function ReviewProducts(){
  await connection();
  // One cached catalogue lookup; availability is not independently refetched.
  const started=Date.now();
  const products=await readStyleHubProducts();
  console.info('owner_hub_catalog_timing',JSON.stringify({
    kind:'style',elapsed_ms:Date.now()-started,product_count:products?.length??0,
  }));
  if(!products)notFound();
  return <section className="owner-hub-products mt-1 border-t border-white/[.08] pb-0 pt-2">
    <DiscoveryHubProducts products={products} defaultOpenFilterSections={['Style']}/>
  </section>;
}

export default function StyleReview(){
  if(!isOwnerUnifiedStorefrontPreview(process.env))notFound();
  return <main className="visual-commerce-shell relative min-h-screen">
    <Header/>
    <section className="container-feya pt-32 pb-10 sm:pt-36 lg:pt-40">
      <p className="eyebrow-gold mb-4">Style</p>
      <h1 className="visual-display max-w-4xl text-[clamp(32px,3.8vw,50px)] leading-[1.04] tracking-[-.035em] text-[#f7f3ec]">Start from the mood.</h1>
      <p className="mt-5 max-w-2xl text-[15px] leading-7 text-[var(--bone-dim)]">Let the images lead. Every style is a useful browse shortcut, not an automatically indexed SEO page.</p>
      {/* All eight configured style tiles have matching items in the current
          207-product approved catalogue. Stream images immediately instead of
          waiting for a catalog fetch that previously yielded blank 550px. */}
      <div className="mt-9"><OwnerDiscoveryTileStrip tiles={STYLE_HUB_TILES}/></div>
      <Suspense fallback={<OwnerHubCatalogSkeleton/>}><ReviewProducts/></Suspense>
      <OwnerHubSeoText kind="style"/>
    </section>
    <Footer/>
  </main>;
}
