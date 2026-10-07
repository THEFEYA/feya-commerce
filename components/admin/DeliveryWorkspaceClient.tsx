'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Plane, Truck } from 'lucide-react';
import { emptyDeliveryWorkspace, type DeliveryWorkspaceDraft, type DeliveryCatalogProduct, type DraftShippingProfile, type DraftShippingRule, type DraftProductionProfile, type DeliveryPreviewLine, type DeliveryDraftPreview } from '@/lib/commerceDeliveryWorkspace';
import type { DeliveryWorkspaceState, DeliveryWorkspaceSaveRequest } from '@/lib/commerceDeliveryWorkspaceStorage';
import { CalendarFields, CountryOptions, CountryCodesField, DurationFields, MethodFields } from './DeliveryProfileFields';
import styles from './DeliveryWorkspace.module.css';

const endpoint = '/api/admin/company/delivery-workspace';
const errorLabels: Record<string, string> = {
  authentication_required: 'Войдите в кабинет владельца, чтобы загрузить и изменить настройки.',
  owner_not_allowed: 'Этот аккаунт не имеет доступа к настройкам магазина.',
  owner_actions_disabled: 'Изменение настроек магазина пока выключено.',
  delivery_workspace_draft_disabled: 'Работа с черновиками доставки пока выключена.',
  owner_action_auth_disabled: 'Для настроек магазина требуется защищённый вход владельца.',
  delivery_workspace_revision_conflict: 'Настройки уже изменились в другой вкладке. Скопируйте нужные изменения, затем загрузите сохранённую версию.',
  delivery_workspace_request_conflict: 'Этот запрос уже использован для другого изменения. Загрузите сохранённую версию.',
  delivery_currency_mismatch: 'Валюта доставки не совпадает с валютой товаров. USD-пример нельзя прибавить к товарной цене в EUR.',
  delivery_country_not_served: 'Страна не входит в список доставки этого профиля.',
  delivery_rate_missing: 'Для выбранного адреса и метода ещё нет цены.',
  delivery_method_unavailable: 'Этот метод отключён подходящим правилом для адреса.',
  delivery_rule_ambiguous: 'Одному адресу соответствуют несколько правил одинаковой точности. Уточните исключения.',
  delivery_postal_code_required: 'Для этой страны есть почтовые исключения: укажите индекс.',
  delivery_day_basis_required: 'Укажите, какие дни используются для изготовления и доставки: рабочие или календарные.',
  delivery_calendar_required: 'Задайте рабочие дни производства, отправки и перевозчика.',
  delivery_schedule_required: 'Задайте часовой пояс мастерской и время окончания приёма заказов на день.',
  delivery_combination_rule_required: 'Выберите правило объединения товаров в посылки.',
  delivery_quantity_rule_required: 'Укажите вместимость посылки и допустимое количество товаров для срока изготовления.',
  delivery_parcel_capacity_exceeded: 'Такое количество не помещается в одну посылку. Уменьшите заказ или проверьте отдельные посылки.',
  delivery_production_capacity_exceeded: 'Заказ превышает количество, для которого подтверждается указанный срок изготовления.',
  delivery_parcel_limit_exceeded: 'Для этого заказа получается слишком много посылок. Нужен индивидуальный расчёт.',
  delivery_specifications_not_ready: 'Индивидуальные мерки или дизайн ещё не согласованы. Дату начала пока рассчитывать нельзя.',
  delivery_profile_required: 'Для товара не выбран профиль доставки или изготовления и не задан профиль по умолчанию.',
  delivery_assignment_target_invalid: 'Товар или конфигурация отсутствуют в текущем коммерческом каталоге.',
  delivery_offer_currency_unavailable: 'У выбранной конфигурации нет однозначной валюты действующего предложения.',
  delivery_day_range_invalid: 'Проверьте диапазон дней: минимум не должен превышать максимум.',
  delivery_calendar_date_invalid: 'Проверьте даты праздников: YYYY-MM-DD, каждая дата должна существовать.',
  delivery_country_invalid: 'Используйте двухбуквенные коды стран, например US, AU или MX.',
  delivery_rule_invalid: 'Проверьте страны правила и список стран профиля. Исключения должны входить в список обслуживаемых стран.',
  delivery_profile_reference_invalid: 'Один из выбранных профилей больше не существует.',
  delivery_workspace_boundary_not_ready: 'Хранилище настроек ещё не готово. Черновик в этой вкладке сохранён для повторной попытки.',
};
const message = (code: string) => errorLabels[code] || 'Не удалось выполнить действие. Проверьте настройки и повторите попытку.';
async function api<T>(body?: unknown, signal?: AbortSignal): Promise<T> {
  const response = await fetch(endpoint, { method: body ? 'POST' : 'GET', credentials: 'same-origin', cache: 'no-store', signal,
    headers: body ? { 'Content-Type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined });
  const data = await response.json();
  if (!response.ok || data.ok !== true) throw new Error(data.code || 'delivery_workspace_unavailable');
  return data as T;
}
const numberOrNull = (value: string) => value === '' ? null : Number(value);
function newRule(): DraftShippingRule {
  return { id: crypto.randomUUID(), scope: 'default', countries: [], postal_prefix: null, standard: null, express: null };
}
function ProfileSelect({ label, value, profiles, onChange }: { label: string; value: string | null; profiles: Array<{ id: string; name: string }>; onChange: (v: string | null) => void }) {
  return <label className={styles.field}>{label}<select aria-label={label} value={value || ''} onChange={e => onChange(e.target.value || null)}>
    <option value="">Не выбран / наследовать</option>{profiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
  </select></label>;
}
function ShippingProfileEditor({ profile, update }: { profile: DraftShippingProfile; update: (v: DraftShippingProfile) => void }) {
  return <details className="owner-card" open>
    <summary className={styles.summary}>{profile.name} · {profile.currency} · черновик</summary>
    <div className={styles.grid}>
      <label className={styles.field}>Название профиля<input value={profile.name} maxLength={120} onChange={e => update({ ...profile, name: e.target.value })} /></label>
      <label className={styles.field}>Валюта<select aria-label="Валюта" value={profile.currency} onChange={e => update({ ...profile, currency: e.target.value as 'EUR' | 'USD' })}><option>EUR</option><option>USD</option></select></label>
      <CountryCodesField label="Обслуживаемые страны, коды через запятую" value={profile.served_countries} onChange={served_countries => update({ ...profile, served_countries })} />
      <label className={styles.field}>Максимум товаров в посылке<input type="number" min={1} max={1000} value={profile.max_units_per_parcel ?? ''} onChange={e => update({ ...profile, max_units_per_parcel: numberOrNull(e.target.value) })} /></label>
    </div>
    <p className={styles.hint}>Базовая ставка действует только для перечисленных стран. Переименование сохраняет привязки к товарам.</p>
    {profile.rules.map((rule, i) => {
      const set = (value: DraftShippingRule) => update({ ...profile, rules: profile.rules.map(r => r.id === rule.id ? value : r) });
      return <fieldset className={styles.fieldset} key={rule.id}><legend>Правило {i + 1}</legend>
        <div className={styles.grid}>
          <label className={styles.field}>Область действия<select aria-label="Область действия" value={rule.scope} onChange={e => set({ ...rule, scope: e.target.value as DraftShippingRule['scope'], countries: [], postal_prefix: e.target.value === 'postal_prefix' ? '' : null })}>
            <option value="default">Базовая ставка</option><option value="zone">Зона: несколько стран</option><option value="country">Одна страна</option><option value="postal_prefix">Почтовое исключение одной страны</option>
          </select></label>
          {rule.scope !== 'default' && <CountryCodesField label={rule.scope === 'zone' ? 'Коды стран зоны' : 'Код страны'} value={rule.countries} onChange={countries => set({ ...rule, countries })} />}
          {rule.scope === 'postal_prefix' && <label className={styles.field}>Начало индекса<input maxLength={12} value={rule.postal_prefix || ''} onChange={e => set({ ...rule, postal_prefix: e.target.value.toUpperCase().replace(/[ -]/g, '') })} /></label>}
        </div>
        <div className={styles.grid}>
          <MethodFields label={`Стандартная · ${profile.currency}`} value={rule.standard} onChange={standard => set({ ...rule, standard })} />
          <MethodFields label={`Экспресс · ${profile.currency}`} value={rule.express} onChange={express => set({ ...rule, express })} />
        </div>
        <button type="button" className="owner-button" onClick={() => update({ ...profile, rules: profile.rules.filter(r => r.id !== rule.id) })}>Удалить правило {i + 1}</button>
      </fieldset>;
    })}
    <div className="owner-actions"><button type="button" className="owner-button" onClick={() => update({ ...profile, rules: [...profile.rules, newRule()] })} disabled={profile.rules.length >= 100}>Добавить правило</button></div>
  </details>;
}
function ProductionProfileEditor({ profile, update }: { profile: DraftProductionProfile; update: (v: DraftProductionProfile) => void }) {
  return <details className="owner-card" open><summary className={styles.summary}>{profile.name} · черновик</summary>
    <div className={styles.grid}>
      <label className={styles.field}>Название профиля<input value={profile.name} maxLength={120} onChange={e => update({ ...profile, name: e.target.value })} /></label>
      <label className={styles.field}>Максимум товаров для этого срока в заказе<input type="number" min={1} max={1000} value={profile.max_units_per_order ?? ''} onChange={e => update({ ...profile, max_units_per_order: numberOrNull(e.target.value) })} /></label>
    </div>
    <DurationFields label="Срок изготовления" value={profile.duration} onChange={duration => update({ ...profile, duration })} />
    <CalendarFields label="Рабочие дни мастерской" value={profile.calendar} onChange={calendar => update({ ...profile, calendar })} />
    <label className={styles.check}><input type="checkbox" checked={profile.requires_specifications} onChange={e => update({ ...profile, requires_specifications: e.target.checked })} />Начинать только после согласования индивидуальных мерок или дизайна</label>
  </details>;
}

export function DeliveryWorkspaceClient() {
  const [workspace, setWorkspace] = useState<DeliveryWorkspaceState | null>(null);
  const [draft, setDraft] = useState<DeliveryWorkspaceDraft>(emptyDeliveryWorkspace);
  const [catalog, setCatalog] = useState<DeliveryCatalogProduct[]>([]);
  const [busy, setBusy] = useState(true), [dirty, setDirty] = useState(false);
  const [error, setError] = useState(''), [notice, setNotice] = useState('');
  const [productId, setProductId] = useState(''), [configurationId, setConfigurationId] = useState('');
  const [shippingId, setShippingId] = useState<string | null>(null), [productionId, setProductionId] = useState<string | null>(null);
  const [lines, setLines] = useState<DeliveryPreviewLine[]>([]);
  const [country, setCountry] = useState('US'), [postal, setPostal] = useState('');
  const [shippingMethod, setShippingMethod] = useState<'standard' | 'express'>('standard');
  const [preview, setPreview] = useState<DeliveryDraftPreview | null>(null);
  const pendingSave = useRef<DeliveryWorkspaceSaveRequest | null>(null);
  const currentProduct = catalog.find(p => p.canonical_product_id === productId);
  function acceptLoaded(data: { workspace: DeliveryWorkspaceState; catalog: DeliveryCatalogProduct[] }) {
    setWorkspace(data.workspace); setDraft(data.workspace.draft || emptyDeliveryWorkspace()); setCatalog(data.catalog); setDirty(false); setPreview(null);
  }
  useEffect(() => {
    const controller = new AbortController();
    api<{ workspace: DeliveryWorkspaceState; catalog: DeliveryCatalogProduct[] }>(undefined, controller.signal)
      .then(acceptLoaded).catch(e => { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : 'delivery_workspace_unavailable'); })
      .finally(() => { if (!controller.signal.aborted) setBusy(false); });
    return () => controller.abort();
  }, []);
  function change(update: (value: DeliveryWorkspaceDraft) => DeliveryWorkspaceDraft) {
    setDraft(update); setDirty(true); setPreview(null); setNotice(''); setError(''); pendingSave.current = null;
  }
  async function reload() {
    setBusy(true); setError('');
    try { acceptLoaded(await api()); pendingSave.current = null; setNotice('Сохранённая версия загружена.'); }
    catch (e) { setError(e instanceof Error ? e.message : 'delivery_workspace_unavailable'); }
    finally { setBusy(false); }
  }
  async function save() {
    if (!workspace) return;
    setBusy(true); setError(''); setNotice('');
    pendingSave.current ||= { action: 'save', request_id: crypto.randomUUID(), expected_revision: workspace.revision, draft };
    try {
      await api(pendingSave.current);
      acceptLoaded(await api()); pendingSave.current = null;
      setNotice('Черновик сохранён новой версией. Публичные тарифы и оплата остаются выключенными.');
    } catch (e) { setError(e instanceof Error ? e.message : 'delivery_workspace_unavailable'); }
    finally { setBusy(false); }
  }
  function addShipping(example = false) {
    const rule = newRule();
    if (example) {
      rule.standard = { amount_minor: 1900, transit: null, calendar: null };
      rule.express = { amount_minor: 3500, transit: null, calendar: null };
    }
    change(d => ({ ...d, shipping_profiles: [...d.shipping_profiles, { id: crypto.randomUUID(), name: example ? 'Пример владельца: $19 / $35' : `Доставка ${d.shipping_profiles.length + 1}`,
      currency: example ? 'USD' : 'EUR', served_countries: [], max_units_per_parcel: null, rules: [rule] }] }));
  }
  function assign() {
    if (!currentProduct) return;
    change(d => ({ ...d, assignments: [...d.assignments.filter(a => !(a.canonical_product_id === productId && a.configuration_price_id === (configurationId || null))),
      ...(shippingId || productionId ? [{ canonical_product_id: productId, configuration_price_id: configurationId || null, shipping_profile_id: shippingId, production_profile_id: productionId }] : [])] }));
  }
  function selectTarget(product: string, configuration: string) {
    setProductId(product); setConfigurationId(configuration);
    const a = draft.assignments.find(x => x.canonical_product_id === product && x.configuration_price_id === (configuration || null));
    setShippingId(a?.shipping_profile_id || null); setProductionId(a?.production_profile_id || null);
  }
  function addLine() {
    const id = configurationId || currentProduct?.configurations[0]?.configuration_price_id;
    if (!id || !currentProduct) return;
    if (lines.some(l => l.configuration_price_id === id)) { setNotice('Эта конфигурация уже добавлена. Измените её количество.'); return; }
    setLines([...lines, { canonical_product_id: productId, configuration_price_id: id, quantity: 1, specifications_ready: false }]); setPreview(null);
  }
  async function calculate() {
    if (!workspace || dirty || !lines.length) return;
    setBusy(true); setError(''); setPreview(null);
    try { const result = await api<{ preview: DeliveryDraftPreview }>({ action: 'preview', expected_revision: workspace.revision, request: { lines, country, postal_code: postal, shipping_method: shippingMethod } }); setPreview(result.preview); }
    catch (e) { setError(e instanceof Error ? e.message : 'delivery_workspace_unavailable'); }
    finally { setBusy(false); }
  }
  return <div className={styles.workspace} aria-busy={busy}>
    <div className={styles.notice}>Черновики для проверки. Сохранение не меняет цены доставки на сайте. Производственные сроки требуют явного типа дней, календаря и допустимого количества товаров.</div>
    {error && <div className={styles.error} role="alert">{message(error)}<details><summary>Код причины</summary>{error}</details>
      {['authentication_required', 'owner_not_allowed'].includes(error) && <Link href="/admin/login?next=/admin/company/delivery" className="owner-button">Войти в кабинет</Link>}
    </div>}
    {notice && <div className={styles.notice} role="status">{notice}</div>}
    <fieldset className={styles.controls} disabled={busy}><legend className="sr-only">Настройки доставки и тестовый заказ</legend>
    <div className={styles.row}><span className="owner-status is-warning">Черновик · версия {workspace?.revision ?? '…'}{dirty ? ' · есть несохранённые изменения' : ''}</span>
      <button type="button" className="owner-button" disabled={busy || !workspace || !dirty} onClick={save}>Сохранить черновик</button>
      <button type="button" className="owner-button" disabled={busy} onClick={reload}>{dirty ? 'Отменить изменения и загрузить сохранённое' : 'Загрузить сохранённое'}</button>
    </div>
    {workspace && <>
      <section className="owner-section"><div className="owner-section-head"><h2>Правила заказа и отправки</h2></div>
        <div className={styles.grid}>
          <label className={styles.field}>Часовой пояс мастерской<input placeholder="Europe/Madrid" value={draft.scheduling_time_zone || ''} onChange={e => change(d => ({ ...d, scheduling_time_zone: e.target.value || null }))} /></label>
          <label className={styles.field}>Приём заказов на текущий день до<input type="time" value={draft.cutoff_local || ''} onChange={e => change(d => ({ ...d, cutoff_local: e.target.value || null }))} /></label>
          <label className={styles.field}>Как объединять товары в посылки<select aria-label="Как объединять товары в посылки" value={draft.combination_rule || ''} onChange={e => change(d => ({ ...d, combination_rule: e.target.value as DeliveryWorkspaceDraft['combination_rule'] || null }))}>
            <option value="">Нужно определить</option><option value="one_parcel_highest_rate">Одна посылка: самая высокая применимая ставка</option><option value="separate_profile_parcels">По профилям: отдельные посылки, сумма ставок</option>
          </select></label>
          <ProfileSelect label="Доставка по умолчанию" value={draft.default_shipping_profile_id} profiles={draft.shipping_profiles} onChange={v => change(d => ({ ...d, default_shipping_profile_id: v }))} />
          <ProfileSelect label="Изготовление по умолчанию" value={draft.default_production_profile_id} profiles={draft.production_profiles} onChange={v => change(d => ({ ...d, default_production_profile_id: v }))} />
        </div>
        <p className={styles.hint}>В режиме отдельных посылок товары одного профиля объединяются до его вместимости. Остаток создаёт ещё одну посылку с той же ставкой. Для одной посылки общее количество должно помещаться в каждый применимый профиль.</p>
        <CalendarFields label="Дни отправки из мастерской" value={draft.dispatch_calendar} onChange={v => change(d => ({ ...d, dispatch_calendar: v }))} />
      </section>
      <section className="owner-section"><div className="owner-section-head"><h2>Профили доставки</h2></div>
        <div className={styles.stack}>{draft.shipping_profiles.map(p => <ShippingProfileEditor key={p.id} profile={p} update={value => change(d => ({ ...d, shipping_profiles: d.shipping_profiles.map(x => x.id === p.id ? value : x) }))} />)}</div>
        <div className="owner-actions"><button type="button" className="owner-button" onClick={() => addShipping()} disabled={draft.shipping_profiles.length >= 50}>Добавить профиль доставки</button>
          <button type="button" className="owner-button" onClick={() => addShipping(true)} disabled={draft.shipping_profiles.length >= 50}>Добавить пример $19 / $35</button></div>
      </section>
      <section className="owner-section"><div className="owner-section-head"><h2>Сроки изготовления</h2></div>
        <div className={styles.stack}>{draft.production_profiles.map(p => <ProductionProfileEditor key={p.id} profile={p} update={value => change(d => ({ ...d, production_profiles: d.production_profiles.map(x => x.id === p.id ? value : x) }))} />)}</div>
        <div className="owner-actions">{[[1, 3], [3, 5], [5, 7], [7, 10]].map(([min, max]) => <button type="button" className="owner-button" key={min} disabled={draft.production_profiles.length >= 50} onClick={() => change(d => ({ ...d, production_profiles: [...d.production_profiles, {
          id: crypto.randomUUID(), name: `Изготовление ${min}–${max} дней`, duration: { min, max, unit: null }, calendar: null, max_units_per_order: null, requires_specifications: false,
        }] }))}>Добавить {min}–{max} дней</button>)}</div>
      </section>
      <section className="owner-section"><div className="owner-section-head"><h2>Привязки к товарам</h2></div>
        <div className={styles.grid}>
          <label className={styles.field}>Товар<select aria-label="Товар" value={productId} onChange={e => selectTarget(e.target.value, '')}><option value="">Выберите товар</option>{catalog.map(p => <option key={p.canonical_product_id} value={p.canonical_product_id}>{p.title}</option>)}</select></label>
          <label className={styles.field}>Конфигурация<select aria-label="Конфигурация" value={configurationId} onChange={e => selectTarget(productId, e.target.value)} disabled={!currentProduct}><option value="">Весь товар</option>{currentProduct?.configurations.map(c => <option key={c.configuration_price_id} value={c.configuration_price_id}>{c.name}</option>)}</select></label>
          <ProfileSelect label="Профиль доставки для привязки" value={shippingId} profiles={draft.shipping_profiles} onChange={setShippingId} />
          <ProfileSelect label="Профиль изготовления для привязки" value={productionId} profiles={draft.production_profiles} onChange={setProductionId} />
        </div>
        <p className={styles.hint}>Затронуто конфигураций: {currentProduct ? configurationId ? 1 : currentProduct.configurations.length : 0}. Точная конфигурация важнее настройки товара; незаданные поля наследуются отдельно.</p>
        <div className="owner-actions"><button type="button" className="owner-button" disabled={!currentProduct} onClick={assign}>Сохранить привязку в черновике</button><button type="button" className="owner-button" disabled={!currentProduct || lines.length >= 20} onClick={addLine}>Добавить выбранное в тестовый заказ</button></div>
        {draft.assignments.length > 0 && <div className={styles.scroll}><table className={styles.table}><thead><tr><th>Товар / конфигурация</th><th>Доставка</th><th>Изготовление</th><th>Действие</th></tr></thead><tbody>{draft.assignments.map(a => {
          const p = catalog.find(x => x.canonical_product_id === a.canonical_product_id);
          return <tr key={`${a.canonical_product_id}:${a.configuration_price_id}`}><td>{p?.title || 'Товар недоступен'}<br/>{a.configuration_price_id ? p?.configurations.find(c => c.configuration_price_id === a.configuration_price_id)?.name || 'Конфигурация недоступна' : 'Весь товар'}</td>
            <td>{draft.shipping_profiles.find(x => x.id === a.shipping_profile_id)?.name || 'Наследовать'}</td><td>{draft.production_profiles.find(x => x.id === a.production_profile_id)?.name || 'Наследовать'}</td>
            <td><button type="button" className="owner-button" aria-label={`Удалить привязку ${p?.title || 'товара'}`} onClick={() => change(d => ({ ...d, assignments: d.assignments.filter(x => x !== a) }))}>Удалить</button></td></tr>;
        })}</tbody></table></div>}
      </section>
      <section className="owner-section"><div className="owner-section-head"><h2>Предпросмотр заказа</h2></div>
        <p className={styles.hint}>Проверяется сохранённая версия. Стоимость товаров не меняется; даты — расчётный сценарий в часовом поясе мастерской, без гарантии даты мероприятия.</p>
        <div className={styles.grid}><label className={styles.field}>Страна назначения<select aria-label="Страна назначения" value={country} onChange={e => { setCountry(e.target.value); setPreview(null); }}><CountryOptions /></select></label>
          <label className={styles.field}>Почтовый индекс<input value={postal} maxLength={32} onChange={e => { setPostal(e.target.value); setPreview(null); }} /></label></div>
        <fieldset className={styles.fieldset}><legend>Метод доставки</legend><div className={styles.row}>
          <label className={styles.method}><input type="radio" name="delivery-method" checked={shippingMethod === 'standard'} onChange={() => { setShippingMethod('standard'); setPreview(null); }} /><Truck size={18} aria-hidden="true" />Стандартная</label>
          <label className={styles.method}><input type="radio" name="delivery-method" checked={shippingMethod === 'express'} onChange={() => { setShippingMethod('express'); setPreview(null); }} /><Plane size={18} aria-hidden="true" />Экспресс</label>
        </div></fieldset>
        {lines.map((line, index) => {
          const product = catalog.find(p => p.canonical_product_id === line.canonical_product_id);
          return <div className={styles.fieldset} key={line.configuration_price_id}><strong>{product?.title}</strong><span className={styles.hint}>{product?.configurations.find(c => c.configuration_price_id === line.configuration_price_id)?.name}</span>
            <label className={styles.field}>Количество<input type="number" min={1} max={1000} value={line.quantity} onChange={e => { setLines(lines.map((l, i) => i === index ? { ...l, quantity: Number(e.target.value) } : l)); setPreview(null); }} /></label>
            <label className={styles.check}><input type="checkbox" checked={line.specifications_ready} onChange={e => { setLines(lines.map((l, i) => i === index ? { ...l, specifications_ready: e.target.checked } : l)); setPreview(null); }} />Мерки / дизайн согласованы в тестовом сценарии</label>
            <button type="button" className="owner-button" onClick={() => { setLines(lines.filter((_, i) => i !== index)); setPreview(null); }}>Удалить из тестового заказа</button></div>;
        })}
        {!lines.length && <p className={styles.hint}>Добавьте товар в тестовый заказ через выбор выше.</p>}
        {dirty && <p className={styles.hint}>Сначала сохраните изменения, чтобы стоимость и даты ссылались на точную версию.</p>}
        <div className="owner-actions"><button type="button" className="owner-button" disabled={busy || dirty || !lines.length || !workspace.version_id} onClick={calculate}>Рассчитать доставку и даты</button></div>
        {preview && <div className={styles.result} role="status"><strong>Черновой расчёт доставки: {new Intl.NumberFormat('ru', { style: 'currency', currency: preview.currency }).format(preview.shipping_amount_minor / 100)}</strong>
          <span>Ожидаемое прибытие всех товаров: {preview.estimated_arrival.from} — {preview.estimated_arrival.to}</span><span>Посылок: {preview.parcel_count} · часовой пояс: {preview.scheduling_time_zone}</span>
          {preview.parcels.map((parcel, i) => <div key={i} className={styles.hint}>Посылка {i + 1}: {parcel.quantity} шт. · изготовление до {parcel.estimate.production_ready.from} — {parcel.estimate.production_ready.to} · отправка {parcel.estimate.dispatch.from} — {parcel.estimate.dispatch.to} · прибытие {parcel.estimate.estimated_arrival.from} — {parcel.estimate.estimated_arrival.to}</div>)}
          <p className={styles.hint}>Этот расчёт не создаёт заказ или оплату и не публикует тарифы для покупателей.</p>
        </div>}
      </section>
    </>}
    </fieldset>
  </div>;
}
