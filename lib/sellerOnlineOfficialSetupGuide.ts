// Source links verified against Seller Online public documentation.
export const SELLER_ONLINE_OFFICIAL_LINKS={
  cmsGuide:'https://seller-online.com/help/integraciya-z-cms/',
  sellerAccount:'https://my.seller-online.com',
  sellerPersonalKey:'https://my.seller-online.com/personal_link.php',
  sellerStoreApplication:'https://my.seller-online.com/connect/other',
  sellerApiGuide:'https://seller-online.com/help/api-dokumentaciya-2/',
  sellerApiSpecification:'https://api.seller-online.com/swagger-ui/',
  paypalIpn:'https://thefeya.com/api/commerce/paypal/ipn',
  github:'https://github.com/THEFEYA/feya-commerce',
} as const;

export type SetupMode='paypal_standard'|'paypal_rest'|'seller_online_api_v2'|'hosted_redirect';
export type SetupFlags={
  paypal_email_set?:boolean;
  personal_key_set?:boolean;
  paypal_client_id_set?:boolean;
  paypal_client_secret_set?:boolean;
  seller_api_key_set?:boolean;
};
export function sellerOnlineSetupProgress(mode:SetupMode,flags:SetupFlags){
  const needed:ReadonlyArray<keyof SetupFlags>=mode==='paypal_standard'
    ?['paypal_email_set','personal_key_set']
    :mode==='paypal_rest'
      ?['paypal_client_id_set','paypal_client_secret_set']
      :mode==='seller_online_api_v2'
        ?['seller_api_key_set']
        :[];
  const missing=needed.filter(key=>flags[key]!==true);
  return {
    missing,
    configurationSaved:needed.length>0&&missing.length===0,
    providerPaymentVerified:false,
    endToEndPurchaseVerified:false,
    livePaymentsActive:false,
  };
}
