import test from 'node:test';
import assert from 'node:assert/strict';
import { FEYA_OWNER_CONFIRMED_GA4_WEB_STREAM, resolvePublicPrivacyController, resolveStorefrontAnalyticsState } from '../../lib/privacyControllerPolicy.ts';

const ready = {
  VERCEL_ENV: 'production', NODE_ENV: 'production',
  FEYA_ANALYTICS_ENABLED: 'true', FEYA_ANALYTICS_PRIVACY_READY: 'true', FEYA_GA4_MEASUREMENT_ID: 'G-TEST123',
  FEYA_PRIVACY_CONTROLLER_CONFIRMED: 'true', FEYA_PRIVACY_CONTROLLER_NAME: 'Fixture Privacy Controller',
  FEYA_PRIVACY_CONTROLLER_CONTACT_EMAIL: 'privacy@example.invalid',
};

test('confirmed controller without seller postal identity can satisfy the independently reviewed analytics gate', () => {
  assert.deepEqual(resolveStorefrontAnalyticsState(ready), { enabled: true, measurementId: 'G-TEST123', blocker: null });
  assert.deepEqual(resolvePublicPrivacyController(ready), { name: 'Fixture Privacy Controller', contactEmail: 'privacy@example.invalid' });
});

test('even a complete confirmed seller/operator identity cannot substitute for a confirmed controller', () => {
  const env = { ...ready, FEYA_PRIVACY_CONTROLLER_CONFIRMED: 'false', FEYA_PUBLIC_LEGAL_IDENTITY_CONFIRMED: 'true',
    FEYA_PUBLIC_LEGAL_NAME: 'Fixture Seller', FEYA_PUBLIC_LEGAL_ADDRESS_LINE1: 'Fixture Address',
    FEYA_PUBLIC_LEGAL_ADDRESS_CITY: 'Fixture City', FEYA_PUBLIC_LEGAL_ADDRESS_POSTAL_CODE: '00000', FEYA_PUBLIC_LEGAL_ADDRESS_COUNTRY: 'US' };
  assert.equal(resolvePublicPrivacyController(env), null);
  assert.deepEqual(resolveStorefrontAnalyticsState(env), { enabled: false, measurementId: null, blocker: 'privacy_controller_unconfirmed_or_incomplete' });
});

test('missing, false and truthy-looking confirmation values keep controller disclosure and analytics closed', () => {
  for (const confirmed of [undefined, '', 'false', 'TRUE', '1']) {
    const env = { ...ready, FEYA_PRIVACY_CONTROLLER_CONFIRMED: confirmed };
    assert.equal(resolvePublicPrivacyController(env), null);
    assert.equal(resolveStorefrontAnalyticsState(env).enabled, false);
  }
});

test('incomplete and malformed controller contact data never activate analytics or leak a measurement ID', () => {
  for (const patch of [
    { FEYA_PRIVACY_CONTROLLER_NAME: '' }, { FEYA_PRIVACY_CONTROLLER_NAME: ' \t ' },
    { FEYA_PRIVACY_CONTROLLER_NAME: 'A'.repeat(201) }, { FEYA_PRIVACY_CONTROLLER_NAME: 'Name\nInjected' },
    { FEYA_PRIVACY_CONTROLLER_CONTACT_EMAIL: '' }, { FEYA_PRIVACY_CONTROLLER_CONTACT_EMAIL: 'not-an-email' },
    { FEYA_PRIVACY_CONTROLLER_CONTACT_EMAIL: 'person@example.invalid\nOther' },
  ]) {
    const env = { ...ready, ...patch };
    assert.equal(resolvePublicPrivacyController(env), null);
    assert.equal(resolveStorefrontAnalyticsState(env).measurementId, null);
  }
});

test('preview overrides NODE_ENV production, including when all activation and identity fields are set', () => {
  for (const environment of ['preview', 'development', 'test', 'unknown']) {
    assert.deepEqual(resolveStorefrontAnalyticsState({ ...ready, VERCEL_ENV: environment }),
      { enabled: false, measurementId: null, blocker: 'non_production_environment' });
  }
});

test('independent analytics and privacy switches must both be exactly true', () => {
  for (const key of ['FEYA_ANALYTICS_ENABLED', 'FEYA_ANALYTICS_PRIVACY_READY']) {
    for (const value of [undefined, 'false', 'TRUE', '1']) {
      assert.equal(resolveStorefrontAnalyticsState({ ...ready, [key]: value }).enabled, false);
    }
  }
});

test('owner-confirmed legacy web stream is selected without a manual Vercel ID, but not activated', () => {
  assert.deepEqual(FEYA_OWNER_CONFIRMED_GA4_WEB_STREAM, {
    propertyId: '424292347', streamId: '6664266455', measurementId: 'G-H3KXFFSVD2',
    websiteUrl: 'https://thefeya.com', confirmedOn: '2026-10-17',
  });
  // Selecting the non-secret ID is never permission to collect data.
  for (const absent of [undefined, '']) {
    const candidate = { ...ready, FEYA_GA4_MEASUREMENT_ID: absent };
    assert.deepEqual(resolveStorefrontAnalyticsState(candidate),
      { enabled: true, measurementId: 'G-H3KXFFSVD2', blocker: null });
    assert.deepEqual(resolveStorefrontAnalyticsState({ ...candidate, FEYA_ANALYTICS_ENABLED: 'false' }),
      { enabled: false, measurementId: null, blocker: 'analytics_disabled' });
    assert.deepEqual(resolveStorefrontAnalyticsState({ ...candidate, FEYA_ANALYTICS_PRIVACY_READY: 'false' }),
      { enabled: false, measurementId: null, blocker: 'privacy_not_reviewed' });
    assert.deepEqual(resolveStorefrontAnalyticsState({ ...candidate, FEYA_PRIVACY_CONTROLLER_CONFIRMED: 'false' }),
      { enabled: false, measurementId: null, blocker: 'privacy_controller_unconfirmed_or_incomplete' });
    assert.deepEqual(resolveStorefrontAnalyticsState({ ...candidate, VERCEL_ENV: 'preview' }),
      { enabled: false, measurementId: null, blocker: 'non_production_environment' });
  }
});

test('invalid explicit GA4 overrides remain closed and valid ones normalize whitespace', () => {
  for (const id of ['UA-123', 'G-', 'G-TEST/123', 'G-TEST 123']) {
    assert.deepEqual(resolveStorefrontAnalyticsState({ ...ready, FEYA_GA4_MEASUREMENT_ID: id }),
      { enabled: false, measurementId: null, blocker: 'measurement_id_invalid' });
  }
  assert.equal(resolveStorefrontAnalyticsState({ ...ready, FEYA_GA4_MEASUREMENT_ID: ' G-TEST123 ' }).measurementId, 'G-TEST123');
});

test('default configuration keeps analytics off and state contains no name, email or street fields', () => {
  assert.equal(resolvePublicPrivacyController({}), null);
  assert.deepEqual(resolveStorefrontAnalyticsState({}), { enabled: false, measurementId: null, blocker: 'non_production_environment' });
  assert.deepEqual(Object.keys(resolveStorefrontAnalyticsState(ready)).sort(), ['blocker', 'enabled', 'measurementId']);
});
