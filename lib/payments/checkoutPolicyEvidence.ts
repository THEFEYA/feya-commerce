/** Immutable policy source identities accepted with a REAL buyer order.
 * Git blob hashes pin the exact publicly displayed English text source. Each
 * policy change requires a new reviewed bundle version and refreshed hashes,
 * so older PayPal orders retain meaningful contract evidence forever.
 */
export const CHECKOUT_POLICY_BUNDLE_V1={
  contract:'thefeya_checkout_policy_evidence_v1',
  version:'thefeya-sale-policy-20261029-v3',
  sources:{
    terms:{url:'/terms',file:'app/terms/page.tsx',git_blob_sha1:'059f2f03b72ea74e212e344f4c74e99b637c9b92'},
    shipping:{url:'/shipping',file:'app/shipping-public-v13/page.tsx',git_blob_sha1:'03a63e803c7696f06a13405600ac6b1bb36b594e'},
    returns:{url:'/returns',file:'app/returns/page.tsx',git_blob_sha1:'fa5570efe202ba0c0159959f65031916c773836b'},
    privacy:{url:'/privacy',file:'app/privacy/page.tsx',git_blob_sha1:'2b91f9c1cd7290e840fff91567e9cd7640ef36fb'},
  },
} as const;
