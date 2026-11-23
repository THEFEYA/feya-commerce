/** Immutable policy source identities accepted with a REAL buyer order.
 * Git blob hashes pin the exact publicly displayed English text source. Each
 * policy change requires a new reviewed bundle version and refreshed hashes,
 * so older PayPal orders retain meaningful contract evidence forever.
 */
export const CHECKOUT_POLICY_BUNDLE_V1={
  contract:'thefeya_checkout_policy_evidence_v1',
  version:'thefeya-sale-policy-20261123-v5',
  sources:{
    terms:{url:'/terms',file:'app/terms/page.tsx',git_blob_sha1:'d05c52b29b4864a6b3a014a221c084b9a37d511d'},
    shipping:{url:'/shipping',file:'app/shipping-public-v13/page.tsx',git_blob_sha1:'35a90d492f87f59c3166eefd4a020cad20c9bc4b'},
    returns:{url:'/returns',file:'app/returns/page.tsx',git_blob_sha1:'7c7c687985e54112e8bdfec3bd1e6aeee1351669'},
    privacy:{url:'/privacy',file:'app/privacy/page.tsx',git_blob_sha1:'2b91f9c1cd7290e840fff91567e9cd7640ef36fb'},
  },
} as const;
