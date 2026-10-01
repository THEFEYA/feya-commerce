import type { SeoPackDraftContract } from './seoPackContract.ts';

// A bounded editorial proposal for an owner-saved focus with no matching
// measured bank rows. This is not a Keyword Bank row or an approved Primary.
// A new owner decision, changed offer or changed axes invalidates the proposal.
const PRODUCT_ID = '32b1e29b-d709-4e00-a95c-6ad0b4c92704';
const DECISION_ID = '2575b6c9-547c-4812-88e2-f3fe837ea225';
const PHRASE = 'black goth costume';
const BASIS = 'owner_axes_editorial_proposal_unmeasured_v1';
const EXPECTED_FOCUS = {
  component: ['shoulders', 'top', 'skirt', 'panties', 'arms', 'legs'],
  material: ['black', 'leather'], event: ['halloween', 'cosplay'],
  style: ['glam', 'punk', 'goth'], persona: [], audience: ['women'],
};

function values(value: unknown): string[] {
  return (Array.isArray(value) ? value : value ? [value] : [])
    .map(item => String(item).trim().toLowerCase()).sort();
}

function matchesReviewedFocus(draft: SeoPackDraftContract): boolean {
  return draft.canonical_product_id === PRODUCT_ID
    && draft.source_decision_id === DECISION_ID
    && Object.entries(EXPECTED_FOCUS).every(([key, expected]) => (
      JSON.stringify(values(draft.manual_focus?.[key])) === JSON.stringify(values(expected))
    ))
    && !values(draft.manual_focus?.exclude).some(term => (
      term && (` ${PHRASE} `).includes(` ${term} `)
    ));
}

export function applyUnmeasuredEditorialReviewIntent(
  draft: SeoPackDraftContract,
  source: Record<string, any>,
): SeoPackDraftContract {
  const savedFocus = source.decision?.manual_focus_json;
  if (!matchesReviewedFocus(draft)
    || source.decision?.decision_status !== 'needs_keyword_review'
    || savedFocus?.selection_verified !== true
    || source.keywords?.length !== 0
    || source.keywordBankWarning
    || draft.product_truth?.sellable_offer?.status !== 'ready'
    || !savedFocus?.sellable_offer_signature
    || savedFocus.sellable_offer_signature !== draft.product_truth.sellable_offer_signature
  ) return draft;

  return {
    ...draft,
    status: 'needs_keyword_review',
    keyword_selection: {
      mode: 'operator_decision', status: 'needs_keyword_review',
      confirmation_required: true, evidence_source: BASIS,
      blockers: ['unmeasured_editorial_primary_requires_keyword_research'],
    },
    keyword_roles: {
      ...draft.keyword_roles,
      primary: [{
        keyword: PHRASE, keyword_norm: PHRASE, role: 'primary',
        role_reason: 'Editorial topic from saved owner axes only. No measured search volume, score or ranking evidence. Review Preview only; Approval, Apply and paid generation remain blocked.',
        avg_monthly_searches: null, competition: null, competition_index: null,
        metric_source: null, last_checked: null, relevance_score: null,
      }],
    },
    metrics_status: {
      status: 'missing', validated_count: 0, missing_metric_count: 1,
      note: 'Редакционная тема без метрик: подходящий Primary не найден в текущей выгрузке. Можно оценить текст; SEO-утверждение требует исследования ключа.',
    },
  };
}

export function isUnmeasuredEditorialReviewDraft(draft: SeoPackDraftContract): boolean {
  const primary = draft.keyword_roles?.primary || [];
  return matchesReviewedFocus(draft)
    && draft.status === 'needs_keyword_review'
    && draft.keyword_selection?.status === 'needs_keyword_review'
    && draft.keyword_selection?.evidence_source === BASIS
    && draft.product_truth?.sellable_offer?.status === 'ready'
    && draft.product_truth?.sellable_offer?.source_available === true
    && draft.metrics_status?.status === 'missing'
    && draft.metrics_status?.validated_count === 0
    && primary.length === 1 && primary[0].keyword === PHRASE
    && primary[0].avg_monthly_searches == null
    && primary[0].metric_source == null;
}
