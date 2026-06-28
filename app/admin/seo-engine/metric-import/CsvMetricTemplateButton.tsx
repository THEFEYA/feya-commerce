'use client';

import type { SeoMetricValidationCandidate } from '@/lib/seoPilotDraft';

const CSV_COLUMNS = [
  'keyword',
  'bucket',
  'reason',
  'suggested_placement',
  'region',
  'language',
  'metric_source',
  'avg_monthly_searches',
  'competition',
  'low_bid',
  'high_bid',
  'trend',
  'seasonality',
  'last_checked',
  'notes',
];

function escapeCsv(value: string | number | null | undefined) {
  const text = value == null ? '' : String(value);
  if (/[",\n\r]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
  return text;
}

function rowForCandidate(candidate: SeoMetricValidationCandidate) {
  return {
    keyword: candidate.phrase,
    bucket: candidate.bucketId,
    reason: candidate.reason,
    suggested_placement: candidate.suggestedPlacement,
    region: candidate.targetRegions[0] || 'US',
    language: candidate.language,
    metric_source: 'csv_manual',
    avg_monthly_searches: '',
    competition: '',
    low_bid: '',
    high_bid: '',
    trend: '',
    seasonality: '',
    last_checked: '',
    notes: '',
  };
}

function buildCsv(candidates: SeoMetricValidationCandidate[]) {
  const rows = candidates.map(rowForCandidate);
  const header = CSV_COLUMNS.join(',');
  const body = rows.map((row) => CSV_COLUMNS.map((column) => escapeCsv(row[column as keyof typeof row])).join(',')).join('\n');
  return `${header}\n${body}\n`;
}

export function CsvMetricTemplateButton({ candidates }: { candidates: SeoMetricValidationCandidate[] }) {
  function downloadCsv() {
    const csv = buildCsv(candidates);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `thefeya-seo-metric-template-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return <button type="button" onClick={downloadCsv} className="btn-ghost">
    Скачать CSV-шаблон · {candidates.length} фраз
  </button>;
}
