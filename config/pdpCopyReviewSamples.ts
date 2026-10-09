/** Owner-selected representative products from the exact approved 207-PDP binding corpus.
 * Never substitute a nearby/latest SEO draft when an immutable pin changes.
 * Samples are not a shopping shortlist or a new published collection.
 */
export const PDP_COPY_REVIEW_BRANCH='work/pdp-pinned-approved-copy-owner-review-20261010';
export const PDP_COPY_REVIEW_SAMPLES=[
  {
    kind:'Post-apocalyptic shoulder armor',
    canonical_product_id:'b6e0171f-4d42-4d71-88b1-ee0d4e0e109e',
    pinned_draft_id:'b3d08986-9223-47fa-9c1d-a8d4b8de18e0',
    slug:'apocalyptic-warrior-men-s-costume-burning-man-gold-armor-outfit-rave-festival-fashion-steampunk-leather-shoulders-futuristic-dune-wear-4348580005',
  },
  {
    kind:'Women’s festival skirt outfit',
    canonical_product_id:'0403df9f-3ff9-498d-b3d9-69ad64b3dd4c',
    pinned_draft_id:'e00d0cdf-cd68-46d1-8b72-3b02a915cd76',
    slug:'cosmic-festival-outfit-with-top-skirt-metallic-costume-set-party-rave-wear-unique-futuristic-outfit-cyber-punk-clothing-accessories-4367470907',
  },
  {
    kind:'Dance bodysuit set',
    canonical_product_id:'09f51ad4-6b90-4311-aa5a-54f91cf4b7bf',
    pinned_draft_id:'18d6bf56-3de6-40f0-9293-f4e43167d47f',
    slug:'gogo-costume-set-bodysuit-skirt-leg-covers-for-futuristic-dance-fashion-outfit-pj-showgirl-4389332118',
  },
  {
    kind:'Costume set with mask',
    canonical_product_id:'51d879ce-f762-4307-b896-efcb2ffd64e9',
    pinned_draft_id:'50e5bc1b-cab7-41aa-b162-ee59d6a68213',
    slug:'rave-festival-outfit-with-mask-shoulder-top-skirt-bracelet-white-gold-leather-armor-wear-burning-man-costume-set-women-futuristic-suit-1842722795',
  },
  {
    kind:'Gold futuristic armor with accessories',
    canonical_product_id:'0395cb11-424f-407f-a849-7ee3b617ab57',
    pinned_draft_id:'7faba4bd-2089-423b-bb29-2e2546fb48e1',
    slug:'gold-futuristic-armor-set-choker-collar-shoulder-armor-and-arm-bracers-performance-outfit-4511817111',
  },
] as const;
export function pdpCopyReviewSample(slug:string){
  return PDP_COPY_REVIEW_SAMPLES.find(s=>s.slug===slug)||null;
}
export function isPdpCopyReviewDeployment(env:Record<string,string|undefined>){
  // Vercel's authenticated Deployment Protection is the externally enforced
  // owner boundary. No request header or query parameter can enable it.
  return env.VERCEL==='1'
    &&env.VERCEL_ENV==='preview'
    &&env.VERCEL_PROJECT_ID==='prj_ePIymo4sUG33wrRjHBxWrSlaxPID'
    &&env.VERCEL_GIT_COMMIT_REF===PDP_COPY_REVIEW_BRANCH
    &&env.FEYA_OWNER_PREVIEW_DISABLED!=='true';
}
