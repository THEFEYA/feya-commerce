'use client';

import { useState } from 'react';

type GscCaptureReceipt = {
  ok: boolean;
  code: string;
  receipt_id?: string;
  payload_sha256?: string;
  created_new?: boolean;
  property?: string;
  window?: {start_date:string;end_date:string};
  observed_days?: number;
  clicks?: number;
  impressions?: number;
  source_health_promoted?: false;
  auto_gmel_enabled?: false;
};

const failure: Record<string,string> = {
  GSC_CAPTURE_DISABLED: 'Запись выключена. В Vercel → Environment Variables (Production) поменяйте только FEYA_GSC_CAPTURE_ENABLED на true, сохраните и сделайте Redeploy.',
  GSC_CAPTURE_NO_FINAL_ROWS: 'Google не вернул завершённых дневных строк. Не создаём запись с выдуманными нулями.',
  GSC_CAPTURE_NOT_VERIFIED: 'Google пока не подтвердил источник для записи. Сначала выполните проверку подключения GSC.',
  GSC_CAPTURE_INVALID_SOURCE: 'Данные относятся к неподтверждённому источнику. Запись заблокирована.',
  GSC_CAPTURE_INVALID_ROWS: 'Даты или суммы Google не прошли независимую проверку. Запись не выполнялась.',
  GSC_CAPTURE_STALE_RESULT: 'Проверка устарела. Повторите попытку.',
  GSC_CAPTURE_STORAGE_REJECTED: 'Supabase не принял данные. Никакого успеха не подтверждаем.',
  GSC_CAPTURE_STORAGE_RECEIPT_INVALID: 'Получен недействительный чек сохранения. Требуется диагностика.',
  GSC_CAPTURE_STORAGE_UNAVAILABLE: 'Supabase временно недоступен. Повторная попытка безопасна благодаря SHA-256.',
  GSC_CAPTURE_OWNER_ORIGIN_DENIED: 'Действие доступно только с сайта TheFEYA.',
  GSC_CAPTURE_OWNER_LOGIN_REQUIRED: 'Войдите в админку владельца и повторите.',
  GSC_CAPTURE_OWNER_NOT_ALLOWED: 'Текущая учётная запись не имеет прав владельца.',
  GSC_CAPTURE_UNAVAILABLE: 'Выполнение не подтверждено. При повторе дубли не создаются.',
};

export function OwnerGscCaptureClient({ readVerified, captureEnabled }:{
  readVerified: boolean;
  captureEnabled: boolean;
}) {
  const [acknowledged,setAcknowledged] = useState(false);
  const [running,setRunning] = useState(false);
  const [receipt,setReceipt] = useState<GscCaptureReceipt|null>(null);

  async function save() {
    if (!readVerified || !acknowledged || !captureEnabled || running) return;
    setRunning(true);
    setReceipt(null);
    try {
      const response=await fetch('/api/admin/gsc-official-capture',{
        method:'POST',
        credentials:'same-origin',
        cache:'no-store',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({confirm:'SAVE_GSC_OBSERVATION_V1'}),
      });
      const result=await response.json() as Partial<GscCaptureReceipt>;
      if(typeof result.ok==='boolean'&&typeof result.code==='string'){
        setReceipt(result as GscCaptureReceipt);
      }else{
        setReceipt({ok:false,code:'GSC_CAPTURE_UNAVAILABLE'});
      }
    }catch{
      setReceipt({ok:false,code:'GSC_CAPTURE_UNAVAILABLE'});
    }finally{
      setRunning(false);
    }
  }

  return (
    <div style={{marginTop:'18px',paddingTop:'18px',borderTop:'1px solid var(--border, #333)'}}>
      <h3>Первое официальное сохранение GSC</h3>
      <p className="owner-card-copy">
        Одно подтверждённое чтение Google → неизменяемый журнал Supabase.
        Повторное сохранение того же снимка не создаст дубликатов.
        Канонический статус источника, GMEL и AI-бюджет не включаются.
      </p>
      {!captureEnabled ? (
        <p className="owner-card-copy">
          <strong>Запись пока заблокирована.</strong> В Vercel Production
          установите только <code>FEYA_GSC_CAPTURE_ENABLED=true</code>, сохраните
          и сделайте Redeploy. Другие переменные не меняйте.
        </p>
      ):null}
      <label className="owner-card-copy" style={{display:'flex',alignItems:'start',gap:'9px',marginBottom:'12px'}}>
        <input type="checkbox" checked={acknowledged}
          onChange={e=>setAcknowledged(e.target.checked)} />
        <span>Подтверждаю однократное сохранение проверенных данных Google в приватный журнал.</span>
      </label>
      <div className="owner-actions">
        <button type="button" className="owner-button primary"
          disabled={!readVerified||!captureEnabled||!acknowledged||running}
          onClick={save}>
          {running?'Сохраняем и сверяем…':'Сохранить снимок GSC'}
        </button>
      </div>
      {!readVerified ? <p className="owner-card-copy">Сначала нажмите «Проверить подключение GSC» выше.</p> : null}
      {receipt ? (
        <div role="status" aria-live="polite" className="owner-card-copy" style={{marginTop:'12px'}}>
          <strong>{receipt.ok?'Наблюдение сохранено':'Запись не подтверждена'}</strong>
          {receipt.ok ? (
            <p>
              {receipt.created_new?'Создан новый SHA-256 снимок.':'Идентичный снимок уже сохранён, дубля нет.'}
              {' '}{receipt.window?.start_date} — {receipt.window?.end_date}.
              {' '}{receipt.observed_days ?? '—'} дней, {receipt.clicks ?? '—'} кликов,
              {' '}{receipt.impressions ?? '—'} показов.
              {' '}Receipt: {receipt.receipt_id}.
              {' '}GMEL остаётся выключенным.
            </p>
          ) : <p>{failure[receipt.code]||'Ошибка '+receipt.code+'. Повторите после проверки состояния системы.'}</p>}
        </div>
      ) : null}
    </div>
  );
}
