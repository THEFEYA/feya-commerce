/**
 * GDAE / TheFEYA — owner-safe release-scoped archive-to-Case read model.
 * A permanent HTTP L0 receipt is NOT a GDAE attestation, Google indexing,
 * CQA approval, GMEL outcome or authority to transition a Growth Case.
 * Input is a bounded, column-allowlisted server-side SELECT; no raw payload.
 */
export type GdaeReceiptStatus=
  'SOURCE_RETAINED_REVIEW_REQUIRED' | 'NOT_STAGED' | 'SOURCE_UNAVAILABLE' |
  'CASE_RELEASE_UNCONFIRMED' | 'ARCHIVE_NOT_ADMISSIBLE';

export type GdaeArchiveCaseGate={
  status:GdaeReceiptStatus;
  headline:string;
  message:string;
  receiptId:string|null;
  sourceRunId:string|null;
  archivedAt:string|null;
  observedAt:string|null;
  releaseCode:string|null;
  indexObserved:number|null;
  indexExpected:number|null;
  productObserved:number|null;
  productExpected:number|null;
  productsUnobserved:number|null;
  evidenceLevel:'L0_OBSERVATION'|'UNKNOWN';
  canonicalReleaseMatched:boolean;
  missing:string[];
  independentQaConfirmed:false;
  googleIndexedConfirmed:false;
  commercialOutcomeMeasured:false;
  canPromoteSource:false;
  canAdvanceCase:false;
  canLockMeasurementSpec:false;
};
export type GdaeArchiveReceiptRow={
  receipt_id?:unknown;source_code?:unknown;source_channel?:unknown;
  release_id?:unknown;origin?:unknown;
  release_code?:unknown;release_version?:unknown;release_hash?:unknown;
  evidence_level?:unknown;verification_state?:unknown;
  index_urls_observed?:unknown;product_urls_sampled?:unknown;
  product_urls_in_release?:unknown;workflow_run_id?:unknown;
  artifact_id?:unknown;artifact_zip_sha256?:unknown;payload_sha256?:unknown;
  independent_qa_passed?:unknown;google_indexed_state_known?:unknown;
  business_outcome_measured?:unknown;source_health_promoted?:unknown;
  finished_at?:unknown;recorded_at?:unknown;
};
export type GdaeCanonicalReleaseRow={
  release_id?:unknown;release_code?:unknown;release_version?:unknown;
  release_hash?:unknown;release_status?:unknown;target_origin?:unknown;
};
type RequestedRelease={releaseCode:string;releaseVersion:number;
  intendedIndex:number;approvedProducts:number;targetOrigin:string}|null;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SHA64=/^[0-9a-f]{64}$/;
const POSITIVE=/^[1-9][0-9]{0,15}$/;

function positiveId(v:unknown):string|null {
  const raw=typeof v==='number'&&Number.isSafeInteger(v)
    ?String(v):typeof v==='string'?v:null;
  return raw&&POSITIVE.test(raw)?raw:null;
}
function iso(v:unknown):string|null {
  if(typeof v!=='string'||v.length>65)return null;
  const t=Date.parse(v);
  return Number.isFinite(t)?new Date(t).toISOString():null;
}
function base(status:GdaeReceiptStatus,headline:string,message:string):GdaeArchiveCaseGate {
  return {status,headline,message,receiptId:null,sourceRunId:null,
    archivedAt:null,observedAt:null,releaseCode:null,indexObserved:null,indexExpected:null,
    productObserved:null,productExpected:null,productsUnobserved:null,
    evidenceLevel:'UNKNOWN',canonicalReleaseMatched:false,
    missing:['Независимое заключение GDAE о происхождении и границах L0',
      'Независимая проверка QA по кейсу',
      'План GMEL, зафиксированный до изменения'],
    independentQaConfirmed:false,googleIndexedConfirmed:false,
    commercialOutcomeMeasured:false,canPromoteSource:false,
    canAdvanceCase:false,canLockMeasurementSpec:false};
}

export function projectGdaeArchiveForCase(input:{
  caseType:string;
  expectedRelease:RequestedRelease;
  rows:readonly GdaeArchiveReceiptRow[]|null;
  canonicalRows:readonly GdaeCanonicalReleaseRow[]|null;
  readError:boolean;
}):GdaeArchiveCaseGate{
  if(input.caseType!=='TSEO_INDEXABILITY_SHADOW')return base(
    'CASE_RELEASE_UNCONFIRMED','Источники этого типа кейса не проверены',
    'HTTP-архив Search Release не применяется автоматически к другим задачам.');
  const {expectedRelease}=input;
  if(!expectedRelease||!expectedRelease.releaseCode||
    !Number.isSafeInteger(expectedRelease.releaseVersion)||expectedRelease.releaseVersion<1||
    !Number.isSafeInteger(expectedRelease.intendedIndex)||expectedRelease.intendedIndex<1||
    !Number.isSafeInteger(expectedRelease.approvedProducts)||expectedRelease.approvedProducts<1||
    expectedRelease.targetOrigin!=='https://thefeya.com')
    return base('CASE_RELEASE_UNCONFIRMED','Связь с выпуском не подтверждена',
      'Нужен проверенный технический отчёт TSEO с идентичностью Search Release.');
  if(input.readError||!Array.isArray(input.rows)||!Array.isArray(input.canonicalRows))
    return base('SOURCE_UNAVAILABLE','Чтение источника или реестра недоступно',
      'Нельзя подтвердить отсутствие данных, когда защищённый источник не ответил.');
  // The preserved archive asserts identity. The separately read canonical
  // Search Release must agree on ID, version, immutable hash and origin.
  if(input.canonicalRows.length!==1)return base(
    'CASE_RELEASE_UNCONFIRMED','Нельзя однозначно определить Search Release',
    'Требуется ровно одна запись утверждённого выпуска. Не выбираем подходящую наугад.');
  const canonical=input.canonicalRows[0];
  if(!UUID.test(String(canonical.release_id||''))||
    canonical.release_code!==expectedRelease.releaseCode||
    canonical.release_version!==expectedRelease.releaseVersion||
    canonical.release_status!=='ACTIVE'||
    canonical.target_origin!==expectedRelease.targetOrigin||
    typeof canonical.release_hash!=='string'||!SHA64.test(canonical.release_hash))
    return base('CASE_RELEASE_UNCONFIRMED','Текущий Search Release не подтверждён',
      'Код, статус, домен или контрольная сумма канонического выпуска не совпали.');
  if(!input.rows.length)return base('NOT_STAGED','Источник этого выпуска не найден',
    'В приватном архиве нет доступной записи для указанного Search Release.');
  if(input.rows.some(r=>r.release_id!==canonical.release_id||
    r.release_hash!==canonical.release_hash||r.origin!==canonical.target_origin))
    return base('ARCHIVE_NOT_ADMISSIBLE','Различается происхождение сохранённого источника',
      'ID, контрольная сумма или домен архива не совпадают с утверждённым Search Release.');
  const row=input.rows[0];
  const rc=row.release_code,rv=row.release_version;
  const index=row.index_urls_observed,product=row.product_urls_sampled,total=row.product_urls_in_release;
  const correct=typeof rc==='string'&&rc===expectedRelease.releaseCode&&
    rv===expectedRelease.releaseVersion&&
    UUID.test(String(row.receipt_id||''))&&
    row.source_code==='TSEO_PRODUCTION_HTTP_OBSERVATION'&&
    row.source_channel==='GITHUB_ACTIONS_PRODUCTION_ORIGIN'&&
    row.evidence_level==='L0_OBSERVATION'&&
    row.verification_state==='PROVENANCE_REVIEW_REQUIRED'&&
    row.independent_qa_passed===false&&
    row.google_indexed_state_known===false&&
    row.business_outcome_measured===false&&
    row.source_health_promoted===false&&
    typeof row.release_hash==='string'&&SHA64.test(row.release_hash)&&
    row.release_hash===canonical.release_hash&&
    row.release_id===canonical.release_id&&
    row.origin===canonical.target_origin&&
    typeof row.artifact_zip_sha256==='string'&&SHA64.test(row.artifact_zip_sha256)&&
    typeof row.payload_sha256==='string'&&SHA64.test(row.payload_sha256)&&
    positiveId(row.workflow_run_id)!==null&&
    positiveId(row.artifact_id)!==null&&
    Number.isSafeInteger(index)&&index===expectedRelease.intendedIndex&&
    Number.isSafeInteger(product)&&product>0&&
    Number.isSafeInteger(total)&&total===expectedRelease.approvedProducts&&total>product&&
    iso(row.finished_at)!==null&&iso(row.recorded_at)!==null&&
    Date.parse(iso(row.recorded_at)!)>=Date.parse(iso(row.finished_at)!);
  if(!correct)return base('ARCHIVE_NOT_ADMISSIBLE',
    'Архив требует проверки или не соответствует выпуску',
    'Источник не может использоваться даже как отображаемое L0-свидетельство до сверки статуса, полномочий и состава.');
  return {
    ...base('SOURCE_RETAINED_REVIEW_REQUIRED','L0-снимок сохранён, проверка GDAE ожидается',
      'Сохранён HTTP-снимок этого Search Release. Это не подтверждает Google-индексацию, завершение кейса или коммерческий эффект.'),
    receiptId:row.receipt_id as string,sourceRunId:positiveId(row.workflow_run_id),
    releaseCode:row.release_code as string,archivedAt:iso(row.recorded_at),
    observedAt:iso(row.finished_at),indexObserved:index as number,
    indexExpected:expectedRelease.intendedIndex,productObserved:product as number,productExpected:total as number,
    productsUnobserved:(total as number)-(product as number),
    evidenceLevel:'L0_OBSERVATION',
    canonicalReleaseMatched:true,
  };
}
