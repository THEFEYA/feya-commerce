'use client';

import {useState} from 'react';
import Link from 'next/link';

const PAGES=[
  {href:'/shop',label:'Shop'},
  {href:'/events-performance',label:'Events'},
  {href:'/style',label:'Style'},
  {href:'/collections/shoulder-armor',label:'Shoulders'},
  {href:'/collections/festival-outfits',label:'Festival'},
  {href:'/about',label:'About'},
  {href:'/shipping',label:'Shipping'},
  {href:'/contact',label:'Contact'},
  {href:'/cart',label:'Bag'},
] as const;
type Path=(typeof PAGES)[number]['href'];
type Width=375|390|430;

export function OwnerMobileReviewClient(){
  const [path,setPath]=useState<Path>('/shop');
  const [width,setWidth]=useState<Width>(390);
  const current=PAGES.find(p=>p.href===path)?.label||'Shop';
  return <div className="mt-7">
    <div className="flex flex-wrap gap-2" role="group" aria-label="Choose page for mobile review">
      {PAGES.map(p=><button key={p.href} type="button" onClick={()=>setPath(p.href)}
        aria-pressed={path===p.href}
        className={'min-h-10 rounded-full border px-4 text-[13px] transition-colors '+(path===p.href
          ? 'border-[#d4b26a] bg-[#d4b26a]/[.12] text-[#f7f3ec]'
          : 'border-white/[.20] text-[var(--bone-dim)] hover:border-white/[.45]')}>{p.label}</button>)}
    </div>
    <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2" role="group" aria-label="Mobile screen width">
        {([375,390,430] as const).map(value=><button key={value} type="button"
          aria-pressed={width===value} onClick={()=>setWidth(value)}
          className={'min-h-10 rounded-lg border px-3 text-[12px] '+(width===value
            ? 'border-[#d4b26a] text-[#f7f3ec]'
            : 'border-white/[.20] text-[var(--bone-dim)]')}>{value} px</button>)}
      </div>
      <Link href={path} className="text-[13px] text-[#e0c37d] underline underline-offset-4">
        Открыть {current} напрямую
      </Link>
    </div>
    <p className="mt-4 text-[12px] font-medium text-[#e2c580]" aria-live="polite">Сейчас: {current} · экран {width} px</p>
    <div className="mt-3 hidden w-full overflow-x-auto rounded-[22px] border border-white/[.10] bg-[#111116] px-3 py-7 md:block">
      <div className="mx-auto overflow-hidden rounded-[29px] border-[7px] border-[#2f2f34] bg-black shadow-[0_25px_90px_rgba(0,0,0,.40)]"
        style={{width:width+14,maxWidth:'none'}}>
        <div className="flex h-6 items-center justify-center bg-[#111115]">
          <span className="h-1 w-16 rounded-full bg-[#45454c]"/>
        </div>
        <iframe key={path} src={path} title={current+' mobile responsive review'} loading="eager"
          className="block h-[720px] w-full border-0 bg-[#09090b]" />
        <div className="flex h-6 items-center justify-center bg-[#111115]">
          <span className="h-1 w-20 rounded-full bg-[#45454c]"/>
        </div>
      </div>
    </div>
    <p className="mt-4 text-[12px] leading-6 text-[var(--bone-dim)]">
      На компьютере страницы отображаются внутри узкого окна с настоящими мобильными CSS-правилами. На телефоне нажми «Открыть напрямую» выше — это тот же адаптивный сайт, без отдельной мобильной сборки. Проверка в рамке не заменяет тестирование скорости и жестов на реальном устройстве.
    </p>
  </div>;
}
