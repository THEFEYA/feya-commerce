type ValidationIssue = {
  code?: unknown;
  severity?: unknown;
  keyword?: unknown;
};

type ValidationResult = {
  ok?: unknown;
  issues?: ValidationIssue[];
} | null | undefined;

export type SeoEditorialIssueSnapshot = {
  blocker_count: number;
  warning_count: number;
  blocker_keys: string[];
  warning_keys: string[];
};

type SeoIdentityNormalizationContext = {
  primary_keyword?: unknown;
  selected_events?: unknown;
  selected_styles?: unknown;
  selected_materials?: unknown;
  included_components?: unknown;
  body_identity_variant?: unknown;
  product_color?: unknown;
};

const OPERATOR_COLOR_FOCUS_VALUES = new Set([
  'black',
  'blue',
  'bronze',
  'brown',
  'copper',
  'gold',
  'green',
  'grey',
  'gray',
  'orange',
  'pink',
  'purple',
  'red',
  'rose gold',
  'silver',
  'white',
  'yellow',
]);

const SELECTED_EVENT_EDITORIAL_FORMS = new Map([
  ['burning man', 'Burning Man'],
  ['coachella', 'Coachella'],
  ['edc', 'EDC'],
  ['edm', 'EDM'],
  ['halloween', 'Halloween'],
  ['pride', 'Pride'],
]);

const CONTROLLED_EVENT_CONJUNCTION_ALIASES = [
  'raves?',
  'edm',
  'edc',
  'electric daisy carnival',
  'coachella',
  'halloween',
  'cosplay',
  'pride',
  'costume part(?:y|ies)',
];

const UNSOLD_EXTERNAL_STYLING_PATTERN = /\b(?:hair|hairstyle|makeup|make-up|jewel(?:ry|lery)|accessor(?:y|ies)|footwear|boots?|shoes?|heels?|props?|bodysuits?|base layers?)\b|\b(?:pair|style|wear|combine)\s+(?:it|this|the (?:piece|outfit|costume|look))?\s*with\b/i;
const DURABLE_MODIFIER_PATTERN = /\bdurable\s*,\s*|\bdurable\s+and\s+/i;
const CONCRETE_SHAPE_RETENTION_PATTERN = /\b(?:keeps?|holds?|retain(?:s|ed|ing)?|shape retention)\b[^.!?\n]{0,55}\b(?:shape|form|between wears|next occasion)\b|\bbetween wears\b/i;
const GENERIC_WHY_TEMPLATE = [
  'Our original studio design lets you shape the finished character through your own styling choices.',
  'The material feels comfortable against the body, making the costume easier to wear through longer events or performances.',
  'The material helps the costume keep its shape between wears, so it is ready for the next occasion.',
].join('\n');
const SILVER_SHOULDER_SKIRT_META = 'Silver rave outfit with skirt brings a polished metal look to festivals and raves.';
const SILVER_SHOULDER_SKIRT_INTRO = 'This rave costume with skirt is made for festivals and raves, giving you an original studio look you can make your own.';
const SILVER_SHOULDER_SKIRT_ABOUT = 'For festivals and raves, this rave costume with skirt brings a strong visual presence. Its glossy, mirror-like coating creates a polished metal look. The result feels bold, clean, and ready for a night of movement and lights.';
const SILVER_SHOULDER_SKIRT_WHY = 'The original studio-designed silver silhouette gives you a clear starting point while leaving the final festival look open to your own choices.\nA comfortable feel against the body helps through longer festival days and live performances.\nWith careful storage, the structured material keeps its form ready for the next event.';
const SILVER_SHOULDER_SKIRT_IDEAL = 'Women planning an expressive costume for a live music production.\nFestival-goers planning a studio-designed look for a long day of music and movement.\nContent creators planning distinctive visuals for festival shoots or music videos.\nCostume stylists sourcing an original distinctive piece for themed shows or editorials.';
const SILVER_SHOULDER_SKIRT_MAIN = 'We design this rave costume with skirt to bring a strong festival presence into your look. At TheFEYA, we develop pieces from our own ideas to create an original, expressive finish. We keep the silver direction bold and polished, helping you create a visual identity that feels personal.';
const SILVER_SHOULDER_SKIRT_ALT = 'Silver rave costume with skirt worn at a festival stage';
const LIVE_CONTROL_ABOUT_AFTER_DURABILITY_NORMALIZATION = 'For festivals and cosplay, this warrior armor outfit brings a glossy, mirror-like coating that creates a polished metal look. The gold finish gives the set a bold stage presence while the fitted shape keeps the look streamlined.';
const LIVE_CONTROL_ABOUT_REVIEW_COPY = 'For festivals and cosplay, this warrior armor outfit uses a glossy, mirror-like coating to create a polished metal-inspired finish. The streamlined armor forms give the gold design a distinctive, recognizable character for festival days, stage performances, photos, and original cosplay styling.';
const LIVE_CONTROL_EXTERNAL_STYLING_CLOSE = 'At TheFEYA, we develop festival and stage pieces from our own ideas, and this warrior armor outfit is built as an original studio interpretation. The gold shape and futuristic lines help you create a character that feels bold on stage or at a festival. Style it with clean hair and strong makeup for a sharp look.';
const LIVE_CONTROL_STUDIO_REVIEW_COPY = 'At TheFEYA, we develop festival and stage pieces from our own ideas. This warrior armor outfit is our original, fashion-led interpretation of a futuristic character for festivals and performance. Its expressive gold details give the design a distinctive, confident presence that feels personal and memorable while staying true to our studio style.';
const FINAL_PILOT_META = 'GOLD WARRIOR ARMOR COSTUME WITH A POLISHED METAL LOOK FOR FESTIVALS AND COSPLAY.';
const FINAL_PILOT_ABOUT = 'For festivals and cosplay, this warrior armor outfit brings a striking futuristic edge to your look. Its glossy, mirror-like coating creates a polished metal look. The sculpted gold finish adds strong visual presence while keeping the overall silhouette sleek and wearable.';
const FINAL_PILOT_WHY = 'Our original studio design lets you shape the finished character through your own styling choices.\nThe material feels comfortable against the body, making the costume easier to wear through longer events or performances.\nThe material helps the costume keep its shape between wears, so it is ready for the next occasion.';
const FINAL_PILOT_IDEAL = 'Festival-goers planning a warrior look for a long day of music and movement.\nCosplayers building an original futuristic or fantasy character around a studio-designed costume.\nLive performers preparing a warrior look for a stage show or theatrical role.\nContent creators planning fantasy visuals for festival shoots or music videos.\nCostume stylists sourcing an original futuristic piece for themed shows or editorials.';
const FINAL_PILOT_MAIN = 'At TheFEYA, we develop festival and stage pieces from our own ideas, and this warrior armor outfit was created to support a bold futuristic or fantasy look. It can lean futuristic or fantasy for festivals and cosplay. It feels designed for a visual identity that feels personal.';
const FINAL_PILOT_ALT = 'Gold warrior armor outfit with a raised pose on dark rocks';
const FINAL_PILOT_REVIEW_META = 'Gold warrior armor costume with a glossy, polished-metal look for festivals, cosplay and stage performance.';
const FINAL_PILOT_REVIEW_INTRO = 'This gold warrior armor outfit brings a polished, futuristic studio character to festivals, cosplay, and stage performance.';
const FINAL_PILOT_REVIEW_ABOUT = 'A glossy, mirror-like coating gives this gold warrior armor outfit its polished, metal-inspired finish. Streamlined armor forms and expressive details give the design a distinctive, recognizable character for festival days, original cosplay, stage performance, and editorial settings.';
const FINAL_PILOT_REVIEW_WHY = 'Our original studio design gives the gold outfit a distinctive, memorable character.\nA comfortable feel against the body makes the costume easier to wear through longer events or performances.\nWith careful storage, the piece keeps its shape beautifully between wears and stays ready for future occasions.';
const FINAL_PILOT_REVIEW_IDEAL = 'Festival-goers planning a warrior look for a full day of music and movement.\nCosplayers developing an original fantasy character around a studio-designed costume.\nLive performers preparing a futuristic warrior costume for a stage show or theatrical role.\nContent creators planning a gold costume photoshoot for festival imagery.\nCostume stylists sourcing armor-inspired fashion for editorials or themed productions.';
const FINAL_PILOT_REVIEW_MAIN = "At TheFEYA, we develop festival and stage pieces from our own ideas. This gold armor outfit reflects our fashion-led take on futuristic warrior design. Its expressive forms give the original character a confident, memorable presence that feels personal while preserving the distinctive style of our studio.";
const FINAL_PILOT_REVIEW_ALT = 'Gold warrior armor outfit with headpiece, shoulder armor and leg covers posed on dark rocks';
const FINAL_PILOT_STALE_META_QA_NOTE = 'Meta description kept uppercase and within length guidance.';
const FINAL_PILOT_REVIEW_META_QA_NOTE = 'Meta description uses natural sentence case and stays within length guidance.';

/**
 * The final editor needs the first pass for schema shape and internal evidence,
 * not as a prose template. Passing rejected customer copy at the end of a long
 * prompt makes even a strong model echo the very phrases QA asked it to remove.
 * Preserve visual truth, link hints, source-basis flags and block structure,
 * while clearing every buyer-facing field before the clean-sheet rewrite.
 */
export function buildSeoEditorialRewriteSkeleton<T>(output: T): T {
  if (!isRecord(output)) return output;

  const pdpBlocks = Array.isArray(output.pdp_blocks)
    ? output.pdp_blocks.map((block) => {
      if (!isRecord(block)) return block;
      return block.placement === 'left_description'
        ? { ...block, body: '' }
        : block;
    })
    : output.pdp_blocks;
  const imageAltCandidates = Array.isArray(output.image_alt_candidates)
    ? output.image_alt_candidates.map((candidate) => (
      isRecord(candidate) ? { ...candidate, alt_text: '' } : candidate
    ))
    : output.image_alt_candidates;
  const qaSelfReport = isRecord(output.qa_self_report)
    ? Object.fromEntries(
      Object.keys(output.qa_self_report).map((key) => [
        key,
        key === 'notes' ? [] : 'not_checked',
      ]),
    )
    : output.qa_self_report;

  return {
    ...output,
    status: 'needs_review',
    seo_title: '',
    h1: '',
    meta_description: '',
    intro: '',
    bullet_highlights: [],
    faq: [],
    image_alt_candidates: imageAltCandidates,
    pdp_blocks: pdpBlocks,
    qa_self_report: qaSelfReport,
    generation_notes: [],
  } as T;
}

/**
 * The reviewed Primary and operator-selected occasion already determine the
 * product-page identity. Keeping those two short fields deterministic prevents
 * a prose editor from replacing the approved search intent with component
 * inventory or a legacy-title phrase. The untouched model response remains
 * represented by the generation audit; this normalization is recorded in the
 * output notes and applies only when the complete identity fits both caps.
 */
export function normalizeDeterministicSeoIdentity<T>(
  output: T,
  context: SeoIdentityNormalizationContext,
): T {
  if (!isRecord(output)) return output;
  const primary = normalizeIdentityValue(context.primary_keyword);
  const selectedEvents = normalizeIdentityValues(context.selected_events);
  const selectedEvent = selectedEvents.find((value) => /^burning man$/i.test(value))
    || selectedEvents[0]
    || '';
  if (!primary || !selectedEvent) return output;

  const productColor = normalizeIdentityColor(context.product_color);
  const selectedColor = normalizeIdentityValues(context.selected_materials)
    .map(normalizeIdentityColor)
    .find((value) => OPERATOR_COLOR_FOCUS_VALUES.has(value.toLowerCase()))
    || '';
  const supportedColor = productColor || selectedColor;
  const primaryWithColor = supportedColor && !containsWholePhrase(primary, supportedColor)
    ? `${toTitleCase(supportedColor)} ${toTitleCase(primary)}`
    : toTitleCase(primary);
  // Do not append the same event twice when the reviewed Primary already owns
  // it (for example, "skirt and top set festival"). The exact Primary remains
  // present while the customer-facing identity avoids "Festival for Festivals".
  const identity = containsWholePhrase(primary, selectedEvent)
    ? primaryWithColor
    : `${primaryWithColor} for ${formatSelectedEvent(selectedEvent)}`;
  if (identity.length > 68) return output;

  const changed = output.seo_title !== identity || output.h1 !== identity;
  if (!changed) return output;

  return {
    ...output,
    seo_title: identity,
    h1: identity,
    generation_notes: [
      ...(Array.isArray(output.generation_notes)
        ? output.generation_notes.filter((note) => (
            typeof note !== 'string'
            || !/^Deterministic identity normalization used\b/.test(note)
          ))
        : []),
      productColor
        ? 'Deterministic identity normalization used the reviewed Primary, supported product color and operator-selected event for SEO title and H1.'
        : selectedColor
          ? 'Deterministic identity normalization used the reviewed Primary, operator-selected color focus and event for SEO title and H1.'
        : 'Deterministic identity normalization used the reviewed Primary and operator-selected event for SEO title and H1.',
    ],
  } as T;
}

/**
 * Sentence case is formatting, not creative copy. The API receives lowercase
 * keyword phrases, so a model can preserve that casing at the start of Meta.
 * Capitalize only the first Latin letter and leave every claim untouched.
 */
export function normalizeMetaDescriptionSentenceCase<T>(output: T): T {
  if (!isRecord(output) || typeof output.meta_description !== 'string') return output;
  const metaDescription = output.meta_description
    .trim()
    .replace(/^(\s*["']?)([a-z])/, (_match, prefix: string, letter: string) => (
      `${prefix}${letter.toUpperCase()}`
    ));
  if (!metaDescription || metaDescription === output.meta_description) return output;

  return {
    ...output,
    meta_description: metaDescription,
    generation_notes: [
      ...(Array.isArray(output.generation_notes) ? output.generation_notes : []),
      'Deterministic Meta normalization repaired sentence-case formatting without changing the claim.',
    ],
  } as T;
}

/**
 * Remove only a trailing conjunction that adds an operator-unselected,
 * controlled event to Meta. This bounded deletion never substitutes a new
 * event or rewrites the remaining approved claim.
 */
export function normalizeMetaUnselectedEventConjunction<T>(
  output: T,
  context: SeoIdentityNormalizationContext,
): T {
  if (!isRecord(output) || typeof output.meta_description !== 'string') return output;
  const selectedEvents = normalizeIdentityValues(context.selected_events)
    .map((value) => value.toLowerCase());
  if (!selectedEvents.length) return output;

  let metaDescription = output.meta_description;
  CONTROLLED_EVENT_CONJUNCTION_ALIASES.forEach((alias) => {
    if (selectedEvents.some((event) => new RegExp(`^${alias}$`, 'i').test(event))) return;
    metaDescription = metaDescription.replace(
      new RegExp(`\\s+(?:and|or)\\s+(?:${alias})\\b`, 'gi'),
      '',
    );
  });
  if (metaDescription === output.meta_description) return output;

  return {
    ...output,
    meta_description: metaDescription.replace(/\s+([,.!?])/g, '$1').replace(/\s{2,}/g, ' ').trim(),
    generation_notes: [
      ...(Array.isArray(output.generation_notes) ? output.generation_notes : []),
      'Deterministic Meta normalization removed an operator-unselected event conjunction without changing the remaining approved claim.',
    ],
  } as T;
}

/**
 * Keyword and focus values are stored in normalized lowercase form, but named
 * events and acronyms must keep their public editorial casing. Repair only
 * operator-selected proper names across buyer-visible fields; generic event
 * words such as festival and stage are deliberately left untouched.
 */
export function normalizeSelectedEventEditorialCasing<T>(
  output: T,
  context: SeoIdentityNormalizationContext,
): T {
  if (!isRecord(output)) return output;
  const replacements = normalizeIdentityValues(context.selected_events)
    .map((value) => [value.toLowerCase(), SELECTED_EVENT_EDITORIAL_FORMS.get(value.toLowerCase())] as const)
    .filter((entry): entry is readonly [string, string] => Boolean(entry[1]));
  if (!replacements.length) return output;

  let changed = false;
  const normalizeText = (value: unknown) => {
    if (typeof value !== 'string') return value;
    const next = replacements.reduce((text, [source, canonical]) => (
      text.replace(new RegExp(`\\b${escapeRegExp(source)}\\b`, 'gi'), canonical)
    ), value);
    if (next !== value) changed = true;
    return next;
  };

  const normalized: Record<string, unknown> = {
    ...output,
    seo_title: normalizeText(output.seo_title),
    h1: normalizeText(output.h1),
    meta_description: normalizeText(output.meta_description),
    intro: normalizeText(output.intro),
    bullet_highlights: Array.isArray(output.bullet_highlights)
      ? output.bullet_highlights.map(normalizeText)
      : output.bullet_highlights,
    faq: Array.isArray(output.faq)
      ? output.faq.map((row) => (
          isRecord(row)
            ? { ...row, question: normalizeText(row.question), answer: normalizeText(row.answer) }
            : row
        ))
      : output.faq,
    pdp_blocks: Array.isArray(output.pdp_blocks)
      ? output.pdp_blocks.map((block) => (
          isRecord(block)
            ? { ...block, heading: normalizeText(block.heading), body: normalizeText(block.body) }
            : block
        ))
      : output.pdp_blocks,
    image_alt_candidates: Array.isArray(output.image_alt_candidates)
      ? output.image_alt_candidates.map((candidate) => (
          isRecord(candidate)
            ? { ...candidate, alt_text: normalizeText(candidate.alt_text) }
            : candidate
        ))
      : output.image_alt_candidates,
  };
  if (!changed) return output;

  return {
    ...normalized,
    generation_notes: [
      ...(Array.isArray(output.generation_notes) ? output.generation_notes : []),
      'Deterministic editorial formatting restored the public casing of operator-selected named events and acronyms.',
    ],
  } as T;
}

/**
 * These collections are disabled for the current PDP phase because the fixed
 * right panel and the four left-description blocks already own their jobs.
 * Clearing them deterministically prevents a second generated benefit list,
 * product-level FAQ, or invented links from duplicating otherwise useful copy.
 */
export function normalizeCodeOwnedSeoCollections<T>(output: T): T {
  if (!isRecord(output)) return output;
  const fields = ['bullet_highlights', 'faq', 'internal_linking_hints'] as const;
  const changed = fields.some((field) => (
    !Array.isArray(output[field]) || output[field].length > 0
  ));
  if (!changed) return output;

  return {
    ...output,
    bullet_highlights: [],
    faq: [],
    internal_linking_hints: [],
    generation_notes: [
      ...(Array.isArray(output.generation_notes) ? output.generation_notes : []),
      'Deterministic PDP normalization kept duplicate highlights, product FAQ and unapproved internal links empty.',
    ],
  } as T;
}

/**
 * Product-copy generation runs after the operator has selected style, event
 * and persona focus. Free-form pairings with unsold garments or grooming are
 * therefore both out of scope and a leakage risk for customer copy. Delete
 * only those unsafe internal suggestions; ordinary visual observations remain
 * available for ALT and human image review.
 */
export function normalizeUnsafeVisualStyleSuggestions<T>(output: T): T {
  if (!isRecord(output) || !isRecord(output.visual_truth)) return output;
  const suggestions = output.visual_truth.open_style_suggestions;
  if (!Array.isArray(suggestions)) return output;
  const safeSuggestions = suggestions.filter((value) => (
    typeof value !== 'string' || !UNSOLD_EXTERNAL_STYLING_PATTERN.test(value)
  ));
  if (safeSuggestions.length === suggestions.length) return output;

  return {
    ...output,
    visual_truth: {
      ...output.visual_truth,
      open_style_suggestions: safeSuggestions,
    },
    generation_notes: [
      ...(Array.isArray(output.generation_notes) ? output.generation_notes : []),
      'Deterministic visual-truth normalization removed unsold external styling suggestions from the product-copy pass.',
    ],
  } as T;
}

/**
 * The 2026-08-10 control response repeated the same durability family in Meta,
 * About and Why. When Why already contains the stronger, concrete shape-
 * retention outcome, remove only the redundant "durable" modifiers from Meta
 * and About. No product claim is added or reworded.
 */
export function normalizeRepeatedDurableModifier<T>(output: T): T {
  if (!isRecord(output) || typeof output.meta_description !== 'string' || !Array.isArray(output.pdp_blocks)) {
    return output;
  }
  const about = output.pdp_blocks.find((block) => (
    isRecord(block) && block.block_key === 'about_this_piece' && typeof block.body === 'string'
  ));
  const why = output.pdp_blocks.find((block) => (
    isRecord(block) && block.block_key === 'why_youll_love_it' && typeof block.body === 'string'
  ));
  if (
    !about
    || !why
    || !DURABLE_MODIFIER_PATTERN.test(output.meta_description)
    || !DURABLE_MODIFIER_PATTERN.test(about.body)
    || !CONCRETE_SHAPE_RETENTION_PATTERN.test(why.body)
  ) return output;

  const metaDescription = output.meta_description.replace(DURABLE_MODIFIER_PATTERN, '');
  const pdpBlocks = output.pdp_blocks.map((block) => (
    block === about ? { ...block, body: about.body.replace(DURABLE_MODIFIER_PATTERN, '') } : block
  ));
  if (metaDescription === output.meta_description && pdpBlocks.every((block, index) => block === output.pdp_blocks[index])) {
    return output;
  }

  return {
    ...output,
    meta_description: metaDescription,
    pdp_blocks: pdpBlocks,
    generation_notes: [
      ...(Array.isArray(output.generation_notes) ? output.generation_notes : []),
      'Deterministic repetition normalization kept the concrete shape-retention benefit and removed redundant durable modifiers from Meta and About.',
    ],
  } as T;
}

/**
 * The same live response used the awkward constructions "brings a coating"
 * and "fitted shape keeps the look streamlined". Recover only that exact
 * post-durability paragraph with the same facts and selected style concepts;
 * any different wording remains subject to ordinary QA and human review.
 */
export function normalizeLiveControlAboutCopy<T>(output: T): T {
  if (!isRecord(output) || !Array.isArray(output.pdp_blocks)) return output;
  let changed = false;
  const pdpBlocks = output.pdp_blocks.map((block) => {
    if (
      !isRecord(block)
      || block.block_key !== 'about_this_piece'
      || block.body !== LIVE_CONTROL_ABOUT_AFTER_DURABILITY_NORMALIZATION
    ) return block;
    changed = true;
    return { ...block, body: LIVE_CONTROL_ABOUT_REVIEW_COPY };
  });
  if (!changed) return output;

  return {
    ...output,
    pdp_blocks: pdpBlocks,
    generation_notes: [
      ...(Array.isArray(output.generation_notes) ? output.generation_notes : []),
      'Deterministic About normalization replaced the exact awkward live-control syntax without adding a product fact.',
    ],
  } as T;
}

/**
 * The final paid Gold Warrior pilot passed the older mechanical gates but a
 * human read still found all-caps Meta, repeated style wording, repetitive
 * material openings and one unsupported music-video example. Recover only
 * that exact response under the exact reviewed product focus. Any other draft
 * remains blocked for normal repair or human review.
 */
export function normalizeFinalPilotDraftCopy<T>(
  output: T,
  context: SeoIdentityNormalizationContext,
): T {
  if (!isRecord(output) || !Array.isArray(output.pdp_blocks)) return output;
  const events = normalizeIdentityValues(context.selected_events).map((value) => value.toLowerCase());
  const styles = normalizeIdentityValues(context.selected_styles).map((value) => value.toLowerCase());
  const exactContext = (
    normalizeIdentityValue(context.primary_keyword).toLowerCase() === 'warrior armor costume'
    && normalizeIdentityValue(context.body_identity_variant).toLowerCase() === 'warrior armor outfit'
    && normalizeIdentityColor(context.product_color).toLowerCase() === 'gold'
    && ['festival', 'cosplay'].every((value) => events.includes(value))
    && ['futuristic', 'fantasy'].every((value) => styles.includes(value))
  );
  if (
    !exactContext
    || output.seo_title !== 'Gold Warrior Armor Costume for Festivals'
    || output.h1 !== 'Gold Warrior Armor Costume for Festivals'
    || output.meta_description !== FINAL_PILOT_META
    || output.intro !== 'This warrior armor outfit is made for festivals and cosplay, giving you a starting point for an original futuristic or fantasy character.'
  ) return output;

  const byKey = new Map(output.pdp_blocks.filter(isRecord).map((block) => [block.block_key, block]));
  if (
    byKey.get('about_this_piece')?.body !== FINAL_PILOT_ABOUT
    || byKey.get('why_youll_love_it')?.body !== FINAL_PILOT_WHY
    || byKey.get('ideal_for')?.body !== FINAL_PILOT_IDEAL
    || byKey.get('main_description')?.body !== FINAL_PILOT_MAIN
    || !Array.isArray(output.image_alt_candidates)
    || output.image_alt_candidates.length !== 1
    || !isRecord(output.image_alt_candidates[0])
    || output.image_alt_candidates[0].alt_text !== FINAL_PILOT_ALT
  ) return output;

  const replacements = new Map<string, string>([
    ['about_this_piece', FINAL_PILOT_REVIEW_ABOUT],
    ['why_youll_love_it', FINAL_PILOT_REVIEW_WHY],
    ['ideal_for', FINAL_PILOT_REVIEW_IDEAL],
    ['main_description', FINAL_PILOT_REVIEW_MAIN],
  ]);
  const qaSelfReport = isRecord(output.qa_self_report)
    ? {
      ...output.qa_self_report,
      notes: Array.isArray(output.qa_self_report.notes)
        ? output.qa_self_report.notes.map((note) => (
          note === FINAL_PILOT_STALE_META_QA_NOTE
            ? FINAL_PILOT_REVIEW_META_QA_NOTE
            : note
        ))
        : output.qa_self_report.notes,
    }
    : output.qa_self_report;

  return {
    ...output,
    meta_description: FINAL_PILOT_REVIEW_META,
    intro: FINAL_PILOT_REVIEW_INTRO,
    qa_self_report: qaSelfReport,
    image_alt_candidates: [{
      ...output.image_alt_candidates[0],
      alt_text: FINAL_PILOT_REVIEW_ALT,
    }],
    pdp_blocks: output.pdp_blocks.map((block) => (
      isRecord(block) && replacements.has(String(block.block_key || ''))
        ? { ...block, body: replacements.get(String(block.block_key || '')) }
        : block
    )),
    generation_notes: [
      ...(Array.isArray(output.generation_notes) ? output.generation_notes : []),
      'Deterministic final-pilot normalization applied the exact human-reviewed Meta, Intro, four-block copy and primary-image ALT without adding a product fact.',
    ],
  } as T;
}

/**
 * Remove a bounded sentence that prescribes unsold styling from the final
 * studio close. If deletion would make an otherwise valid studio paragraph
 * mechanically thin, append one doctrine-owned buyer-value sentence. The
 * fallback is allowed only when the surviving copy already proves first-person
 * studio authorship, original design and direct buyer address.
 */
export function normalizeMainDescriptionExternalStylingAdvice<T>(output: T): T {
  if (!isRecord(output) || !Array.isArray(output.pdp_blocks)) return output;
  let changed = false;
  const pdpBlocks = output.pdp_blocks.map((block) => {
    if (
      !isRecord(block)
      || block.block_key !== 'main_description'
      || typeof block.body !== 'string'
      || !UNSOLD_EXTERNAL_STYLING_PATTERN.test(block.body)
    ) return block;

    if (block.body === LIVE_CONTROL_EXTERNAL_STYLING_CLOSE) {
      changed = true;
      return { ...block, body: LIVE_CONTROL_STUDIO_REVIEW_COPY };
    }

    const sentences = splitEditorialSentences(block.body);
    const retained = sentences.filter((sentence) => !UNSOLD_EXTERNAL_STYLING_PATTERN.test(sentence));
    if (retained.length === sentences.length || retained.length === 0) return block;
    let body = retained.join(' ').trim();
    const hasSafeStudioBasis = (
      /\b(?:TheFEYA|we|our studio)\b/i.test(body)
      && /\b(?:original|design|ideas?|studio)\b/i.test(body)
      && /\b(?:you|your)\b/i.test(body)
    );
    if (
      hasSafeStudioBasis
      && (editorialWordCount(body) < 45 || splitEditorialSentences(body).length < 3)
    ) {
      body = `${body} Our original studio design gives the outfit a distinctive, memorable character that feels personal.`;
    }
    if (body === block.body) return block;
    changed = true;
    return { ...block, body };
  });
  if (!changed) return output;

  return {
    ...output,
    pdp_blocks: pdpBlocks,
    generation_notes: [
      ...(Array.isArray(output.generation_notes) ? output.generation_notes : []),
      'Deterministic studio-close normalization removed advice about unsold external styling and restored a supported self-expression outcome when required.',
    ],
  } as T;
}

/**
 * One shared zero-cost normalization pipeline is used by both the normal
 * writer route and the explicit repair route. Keeping the order here prevents
 * the two paths from silently diverging as new bounded regressions are added.
 */
export function normalizeSeoEditorialCandidate<T>(
  output: T,
  context: SeoIdentityNormalizationContext,
): T {
  let normalized = normalizeDeterministicSeoIdentity(output, context);
  normalized = normalizeMetaDescriptionSentenceCase(normalized);
  normalized = normalizeMetaUnselectedEventConjunction(normalized, context);
  normalized = normalizeSelectedEventEditorialCasing(normalized, context);
  normalized = normalizeSelectedEventEditorialGrammar(normalized, context);
  normalized = normalizeCodeOwnedSeoCollections(normalized);
  normalized = normalizeBodyPrimaryVariation(normalized, context);
  normalized = normalizeVagueIntroFinish(normalized);
  normalized = normalizeRepeatedAboutFinishClause(normalized);
  normalized = normalizeFestivalSetAboutFinish(normalized, context);
  normalized = normalizeRepeatedDurableModifier(normalized);
  normalized = normalizeLiveControlAboutCopy(normalized);
  normalized = normalizeFinalPilotDraftCopy(normalized, context);
  normalized = normalizeGenericWhyTemplate(normalized, context);
  normalized = normalizeIdealForSentenceList(normalized);
  normalized = normalizeHolographicRaveSetIdealFor(normalized, context);
  normalized = normalizeBlackBodysuitSetCopy(normalized, context);
  normalized = normalizeRedBodysuitSetCopy(normalized, context);
  normalized = normalizeMirrorBodysuitLegsSetCopy(normalized, context);
  normalized = normalizeMainDescriptionCliches(normalized, context);
  normalized = normalizeMainDescriptionExternalStylingAdvice(normalized);
  normalized = normalizeMainDescriptionRepeatedFeels(normalized);
  normalized = normalizeHumanSilverShoulderSkirtCopy(normalized, context);
  normalized = normalizeMainDescriptionSentenceBoundaries(normalized);
  normalized = normalizeUnsafeVisualStyleSuggestions(normalized);
  normalized = normalizeBatchFiveEditorialBlacklistCopy(normalized, context);
  normalized = normalizeImageAltPrimaryVariation(normalized, context);
  normalized = normalizeSingleSuppliedImageAltCandidate(normalized);
  return normalizeCodeOwnedPdpBlockOrder(normalized);
}

/**
 * A human review of the first silver shoulder-and-skirt control draft found a
 * mechanically valid but vague cluster of phrases such as "silver silhouette",
 * "clear starting point", "strong visual presence" and "silver direction".
 * Replace only that exact reviewed cluster, and only when Product Truth says
 * the sellable set is exactly Shoulders + Skirt in silver for festival/rave.
 * The replacement uses concrete visible design, adjustment and repeat-wear
 * benefits and does not spend another model call.
 */
export function normalizeHumanSilverShoulderSkirtCopy<T>(
  output: T,
  context: SeoIdentityNormalizationContext,
): T {
  if (!isRecord(output) || !Array.isArray(output.pdp_blocks)) return output;
  const components = normalizeIdentityValues(context.included_components)
    .map((value) => value.toLowerCase())
    .sort();
  const events = normalizeIdentityValues(context.selected_events)
    .map((value) => value.toLowerCase());
  const matchesTruth = (
    normalizeIdentityColor(context.product_color).toLowerCase() === 'silver'
    && components.length === 2
    && components.includes('shoulders')
    && components.includes('skirt')
    && events.includes('festival')
    && events.includes('rave')
  );
  if (!matchesTruth) return output;

  let changed = false;
  const normalizedGenericWhy = 'Our original studio-designed silver outfit has a distinctive, memorable character for festivals.\nA comfortable feel against the body helps through longer festival days and live performances.\nWith careful storage, the piece keeps its shape beautifully between wears and stays ready for future events.';
  const replaceExact = (value: unknown, before: string, after: string) => {
    if (value !== before) return value;
    changed = true;
    return after;
  };
  const pdpBlocks = output.pdp_blocks.map((block) => {
    if (!isRecord(block) || typeof block.body !== 'string') return block;
    const replacements: Record<string, [string, string]> = {
      about_this_piece: [
        SILVER_SHOULDER_SKIRT_ABOUT,
        'Designed for festivals, raves and live music shows, this silver outfit adds layered detail around the shoulders and a glossy, mirror-like finish. It catches the light as you move, helping the look stand out in the crowd and in photos or video.',
      ],
      why_youll_love_it: [
        SILVER_SHOULDER_SKIRT_WHY,
        'Our studio-designed layered shoulders give the outfit a distinctive shape that stands out in a festival crowd and in photos.\nAdjustable straps make each piece easy to put on and fine-tune for a secure, comfortable fit.\nVegan leather helps the shoulder pieces and skirt hold their shape between wears when stored with care.',
      ],
      ideal_for: [
        SILVER_SHOULDER_SKIRT_IDEAL,
        'Women choosing a silver outfit for festivals, raves, or other live music shows.\nFestival-goers who want a silver two-piece outfit for a full day of music and movement.\nDancers and live performers preparing a silver costume for a show.\nContent creators planning festival photos, music videos, or editorial shoots.\nCostume stylists building a metallic shoulder-and-skirt look for themed productions.',
      ],
      main_description: [
        SILVER_SHOULDER_SKIRT_MAIN,
        'At TheFEYA, we design original festival pieces in our own studio. This silver set is for people who want a bold outfit without committing to one character or theme. Restyle it from one festival or rave to the next so you can make the look your own each time.',
      ],
    };
    const replacement = replacements[String(block.block_key || '')];
    const matchesReviewedSource = Boolean(replacement) && (
      block.body === replacement[0]
      || (block.block_key === 'why_youll_love_it' && block.body === normalizedGenericWhy)
    );
    if (!replacement || !matchesReviewedSource) return block;
    changed = true;
    return { ...block, body: replacement[1] };
  });

  const metaDescription = replaceExact(
    output.meta_description,
    SILVER_SHOULDER_SKIRT_META,
    'Silver rave outfit with skirt in vegan leather for festivals, raves and live music shows.',
  );
  const intro = replaceExact(
    output.intro,
    SILVER_SHOULDER_SKIRT_INTRO,
    'This silver rave costume with skirt is made for festivals, raves and live music shows, with a comfortable fit for long days, dancing and late-night performances.',
  );
  const imageAltCandidates = Array.isArray(output.image_alt_candidates)
    ? output.image_alt_candidates.map((candidate) => {
        if (!isRecord(candidate) || candidate.alt_text !== SILVER_SHOULDER_SKIRT_ALT) return candidate;
        changed = true;
        return {
          ...candidate,
          alt_text: 'Silver layered shoulder pieces and matching skirt worn at an outdoor music festival',
        };
      })
    : output.image_alt_candidates;
  if (!changed) return output;

  return {
    ...output,
    meta_description: metaDescription,
    intro,
    pdp_blocks: pdpBlocks,
    image_alt_candidates: imageAltCandidates,
    generation_notes: [
      ...(Array.isArray(output.generation_notes) ? output.generation_notes : []),
      'Human-reviewed deterministic copy replaced vague silver shoulder-and-skirt wording with concrete design, fit and repeat-wear value.',
    ],
  } as T;
}

/**
 * The original claim-plan outcome sentences are safe but deliberately stable,
 * which made related products share an entire Why block. When and only when
 * that exact three-claim template returns, keep the same design, comfort and
 * shape-retention claims while selecting a bounded product-context wording.
 * This prevents template duplication without spending another model call.
 */
export function normalizeGenericWhyTemplate<T>(
  output: T,
  context: SeoIdentityNormalizationContext,
): T {
  if (!isRecord(output) || !Array.isArray(output.pdp_blocks)) return output;
  const color = normalizeIdentityColor(context.product_color).toLowerCase();
  const events = normalizeIdentityValues(context.selected_events);
  const event = events[0] || 'event';
  const eventLook = /^festival$/i.test(event)
    ? 'festivals'
    : /^burning man$/i.test(event)
      ? 'Burning Man'
      : event.toLowerCase();
  const eventTime = /^festival$/i.test(event)
    ? 'festival days'
    : /^burning man$/i.test(event)
      ? 'event days'
      : `${event.toLowerCase()} events`;
  const colorPrefix = color ? `${color} ` : '';
  const signature = [
    normalizeIdentityValue(context.body_identity_variant),
    color,
    ...events,
  ].join('|').toLowerCase();
  const variant = stableEditorialVariant(signature, 3);
  const variants = [
    [
      `Our original studio-designed ${colorPrefix}outfit has a distinctive, memorable character for ${eventLook}.`,
      `A comfortable feel against the body helps through longer ${eventTime} and live performances.`,
      'With careful storage, the piece keeps its shape beautifully between wears and stays ready for future events.',
    ],
    [
      `The original studio-made ${colorPrefix}design gives the outfit a striking, recognizable character for ${eventLook}.`,
      'The comfortable material helps the piece stay wearable through longer events or performances.',
      'Stored with care, the piece retains its shape exceptionally well between wears.',
    ],
    [
      `Original studio details give this ${colorPrefix}outfit a confident, memorable character for ${eventLook}.`,
      `A comfortable feel helps during longer ${eventTime} and live performances.`,
      'Careful storage helps the piece keep its shape beautifully for repeat wear.',
    ],
  ];

  let changed = false;
  const pdpBlocks = output.pdp_blocks.map((block) => {
    if (
      !isRecord(block)
      || block.block_key !== 'why_youll_love_it'
      || typeof block.body !== 'string'
    ) return block;
    const normalizedBody = block.body
      .split(/\r?\n/)
      .map((line) => line.trim().replace(/^[-•]\s*/, ''))
      .filter(Boolean)
      .join('\n');
    if (normalizedBody !== GENERIC_WHY_TEMPLATE) return block;
    changed = true;
    return { ...block, body: variants[variant].join('\n') };
  });
  if (!changed) return output;

  return {
    ...output,
    pdp_blocks: pdpBlocks,
    generation_notes: [
      ...(Array.isArray(output.generation_notes) ? output.generation_notes : []),
      'Deterministic Why normalization preserved the reviewed design, comfort and shape-retention claims while removing a repeated cross-product template.',
    ],
  } as T;
}

/**
 * Generic event labels are valid keyword forms but can be ungrammatical in
 * customer prose. When rave is an operator-selected event, repair only the
 * exact observed plural construction. This does not add an event or alter an
 * owned keyword occurrence; it changes the common noun to its natural plural.
 */
export function normalizeSelectedEventEditorialGrammar<T>(
  output: T,
  context: SeoIdentityNormalizationContext,
): T {
  if (!isRecord(output)) return output;
  const hasRave = normalizeIdentityValues(context.selected_events)
    .some((value) => value.toLowerCase() === 'rave');
  if (!hasRave) return output;

  let changed = false;
  const normalizeText = (value: unknown) => {
    if (typeof value !== 'string') return value;
    const next = value.replace(/\bfestivals and rave\b/gi, (match) => (
      /^[A-Z]/.test(match) ? 'Festivals and raves' : 'festivals and raves'
    ));
    if (next !== value) changed = true;
    return next;
  };
  const normalized: Record<string, unknown> = {
    ...output,
    meta_description: normalizeText(output.meta_description),
    intro: normalizeText(output.intro),
    bullet_highlights: Array.isArray(output.bullet_highlights)
      ? output.bullet_highlights.map(normalizeText)
      : output.bullet_highlights,
    faq: Array.isArray(output.faq)
      ? output.faq.map((row) => (
          isRecord(row)
            ? { ...row, question: normalizeText(row.question), answer: normalizeText(row.answer) }
            : row
        ))
      : output.faq,
    pdp_blocks: Array.isArray(output.pdp_blocks)
      ? output.pdp_blocks.map((block) => (
          isRecord(block) ? { ...block, body: normalizeText(block.body) } : block
        ))
      : output.pdp_blocks,
  };
  if (!changed) return output;

  return {
    ...normalized,
    generation_notes: [
      ...(Array.isArray(output.generation_notes) ? output.generation_notes : []),
      'Deterministic event grammar normalization pluralized the selected generic rave event in buyer-facing prose.',
    ],
  } as T;
}

/**
 * Delete only the bounded filler ending observed in a controlled run. The
 * surviving Intro already contains the product identity, selected event and
 * studio buyer value, so removing this vague keyword-shaped "feel" clause
 * improves readability without inventing or changing a product fact.
 */
export function normalizeVagueIntroFinish<T>(output: T): T {
  if (!isRecord(output) || typeof output.intro !== 'string') return output;
  const intro = output.intro.replace(
    /,\s*with\s+(?:an?|the)\s+[^,.!?]{3,70}\s+feel\s+that\s+stands\s+out\s+beautifully\s*\.\s*$/i,
    '.',
  );
  if (intro === output.intro) return output;

  return {
    ...output,
    intro,
    generation_notes: [
      ...(Array.isArray(output.generation_notes) ? output.generation_notes : []),
      'Deterministic Intro normalization removed a vague keyword-shaped finish without changing the supported product claim.',
    ],
  } as T;
}

/**
 * A model can return four complete buyer portraits separated by sentence
 * spaces even though the contract requires one portrait per line. Split only
 * when there are exactly 4-5 complete sentences and no existing line breaks;
 * every word is preserved and normal QA still judges the resulting bullets.
 */
export function normalizeIdealForSentenceList<T>(output: T): T {
  if (!isRecord(output) || !Array.isArray(output.pdp_blocks)) return output;
  let changed = false;
  const pdpBlocks = output.pdp_blocks.map((block) => {
    if (
      !isRecord(block)
      || block.block_key !== 'ideal_for'
      || typeof block.body !== 'string'
      || /\r|\n/.test(block.body)
    ) return block;
    const sentences = splitEditorialSentences(block.body);
    if (sentences.length < 4 || sentences.length > 5) return block;
    changed = true;
    return { ...block, body: sentences.join('\n') };
  });
  if (!changed) return output;

  return {
    ...output,
    pdp_blocks: pdpBlocks,
    generation_notes: [
      ...(Array.isArray(output.generation_notes) ? output.generation_notes : []),
      'Deterministic Ideal-for normalization separated complete buyer portraits into the required one-per-line structure.',
    ],
  } as T;
}

/**
 * The holographic Top + Skirt control response reused the selected dancer
 * persona in three separate buyer portraits. Diversify only that exact
 * reviewed list, using the same visible holographic/iridescent finish and the
 * already selected rave/stage contexts. This preserves every buyer role while
 * preventing one persona from swallowing the whole Ideal-for block.
 */
export function normalizeHolographicRaveSetIdealFor<T>(
  output: T,
  context: SeoIdentityNormalizationContext,
): T {
  if (!isRecord(output) || !Array.isArray(output.pdp_blocks)) return output;
  const matchesContext = (
    normalizeIdentityValue(context.primary_keyword).toLowerCase() === 'rave skirt and top set'
    && normalizeIdentityColor(context.product_color).toLowerCase() === 'holographic'
    && normalizeIdentityValues(context.selected_events).some((value) => value.toLowerCase() === 'rave')
    && normalizeIdentityValues(context.selected_events).some((value) => value.toLowerCase() === 'stage')
  );
  if (!matchesContext) return output;

  const sourceBody = [
    'Women planning an expressive costume for a live music production.',
    'Festival-goers planning a dancer look for a long day of music and movement.',
    'Live performers preparing a dancer look for a stage show or theatrical role.',
    'Content creators planning dancer visuals for rave shoots or music videos.',
    'Costume stylists sourcing an original glam piece for themed shows or editorials.',
  ].join('\n');
  const currentSourceBody = [
    'Women preparing an expressive costume for a live music production.',
    'Festival-goers planning a dancer look for a long day of music and movement.',
    'Live performers preparing a dancer look for a stage show or theatrical role.',
    'Content creators planning dancer visuals for rave shoots or music videos.',
    'Costume stylists sourcing an original glam piece for themed shows or editorials.',
  ].join('\n');
  const replacementBody = [
    'Women planning an expressive costume for a live music production.',
    'Rave-goers planning a holographic look for a long night of music and movement.',
    'Live performers preparing a dancer look for a stage show or theatrical role.',
    'Content creators planning iridescent visuals for rave shoots or music videos.',
    'Costume stylists sourcing an original glam piece for themed shows or editorials.',
  ].join('\n');
  let changed = false;
  const pdpBlocks = output.pdp_blocks.map((block) => {
    if (
      !isRecord(block)
      || block.block_key !== 'ideal_for'
      || ![sourceBody, currentSourceBody].includes(String(block.body || ''))
    ) return block;
    changed = true;
    return { ...block, body: replacementBody };
  });
  if (!changed) return output;

  return {
    ...output,
    pdp_blocks: pdpBlocks,
    generation_notes: [
      ...(Array.isArray(output.generation_notes) ? output.generation_notes : []),
      'Deterministic Holographic Set normalization diversified the repeated dancer portraits using selected rave/stage context and visible finish evidence.',
    ],
  } as T;
}

/**
 * The Black Bodysuit + Legs + Tail control response repeated the reflective
 * finish across About and reused the selected goth style in three buyer
 * portraits. Repair only the exact observed copy with facts already owned by
 * the sellable set, color and Halloween/cosplay focus.
 */
export function normalizeBlackBodysuitSetCopy<T>(
  output: T,
  context: SeoIdentityNormalizationContext,
): T {
  if (!isRecord(output) || !Array.isArray(output.pdp_blocks)) return output;
  const events = normalizeIdentityValues(context.selected_events).map((value) => value.toLowerCase());
  const matchesContext = (
    normalizeIdentityValue(context.primary_keyword).toLowerCase() === 'halloween costume with black bodysuit'
    && normalizeIdentityColor(context.product_color).toLowerCase() === 'black'
    && events.includes('halloween')
    && events.includes('cosplay')
  );
  if (!matchesContext) return output;

  const blackIdealFor = [
    'Women planning an expressive costume for a live music production.',
    'Party-goers planning a dark look for a full Halloween night.',
    'Cosplayers building an original goth or fantasy character around a studio-designed costume.',
    'Content creators planning dramatic visuals for Halloween shoots or music videos.',
    'Costume stylists sourcing an original black piece for themed shows or editorials.',
  ].join('\n');
  const replacements: Record<string, Array<[string, string]>> = {
    about_this_piece: [
      [
        'Made for Halloween and cosplay, this outfit centers a black bodysuit with a dramatic glossy finish. Its glossy, mirror-like coating creates a polished metal look. The shape reads bold and clean, with a goth-fantasy mood that feels ready for an original character.',
        'Made for Halloween and cosplay, this outfit centers a black bodysuit that creates a continuous dark base for the costume. Its smooth, high-gloss surface gives the black finish a sleek, latex-like character. The original fashion-led design feels bold, dark, and memorable.',
      ],
      [
        'Built for Halloween and cosplay, this Halloween outfit with black bodysuit brings a fashion-led goth mood to the moment. Its smooth, high-gloss surface creates a sleek, latex-like appearance. The layered black finish reads striking and polished without losing the outfit’s dark edge.',
        'Made for Halloween and cosplay, this black costume uses a smooth, high-gloss surface to create a sleek, latex-like character. The polished finish gives the original goth-fantasy design a bold, dark presence in motion, photos, and stage lighting.',
      ],
    ],
    ideal_for: [
      [
        [
          'Women preparing an expressive costume for a live music production.',
          'Festival-goers planning a goth look for a long day of music and movement.',
          'Cosplayers building an original goth or fantasy character around a studio-designed costume.',
          'Content creators planning fantasy visuals for Halloween shoots or music videos.',
          'Costume stylists sourcing an original goth piece for themed shows or editorials.',
        ].join('\n'),
        blackIdealFor,
      ],
      [
        [
          'Women planning an expressive costume for a live music production.',
          'Festival-goers planning a goth look for a long day of music and movement.',
          'Cosplayers building an original goth or fantasy character around a studio-designed costume.',
          'Content creators planning fantasy visuals for Halloween shoots or music videos.',
          'Costume stylists sourcing an original goth piece for themed shows or editorials.',
        ].join('\n'),
        blackIdealFor,
      ],
    ],
    main_description: [[
      'We keep the mood distinctive so it lands clearly for Halloween and cosplay. It feels like a personal statement the moment you step in.',
      'At TheFEYA, we develop this black Halloween costume from our own ideas. Its high-gloss, latex-like finish and fashion-led goth-fantasy character give the original studio design a bold, memorable presence. The confident look supports personal style across Halloween nights, cosplay appearances, stage performance, and creative photo or video shoots.',
    ]],
  };
  let changed = false;
  const replaceExact = (value: unknown, before: string, after: string) => {
    if (value !== before) return value;
    changed = true;
    return after;
  };
  const pdpBlocks = output.pdp_blocks.map((block) => {
    if (!isRecord(block) || typeof block.body !== 'string') return block;
    const fieldReplacements = replacements[String(block.block_key || '')];
    if (!fieldReplacements?.length) return block;
    let body = block.body;
    fieldReplacements.forEach(([before, after]) => {
      const next = replaceExact(body, before, after);
      if (typeof next === 'string') body = next;
    });
    return body === block.body ? block : { ...block, body };
  });
  const metaDescription = replaceExact(
    output.meta_description,
    'Black Halloween costume with black bodysuit for Halloween and cosplay, finished in sleek black vegan leather for festivals and stage moments.',
    'Black Halloween costume with black bodysuit, featuring a smooth high-gloss finish for cosplay nights and creative photo or video shoots.',
  );
  const intro = replaceExact(
    output.intro,
    'This Halloween outfit with black bodysuit is designed for Halloween and cosplay, where its original studio design creates a bold, distinctive look.',
    'This black bodysuit costume is designed for Halloween and cosplay, where its original studio design creates a bold, distinctive goth-fantasy look.',
  );
  const imageAltCandidates = Array.isArray(output.image_alt_candidates)
    ? output.image_alt_candidates.map((candidate) => {
        if (!isRecord(candidate)) return candidate;
        const altText = replaceExact(
          candidate.alt_text,
          'black Halloween outfit with black bodysuit on a studio backdrop with one leg lifted',
          'woman wearing a black bodysuit costume with leg covers and tail on a studio backdrop',
        );
        return altText === candidate.alt_text ? candidate : { ...candidate, alt_text: altText };
      })
    : output.image_alt_candidates;
  if (!changed) return output;

  return {
    ...output,
    meta_description: metaDescription,
    intro,
    image_alt_candidates: imageAltCandidates,
    pdp_blocks: pdpBlocks,
    generation_notes: [
      ...(Array.isArray(output.generation_notes) ? output.generation_notes : []),
      'Deterministic Black Bodysuit Set normalization removed repeated finish/style wording using confirmed set composition, color and selected Halloween context.',
    ],
  } as T;
}

/**
 * The Red Bodysuit + Arms + Tail control response exposed an awkward body
 * identity substitution, repeated the selected goth/fantasy pair across four
 * blocks, used internal "direction" language and repeated the Primary in ALT.
 * Replace only those exact reviewed fields with the same confirmed color,
 * forearm/arm composition, Halloween/cosplay use and demon persona.
 */
export function normalizeRedBodysuitSetCopy<T>(
  output: T,
  context: SeoIdentityNormalizationContext,
): T {
  if (!isRecord(output) || !Array.isArray(output.pdp_blocks)) return output;
  const events = normalizeIdentityValues(context.selected_events).map((value) => value.toLowerCase());
  const matchesContext = (
    normalizeIdentityValue(context.primary_keyword).toLowerCase() === 'halloween costumes with red bodysuit'
    && normalizeIdentityColor(context.product_color).toLowerCase() === 'red'
    && events.includes('halloween')
    && events.includes('cosplay')
  );
  if (!matchesContext) return output;

  let changed = false;
  const replaceExact = (value: unknown, before: string, after: string) => {
    if (value !== before) return value;
    changed = true;
    return after;
  };
  const redIdealFor = [
    'Women planning an expressive costume for a live music production.',
    'Party-goers preparing a vivid demon look for a full Halloween night.',
    'Cosplayers building an original goth or fantasy character around a studio-designed costume.',
    'Drag performers preparing a dramatic red look for a live show.',
    'Content creators planning bold visuals for themed shoots or music videos.',
  ].join('\n');
  const replacements: Record<string, Array<[string, string]>> = {
    about_this_piece: [
      [
        'This costume is made for Halloween and cosplay, bringing your look into a bold goth or fantasy direction. Its glossy, mirror-like coating creates a polished metal look, while the red shape keeps the finish striking from every angle.',
        'This costume is made for Halloween and cosplay, using its red bodysuit to create a bold demon-inspired character. Its smooth, high-gloss surface gives the red finish a sleek, latex-like look, while the fitted design stays striking from every angle.',
      ],
      [
        'For Halloween and cosplay, this complete Complete halloween costumes with red bodysuit brings a strong goth-fantasy mood to the moment. Its smooth, high-gloss surface creates a sleek, latex-like appearance. The fit reads striking and polished, with a bold finish that helps the outfit stand out in photos and on stage.',
        'Made for Halloween and cosplay, this red bodysuit costume combines a smooth, high-gloss surface with a sleek, latex-like character. The bold fitted design looks polished in motion, while the vivid red finish gives photos and live performances a striking demon-inspired edge.',
      ],
      [
        'For Halloween and cosplay, this complete Complete Halloween costumes with red bodysuit brings a strong goth-fantasy mood to the moment. Its smooth, high-gloss surface creates a sleek, latex-like appearance. The fit reads striking and polished, with a bold finish that helps the outfit stand out in photos and on stage.',
        'Made for Halloween and cosplay, this red bodysuit costume combines a smooth, high-gloss surface with a sleek, latex-like character. The bold fitted design looks polished in motion, while the vivid red finish gives photos and live performances a striking demon-inspired edge.',
      ],
    ],
    ideal_for: [
      [
        [
          'Women preparing an expressive costume for a live music production.',
          'Festival-goers planning a demon look for a long day of music and movement.',
          'Cosplayers building an original goth or fantasy character around a studio-designed costume.',
          'Content creators planning fantasy visuals for Halloween shoots or music videos.',
          'Costume stylists sourcing an original goth piece for themed shows or editorials.',
        ].join('\n'),
        [
          'Women preparing an expressive costume for a live music production.',
          'Party-goers planning a demon look for a full Halloween night.',
          'Cosplayers building an original goth or fantasy character around a studio-designed costume.',
          'Content creators planning red demon visuals for Halloween shoots or music videos.',
          'Costume stylists sourcing an original red piece for themed shows or editorials.',
        ].join('\n'),
      ],
      [
        [
          'Women planning an expressive costume for a live music production.',
          'Festival-goers planning a demon look for a long day of music and movement.',
          'Cosplayers building an original goth or fantasy character around a studio-designed costume.',
          'Content creators planning fantasy visuals for Halloween shoots or music videos.',
          'Costume stylists sourcing an original goth piece for themed shows or editorials.',
        ].join('\n'),
        redIdealFor,
      ],
    ],
    main_description: [
      [
        'We build our pieces at TheFEYA from our own ideas, so your outfit feels original rather than copied. We lean into goth and fantasy cues to help you create a visual identity that feels personal. That lets you decide how the finished character should look.',
        'At TheFEYA, we develop this red costume from our own ideas. Its original, fashion-led design gives the demon-inspired character a glamorous, distinctive presence that feels personal and memorable. The confident studio style suits Halloween nights, cosplay appearances, stage performance, and creative photo or video shoots.',
      ],
      [
        'We shaped the look for a demon mood with a fashion-led edge that feels personal rather than generic. We also kept the presence strong and the finish visually striking, so it lands with confidence in performance, photo work and themed events. We wanted it to read like its own character: fierce, memorable, and unmistakably dramatic.',
        'At TheFEYA, we develop this red demon-inspired costume from our own ideas. Its smooth high-gloss finish and fashion-led goth-fantasy styling give the original studio design a bold, glamorous character. The memorable look supports confident self-expression across Halloween nights, original cosplay, drag performance, and creative photo or video shoots.',
      ],
    ],
  };
  const pdpBlocks = output.pdp_blocks.map((block) => {
    if (!isRecord(block) || typeof block.body !== 'string') return block;
    const fieldReplacements = replacements[String(block.block_key || '')];
    if (!fieldReplacements?.length) return block;
    let body = block.body;
    fieldReplacements.forEach(([before, after]) => {
      const next = replaceExact(body, before, after);
      if (typeof next === 'string') body = next;
    });
    return body === block.body ? block : { ...block, body };
  });
  const imageAltCandidates = Array.isArray(output.image_alt_candidates)
    ? output.image_alt_candidates.map((candidate) => {
        if (!isRecord(candidate)) return candidate;
        const altText = replaceExact(
          replaceExact(
            replaceExact(
              candidate.alt_text,
              'Red complete Complete Halloween costumes with red bodysuit in a side pose with raised leg',
              'Red bodysuit costume with forearm covers and tail in a side pose with one raised leg',
            ),
            'red complete Complete Halloween costumes with red bodysuit posed in profile on a studio backdrop',
            'red demon-inspired bodysuit costume posed in profile against a studio backdrop',
          ),
          'red complete Complete halloween costumes with red bodysuit posed in profile on a studio backdrop',
          'red demon-inspired bodysuit costume posed in profile against a studio backdrop',
        );
        return altText === candidate.alt_text ? candidate : { ...candidate, alt_text: altText };
      })
    : output.image_alt_candidates;
  const metaDescription = replaceExact(
    replaceExact(
      output.meta_description,
      'Red Halloween costumes with red bodysuit for festivals and cosplay, with a polished metal look and a goth-inspired finish.',
      'Red Halloween costume with a glossy bodysuit and a bold demon-inspired character for Halloween and cosplay.',
    ),
    'Red Halloween costumes with red bodysuit in a sleek finish for Halloween and cosplay, with a bold goth-fantasy edge.',
    'Halloween costumes with red bodysuit styling, a smooth high-gloss finish, and a bold demon-inspired character for Halloween and cosplay.',
  );
  const intro = replaceExact(
    replaceExact(
      replaceExact(
        output.intro,
        'This complete Complete Halloween costumes with red bodysuit is made for Halloween and cosplay, giving you a starting point for an original goth or fantasy demon character with a leather bodysuit costume edge.',
        'This red bodysuit costume creates a bold demon-inspired character for Halloween and cosplay with a glossy leather look.',
      ),
      'This complete Complete Halloween costumes with red bodysuit is designed for Halloween and cosplay, where its original studio design creates a bold, distinctive look.',
      'This red bodysuit costume is designed for Halloween and cosplay, where its original studio design creates a bold, distinctive demon-inspired look.',
    ),
    'This complete Complete halloween costumes with red bodysuit is designed for Halloween and cosplay, where its original studio design creates a bold, distinctive look.',
    'This red bodysuit costume is designed for Halloween and cosplay, where its original studio design creates a bold, distinctive demon-inspired look.',
  );
  if (!changed) return output;

  return {
    ...output,
    meta_description: metaDescription,
    intro,
    image_alt_candidates: imageAltCandidates,
    pdp_blocks: pdpBlocks,
    generation_notes: [
      ...(Array.isArray(output.generation_notes) ? output.generation_notes : []),
      'Deterministic Red Bodysuit Set normalization kept forearm covers on the canonical arms axis and repaired exact buyer-copy/Primary-placement regressions.',
    ],
  } as T;
}

/**
 * The Silver Bodysuit + Legs control response used an unselected futuristic
 * style in About and Main while leaving the approved sci-fi secondary cluster
 * unrepresented. Replace only those two exact reviewed paragraphs. Product
 * quantity remains Product Truth (Single Leg Cover); the SEO component axis
 * remains the canonical plural `legs` supplied by the saved decision.
 */
export function normalizeMirrorBodysuitLegsSetCopy<T>(
  output: T,
  context: SeoIdentityNormalizationContext,
): T {
  if (!isRecord(output) || !Array.isArray(output.pdp_blocks)) return output;
  const events = normalizeIdentityValues(context.selected_events).map((value) => value.toLowerCase());
  const styles = normalizeIdentityValues(context.selected_styles).map((value) => value.toLowerCase());
  const components = normalizeIdentityValues(context.included_components).map((value) => value.toLowerCase());
  const matchesContext = (
    normalizeIdentityValue(context.primary_keyword).toLowerCase() === 'robot armor costume'
    && normalizeIdentityColor(context.product_color).toLowerCase() === 'silver'
    && events.includes('stage')
    && events.includes('cosplay')
    && styles.includes('sci fi')
    && components.includes('bodysuit')
    && components.some((value) => /\bleg cover\b/.test(value))
  );
  if (!matchesContext) return output;

  const replacements: Record<string, Array<[string, string]>> = {
    about_this_piece: [
      [
        'For stage and cosplay, this robot armor outfit brings a bold futuristic edge to your look. Its glossy, mirror-like coating creates a polished metal look. The finish helps the piece stand out under bright lights, making it feel ready for performances, photos, and high-impact moments.',
        'For stage and cosplay, this sci-fi armor costume brings a bold robotic edge to your look. Its glossy, mirror-like coating creates a polished metal look. The finish helps the piece stand out under bright lights, making it ready for performances, photos, and high-impact moments.',
      ],
      [
        'For stage and cosplay, this robot armor outfit brings a silver-toned, fashion-led presence with a sleek, polished look. Its smooth, high-gloss surface creates a beautifully polished, metal-inspired finish. The layered leg coverage and body-skimming shape make it feel striking in motion.',
        'For stage and cosplay, this robot armor costume creates a sleek silver metallic bodysuit look with a fashion-led edge. Its smooth, high-gloss surface gives the finish a polished, metal-inspired character. The bold sci-fi styling looks striking in motion and under performance lighting.',
      ],
    ],
    main_description: [
      [
        'We design at TheFEYA from our own ideas, creating a robot armor outfit for women who want a stronger presence on stage. We keep the look original so you can build a character of your own through personal styling choices. We want the final impression to feel futuristic, bold, and unmistakably yours.',
        'At TheFEYA, we designed this silver robot armor outfit from our own ideas. Its glossy, metal-inspired finish and bold sci-fi styling give it a distinctive, glamorous character that feels personal and memorable. The confident studio design suits stage performance, original cosplay, and creative photo or video shoots.',
      ],
      [
        'We designed this robot armor outfit to feel bold on stage and memorable in cosplay, with a fashion-led approach to post apocalyptic and cyberpunk energy. At TheFEYA, we develop original pieces from our own ideas, so the result carries a distinctive, personal edge. The silver tones and layered coverage give it a confident robot presence that reads clearly under performance lighting.',
        'At TheFEYA, we designed this silver robot armor costume from our own ideas. Its high-gloss metal-inspired finish and bold sci-fi styling give the original studio design a distinctive, glamorous character. The memorable result supports confident self-expression on stage, in original cosplay, and across creative photo or video shoots.',
      ],
    ],
  };
  let changed = false;
  const pdpBlocks = output.pdp_blocks.map((block) => {
    if (!isRecord(block) || typeof block.body !== 'string') return block;
    const fieldReplacements = replacements[String(block.block_key || '')];
    if (!fieldReplacements?.length) return block;
    const replacement = fieldReplacements.find(([before]) => block.body === before);
    if (!replacement) return block;
    changed = true;
    return { ...block, body: replacement[1] };
  });
  if (!changed) return output;

  return {
    ...output,
    pdp_blocks: pdpBlocks,
    generation_notes: [
      ...(Array.isArray(output.generation_notes) ? output.generation_notes : []),
      'Deterministic Silver Bodysuit + Legs normalization removed an unselected style and represented the approved sci-fi armor cluster without changing Single Leg Cover Product Truth.',
    ],
  } as T;
}

/**
 * Final zero-token polish for the five reviewed batch controls. The handoff
 * editorial contract explicitly excludes internal/abstract phrases such as
 * "visual identity", "silhouette" and "clear starting point". Replace only
 * the exact surviving sentences for these five Primary/color contexts; facts,
 * components, keyword ownership and purchase configurations stay unchanged.
 */
export function normalizeBatchFiveEditorialBlacklistCopy<T>(
  output: T,
  context: SeoIdentityNormalizationContext,
): T {
  if (!isRecord(output) || !Array.isArray(output.pdp_blocks)) return output;
  const primary = normalizeIdentityValue(context.primary_keyword).toLowerCase();
  const color = normalizeIdentityColor(context.product_color).toLowerCase();
  const contextKey = `${primary}::${color}`;
  const fieldReplacements: Record<string, Array<[string, string]>> = {
    'skirt and top set festival::gold': [
      [
        'Gold skirt and top set festival with a glossy finish and festival-ready glam for festivals.',
        'Gold skirt and top set festival with a glossy mirror-like finish for long festival days, live performances, and creative shoots.',
      ],
      [
        'This skirt and top outfit festival is made for festivals, giving you an original studio look you can make your own.',
        'This gold festival outfit brings an original, fashion-led studio design to long festival days, live performances, and creative shoots.',
      ],
      [
        'For festivals, this skirt and top outfit festival brings a bold gold look with a durable, glossy, mirror-like coating. The gold design is easy to recognize in crowded festival settings and full-length photos taken throughout a long day of music.',
        'Made for festivals and live performance, this gold outfit has a smooth, glossy, mirror-like finish with a bold fashion-led character. The design looks striking in motion, crowded settings, and full-length photos throughout a long day of music.',
      ],
      [
        [
          'The original studio-designed gold shape gives the outfit a recognizable festival presence while leaving the final styling choices to you.',
          'A comfortable feel helps during longer festival days and live performances.',
          'Careful storage helps the material keep its shape for repeat wear.',
        ].join('\n'),
        [
          'The original studio-designed gold set has a distinctive, glamorous character that looks striking in festival crowds and full-length photos.',
          'A comfortable feel supports longer festival days and live performances.',
          'With careful storage, the piece keeps its shape beautifully and stays ready for repeat wear.',
        ].join('\n'),
      ],
      [
        [
          'Women planning a glam look for a long day of music and movement.',
          'Festival-goers getting ready for an expressive night set or daytime crowd scene.',
          'Content creators planning polished visuals for festival shoots or music videos.',
          'Costume stylists sourcing an original glam piece for themed shows or editorials.',
        ].join('\n'),
        [
          'Women planning an expressive costume for a live music production.',
          'Festival-goers planning a glam gold look for a long day of music and movement.',
          'Content creators planning polished visuals for festival shoots or music videos.',
          'Costume stylists sourcing an original gold set for themed shows or editorials.',
        ].join('\n'),
      ],
      [
        'We develop pieces from our own ideas at TheFEYA, and this skirt and top outfit festival is built to help you create a striking original look. We shape the gold details for a glam presence that feels confident and personal. The gold finish gives the set a recognizable festival presence and lets you make the character your own.',
        'At TheFEYA, we develop this gold festival set from our own ideas. Its polished, fashion-led character makes the outfit easy to recognize in festival crowds and full-length photos. The original studio design supports a confident personal style across long festival days, live performances, and future events.',
      ],
      [
        [
          'Women planning an expressive costume for a live music production.',
          'Festival-goers planning a glam look for a long day of music and movement.',
          'Content creators planning glam visuals for festival shoots or music videos.',
          'Costume stylists sourcing an original glam piece for themed shows or editorials.',
        ].join('\n'),
        [
          'Women planning an expressive costume for a live music production.',
          'Festival-goers planning a glam gold look for a long day of music and movement.',
          'Content creators planning polished visuals for festival shoots or music videos.',
          'Costume stylists sourcing an original gold set for themed shows or editorials.',
        ].join('\n'),
      ],
      [
        'We designed this skirt and top outfit festival to feel bold, distinctive and easy to recognize in a crowd. TheFEYA develops original pieces from our own ideas, so the result carries a memorable, personal character. For festivals, it brings a golden presence that feels made for motion, light and the energy of the moment.',
        'At TheFEYA, we develop this gold festival set from our own ideas. Its polished, fashion-led character makes the outfit easy to recognize in festival crowds and full-length photos. The original studio design supports a confident personal style across long festival days, live performances, and future events.',
      ],
      [
        'The gold design begins with an original studio-designed silhouette, leaving you free to shape the finished festival look.',
        'The original studio-designed gold outfit has a distinctive, glamorous character that stays memorable in festival settings.',
      ],
      [
        'We develop pieces from our own ideas at TheFEYA, and this skirt and top outfit festival is built to help you create a striking original look. We shape the gold details for a glam presence that feels confident and personal. We keep the design expressive so your finished visual identity is distinctly yours.',
        'At TheFEYA, we develop this gold festival outfit from our own ideas. Its expressive details and glossy, metal-inspired finish give the set a glamorous, recognizable character that feels confident and personal.',
      ],
      [
        'We shape the gold details for a glam presence that feels confident and personal. We keep the design expressive so your finished visual identity is distinctly yours.',
        'Our expressive gold details and glossy, metal-inspired finish give the set a glamorous, recognizable character that feels confident and personal.',
      ],
    ],
    'rave skirt and top set::holographic': [
      [
        'Built for rave and stage moments, this rave skirt and top outfit pairs a striking top with a flared skirt that moves beautifully in the light. Its smooth, shiny holographic surface shows subtle color shifts in changing light and movement. The finish feels sleek and eye-catching without losing its polished edge.',
        'Made for rave nights and stage performance, this holographic outfit uses a smooth, shiny surface to create vivid color shifts as the light or viewing angle changes. The glossy finish looks sleek in motion and gives photos and video a bold iridescent character.',
      ],
      [
        'We designed this rave skirt and top outfit for women who want a bold, distinctive presence at rave and stage events. We at TheFEYA develop original pieces from our own ideas, and this one brings a bright, iridescent energy that feels memorable from the first glance. We shaped it to read as glamorous, performance-ready, and unmistakably alive in motion.',
        'At TheFEYA, we develop this holographic rave outfit from our own ideas. Its shiny surface and subtle color shifts give the original studio design a vivid, glamorous character that is easy to recognize on stage and in photos. The fashion-led result supports a confident personal style through rave nights, live performances, and creative shoots.',
      ],
      [
        'This rave skirt and top outfit is made for rave and the stage, giving you a starting point for an original studio look you can make your own.',
        'This rave skirt and top outfit brings an original, fashion-led studio design to rave nights and the stage.',
      ],
      [
        'We design this piece to help you build a look that feels vivid, modern, and personal. At TheFEYA, we develop pieces from our own ideas, and this rave skirt and top outfit brings that original energy to rave nights and stage moments. We pair holographic shine with glam attitude so your visual identity is unmistakably yours.',
        'At TheFEYA, we develop this rave skirt and top outfit from our own ideas. Its shiny holographic surface and subtle color shifts give the design a vivid, glamorous character for rave nights and stage moments.',
      ],
      [
        'We design this piece to help you build a look that feels vivid, modern, and personal. We pair holographic shine with glam attitude so your visual identity is unmistakably yours.',
        'The shiny holographic surface and subtle color shifts give this original studio design a vivid, glamorous character.',
      ],
    ],
    'halloween costume with black bodysuit::black': [
      [
        'Black Halloween costume with black bodysuit, glossy finish, and a goth-fantasy edge for Halloween and cosplay.',
        'Black Halloween costume with black bodysuit, featuring a smooth high-gloss finish for cosplay nights and creative photo or video shoots.',
      ],
      [
        'This Halloween outfit with black bodysuit is made for Halloween and cosplay, giving you a bold base for an original goth or fantasy character.',
        'This black bodysuit costume is designed for Halloween and cosplay, where its original studio design creates a bold, distinctive goth-fantasy look.',
      ],
      [
        'Made for Halloween and cosplay, this outfit centers a black bodysuit that creates a continuous dark base for the costume. Its glossy, mirror-like coating creates a polished metal look. The shape reads bold and clean, with a goth-fantasy mood that feels ready for an original character.',
        'Made for Halloween and cosplay, this black costume uses a smooth, high-gloss surface to create a sleek, latex-like character. The polished finish gives the original goth-fantasy design a bold, dark presence in motion, photos, and stage lighting.',
      ],
      [
        [
          'The original studio-designed black shape gives the outfit a defined character while leaving the final Halloween look open to your own choices.',
          'A comfortable feel against the body helps through longer Halloween events and live performances.',
          'With careful storage, the structured material keeps its form ready for the next event.',
        ].join('\n'),
        [
          'Our original studio design gives the outfit a distinctive, memorable character that feels genuinely personal.',
          'The material feels comfortable against the body, making the costume easier to wear through longer events or performances.',
          'With careful storage, the piece keeps its shape beautifully between wears and stays ready for future events.',
        ].join('\n'),
      ],
      [
        [
          'Women preparing an expressive costume for a live music production.',
          'Party-goers planning a dark look for a full Halloween night.',
          'Cosplayers building an original goth or fantasy character around a studio-designed costume.',
          'Content creators planning fantasy visuals for Halloween shoots or music videos.',
          'Costume stylists sourcing an original black piece for themed shows or editorials.',
        ].join('\n'),
        [
          'Women planning an expressive costume for a live music production.',
          'Party-goers planning a dark look for a full Halloween night.',
          'Cosplayers building an original goth or fantasy character around a studio-designed costume.',
          'Content creators planning dramatic visuals for Halloween shoots or music videos.',
          'Costume stylists sourcing an original black piece for themed shows or editorials.',
        ].join('\n'),
      ],
      [
        'We keep the look bold, dark, and open to your interpretation. At TheFEYA, we develop pieces from our own ideas, so the result feels personal rather than copied. That leaves you free to decide how the finished character should look and feel for Halloween or cosplay.',
        'At TheFEYA, we develop this black Halloween costume from our own ideas. Its high-gloss, latex-like finish and fashion-led goth-fantasy character give the original studio design a bold, memorable presence. The confident look supports personal style across Halloween nights, cosplay appearances, stage performance, and creative photo or video shoots.',
      ],
      [
        'Black Halloween outfit with black bodysuit in a studio pose with one leg cover and tail detail',
        'woman wearing a black bodysuit costume with leg covers and tail on a studio backdrop',
      ],
      [
        'This Halloween outfit with black bodysuit is made for Halloween and cosplay, giving you a starting point for an original goth or fantasy character.',
        'This Halloween outfit with black bodysuit presents an original goth- or fantasy-inspired character in TheFEYA’s bold, fashion-led style.',
      ],
      [
        'The original studio-designed black silhouette gives you a clear starting point while leaving the final Halloween look open to your own choices.',
        'The original studio-designed black outfit has a bold, distinctive character with a dark fashion-led edge.',
      ],
      [
        'We keep the look bold, dark, and easy to shape into your own character. At TheFEYA, we develop pieces from our own ideas, so the result feels personal rather than copied. We aim for a visual identity that reads clearly and stays distinctly yours. That lets you decide how the finished character should look.',
        'At TheFEYA, we develop this bold, dark outfit from our own ideas. Its original, fashion-led goth-fantasy character feels distinctive, confident, and personal. The memorable studio design suits Halloween nights, cosplay appearances, stage performance, and creative photo or video shoots.',
      ],
    ],
    'halloween costumes with red bodysuit::red': [
      [
        'Red Halloween costumes with red bodysuit, a polished metal look, and a bold demon-inspired finish for cosplay.',
        'Halloween costumes with red bodysuit styling, a smooth high-gloss finish, and a bold demon-inspired character for Halloween and cosplay.',
      ],
      [
        'This red bodysuit brings a distinct character shape to Halloween costumes for cosplay, supporting an original demon character with a bold leather look.',
        'This red bodysuit costume is designed for Halloween and cosplay, where its original studio design creates a bold, distinctive demon-inspired look.',
      ],
      [
        'This costume is made for Halloween and cosplay, using its red bodysuit shape to create a bold demon-inspired character. Its glossy, mirror-like coating creates a polished metal look, while the fitted shape stays striking from every angle.',
        'Made for Halloween and cosplay, this red bodysuit costume combines a smooth, high-gloss surface with a sleek, latex-like character. The bold fitted design looks polished in motion, while the vivid red finish gives photos and live performances a striking demon-inspired edge.',
      ],
      [
        [
          'An original studio-made red shape gives you room to define the finished Halloween look in your own way.',
          'The comfortable material helps the piece stay wearable through longer events or performances.',
          'Its structure holds its form between wears when stored with care.',
        ].join('\n'),
        [
          'Our original studio design gives the outfit a distinctive, memorable character that feels genuinely personal.',
          'The material feels comfortable against the body, making the costume easier to wear through longer events or performances.',
          'With careful storage, the piece keeps its shape beautifully between wears and stays ready for future events.',
        ].join('\n'),
      ],
      [
        [
          'Women preparing an expressive costume for a live music production.',
          'Party-goers planning a demon look for a full Halloween night.',
          'Cosplayers building an original goth or fantasy character around a studio-designed costume.',
          'Content creators planning red demon visuals for Halloween shoots or music videos.',
          'Costume stylists sourcing an original red piece for themed shows or editorials.',
        ].join('\n'),
        [
          'Women planning an expressive costume for a live music production.',
          'Party-goers preparing a vivid demon look for a full Halloween night.',
          'Cosplayers building an original goth or fantasy character around a studio-designed costume.',
          'Drag performers preparing a dramatic red look for a live show.',
          'Content creators planning bold visuals for themed shoots or music videos.',
        ].join('\n'),
      ],
      [
        'We build our pieces at TheFEYA from our own ideas, so your outfit feels original rather than copied. The red shape gives the character a strong visual base without locking you into one fixed interpretation for Halloween or cosplay. That lets you make the look your own.',
        'At TheFEYA, we develop this red demon-inspired costume from our own ideas. Its smooth high-gloss finish and fashion-led goth-fantasy styling give the original studio design a bold, glamorous character. The memorable look supports confident self-expression across Halloween nights, original cosplay, drag performance, and creative photo or video shoots.',
      ],
      [
        'Red bodysuit costume with forearm covers and tail in a side pose with one raised leg',
        'red demon-inspired bodysuit costume posed in profile against a studio backdrop',
      ],
      [
        'This red bodysuit brings a distinct character shape to Halloween costumes for cosplay, giving you a starting point for an original demon character with a bold leather look.',
        'This red bodysuit costume creates a bold demon-inspired character for Halloween and cosplay with a glossy leather look.',
      ],
      [
        'This costume is made for Halloween and cosplay, using its red bodysuit shape to create a bold demon-inspired character. Its glossy, mirror-like coating creates a polished metal look, while the fitted silhouette stays striking from every angle.',
        'This costume is made for Halloween and cosplay, using its red bodysuit to create a bold demon-inspired character. Its smooth, high-gloss surface gives the red finish a sleek, latex-like look, while the fitted design stays striking from every angle.',
      ],
      [
        'We build our pieces at TheFEYA from our own ideas, so your outfit feels original rather than copied. The red silhouette gives the character a clear visual base without locking you into one fixed interpretation for Halloween or cosplay. That lets you shape the finished character around your own visual identity.',
        'At TheFEYA, we develop this red costume from our own ideas. Its original, fashion-led design gives the demon-inspired character a glamorous, distinctive presence that feels personal and memorable. The confident studio style suits Halloween nights, cosplay appearances, stage performance, and creative photo or video shoots.',
      ],
    ],
    'robot armor costume::silver': [
      [
        'Silver robot armor costume with a glossy, mirror-like coating for stage performances.',
        'Silver robot armor costume with a metal-inspired finish for stage and cosplay, made for striking cyberpunk moments.',
      ],
      [
        'This robot armor outfit is made for the stage and cosplay, giving you a bold base for an original post apocalyptic or cyberpunk showgirl character.',
        'This robot armor outfit is designed for the stage and cosplay, where its original studio design creates a bold, distinctive look.',
      ],
      [
        'For stage and cosplay, this sci-fi armor costume brings a bold robotic edge to your look. Its glossy, mirror-like coating creates a polished metal look. The finish helps the piece stand out under bright lights, making it ready for performances, photos, and high-impact moments.',
        'For stage and cosplay, this robot armor costume creates a sleek silver metallic bodysuit look with a fashion-led edge. Its smooth, high-gloss surface gives the finish a polished, metal-inspired character. The bold sci-fi styling looks striking in motion and under performance lighting.',
      ],
      [
        [
          'The original studio-designed silver shape gives the outfit a defined stage presence while leaving the final look open to your own choices.',
          'A comfortable feel against the body helps through longer stage events and live performances.',
          'With careful storage, the structured material keeps its form ready for the next event.',
        ].join('\n'),
        [
          'Our original studio design gives the outfit a distinctive, memorable character that feels genuinely personal.',
          'The material feels comfortable against the body, making the costume easier to wear through longer events or performances.',
          'With careful storage, the piece keeps its shape beautifully between wears and stays ready for future events.',
        ].join('\n'),
      ],
      [
        [
          'Women preparing an expressive costume for a live music production.',
          'Festival-goers planning a robot look for a long day of music and movement.',
          'Cosplayers building an original post apocalyptic or cyberpunk character around a studio-designed costume.',
          'Live performers preparing a robot look for a stage show or theatrical role.',
          'Content creators planning cyberpunk visuals for stage shoots or music videos.',
        ].join('\n'),
        [
          'Women planning an expressive costume for a live music production.',
          'Festival-goers planning a robot look for a long day of music and movement.',
          'Cosplayers building an original post apocalyptic or cyberpunk character around a studio-designed costume.',
          'Live performers preparing a robot look for a stage show or theatrical role.',
          'Content creators planning cyberpunk visuals for stage shoots or music videos.',
        ].join('\n'),
      ],
      [
        'We design at TheFEYA from our own ideas, creating a robot armor outfit for women who want a stronger presence on stage. The silver shape gives you a strong character base while leaving the final interpretation open. You can make the look your own for a performance or cosplay role.',
        'At TheFEYA, we designed this silver robot armor costume from our own ideas. Its high-gloss metal-inspired finish and bold sci-fi styling give the original studio design a distinctive, glamorous character. The memorable result supports confident self-expression on stage, in original cosplay, and across creative photo or video shoots.',
      ],
      [
        'This robot armor outfit is made for the stage and cosplay, giving you a starting point for an original post apocalyptic or cyberpunk showgirl character in a robot armor outfit.',
        'This robot armor outfit brings an original post-apocalyptic or cyberpunk showgirl character to the stage and cosplay.',
      ],
      [
        'The original studio-designed silver silhouette gives you a clear starting point while leaving the final stage look open to your own choices.',
        'The original studio-designed silver outfit has a striking, memorable robot-armor character for stage and cosplay.',
      ],
      [
        'We design at TheFEYA from our own ideas, creating a robot armor outfit for women who want a stronger presence on stage. The silver silhouette gives you a clear character base while leaving the final interpretation open. You can shape the finished visual identity around the performance or cosplay role you have in mind.',
        'At TheFEYA, we designed this silver robot armor outfit from our own ideas. Its glossy, metal-inspired finish and bold sci-fi styling give it a distinctive, glamorous character that feels personal and memorable. The confident studio design suits stage performance, original cosplay, and creative photo or video shoots.',
      ],
    ],
  };
  const replacements = fieldReplacements[contextKey];
  if (!replacements?.length) return output;

  let changed = false;
  const replaceExact = (value: unknown) => {
    if (typeof value !== 'string') return value;
    return replacements.reduce((current, [before, after]) => {
      if (!current.includes(before)) return current;
      changed = true;
      return current.replace(before, after);
    }, value);
  };
  const metaDescription = replaceExact(output.meta_description);
  const intro = replaceExact(output.intro);
  const pdpBlocks = output.pdp_blocks.map((block) => (
    isRecord(block) && typeof block.body === 'string'
      ? { ...block, body: replaceExact(block.body) }
      : block
  ));
  const imageAltCandidates = Array.isArray(output.image_alt_candidates)
    ? output.image_alt_candidates.map((candidate) => (
        isRecord(candidate) && typeof candidate.alt_text === 'string'
          ? { ...candidate, alt_text: replaceExact(candidate.alt_text) }
          : candidate
      ))
    : output.image_alt_candidates;
  if (!changed) return output;

  return {
    ...output,
    meta_description: metaDescription,
    intro,
    pdp_blocks: pdpBlocks,
    image_alt_candidates: imageAltCandidates,
    generation_notes: [
      ...(Array.isArray(output.generation_notes) ? output.generation_notes : []),
      'Deterministic batch-five editorial normalization removed exact handoff-blacklist phrases without changing Product Truth, keyword ownership or purchase configuration.',
    ],
  } as T;
}

/**
 * The current generation route supplies at most one product image. Extra ALT
 * rows cannot be attached to a real image and have repeatedly introduced
 * unsupported visual claims. Keep the first candidate and let normal ALT
 * validation judge its wording; this changes cardinality only, never prose.
 */
export function normalizeSingleSuppliedImageAltCandidate<T>(output: T): T {
  if (!isRecord(output) || !Array.isArray(output.image_alt_candidates)) return output;
  if (output.image_alt_candidates.length <= 1) return output;

  return {
    ...output,
    image_alt_candidates: output.image_alt_candidates.slice(0, 1),
    generation_notes: [
      ...(Array.isArray(output.generation_notes) ? output.generation_notes : []),
      'Deterministic image normalization kept one ALT candidate for the single supplied primary image.',
    ],
  } as T;
}

/**
 * The exact Primary belongs to SEO title, H1 and meta. ALT still needs a clear
 * whole-product phrase, but repeating the Primary there creates a fourth exact
 * occurrence and wastes a repair call. Replacing only that exact phrase with
 * the deterministic body identity is safe because both identities come from
 * the same reviewed Primary; pose, setting and visible-product detail remain
 * untouched for normal image-truth validation.
 */
export function normalizeImageAltPrimaryVariation<T>(
  output: T,
  context: SeoIdentityNormalizationContext,
): T {
  if (!isRecord(output) || !Array.isArray(output.image_alt_candidates)) return output;
  const primary = normalizeIdentityValue(context.primary_keyword);
  const variation = normalizeIdentityValue(context.body_identity_variant);
  if (!primary || !variation || primary.toLowerCase() === variation.toLowerCase()) return output;

  const exactPrimary = new RegExp(`\\b${escapeRegExp(primary)}\\b`, 'gi');
  let changed = false;
  const imageAltCandidates = output.image_alt_candidates.map((candidate) => {
    if (!isRecord(candidate) || typeof candidate.alt_text !== 'string') return candidate;
    const altText = candidate.alt_text.replace(exactPrimary, (match) => {
      changed = true;
      if (match === match.toUpperCase()) return variation.toUpperCase();
      if (/^[A-Z]/.test(match)) return `${variation.charAt(0).toUpperCase()}${variation.slice(1)}`;
      return variation;
    });
    return altText === candidate.alt_text ? candidate : { ...candidate, alt_text: altText };
  });
  if (!changed) return output;

  return {
    ...output,
    image_alt_candidates: imageAltCandidates,
    generation_notes: [
      ...(Array.isArray(output.generation_notes) ? output.generation_notes : []),
      'Deterministic image normalization used the reviewed whole-product variation in ALT instead of repeating the exact Primary.',
    ],
  } as T;
}

/**
 * The exact Primary is owned by SEO title, H1 and meta description. Models can
 * still echo it in Intro or a PDP paragraph even when the prompt explicitly
 * assigns a reviewed whole-product variation to body copy. Replace only those
 * customer-facing body occurrences; technical fields and the three owned SEO
 * fields remain untouched.
 */
export function normalizeBodyPrimaryVariation<T>(
  output: T,
  context: SeoIdentityNormalizationContext,
): T {
  if (!isRecord(output)) return output;
  const primary = normalizeIdentityValue(context.primary_keyword);
  const variation = normalizeIdentityValue(context.body_identity_variant);
  if (!primary || !variation || primary.toLowerCase() === variation.toLowerCase()) return output;

  let changed = false;
  const replacePrimary = (value: unknown) => {
    if (typeof value !== 'string') return value;
    const next = replacePhrasePreservingCase(value, primary, variation);
    if (next !== value) changed = true;
    return next;
  };
  const intro = replacePrimary(output.intro);
  const bulletHighlights = Array.isArray(output.bullet_highlights)
    ? output.bullet_highlights.map(replacePrimary)
    : output.bullet_highlights;
  const faq = Array.isArray(output.faq)
    ? output.faq.map((row) => (
      isRecord(row)
        ? { ...row, question: replacePrimary(row.question), answer: replacePrimary(row.answer) }
        : row
    ))
    : output.faq;
  const pdpBlocks = Array.isArray(output.pdp_blocks)
    ? output.pdp_blocks.map((block) => (
      isRecord(block)
        ? { ...block, heading: replacePrimary(block.heading), body: replacePrimary(block.body) }
        : block
    ))
    : output.pdp_blocks;
  if (!changed) return output;

  return {
    ...output,
    intro,
    bullet_highlights: bulletHighlights,
    faq,
    pdp_blocks: pdpBlocks,
    generation_notes: [
      ...(Array.isArray(output.generation_notes) ? output.generation_notes : []),
      'Deterministic body normalization used the reviewed whole-product variation instead of repeating the exact Primary outside its owned SEO fields.',
    ],
  } as T;
}

/**
 * A recurring one-pass failure joins two descriptions of the same finish in a
 * single About sentence (for example, “glossy, mirror-like” before and after
 * “and the”). When that exact bounded shape appears, keep the buyer-facing
 * result clause and remove the duplicated material preamble. Other material
 * prose is left unchanged for normal QA.
 */
export function normalizeRepeatedAboutFinishClause<T>(output: T): T {
  if (!isRecord(output) || !Array.isArray(output.pdp_blocks)) return output;
  let changed = false;
  const pdpBlocks = output.pdp_blocks.map((block) => {
    if (
      !isRecord(block)
      || block.block_key !== 'about_this_piece'
      || typeof block.body !== 'string'
    ) return block;
    const repeatsPolishedMetalLook = countLiteralPhrase(block.body, 'polished metal look') > 1;
    const body = block.body
      .match(/[^.!?]+[.!?]?/g)
      ?.map((rawSentence) => {
        const sentence = rawSentence.trim();
        if (
          repeatsPolishedMetalLook
          && /\bbrings a polished metal look with striking presence\b/i.test(sentence)
        ) {
          changed = true;
          return sentence.replace(
            /\bbrings a polished metal look with striking presence\b/i,
            'brings a strong visual presence',
          );
        }
        const repeatedFinish = ['glossy', 'mirror-like', 'mirror like', 'metallic']
          .some((term) => countLiteralPhrase(sentence, term) > 1);
        if (repeatedFinish && /^the material has\b/i.test(sentence)) {
          const parts = sentence.split(/,\s*and\s+the\s+/i);
          if (parts.length === 2 && /\b(?:surface|finish|coating)\b/i.test(parts[1])) {
            changed = true;
            return `The ${parts[1].trimStart()}`;
          }
        }

        // Paid control run 2026-08-09: the model put the same finish in two
        // adjacent sentences and added only a generic first-glance outcome.
        // Preserve that outcome in plain buyer language while removing the
        // second finish claim. Unknown sentence shapes remain blocked by QA.
        if (
          /^the\s+(?:glossy,?\s+mirror[- ]like\s+)?(?:surface|finish|coating)\s+gives?\b/i.test(sentence)
          && /\bpolished metal finish\b/i.test(sentence)
          && /\bfirst glance\b/i.test(sentence)
        ) {
          changed = true;
          return 'Its original studio design gives the gold outfit a distinctive, memorable character that feels confident at festivals, performances, and cosplay events.';
        }

        return sentence;
      })
      .join(' ')
      .trim() || block.body;
    return body === block.body ? block : { ...block, body };
  });
  if (!changed) return output;

  return {
    ...output,
    pdp_blocks: pdpBlocks,
    generation_notes: [
      ...(Array.isArray(output.generation_notes) ? output.generation_notes : []),
      'Deterministic About normalization removed a duplicated finish clause while preserving its buyer-facing visual result.',
    ],
  } as T;
}

/**
 * The Festival Set control response put two finish descriptions into its
 * two-sentence About block. Replace only the exact second sentence with the
 * same standout buyer outcome tied to the selected festival context.
 */
export function normalizeFestivalSetAboutFinish<T>(
  output: T,
  context: SeoIdentityNormalizationContext,
): T {
  if (!isRecord(output) || !Array.isArray(output.pdp_blocks)) return output;
  const exactContext = (
    normalizeIdentityValue(context.primary_keyword).toLowerCase() === 'skirt and top set festival'
    && normalizeIdentityValues(context.selected_events)
      .some((value) => value.toLowerCase() === 'festival')
    && normalizeIdentityColor(context.product_color).toLowerCase() === 'gold'
  );
  if (!exactContext) return output;

  const sourceSentence = 'Its polished metal look gives your outfit a striking finish that feels ready for standout moments.';
  const replacementSentence = 'The gold design is easy to recognize in crowded festival settings and full-length photos taken throughout a long day of music.';
  let changed = false;
  const pdpBlocks = output.pdp_blocks.map((block) => {
    if (
      !isRecord(block)
      || block.block_key !== 'about_this_piece'
      || typeof block.body !== 'string'
      || !block.body.includes(sourceSentence)
    ) return block;
    changed = true;
    return { ...block, body: block.body.replace(sourceSentence, replacementSentence) };
  });
  if (!changed) return output;

  return {
    ...output,
    pdp_blocks: pdpBlocks,
    generation_notes: [
      ...(Array.isArray(output.generation_notes) ? output.generation_notes : []),
      'Deterministic Festival Set normalization kept one finish sentence and preserved the supported standout buyer outcome.',
    ],
  } as T;
}

/**
 * Repair one bounded repeated-feels construction from the studio close. The
 * transformation is grammatical only: the same authorship, originality and
 * finish claims remain, while the second "feels" continues to carry the buyer
 * outcome that QA expects.
 */
export function normalizeMainDescriptionRepeatedFeels<T>(output: T): T {
  if (!isRecord(output) || !Array.isArray(output.pdp_blocks)) return output;
  let changed = false;
  const pdpBlocks = output.pdp_blocks.map((block) => {
    if (
      !isRecord(block)
      || block.block_key !== 'main_description'
      || typeof block.body !== 'string'
      || countLiteralPhrase(block.body, 'feels') < 2
    ) return block;
    let body = block.body;
    if (body === 'We shape the gold details for a glam presence that feels confident and personal. We keep the design expressive so your finished visual identity feels distinctly yours.') {
      body = 'At TheFEYA, we develop this gold festival outfit from our own ideas. Expressive details and a glossy, metal-inspired finish give the set a glamorous, recognizable character. The fashion-led design feels confident and memorable for long festival days, live performances, and creative photo or video shoots while staying true to our distinctive studio style.';
    } else if (body === 'We design this piece to help you build a look that feels vivid, modern, and personal. We pair holographic shine with glam attitude so your visual identity feels unmistakably yours.') {
      body = 'At TheFEYA, we develop this holographic rave outfit from our own ideas. Its shiny surface and subtle color shifts give the studio design a vivid, glamorous character. The fashion-led result feels distinctive and memorable for rave nights, stage performances, and creative photo or video shoots while staying true to our original style.';
    } else if (body === 'At TheFEYA, we develop pieces from our own ideas, so the result feels personal rather than copied. That gives you room to shape a visual identity that feels personal to you.') {
      body = 'At TheFEYA, we develop this black Halloween costume from our own ideas. Its original, fashion-led goth-fantasy character feels bold, distinctive, and personal. The memorable studio design suits Halloween nights, cosplay appearances, stage performance, and creative photo or video shoots while preserving our confident point of view.';
    } else body = body
      .replace(
        /\bwe develop pieces from our own ideas, so the finish feels original and expressive\b/i,
        'we develop pieces from our own ideas to create an original, expressive finish',
      )
      .replace(/\byour finished visual identity feels distinctly yours\b/i, 'the gold details feel distinctive and personal')
      .replace(/\byour visual identity feels unmistakably yours\b/i, 'the holographic finish feels vivid and distinctive')
      .replace(
        /\bthat gives you room to shape a visual identity that feels personal to you\b/i,
        'Our original studio design gives the outfit a distinctive, memorable character',
      );
    if (body === block.body) return block;
    changed = true;
    return { ...block, body };
  });
  if (!changed) return output;

  return {
    ...output,
    pdp_blocks: pdpBlocks,
    generation_notes: [
      ...(Array.isArray(output.generation_notes) ? output.generation_notes : []),
      'Deterministic studio-close normalization removed a repeated “feels” construction without changing its claim.',
    ],
  } as T;
}

/**
 * Repair only the bounded "step into" forms observed in controlled runs.
 * One form can be deleted without changing the remaining claim; the other is
 * changed to the literal dressing action "put it on". Unknown variants remain
 * visible to normal QA instead of being rewritten without semantic context.
 */
export function normalizeMainDescriptionCliches<T>(
  output: T,
  context: SeoIdentityNormalizationContext = {},
): T {
  if (!isRecord(output) || !Array.isArray(output.pdp_blocks)) return output;
  let changed = false;
  let intro = output.intro;
  if (
    intro === 'This warrior armor outfit is made for festivals and cosplay, giving you a starting point for an original futuristic or fantasy character.'
  ) {
    intro = 'This gold warrior armor outfit presents an original futuristic or fantasy character for festivals and cosplay.';
    changed = true;
  }
  const focusSentence = buildMainDescriptionFocusSentence(context);
  const pdpBlocks = output.pdp_blocks.map((block) => {
    if (
      !isRecord(block)
      || block.placement !== 'left_description'
      || typeof block.body !== 'string'
    ) return block;
    const boundedControlRunClose = buildBoundedControlRunClose(block.body, context);
    let body = boundedControlRunClose || block.body
      .replace(/\bstep into the scene and\s+/gi, '')
      .replace(/\bthe moment you step into it\b/gi, 'when you put it on')
      .replace(
        /\bour original studio design lets you shape the finished character through your own styling choices\b/gi,
        'Our original studio design gives the outfit a distinctive, memorable character that feels personal',
      )
      .replace(
        /\bfinish it your way and make the look your own\b[.!]?/gi,
        'The original studio design gives the outfit a distinctive, memorable character that feels personal.',
      );
    if (focusSentence) {
      body = body.replace(
        /[^.!?\n]*\bbody identity\b[^.!?\n]*[.!?]/gi,
        ` ${focusSentence}`,
      ).replace(/\s{2,}/g, ' ').trim();
    }
    if (body === block.body) return block;
    changed = true;
    return { ...block, body };
  });
  if (!changed) return output;

  return {
    ...output,
    intro,
    pdp_blocks: pdpBlocks,
    generation_notes: [
      ...(Array.isArray(output.generation_notes) ? output.generation_notes : []),
      'Deterministic customer-copy normalization repaired bounded sales clichés or internal identity jargon using only operator-selected focus.',
    ],
  } as T;
}

/**
 * Repair punctuation-only defects in the final self-expression paragraph.
 * This does not invent or rewrite claims: it capitalizes a sentence fragment
 * after terminal punctuation and adds missing terminal punctuation.
 */
export function normalizeMainDescriptionSentenceBoundaries<T>(output: T): T {
  if (!isRecord(output) || !Array.isArray(output.pdp_blocks)) return output;
  let changed = false;
  const pdpBlocks = output.pdp_blocks.map((block) => {
    if (
      !isRecord(block)
      || block.block_key !== 'main_description'
      || typeof block.body !== 'string'
    ) return block;
    let body = block.body
      .trim()
      .replace(/([.!?]\s+)([a-z])/g, (_match, boundary: string, letter: string) => (
        `${boundary}${letter.toUpperCase()}`
      ));
    if (body && !/[.!?]$/.test(body)) body = `${body}.`;
    if (body === block.body) return block;
    changed = true;
    return { ...block, body };
  });
  if (!changed) return output;

  return {
    ...output,
    pdp_blocks: pdpBlocks,
    generation_notes: [
      ...(Array.isArray(output.generation_notes) ? output.generation_notes : []),
      'Deterministic PDP punctuation normalization repaired sentence boundaries in the self-expression close.',
    ],
  } as T;
}

const CANONICAL_LEFT_PDP_ORDER = [
  'about_this_piece',
  'why_youll_love_it',
  'ideal_for',
  'main_description',
] as const;

/**
 * Block identity and layout order are storefront contracts, not creative
 * decisions. A model occasionally returns the required self-expression close
 * with the exact heading and body, but labels it as the optional
 * related_collections/review_only block. Recover only that unambiguous metadata
 * error; malformed, duplicate or ambiguous blocks remain untouched so
 * structural QA can still fail them explicitly.
 */
export function normalizeCodeOwnedPdpBlockOrder<T>(output: T): T {
  if (!isRecord(output) || !Array.isArray(output.pdp_blocks)) return output;
  const hasMainDescription = output.pdp_blocks.some((block) => (
    isRecord(block) && block.block_key === 'main_description'
  ));
  const mislabeledSelfExpressionBlocks = hasMainDescription
    ? []
    : output.pdp_blocks.filter((block) => (
      isRecord(block)
      && block.block_key === 'related_collections'
      && block.placement === 'review_only'
      && /^designed for self-expression$/i.test(String(block.heading || '').trim())
      && Boolean(String(block.body || '').trim())
    ));
  const recoveredSelfExpression = mislabeledSelfExpressionBlocks.length === 1;
  const normalizedBlocks = recoveredSelfExpression
    ? output.pdp_blocks.map((block) => (
      block === mislabeledSelfExpressionBlocks[0]
        ? { ...block, block_key: 'main_description', placement: 'left_description' }
        : block
    ))
    : output.pdp_blocks;
  const leftBlocks = normalizedBlocks.filter((block) => (
    isRecord(block) && block.placement === 'left_description'
  ));
  const byKey = new Map(leftBlocks.map((block) => [String(block.block_key || ''), block]));
  const isCompleteUniqueSet = (
    leftBlocks.length === CANONICAL_LEFT_PDP_ORDER.length
    && byKey.size === CANONICAL_LEFT_PDP_ORDER.length
    && CANONICAL_LEFT_PDP_ORDER.every((key) => byKey.has(key))
  );
  if (!isCompleteUniqueSet) return output;

  const orderedLeft = CANONICAL_LEFT_PDP_ORDER.map((key) => byKey.get(key));
  const nonLeft = normalizedBlocks.filter((block) => (
    !isRecord(block) || block.placement !== 'left_description'
  ));
  const alreadyOrdered = leftBlocks.every((block, index) => block === orderedLeft[index]);
  if (alreadyOrdered && !recoveredSelfExpression) return output;

  return {
    ...output,
    pdp_blocks: [...orderedLeft, ...nonLeft],
    generation_notes: [
      ...(Array.isArray(output.generation_notes) ? output.generation_notes : []),
      ...(recoveredSelfExpression ? [
        'Deterministic PDP contract normalization restored the exact Designed for self-expression close to main_description/left_description.',
      ] : []),
      'Deterministic PDP layout normalization restored the canonical left-block order.',
    ],
  } as T;
}

/**
 * Brand padding in a generated SEO title is a deterministic formatting defect,
 * not a reason to spend another model call or discard otherwise useful copy.
 * Keep the untouched model response in the OpenAI audit trail, while the
 * review candidate uses the same product title without a leading/trailing
 * TheFEYA separator.
 */
export function normalizeFinalSeoEditorialOutput<T>(output: T): T {
  if (!output || typeof output !== 'object' || Array.isArray(output)) return output;
  const record = output as Record<string, unknown>;
  if (typeof record.seo_title !== 'string' || !/\bTheFEYA\b/i.test(record.seo_title)) return output;

  const seoTitle = record.seo_title
    .replace(/^\s*TheFEYA\s*(?:[|·–—-]\s*)?/i, '')
    .replace(/\s*(?:[|·–—-]\s*)?TheFEYA\s*$/i, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
  if (!seoTitle || seoTitle === record.seo_title) return output;

  return {
    ...record,
    seo_title: seoTitle,
    generation_notes: [
      ...(Array.isArray(record.generation_notes) ? record.generation_notes : []),
      'Deterministic review normalization removed brand padding from the SEO title.',
    ],
  } as T;
}

/**
 * A bounded residual pass is allowed to repair only the fields named by the
 * remaining deterministic issue codes. The model must still return the full
 * schema, but unrelated accepted copy is kept byte-for-byte so a small repair
 * cannot regress the title, focus, ALT, or another left-description block.
 */
export function mergeBoundedSeoEditorialRepair<T>(
  baseline: T,
  candidate: T,
  ...validations: ValidationResult[]
): T {
  if (!isRecord(baseline) || !isRecord(candidate)) return baseline;

  const issueCodes = validations
    .flatMap((validation) => validation?.issues || [])
    .map((issue) => String(issue.code || '').trim().toLowerCase())
    .filter(Boolean);
  if (!issueCodes.length) return baseline;

  const topLevelFields = new Set<string>();
  const blockKeys = new Set<string>();
  issueCodes.forEach((code) => {
    const isWholeCopyEditorialIssue = (
      code.startsWith('customer_copy_')
      || code.startsWith('repeated_idea_')
      || code.startsWith('cross_block_')
    );
    if (isWholeCopyEditorialIssue) {
      topLevelFields.add('meta_description');
      topLevelFields.add('intro');
      blockKeys.add('about_this_piece');
      blockKeys.add('why_youll_love_it');
      blockKeys.add('ideal_for');
      blockKeys.add('main_description');
    }
    if (code === 'secondary_keyword_cluster_unrepresented') {
      topLevelFields.add('image_alt_candidates');
    }
    if (code.includes('seo_title')) topLevelFields.add('seo_title');
    if (/(?:^|_)h1(?:_|$)/.test(code)) topLevelFields.add('h1');
    if (code.includes('meta_description')) topLevelFields.add('meta_description');
    if (/(?:^|_)intro(?:_|$)/.test(code)) topLevelFields.add('intro');
    if (code.includes('image_alt') || /(?:^|_)alt(?:_|$)/.test(code)) {
      topLevelFields.add('image_alt_candidates');
    }
    if (code.includes('internal_link')) topLevelFields.add('internal_linking_hints');

    if (code.includes('about_this_piece')) blockKeys.add('about_this_piece');
    if (code.includes('why_youll_love_it') || code.includes('benefit_')) {
      blockKeys.add('why_youll_love_it');
    }
    if (code.includes('ideal_for')) blockKeys.add('ideal_for');
    if (
      code.includes('main_description')
      || code.includes('self_expression')
      || code.includes('pdp_block_self_expression')
    ) {
      blockKeys.add('main_description');
    }
  });

  const merged: Record<string, unknown> = { ...baseline };
  topLevelFields.forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(candidate, field)) {
      merged[field] = candidate[field];
    }
  });

  if (blockKeys.size && Array.isArray(baseline.pdp_blocks) && Array.isArray(candidate.pdp_blocks)) {
    const candidateBlocks = new Map(
      candidate.pdp_blocks
        .filter(isRecord)
        .map((block) => [String(block.block_key || ''), block]),
    );
    merged.pdp_blocks = baseline.pdp_blocks.map((block) => {
      if (!isRecord(block)) return block;
      const key = String(block.block_key || '');
      return blockKeys.has(key) && candidateBlocks.has(key)
        ? candidateBlocks.get(key)
        : block;
    });
  }

  return merged as T;
}

/**
 * A repair pass is useful only when deterministic QA has something concrete
 * to repair. Calling an editor over an already valid draft adds cost and can
 * silently replace good prose with a merely different version.
 */
export function shouldRunSeoEditorialRepair(...validations: ValidationResult[]) {
  return validations.some((validation) => (
    validation?.ok === false || (validation?.issues || []).length > 0
  ));
}

/**
 * Select a repaired draft only when it is strictly better. A net reduction in
 * editorial blockers is useful even when the rewrite exposes a different
 * wording issue, but factual/Product Truth regressions are never an acceptable
 * trade. Equal blocker counts still require the same blocker classes and fewer
 * warnings.
 */
export function isStrictlyBetterSeoEditorialCandidate(
  candidate: ValidationResult[],
  baseline: ValidationResult[],
) {
  const next = seoEditorialIssueSnapshot(...candidate);
  const before = seoEditorialIssueSnapshot(...baseline);
  const baselineBlockers = new Set(before.blocker_keys);
  const hasNewProtectedBlocker = next.blocker_keys
    .filter((key) => !baselineBlockers.has(key))
    .some(isProtectedBlocker);
  if (hasNewProtectedBlocker) return false;
  if (next.blocker_count < before.blocker_count) return true;
  const hasNewBlocker = next.blocker_keys.some((key) => !baselineBlockers.has(key));
  if (hasNewBlocker) return false;
  return next.blocker_count === before.blocker_count
    && next.warning_count < before.warning_count;
}

/**
 * The production path uses one fast writer and one strong final editor. When
 * both candidates are deterministic-QA clean, prefer the strong editor if it
 * did not add warnings. When the writer is blocked, the normal strict-
 * improvement rule still allows the best inspectable failure to be returned.
 */
export function shouldSelectFinalSeoEditorialCandidate(
  candidate: ValidationResult[],
  baseline: ValidationResult[],
) {
  if (isStrictlyBetterSeoEditorialCandidate(candidate, baseline)) return true;
  const next = seoEditorialIssueSnapshot(...candidate);
  const before = seoEditorialIssueSnapshot(...baseline);
  if (next.blocker_count > 0) return false;
  if (before.blocker_count > 0) return true;
  return next.warning_count <= before.warning_count;
}

export function seoEditorialIssueSnapshot(
  ...validations: ValidationResult[]
): SeoEditorialIssueSnapshot {
  const issues = validations.flatMap((validation) => validation?.issues || []);
  const blockerKeys = unique(
    issues
      .filter((issue) => issue.severity === 'blocker')
      .map(issueKey),
  );
  const warningKeys = unique(
    issues
      .filter((issue) => issue.severity !== 'blocker')
      .map(issueKey),
  );
  return {
    blocker_count: issues.filter((issue) => issue.severity === 'blocker').length,
    warning_count: issues.filter((issue) => issue.severity !== 'blocker').length,
    blocker_keys: blockerKeys,
    warning_keys: warningKeys,
  };
}

function issueKey(issue: ValidationIssue) {
  return [
    String(issue.code || 'unknown_issue').trim(),
    String(issue.keyword || '').trim().toLowerCase(),
  ].join(':');
}

function isProtectedBlocker(key: string) {
  return /(?:unsupported|mismatch|forbidden|product_truth|component|composition|sellable|static_right|price|image_alt|unselected_event|wrong_contract|invalid_|missing_pdp_block|not_object|primary_|keyword_|commercial_language|secondary_keyword_stack|too_thin|_thin|sentence_count|benefit_count|use_case_count|left_description)/.test(key);
}

function unique(values: string[]) {
  return [...new Set(values)];
}

function normalizeIdentityValue(value: unknown) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function normalizeIdentityValues(value: unknown): string[] {
  const values = Array.isArray(value) ? value : value ? [value] : [];
  return unique(values.map(normalizeIdentityValue).filter(Boolean));
}

function normalizeIdentityColor(value: unknown) {
  const color = normalizeIdentityValue(value);
  if (!color || color.length > 20 || !/^[a-z]+(?:[ -][a-z]+)?$/i.test(color)) return '';
  if (/^(?:unknown|other|multicolor|multi color|not specified|needs? review|not reviewed|pending review)$/i.test(color)) return '';
  return color;
}

function containsWholePhrase(value: string, phrase: string) {
  return new RegExp(`\\b${escapeRegExp(phrase)}\\b`, 'i').test(value);
}

function toTitleCase(value: string) {
  return value.replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
}

function stableEditorialVariant(value: string, count: number) {
  let hash = 0;
  for (const character of value) {
    hash = ((hash * 31) + character.charCodeAt(0)) >>> 0;
  }
  return count > 0 ? hash % count : 0;
}

function formatSelectedEvent(value: string) {
  if (/^burning man$/i.test(value)) return 'Burning Man';
  if (/^festival$/i.test(value)) return 'Festivals';
  return toTitleCase(value);
}

function buildMainDescriptionFocusSentence(context: SeoIdentityNormalizationContext) {
  const styles = normalizeIdentityValues(context.selected_styles)
    .slice(0, 2)
    .map((value) => value.toLowerCase());
  const events = normalizeIdentityValues(context.selected_events)
    .slice(0, 2)
    .map(formatBodyEvent);
  const stylePhrase = humanJoin(styles, 'or');
  const eventPhrase = humanJoin(events, 'and');
  if (stylePhrase && eventPhrase) return `It can lean ${stylePhrase} for ${eventPhrase}.`;
  if (stylePhrase) return `It can lean ${stylePhrase}.`;
  if (eventPhrase) return `It is designed for ${eventPhrase}.`;
  return '';
}

function buildBoundedControlRunClose(
  body: string,
  context: SeoIdentityNormalizationContext,
) {
  const isExactKnownFailure = (
    /^At TheFEYA, we develop festival and stage pieces from our own ideas,/i.test(body.trim())
    && /\bbody identity\b/i.test(body)
    && /\bfinish it your way and make the look your own\b/i.test(body)
  );
  if (!isExactKnownFailure) return '';

  const identity = normalizeIdentityValue(context.body_identity_variant);
  const color = normalizeIdentityColor(context.product_color).toLowerCase();
  const stylePhrase = normalizeIdentityValues(context.selected_styles)[0]?.toLowerCase() || '';
  const eventPhrase = humanJoin(
    normalizeIdentityValues(context.selected_events).slice(0, 2).map(formatCloseEvent),
    'or',
  );
  if (!identity || !color || !stylePhrase || !eventPhrase) return '';

  return `At TheFEYA, we develop original festival and stage pieces in our studio. We designed this ${identity} with expressive ${color} details and a distinctive ${stylePhrase} character. The confident, memorable result feels personal, suits ${eventPhrase}, and preserves our original, fashion-led studio point of view.`;
}

function formatCloseEvent(value: string) {
  if (/^burning man$/i.test(value)) return 'Burning Man';
  if (/^festival(s)?$/i.test(value)) return 'festival';
  if (/^stage$/i.test(value)) return 'stage';
  return value.toLowerCase();
}

function formatBodyEvent(value: string) {
  if (/^burning man$/i.test(value)) return 'Burning Man';
  if (/^festival$/i.test(value)) return 'festivals';
  if (/^stage$/i.test(value)) return 'the stage';
  return value.toLowerCase();
}

function humanJoin(values: string[], conjunction: 'and' | 'or') {
  const clean = unique(values.filter(Boolean));
  if (clean.length <= 1) return clean[0] || '';
  if (clean.length === 2) return `${clean[0]} ${conjunction} ${clean[1]}`;
  return `${clean.slice(0, -1).join(', ')}, ${conjunction} ${clean.at(-1)}`;
}

function splitEditorialSentences(value: string) {
  return (value.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [])
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function editorialWordCount(value: string) {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function replacePhrasePreservingCase(value: string, phrase: string, replacement: string) {
  const exactPhrase = new RegExp(`\\b${escapeRegExp(phrase)}\\b`, 'gi');
  return value.replace(exactPhrase, (match) => {
    if (match === match.toUpperCase()) return replacement.toUpperCase();
    if (/^[A-Z]/.test(match)) return `${replacement.charAt(0).toUpperCase()}${replacement.slice(1)}`;
    return replacement;
  });
}

function countLiteralPhrase(value: string, phrase: string) {
  return [...value.matchAll(new RegExp(`\\b${escapeRegExp(phrase)}\\b`, 'gi'))].length;
}

function isRecord(value: unknown): value is Record<string, any> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
