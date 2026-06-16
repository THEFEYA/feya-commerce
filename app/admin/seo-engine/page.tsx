// @ts-nocheck
import Link from 'next/link';
import { ArrowUpRight, Database, FileCheck2, FileText, FlaskConical, Layers3, SearchCheck, ShieldCheck } from 'lucide-react';
import { getMissingSupabaseEnvMessage, getSupabaseReadClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const SOURCE_SELECT = 'source_code,source_name,source_type,connection_status,priority_level,notes';
const STATUS_SELECT = 'product_slug,collection_slug,page_type,brief_status,primary_keyword,asset_status,check_status,qa_approved';

async function safeCount(supabase, tableName, columnName) {
  const { count, error } = await supabase.from(tableName).select(columnName, { count: 'exact', head: true });
  return { count: count || 0, error: error?.message || null };
}

async function loadEngine() {
  const supabase = getSupabaseReadClient();
  if (!supabase) return { sources: [], rows: [], counts: {}, error: getMissingSupabaseEnvMessage() };

  const [sources, rows, keywords, briefs, assets, checks, runs, conflicts] = await Promise.all([
    supabase.from('feya_seo_source_connections_v1').select(SOURCE_SELECT).order('priority_level', { ascending: true }),
    supabase.from('feya_commerce_v_seo_content_engine_status_v1').select(STATUS_SELECT).limit(120),
    safeCount(supabase, 'feya_keyword_candidates_v1', 'keyword_candidate_id'),
    safeCount(supabase, 'feya_seo_briefs_v1', 'seo_brief_id'),
    safeCount(supabase, 'feya_seo_content_assets_v1', 'content_asset_id'),
    safeCount(supabase, 'feya_seo_quality_checks_v1', 'quality_check_id'),
    safeCount(supabase, 'feya_seo_generation_runs_v1', 'generation_run_id'),
    safeCount(supabase, 'feya_seo_cannibalization_map_v1', 'cannibalization_id'),
  ]);

  const error = [sources.error?.message, rows.error?.message, keywords.error, briefs.error, assets.error, checks.error, runs.error, conflicts.error].filter(Boolean)[0] || null;

  return {
    sources: sources.data || [],
    rows: rows.data || [],
    counts: {
      keywords: keywords.count,
      briefs: briefs.count,
      assets: assets.count,
      checks: checks.count,
      runs: runs.count,
      conflicts: conflicts.count,
    },
    error,
  };
}

function tone(status = '') {
  if (['connected', 'active', 'approved', 'applied'].includes(status)) return 'success';
  if (['planned', 'manual_only', 'manual_import', 'optional_later', 'paid_later', 'later_after_indexation', 'draft'].includes(status)) return 'warning';
  return 'neutral';
}

function Chip({ children, tone: toneName = 'neutral' }) {
  const className = toneName === 'success'
    ? 'border-[rgba(108,183,138,.35)] text-[#a9dfbd] bg-[rgba(108,183,138,.08)]'
    : toneName === 'warning'
      ? 'border-[rgba(212,178,106,.30)] text-[var(--gold-warm)] bg-[rgba(212,178,106,.07)]'
      : 'border-[rgba(216,214,211,.16)] text-[var(--bone-dim)] bg-black/15';
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] ${className}`}>{children}</span>;
}

function Metric({ label, value, icon: Icon }) {
  return <div className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] p-5">
    <div className="flex items-center justify-between gap-4 mb-4"><div className="eyebrow-dim">{label}</div><Icon size={16} className="text-[var(--gold-warm)]" /></div>
    <div className="font-price text-gold-grad text-[40px] leading-none">{value || 0}</div>
  </div>;
}

export default async function SeoEnginePage() {
  const { sources, rows, counts, error } = await loadEngine();

  return <main className="min-h-screen bg-[radial-gradient(circle_at_80%_0%,rgba(212,178,106,.13),transparent_32%),linear-gradient(180deg,#07070A,#111016_45%,#07070A)]">
    <section className="container-feya pt-10 pb-16">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between border-b border-[rgba(216,214,211,.12)] pb-7 mb-7">
        <div>
          <div className="eyebrow-gold mb-3">Admin · SEO Content Intelligence Engine</div>
          <h1 className="font-tall text-bone leading-none" style={{ fontSize: 'clamp(44px,7vw,88px)' }}>SEO Engine</h1>
          <p className="mt-4 max-w-3xl text-[15px] leading-relaxed text-[var(--bone-dim)]">Pre-indexation workspace for keyword candidates, SEO briefs, content assets, QA checks and anti-cannibalization memory.</p>
        </div>
        <div className="flex flex-wrap gap-3"><Link href="/admin/seo-lab" className="btn-ghost">SEO Lab <ArrowUpRight size={13} /></Link><Link href="/admin/content" className="btn-ghost">Content <ArrowUpRight size={13} /></Link><Link href="/admin/products" className="btn-ghost">Products <ArrowUpRight size={13} /></Link></div>
      </div>

      {error ? <div className="rounded-2xl border border-[rgba(212,178,106,.30)] bg-[rgba(212,178,106,.07)] p-5 text-[13px] leading-relaxed text-[var(--bone-dim)] mb-7">Apply <span className="text-bone">supabase/migrations/20260616_seo_content_engine_v1.sql</span> in Supabase, then refresh. First database response: {error}</div> : null}

      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 mb-8"><Metric icon={SearchCheck} label="Keywords" value={counts.keywords} /><Metric icon={FileText} label="Briefs" value={counts.briefs} /><Metric icon={FileCheck2} label="Assets" value={counts.assets} /><Metric icon={ShieldCheck} label="QA" value={counts.checks} /><Metric icon={FlaskConical} label="Runs" value={counts.runs} /><Metric icon={Layers3} label="Conflicts" value={counts.conflicts} /></div>

      <div className="grid xl:grid-cols-[1fr_420px] gap-6">
        <div className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[rgba(216,214,211,.10)]"><div><div className="eyebrow-gold mb-1">Source adapters</div><div className="text-[12px] text-[var(--bone-dim)]">External services are signals, not the core.</div></div><Database size={18} className="text-[var(--gold-warm)]" /></div>
          <div className="divide-y divide-[rgba(216,214,211,.08)]">{sources.length ? sources.map((source) => <div key={source.source_code} className="grid md:grid-cols-[1fr_140px] gap-4 px-5 py-4 items-center"><div><div className="text-bone text-[14px] leading-snug">{source.source_name}</div><div className="mt-1 text-[11px] leading-relaxed text-[var(--bone-dim)]">{source.notes || source.source_code}</div></div><Chip tone={tone(source.connection_status)}>{source.connection_status}</Chip></div>) : <div className="px-5 py-5 text-[13px] text-[var(--bone-dim)]">No source rows yet.</div>}</div>
        </div>

        <div className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-black/20 p-5"><div className="eyebrow-gold mb-4">Next practical slice</div><div className="space-y-3 text-[13px] leading-relaxed text-[var(--bone-dim)]"><p>1. Apply migration in Supabase.</p><p>2. Generate first manual/old-Etsy keyword candidates.</p><p>3. Build first SEO brief draft for one product.</p><p>4. Save first content asset draft and QA result.</p></div></div>
      </div>

      <div className="mt-6 rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] overflow-hidden"><div className="grid grid-cols-[1.2fr_.7fr_.8fr_.8fr] gap-4 px-5 py-4 border-b border-[rgba(216,214,211,.10)] text-[10px] uppercase tracking-[0.22em] text-[var(--smoke)]"><div>Page</div><div>Type</div><div>Brief</div><div>QA</div></div><div className="divide-y divide-[rgba(216,214,211,.08)]">{rows.length ? rows.map((row, index) => <div key={`${row.page_type}-${row.product_slug || row.collection_slug || index}`} className="grid grid-cols-[1.2fr_.7fr_.8fr_.8fr] gap-4 px-5 py-4 items-center"><div><div className="text-bone text-[14px] leading-snug">{row.product_slug || row.collection_slug || 'Unassigned'}</div><div className="mt-1 text-[11px] text-[var(--bone-dim)]">{row.primary_keyword || 'No primary keyword yet'}</div></div><Chip>{row.page_type || 'page'}</Chip><Chip tone={tone(row.brief_status)}>{row.brief_status || 'none'}</Chip><Chip tone={row.qa_approved ? 'success' : 'warning'}>{row.qa_approved ? 'approved' : row.check_status || 'none'}</Chip></div>) : <div className="px-5 py-5 text-[13px] text-[var(--bone-dim)]">No SEO Engine status rows yet.</div>}</div></div>
    </section>
  </main>;
}
