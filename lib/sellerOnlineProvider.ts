export const SELLER_ONLINE_PROVIDER = {
  providerCode: 'seller-online',
  legalName: 'Seller-Online LLC',
  legalJurisdiction: 'Pennsylvania, United States',
  publicRoleDescription: 'authorized payment recipient, payment processing and logistics partner, distributor/reseller',
  officialConfirmationDate: '2026-10-09',
  officialIntegration: 'API v2',
  connectionApplicationUrl: 'https://my.seller-online.com/connect/other',
  apiDocumentationUrl: 'https://api.seller-online.com/swagger-ui/',
  approvedCheckoutDisclosure: 'Payments are securely processed by Seller-Online LLC, our authorized payment recipient and logistics partner.',
  merchantOfRecordConfirmed: false,
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

export function sellerOnlineDisclosureConfirmed() {
  return process.env.FEYA_SELLER_ONLINE_ROLE_CONFIRMED === 'true';
}

export function isSellerOnlinePaymentsEnabled() {
  // Payment/resale disclosure cannot be activated by a payment flag alone.
  // The site must also have explicit confirmation of Seller Online's role for thefeya.com.
  return process.env.FEYA_SELLER_ONLINE_PAYMENTS_ENABLED === 'true'
    && sellerOnlineDisclosureConfirmed();
}
