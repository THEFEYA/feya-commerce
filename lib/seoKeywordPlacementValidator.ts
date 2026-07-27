import type { SeoKeywordRoleItem, SeoPackDraftContract } from '@/lib/seoPackContract';
import { classifySeoProductPresentation, hasWholeProductScope } from './seoProductPresentation.ts';

export type SeoKeywordPlacementIssue = {
  code: string;
  severity: 'warning' | 'blocker';
  message: string;
  keyword?: string;
};

export type SeoKeywordPlacementRow = {
  keyword: string;
  role: string;
  fields: string[];
  exact_occurrences: number;
};

export type SeoKeywordPlacementValidationResult = {
  ok: boolean;
  status: 'valid' | 'warning' | 'blocked';
  issues: SeoKeywordPlacementIssue[];
  placements: SeoKeywordPlacementRow[];
  used_keywords: string[];
  unplaced_keywords: string[];
};

const COMMERCIAL_PHRASE = /\b(buy|shop|order(?:ed|ing)?|for sale|online store|price|shipping|delivery|where to buy)\b/i;
const STOP_WORDS = new Set(['a', 'an', 'and', 'at', 'by', 'for', 'from', 'in', 'of', 'on', 'or', 'the', 'to', 'with']);

export function validateSeoKeywordPlacement(
  value: unknown,
  draft: SeoPackDraftContract | null | undefined,
): SeoKeywordPlacementValidationResult {
  const issues: SeoKeywordPlacementIssue[] = [];
  if (!isRecord(value)) return blocked('keyword_output_not_object', 'Keyword placement cannot be checked because output is not an object.');
  if (!draft) return blocked('keyword_contract_missing', 'Keyword placement cannot be checked because the SEO Pack contract is missing.');

  const fields = collectFields(value);
  const displayUnits = collectDisplayUnits(value);
  const roleRows = Object.entries(draft.keyword_roles || {}).flatMap(([role, rows]) => (
    (Array.isArray(rows) ? rows : []).map((row) => ({ role, row }))
  ));
  const placements = roleRows.map(({ role, row }) => placementRow(role, row, fields, displayUnits));
  const primary = placements.filter((item) => item.role === 'primary');
  const presentation = classifySeoProductPresentation(draft.product_truth);

  if (primary.length !== 1) {
    issues.push(blockerIssue('primary_keyword_count', `Exactly one primary keyword is required; received ${primary.length}.`));
  }

  if (
    presentation.requires_whole_product_entity
    && primary.length === 1
    && !hasWholeProductScope(primary[0].keyword, presentation.components)
  ) {
    issues.push(blockerIssue(
      'primary_keyword_scope_mismatch_for_multi_component_product',
      `The selected primary keyword names only part of a confirmed ${presentation.component_count}-component product. Choose an outfit, set, costume, ensemble, or attire query as Primary; keep component queries Secondary.`,
      primary[0].keyword,
    ));
  }

  primary.forEach((item) => {
    requirePlacement(item, 'seo_title', issues, 'Primary keyword must be represented naturally in the SEO title.');
    requirePlacement(item, 'meta_description', issues, 'Primary keyword must be represented naturally in the meta description.');
    if (!item.fields.includes('h1') && !item.fields.includes('intro')) {
      issues.push(blockerIssue('primary_missing_h1_or_intro', 'Primary keyword must be represented naturally in the H1 or intro.', item.keyword));
    }
    if (!item.fields.some((field) => ['intro', 'bullet_highlights', 'pdp_blocks', 'faq'].includes(field))) {
      issues.push(blockerIssue('primary_missing_body', 'Primary keyword must be represented naturally in useful visible product copy.', item.keyword));
    }
    if (item.exact_occurrences > 4) {
      issues.push(blockerIssue(
        'primary_exact_phrase_overused',
        'The exact primary phrase is repeated more than four times across the pack. Keep the Primary concept dominant through clear whole-product meaning and normal grammatical variation, not density chasing.',
        item.keyword,
      ));
    }
  });

  const commercialRows = placements.filter((item) => item.role === 'faq_commercial');
  commercialRows.forEach((item) => {
    const forbiddenFields = item.fields.filter((field) => ['seo_title', 'h1', 'image_alt_candidates'].includes(field));
    if (forbiddenFields.length) {
      issues.push(blockerIssue(
        'commercial_keyword_wrong_placement',
        `Commercial intent is reserved for supported meta, body or FAQ copy, not ${forbiddenFields.join(', ')}.`,
        item.keyword,
      ));
    }
    if (!item.fields.some((field) => ['meta_description', 'intro', 'bullet_highlights', 'pdp_blocks', 'faq'].includes(field))) {
      issues.push(warningIssue('commercial_keyword_unplaced', 'Selected commercial intent was not used in a supported customer-facing placement.', item.keyword));
    }
  });

  ['seo_title', 'h1'].forEach((field) => {
    if (COMMERCIAL_PHRASE.test(fields[field] || '')) {
      issues.push(blockerIssue(`commercial_language_in_${field}`, `${field} contains buy/shop/order/price/shipping intent reserved for supported meta, body or FAQ placement.`));
    }
  });
  if (COMMERCIAL_PHRASE.test(fields.image_alt_candidates || '')) {
    issues.push(blockerIssue('commercial_language_in_image_alt', 'Image ALT must describe visible image truth and cannot contain commercial intent.'));
  }

  const secondaryPlacements = placements.filter((item) => item.role === 'secondary');
  const representedSecondary = secondaryPlacements.filter((item) => item.fields.length);
  if (secondaryPlacements.length && !representedSecondary.length) {
    issues.push(warningIssue(
      'secondary_keyword_cluster_unrepresented',
      'None of the approved secondary concepts is represented. Review the semantic cluster, but do not force every exact phrase into the copy.',
    ));
  }

  findSecondaryKeywordStacks(value, secondaryPlacements).forEach((stack) => {
    issues.push(blockerIssue(
      'secondary_keyword_stack',
      `Near-synonymous secondary phrases are stacked in one ${stack.field} sentence or bullet: ${stack.keywords.join(', ')}. Keep one natural phrase and express the idea normally.`,
    ));
  });

  const hasBlocker = issues.some((issue) => issue.severity === 'blocker');
  return {
    ok: !hasBlocker,
    status: hasBlocker ? 'blocked' : issues.length ? 'warning' : 'valid',
    issues,
    placements,
    used_keywords: placements.filter((item) => item.fields.length).map((item) => item.keyword),
    unplaced_keywords: placements.filter((item) => !item.fields.length).map((item) => item.keyword),
  };
}

function findSecondaryKeywordStacks(
  value: Record<string, unknown>,
  secondary: SeoKeywordPlacementRow[],
) {
  if (secondary.length < 2) return [];
  return collectDisplayUnits(value).flatMap((unit) => {
    // Semantic matching may legitimately map one natural phrase to several
    // near-synonymous Keyword Bank rows. That is evidence coverage, not
    // stuffing. A stack requires two phrases to be written explicitly in the
    // same display unit.
    const represented = secondary.filter((item) => exactPhraseCount(item.keyword, unit.text) > 0);
    if (represented.length < 2) return [];
    const nearSynonymPair = represented.some((left, leftIndex) => represented.some((right, rightIndex) => (
      rightIndex > leftIndex && sharedContentTokenCount(left.keyword, right.keyword) >= 2
    )));
    if (!nearSynonymPair && represented.length < 3) return [];
    return [{
      field: unit.field,
      keywords: represented.map((item) => item.keyword),
    }];
  });
}

function collectDisplayUnits(value: Record<string, unknown>) {
  const units: Array<{ field: string; text: string }> = [];
  const add = (field: string, raw: unknown) => {
    if (typeof raw !== 'string' && typeof raw !== 'number') return;
    String(raw)
      .split(/\n|•|(?<=[.!?])\s+/)
      .map((item) => item.replace(/^[-*]\s*/, '').trim())
      .filter(Boolean)
      .forEach((item) => units.push({ field, text: item }));
  };

  ['seo_title', 'h1', 'meta_description', 'intro'].forEach((field) => add(field, value[field]));
  textList(value.bullet_highlights).forEach((item) => add('bullet_highlights', item));
  records(value.faq).forEach((row) => {
    add('faq', row.question);
    add('faq', row.answer);
  });
  records(value.pdp_blocks).forEach((row) => {
    add('pdp_blocks', row.heading);
    add('pdp_blocks', row.body);
  });
  records(value.image_alt_candidates).forEach((row) => add('image_alt_candidates', row.alt_text));
  return units;
}

function sharedContentTokenCount(left: string, right: string) {
  const rightTokens = new Set(contentTokens(right));
  return [...new Set(contentTokens(left))].filter((token) => rightTokens.has(token)).length;
}

function collectFields(value: Record<string, unknown>): Record<string, string> {
  return {
    seo_title: text(value.seo_title),
    h1: text(value.h1),
    meta_description: text(value.meta_description),
    intro: text(value.intro),
    bullet_highlights: textList(value.bullet_highlights).join(' '),
    faq: records(value.faq).map((row) => `${text(row.question)} ${text(row.answer)}`).join(' '),
    image_alt_candidates: records(value.image_alt_candidates).map((row) => text(row.alt_text)).join(' '),
    pdp_blocks: records(value.pdp_blocks).map((row) => `${text(row.heading)} ${text(row.body)}`).join(' '),
  };
}

function placementRow(
  role: string,
  row: SeoKeywordRoleItem,
  fields: Record<string, string>,
  displayUnits: Array<{ field: string; text: string }>,
): SeoKeywordPlacementRow {
  const keyword = text(row?.keyword || row?.keyword_norm);
  const semanticRole = ['secondary', 'support', 'image_alt'].includes(role);
  const exactMatchedFields = Object.entries(fields)
    .filter(([, fieldText]) => phraseRepresented(keyword, fieldText))
    .map(([field]) => field);
  const semanticPrimaryBodyFields = role === 'primary'
    ? displayUnits
      .filter((unit) => ['intro', 'bullet_highlights', 'pdp_blocks', 'faq'].includes(unit.field))
      .filter((unit) => semanticPhraseRepresented(keyword, unit.text))
      .map((unit) => unit.field)
    : [];
  const matchedFields = semanticRole
    ? [...new Set(
      displayUnits
        .filter((unit) => semanticPhraseRepresented(keyword, unit.text))
        .map((unit) => unit.field),
    )]
    : [...new Set([...exactMatchedFields, ...semanticPrimaryBodyFields])];
  return {
    keyword,
    role,
    fields: matchedFields,
    exact_occurrences: Object.values(fields).reduce((count, fieldText) => count + exactPhraseCount(keyword, fieldText), 0),
  };
}

function phraseRepresented(keyword: string, value: string) {
  const tokens = contentTokens(keyword);
  if (!tokens.length) return false;
  const fieldTokens = contentTokens(value);
  if (fieldTokens.length < tokens.length) return false;

  // Allow normal inflection, but require one contiguous semantic phrase.
  // Tokens scattered across unrelated PDP blocks are not a placement.
  return fieldTokens.some((_, start) => (
    tokens.every((token, offset) => fieldTokens[start + offset] === token)
  ));
}

function semanticPhraseRepresented(keyword: string, value: string) {
  const tokens = [...new Set(contentTokens(keyword))];
  if (!tokens.length) return false;
  const fieldTokens = contentTokens(value);
  if (fieldTokens.length < tokens.length) return false;

  // Secondary phrases are semantic evidence rather than exact-match targets.
  // Accept natural word order and inflection only when all content tokens stay
  // inside one short buyer-readable sentence, bullet or ALT. This prevents
  // tokens scattered across unrelated blocks from masquerading as placement.
  const maxWindow = Math.min(8, tokens.length + 4);
  return fieldTokens.some((_, start) => {
    const window = new Set(fieldTokens.slice(start, start + maxWindow));
    return tokens.every((token) => window.has(token));
  });
}

function contentTokens(value: string) {
  return normalize(value)
    .split(' ')
    .filter((token) => token && !STOP_WORDS.has(token))
    .map(stemToken);
}

function stemToken(token: string) {
  if (token.endsWith('ies') && token.length > 4) return `${token.slice(0, -3)}y`;
  if (token.endsWith('es') && token.length > 4) return token.slice(0, -2);
  if (token.endsWith('s') && !token.endsWith('ss') && token.length > 3) return token.slice(0, -1);
  return token;
}

function exactPhraseCount(keyword: string, value: string) {
  const phrase = normalize(keyword);
  const haystack = normalize(value);
  if (!phrase || !haystack) return 0;
  let count = 0;
  let offset = 0;
  while ((offset = haystack.indexOf(phrase, offset)) !== -1) {
    count += 1;
    offset += phrase.length;
  }
  return count;
}

function requirePlacement(item: SeoKeywordPlacementRow, field: string, issues: SeoKeywordPlacementIssue[], message: string) {
  if (!item.fields.includes(field)) issues.push(blockerIssue(`primary_missing_${field}`, message, item.keyword));
}

function normalize(value: unknown) {
  return String(value || '')
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function text(value: unknown) {
  return typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '';
}

function textList(value: unknown) {
  return Array.isArray(value) ? value.map(text).filter(Boolean) : [];
}

function records(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function blockerIssue(code: string, message: string, keyword?: string): SeoKeywordPlacementIssue {
  return { code, severity: 'blocker', message, keyword };
}

function warningIssue(code: string, message: string, keyword?: string): SeoKeywordPlacementIssue {
  return { code, severity: 'warning', message, keyword };
}

function blocked(code: string, message: string): SeoKeywordPlacementValidationResult {
  return {
    ok: false,
    status: 'blocked',
    issues: [blockerIssue(code, message)],
    placements: [],
    used_keywords: [],
    unplaced_keywords: [],
  };
}
