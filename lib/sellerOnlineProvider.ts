export const SELLER_ONLINE_PROVIDER = {
  providerCode: 'seller-online',
  legalName: 'Seller-Online LLC',
  legalJurisdiction: 'Pennsylvania, United States',
  contactAddress: {
    line1: '635 Somers Ave',
    city: 'Feasterville-Trevose',
    region: 'PA',
    postalCode: '19053',
    country: 'United States',
  },
  usOfficePhone: '+1 (267) 800-9048',
  usOfficeEmail: 'office@seller-online.com',
  supportEmail: 'so-support@seller-online.com',
  publicSite: 'https://seller-online.com',
} as const;

export function isSellerOnlinePaymentsEnabled() {
  return process.env.FEYA_SELLER_ONLINE_PAYMENTS_ENABLED === 'true';
}
