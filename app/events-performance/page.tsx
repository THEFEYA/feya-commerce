// @ts-nocheck
export const instant = true;

import type {Metadata} from 'next';
import {Suspense} from 'react';
import {notFound} from 'next/navigation';
import {connection} from 'next/server';
import {Header} from '@/components/Header';
import {Footer} from '@/components/Footer';
import {DiscoveryHubProducts,DiscoveryTileRow} from '@/components/DiscoveryHubPage';
import {EVENTS_PERFORMANCE_HUB_TILES} from '@/config/discoveryHubs';
import {readEventsPerformanceHubProducts} from '@/lib/discoveryHubServer';
import {releaseRobotsForPath} from '@/lib/searchReleaseIndexationServer';

export async function generateMetadata():Promise<Metadata>{
  return{
    title:'Events & Performance | TheFEYA',
    description:'Browse TheFEYA festival, rave, Burning Man and stage-performance collections, then continue directly into products.',
    alternates:{canonical:'/events-performance'},
    robots:await releaseRobotsForPath('/events-performance'),
  };
}

async function EventHubBody(){
  await connection();
  const products=await readEventsPerformanceHubProducts();
  if(!products)notFound();
  return <>
    <div className="mt-8 lg:mt-10"><DiscoveryTileRow tiles={EVENTS_PERFORMANCE_HUB_TILES}/></div>
    <section className="border-t border-white/[0.08] pb-14 pt-2 lg:pb-20">
      <DiscoveryHubProducts products={products}/>
    </section>
  </>;
}

export default function EventsPerformancePage(){
  return <main className="visual-commerce-shell relative min-h-screen">
    <Suspense fallback={null}><Header/></Suspense>
    <section className="container-feya pt-36 pb-8 lg:pt-44 lg:pb-10">
      <div className="max-w-4xl">
        <div className="eyebrow-gold mb-4">Events & Performance</div>
        <h1 className="visual-display text-[clamp(46px,6vw,82px)] font-medium leading-[.94] tracking-[-.045em] text-[#f7f3ec]">Dress for where you are going.</h1>
        <p className="mt-5 max-w-2xl text-[15px] leading-7 text-[#aaa2a0]">Start with the occasion, then move straight into pieces you can refine by product type, color and fit.</p>
      </div>
      <Suspense fallback={<div className="min-h-[620px]" aria-busy="true"/>}><EventHubBody/></Suspense>
    </section>
    <Footer/>
  </main>;
}
