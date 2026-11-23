/** Immutable policy source identities accepted with a REAL buyer order.
 * Git blob hashes pin the exact publicly displayed English text source. Each
 * policy change requires a new reviewed bundle version and refreshed hashes,
 * so older PayPal orders retain meaningful contract evidence forever.
 */
export const CHECKOUT_POLICY_BUNDLE_V1={
  contract:'thefeya_checkout_policy_evidence_v1',
  version:'thefeya-sale-policy-20261123-v6',
  sources:{
    terms:{url:'/terms',file:'app/terms/page.tsx',git_blob_sha1:'d05c52b29b4864a6b3a014a221c084b9a37d511d'},
    shipping:{url:'/shipping',file:'app/shipping-public-v13/page.tsx',git_blob_sha1:'35a90d492f87f59c3166eefd4a020cad20c9bc4b'},
    returns:{url:'/returns',file:'app/returns/page.tsx',git_blob_sha1:'626ecd6da5574e8b3d9ce5e834dd07dec0d418c5'},
    privacy:{url:'/privacy',file:'app/privacy/page.tsx',git_blob_sha1:'f98f341206b9cd78ba0bf70f81f90c73040d1f91'},
  },
} as const;

/** Transit after dispatch, as displayed in the signed /shipping policy. */
export const SHIPPING_TRANSIT_BUSINESS_DAYS = {
  standard: '10–14',
  express: '6–9',
} as const;
