/** The established name in the owner's 2026-10-08 Google Branding screenshots. */
export const GOOGLE_MARKETING_APPLICATION_NAME='FEYA SEO Metrics Tool';
export const GOOGLE_ADS_EXPECTED_CLOUD_PROJECT_NUMBER='826834264134';

/** Private setup diagnostics only. A numeric prefix is a hint, never proof of project ownership or API access. */
export function googleOAuthReviewConfiguration(env:Record<string,string|undefined>) {
  const clientId=env.GOOGLE_ADS_CLIENT_ID?.trim()||'';
  const hint=/^(\d{6,20})-[a-zA-Z0-9_-]+\.apps\.googleusercontent\.com$/.exec(clientId)?.[1]||null;
  return {
    applicationName:GOOGLE_MARKETING_APPLICATION_NAME,
    expectedProjectNumber:GOOGLE_ADS_EXPECTED_CLOUD_PROJECT_NUMBER,
    oauthProjectNumberHint:hint,
    projectHintMatchesExpected:hint===null?null:hint===GOOGLE_ADS_EXPECTED_CLOUD_PROJECT_NUMBER,
    clientIdConfigured:Boolean(clientId),
    brandingUrl:`https://console.cloud.google.com/auth/branding?project=${hint||GOOGLE_ADS_EXPECTED_CLOUD_PROJECT_NUMBER}`,
    projectConfirmationRequired:true as const,
    brandVerification:'not_observed' as const,
    apiAccessLevel:'not_observed' as const,
  };
}
