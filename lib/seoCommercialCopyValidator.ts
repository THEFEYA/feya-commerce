export type SeoCommercialCopyIssue = {
  code: string;
  severity: 'warning' | 'blocker';
  message: string;
};

export type SeoCommercialCopyValidation = {
  ok: boolean;
  status: 'valid' | 'warning' | 'blocked';
  issues: SeoCommercialCopyIssue[];
  benefit_categories_found: string[];
  repetition_report?: {
    repeated_idea_groups: Array<{ idea: string; blocks: string[] }>;
    near_duplicate_sentence_pairs: Array<{ left: string; right: string; similarity: number }>;
  };
};

export type SeoCommercialCopyContext = {
  product_truth?: unknown;
};

const WEAK_STYLING_FILLER = /\b(works? well as a focal piece|works? as a centerpiece|part of a complete look|over minimal clothing|pairs? with simple clothing|easy to build into (?:a|the) (?:look|outfit)|easy to style|can be a focal piece|works? with many looks|completes? the look|creates? a clear accent|without additional (?:design )?elements|adds? an accent without)\b/i;
const AUDIT_OR_ADMIN_LANGUAGE = /\b(product truth|product truth confirms?|product truth indicates?|the product description (?:says|states|lists|mentions|indicates)|the source (?:says|states|lists|mentions|indicates)|official product data|source data|database fields?|safe wording|safest wording|material basis|final copy should|must be confirmed|should be confirmed|requires? verification|needs? verification|should be reviewed before publish|requires? review before publish|review before publish|before publication|before publish|listed as|is listed as|indicated as|specified as)\b/i;
const GUARANTEED_POPULARITY = /\b(guarantee(?:d|s)?|will get likes?|will receive likes?|will gain followers?|will make you popular|go viral|viral reach|more followers?|gain followers?|more likes?|become popular|increase your popularity|guaranteed attention|everyone will notice|all eyes will be on you|guaranteed reactions?)\b/i;
const EMPTY_HYPE = /\b(premium|luxury|ultimate|perfect|best|must[- ]have|crafted to perfection|elevate your look)\b/i;
const EMPTY_OR_INTERNAL_BUYER_COPY = /\b(studio[- ]created from an original in[- ]house concept|studio[- ]created design based on an original in[- ]house concept|based on an original concept (?:created|developed) in[- ]house|buyers? looking for (?:a|an|this|the)|body[- ]friendly feel|studio styling|TheFEYA gives us a way|clean armored attitude|desert[- ]ready mood)\b/i;
const SOCIAL_METRICS_BOILERPLATE = /\b(organic attention|reactions?, saves? (?:and|or) comments?|likes?, followers?|social (?:engagement|metrics?)|viral(?:ity| reach)?)\b/i;
const REDUNDANT_FAUX_LEATHER = /\b(?:vegan leather\s+(?:and|or|\/)\s+faux leather|faux leather\s+(?:and|or|\/)\s+vegan leather)\b/i;
const REFLECTIVE_CLAIM = /\b(?:reflective|retroreflective|retro-reflective)\b/i;
const ABSTRACT_VISUAL_BENEFIT = /\b(contrast and visual depth|adds? contrast|creates? visual depth|harder,? more dramatic line|firm armored presence|armored presence|individual feel|shape a look that feels deliberate|one bold detail to define|dramatic line)\b/i;
const USE_CASE_AS_BENEFIT = /\b(?:works?|ideal|made|suited) for\b.*\b(styling|looks?|warrior|futuristic|desert|festival|stage|performance|photoshoot|editorial|cosplay|party)\b/i;
const UNGROUNDED_STORE_PROMISE = /\b(best prices?|lowest prices?|competitive prices?|special prices?|bulk discounts?|volume discounts?|tax[- ]free|tax refund|excellent service|best service|wide assortment|large assortment|largest selection|fastest delivery)\b/i;
const BRAND_PATTERN = /\bTheFEYA\b/gi;
const DESIGN_BENEFIT_PATTERN = /\b(studio[- ]created|studio[- ]designed|studio[- ]made|designed in our studio|original studio design|distinctive studio design|signature studio design|handmade|made[- ]to[- ]order|not mass[- ]produced|mass[- ]produced costume|mass production|designer studio)\b/i;
const SELF_EXPRESSION_PATTERN = /\b(self[- ]expression|individuality|visual identity|personal style|your own look|made for your vision|designed for your vision|studio visual language|adapt(?:ed|able)|customi[sz](?:e|ed|ation))\b/i;

const BENEFIT_CATEGORIES: Array<{ key: string; pattern: RegExp }> = [
  {
    key: 'studio_design_and_craft',
    pattern: DESIGN_BENEFIT_PATTERN,
  },
  {
    key: 'easy_dressing_and_adjustment',
    pattern: /\b(quick|easy|easier) to (?:put on|take off|adjust|fine[- ]tune|wear)|\b(fine[- ]tune|adjustable|adjusts|straps?|over (?:a |different )?base layers?)\b/i,
  },
  {
    key: 'fit_flexibility',
    pattern: /\b(custom fit|custom sizing|custom measurements?|body shape|body shapes|secure fit|closer fit|fit over|fit around|room to adjust)\b/i,
  },
  {
    key: 'comfort',
    pattern: /\b(soft against the body|soft body[- ]facing|comfortable|comfort|body[- ]facing|gentle on the body|easy to wear)\b/i,
  },
  {
    key: 'durability_structure',
    pattern: /\b(durable|durability|reinforced|doubled|strong construction|structured (?:material|construction|build)|shape retention|holds? its (?:shape|form)|keeps? its (?:shape|form)|long[- ]lasting|between wears|resists? creasing|structured without feeling rigid)\b/i,
  },
  {
    key: 'verified_finish_behavior',
    pattern: /\b(reflective|mirror[- ]like finish|mirror finish|metallic finish|glossy finish|catches? (?:available |ambient |stage )?light|light[- ]catching|metal[- ]like appearance)\b/i,
  },
];
const PRACTICAL_BENEFIT_CATEGORIES = new Set([
  'easy_dressing_and_adjustment',
  'fit_flexibility',
  'comfort',
  'durability_structure',
  'verified_finish_behavior',
]);

const CROSS_BLOCK_IDEAS: Array<{ key: string; pattern: RegExp }> = [
  {
    key: 'studio_authorship',
    pattern: /\b(studio[- ]created|original in[- ]house|signature studio|young independent team|designers and makers|handmade|made[- ]to[- ]order|mass[- ]market|mass[- ]produced)\b/i,
  },
  {
    key: 'reflective_finish',
    pattern: /\b(reflective|mirror[- ]like|glossy|metallic|catches? light|reads? clearly in photos?|camera[- ]friendly)\b/i,
  },
  {
    key: 'silhouette_shape',
    pattern: /\b(sculptural|silhouette|structured shape|defined shape|warrior profile|futuristic profile|upper[- ]body frame)\b/i,
  },
  {
    key: 'stage_camera_visibility',
    pattern: /\b(stage|camera|photoshoot|editorial|performance|visible from a distance|strong visual presence|memorable visual identity)\b/i,
  },
  {
    key: 'fit_and_adjustability',
    pattern: /\b(adjustable|strap|fit|secure|comfortable|body shape|custom measurements?)\b/i,
  },
  {
    key: 'durability_and_structure',
    pattern: /\b(durable|reinforced|shape retention|keeps? its shape|strong construction|supportive feel)\b/i,
  },
  {
    key: 'self_expression',
    pattern: /\b(self[- ]expression|individuality|visual identity|personal style|your own look|distinctive studio style)\b/i,
  },
];

const STOPWORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'because', 'been', 'being', 'but', 'by', 'can', 'created', 'designed',
  'for', 'from', 'has', 'have', 'helps', 'in', 'into', 'is', 'it', 'its', 'made', 'more', 'of', 'on', 'or', 'our',
  'piece', 'product', 'that', 'the', 'their', 'this', 'to', 'we', 'while', 'with', 'you', 'your', 'look', 'looks',
]);

export function validateSeoCommercialCopy(
  draft: unknown,
  context: SeoCommercialCopyContext = {},
): SeoCommercialCopyValidation {
  const issues: SeoCommercialCopyIssue[] = [];
  const record = isRecord(draft) ? draft : {};
  const blocks = Array.isArray(record.pdp_blocks) ? record.pdp_blocks.filter(isRecord) : [];
  const leftBlocks = blocks.filter((block) => block.placement === 'left_description');
  const customerText = [
    record.seo_title,
    record.h1,
    record.meta_description,
    record.intro,
    ...leftBlocks.map((block) => block.heading),
    ...leftBlocks.map((block) => block.body),
    ...(Array.isArray(record.bullet_highlights) ? record.bullet_highlights : []),
  ].filter((value): value is string => typeof value === 'string' && Boolean(value.trim())).join('\n');
  const altText = (Array.isArray(record.image_alt_candidates) ? record.image_alt_candidates : [])
    .filter(isRecord)
    .map((candidate) => typeof candidate.alt_text === 'string' ? candidate.alt_text : '')
    .filter(Boolean)
    .join('\n');

  if (AUDIT_OR_ADMIN_LANGUAGE.test(customerText)) {
    issues.push(blocker(
      'customer_copy_contains_internal_audit_language',
      'Customer-facing copy contains source, Product Truth, verification, database, review, or pre-publication language.',
    ));
  }

  if (GUARANTEED_POPULARITY.test(customerText)) {
    issues.push(blocker(
      'customer_copy_guarantees_popularity_or_reactions',
      'Customer-facing copy must not guarantee likes, followers, popularity, viral reach, press, sales, or audience reactions.',
    ));
  }

  if (EMPTY_OR_INTERNAL_BUYER_COPY.test(customerText)) {
    issues.push(blocker(
      'customer_copy_contains_robotic_or_tautological_value',
      'Customer-facing copy contains an internal-process phrase, tautology, or vague pseudo-benefit that does not help a buyer decide.',
    ));
  }

  if (SOCIAL_METRICS_BOILERPLATE.test(customerText)) {
    issues.push(blocker(
      'customer_copy_contains_social_metrics_boilerplate',
      'Product copy must not discuss organic attention, reactions, saves, comments, followers, virality, or other social-performance metrics.',
    ));
  }

  if (REDUNDANT_FAUX_LEATHER.test(customerText)) {
    issues.push(blocker(
      'customer_copy_stacks_vegan_and_faux_leather_synonyms',
      'Vegan leather and faux leather are customer-facing synonyms here and must not be presented as two separate materials.',
    ));
  }

  if (UNGROUNDED_STORE_PROMISE.test(customerText)) {
    issues.push(blocker(
      'customer_copy_contains_ungrounded_store_promise',
      'Price, tax, discount, service, assortment, or delivery-superiority claims require a separate approved store policy and must not be invented in product copy.',
    ));
  }

  const productTruthText = flattenText(context.product_truth).join(' ');
  if (
    context.product_truth != null
    && REFLECTIVE_CLAIM.test(`${customerText}\n${altText}`)
    && !REFLECTIVE_CLAIM.test(productTruthText)
  ) {
    issues.push(blocker(
      'unsupported_reflective_finish_claim',
      'Reflective or retroreflective behavior is not confirmed by Product Truth. Glossy, mirror-like, metallic, and light-catching are different claims.',
    ));
  }

  ['seo_title', 'h1', 'meta_description'].forEach((field) => {
    const value = typeof record[field] === 'string' ? record[field] : '';
    if (/\bTheFEYA\b/i.test(value)) {
      issues.push(blocker(
        `${field}_uses_brand_padding`,
        `${field} must describe the product and must not use TheFEYA as repeated brand padding.`,
      ));
    }
  });

  const brandMentions = countMatches(customerText, BRAND_PATTERN);
  if (brandMentions > 1) {
    issues.push(blocker(
      'brand_name_overused_in_customer_copy',
      `TheFEYA appears ${brandMentions} times in visible generated copy. Maximum allowed is one.`,
    ));
  }

  const whyBlock = blocks.find((block) => String(block.block_key || '') === 'why_youll_love_it');
  const whyBody = typeof whyBlock?.body === 'string' ? whyBlock.body.trim() : '';
  const benefitLines = splitBenefitLines(whyBody);
  const benefitCategoryMap = benefitLines.map((line) => ({
    line,
    categories: BENEFIT_CATEGORIES.filter((category) => category.pattern.test(line)).map((category) => category.key),
  }));
  const benefitCategories = [...new Set(benefitCategoryMap.flatMap((item) => item.categories))];

  if (!whyBody) {
    issues.push(blocker('missing_commercial_benefit_block', 'Why you’ll love it is required for commercial review.'));
  } else {
    if (WEAK_STYLING_FILLER.test(whyBody)) {
      issues.push(blocker(
        'why_youll_love_it_uses_weak_styling_filler',
        'Why you’ll love it uses empty styling filler instead of a concrete purchase benefit.',
      ));
    }
    if (EMPTY_HYPE.test(whyBody)) {
      issues.push(warning(
        'why_youll_love_it_uses_empty_hype',
        'Why you’ll love it contains an unsupported generic quality claim.',
      ));
    }
    if (benefitLines.length < 3 || benefitLines.length > 4) {
      issues.push(blocker(
        'why_youll_love_it_wrong_benefit_count',
        'Why you’ll love it must present 3-4 concise, non-duplicative purchase reasons. Do not create a filler fifth bullet.',
      ));
    }
    if (benefitCategories.length < 3) {
      issues.push(blocker(
        'why_youll_love_it_lacks_benefit_diversity',
        'Why you’ll love it must cover at least three genuinely different value families, including studio design and practical buyer value.',
      ));
    }
    if (!benefitCategories.some((category) => PRACTICAL_BENEFIT_CATEGORIES.has(category))) {
      issues.push(blocker(
        'why_youll_love_it_missing_practical_buyer_value',
        'Why you’ll love it must include at least one supported practical value such as easier dressing, adjustment, comfort, fit, shape retention, durability, or verified finish behavior.',
      ));
    }

    benefitCategoryMap.forEach((item, index) => {
      if (!item.categories.length) {
        issues.push(blocker(
          `why_youll_love_it_benefit_${index + 1}_has_no_concrete_buyer_value`,
          `Benefit ${index + 1} does not connect a supported feature or studio truth to a recognized buyer outcome.`,
        ));
      }
      if (ABSTRACT_VISUAL_BENEFIT.test(item.line)) {
        issues.push(blocker(
          `why_youll_love_it_benefit_${index + 1}_is_abstract_visual_commentary`,
          `Benefit ${index + 1} is abstract visual commentary, not a useful reason to choose the product.`,
        ));
      }
      if (USE_CASE_AS_BENEFIT.test(item.line)) {
        issues.push(blocker(
          `why_youll_love_it_benefit_${index + 1}_belongs_in_ideal_for`,
          `Benefit ${index + 1} is a style or use-case list and belongs in Ideal for.`,
        ));
      }
    });

    const designBenefitLines = benefitLines.filter((line) => DESIGN_BENEFIT_PATTERN.test(line));
    if (designBenefitLines.length === 0) {
      issues.push(blocker(
        'why_youll_love_it_missing_studio_design_value',
        'Why you’ll love it must contain one concrete studio-design differentiation benefit tied to buyer value.',
      ));
    } else if (designBenefitLines.length > 1) {
      issues.push(blocker(
        'why_youll_love_it_repeats_design_authorship',
        'Studio design, handmade production and not-mass-produced wording are one value idea. Use it only once and spend the other bullets on supported wearability, fit, comfort, durability, shape retention, or finish behavior.',
      ));
    }

    const duplicateBenefitPairs = findNearDuplicatePairs(
      benefitLines.map((text, index) => ({ label: `why_youll_love_it.${index + 1}`, text })),
      0.76,
    );
    if (duplicateBenefitPairs.length) {
      issues.push(blocker(
        'why_youll_love_it_contains_near_duplicate_benefits',
        'Why you’ll love it repeats nearly the same benefit in more than one bullet.',
      ));
    }
  }

  const closingBlock = blocks.find((block) => String(block.block_key || '') === 'main_description');
  const closingBody = typeof closingBlock?.body === 'string' ? closingBlock.body.trim() : '';
  if (!closingBody) {
    issues.push(blocker(
      'missing_self_expression_close',
      'The generated left description must end with a concise Designed for self-expression conversion paragraph.',
    ));
  } else {
    if (!SELF_EXPRESSION_PATTERN.test(closingBody)) {
      issues.push(warning(
        'self_expression_close_lacks_clear_buyer_value',
        'The final paragraph should connect the product to self-expression, visual identity, studio authorship, or supported customization.',
      ));
    }
    if (wordCount(closingBody) < 20) {
      issues.push(warning(
        'self_expression_close_too_thin',
        'The final conversion paragraph is too short to explain why the studio-created design matters to the buyer.',
      ));
    }
  }

  const repetitionReport = buildRepetitionReport(record, leftBlocks);
  repetitionReport.repeated_idea_groups.forEach((item) => {
    if (item.blocks.length >= 3) {
      issues.push(blocker(
        `repeated_idea_${item.idea}`,
        `The idea “${item.idea.replaceAll('_', ' ')}” appears across ${item.blocks.join(', ')}. Keep the strongest version once and use the other blocks for different buyer value.`,
      ));
    }
  });

  if (repetitionReport.near_duplicate_sentence_pairs.some((pair) => pair.similarity >= 0.82)) {
    issues.push(blocker(
      'cross_block_near_duplicate_copy',
      'Two customer-facing sentences in different sections express almost the same thought. Rewrite one section to add a different buyer benefit.',
    ));
  } else if (repetitionReport.near_duplicate_sentence_pairs.length) {
    issues.push(warning(
      'cross_block_repetition_warning',
      'Some sentences across the intro and left-description blocks are too similar and should be differentiated.',
    ));
  }

  const hasBlocker = issues.some((issue) => issue.severity === 'blocker');
  return {
    ok: !hasBlocker,
    status: hasBlocker ? 'blocked' : issues.length ? 'warning' : 'valid',
    issues,
    benefit_categories_found: benefitCategories,
    repetition_report: repetitionReport,
  };
}

function buildRepetitionReport(record: Record<string, any>, leftBlocks: Record<string, any>[]) {
  const blockTexts = [
    typeof record.intro === 'string' && record.intro.trim() ? { key: 'intro', text: record.intro.trim() } : null,
    ...leftBlocks.map((block) => ({
      key: String(block.block_key || 'left_block'),
      text: typeof block.body === 'string' ? block.body.trim() : '',
    })),
  ].filter((item): item is { key: string; text: string } => Boolean(item?.text));

  const repeatedIdeaGroups = CROSS_BLOCK_IDEAS.map((idea) => ({
    idea: idea.key,
    blocks: blockTexts.filter((block) => idea.pattern.test(block.text)).map((block) => block.key),
  })).filter((item) => item.blocks.length >= 2);

  const sentences = blockTexts.flatMap((block) => splitSentences(block.text).map((text, index) => ({
    label: `${block.key}.${index + 1}`,
    text,
    block: block.key,
  })));

  const nearDuplicateSentencePairs: Array<{ left: string; right: string; similarity: number }> = [];
  for (let i = 0; i < sentences.length; i += 1) {
    for (let j = i + 1; j < sentences.length; j += 1) {
      if (sentences[i].block === sentences[j].block) continue;
      const similarity = tokenJaccard(sentences[i].text, sentences[j].text);
      if (similarity >= 0.62) {
        nearDuplicateSentencePairs.push({
          left: sentences[i].label,
          right: sentences[j].label,
          similarity: Number(similarity.toFixed(3)),
        });
      }
    }
  }

  return {
    repeated_idea_groups: repeatedIdeaGroups,
    near_duplicate_sentence_pairs: nearDuplicateSentencePairs.sort((a, b) => b.similarity - a.similarity).slice(0, 12),
  };
}

function findNearDuplicatePairs(items: Array<{ label: string; text: string }>, threshold: number) {
  const pairs: Array<{ left: string; right: string; similarity: number }> = [];
  for (let i = 0; i < items.length; i += 1) {
    for (let j = i + 1; j < items.length; j += 1) {
      const similarity = tokenJaccard(items[i].text, items[j].text);
      if (similarity >= threshold) pairs.push({ left: items[i].label, right: items[j].label, similarity });
    }
  }
  return pairs;
}

function tokenJaccard(left: string, right: string) {
  const a = meaningfulTokens(left);
  const b = meaningfulTokens(right);
  if (a.size < 4 || b.size < 4) return 0;
  const intersection = [...a].filter((token) => b.has(token)).length;
  const union = new Set([...a, ...b]).size;
  return union ? intersection / union : 0;
}

function meaningfulTokens(value: string) {
  return new Set(
    String(value || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, ' ')
      .split(/\s+/)
      .map((token) => token.replace(/^-+|-+$/g, ''))
      .filter((token) => token.length >= 4 && !STOPWORDS.has(token)),
  );
}

function splitSentences(value: string) {
  return String(value || '')
    .split(/(?<=[.!?])\s+|\n+/)
    .map((item) => item.replace(/^[-*•]\s*/, '').trim())
    .filter((item) => wordCount(item) >= 5);
}

function splitBenefitLines(value: string) {
  return String(value || '')
    .split(/\n|•/)
    .map((item) => item.replace(/^[-*]\s*/, '').trim())
    .filter(Boolean);
}

function wordCount(value: string) {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

function countMatches(value: string, pattern: RegExp) {
  const flags = pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`;
  return [...value.matchAll(new RegExp(pattern.source, flags))].length;
}

function blocker(code: string, message: string): SeoCommercialCopyIssue {
  return { code, severity: 'blocker', message };
}

function warning(code: string, message: string): SeoCommercialCopyIssue {
  return { code, severity: 'warning', message };
}

function isRecord(value: unknown): value is Record<string, any> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function flattenText(value: unknown): string[] {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return [String(value)];
  }
  if (Array.isArray(value)) return value.flatMap(flattenText);
  if (isRecord(value)) return Object.values(value).flatMap(flattenText);
  return [];
}
