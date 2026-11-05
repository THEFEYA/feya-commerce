import {Archive,CheckCircle2,Clock3,ShieldAlert,GitBranch,BarChart3,Info} from 'lucide-react';
import type {GdaeArchiveCaseGate} from '@/lib/owner-ui/gdaeArchivedSourceGate';
import type {CaseRouteTruth} from '@/lib/owner-ui/growthCaseRouteTruth';
import type {MetricGate} from '@/lib/owner-ui/gmelMetricRegistryReadiness';
import styles from './OwnerGdaeArchivedEvidence.module.css';

function timeLabel(iso:string|null){
  if(!iso)return 'не подтверждено';
  const date=new Date(iso);
  if(!Number.isFinite(date.getTime()))return 'не подтверждено';
  return new Intl.DateTimeFormat('ru-RU',{
    dateStyle:'medium',timeStyle:'short',timeZone:'Europe/Madrid',
  }).format(date);
}
/** The owner gets provenance and next gate only; no raw archive payload or button to mutate Core. */
export function OwnerGdaeArchivedEvidence({gate,route,metricGate}:{
  gate:GdaeArchiveCaseGate;route:CaseRouteTruth|null;metricGate:MetricGate|null;
}){
  const saved=gate.status==='SOURCE_RETAINED_REVIEW_REQUIRED';
  const ownerL0=route?.ownerL0==='CONFIRMED_INTERNAL_ONLY';
  const measurement=route?.measurement||'NO_PLAN';
  return <section className={styles.shell} data-state={gate.status}
    aria-label="Проверка сохранённого SEO-источника GDAE">
    <header className={styles.head}>
      <div className={styles.headIcon}><Archive size={23}/></div>
      <div>
        <div className={styles.eyebrow}>GDAE · ЦЕПОЧКА ДОКАЗАТЕЛЬСТВ</div>
        <h2>Источник → проверка → решение → измерение</h2>
        <p>{gate.headline}</p>
      </div>
    </header>
    {saved&&gate.canonicalReleaseMatched?<p className={styles.authorityProof}>
      <CheckCircle2 size={15}/> ID, SHA и домен архива совпадают с действующим Search Release.
      Это техническая сверка, не независимая QA.
    </p>:null}
    {saved?<div className={styles.numbers}>
      <div><strong>{gate.indexObserved}/{gate.indexExpected}</strong><span>HTTP для index-intent</span></div>
      <div><strong>{gate.productObserved}/{gate.productExpected}</strong><span>HTTP для товаров noindex</span></div>
      <div><strong>{gate.productsUnobserved}</strong><span>Товары без наблюдений</span></div>
    </div>:null}
    <ol className={styles.steps} aria-label="Состояния доказательств">
      <li data-state={saved?'recorded':'unknown'}>
        {saved?<CheckCircle2 size={21}/>:<Archive size={21}/>}
        <strong>1 · Источник L0</strong>
        <small>{saved?'Записан в приватный архив':'Не подтверждён'}</small>
      </li>
      <li data-state="waiting">
        <ShieldAlert size={21}/>
        <strong>2 · Проверка GDAE</strong>
        <small>Независимая QA не зарегистрирована</small>
      </li>
      <li data-state={ownerL0?'recorded':'waiting'}>
        {ownerL0?<CheckCircle2 size={21}/>:<Clock3 size={21}/>}
        <strong>3 · Решение владельца</strong>
        <small>{ownerL0?'Внутренний L0 подтверждён':'Требуется отдельная сверка'}</small>
      </li>
      <li data-state={measurement==='NO_PLAN'||measurement==='DRAFT_ONLY'?'unknown':'waiting'}>
        <BarChart3 size={21}/>
        <strong>4 · План GMEL</strong>
        <small>{measurement==='NO_PLAN'?'План ещё не создан':
          measurement==='DRAFT_ONLY'?'Черновик, не зафиксирован':
          measurement==='LOCKED_NO_OUTCOME'?'Зафиксирован, результат ожидается':
          'Есть запись Outcome, эффект не подтверждён'}</small>
      </li>
    </ol>
    <section className={styles.metricStage} aria-label="Готовность определения метрики GMEL">
      <strong>GMEL · Следующее условие</strong>
      <p>{metricGate?.title || 'Реестр метрик пока недоступен'}</p>
      <small>{metricGate?.next || 'Неизвестное состояние нельзя считать готовностью к измерению.'}</small>
      <span>Метрика TSEO_HTTP_INTENT_MISMATCH_COUNT · без записи или запуска</span>
    </section>
    <div className={styles.explanation}>
      <Info size={16}/>
      <p>{gate.message} Сохранение источника само по себе не меняет статус кейса
      и не разрешает запуск платной модели, публикацию или изменение индексации.</p>
    </div>
    {saved?<details className={styles.details}>
      <summary>Источник и условия дальнейшей проверки</summary>
      <div className={styles.detailsBody}>
        <p>Поисковый выпуск: {gate.releaseCode}; архивная запись: {gate.receiptId}.</p>
        <p>Наблюдение: {timeLabel(gate.observedAt)}; сохранение: {timeLabel(gate.archivedAt)}.</p>
        <p>GitHub run: {gate.sourceRunId}. Уровень: HTTP L0, статус проверки происхождения ожидается.</p>
        <ul>{gate.missing.map(item=><li key={item}>{item}</li>)}</ul>
      </div>
    </details>:null}
    <footer className={styles.foot}><GitBranch size={15}/>
      Данные из существующего защищённого Supabase. Нет отдельного разрешения на переход или Outcome.
    </footer>
  </section>;
}
