'use client';

import { useState } from 'react';

type Check = {
  ok: boolean;
  code: string;
  property?: string;
  window?: { start_date: string; end_date: string } | null;
  permission?: string | null;
  days_observed?: number | null;
  last_observed_date?: string | null;
  clicks?: number | null;
  impressions?: number | null;
  source_health_promoted?: false;
  data_written?: false;
};

const explanation: Record<string, string> = {
  GSC_VERIFIED_WITH_FINAL_ROWS: 'Google подтвердил доступ. Сведения о показах и кликах доступны.',
  GSC_VERIFIED_NO_FINAL_ROWS: 'Доступ подтверждён. За проверяемый период Google пока не вернул датированных строк.',
  GSC_READ_DISABLED: 'Серверная проверка выключена. Проверьте FEYA_GSC_READ_ENABLED в Production и выполните Redeploy.',
  GSC_OAUTH_NOT_CONFIGURED: 'На сервере отсутствует одна из трёх переменных GSC OAuth. Проверьте значения Production.',
  GSC_OAUTH_REJECTED: 'Google отклонил OAuth-запрос без распознаваемого кода. Проверьте Client ID, Client Secret и Refresh Token в Vercel Production.',
  GSC_OAUTH_CLIENT_REJECTED: 'Google не принимает Client ID или Client Secret. Исправьте только эти две переменные в Vercel Production, затем Redeploy.',
  GSC_OAUTH_REFRESH_REJECTED: 'Google не принимает Refresh Token: он неверно скопирован, отозван, истёк или выпущен для другого OAuth-клиента. Проверьте/получите новый токен в Google OAuth Playground и замените только FEYA_GSC_OAUTH_REFRESH_TOKEN в Vercel Production.',
  GSC_OAUTH_CLIENT_NOT_ALLOWED: 'Google не разрешает этому OAuth-клиенту обновлять токен. Проверьте статус клиента и Audience в Google Cloud.',
  GSC_OAUTH_REQUEST_INVALID: 'Google обнаружил некорректный OAuth-запрос. Проверьте три отдельные GSC OAuth-переменные и перезапустите Production.',
  GSC_ACCESS_DENIED: 'Google отказал в доступе. Проверьте права на sc-domain:thefeya.com и scope webmasters.readonly.',
  GSC_DOMAIN_PROPERTY_NOT_VISIBLE: 'OAuth работает, но sc-domain:thefeya.com недоступен этому Google-аккаунту.',
  GSC_PROPERTY_MISMATCH: 'Настроен другой ресурс Search Console. Нужен sc-domain:thefeya.com.',
  GSC_GOOGLE_UNAVAILABLE: 'Google временно недоступен. Повторите позднее.',
  GSC_INVALID_GOOGLE_RESPONSE: 'Ответ Google не прошёл проверки данных. Запись не выполнялась.',
  GSC_OWNER_LOGIN_REQUIRED: 'Войдите в защищённую админку владельца и повторите.',
  GSC_OWNER_NOT_ALLOWED: 'Аккаунт не входит в список владельцев TheFEYA.',
  GSC_OWNER_ORIGIN_DENIED: 'Запрос должен выполняться из этого сайта.',
  GSC_OWNER_ACCESS_UNAVAILABLE: 'Защищённый доступ владельца не настроен.',
  GSC_OWNER_AUTH_UNAVAILABLE: 'Служба авторизации временно недоступна.',
};

export function OwnerGscReadinessClient() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Check | null>(null);

  async function check() {
    if (loading) return;
    setLoading(true);
    setResult(null);
    try {
      const response = await fetch('/api/admin/gsc-readonly-probe', {
        method: 'POST',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
      });
      const payload = await response.json() as Partial<Check>;
      if (typeof payload.code !== 'string' || typeof payload.ok !== 'boolean') {
        setResult({ok:false,code:'GSC_OWNER_PROBE_FAILED'});
      } else {
        setResult({ok:payload.ok,code:payload.code,
          property:payload.property,permission:payload.permission,
          window:payload.window,days_observed:payload.days_observed,
          last_observed_date:payload.last_observed_date,
          clicks:payload.clicks,impressions:payload.impressions});
      }
    } catch {
      setResult({ok:false,code:'GSC_OWNER_PROBE_FAILED'});
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="owner-card" style={{ marginBottom: '18px' }}>
      <h2>Google Search Console · подключение</h2>
      <p className="owner-card-copy">
        Проверка прямого чтения с сервера TheFEYA. Никаких изменений SEO,
        товаров, источников или расходов; данные в Supabase не записываются.
      </p>
      <div className="owner-actions">
        <button type="button" className="owner-button primary" disabled={loading} onClick={check}>
          {loading ? 'Проверяем Google…' : 'Проверить подключение GSC'}
        </button>
      </div>
      {result ? (
        <div role="status" aria-live="polite" className="owner-card-copy" style={{ marginTop: '12px' }}>
          <strong>{result.ok ? 'Доступ подтверждён' : 'Подключение пока не подтверждено'}</strong>
          <p>{explanation[result.code] || 'Проверка не завершена. Код: ' + result.code}</p>
          {result.ok ? (
            <p>
              {result.property} · {result.days_observed ?? '—'} дат ·
              {' '}{result.clicks ?? '—'} кликов · {result.impressions ?? '—'} показов.
              {' '}Источник проверен только для чтения.
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
