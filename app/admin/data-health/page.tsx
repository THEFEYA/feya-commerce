export const instant = false;

import Link from 'next/link';
import {connection} from 'next/server';
import { OwnerDataError } from '@/components/admin/OwnerDataError';
import { OwnerDataSourceDrawerClient } from '@/components/admin/OwnerDataSourceDrawerClient';
import { getAdminReadClient, getMissingAdminDataEnvMessage } from '@/lib/adminData';
import type { DataSourceHealthRow } from '@/lib/types';
import { dataFreshnessLabel, sourceLabel, statusLabel } from '@/lib/owner-ui/terminology';
import { inspectOfficialGscReceipts, type GscQualityRow } from '@/lib/gscObservedSourceQuality';
import { inspectOfficialGscContinuity } from '@/lib/gscReceiptContinuity';
import { reconcileGscSourceReadiness, type GscEvidenceStatus, type GscRegistryStatus } from '@/lib/gscSourceReadinessProjection';
async function getRows(): Promise<{ rows: DataSourceHealthRow[]; error?: string }> {
  const supabase = getAdminReadClient();
  if (!supabase) return { rows: [], error: getMissingAdminDataEnvMessage() };

  const { data, error } = await supabase
    .from('feya_commerce_v_data_source_health_effective_safe_v2')
    .select('*')
    .order('source_code', { ascending: true });

  if (error) return { rows: [], error: error.message };
  return { rows: (data || []) as DataSourceHealthRow[] };
}

async function getGscObservationQuality(){
  const supabase=getAdminReadClient();
  if(!supabase)return{receipts:[] as GscQualityRow[],quality:inspectOfficialGscReceipts([]),continuity:inspectOfficialGscContinuity([]),error:'Доступ владельца к архиву GSC недоступен'};
  const {data,error}=await supabase
    .from('feya_growth_gsc_observation_receipts_v1')
    .select('receipt_id,source_channel,property_url,search_type,data_state,query_start,query_end,finalized_through,observed_days,daily_rows_json,clicks_total,impressions_total,average_position,payload_sha256,recorded_at,source_health_promoted')
    .eq('source_code','ORGANIC_SEARCH_PERFORMANCE') // Do not hide wrong-property receipts before identity validation.
    .order('recorded_at',{ascending:false})
    .limit(35);
  if(error)return{receipts:[] as GscQualityRow[],quality:inspectOfficialGscReceipts([]),continuity:inspectOfficialGscContinuity([]),error:'Чтение архива GSC недоступно'};
  const receipts = (data||[]) as GscQualityRow[];
  return{receipts,quality:inspectOfficialGscReceipts(receipts),continuity:inspectOfficialGscContinuity(receipts),error:null};
}


const gscEvidenceLabels: Record<GscEvidenceStatus, string> = {
  RECENT_OFFICIAL_L0_NOT_PROMOTED: 'Есть свежие официальные наблюдения (L0), но не подтверждена готовность всей аналитики',
  PARTIAL_PROVIDER_COVERAGE: 'В официальной выборке есть пропуски дат — это не нулевой трафик',
  STALE_OFFICIAL_L0: 'Последние официальные наблюдения устарели',
  INVALID_OFFICIAL_EVIDENCE: 'Официальные снимки не прошли проверку целостности',
  IDENTITY_MISMATCH: 'Идентичность источника или домена не совпадает — выводы заблокированы',
  NO_FINAL_DATE_ROWS: 'Google не вернул окончательных дневных наблюдений',
  UNAVAILABLE: 'Официальных наблюдений пока нет',
};
const gscRegistryLabels: Record<GscRegistryStatus, string> = {
  STALE_REGISTRY: 'Реестр устарел по собственному правилу свежести',
  REGISTRY_SNAPSHOT_CURRENT: 'Реестр проверен в пределах установленного срока',
  REGISTRY_MISSING: 'Источник отсутствует в реестре',
  IDENTITY_MISMATCH: 'Реестр ссылается на другую идентичность источника',
  UNKNOWN_REGISTRY_CLOCK_OR_POLICY: 'У реестра не подтверждены часы проверки или правило свежести',
};

function asText(value: unknown, fallback = '—') {
  if (value == null || value === '') return fallback;
  return String(value);
}

function authorityLabel(value: unknown) {
  const key = asText(value, '').toUpperCase();
  const labels: Record<string, string> = {
    CURRENT_FIRST_PARTY: 'Текущий внутренний источник',
    DERIVED_OPERATIONAL: 'Рассчитано внутри FEYA',
    EXTERNAL_MARKET: 'Внешний рыночный источник',
    LEGACY_FIRST_PARTY: 'Исторический внутренний источник',
  };
  return labels[key] || 'Источник данных';
}

function dateTimeLabel(value: unknown) {
  if (!value) return '—';
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return asText(value);
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(date);
}

function healthRank(value: unknown) {
  const key = asText(value, '').toUpperCase();
  if (key === 'UNAVAILABLE') return 0;
  if (key === 'DEGRADED') return 1;
  if (key === 'NOT_OBSERVABLE' || key === 'STALE') return 2;
  if (key === 'HEALTHY') return 4;
  return 3;
}

function healthClass(value: unknown) {
  const state = asText(value, '').toUpperCase();
  if (state === 'HEALTHY') return 'ok';
  if (state === 'UNAVAILABLE' || state === 'NOT_OBSERVABLE' || state === 'STALE') return 'danger';
  return 'warning';
}

export default async function AdminDataHealthPage() {
  await connection(); // Prevent Cache Components from prerendering dynamic source freshness.
  const [{rows,error},{receipts:gscReceipts,quality:gscQuality,continuity:gscContinuity,error:gscQualityError}] = await Promise.all([getRows(),getGscObservationQuality()]);
  const gscReadiness = reconcileGscSourceReadiness(gscReceipts, rows.find(row => row.source_code === 'ORGANIC_SEARCH_PERFORMANCE') ?? null);

  const healthy = rows.filter((row) => row.health_state === 'HEALTHY').length;
  const degraded = rows.filter((row) => row.health_state === 'DEGRADED').length;
  const unavailable = rows.filter((row) => row.health_state === 'UNAVAILABLE').length;
  const notObservable = rows.filter((row) => row.health_state === 'NOT_OBSERVABLE' || row.health_state === 'STALE').length;

  const issueRows = [...rows]
    .filter((row) => row.health_state !== 'HEALTHY')
    .sort((a, b) => healthRank(a.health_state) - healthRank(b.health_state));
  const healthyRows = [...rows]
    .filter((row) => row.health_state === 'HEALTHY')
    .sort((a, b) => sourceLabel(a.source_code).localeCompare(sourceLabel(b.source_code), 'ru'));

  return (
    <main className="owner-page">
      <div className="owner-page-inner">
        <header className="owner-page-head">
          <div>
            <div className="owner-eyebrow">Система · данные</div>
            <h1>Состояние данных</h1>
            <p>Показываем доступность, свежесть и ограничения источников отдельно. Отсутствующие или устаревшие данные не трактуются как нулевая бизнес-активность.</p>
          </div>
          <div className="owner-actions" style={{ marginTop: 0 }}>
            <Link href="/admin/company/system#sources" className="owner-button">Назад к системе</Link>
            <Link href="/admin/data-authority" className="owner-button">Источники истины</Link>
          </div>
        </header>

        <section className="owner-summary-strip" style={{ marginBottom: '20px' }}>
          <div className="owner-summary-cell"><strong>{unavailable}</strong><span>Недоступны</span></div>
          <div className="owner-summary-cell"><strong>{degraded}</strong><span>Работают с ограничениями</span></div>
          <div className="owner-summary-cell"><strong>{notObservable}</strong><span>Нет свежей проверки</span></div>
          <div className="owner-summary-cell"><strong>{healthy}</strong><span>Работают нормально</span></div>
        </section>

        {error ? <OwnerDataError error={error} /> : null}

        <div className="owner-card is-info" style={{ marginBottom: '18px' }}>
          <div className="owner-status is-info">Как читать экран</div>
          <p className="owner-card-copy">Это последний сохранённый снимок канонического состояния источников. Общий планировщик проверки их здоровья пока не запущен. Отдельный ежедневный сбор GSC проверяется по фактически сохранённым квитанциям ниже и не повышает этот статус автоматически.</p>
        </div>

        <section className="owner-card is-info" style={{ marginBottom: '18px' }}>
          <div className="owner-card-meta"><span className="owner-status is-info">GDAE · наблюдение, не каноническое здоровье</span><span>Google Search Console</span></div>
          <h2>Фактическая история органического поиска</h2>
          {!gscQualityError ? (
            <div style={{ marginBottom: '12px' }}>
              <div className="owner-card-meta">
                <span className={gscReadiness.evidenceLevel === 'L0' ? 'owner-status is-info' : 'owner-status is-warning'}>
                  GSC: {gscReadiness.evidenceLevel}
                </span>
                <span className={gscReadiness.registryStatus === 'REGISTRY_SNAPSHOT_CURRENT' ? 'owner-status is-info' : 'owner-status is-warning'}>
                  {gscReadiness.registryStatus === 'STALE_REGISTRY' ? 'Реестр устарел' : 'Реестр: проверка'}
                </span>
              </div>
              <p className="owner-card-copy">
                <strong>{gscEvidenceLabels[gscReadiness.evidenceStatus]}.</strong>
                {' '}Канонический реестр: {statusLabel(gscReadiness.canonicalHealthState)} / {dataFreshnessLabel(gscReadiness.canonicalFreshnessState)}.
                {' '}{gscRegistryLabels[gscReadiness.registryStatus]}.
              </p>
              <details className="owner-disclosure owner-disclosure-section">
                <summary>
                  <span><strong>Почему вывод ограничен</strong><small>Источники, часы проверки, покрытие и доказательства</small></span>
                </summary>
                <div className="owner-disclosure-body">
                  <p className="owner-card-copy">
                    Официальный источник: {gscReadiness.officialProperty}. Последний сохранённый снимок: {dateTimeLabel(gscReadiness.recordedAt)}.
                    {' '}Последний окончательный день Google: {gscReadiness.finalizedThrough ?? 'не подтверждён'}.
                    {' '}Ожидаемый окончательный день: {gscReadiness.expectedFinalDate ?? 'не определён'}.
                  </p>
                  <p className="owner-card-copy">
                    Канонический источник: {gscReadiness.sourceIdentity}.
                    {' '}Реестр проверен: {dateTimeLabel(gscReadiness.canonicalCheckedAt)}.
                    {' '}Максимальный возраст проверки: {gscReadiness.expectedRegistryMaxAgeSeconds == null ? 'не установлен' : gscReadiness.expectedRegistryMaxAgeSeconds + ' секунд'}.
                  </p>
                  <p className="owner-card-copy">
                    Пропущено дней внутри снимка: {gscReadiness.missingDays ?? 'неизвестно'}.
                    {' '}Ожидаемых окончательных дней без покрытия: {gscReadiness.uncoveredFinalDays ?? 'неизвестно'}.
                    {' '}Сверка снимков: {gscReadiness.continuity.state === 'INSUFFICIENT_HISTORY' ? 'недостаточно истории' :
                      gscReadiness.continuity.state === 'OVERLAP_MATCH' ? 'общие даты без изменений' :
                      gscReadiness.continuity.state === 'OVERLAP_REVISED' ? 'Google уточнил данные за общие даты' :
                      gscReadiness.continuity.state === 'NO_SHARED_DATES' ? 'нет общих наблюдаемых дат' : 'проверка не пройдена'}.
                  </p>
                  <p className="owner-role-note">Этот снимок нельзя использовать для выводов о заказах, конверсии, выручке или эффективности изменений. Переключение готовности источника и запуск GMEL — отдельные проверяемые действия, не результат этой страницы.</p>
                </div>
              </details>
            </div>
          ) : null}
          {gscQualityError ? <p className="owner-card-copy">{gscQualityError}</p>
           :gscQuality.state==='NO_OFFICIAL_OBSERVATION' ?
            <p className="owner-card-copy">Официальных сохранённых наблюдений ещё нет. Отсутствие данных не означает ноль кликов.</p>
           :gscQuality.state==='INVALID_OFFICIAL_OBSERVATION' ?
            <p className="owner-card-copy">Последняя запись не прошла проверку дат и сумм. Показатели заблокированы до технической проверки.</p>
           :gscQuality.state==='NO_FINAL_DATE_ROWS' ?
            <p className="owner-card-copy">Google не вернул окончательных дневных наблюдений. Показатели неизвестны, не нулевые.</p>
           :<>
             <p className="owner-card-copy">
               Последняя подтверждённая выборка: {gscQuality.startDate} — {gscQuality.finalDate},
               {' '}{gscQuality.observedDays} дней, {gscQuality.clicks} кликов,
               {' '}{gscQuality.impressions} показов. Средняя позиция: {gscQuality.averagePosition?.toFixed(2) ?? '—'}.
             </p>
             <p className="owner-card-copy">
               {gscQuality.missingDays===0?'Пропусков дат внутри снимка нет.':
                 `Пропущенных дат: ${gscQuality.missingDays}. Это отсутствие наблюдения, не нулевая активность.`}
               {' '}Дата последнего Google-наблюдения: {gscQuality.finalDate}.
               {gscQuality.uncoveredFinalDays? ` Ожидаемых, но ещё не покрытых окончательных дней: ${gscQuality.uncoveredFinalDays}.`:''}
             </p>
             <p className="owner-card-meta">
               <span>Receipt: {gscQuality.receiptId}</span>
               <span>SHA-256: {gscQuality.evidenceSha256?.slice(0,16)}…</span>
             </p>
           </>}
          {!gscQualityError && gscContinuity.state === 'OVERLAP_MATCH' ? (
            <p className="owner-card-copy">
              Сверка двух официальных снимков: {gscContinuity.sharedObservedDays} общих наблюдаемых дат,
              изменений дневных кликов, показов и позиции нет. Разные 14-дневные суммы не считаются ростом.
            </p>
          ) : !gscQualityError && gscContinuity.state === 'OVERLAP_REVISED' ? (
            <p className="owner-card-copy">
              В двух официальных снимках {gscContinuity.sharedObservedDays} общих дат,
              Google пересмотрел показатели за {gscContinuity.changedObservedDays} из них
              (клики: {gscContinuity.changedClickDays}, показы: {gscContinuity.changedImpressionDays},
              позиция: {gscContinuity.changedPositionDays}). Это изменение исходных данных, не бизнес-результат.
            </p>
          ) : !gscQualityError && gscContinuity.state === 'UNVERIFIED_EVIDENCE' ? (
            <p className="owner-card-copy">
              Сравнение двух снимков заблокировано: один из источников не прошёл независимую проверку структуры.
            </p>
          ) : !gscQualityError && gscContinuity.state === 'NO_SHARED_DATES' ? (
            <p className="owner-card-copy">
              Два официальных снимка существуют, но не содержат общих наблюдаемых дат.
              Непрерывность и отсутствие исправлений пока не доказаны.
            </p>
          ) : !gscQualityError ? (
            <p className="owner-card-copy">
              Для проверки изменений нужен второй официальный снимок GSC; отсутствие истории не означает отсутствие поискового трафика.
            </p>
          ) : null}
          <p className="owner-role-note">Это уровень L0: наблюдение GSC. Наличие снимка не подтверждает конверсии, прибыль или причинный рост. Канонический статус источника не повышен; GMEL/AI-бюджет не активированы.</p>
          <div className="owner-actions"><Link href="/admin/system-readiness" className="owner-button">Проверить прямое подключение GSC</Link></div>
        </section>

        <section className="owner-section" style={{ marginTop: 0 }}>
          <div className="owner-section-head">
            <div>
              <h2>Что ограничивает решения сейчас</h2>
              <div className="owner-section-kicker">Сначала только источники с проблемами доступности, свежести или наблюдения</div>
            </div>
          </div>

          {issueRows.length ? (
            <div className="owner-list">
              {issueRows.map((row) => {
                const state = String(row.health_state || '');
                const tone = state === 'UNAVAILABLE' || state === 'NOT_OBSERVABLE' || state === 'STALE' ? 'is-danger' : 'is-warning';
                return (
                  <article className="owner-list-row" key={`${row.source_code}-${row.source_instance_key || 'default'}`}>
                    <div className="owner-list-row-main">
                      <div className="owner-card-meta">
                        <span className={`owner-status ${tone}`}>{statusLabel(row.health_state)}</span>
                        <span>{dataFreshnessLabel(row.freshness_state)}</span>
                        <span>{authorityLabel(row.authority_tier)}</span>
                      </div>
                      <h3>{sourceLabel(row.source_code)}</h3>
                      <p>{row.error_message ? asText(row.error_message) : 'Источник доступен не полностью или его состояние пока нельзя надёжно наблюдать.'}</p>
                    </div>
                    <div className="owner-list-row-side">
                      <span className="owner-section-kicker">данные: {dateTimeLabel(row.watermark_at)}</span>
                      <span className="owner-section-kicker">проверено: {dateTimeLabel(row.checked_at)}</span>
                      <OwnerDataSourceDrawerClient row={row} />
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="owner-card is-success">
              <div className="owner-status is-success">Проблемных источников нет</div>
              <p className="owner-card-copy">Все наблюдаемые источники в последнем снимке работают нормально.</p>
            </div>
          )}
        </section>

        {healthyRows.length ? (
          <section className="owner-section">
            <details className="owner-disclosure owner-disclosure-section">
              <summary>
                <span><strong>Работают нормально</strong><small>Скрыты по умолчанию, потому что не требуют внимания</small></span>
                <span className="owner-section-kicker">{healthyRows.length}</span>
              </summary>
              <div className="owner-disclosure-body owner-grid two">
                {healthyRows.map((row) => (
                  <article className="owner-card is-success" key={`${row.source_code}-${row.source_instance_key || 'default'}`}>
                    <div className="owner-card-meta">
                      <span className="owner-status is-success">Работает</span>
                      <span>{dataFreshnessLabel(row.freshness_state)}</span>
                    </div>
                    <h3 className="owner-card-title">{sourceLabel(row.source_code)}</h3>
                    <p className="owner-card-copy">Последние данные: {dateTimeLabel(row.watermark_at)} · проверено: {dateTimeLabel(row.checked_at)}</p>
                    <div className="owner-actions"><OwnerDataSourceDrawerClient row={row} /></div>
                  </article>
                ))}
              </div>
            </details>
          </section>
        ) : null}

        <section className="owner-section">
          <details className="owner-disclosure owner-disclosure-section">
            <summary>
              <span><strong>Полный снимок источников</strong><small>Техническая таблица с количеством строк и исходными ограничениями</small></span>
              <span className="owner-section-kicker">{rows.length}</span>
            </summary>
            <div className="owner-disclosure-body">
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>Источник</th><th>Тип</th><th>Состояние</th><th>Свежесть</th><th>Последние данные</th><th>Строк</th><th>Ограничение</th><th>Проверено</th></tr>
                  </thead>
                  <tbody>
                    {[...rows].sort((a, b) => healthRank(a.health_state) - healthRank(b.health_state)).map((row) => (
                      <tr key={`${row.source_code}-${row.source_instance_key || 'default'}`}>
                        <td><strong title={asText(row.source_code)}>{sourceLabel(row.source_code)}</strong></td>
                        <td>{authorityLabel(row.authority_tier)}</td>
                        <td>{statusLabel(row.health_state)}</td>
                        <td>{dataFreshnessLabel(row.freshness_state)}</td>
                        <td>{dateTimeLabel(row.watermark_at)}</td>
                        <td>{row.observed_row_count ?? '—'}</td>
                        <td>{asText(row.error_message)}</td>
                        <td>{dateTimeLabel(row.checked_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </details>
        </section>
      </div>
    </main>
  );
}
