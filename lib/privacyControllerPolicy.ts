type PrivacyEnvironment = Readonly<Record<string, string | undefined>>;

export type PublicPrivacyController = { name: string; contactEmail: string };
export type StorefrontAnalyticsState = {
  enabled: boolean;
  measurementId: string | null;
  blocker: 'non_production_environment' | 'analytics_disabled' | 'privacy_controller_unconfirmed_or_incomplete'
    | 'privacy_not_reviewed' | 'measurement_id_invalid' | null;
};

/** A confirmed controller is a separate role from the seller or website operator. */
export function resolvePublicPrivacyController(env: PrivacyEnvironment): PublicPrivacyController | null {
  if (env.FEYA_PRIVACY_CONTROLLER_CONFIRMED !== 'true') return null;
  const name = (env.FEYA_PRIVACY_CONTROLLER_NAME || '').trim();
  const contactEmail = (env.FEYA_PRIVACY_CONTROLLER_CONTACT_EMAIL || '').trim();
  if (!name || name.length > 200 || /[\u0000-\u001f\u007f]/.test(name)
    || contactEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)
    || /[\u0000-\u001f\u007f]/.test(contactEmail)) return null;
  return { name, contactEmail };
}

/** Shared server gate for the consent UI, privacy copy and measurement context. */
export function resolveStorefrontAnalyticsState(env: PrivacyEnvironment): StorefrontAnalyticsState {
  const environment = (env.VERCEL_ENV || env.NODE_ENV || 'unknown').toLowerCase();
  let blocker: StorefrontAnalyticsState['blocker'] = null;
  const measurementId = (env.FEYA_GA4_MEASUREMENT_ID || '').trim();
  if (environment !== 'production') blocker = 'non_production_environment';
  else if (env.FEYA_ANALYTICS_ENABLED !== 'true') blocker = 'analytics_disabled';
  else if (!resolvePublicPrivacyController(env)) blocker = 'privacy_controller_unconfirmed_or_incomplete';
  else if (env.FEYA_ANALYTICS_PRIVACY_READY !== 'true') blocker = 'privacy_not_reviewed';
  else if (!/^G-[A-Z0-9]+$/i.test(measurementId)) blocker = 'measurement_id_invalid';
  return { enabled: blocker === null, measurementId: blocker === null ? measurementId : null, blocker };
}
