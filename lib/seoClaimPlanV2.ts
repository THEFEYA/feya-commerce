// FEYA Human Copy v2 - step 2 scaffolding.
// Two-stage generation contracts and compact prompt builders:
//   stage A: claim plan (facts -> buyer outcomes -> target blocks) as strict JSON;
//   stage B: writer that turns an approved claim plan into prose and may not add claims.
// Deliberately small: mechanical bans live in seoCommercialCopyValidator, not here.
// Not wired into the generation route yet. Rollback: delete this file.

import type { SeoProductFactSheet } from './seoProductFactSheet';

export type SeoClaimTargetBlock =
  | 'intro'
  | 'about_this_piece'
  | 'why_youll_love_it'
  | 'ideal_for'
  | 'main_description';

export type SeoClaimPlanItem = {
  claim_id: string;
  fact_code: string;
  buyer_outcome_en: string;
  target_block: SeoClaimTargetBlock;
};

export type SeoClaimPlan = {
  contract_version: 'seo_claim_plan_v1';
  product_identity_en: string;
  buyer_job_en: string;
  claims: SeoClaimPlanItem[];
};

export type SeoClaimPlanPromptArgs = {
  productIdentityEn: string;
  selectedEvents: string[];
  selectedStyles: string[];
  factSheet: SeoProductFactSheet;
};

export function buildClaimPlanPrompt(args: SeoClaimPlanPromptArgs): { system: string; user: string } {
  const system = [
    'You are the planning stage of a two-stage product copy pipeline for an independent festival/stage fashion studio.',
    'You do not write prose. You select evidence and map it to buyer outcomes.',
    'Use only the facts provided in the fact sheet. Never invent a fact, material, component or promise.',
    'Return strict JSON matching seo_claim_plan_v1 and nothing else.',
    'Each claim: one fact_code from the fact sheet, one concrete buyer outcome in plain English, one target block.',
    'Pick 3-4 claims for why_youll_love_it, 1-2 for about_this_piece, 0-1 for intro. Do not reuse one fact in two blocks.',
    'If fewer than three usable facts exist, return fewer claims instead of inventing.',
  ].join('\n');
  const user = [
    `Product identity: ${args.productIdentityEn}`,
    `Selected events: ${args.selectedEvents.join(', ') || 'none'}`,
    `Selected styles: ${args.selectedStyles.join(', ') || 'none'}`,
    'Fact sheet (the only allowed evidence):',
    JSON.stringify(args.factSheet, null, 2),
  ].join('\n');
  return { system, user };
}

export type SeoWriterPromptArgs = {
  plan: SeoClaimPlan;
  approvedExamples: string[];
};

export function buildWriterPromptV2(args: SeoWriterPromptArgs): { system: string; user: string } {
  const examples = args.approvedExamples.length
    ? ['Approved reference examples (match their concreteness and rhythm, not their facts):', ...args.approvedExamples]
    : ['No approved examples supplied yet; keep sentences short, concrete and specific to the claims.'];
  const system = [
    'You are the writing stage of a two-stage product copy pipeline for TheFEYA, an independent festival and stage fashion studio.',
    'Write natural English en-US buyer copy from the approved claim plan.',
    'Hard rule: every sentence must express a claim from the plan or neutral connective tissue. You may not add facts, benefits, styles, events or promises that are not in the plan.',
    'Each claim appears exactly once, in its target block.',
    'Voice: warm, concrete, editorial; varied sentence rhythm; no hype and no design-critique jargon.',
    'The final main_description block uses first-person studio voice and the single permitted TheFEYA mention.',
    ...examples,
  ].join('\n');
  const user = [
    'Approved claim plan (the only allowed content):',
    JSON.stringify(args.plan, null, 2),
    'Write the blocks in this order: intro, about_this_piece, why_youll_love_it, ideal_for, main_description.',
    'Return JSON with those five string fields and nothing else.',
  ].join('\n');
  return { system, user };
}
