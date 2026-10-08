import 'server-only';
import { resolvePublicPrivacyController, resolveStorefrontAnalyticsState } from './privacyControllerPolicy';

export function getPublicPrivacyController() {
  return resolvePublicPrivacyController(process.env);
}

export function getStorefrontAnalyticsState() {
  return resolveStorefrontAnalyticsState(process.env);
}
