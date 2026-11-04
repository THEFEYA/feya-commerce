import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const client = readFileSync('lib/measurementClient.ts', 'utf8');

test('gtag shim pushes the native Arguments object (gtag.js ignores Array copies)', () => {
  const fn = client.slice(client.indexOf('function gtag('), client.indexOf('function ensureGoogleTag('));
  assert.match(fn, /window\.dataLayer\.push\(arguments\);/);
  assert.doesNotMatch(fn, /dataLayer\.push\(args\)/);
});

test('an Arguments object is what a gtag-style shim must produce', () => {
  const layer: unknown[] = [];
  function shim(..._a: unknown[]) { layer.push(arguments); } // eslint-disable-line prefer-rest-params
  shim('config', 'G-TEST', {send_page_view: false});
  assert.equal(Object.prototype.toString.call(layer[0]), '[object Arguments]');
  assert.equal(Array.isArray(layer[0]), false);
});

test('consent defaults stay privacy-safe: analytics only, all ad signals denied', () => {
  assert.match(client, /analytics_storage:'granted',\s*ad_storage:'denied',\s*ad_user_data:'denied',\s*ad_personalization:'denied'/);
  assert.match(client, /if\(getAnalyticsConsent\(\)!=='granted'\)return false;/);
});
