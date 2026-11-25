import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import test from 'node:test';

const code = readFileSync(new URL('../../scripts/withdrawal-gmail/Code.gs', import.meta.url), 'utf8');
const manifest = JSON.parse(readFileSync(new URL('../../scripts/withdrawal-gmail/appsscript.json', import.meta.url), 'utf8'));
function fakeScript(failure: 'none' | 'ack network' | 'ambiguous mail' = 'none', email = 'manager.feya@gmail.com') {
  const sent: string[] = [], reports: string[] = [], logs: string[] = [];
  const properties = new Map<string, string>();
  let triggers = 0, takes = 0, reportRequests = 0;
  const token = 'synthetic.' + Buffer.from(JSON.stringify({aud: 'public-client-id', email, email_verified: true})).toString('base64url') + '.synthetic';
  const ctx = {
    ScriptApp: {
      getIdentityToken: () => token,
      getProjectTriggers: () => Array.from({length: triggers}, () => ({getHandlerFunction: () => 'runWithdrawalWorker'})),
      newTrigger: () => ({timeBased: () => ({everyMinutes: (minutes: number) => ({create() {assert.equal(minutes, 5); triggers++;}})})}),
    },
    Utilities: {base64DecodeWebSafe: (s: string) => Buffer.from(s, 'base64url'), newBlob: (b: Buffer) => ({getDataAsString: () => b.toString('utf8')})},
    console: {log: (v: string) => logs.push(v)},
    LockService: {getScriptLock: () => ({tryLock: () => true, releaseLock: () => {}})},
    PropertiesService: {getScriptProperties: () => ({
      getProperty: (k: string) => properties.get(k) ?? null, setProperty: (k: string, value: string) => properties.set(k, value),
      deleteProperty: (k: string) => properties.delete(k),
    })},
    MailApp: {getRemainingDailyQuota: () => 58, sendEmail: (v: {to: string}) => {
      sent.push(v.to);
      if (failure === 'ambiguous mail') throw new Error('simulated unknown');
    }},
    UrlFetchApp: {fetch: (url: string, opts: {followRedirects: boolean;headers: {Authorization: string};payload: string}) => {
      assert.equal(url, 'https://thefeya.com/api/internal/withdrawal-delivery');
      assert.equal(opts.headers.Authorization, 'Bearer ' + token);
      assert.equal(opts.followRedirects, false);
      const body = JSON.parse(opts.payload);
      const success = (data: unknown) => ({getResponseCode: () => 200, getContentText: () => JSON.stringify(data)});
      if (body.action === 'take') {
        assert.equal(body.remaining, 58);
        return success({ok: true, job: takes++ === 0
          ? {job_id: 'job', attempt_id: 'attempt', to: 'buyer@example.test', subject: 'receipt', body: 'test'} : null});
      }
      assert.deepEqual(Object.keys(body).sort(), ['action', 'attempt_id', 'job_id', 'outcome']);
      if (reportRequests++ === 0 && failure === 'ack network') throw new Error('simulated disconnect');
      reports.push(body.outcome);
      return success({ok: true, accepted: true});
    }},
  };
  runInNewContext(code, ctx);
  return {sent, reports, logs, properties, getTriggers: () => triggers,
    authorize: (hasConsent = true) => {
      // Pair with no timer, network, mailbox or storage APIs in scope.
      const execution = {Utilities: ctx.Utilities, console: ctx.console, ScriptApp: {
        getIdentityToken: ctx.ScriptApp.getIdentityToken, AuthMode: {FULL: 'full'},
        requireAllScopes: (mode: string) => {assert.equal(mode, 'full'); if (!hasConsent) throw new Error('Missing consent');},
      }};
      runInNewContext(code + '\nauthorizeStudioMail();', execution);
    },
    run: () => runInNewContext('runWithdrawalWorker();', ctx),
    install: () => runInNewContext('installWithdrawalWorker();', ctx)};
}
test('first-run approval only logs the verified studio public audience with all declared permissions', () => {
  assert.equal(/^function (\w+)\(/m.exec(code)?.[1], 'authorizeStudioMail');
  const studio = fakeScript();
  assert.throws(() => studio.authorize(false), /Missing consent/);
  assert.deepEqual(studio.logs, []);
  studio.authorize();
  assert.deepEqual(studio.logs, ['Withdrawal worker OAuth audience: public-client-id']);
  const other = fakeScript('none', 'other@example.test');
  assert.throws(() => other.authorize(), /designated studio/);
  assert.deepEqual(other.logs, []);
});
test('separate installation checks studio identity and creates one timer', () => {
  const script = fakeScript();
  script.install(); script.install();
  assert.equal(script.getTriggers(), 1);
  assert.ok(manifest.oauthScopes.includes('https://www.googleapis.com/auth/script.send_mail'));
  assert.ok(!manifest.oauthScopes.some((s: string) => s.includes('gmail.read') || s.includes('mail.google.com')));
  assert.throws(() => fakeScript('none', 'other@example.test').install());
});
test('the Gmail worker reports successful handoff and retains no message content', () => {
  const script = fakeScript();
  script.run(); script.run();
  assert.deepEqual(script.sent, ['buyer@example.test']);
  assert.deepEqual(script.reports, ['submitted']);
  assert.equal(script.properties.size, 0);
});
test('a lost reporting response replays the report only, not the email', () => {
  const script = fakeScript('ack network');
  assert.throws(script.run);
  assert.ok(!JSON.stringify([...script.properties]).includes('buyer@example.test'));
  script.run();
  assert.deepEqual(script.sent, ['buyer@example.test']);
  assert.deepEqual(script.reports, ['submitted']);
});
test('a Gmail exception is reported as an uncertain outcome and never causes an automatic resend', () => {
  const script = fakeScript('ambiguous mail');
  script.run(); script.run();
  assert.deepEqual(script.sent, ['buyer@example.test']);
  assert.deepEqual(script.reports, ['unknown']);
});
