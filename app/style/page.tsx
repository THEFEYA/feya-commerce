export const instant = true;

import type {Metadata} from 'next';
import {Suspense} from 'react';
import {notFound} from 'next/navigation';
import {connection} from 'next/server';
import {Header} from '@/components/Header';
import {Footer} from '@/components/Footer';
import {DiscoveryHubProducts,DiscoveryTileRow} from '@/components/DiscoveryHubPage';
import {readStyleHubProducts,readStyleTileAvailability} from '@/lib/discoveryHubServer';
import {releaseRobotsForPath} from '@/lib/searchReleaseIndexationServer';

export async function generateMetadata():Promise<Metadata>{
  return{
    title:'Shop by Style | TheFEYA',
    description:'Browse TheFEYA by visual direction, from glam and futuristic to cyberpunk, fantasy and goth, then refine the product grid.',
    alternates:{canonical:'/style'},
    robots:await releaseRobotsForPath('/style'),
  };
}

async function StyleHubBody(){
  await connection();
  const [products,availability]=await Promise.all([
    readStyleHubProducts(),
    readStyleTileAvailability(),
  ]);
  if(!products||!availability)notFound();
  const tiles=availability.map((entry)=>entry.tile);
  return <>
    <div className="mt-8 lg:mt-10"><DiscoveryTileRow tiles={tiles}/></div>
    <section className="border-t border-white/[0.08] pb-14 pt-2 lg:pb-20">
      <DiscoveryHubProducts products={products} defaultOpenFilterSections={['Style']}/>
    </section>
  </>;
}

export default function StyleHubPage(){
  return <main className="visual-commerce-shell relative min-h-screen">
    <Suspense fallback={null}><Header/></Suspense>
    <section className="container-feya pt-36 pb-8 lg:pt-44 lg:pb-10">
      <div className="max-w-4xl">
        <div className="eyebrow-gold mb-4">Style</div>
        <h1 className="visual-display text-[clamp(46px,6vw,82px)] font-medium leading-[.94] tracking-[-.045em] text-[#f7f3ec]">Start from the mood.</h1>
        <p className="mt-5 max-w-2xl text-[15px] leading-7 text-[#aaa2a0]">Choose a visual direction, then refine the pieces without turning every style into a separate search page.</p>
      </div>
      <Suspense fallback={<div className="min-h-[620px]" aria-busy="true"/>}><StyleHubBody/></Suspense>
    </section>
    <Footer/>
  </main>;
}
