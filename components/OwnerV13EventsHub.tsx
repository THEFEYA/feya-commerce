export const instant = false;
import {Suspense} from 'react';
import {connection} from 'next/server';
import {Header} from '@/components/Header';
import {Footer} from '@/components/Footer';
import {OwnerHubSeoText} from '@/components/OwnerHubSeoText';
import {OwnerHubCatalogSkeleton} from '@/components/OwnerHubCatalogSkeleton';
import {OwnerDiscoveryTileStrip} from '@/components/OwnerDiscoveryTileStrip';
import {DiscoveryHubProducts} from '@/components/DiscoveryHubPage';
import {OWNER_EVENTS_HUB_TILES} from '@/config/ownerDiscoveryTilesV8';
import {readEventsPerformanceHubProducts} from '@/lib/discoveryHubServer';
async function ReviewProducts(){
  await connection();
  const started=Date.now();
  const products=await readEventsPerformanceHubProducts().catch(()=>null);
  console.info('owner_hub_catalog_timing',JSON.stringify({
    kind:'events',elapsed_ms:Date.now()-started,product_count:products?.length??0,
  }));
  if(!products)return <section className="owner-hub-products py-8 text-[14px] text-[var(--bone-dim)]" role="status">The catalogue is temporarily unavailable. Please try again shortly.</section>;
  return <section className="owner-hub-products mt-1 border-t border-white/[.08] pb-0 pt-2">
    <DiscoveryHubProducts products={products}/>
  </section>;
}
export default function OwnerV13EventsHub(){
  return <main className="visual-commerce-shell relative min-h-screen">
    <Header/>
    <section className="container-feya pt-20 pb-8 sm:pt-24 lg:pt-24 lg:pb-8">
      <p className="eyebrow-gold mb-4">Events & Performance</p>
      <h1 className="visual-display max-w-4xl text-[clamp(32px,3.8vw,50px)] leading-[1.04] tracking-[-.035em] text-[#f7f3ec]">Dress for where you are going.</h1>
      <p className="mt-5 max-w-2xl text-[15px] leading-7 text-[var(--bone-dim)]">Find a look for your next event, then shop the original pieces below.</p>
      <div className="mt-9"><OwnerDiscoveryTileStrip tiles={OWNER_EVENTS_HUB_TILES}/></div>
      <Suspense fallback={<OwnerHubCatalogSkeleton/>}><ReviewProducts/></Suspense>
      <OwnerHubSeoText kind="events"/>
    </section>
    <Footer/>
  </main>;
}
