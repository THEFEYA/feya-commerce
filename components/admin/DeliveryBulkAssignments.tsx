'use client';

import Image from 'next/image';
import { useMemo, useState } from 'react';
import type { DeliveryCatalogProduct, DraftDeliveryAssignment, DeliveryWorkspaceDraft } from '@/lib/commerceDeliveryWorkspace';
import { getProductionAssignmentStatus } from '@/lib/commerceDeliveryBulkDraft';
import styles from './DeliveryWorkspace.module.css';

/** Existing approved storefront thumbnails, display-only and never rate/price authority. */
export type DeliveryCatalogMedia = {
  canonical_product_id: string;
  primary_image_url: string;
  product_slug: string;
  product_type: string | null;
};
type Profile = { id: string; name: string };
type Status = 'unassigned' | 'all' | 'mixed' | `profile:${string}`;

export function DeliveryBulkAssignments({
  catalog, media, productionProfiles, assignments, onApplyAndSave,
}: {
  catalog: DeliveryCatalogProduct[];
  media: DeliveryCatalogMedia[];
  productionProfiles: Profile[];
  assignments: DraftDeliveryAssignment[];
  onApplyAndSave: (ids: string[], profileId: string) => Promise<boolean>;
}) {
  const [query, setQuery] = useState('');
  const [part, setPart] = useState('');
  const [statusFilter, setStatusFilter] = useState<Status>('unassigned');
  const [selected, setSelected] = useState<string[]>([]);
  const [profileId, setProfileId] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState('');

  const mediaMap = useMemo(() => new Map(media.map(m => [m.canonical_product_id, m])), [media]);
  const types = useMemo(() => [...new Set(media.map(m => m.product_type)
    .filter((v): v is string => Boolean(v)))].sort(), [media]);

  const classification = useMemo(() => {
    const draft = { assignments } as DeliveryWorkspaceDraft;
    return new Map(catalog.map(p => [p.canonical_product_id, getProductionAssignmentStatus(draft, p)] as const));
  }, [catalog, assignments]);
  const counts = useMemo(() => {
    const assigned = [...classification.values()].filter(s => s.kind === 'assigned').length;
    const mixed = [...classification.values()].filter(s => s.kind === 'mixed').length;
    return { assigned, mixed, unassigned: catalog.length - assigned - mixed };
  }, [catalog, classification]);

  const visible = useMemo(() => {
    const lower = query.trim().toLocaleLowerCase('ru');
    return catalog.filter(p => {
      const m = mediaMap.get(p.canonical_product_id), s = classification.get(p.canonical_product_id);
      const matches = statusFilter === 'all' || (statusFilter === 'unassigned' && s?.kind === 'unassigned')
        || (statusFilter === 'mixed' && s?.kind === 'mixed')
        || (statusFilter.startsWith('profile:') && s?.kind === 'assigned'
          && s.profile_id === statusFilter.slice('profile:'.length));
      return matches && (!part || m?.product_type === part)
        && (!lower || p.title.toLocaleLowerCase('ru').includes(lower)
          || m?.product_slug.toLocaleLowerCase('ru').includes(lower));
    });
  }, [catalog, classification, query, part, statusFilter, mediaMap]);

  const liveSelected = selected.filter(id => catalog.some(p => p.canonical_product_id === id));
  const configurations = catalog.filter(p => liveSelected.includes(p.canonical_product_id))
    .reduce((total, p) => total + p.configurations.length, 0);

  function toggle(id: string, checked: boolean) {
    setSavedMessage('');
    setSelected(old => checked ? [...new Set([...old, id])] : old.filter(x => x !== id));
  }
  async function applyAndSave() {
    if (saving || !profileId || !liveSelected.length || !productionProfiles.some(p => p.id === profileId)) return;
    setSaving(true); setSavedMessage('');
    try {
      const saved = await onApplyAndSave(liveSelected, profileId);
      if (saved) {
        setSelected([]);
        setSavedMessage('Сохранено в Supabase. Товары перемещены из «Без профиля» в выбранный срок изготовления.');
      } else setSavedMessage('Не удалось подтвердить сохранение. Выбор не потерян; проверьте сообщение выше и повторите.');
    } catch {
      setSavedMessage('Сохранение не подтверждено. Выбор сохранён на экране, повторите действие.');
    } finally { setSaving(false); }
  }

  return <section className={styles.bulkArea} aria-label="Массовое назначение времени изготовления">
    <h3>Изготовление — назначение по фотографиям</h3>
    <p className={styles.hint}>Один срок изготовления на товар. Выбранные изделия исчезают из списка «Без профиля» после сохранения, но доступны в фильтре своего срока для проверки или переназначения. Отдельные сроки конфигураций при явном массовом переназначении заменяются; надбавки за объёмную доставку сохраняются.</p>
    <p className={styles.hint}>Рабочие дни производства: Пн–Пт, выходные исключены. Standard или Express доставку выбирает покупатель, здесь их назначать не нужно.</p>
    {media.length === 0 && <p className={styles.hint}>Фотографии временно недоступны; обычный редактор товаров выше продолжает работать.</p>}
    <div className={styles.grid}>
      <label className={styles.field}>Найти товар
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Название или адрес товара" />
      </label>
      <label className={styles.field}>Тип товара
        <select value={part} onChange={e => { setPart(e.target.value); setSelected([]); }}>
          <option value="">Все типы</option>
          {types.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </label>
    </div>
    <label className={styles.field}>Показывать товары
      <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value as Status); setSelected([]); setSavedMessage(''); }}>
        <option value="unassigned">Без назначенного срока ({counts.unassigned})</option>
        <option value="all">Все товары ({catalog.length})</option>
        {productionProfiles.map(p => {
          const n = [...classification.values()].filter(s => s.kind === 'assigned' && s.profile_id === p.id).length;
          return <option key={p.id} value={`profile:${p.id}`}>{p.name} ({n})</option>;
        })}
        <option value="mixed">Разные сроки / проверить ({counts.mixed})</option>
      </select>
    </label>
    <div className={styles.row}>
      <span className={styles.hint}>Не назначено: {counts.unassigned} · Назначено: {counts.assigned} · Проверить: {counts.mixed}</span>
      <span className={styles.hint}>Показано: {visible.length} · Выбрано: {liveSelected.length} · Конфигураций: {configurations}</span>
      <button type="button" className="owner-button" disabled={saving || !visible.length}
        onClick={() => { setSelected(old => [...new Set([...old, ...visible.map(p => p.canonical_product_id)])]); setSavedMessage(''); }}>
        Выбрать показанные
      </button>
      <button type="button" className="owner-button" disabled={saving || !liveSelected.length}
        onClick={() => { setSelected([]); setSavedMessage(''); }}>Снять выбор</button>
    </div>
    <div className={styles.bulkGrid} aria-label="Товары с фотографиями для назначения срока">
      {visible.map(p => {
        const m = mediaMap.get(p.canonical_product_id);
        const status = classification.get(p.canonical_product_id);
        const label = status?.kind === 'assigned'
          ? productionProfiles.find(x => x.id === status.profile_id)?.name || 'Назначен срок'
          : status?.kind === 'mixed' ? 'Несколько сроков — проверить' : 'Без срока';
        const checked = liveSelected.includes(p.canonical_product_id);
        return <label key={p.canonical_product_id} className={styles.bulkCard} data-selected={checked}>
          <input type="checkbox" disabled={saving} checked={checked}
            onChange={e => toggle(p.canonical_product_id, e.target.checked)}
            aria-label={`Выбрать товар: ${p.title}`} />
          <span className={styles.bulkImage}>
            {m?.primary_image_url?.startsWith('https://')
              ? <Image src={m.primary_image_url} alt="" width={92} height={115} loading="lazy" sizes="92px" />
              : <span className={styles.hint}>Нет фото</span>}
          </span>
          <span className={styles.bulkCardText}>{p.title}</span>
          <span className={styles.bulkCardStatus}>{label}</span>
        </label>;
      })}
      {!visible.length && <p className={styles.hint}>Товаров в этом фильтре нет. Выберите «Все товары» или другой срок.</p>}
    </div>
    <div className={styles.grid}>
      <label className={styles.field}>Назначить срок изготовления
        <select value={profileId} onChange={e => { setProfileId(e.target.value); setSavedMessage(''); }} disabled={saving}>
          <option value="">Выберите срок изготовления</option>
          {productionProfiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </label>
      <div className={styles.bulkAction}>
        <button type="button" className="owner-button" disabled={saving || !profileId || !liveSelected.length}
          onClick={applyAndSave}>
          {saving ? 'Сохраняем в Supabase…' : `Назначить и сохранить: ${liveSelected.length} товаров`}
        </button>
      </div>
    </div>
    {savedMessage && <p className={styles.hint} role="status">{savedMessage}</p>}
    <p className={styles.hint}>Эта кнопка сохраняет черновик сразу в базе одним запросом для выбранной группы. Ничего не публикует и не создаёт оплату.</p>
  </section>;
}
