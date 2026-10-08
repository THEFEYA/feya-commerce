import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyAdminLoginFailure } from '../../lib/adminLoginFailure.ts';

test('owner login distinguishes email confirmation from password failure, rate limits and service outages', () => {
  assert.equal(classifyAdminLoginFailure({ code: 'email_not_confirmed', status: 400 }), 'email_not_confirmed');
  assert.equal(classifyAdminLoginFailure({ code: 'invalid_credentials', status: 400 }), 'invalid_credentials');
  assert.equal(classifyAdminLoginFailure({ code: 'over_request_rate_limit', status: 429 }), 'auth_rate_limited');
  assert.equal(classifyAdminLoginFailure({ code: 'not_a_password_error', status: 429 }), 'auth_rate_limited');
  assert.equal(classifyAdminLoginFailure({ code: 'unexpected_remote_failure', status: 503 }), 'auth_temporarily_unavailable');
  assert.equal(classifyAdminLoginFailure({ code: 'unknown' }), 'auth_temporarily_unavailable');
});
