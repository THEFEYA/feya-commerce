'use client';

import Link from 'next/link';
import { useCallback, useRef, useState } from 'react';
import { X } from 'lucide-react';
import type { LearningRegistryRow } from '@/lib/types';
import { useOwnerDrawerA11y } from '@/components/admin/useOwnerDrawerA11y';
import { statusLabel } from '@/lib/owner-ui/terminology';

function asText(value: unknown, fallback = '—') {
  if (value == null || value === '') return fallback;
  return String(value);
}

function domainLabel(value: unknown) {
  const key = asText(value, '').toUpperCase();
  const labels: Record<string, string> = {
    SEO: 'SEO',
    SEARCH: 'Органический поиск',
    CONTENT: 'Контент',
    PRODUCT: 'Товары',
    COMMERCE: 'Продажи',
    MEASUREMENT: 'Измерение',
    DATA: 'Данные',
    GROWTH: 'Рост',
  };
  return labels[key] || (key ? 'FEYA' : '—');
}

function dateLabel(value: unknown) {
  if (!value) return 'не зафиксировано';
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return asText(value);
  return new Intl.DateTimeFormat('ru-RU', { dateStyle: 'medium' }).format(date);
}

function maturityCopy(value: unknown) {
  const key = asText(value, '').toUpperCase();
  if (key === 'OBSERVATION') return 'Одно наблюдение. Использовать как правило нельзя.';
  if (key === 'REPEATED_OBSERVATION') return 'Наблюдение повторилось, но ещё не стало подтверждённым знанием.';
  if (key === 'REPLICATED_LEARNING') return 'Вывод подтверждён в нескольких контекстах и может использоваться как рабочее знание.';
  if (key === 'POLICY_CANDIDATE') return 'Вывод достаточно зрелый, чтобы рассматривать его как кандидата в правило.';
  if (key === 'ADOPTED_POLICY') return 'Вывод принят как управляемое правило с версией и историей.';
  if (key === 'REJECTED') return 'Гипотеза или вывод отвергнуты и не должны использоваться дальше.';
  if (key === 'RETIRED') return 'Ранее полезный вывод больше не считается актуальным.';
  return 'Зрелость вывода определяется количеством и разнообразием подтверждающих контекстов.';
}

function toneClass(value: unknown) {
  const key = asText(value, '').toUpperCase();
  if (key === 'ADOPTED_POLICY' || key === 'REPLICATED_LEARNING') return 'is-success';
  if (key === 'REJECTED' || key === 'RETIRED') return 'is-danger';
  if (key === 'POLICY_CANDIDATE' || key === 'REPEATED_OBSERVATION') return 'is-warning';
  return 'is-info';
}

export function OwnerLearningDrawerClient({ row }: { row: LearningRegistryRow }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const dialogRef = useRef<HTMLElement | null>(null);
  const closeDrawer = useCallback(() => setOpen(false), []);

  useOwnerDrawerA11y({ open, dialogRef, triggerRef, initialFocusRef: closeRef, close: closeDrawer });

  return (
    <>
      <button ref={triggerRef} type="button" className="owner-button" onClick={() => setOpen(true)}>Подробнее</button>

      {open ? (
        <div className="fixed inset-0 z-[80]" role="presentation">
          <button type="button" aria-label="Закрыть вывод" className="absolute inset-0 h-full w-full bg-black/65 backdrop-blur-[2px]" onClick={closeDrawer} />
          <aside ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={`learning-drawer-${row.learning_id}`} className="owner-drawer absolute right-0 top-0 h-full w-full max-w-[560px] overflow-y-auto">
            <div className="owner-drawer-head sticky top-0 z-10 flex items-start justify-between gap-4 px-5 py-4">
              <div>
                <div className="owner-eyebrow" style={{ marginBottom: '5px' }}>Вывод FEYA</div>
                <h2 id={`learning-drawer-${row.learning_id}`} className="m-0 text-[20px] leading-snug">{asText(row.title, 'Вывод')}</h2>
              </div>
              <button ref={closeRef} type="button" className="owner-button" aria-label="Закрыть" onClick={closeDrawer}><X size={15} /></button>
            </div>

            <div className="owner-drawer-body space-y-4 p-5">
              <section className={`owner-card ${toneClass(row.learning_status)}`}>
                <div className="owner-card-meta">
                  <span className={`owner-status ${toneClass(row.learning_status)}`}>{statusLabel(row.learning_status)}</span>
                  <span>{domainLabel(row.domain)}</span>
                </div>
                <h3 className="owner-card-title">Что мы узнали</h3>
                <p className="owner-card-copy">{asText(row.learning_statement, 'Формулировка вывода пока не зафиксирована.')}</p>
              </section>

              <section className="owner-card">
                <div className="owner-section-kicker">Насколько вывод зрелый</div>
                <p className="owner-card-copy">{maturityCopy(row.learning_status)}</p>
                <div className="owner-role-roster" style={{ marginTop: '10px' }}>
                  <div><span>Доказательств</span><strong>{row.evidence_count ?? 0}</strong></div>
                  <div><span>Разных контекстов</span><strong>{row.distinct_context_count ?? 0}</strong></div>
                  <div><span>Нужно сценариев</span><strong>{row.required_scenario_count ?? 0}</strong></div>
                  <div><span>Обновлено</span><strong>{dateLabel(row.updated_at)}</strong></div>
                </div>
              </section>

              <section className={`owner-card ${row.proposed_policy_code || row.adopted_policy_version ? 'is-success' : 'is-info'}`}>
                <div className={`owner-status ${row.proposed_policy_code || row.adopted_policy_version ? 'is-success' : 'is-info'}`}>
                  {row.adopted_policy_version ? `Принято правило v${row.adopted_policy_version}` : row.proposed_policy_code ? 'Кандидат в правило' : 'Отдельного правила нет'}
                </div>
                <p className="owner-card-copy">
                  {row.adopted_policy_version
                    ? `Правило принято ${dateLabel(row.adopted_at)}. Изменять его следует только как новую версию, сохраняя историю.`
                    : row.proposed_policy_code
                      ? `Предложено правило: ${asText(row.proposed_policy_name, row.proposed_policy_code)}. Оно ещё не становится политикой автоматически.`
                      : 'Наблюдение остаётся знанием/гипотезой и не меняет поведение системы само по себе.'}
                </p>
              </section>

              <div className="owner-actions">
                <Link href="/admin/company/results" className="owner-button">Результаты</Link>
                <Link href="/admin/scenario-tests" className="owner-button">Проверки сценариев</Link>
              </div>

              <details className="owner-disclosure owner-disclosure-section">
                <summary>
                  <span><strong>Технические детали</strong><small>Fingerprint, scope и policy references</small></span>
                  <span className="owner-section-kicker">Advanced</span>
                </summary>
                <div className="owner-disclosure-body owner-card-meta" style={{ marginBottom: 0 }}>
                  <span title={row.learning_id}>Learning ID</span>
                  {row.learning_code ? <span title={row.learning_code}>Learning code</span> : null}
                  {row.learning_fingerprint ? <span title={row.learning_fingerprint}>Fingerprint</span> : null}
                  {row.scope_json ? <span title={JSON.stringify(row.scope_json)}>Scope сохранён</span> : null}
                  {row.proposed_policy_code ? <span title={row.proposed_policy_code}>Policy code</span> : null}
                </div>
              </details>
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}
