import type { SeoPilotBrief, SeoPilotKeyword } from '@/lib/seoPilotDraft';
import {
  createEmptyKeywordRoleMap,
  type SeoAgentInputContract,
  type SeoKeywordRole,
  type SeoKeywordRoleItem,
  type SeoManualFocusContract,
  type SeoMetricsStatusContract,
  type SeoPackDraftContract,
  type SeoPortfolioDifferentiationContract,
  type SeoQaContract,
} from '@/lib/seoPackContract';

function normalizeRole(value: unknown): SeoKeywordRole {
  const role = String(value || '').trim().toLowerCase();
  if (role === 'primary') return 'primary';
  if (role === 'secondary') return 'secondary';
  if (role === 'support') return 'support';
  if (role === 'image_alt') return 'image_alt';
  if (role === 'collection') return 'collection';
  if (role === 'faq_commercial') return 'faq_commercial';
  if (role === 'hold') return 'hold';
  if (role === 'reject') return 'reject';
  return 'hold';
}

function text(value: unknown, fallback = '') {
  if (value == null || value === '') return fallback;
  return String(value);
}

function normalizeFocusValue(value: unknown): string | string[] | null {
  if (Array.isArray(value)) {
    const items = value.map((item) => text(item).trim()).filter(Boolean);
    return items.length ? items : null;
  }
  const item = text(value).trim();
  return item || null;
}

function normalizeManualFocus(value: SeoPilotBrief['manualFocus']): SeoManualFocusContract {
  return {
    component: normalizeFocusValue(value.component),
    material: normalizeFocusValue(value.material),
    event: normalizeFocusValue(value.event),
    style: normalizeFocusValue(value.style),
    persona: normalizeFocusValue(value.persona),
    audience: normalizeFocusValue(value.audience),
    exclude: normalizeFocusValue(value.exclude),
  };
}

function factValue(brief: SeoPilotBrief, label: string) {
  return brief.productFacts.find((fact) => fact.label.toLowerCase() === label.toLowerCase())?.value || null;
}

function keywordToRoleItem(keyword: SeoPilotKeyword): SeoKeywordRoleItem {
  const raw = keyword as SeoPilotKeyword & Record<string, unknown>;
  const keywordText = text(keyword.keyword || keyword.keyword_norm);
  const validated = keyword.validation_status === 'validated';
  const source = validated
    ? text(raw.metric_source || raw.source_api || raw.validation_source || raw.source, 'validated_metric_snapshot')
    : 'unvalidated_or_partial';
  const checkedAt = text(raw.last_checked || raw.metric_checked_at || raw.updated_at, '').trim() || null;

  return {
    keyword: keywordText,
    keyword_norm: text(keyword.keyword_norm || keyword.keyword, keywordText).toLowerCase(),
    role: normalizeRole(keyword.pilot_role),
    role_reason: keyword.pilot_role_reason || keyword.pilot_relevance_reason || null,
    placement: keyword.page_type || keyword.bank_bucket || null,
    relevance_score: keyword.pilot_relevance_score ?? null,
    avg_monthly_searches: validated
      ? (typeof keyword.avg_monthly_searches === 'number' ? keyword.avg_monthly_searches : Number(keyword.avg_monthly_searches) || null)
      : null,
    competition: validated ? keyword.competition || null : null,
    competition_index: validated
      ? (typeof keyword.competition_index === 'number' ? keyword.competition_index : Number(keyword.competition_index) || null)
      : null,
    metric_source: source,
    region: text(raw.region || raw.target_region, '').trim() || null,
    language: text(raw.language, 'en-US'),
    last_checked: checkedAt,
  };
}

export function buildKeywordRoleMapFromBrief(brief: SeoPilotBrief) {
  const roleMap = createEmptyKeywordRoleMap();
  brief.candidateKeywords.forEach((keyword) => {
    const item = keywordToRoleItem(keyword);
    roleMap[item.role].push(item);
  });
  brief.rejectedKeywords.forEach((keyword) => {
    const item = { ...keywordToRoleItem(keyword), role: 'reject' as const };
    roleMap.reject.push(item);
  });
  return roleMap;
}

function statusFromCheck(status: unknown) {
  const value = String(status || '').toLowerCase();
  if (value === 'pass') return 'pass' as const;
  if (value === 'blocker') return 'blocker' as const;
  if (value === 'warning') return 'warning' as const;
  return 'not_checked' as const;
}

export function buildSeoQaContractFromBrief(brief: SeoPilotBrief): SeoQaContract {
  const byId = new Map(brief.seoQaChecks.map((check) => [check.id, check]));
  return {
    cliche_phrase: statusFromCheck(byId.get('cliche_phrase')?.status),
    long_dash: statusFromCheck(byId.get('long_dash')?.status),
    keyword_stuffing: statusFromCheck(byId.get('keyword_stuffing')?.status),
    product_specificity: statusFromCheck(byId.get('product_specificity')?.status),
    forbidden_mismatch: statusFromCheck(byId.get('forbidden_mismatch')?.status),
    similarity_cannibalization: statusFromCheck(byId.get('similarity_cannibalization')?.status),
    image_alt_truth: statusFromCheck(byId.get('image_alt_truth')?.status),
    commercial_placement: statusFromCheck(byId.get('commercial_placement')?.status),
    validated_metrics: statusFromCheck(byId.get('validated_metrics')?.status),
    notes: brief.seoQaChecks.map((check) => `${check.label}: ${check.note}`),
  };
}

export function buildMetricsContractFromBrief(brief: SeoPilotBrief): SeoMetricsStatusContract {
  return {
    status: brief.metricsStatus.status,
    validated_count: brief.metricsStatus.validatedCount,
    missing_metric_count: brief.metricsStatus.missingMetricCount,
    unknown_competition_count: brief.metricsStatus.unknownCompetitionCount,
    note: brief.metricsStatus.note,
  };
}

export function buildSeoPackDraftContractFromBrief(brief: SeoPilotBrief): SeoPackDraftContract {
  const keywordRoles = buildKeywordRoleMapFromBrief(brief);
  const qaChecks = buildSeoQaContractFromBrief(brief);
  const metricsStatus = buildMetricsContractFromBrief(brief);
  const productTruth = {
    canonical_product_id: '',
    matched_etsy_listing_id: null,
    title: brief.productTitle,
    slug: brief.productSlug,
    category: factValue(brief, 'Категория'),
    material: factValue(brief, 'Материал'),
    color: factValue(brief, 'Цвет'),
    world: factValue(brief, 'Мир / контекст'),
    primary_image_url: null,
    primary_image_alt: brief.draftPreview.imageAltDirection[0] || null,
    known_components: [],
    known_non_components: [],
    included_components: [],
    optional_configurations: [],
    available_variants: [],
    unresolved_component_facts: ['Canonical Product Truth evidence has not yet been attached.'],
    component_review_blockers: ['Canonical Product Truth contract has not yet been attached.'],
    product_truth_source: 'listing_master_product_focus_v1' as const,
    source_description_fragment: null,
    source_variations: [],
    option_price_rows: [],
    component_evidence: null,
  };

  return {
    pack_version: 'seo_pack_v1',
    source_brief_version: 'seo_brief_v2_1',
    status: brief.status === 'blocked' ? 'blocked_by_product_mismatch' : 'brief_ready',
    canonical_product_id: '',
    matched_etsy_listing_id: null,
    source_decision_id: null,
    keyword_selection: null,
    product_truth: productTruth,
    manual_focus: normalizeManualFocus(brief.manualFocus),
    keyword_roles: keywordRoles,
    metrics_status: metricsStatus,
    excluded_words: brief.draftPreview.blockedWords,
    global_blacklist_note: brief.seoQaChecks.filter((check) => check.id === 'forbidden_mismatch').map((check) => check.note),
    qa_checks: qaChecks,
    similarity_check: {
      status: qaChecks.similarity_cannibalization,
      primary_keyword: keywordRoles.primary[0]?.keyword || null,
      competing_products: [],
      shared_tokens: [],
      risk_reason: qaChecks.similarity_cannibalization === 'warning' ? 'Similarity/cannibalization must be checked before publish.' : null,
      suggested_resolution: null,
    },
    portfolio_strategy: null,
    agent_input: null,
    agent_output: null,
    human_review: {
      status: 'not_reviewed',
      reviewer: null,
      notes: [],
      reviewed_at: null,
    },
  };
}

export function buildSeoAgentInputFromDraft(
  draft: SeoPackDraftContract,
  options?: { portfolio_strategy?: SeoPortfolioDifferentiationContract | null },
): SeoAgentInputContract {
  return {
    contract_version: 'seo_agent_input_v1',
    task: 'draft_product_seo_pack',
    language: 'en-US',
    brand: 'TheFEYA',
    canonical_product_id: draft.canonical_product_id,
    matched_etsy_listing_id: draft.matched_etsy_listing_id,
    product: draft.product_truth,
    manual_focus: draft.manual_focus,
    keyword_roles: draft.keyword_roles,
    keyword_selection: draft.keyword_selection,
    metrics_status: draft.metrics_status,
    portfolio_strategy: options?.portfolio_strategy || draft.portfolio_strategy || null,
    qa_contract: {
      must_check: [
        'cliche_phrase',
        'long_dash',
        'keyword_stuffing',
        'product_specificity',
        'forbidden_mismatch',
        'similarity_cannibalization',
        'image_alt_truth',
        'commercial_placement',
        'validated_metrics',
      ],
    },
    blocked_words: {
      product_specific_exclusions: draft.excluded_words,
      global_blacklist_note: draft.global_blacklist_note,
    },
    allowed_output_fields: [
      'seo_title',
      'h1',
      'meta_description',
      'intro',
      'bullet_highlights',
      'faq',
      'image_alt_candidates',
      'internal_linking_hints',
      'visual_truth',
      'pdp_blocks',
      'qa_self_report',
    ],
  };
}
