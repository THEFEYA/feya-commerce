export const instant = false;
import type {Metadata} from 'next';
import {connection} from 'next/server';
import {notFound} from 'next/navigation';
import {Header} from '@/components/Header';
import {Footer} from '@/components/Footer';
import AiLookPreviewClient from '@/components/AiLookPreviewClient';
import {isAiLookOwnerPreview,isAiLookGenerationConfigured} from '@/lib/aiLookPreviewPolicy';
import {aiLookCatalog,aiLookReadApprovedListing,AI_LOOK_DEFAULT_SLUG} from '@/lib/aiLookPreviewCatalogServer';
import './preview.css';

export const metadata:Metadata={
 title:'See it on you | FEYA AI Look Preview Beta',
 description:'Private owner evaluation of personalized FEYA visual look previews.',
 robots:{index:false,follow:false,noarchive:true,nocache:true},
};
export default async function Page({searchParams}:{
 searchParams:Promise<{slug?:string}>;
}){
 await connection();
 if(!isAiLookOwnerPreview(process.env))notFound();
 const params=await searchParams;
 const slug=typeof params.slug==='string'&&params.slug.length<=240
  ?params.slug:AI_LOOK_DEFAULT_SLUG;
 let look;
 try{look=await aiLookReadApprovedListing(slug);}
 catch{
  return <main className="visual-commerce-shell min-h-screen"><Header/>
   <section className="container-feya pt-40 pb-28"><h1 className="text-3xl text-white">The FEYA catalogue is temporarily unavailable.</h1>
    <p className="mt-4 text-[#aaa]">Please reload later. No AI request or payment was made.</p></section><Footer/>
  </main>;
 }
 if(!look)notFound();
 return <main className="visual-commerce-shell min-h-screen">
  <Header/>
  <AiLookPreviewClient look={look} catalog={aiLookCatalog()}
   configured={isAiLookGenerationConfigured(process.env)}/>
  <Footer/>
 </main>;
}
