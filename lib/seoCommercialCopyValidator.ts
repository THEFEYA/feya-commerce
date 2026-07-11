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
};

const WEAK_STYLING_FILLER = /\b(works? well as a focal piece|works? as a centerpiece|part of a complete look|over minimal clothing|pairs? with simple clothing|easy to build into (?:a|the) (?:look|outfit)|easy to style|can be a focal piece|works? with many looks|completes? the look|creates? a clear accent|without additional (?:design )?elements|adds? an accent without)\b/i;
const AUDIT_OR_ADMIN_LANGUAGE = /\b(product truth|product truth confirms?|product truth indicates?|the product description (?:says|states|lists|mentions|indicates)|the source (?:says|states|lists|mentions|indicates)|official product data|source data|database fields?|safe wording|safest wording|material basis|final copy should|must be confirmed|should be confirmed|requires? verification|needs? verification|should be reviewed before publish|requires? review before publish|review before publish|before publication|before publish|listed as|is listed as|indicated as|specified as)\b/i;
const GUARANTEED_POPULARITY = /\b(guarantee(?:d|s)?|will get likes?|will receive likes?|will gain followers?|will make you popular|go viral|viral reach|more followers?|gain followers?|more likes?|become popular|increase your popularity|guaranteed attention|everyone will notice|all eyes will be on you|guaranteed reactions?)\b/i;
const EMPTY_HYPE = /\b(premium|luxury|ultimate|perfect|best|must[- ]have|crafted to perfection|elevate your look)\b/i;
const BRAND_PATTERN = /\bTheFEYA\b/gi;
const DESIGN_BENEFIT_PATTERN = /\b(studio[- ]created|studio[- ]designed|designed in our studio|original in[- ]house concept|signature studio design|handmade|made[- ]to[- ]order|not mass[- ]produced|mass production|one[- ]of[- ]a[- ]kind|designer studio)\b/i;
const SELF_EXPRESSION_PATTERN = /\b(self[- ]expression|individuality|visual identity|personal style|your own look|made for your vision|designed for your vision|studio visual language|adapt(?:ed|able)|customi[sz](?:e|ed|ation))\b/i;

const BENEFIT_CATEGORIES: Array<{ key: string; pattern: RegExp }> = [
  {
    key: 'studio_design_and_craft',
    pattern: DESIGN_BENEFIT_PATTERN,
  },
  {
    key: 'stage_camera_presence',
    pattern: /\b(stage presence|camera|photograph(?:s|ed|y|ic)?|photo|editorial|visual identity|stand out|stands out|attention|memorable|spotlight|readable from a distance|crowded festival|performance presence|content creation)\b/i,
  },
  {
    key: 'adjustable_custom_fit',
    pattern: /\b(adjustable|adjusts|fine[- ]tuned|custom fit|custom sizing|custom measurements?|body shape|body shapes|straps?)\b/i,
  },
  {
    key: 'comfort',
    pattern: /\b(soft against the body|soft body[- ]facing|comfortable|comfort|body[- ]facing|gentle on the body|easy to wear)\b/i,
  },
  {
    key: 'durability_structure',
    pattern: /\b(durable|durability|reinforced|doubled|strong construction|shape retention|holds? its shape|keeps? its shape|long[- ]lasting|structured without feeling rigid)\b/i,
  },
  {
    key: 'reflective_visual_finish',
    pattern: /\b(reflective|mirror[- ]like finish|mirror finish|metallic finish|glossy finish|catches? the light|light and camera|camera light|sculptural silhouette|gold finish|metal[- ]like appearance)\b/i,
  },
];

export function validateSeoCommercialCopy(draft: unknown): SeoCommercialCopyValidation {
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
  ].filter((value): value is string => typeof value === 'string' && Boolean(value.trim())).join('\n');

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
  const benefitCategories = BENEFIT_CATEGORIES
    .filter((category) => category.pattern.test(whyBody))
    .map((category) => category.key);

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
    if (benefitLines.length < 3 || benefitLines.length > 5) {
      issues.push(blocker(
        'why_youll_love_it_wrong_benefit_count',
        'Why you’ll love it must present 3-5 concise, non-duplicative purchase reasons.',
      ));
    }
    if (benefitCategories.length < 3) {
      issues.push(blocker(
        'why_youll_love_it_lacks_benefit_diversity',
        'Why you’ll love it must cover at least three genuinely different supported benefit categories.',
      ));
    }

    const designBenefitLines = benefitLines.filter((line) => DESIGN_BENEFIT_PATTERN.test(line));
    if (designBenefitLines.length > 1) {
      issues.push(blocker(
        'why_youll_love_it_repeats_design_authorship',
        'Studio-created design, handmade production and not-mass-produced wording are one value idea. Use it only once and spend the other bullets on fit, comfort, durability, finish, or stage/camera value.',
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
    if (wordCount(closingBody) < 35) {
      issues.push(warning(
        'self_expression_close_too_thin',
        'The final conversion paragraph is too short to explain why the studio-created design matters to the buyer.',
      ));
    }
  }

  const hasBlocker = issues.some((issue) => issue.severity === 'blocker');
  return {
    ok: !hasBlocker,
    status: hasBlocker ? 'blocked' : issues.length ? 'warning' : 'valid',
    issues,
    benefit_categories_found: benefitCategories,
  };
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
