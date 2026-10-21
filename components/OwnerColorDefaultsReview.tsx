'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { Check, ChevronDown, Download, Search, SlidersHorizontal, Upload } from 'lucide-react';
import { FeyaColorSwatch } from '@/components/FeyaColorSwatch';
import {
  colorChoiceLabel, constituentColors, inferredDefaultColorCode,
  isBonanzaColorCode,
} from '@/lib/bonanzaColorChoices';

export type OwnerColorReviewRow = {
  id:string;slug:string;title:string;image:string;choices:string[];held:boolean;bonanzaHeld?:boolean;
};
export type MerchandisingDecision = {primary:string;filter_colors:string[]};
type ExportPayload = {
  schema:'feya-owner-color-merchandising-v1';
  source:'feya-bonanza-approved-colors-v1';
  products:Record<string,MerchandisingDecision>;
};
const STORAGE='feya.color-default-review.20261020.v1';
const PAGE_SIZE=24;
const headers: ExportPayload = {schema:'feya-owner-color-merchandising-v1',source:'feya-bonanza-approved-colors-v1',products:{}};

function verifySelections(raw:unknown, rows:OwnerColorReviewRow[]): Record<string,MerchandisingDecision> {
  const dict=new Map(rows.map(r=>[r.id,r]));
  const payload=raw as Partial<ExportPayload> | null;
  if (!payload || payload.schema!==headers.schema || payload.source!==headers.source
    || !payload.products || typeof payload.products!=='object' || Array.isArray(payload.products)) {
    throw new Error('Неподходящий файл. Требуется сохранённый экспорт проверки цветов TheFEYA.');
  }
  const decisions:Record<string,MerchandisingDecision>={};
  for (const [id,item] of Object.entries(payload.products)) {
    const entry=dict.get(id);
    if (!entry || entry.held || !item || typeof item.primary!=='string'
      || !entry.choices.includes(item.primary)
      || !Array.isArray(item.filter_colors)) throw new Error('Файл содержит неизвестный товар или неподтверждённый цвет.');
    const allowed=constituentColors(entry.choices);
    if (item.filter_colors.some((color)=>typeof color!=='string'||!allowed.includes(color))
      || new Set(item.filter_colors).size!==item.filter_colors.length) throw new Error('Нельзя включить цвет фильтра, которого нет среди вариантов товара.');
    decisions[id]={primary:item.primary,filter_colors:item.filter_colors};
  }
  return decisions;
}

function suggested(row:OwnerColorReviewRow) {
  return inferredDefaultColorCode(row.title,row.choices) || row.choices[0];
}

export function OwnerColorDefaultsReview({
  rows,appliedDefaults,
}:{
  rows:OwnerColorReviewRow[];
  appliedDefaults:Record<string,MerchandisingDecision>;
}) {
  const [decisions,setDecisions]=useState<Record<string,MerchandisingDecision>>({});
  const [loaded,setLoaded]=useState(false);
  const [search,setSearch]=useState('');
  const [status,setStatus]=useState<'all'|'pending'|'confirmed'|'held'>('all');
  const [page,setPage]=useState(1);
  const [info,setInfo]=useState('Подтверждённые цвета применены к текущему Preview. Production пока не изменён.');
  const [expanded,setExpanded]=useState<string[]>([]);
  // Source marketplace HOLD remains visible even after on-site Gold correction.
  const ready=rows.filter(r=>!r.bonanzaHeld).length;
  const confirmed=rows.filter(r=>!r.bonanzaHeld && decisions[r.id]).length;

  useEffect(()=>{
    try {
      const persisted=window.localStorage.getItem(STORAGE);
      setDecisions(persisted?verifySelections(JSON.parse(persisted),rows):appliedDefaults);
    } catch {
      setDecisions(appliedDefaults);
      setInfo('Не удалось восстановить локальный черновик. Можно импортировать предыдущий JSON.');
    }
    setLoaded(true);
  },[rows,appliedDefaults]);

  useEffect(()=>{
    if (!loaded) return;
    try {window.localStorage.setItem(STORAGE,JSON.stringify({...headers,products:decisions}));}
    catch {setInfo('Автосохранение браузера недоступно. Экспортируй результаты в JSON.');}
  },[decisions,loaded]);

  const filtered=useMemo(()=>rows.filter(row=>{
    const q=search.trim().toLowerCase();
    if(q && ![row.title,row.id,row.slug].some(s=>s.toLowerCase().includes(q)))return false;
    if(status==='held')return row.held;
    if(status==='confirmed')return !row.held && Boolean(decisions[row.id]);
    if(status==='pending')return !row.held && !decisions[row.id];
    return true;
  }),[rows,search,status,decisions]);

  const totalPages=Math.max(1,Math.ceil(filtered.length/PAGE_SIZE));
  const currentPage=Math.min(page,totalPages);
  const visible=filtered.slice((currentPage-1)*PAGE_SIZE,currentPage*PAGE_SIZE);

  const setPrimary=(row:OwnerColorReviewRow,primary:string)=>{
    if(row.held||!row.choices.includes(primary))return;
    setDecisions(prev=>({...prev,[row.id]:{
      primary,filter_colors:prev[row.id]?.filter_colors ?? constituentColors(row.choices),
    }}));
    setInfo('Выбор сохранён в этом браузере. Экспортируй JSON для применения к сайту.');
  };
  const toggleFilter=(row:OwnerColorReviewRow,color:string)=>{
    if(row.held)return;
    const prior=decisions[row.id];
    const previous=prior?.filter_colors ?? constituentColors(row.choices);
    const next=previous.includes(color)?previous.filter(x=>x!==color):[...previous,color];
    setDecisions(prev=>({...prev,[row.id]:{primary:prior?.primary||suggested(row),filter_colors:next}}));
  };
  const download=()=>{
    const payload={...headers,products:decisions};
    const blob=new Blob([JSON.stringify(payload,null,2)+'\n'],{type:'application/json;charset=utf-8'});
    const url=URL.createObjectURL(blob);
    const element=document.createElement('a');
    element.href=url;element.download='TheFEYA-Approved-Default-Colors.json';
    document.body.appendChild(element);element.click();element.remove();URL.revokeObjectURL(url);
    setInfo('Файл экспортирован. Передай его для контролируемого применения на сайте.');
  };
  const importFile=async(event:ChangeEvent<HTMLInputElement>)=>{
    const file=event.target.files?.[0];event.target.value='';
    if(!file)return;
    try{
      if(file.size>500_000)throw new Error('Файл слишком большой.');
      const validated=verifySelections(JSON.parse(await file.text()),rows);
      setDecisions(validated);
      setInfo('Сохранённый набор решений импортирован. Он пока не опубликован.');
    }catch(error){setInfo(error instanceof Error?error.message:'Не удалось прочитать файл.');}
  };

  return <main className="min-h-screen bg-[#0c0d10] px-4 py-10 text-[#eee9df] md:px-8 lg:px-12">
    <div className="mx-auto max-w-[1360px]">
      <header className="mb-7 flex flex-wrap items-start justify-between gap-5 border-b border-white/10 pb-7">
        <div className="max-w-3xl">
          <div className="mb-2 text-[10px] tracking-[.34em] text-[#d7b974] uppercase">THEFEYA / Owner color review</div>
          <h1 className="text-3xl font-medium tracking-[-.04em] md:text-4xl">Исходные цвета товаров</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#a9a6a3]">
            Сверяй главный кадр и выбери комбинацию, которая должна быть активна при открытии товара.
            На сайте клиент увидит только цветовые кружочки, а здесь можно вручную исключить второстепенные цвета из фильтра.
          </p>
        </div>
        <Link href="/shop" className="rounded-lg border border-white/20 px-4 py-2.5 text-xs text-[#cfc5b4] hover:border-[#d7b974]">Посмотреть магазин ↗</Link>
      </header>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ['Товаров',rows.length],
          ['Нужна проверка',ready-confirmed],
          ['Подтверждено',confirmed],
          ['На паузе',rows.length-ready],
        ].map(([label,count])=><div key={label} className="rounded-xl border border-white/10 bg-white/[.025] p-4">
          <div className="text-[10px] uppercase tracking-[.12em] text-[#99968f]">{label}</div>
          <div className="mt-2 text-3xl text-[#ead9b4]">{count}</div>
        </div>)}
      </div>

      <div className="mb-7 rounded-xl border border-[#c9a864]/25 bg-[#c9a864]/[.055] p-4">
        <div className="h-1 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-[#d5b775] transition-[width]" style={{width:(ready?confirmed/ready*100:0)+'%'}}/></div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <p role="status" className="max-w-[690px] text-xs leading-5 text-[#c6c1b5]">{info} Автосохранение действует в этом браузере. Production остаётся без изменений.</p>
          <div className="flex flex-wrap gap-2">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-xs hover:border-white/40"><Upload size={14}/> Импорт JSON
              <input aria-label="Импортировать ранее сохранённый JSON" type="file" accept="application/json,.json" className="sr-only" onChange={importFile}/>
            </label>
            <button type="button" onClick={download} className="inline-flex items-center gap-2 rounded-lg border border-[#d8b776]/40 bg-[#d2b16d]/10 px-4 py-2 text-xs text-[#eed8a5] hover:bg-[#d2b16d]/20"><Download size={14}/> Скачать решения JSON</button>
          </div>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="relative min-w-[240px] flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#95908c]"/>
          <input value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}}
            placeholder="Название, Etsy ID, часть названия..." className="w-full rounded-lg border border-white/15 bg-white/[.04] py-2.5 pl-10 pr-4 text-sm outline-none focus:border-[#d1ae64]"/>
        </div>
        <div className="inline-flex flex-wrap items-center gap-1 rounded-lg border border-white/10 p-1">
          {([
            ['all','Все'],['pending','Не проверено'],['confirmed','Подтверждено'],['held','Пауза'],
          ] as const).map(([key,label])=><button type="button" key={key} onClick={()=>{setStatus(key);setPage(1);}}
            className={`rounded-md px-3 py-2 text-[11px] ${status===key?'bg-[#d2b16d]/20 text-[#eed6a0]':'text-[#aaa4a0] hover:text-white'}`}>{label}</button>)}
        </div>
      </div>
      <p className="mb-3 text-xs text-[#8f8a86]">Показано {visible.length} из {filtered.length} · сохранено {confirmed} из {ready}. Изменения пока действуют только в редакторе.</p>

      <div className="space-y-3">
        {visible.map(row=>{
          const decision=decisions[row.id];
          const primary=decision?.primary||suggested(row);
          const filterColors=decision?.filter_colors??constituentColors(row.choices);
          const eligible=constituentColors(row.choices);
          const isOpen=expanded.includes(row.id);
          return <article key={row.id} className={`rounded-xl border bg-[#141519] p-3.5 transition-colors md:p-4 ${decision?'border-[#d7b46c]/40':'border-white/10'}`}>
            <div className="flex flex-col gap-4 md:flex-row">
              <div className="relative h-[150px] w-[120px] shrink-0 overflow-hidden rounded-lg bg-[#23252a] md:h-[136px] md:w-[105px]">
                <Image src={row.image} alt={row.title} fill sizes="120px" unoptimized className="object-cover object-top" loading="lazy"/>
              </div>
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <h2 className="max-w-[760px] text-[15px] font-medium leading-snug text-[#f0ebe1]">{row.title}</h2>
                  {row.held?<span className="rounded-full border border-[#b87c52]/50 px-2 py-0.5 text-[9px] uppercase text-[#dba783]">Bonanza HOLD</span>
                    :decision?<span className="inline-flex items-center gap-1 text-[10px] text-[#d6bc81]"><Check size={12}/> Проверено</span>
                    :<span className="text-[10px] text-[#8d8d90]">Предложение · требует проверки фото</span>}
                </div>
                {row.bonanzaHeld && !row.held ? <div className="mb-2 text-[10px] text-[#e0b78b]">Bonanza HOLD остаётся; в магазине цвет Gold уже подтверждён.</div> : null}
                <div className="mb-3 flex flex-wrap items-center gap-3 text-[10px] text-[#88868c]">
                  <span>Etsy {row.slug.split('-').at(-1)}</span>
                  <Link href={`/shop/${row.slug}`} target="_blank" className="text-[#c5b28a] hover:text-white">Открыть товар ↗</Link>
                </div>
                <div className="mb-2 text-[11px] text-[#bdb4a8]">Цвет по умолчанию: <strong className="font-medium text-[#f0d59c]">{colorChoiceLabel(primary)}</strong></div>
                <div className="flex flex-wrap items-center gap-3" role="radiogroup" aria-label={`Исходный цвет: ${row.title}`}>
                  {row.choices.map(code=>{
                    if(!isBonanzaColorCode(code))return null;
                    return <button key={code} type="button" role="radio" aria-label={`Выбрать ${colorChoiceLabel(code)} для ${row.title}`} aria-checked={primary===code}
                      title={colorChoiceLabel(code)} onClick={()=>setPrimary(row,code)} disabled={row.held}
                      className="group flex h-10 w-10 shrink-0 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-[#e2c280] disabled:cursor-not-allowed disabled:opacity-40">
                        <FeyaColorSwatch color={colorChoiceLabel(code)} selected={primary===code} size={29}/>
                      </button>;
                  })}
                  {!row.held && !decision ? <button type="button" onClick={()=>setPrimary(row,primary)}
                    className="ml-2 rounded-lg border border-white/15 px-3 py-2 text-[10px] text-[#d7c39e] hover:border-[#c6a866]">Подтвердить показанный цвет</button>:null}
                </div>
                {!row.held ? <div className="mt-3">
                  <button type="button" className="inline-flex items-center gap-2 text-[10px] text-[#989ca3] hover:text-[#e7d2a3]" aria-expanded={isOpen}
                    onClick={()=>setExpanded(prev=>prev.includes(row.id)?prev.filter(v=>v!==row.id):[...prev,row.id])}>
                    <SlidersHorizontal size={12}/> Цвета для фильтра каталога <ChevronDown size={12} className={isOpen?'rotate-180':''}/>
                  </button>
                  {isOpen?<div className="mt-2 flex flex-wrap gap-2">
                    {eligible.map(c=><label key={c} className="flex cursor-pointer items-center gap-2 rounded-md border border-white/10 bg-white/[.025] px-2.5 py-1.5 text-[11px] text-[#c3c0b9]">
                      <input type="checkbox" checked={filterColors.includes(c)} onChange={()=>toggleFilter(row,c)} className="accent-[#d7b46c]"/>
                      <FeyaColorSwatch color={c} size={14}/>{c}
                    </label>)}
                    <span className="self-center text-[10px] text-[#828188]">Снятый цвет не будет показывать этот товар по фильтру.</span>
                  </div>:null}
                </div>:null}
              </div>
            </div>
          </article>;
        })}
      </div>

      {filtered.length===0?<p className="py-20 text-center text-[#aca7a0]">По запросу товаров не найдено.</p>:null}
      {totalPages>1?<div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <button type="button" disabled={currentPage===1} onClick={()=>setPage(p=>Math.max(1,p-1))} className="rounded-lg border border-white/15 px-4 py-2 text-xs disabled:opacity-30">← Назад</button>
        <span className="text-xs text-[#b9b0a0]">{currentPage} / {totalPages}</span>
        <button type="button" disabled={currentPage===totalPages} onClick={()=>setPage(p=>Math.min(totalPages,p+1))} className="rounded-lg border border-white/15 px-4 py-2 text-xs disabled:opacity-30">Далее →</button>
      </div>:null}
      <footer className="mt-12 border-t border-white/10 pt-6 text-xs leading-6 text-[#858389]">
        Эта страница не публикует ассортимент и не изменяет SEO, цены или комплектации.
        Когда завершишь проверку, скачай JSON и отправь его в чат для переноса в версионированный манифест.
      </footer>
    </div>
  </main>;
}
