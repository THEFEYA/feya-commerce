import assert from 'node:assert/strict';
import test from 'node:test';
import { buildCompactSeoWriterPrompt } from '../../lib/seoClaimPlanV2.ts';

test('green leather suspenders receive a complete product-specific claim plan', () => {
  const input = {
    canonical_product_id: 'ce0a2c0a-5a95-4876-a198-70be635ca053',
    matched_etsy_listing_id: '1871319427',
    product: {
      title: 'Elegant Green Leather Suspenders for Men',
      material: 'Leather',
      color: 'Green',
      sellable_offer: {
        status: 'ready',
        component_labels: ['Harness'],
        aggregate_options: [],
      },
    },
    manual_focus: {
      component: ['harness'],
      material: ['leather'],
      event: [],
      style: ['classic'],
      persona: [],
      audience: ['men'],
      exclude: [],
    },
    keyword_roles: {
      primary: [{ keyword: 'leather body harness fashion', role: 'primary' }],
      secondary: [],
      support: [],
      image_alt: [],
    },
  } as any;

  const { evidence, brief, preflight } = buildCompactSeoWriterPrompt(input);
  const aboutClaims = brief.claim_plan.claims.filter((claim) => claim.target_block === 'about_this_piece');
  const whyClaims = brief.claim_plan.claims.filter((claim) => claim.target_block === 'why_youll_love_it');

  assert.deepEqual(brief.claim_plan.blockers, []);
  assert.equal(aboutClaims[0]?.fact_code, 'green_leather_harness_identity');
  assert.deepEqual(whyClaims.map((claim) => claim.fact_code), [
    'original_authorial_design',
    'leather_harness_repeat_wear',
    'leather_harness_upper_body_framing',
  ]);
  assert.ok(brief.ideal_for_portraits.some((portrait) => portrait.person === 'groomsmen'));
  assert.ok(evidence.current_confirmed_facts.some((fact) => fact.fact_code === 'green_leather_harness_identity'));
  assert.equal(preflight.ok, true, JSON.stringify(preflight.issues));
});
