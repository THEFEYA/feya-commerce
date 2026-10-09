'use client';

import { DELIVERY_COUNTRIES, type DraftCalendar, type DraftDuration, type DraftShippingMethod } from '@/lib/commerceDeliveryWorkspace';
import styles from './DeliveryWorkspace.module.css';
import { useState } from 'react';
import { standardWeekCalendar } from '@/lib/commerceDeliveryRegularWeek';

const weekdays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const displayNames = new Intl.DisplayNames(['ru'], { type: 'region' });
export function CountryOptions() {
  return <>{DELIVERY_COUNTRIES.map(code => <option key={code} value={code}>{displayNames.of(code)} ({code})</option>)}</>;
}
export function CountryCodesField({ label, value, onChange }: { label: string; value: string[]; onChange: (v: string[]) => void }) {
  const [editing, setEditing] = useState(false), [text, setText] = useState('');
  return <label className={styles.field}>{label}<input placeholder="US, GB, DE, AU" value={editing ? text : value.join(', ')}
    onFocus={() => { setText(value.join(', ')); setEditing(true); }} onBlur={() => setEditing(false)}
    onChange={e => { setText(e.target.value); onChange([...new Set(e.target.value.toUpperCase().split(/[\s,;]+/).filter(Boolean))]); }} /></label>;
}
export function CalendarFields({ label, value, onChange, fixedWorkweek = false }: { label: string; value: DraftCalendar | null; onChange: (v: DraftCalendar | null) => void; fixedWorkweek?: boolean }) {
  if (fixedWorkweek) {
    const current = standardWeekCalendar(value);
    return <fieldset className={styles.fieldset}>
      <legend>{label}</legend>
      <p className={styles.hint}>Понедельник–пятница — рабочие дни автоматически. Суббота и воскресенье всегда исключены из обычных сроков.</p>
      <label className={styles.field}>Дополнительные нерабочие даты (если есть)
        <textarea rows={2} placeholder="YYYY-MM-DD — одна дата в строке"
          value={current.holidays.join('\n')}
          onChange={e => onChange({ ...current, holidays: e.target.value.split('\n') })}
          onBlur={() => onChange({ ...current, holidays: [...new Set(current.holidays.map(d => d.trim()).filter(Boolean))] })} />
      </label>
    </fieldset>;
  }
  return <fieldset className={styles.fieldset}>
    <legend>{label}</legend>
    <p className={styles.hint}>Отметьте рабочие дни. Праздники: YYYY-MM-DD, по одной дате в строке.</p>
    <div className={styles.row}>
      {weekdays.map((day, i) => <label className={styles.check} key={day}>
        <input type="checkbox" checked={Boolean(value?.working_weekdays.includes(i + 1))} onChange={e => {
          const days = e.target.checked ? [...(value?.working_weekdays || []), i + 1].sort() : (value?.working_weekdays || []).filter(d => d !== i + 1);
          onChange(days.length ? { working_weekdays: days, holidays: value?.holidays || [] } : null);
        }} />{day}
      </label>)}
    </div>
    <label className={styles.field}>Праздники
      <textarea rows={2} value={value?.holidays.join('\n') || ''} disabled={!value} onChange={e => value && onChange({ ...value, holidays: e.target.value.split('\n') })} onBlur={() => value && onChange({ ...value, holidays: [...new Set(value.holidays.map(d => d.trim()).filter(Boolean))] })} />
    </label>
    {!value && <p className={styles.hint}>Календарь пока не задан.</p>}
  </fieldset>;
}
export function DurationFields({ label, value, onChange, fixedBusinessDays = false }: { label: string; value: DraftDuration | null; onChange: (v: DraftDuration | null) => void; fixedBusinessDays?: boolean }) {
  return <fieldset className={styles.fieldset}>
    <legend>{label}</legend>
    <div className={styles.grid}>
      <label className={styles.field}>От, дней<input type="number" min={0} max={365} value={value?.min ?? ''} onChange={e => onChange(e.target.value === '' ? null : { min: Number(e.target.value), max: value?.max ?? Number(e.target.value), unit: fixedBusinessDays ? 'business_days' : (value?.unit ?? null) })} /></label>
      <label className={styles.field}>До, дней<input type="number" min={0} max={365} value={value?.max ?? ''} onChange={e => onChange(e.target.value === '' ? null : { min: value?.min ?? Number(e.target.value), max: Number(e.target.value), unit: fixedBusinessDays ? 'business_days' : (value?.unit ?? null) })} /></label>
      {fixedBusinessDays ? <p className={styles.hint}>Рабочие дни: только Пн–Пт. Учитывается автоматически.</p> : <label className={styles.field}>Какие дни<select aria-label="Какие дни" value={value?.unit || ''} onChange={e => onChange({ min: value?.min ?? 0, max: value?.max ?? 0, unit: e.target.value as DraftDuration['unit'] || null })}>
        <option value="">Нужно уточнить</option><option value="calendar_days">Календарные</option><option value="business_days">Рабочие по календарю</option>
      </select></label>}
    </div>
  </fieldset>;
}
export function MethodFields({ label, value, onChange }: { label: string; value: DraftShippingMethod | null; onChange: (v: DraftShippingMethod | null) => void }) {
  return <fieldset className={styles.fieldset}>
    <legend>{label}</legend>
    <label className={styles.check}><input type="checkbox" checked={value !== null} onChange={e => onChange(e.target.checked ? { amount_minor: null, transit: null, calendar: standardWeekCalendar(null) } : null)} />Метод доступен в этом правиле</label>
    {value && <>
      <label className={styles.field}>Цена доставки<input type="number" min={0} max={1000000} step="0.01" value={value.amount_minor === null ? '' : value.amount_minor / 100} onChange={e => onChange({ ...value, amount_minor: e.target.value === '' ? null : Math.round(Number(e.target.value) * 100) })} /></label>
      <p className={styles.hint}>В валюте профиля. Пустое поле — цена не задана; 0 — явная бесплатная доставка в черновике.</p>
      <DurationFields label="В пути после отправки" fixedBusinessDays value={value.transit} onChange={transit => onChange({ ...value, transit })} />
      <CalendarFields label="Календарь перевозчика" fixedWorkweek value={value.calendar} onChange={calendar => onChange({ ...value, calendar })} />
    </>}
  </fieldset>;
}
