'use client';

import Link from 'next/link';
import { useCallback, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { useOwnerDrawerA11y } from '@/components/admin/useOwnerDrawerA11y';
import { AdminVariantDraftClient } from '@/components/AdminVariantDraftClient';

export type ProductFactReviewDrawerRow = {
  fact_review_id: string;
  canonical_product_id: string;
  issue_priority?: number | null;
  current_title?: string | null;
  final_primary_part?: string | null;
  final_product_type?: string | null;
  final_material_primary?: string | null;
  final_color_primary?: string | null;
  issue_codes_json?: unknown;
  review_status?: string | null;
  resolution_status?: string | null;
  resolved_primary_part?: string | null;
  resolved_product_type?: string | null;
  resolved_material_primary?: string | null;
  resolved_color_primary?: string | null;
  updated_at?: string | null;
};

function asText(v:unknown,fallback='—'){return v==null||v===''?fallback:String(v)}
function codes(v:unknown){return Array.isArray(v)?v.filter((x):x is string=>typeof x==='string'&&Boolean(x.trim())):[]}
function codeLabel(v:string){const m:Record<string,string>={PART_UNRESOLVED:'Не определена часть товара',COLOR_UNRESOLVED:'Не определён цвет',MATERIAL_UNRESOLVED:'Не определён материал',PRODUCT_TYPE_UNRESOLVED:'Не определён тип товара',FACT_GUARDRAIL_PRESENT:'Есть защитное ограничение'};return m[v]||v}
function dateLabel(v:unknown){if(!v)return'не зафиксировано';const d=new Date(String(v));return Number.isNaN(d.getTime())?asText(v):new Intl.DateTimeFormat('ru-RU',{dateStyle:'short',timeStyle:'short'}).format(d)}

export function OwnerProductFactDrawerClient({row,variantDraftEnabled=false}:{row:ProductFactReviewDrawerRow;variantDraftEnabled?:boolean}){
  const [open,setOpen]=useState(false);
  const triggerRef=useRef<HTMLButtonElement|null>(null),closeRef=useRef<HTMLButtonElement|null>(null),dialogRef=useRef<HTMLElement|null>(null);
  const close=useCallback(()=>setOpen(false),[]);
  useOwnerDrawerA11y({open,dialogRef,triggerRef,initialFocusRef:closeRef,close});
  const issues=codes(row.issue_codes_json);
  return <>
    <button ref={triggerRef} type="button" className="owner-button" onClick={()=>setOpen(true)}>Разобрать</button>
    {open?<div className="fixed inset-0 z-[80]" role="presentation">
      <button type="button" aria-label="Закрыть проверку факта" className="absolute inset-0 h-full w-full bg-black/65 backdrop-blur-[2px]" onClick={close}/>
      <aside ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={`fact-drawer-${row.fact_review_id}`} className="owner-drawer absolute right-0 top-0 h-full w-full max-w-[560px] overflow-y-auto">
        <div className="owner-drawer-head sticky top-0 z-10 flex items-start justify-between gap-4 px-5 py-4">
          <div><div className="owner-eyebrow" style={{marginBottom:'5px'}}>Product Truth</div><h2 id={`fact-drawer-${row.fact_review_id}`} className="m-0 text-[20px] leading-snug">{asText(row.current_title,'Товар')}</h2></div>
          <button ref={closeRef} type="button" className="owner-button" aria-label="Закрыть" onClick={close}><X size={15}/></button>
        </div>
        <div className="owner-drawer-body space-y-4 p-5">
          <section className="owner-card is-warning">
            <div className="owner-status is-warning">Требует подтверждения факта</div>
            <h3 className="owner-card-title" style={{marginTop:'10px'}}>Почему товар попал в очередь</h3>
            <div className="owner-card-copy">{issues.length?issues.map((x)=><div key={x}>• {codeLabel(x)}</div>):'Причина проверки не детализирована.'}</div>
          </section>

          <section className="owner-card">
            <div className="owner-section-kicker">Текущие факты</div>
            <div className="owner-role-roster" style={{marginTop:'10px'}}>
              <div><span>Часть товара</span><strong>{asText(row.final_primary_part)}</strong></div>
              <div><span>Тип</span><strong>{asText(row.final_product_type)}</strong></div>
              <div><span>Материал</span><strong>{asText(row.final_material_primary)}</strong></div>
              <div><span>Цвет</span><strong>{asText(row.final_color_primary)}</strong></div>
            </div>
          </section>

          <section className={`owner-card ${row.resolution_status==='resolved'?'is-success':'is-info'}`}>
            <div className={`owner-status ${row.resolution_status==='resolved'?'is-success':'is-info'}`}>{row.resolution_status==='resolved'?'Решение зафиксировано':'Решение ещё не записано'}</div>
            {row.resolution_status==='resolved'?<div className="owner-role-roster" style={{marginTop:'10px'}}>
              <div><span>Часть товара</span><strong>{asText(row.resolved_primary_part)}</strong></div>
              <div><span>Тип</span><strong>{asText(row.resolved_product_type)}</strong></div>
              <div><span>Материал</span><strong>{asText(row.resolved_material_primary)}</strong></div>
              <div><span>Цвет</span><strong>{asText(row.resolved_color_primary)}</strong></div>
            </div>:<p className="owner-card-copy">До protected owner actions этот экран только объясняет проблему и ведёт к каноническому товару. Он не переписывает Product Truth.</p>}
          </section>

          <div className="owner-actions">
            <Link href={`/admin/products/${row.canonical_product_id}`} className="owner-button primary">Открыть товар</Link>
            <Link href="/admin/listing-master" className="owner-button">Listing Master</Link>
          </div>

          {variantDraftEnabled ? <AdminVariantDraftClient key={row.canonical_product_id} productId={row.canonical_product_id} readOnly /> : null}

          <details className="owner-disclosure owner-disclosure-section">
            <summary><span><strong>Технические детали</strong><small>ID и состояние review</small></span><span className="owner-section-kicker">Advanced</span></summary>
            <div className="owner-disclosure-body owner-card-meta" style={{marginBottom:0}}><span title={row.fact_review_id}>Fact review ID</span><span title={row.canonical_product_id}>Product ID</span><span>{asText(row.review_status)}</span><span>обновлено: {dateLabel(row.updated_at)}</span></div>
          </details>
        </div>
      </aside>
    </div>:null}
  </>;
}
