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

const WEAK_STYLING_FILLER = /\b(works? well as a focal piece|over minimal clothing|pairs? with simple clothing|easy to build into (?:a|the) (?:look|outfit)|easy to style|can be a focal piece|works? with many looks|completes? the look)\b/i;
const AUDIT_OR_ADMIN_LANGUAGE = /\b(product truth confirms?|product truth indicates?|should be reviewed before publish|requires? review before publish|review before publish|source data confirms?|the database|listed as|is listed as|indicated as|specified as)\b/i;
const GUARANTEED_POPULARITY = /\b(guarantee(?:d|s)?|will get|will receive|will gain|will make you|go viral|viral reach|more followers?|gain followers?|get likes?|more likes?|become popular|increase your popularity|guaranteed attention|everyone will|all eyes will)\b/i;
const EMPTY_HYPE = /\b(premium|luxury|ultimate|perfect|best|must[- ]have|crafted to perfection|elevate your look)\b/i;

const BENEFIT_CATEGORIES: Array<{ key: string; pattern: RegExp }> = [
  {
    key: 'authorial_design',
    pattern: /\b(original|authorial|designer|studio[- ](?:made|created|designed)|signature|exclusive design|TheFEYA design|handmade|made[- ]to[- ]order|one[- ]of[- ]a[- ]kind)\b/i,
  },
  {
    key: 'stage_camera_presence',
    pattern: /\b(stage presence|camera|photograph(?:s|ed|y|ic)?|photo|editorial|visual identity|stand out|stands out|attention|memorable|spotlight|from a distance|crowded festival|crowd|performance presence|content)\b/i,
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
    pattern: /\b(reflective|mirror finish|metallic finish|catches? the light|light and camera|camera light|sculptural silhouette|gold finish)\b/i,
  },
];

export function validateSeoCommercialCopy(draft: unknown): SeoCommercialCopyValidation {
  const issues: SeoCommercialCopyIssue[] = [];
  const record = isRecord(draft) ? draft : {};
  const blocks = Array.isArray(record.pdp_blocks) ? record.pdp_blocks.filter(isRecord) : [];
  const customerText = [
    record.seo_title,
    record.h1,
    record.meta_description,
    record.intro,
    ...blocks.filter((block) => block.placement === 'left_description').map((block) => block.body),
  ].filter((value): value is string => typeof value === 'string' && Boolean(value.trim())).join('\n');

  if (AUDIT_OR_ADMIN_LANGUAGE.test(customerText)) {
    issues.push(blocker(
      'customer_copy_contains_internal_audit_language',
      'Customer-facing copy contains Product Truth, database, review, or publish language that belongs only in the admin audit trail.',
    ));
  }

  if (GUARANTEED_POPULARITY.test(customerText)) {
    issues.push(blocker(
      'customer_copy_guarantees_popularity_or_reactions',
      'Customer-facing copy must not guarantee likes, followers, popularity, viral reach, sales, press, or audience reactions.',
    ));
  }

  const whyBlock = blocks.find((block) => String(block.block_key || '') === 'why_youll_love_it');
  const whyBody = typeof whyBlock?.body === 'string' ? whyBlock.body.trim() : '';
  const benefitCategories = BENEFIT_CATEGORIES
    .filter((category) => category.pattern.test(whyBody))
    .map((category) => category.key);

  if (!whyBody) {
    issues.push(blocker('missing_commercial_benefit_block', 'Why you’ll love it is required for commercial review.'));
  } else {
    if (WEAK_STYLING_FILLER.test(whyBody)) {
      issues.push(blocker(
        'why_youll_love_it_uses_weak_styling_filler',
        'Why you’ll love it uses styling filler instead of a concrete TheFEYA purchase benefit.',
      ));
    }
    if (EMPTY_HYPE.test(whyBody)) {
      issues.push(warning(
        'why_youll_love_it_uses_empty_hype',
        'Why you’ll love it contains an unsupported generic quality claim.',
      ));
    }
    if (benefitCategories.length < 2) {
      issues.push(blocker(
        'why_youll_love_it_lacks_benefit_diversity',
        'Why you’ll love it must contain at least two distinct supported benefit categories, such as authorial design, stage/camera presence, fit, comfort, durability, or reflective finish.',
      ));
    }
    const bulletCount = whyBody.split(/\n|•|^-\s+/m).map((item) => item.trim()).filter(Boolean).length;
    if (bulletCount < 3) {
      issues.push(warning(
        'why_youll_love_it_too_few_benefits',
        'Why you’ll love it should present 3-5 concise, non-duplicative purchase reasons.',
      ));
    }
  }

  const materialBlock = blocks.find((block) => String(block.block_key || '') === 'material');
  const materialBody = typeof materialBlock?.body === 'string' ? materialBlock.body : '';
  if (AUDIT_OR_ADMIN_LANGUAGE.test(materialBody)) {
    issues.push(blocker(
      'material_block_contains_internal_review_language',
      'Material & finish must read as buyer copy, not a Product Truth or pre-publish review note.',
    ));
  }

  const hasBlocker = issues.some((issue) => issue.severity === 'blocker');
  return {
    ok: !hasBlocker,
    status: hasBlocker ? 'blocked' : issues.length ? 'warning' : 'valid',
    issues,
    benefit_categories_found: benefitCategories,
  };
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
