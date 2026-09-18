import Link from 'next/link';
import { getAdminReadClient, getMissingAdminDataEnvMessage } from '@/lib/adminData';
import type { ContentBriefCompilerStatusRow } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const BRIEF_LIMIT = 400;

async function getBriefs(): Promise<{ rows: ContentBriefCompilerStatusRow[]; error?: string }> {
  const supabase = getAdminReadClient();
  if (!supabase) return { rows: [], error: getMissingAdminDataEnvMessage() };

  const { data, error } = await supabase
    .from('feya_commerce_v_content_brief_compiler_status_safe_v1')
    .select('*')
    .order('can_produce_canonical_brief', { ascending: false })
    .order('can_generate_shadow', { ascending: false })
    .order('compiler_status', { ascending: true })
    .limit(BRIEF_LIMIT);

  if (error) return { rows: [], error: error.message };
  return { rows: (data || []) as ContentBriefCompilerStatusRow[] };
}

function asText(value: unknown, fallback = '—') {
  if (value == null || value === '') return fallback;
  return String(value);
}

function compilerStatusLabel(value: unknown) {
  const key = asText(value, '').toUpperCase();
  const labels: Record<string, string> = {
    SHADOW_READY: 'Можно готовить безопасный черновик',
    CANONICAL_READY: 'Готово канонически',
    BLOCKED_KEYWORD_REVIEW: 'Блокирует проверка ключевых слов',
    BLOCKED_PRODUCT_FACT_REVIEW: 'Блокирует проверка фактов товара',
    BLOCKED_GENERATION_GATE: 'Блокирует генерация',
    BLOCKED_NO_SEO_PAGE: 'Нет SEO-страницы',
  };
  return labels[key] || asText(value);
}

function statusClass(value: unknown) {
  const normalized = asText(value, '').toUpperCase();
  if (normalized === 'SHADOW_READY' || normalized.includes('CANONICAL_READY')) return 'ok';
  if (normalized.includes('BLOCKED')) return 'danger';
  return 'warning';
}

function count(rows: ContentBriefCompilerStatusRow[], predicate: (row: ContentBriefCompilerStatusRow) => boolean) {
  return rows.filter(predicate).length;
}

export default async function AdminContentBriefsPage() {
  const { rows, error } = await getBriefs();

  const shadowReady = count(rows, (row) => Boolean(row.can_generate_shadow));
  const canonicalReady = count(rows, (row) => Boolean(row.can_produce_canonical_brief));
  const blockedKeyword = count(rows, (row) => row.compiler_status === 'BLOCKED_KEYWORD_REVIEW');
  const blockedFacts = count(rows, (row) => row.compiler_status === 'BLOCKED_PRODUCT_FACT_REVIEW');
  const blockedGeneration = count(rows, (row) => row.compiler_status === 'BLOCKED_GENERATION_GATE');
  const missingPage = count(rows, (row) => row.compiler_status === 'BLOCKED_NO_SEO_PAGE');

  return (
    <main className="page-shell">
      <div className="container">
        <nav className="top-nav">
          <Link href="/admin" className="brand-mark">TheFEYA Admin</Link>
          <div className="nav-links">
            <Link href="/admin/products">Товары</Link>
            <Link href="/admin/seo-portfolio">SEO-страницы</Link>
            <Link href="/admin/seo-clusters">Группы запросов</Link>
            <Link href="/admin/content-briefs">Контентные задания</Link>
            <Link href="/admin/content-qa">Контроль качества</Link>
          </div>
        </nav>

        <section className="phase-banner">
          <div className="phase-label">Детерминированные контентные задания · безопасный режим</div>
          <h1>Контентные задания</h1>
          <p>
            Факты товара, выбранные оси, план ключевых слов, правила бизнеса, политика контента и состояние SEO-страницы собираются без LLM. Каноническая готовность не считается достигнутой, пока нет подтверждённой ответственности страницы и одобренного плана ключевых слов.
          </p>
        </section>

        <section className="grid admin-grid" style={{ marginBottom: '24px' }}>
          <div className="card metric"><strong>{rows.length}</strong><span>Кандидатов заданий</span></div>
          <div className="card metric"><strong>{shadowReady}</strong><span>Можно генерировать безопасный черновик</span></div>
          <div className="card metric"><strong>{canonicalReady}</strong><span>Канонически готовы</span></div>
          <div className="card metric"><strong>{blockedKeyword}</strong><span>Блокирует проверка ключей</span></div>
          <div className="card metric"><strong>{blockedFacts}</strong><span>Блокируют факты товара</span></div>
          <div className="card metric"><strong>{blockedGeneration}</strong><span>Блокирует генерация</span></div>
          <div className="card metric"><strong>{missingPage}</strong><span>Нет SEO-страницы</span></div>
        </section>

        {error ? <div className="notice">{error}</div> : null}

        <div className="notice" style={{ marginBottom: '18px' }}>
          Готовность к безопасному черновику не означает готовность к публикации. Это значит, что фактов и контекста достаточно для экспериментального черновика, но нерешённые ограничения по метрикам и ответственности страницы сохраняются.
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Товар</th>
                <th>Состояние задания</th>
                <th>Факты</th>
                <th>План ключевых слов</th>
                <th>Основной ключ</th>
                <th>SEO-страница</th>
                <th>Ответственность страницы</th>
                <th>Правила бизнеса</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.brief_queue_id}>
                  <td>
                    <Link href={`/admin/products/${row.canonical_product_id}`}>
                      {row.url_path || row.canonical_product_id}
                    </Link>
                    <div className="muted">{asText(row.page_goal_code)}</div>
                  </td>
                  <td>
                    <span className={`status-pill ${statusClass(row.compiler_status)}`}>
                      {compilerStatusLabel(row.compiler_status)}
                    </span>
                    <div className="badge-row">
                      {row.can_generate_shadow ? <span className="badge">безопасный черновик</span> : null}
                      {row.can_produce_canonical_brief ? <span className="status-pill ok">канонически готово</span> : null}
                    </div>
                  </td>
                  <td>
                    {asText(row.product_fact_quality_status)}
                    <div className="muted">{asText(row.generation_gate_status)}</div>
                  </td>
                  <td>{asText(row.plan_status)}</td>
                  <td>{asText(row.primary_keyword)}</td>
                  <td>
                    {row.seo_page_id ? asText(row.indexation_intent) : 'нет'}
                    <div className="muted">{asText(row.page_lifecycle_state)}</div>
                  </td>
                  <td>
                    {row.primary_ownership_count || 0} основных
                    <div className="muted">{row.ownership_count || 0} всего</div>
                  </td>
                  <td>{row.business_truth_count || 0} активных правил</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
