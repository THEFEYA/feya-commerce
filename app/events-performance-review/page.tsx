export const instant = false;
import type {Metadata} from 'next';
import {Suspense} from 'react';
import {connection} from 'next/server';
import {notFound} from 'next/navigation';
import {Header} from '@/components/Header';
import {Footer} from '@/components/Footer';
import {OwnerHubSeoText} from '@/components/OwnerHubSeoText';
import {OwnerDiscoveryTileStrip} from '@/components/OwnerDiscoveryTileStrip';
import {DiscoveryHubProducts} from '@/components/DiscoveryHubPage';
import {EVENTS_PERFORMANCE_HUB_TILES} from '@/config/discoveryHubs';
import {readEventsPerformanceHubProducts} from '@/lib/discoveryHubServer';
import {isOwnerUnifiedStorefrontPreview} from '@/lib/ownerUnifiedStorefrontPreview';
export const metadata:Metadata={title:'Events & Performance · Owner Visual Review',robots:{index:false,follow:false,nocache:true,noarchive:true}};
async function ReviewProducts(){
  await connection();
  const started=Date.now();
  const products=await readEventsPerformanceHubProducts();
  console.info('owner_hub_catalog_timing',JSON.stringify({
    kind:'events',elapsed_ms:Date.now()-started,product_count:products?.length??0,
  }));
  if(!products)notFound();
  return <section className="owner-hub-products mt-1 border-t border-white/[.08] pb-0 pt-2">
    <DiscoveryHubProducts products={products}/>
  </section>;
}
export default function EventsPerformanceReview(){
  if(!isOwnerUnifiedStorefrontPreview(process.env))notFound();
  return <main className="visual-commerce-shell relative min-h-screen">
    <Header/>
    <section className="container-feya pt-32 pb-10 sm:pt-36 lg:pt-40">
      <p className="eyebrow-gold mb-4">Events & Performance</p>
      <h1 className="visual-display max-w-4xl text-[clamp(32px,3.8vw,50px)] leading-[1.04] tracking-[-.035em] text-[#f7f3ec]">Dress for where you are going.</h1>
      <p className="mt-5 max-w-2xl text-[15px] leading-7 text-[var(--bone-dim)]">Find a look for your next event, then shop the original pieces below.</p>
      <div className="mt-9"><OwnerDiscoveryTileStrip tiles={EVENTS_PERFORMANCE_HUB_TILES}/></div>
      <Suspense fallback={<div aria-busy="true" className="min-h-[500px]"/>}><ReviewProducts/></Suspense>
      <OwnerHubSeoText kind="events"/>
    </section>
    <Footer/>
  </main>;
}
