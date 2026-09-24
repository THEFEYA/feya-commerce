'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import type { VariantAttribute, VariantSnapshot, VariantPrice } from '@/lib/commerceVariantContract';
import { parseVariantDraftReceipt, type VariantConfigurationContext } from '@/lib/commerceVariantDraftStorage';
import type { VariantDraftInput } from '@/lib/commerceVariantDraftSchema';
import { addEditorAttribute, addEditorConfiguration, addEditorVariant, editorSnapshot, parsePendingVariant,
  parseVariantEditorContext, pendingVariantKey, prepareEditorSave, serializePendingVariant, updateEditorAttribute,
  type VariantEditorContext } from '@/lib/commerceVariantEditor';

const field = 'w-full min-w-0 rounded-lg border border-[rgba(216,214,211,.14)] bg-black/20 px-3 py-2 text-[13px] text-bone outline-none focus:border-white/50 disabled:opacity-60';
const smallButton = 'btn-ghost px-3 py-2 text-[11px] disabled:opacity-50';
const statuses: Array<[VariantAttribute['state'],string]> = [['proposed','Черновик'],['confirmed','Подтверждено'],['retired','Архив']];
const sourceLabel = (row: VariantConfigurationContext) => `${row.source_label || 'Комплектация'} · ${row.configuration_price_id.slice(-8)}`;
const money = (amount: number | null, currency: string) => amount === null ? 'Проверяется отдельно' : new Intl.NumberFormat('ru-RU',{style:'currency',currency}).format(amount / 100);
const priceLabel = (price: VariantPrice) => price.status === 'range' ? 'Диапазон — точная цена не выбрана' : money(price.amount_minor,price.currency);

/** Same protected API for Product OS editing and Growth read-only context. No browser Supabase client. */
export function AdminVariantDraftClient({ productId, readOnly = false }: { productId: string; readOnly?: boolean }) {
  const [context,setContext] = useState<VariantEditorContext | null>(null), [draft,setDraft] = useState<VariantSnapshot | null>(null);
  const [pending,setPending] = useState<VariantDraftInput | null>(null), [busy,setBusy] = useState(true), [dirty,setDirty] = useState(false);
  const [notice,setNotice] = useState('Загружаю варианты…'), [tone,setTone] = useState<'neutral'|'success'|'error'>('neutral'), [conflict,setConflict] = useState(false);
  const [newColor,setNewColor] = useState(''), [newSize,setNewSize] = useState(''), [newConfiguration,setNewConfiguration] = useState('');
  const [tupleConfiguration,setTupleConfiguration] = useState(''), [tupleColor,setTupleColor] = useState(''), [tupleSize,setTupleSize] = useState('');
  const lock = useRef(false), generation = useRef(0);
  const endpoint = `/api/admin/products/${encodeURIComponent(productId)}/variants`;
  async function read() {
    const response = await fetch(endpoint,{cache:'no-store',credentials:'same-origin',signal:AbortSignal.timeout(20000)});
    if (!response.ok) throw new Error(response.status === 423 ? 'Редактор пока отключён.' : 'Не удалось прочитать варианты. Проверьте вход и повторите.');
    return parseVariantEditorContext(await response.json(), productId);
  }
  function show(message: string, nextTone: typeof tone = 'neutral') { setNotice(message); setTone(nextTone); }
  useEffect(() => {
    const turn = ++generation.current; lock.current = true; setBusy(true); setContext(null); setDraft(null); setPending(null); setDirty(false); setConflict(false);
    show('Загружаю варианты…');
    void read().then(value => {
      if (generation.current !== turn) return;
      const raw = readOnly ? null : sessionStorage.getItem(pendingVariantKey(value.editor_actor_id, productId));
      const savedRequest = raw ? parsePendingVariant(raw,value) : null;
      setContext(value); setDraft(savedRequest ? savedRequest.snapshot : editorSnapshot(value)); setPending(savedRequest);
      show(savedRequest ? 'Есть незавершённое сохранение. Проверьте его результат перед дальнейшим редактированием.' : value.current_revision ? 'Загружена сохранённая версия.' : 'Варианты ещё не сохранялись.');
    }).catch(error => { if (generation.current === turn) show(error instanceof Error ? error.message : 'Не удалось загрузить варианты.','error'); })
      .finally(() => { if (generation.current === turn) { lock.current = false; setBusy(false); } });
    return () => { generation.current = turn + 1; };
    // Loading is intentionally scoped to the product and mode, never to the editable draft.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[productId,readOnly]);
  useEffect(() => {
    if (!dirty && !pending) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload',warn); return () => window.removeEventListener('beforeunload',warn);
  },[dirty,pending]);
  const locked = busy || Boolean(pending) || conflict || readOnly;
  function edit(change: (value: VariantSnapshot) => VariantSnapshot) {
    if (!draft || locked || lock.current) return;
    try { setDraft(change(draft)); setDirty(true); show('Есть несохранённые изменения.'); }
    catch (error) { show(error instanceof Error ? error.message : 'Проверьте выбранные значения.','error'); }
  }
  async function refresh() {
    if (lock.current || pending) return;
    const turn = generation.current; lock.current = true; setBusy(true);
    try { const value = await read(); if (generation.current !== turn) return;
      const raw = readOnly ? null : sessionStorage.getItem(pendingVariantKey(value.editor_actor_id,productId));
      const savedRequest = raw ? parsePendingVariant(raw,value) : null;
      setContext(value); setDraft(savedRequest ? savedRequest.snapshot : editorSnapshot(value)); setPending(savedRequest); setDirty(false); setConflict(false);
      show(savedRequest ? 'Есть незавершённое сохранение. Проверьте его результат.' : 'Загружена сохранённая версия.');
    } catch (error) { if (generation.current === turn) show(error instanceof Error ? error.message : 'Не удалось обновить варианты.','error'); }
    finally { if (generation.current === turn) { lock.current = false; setBusy(false); } }
  }
  async function save() {
    if (!context || !draft || readOnly || lock.current || conflict) return;
    const turn = generation.current; lock.current = true; setBusy(true);
    const key = pendingVariantKey(context.editor_actor_id,productId);
    let request = pending, durable = Boolean(pending);
    try {
      if (!request) {
        request = prepareEditorSave(context,draft,crypto.randomUUID());
        // Persist the exact request before network I/O. A reload must never manufacture another request ID.
        try { sessionStorage.setItem(key,serializePendingVariant(context,request)); }
        catch { throw new Error('Браузер не смог сохранить запрос для восстановления. Запись в БД не отправлена.'); }
        durable = true;
        setPending(request);
      }
      show('Сохраняю и перечитываю варианты…');
      const response = await fetch(endpoint,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json','X-Feya-Editor-Actor':context.editor_actor_id},body:JSON.stringify(request),signal:AbortSignal.timeout(20000)});
      const result = await response.json();
      if (generation.current !== turn) return;
      if (!response.ok) {
        if (result?.ok === false && result.write_outcome === 'not_written') {
          sessionStorage.removeItem(key); setPending(null);
          if (response.status === 409) { setConflict(true); show(result.code === 'variant_editor_actor_changed' ? 'Пользователь изменился. Сохранение отклонено. Загрузите актуальную версию под нужным аккаунтом.' : 'Товар или его источник изменился. Ваши изменения не записаны. Загрузите актуальную версию и внесите их заново.','error'); }
          else show(response.status === 422 ? 'Изменения не записаны. Проверьте значения и выбранные сочетания.' : 'Сохранение отклонено. Проверьте доступность редактора и вход.','error');
          return;
        }
        throw new Error('write_outcome_unknown');
      }
      const receipt = parseVariantDraftReceipt(result,request);
      const value = await read(); if (generation.current !== turn) return;
      if (value.editor_actor_id !== context.editor_actor_id || value.current_revision < receipt.product_revision
        || (value.current_revision === receipt.product_revision && value.snapshot_sha256 !== receipt.snapshot_sha256)) throw new Error('readback_unverified');
      sessionStorage.removeItem(key); setPending(null); setContext(value); setDraft(editorSnapshot(value)); setDirty(false);
      show(value.current_revision === receipt.product_revision ? `Сохранено и проверено. Версия ${value.current_revision}.`
        : `Сохранение версии ${receipt.product_revision} подтверждено. Уже загружена более новая версия ${value.current_revision}.`,'success');
    } catch (error) {
      if (generation.current !== turn) return;
      if (request && durable) { setPending(request); show('Результат сохранения пока не подтверждён. Нажмите «Проверить результат»: повторится тот же запрос.','error'); }
      else show(error instanceof Error && !error.message.startsWith('variant_') ? error.message : 'Проверьте комплектации, названия и сочетания перед сохранением.','error');
    } finally { if (generation.current === turn) { lock.current = false; setBusy(false); } }
  }
  const noticeClass = tone === 'success' ? 'text-emerald-200' : tone === 'error' ? 'text-[var(--ruby-soft)]' : 'text-[var(--bone-dim)]';
  const configName = (id: string) => { const row = context?.configuration_context.find(c => c.configuration_price_id === id); return row ? sourceLabel(row) : `Комплектация · ${id.slice(-8)}`; };
  if (readOnly) return <section className="owner-card" data-testid="variant-summary">
    <div className="owner-section-kicker">Варианты товара · черновик</div>
    <p role="status" aria-live="polite" className={noticeClass}>{notice}</p>
    {context ? <div data-testid="variant-summary-revision" data-revision={context.current_revision} data-snapshot-hash={context.snapshot_sha256 || ''}>
      <p>Сохранённая версия: {context.current_revision || 'ещё нет'}</p>
      <p>Цвета: {draft?.colors.filter(a=>a.state!=='retired').map(a=>a.label).join(', ') || 'не заданы'}</p>
      <p>Размеры: {draft?.sizes.filter(a=>a.state!=='retired').map(a=>a.label).join(', ') || 'не заданы'}</p>
      <p>Сочетаний: {draft?.variants.filter(v=>v.state==='draft').length || 0}. Доступность заказа проверяется отдельно.</p>
    </div> : null}
    <div className="owner-actions"><button type="button" className="owner-button" onClick={refresh} disabled={busy}>Обновить варианты</button>
      <Link className="owner-button" href={`/admin/products/${productId}#product-variants`}>Редактировать в товарной админке</Link></div>
  </section>;
  return <div id="product-variants" data-testid="variant-editor" className="space-y-4 text-[13px] text-[var(--bone-dim)]">
    <p>Цвет и материал обычно не меняют цену комплектации. Здесь сохраняются варианты для проверки; публикация и доступность заказа проверяются отдельно.</p>
    <p role="status" aria-live="polite" className={noticeClass}>{notice}</p>
    {context && draft ? <>
      <div data-testid="variant-editor-revision" data-revision={context.current_revision}>Сохранённая версия: {context.current_revision || 'ещё нет'}</div>
      <fieldset disabled={locked} className="space-y-3"><legend className="eyebrow-gold mb-2">Комплектации</legend>
        {draft.configurations.map(c => <div key={c.configuration_price_id} className="rounded-xl border border-[rgba(216,214,211,.10)] bg-black/15 p-3" data-quote-id={c.base_price.quote_id}>
          <div className="text-bone">{configName(c.configuration_price_id)}</div><div>Базовая цена: {priceLabel(c.base_price)} · черновик</div>
          <div>Значение в источнике: {context.configuration_context.find(r=>r.configuration_price_id===c.configuration_price_id)?.source_amount ?? 'не указано'} {c.base_price.currency}</div>
        </div>)}
        <div className="grid gap-2 sm:grid-cols-[1fr_auto]"><label>Исходная комплектация<select className={field} value={newConfiguration} onChange={e=>setNewConfiguration(e.target.value)}>
          <option value="">Выберите комплектацию</option>{context.configuration_context.filter(c=>!draft.configurations.some(d=>d.configuration_price_id===c.configuration_price_id)).map(c=><option key={c.configuration_price_id} value={c.configuration_price_id}>{sourceLabel(c)}</option>)}
        </select></label><button type="button" className={smallButton} disabled={!newConfiguration} onClick={()=>edit(s=>addEditorConfiguration(s,context,newConfiguration,crypto.randomUUID()))}>Добавить комплектацию</button></div>
      </fieldset>
      {(['colors','sizes'] as const).map(dimension => {
        const isColor=dimension==='colors', caption=isColor?'Цвет':'Размер', value=isColor?newColor:newSize, setValue=isColor?setNewColor:setNewSize;
        return <fieldset key={dimension} disabled={locked} className="space-y-2"><legend className="eyebrow-gold mb-2">{isColor?'Цвета':'Размеры'}</legend>
          {draft[dimension].map((a,index)=><div key={a.id} data-attribute-id={a.id} className="grid grid-cols-[1fr_140px] gap-2">
            <label>{caption} {index+1}<input className={field} value={a.label} maxLength={140} onChange={e=>edit(s=>updateEditorAttribute(s,dimension,a.id,{label:e.target.value}))} /></label>
            <label>Статус: {caption.toLowerCase()} {index+1}<select className={field} value={a.state} onChange={e=>edit(s=>updateEditorAttribute(s,dimension,a.id,{state:e.target.value as VariantAttribute['state']}))}>{statuses.map(([state,label])=><option key={state} value={state}>{label}</option>)}</select></label>
          </div>)}
          <div className="grid gap-2 sm:grid-cols-[1fr_auto]"><label>{isColor?'Новый цвет':'Новый размер'}<input className={field} maxLength={140} value={value} onChange={e=>setValue(e.target.value)} /></label>
            <button type="button" className={smallButton} disabled={!value.trim()} onClick={()=>edit(s=>{const next=addEditorAttribute(s,dimension,value,crypto.randomUUID());setValue('');return next;})}>{isColor?'Добавить цвет':'Добавить размер'}</button></div>
        </fieldset>;
      })}
      <fieldset disabled={locked} className="space-y-3"><legend className="eyebrow-gold mb-2">Сочетания</legend>
        <p>Добавляйте каждое сочетание отдельно. «Не применяется» означает отсутствие этого параметра, а не любой цвет или размер. Архивирование цвета или размера архивирует связанные сочетания.</p>
        {draft.variants.map(v=><div key={v.variant_id} data-variant-id={v.variant_id} className="rounded-xl border border-[rgba(216,214,211,.10)] bg-black/15 p-3">
          <div className="text-bone">{configName(v.configuration_price_id)}</div><div>{v.color_id ? draft.colors.find(a=>a.id===v.color_id)?.label : 'Цвет не применяется'} · {v.size_id ? draft.sizes.find(a=>a.id===v.size_id)?.label : 'Размер не применяется'}</div>
          <div>{v.pricing.mode==='configuration_base'?'Цена комплектации':`Индивидуальная цена: ${v.pricing.reason} · ${priceLabel(v.pricing.price)} · проверка отдельно`}</div>
          <label>Статус сочетания<select className={field} value={v.state} onChange={e=>edit(s=>({...s,variants:s.variants.map(row=>row.variant_id===v.variant_id?{...row,state:e.target.value as 'draft'|'retired'}:row)}))}><option value="draft">Черновик</option><option value="retired">Архив</option></select></label>
        </div>)}
        <div className="grid gap-2 sm:grid-cols-3">
          <label>Комплектация сочетания<select className={field} value={tupleConfiguration} onChange={e=>setTupleConfiguration(e.target.value)}><option value="">Выберите</option>{draft.configurations.map(c=><option key={c.configuration_price_id} value={c.configuration_price_id}>{configName(c.configuration_price_id)}</option>)}</select></label>
          <label>Цвет сочетания<select className={field} value={tupleColor} onChange={e=>setTupleColor(e.target.value)}><option value="">Выберите</option><option value="none">Не применяется</option>{draft.colors.filter(a=>a.state!=='retired').map(a=><option key={a.id} value={a.id}>{a.label}</option>)}</select></label>
          <label>Размер сочетания<select className={field} value={tupleSize} onChange={e=>setTupleSize(e.target.value)}><option value="">Выберите</option><option value="none">Не применяется</option>{draft.sizes.filter(a=>a.state!=='retired').map(a=><option key={a.id} value={a.id}>{a.label}</option>)}</select></label>
        </div>
        <button type="button" className={smallButton} disabled={!tupleConfiguration||!tupleColor||!tupleSize} onClick={()=>edit(s=>addEditorVariant(s,{configuration_price_id:tupleConfiguration,color_id:tupleColor==='none'?null:tupleColor,size_id:tupleSize==='none'?null:tupleSize},crypto.randomUUID()))}>Добавить сочетание</button>
      </fieldset>
      <div className="flex flex-wrap gap-2">
        {pending ? <button type="button" className={smallButton} disabled={busy} onClick={save}>Проверить результат</button>
          : <button type="button" className="btn-gold px-4 py-2 text-[12px] disabled:opacity-50" disabled={busy||conflict||!dirty||!draft.configurations.length} onClick={save}>Сохранить варианты</button>}
        <button type="button" className={smallButton} disabled={busy||Boolean(pending)} onClick={refresh}>{conflict?'Загрузить актуальную версию':dirty?'Отменить изменения и перечитать':'Перечитать варианты'}</button>
      </div>
    </> : <button type="button" className={smallButton} disabled={busy} onClick={refresh}>Повторить загрузку</button>}
  </div>;
}
