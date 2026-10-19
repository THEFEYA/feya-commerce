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
  productObserved:number|null;
  productExpected:number|null;
  productsUnobserved:number|null;
  evidenceLevel:'L0_OBSERVATION'|'UNKNOWN';
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
  release_code?:unknown;release_version?:unknown;release_hash?:unknown;
  evidence_level?:unknown;verification_state?:unknown;
  index_urls_observed?:unknown;product_urls_sampled?:unknown;
  product_urls_in_release?:unknown;workflow_run_id?:unknown;
  artifact_id?:unknown;artifact_zip_sha256?:unknown;payload_sha256?:unknown;
  independent_qa_passed?:unknown;google_indexed_state_known?:unknown;
  business_outcome_measured?:unknown;source_health_promoted?:unknown;
  finished_at?:unknown;recorded_at?:unknown;
};
type RequestedRelease={releaseCode:string;releaseVersion:number}|null;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SHA64=/^[0-9a-f]{64}$/;
const POSITIVE=/^[1-9][0-9]{0,15}$/;

function iso(v:unknown):string|null {
  if(typeof v!=='string'||v.length>65)return null;
  const t=Date.parse(v);
  return Number.isFinite(t)?new Date(t).toISOString():null;
}
function base(status:GdaeReceiptStatus,headline:string,message:string):GdaeArchiveCaseGate {
  return {status,headline,message,receiptId:null,sourceRunId:null,
    archivedAt:null,observedAt:null,releaseCode:null,indexObserved:null,
    productObserved:null,productExpected:null,productsUnobserved:null,
    evidenceLevel:'UNKNOWN',
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
  readError:boolean;
}):GdaeArchiveCaseGate{
  if(input.caseType!=='TSEO_INDEXABILITY_SHADOW')return base(
    'CASE_RELEASE_UNCONFIRMED','Источники этого типа кейса не проверены',
    'HTTP-архив Search Release не применяется автоматически к другим задачам.');
  const {expectedRelease}=input;
  if(!expectedRelease||!expectedRelease.releaseCode||
    !Number.isSafeInteger(expectedRelease.releaseVersion)||expectedRelease.releaseVersion<1)
    return base('CASE_RELEASE_UNCONFIRMED','Связь с выпуском не подтверждена',
      'Нужен проверенный технический отчёт TSEO с идентичностью Search Release.');
  if(input.readError||!Array.isArray(input.rows))return base(
    'SOURCE_UNAVAILABLE','Чтение архива недоступно',
    'Данные неизвестны. Отсутствие доступа нельзя считать отсутствием источника.');
  if(!input.rows.length)return base('NOT_STAGED','Источник этого выпуска не найден',
    'В приватном архиве нет доступной записи для указанного Search Release.');
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
    typeof row.artifact_zip_sha256==='string'&&SHA64.test(row.artifact_zip_sha256)&&
    typeof row.payload_sha256==='string'&&SHA64.test(row.payload_sha256)&&
    typeof row.workflow_run_id==='string'&&POSITIVE.test(row.workflow_run_id)&&
    typeof row.artifact_id==='string'&&POSITIVE.test(row.artifact_id)&&
    Number.isSafeInteger(index)&&index>0&&
    Number.isSafeInteger(product)&&product>0&&
    Number.isSafeInteger(total)&&total>product&&
    iso(row.finished_at)!==null&&iso(row.recorded_at)!==null;
  if(!correct)return base('ARCHIVE_NOT_ADMISSIBLE',
    'Архив требует проверки или не соответствует выпуску',
    'Источник не может использоваться даже как отображаемое L0-свидетельство до сверки статуса, полномочий и состава.');
  return {
    ...base('SOURCE_RETAINED_REVIEW_REQUIRED','L0-снимок сохранён, проверка GDAE ожидается',
      'Сохранён HTTP-снимок этого Search Release. Это не подтверждает Google-индексацию, завершение кейса или коммерческий эффект.'),
    receiptId:row.receipt_id as string,sourceRunId:row.workflow_run_id as string,
    releaseCode:row.release_code as string,archivedAt:iso(row.recorded_at),
    observedAt:iso(row.finished_at),indexObserved:index as number,
    productObserved:product as number,productExpected:total as number,
    productsUnobserved:(total as number)-(product as number),
    evidenceLevel:'L0_OBSERVATION',
  };
}
