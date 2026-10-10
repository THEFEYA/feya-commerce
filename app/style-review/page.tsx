export const instant = false;
import type {Metadata} from 'next';
import {Suspense} from 'react';
import {connection} from 'next/server';
import {notFound} from 'next/navigation';
import {Header} from '@/components/Header';
import {Footer} from '@/components/Footer';
import {OwnerDiscoveryTileStrip} from '@/components/OwnerDiscoveryTileStrip';
import {DiscoveryHubProducts} from '@/components/DiscoveryHubPage';
import {readStyleHubProducts,readStyleTileAvailability} from '@/lib/discoveryHubServer';
import {isOwnerUnifiedStorefrontPreview} from '@/lib/ownerUnifiedStorefrontPreview';
export const metadata:Metadata={title:'Style · Owner Visual Review',robots:{index:false,follow:false,nocache:true,noarchive:true}};
async function ReviewContent(){
  await connection();
  const [products,availability]=await Promise.all([readStyleHubProducts(),readStyleTileAvailability()]);
  if(!products||!availability)notFound();
  return <>
    <div className="mt-9"><OwnerDiscoveryTileStrip tiles={availability.map(x=>x.tile)}/></div>
    <section className="mt-6 border-t border-white/[.08] pb-16 pt-4">
      <DiscoveryHubProducts products={products} defaultOpenFilterSections={['Style']}/>
    </section>
  </>;
}
export default function StyleReview(){
  if(!isOwnerUnifiedStorefrontPreview(process.env))notFound();
  return <main className="visual-commerce-shell relative min-h-screen">
    <Header/>
    <section className="container-feya pt-32 pb-10 sm:pt-36 lg:pt-40">
      <p className="eyebrow-gold mb-4">Style</p>
      <h1 className="visual-display max-w-4xl text-[clamp(36px,4.4vw,60px)] leading-[1.04] tracking-[-.035em] text-[#f7f3ec]">Start from the mood.</h1>
      <p className="mt-5 max-w-2xl text-[15px] leading-7 text-[var(--bone-dim)]">Let the images lead. Every style is a useful browse shortcut, not an automatically indexed SEO page.</p>
      <Suspense fallback={<div aria-busy="true" className="min-h-[550px]"/>}><ReviewContent/></Suspense>
    </section>
    <Footer/>
  </main>;
}
