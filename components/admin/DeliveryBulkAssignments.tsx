'use client';

import Image from 'next/image';
import { useMemo, useState } from 'react';
import type { DeliveryCatalogProduct } from '@/lib/commerceDeliveryWorkspace';
import styles from './DeliveryWorkspace.module.css';

/** Display-only projection of the already-approved card view, never a price or Product Truth authority. */
export type DeliveryCatalogMedia = {
  canonical_product_id: string;
  primary_image_url: string;
  product_slug: string;
  product_type: string | null;
};
type Profile = { id: string; name: string };
type Kind = 'shipping' | 'production';

export function DeliveryBulkAssignments({
  catalog, media, shippingProfiles, productionProfiles, onApply,
}: {
  catalog: DeliveryCatalogProduct[];
  media: DeliveryCatalogMedia[];
  shippingProfiles: Profile[];
  productionProfiles: Profile[];
  onApply: (ids: string[], kind: Kind, profileId: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [part, setPart] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [kind, setKind] = useState<Kind>('production');
  const [profileId, setProfileId] = useState('');
  const mediaMap = useMemo(() => new Map(media.map(m => [m.canonical_product_id, m])), [media]);
  const types = useMemo(() => [...new Set(media.map(m => m.product_type).filter((v): v is string => Boolean(v)))].sort(), [media]);
  const visible = useMemo(() => {
    const lower = query.trim().toLocaleLowerCase('ru');
    return catalog.filter(p => {
      const m = mediaMap.get(p.canonical_product_id);
      return (!part || m?.product_type === part) &&
        (!lower || p.title.toLocaleLowerCase('ru').includes(lower) || m?.product_slug.toLocaleLowerCase('ru').includes(lower));
    });
  }, [catalog, mediaMap, query, part]);
  const profiles = kind === 'shipping' ? shippingProfiles : productionProfiles;
  const available = new Set(catalog.map(p => p.canonical_product_id));
  const liveSelected = selected.filter(id => available.has(id));
  const selectedCount = liveSelected.length;
  const configurations = catalog.filter(p => liveSelected.includes(p.canonical_product_id))
    .reduce((sum, product) => sum + product.configurations.length, 0);

  function toggle(id: string, checked: boolean) {
    setSelected(old => checked ? [...new Set([...old, id])] : old.filter(x => x !== id));
  }
  function selectVisible() {
    setSelected(old => [...new Set([...old, ...visible.map(p => p.canonical_product_id)])]);
  }
  function apply() {
    if (!profileId || !selectedCount || !profiles.some(p => p.id === profileId)) return;
    onApply(liveSelected, kind, profileId);
    setSelected([]);
  }
  return <div className={styles.bulkArea}>
    <h3>Массовая привязка по фотографиям</h3>
    <p className={styles.hint}>Выбирайте товары по фото и назначайте один профиль сразу нескольким товарам. Настройки отдельных конфигураций сохраняются и имеют приоритет. Сначала формируется черновик — публичная доставка не меняется.</p>
    {media.length === 0 && <p className={styles.hint}>Фотографии сейчас недоступны. Обычный выбор товара по названию выше продолжает работать.</p>}
    <div className={styles.grid}>
      <label className={styles.field}>Найти товар
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Название или адрес товара" />
      </label>
      <label className={styles.field}>Тип товара
        <select value={part} onChange={e => setPart(e.target.value)}>
          <option value="">Все типы</option>
          {types.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </label>
    </div>
    <div className={styles.row}>
      <span className={styles.hint}>Показано: {visible.length} · выбрано: {selectedCount} · затронуто конфигураций: {configurations}</span>
      <button type="button" className="owner-button" disabled={!visible.length} onClick={selectVisible}>Выбрать показанные</button>
      <button type="button" className="owner-button" disabled={!selectedCount} onClick={() => setSelected([])}>Снять выбор</button>
    </div>
    <div className={styles.bulkGrid} aria-label="Товары для массовой привязки">
      {visible.map(p => {
        const m = mediaMap.get(p.canonical_product_id);
        const checked = liveSelected.includes(p.canonical_product_id);
        return <label key={p.canonical_product_id} className={styles.bulkCard} data-selected={checked}>
          <input type="checkbox" checked={checked} onChange={e => toggle(p.canonical_product_id, e.target.checked)} aria-label={`Выбрать товар: ${p.title}`} />
          <span className={styles.bulkImage}>
            {m?.primary_image_url?.startsWith('https://')
              ? <Image src={m.primary_image_url} alt="" width={92} height={115} loading="lazy" sizes="92px" />
              : <span className={styles.hint}>Нет фото</span>}
          </span>
          <span className={styles.bulkCardText}>{p.title}</span>
        </label>;
      })}
    </div>
    <div className={styles.grid}>
      <label className={styles.field}>Назначить
        <select value={kind} onChange={e => { setKind(e.target.value as Kind); setProfileId(''); }}>
          <option value="production">Срок изготовления</option>
          <option value="shipping">Профиль доставки для объёмных товаров</option>
        </select>
      </label>
      <label className={styles.field}>Выбранный профиль
        <select value={profileId} onChange={e => setProfileId(e.target.value)}>
          <option value="">Сначала выберите профиль</option>
          {profiles.map(p => <option value={p.id} key={p.id}>{p.name}</option>)}
        </select>
      </label>
    </div>
    <div className={styles.row}>
      <button type="button" className="owner-button" disabled={!profileId || !selectedCount} onClick={apply}>
        Применить к {selectedCount} товарам в черновике
      </button>
      <span className={styles.hint}>Изменения ещё нужно сохранить кнопкой «Сохранить черновик» вверху страницы.</span>
    </div>
  </div>;
}
