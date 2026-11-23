import assert from 'node:assert/strict';
import {generateKeyPairSync, sign} from 'node:crypto';
import test from 'node:test';
import {parseWithdrawal, publicWithdrawalReceipt, WITHDRAWAL_DECLARATION} from '../../lib/withdrawal/contract.ts';
import {withdrawalCopy} from '../../lib/withdrawal/language.ts';
import {authorizedWithdrawalWorker} from '../../lib/withdrawal/googleWorkerIdentity.ts';
import {parseWorkerCommand, renderAcknowledgement, type DeliveryJob} from '../../lib/withdrawal/transport.ts';

const reference = 'b765f2cf-aef9-409f-aad8-fc188804bbe6';
const time = '2026-11-23T16:39:19.087123+00:00';
const input = {idempotency_key: reference,name: 'Zoë Doe',email: 'buyer@example.test',order_number: 'Gold costume, ordered 13 November',confirm: true};
const job: DeliveryJob = {job_id: 'efb43122-fad2-48b8-8577-d7d60c85d868',attempt_id: reference,reference,
  submitted_at: time,to: input.email,kind: 'customer',
  statement: {name: input.name,contract: input.order_number,email: input.email,declaration: WITHDRAWAL_DECLARATION}};

test('anonymous withdrawal accepts identifiable details without a receipt token or reason', () => {
  assert.deepEqual(parseWithdrawal({...input,name: ' Zoë Doe '}, () => false),
    {idempotency_key: reference,name: input.name,email: input.email,order_number: input.order_number});
  for (const raw of [{...input,confirm: false},{...input,name: 'a\nBcc: x'},{...input,email: 'first@example.test,second@example.test'},
    {...input,email: 'A <x@example.test>'},{...input,order_number: 'X'.repeat(241)},
    {...input,name: 'a\u202Etxt'},{...input,access_token: 'guess'},{...input,reason: 'required?'}]) {
    assert.equal(parseWithdrawal(raw, () => false), null);
  }
});
test('public receipt contains only the committed database reference and UTC instant', () => {
  assert.deepEqual(publicWithdrawalReceipt({...job,order_id: 'private'}), {reference,submitted_at: '2026-11-23T16:39:19.087Z'});
  assert.equal(publicWithdrawalReceipt({reference}), null);
  assert.equal(publicWithdrawalReceipt({reference: 'made-up',submitted_at: time}), null);
});
test('customer receives the recorded statement and time, the studio only its fixed notification', () => {
  const msg = renderAcknowledgement(job);
  assert.match(msg.body, /2026-11-23T16:39:19.087Z/);
  for (const value of [WITHDRAWAL_DECLARATION,input.name,input.order_number,input.email]) assert.ok(msg.body.includes(value));
  assert.throws(() => renderAcknowledgement({...job,to: 'other@example.test'}));
  const notice = renderAcknowledgement({...job,kind: 'studio',to: 'manager.feya@gmail.com',statement: null});
  assert.ok(notice.body.includes(reference));
  for (const value of [input.name,input.order_number,input.email]) assert.ok(!notice.body.includes(value));
  assert.throws(() => renderAcknowledgement({...job,kind: 'studio',to: 'another@example.test',statement: null}));
});
test('the chosen language binds the declaration and durable acknowledgement to the form shown', () => {
  for (const language of ['en','nl','de'] as const) {
    const parsed = parseWithdrawal({...input, language}, () => false);
    assert.equal(parsed?.language, language);
    const words = withdrawalCopy[language];
    const message = renderAcknowledgement({...job, statement: {...job.statement!, language, declaration: words.declaration}});
    assert.ok(message.subject.includes(words.receipt));
    for (const value of [reference, words.received, words.declaration, input.order_number, input.name, input.email]) {
      assert.ok(message.body.includes(value));
    }
  }
  const seller = renderAcknowledgement({...job, kind:'seller', to:'office@seller-online.com'});
  for (const value of [reference,job.statement!.name,job.statement!.email,job.statement!.contract,WITHDRAWAL_DECLARATION]) assert.ok(seller.body.includes(value));
  for (const to of ['other@example.test','manager.feya@gmail.com']) assert.throws(() => renderAcknowledgement({...job, kind:'seller', to}));
  assert.equal(parseWithdrawal({...input, language: 'other'}, () => false), null);
  assert.throws(() => renderAcknowledgement({...job, statement: {...job.statement!, language: 'nl'}}));
});

test('the worker cannot submit custom messages, override recipients or select a named receipt', () => {
  assert.deepEqual(parseWorkerCommand({action: 'take',remaining: 0}), {action: 'take',remaining: 0});
  for (const invalid of [{action: 'take',remaining: 1,to: input.email},{action: 'take',remaining: '65'},
    {action: 'take',remaining: 100,reference},{action: 'take',remaining: -1},{action: 'withdrawal_case',reference},
    {action: 'report',job_id: job.job_id,attempt_id: job.attempt_id,outcome: 'delivered'}]) {
    assert.equal(parseWorkerCommand(invalid), null);
  }
  const complete = {action: 'report',job_id: job.job_id,attempt_id: job.attempt_id,outcome: 'submitted'};
  assert.deepEqual(parseWorkerCommand(complete), complete);
});
test('Google worker requires a signed current ID token for this exact private app and verified studio', async () => {
  const now = 1700000000, audience = 'test-client.apps.googleusercontent.com';
  const {privateKey, publicKey} = generateKeyPairSync('rsa', {modulusLength: 2048});
  const publicJwk = publicKey.export({format: 'jwk'});
  const lookup = async (id: string) => id === 'google-key' ? publicJwk : undefined;
  const encode = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url');
  function token(fields: object = {}, header: object = {}) {
    const claims = {iss: 'https://accounts.google.com',aud: audience,azp: audience,sub: 'studio-sub',email: 'manager.feya@gmail.com',
      email_verified: true,iat: now-30,exp: now+3300,...fields};
    const unsigned = encode({alg: 'RS256',kid: 'google-key',...header}) + '.' + encode(claims);
    return 'Bearer ' + unsigned + '.' + sign('RSA-SHA256',Buffer.from(unsigned),privateKey).toString('base64url');
  }
  assert.equal(await authorizedWithdrawalWorker(token(),audience,lookup,now), true);
  for (const incorrect of [{iss: 'https://untrusted.example'},{aud: 'other'},{azp: 'other'},
    {email: 'other@example.test'},{email_verified: false},{iat: now+500},{exp: now},{nbf: now+1000}]) {
    assert.equal(await authorizedWithdrawalWorker(token(incorrect),audience,lookup,now), false);
  }
  for (const incorrect of [{kid: 'unknown'},{crit: ['exp']},{alg: 'none'}]) {
    assert.equal(await authorizedWithdrawalWorker(token({},incorrect),audience,lookup,now), false);
  }
  const current = token();
  const signatureAt = current.lastIndexOf('.') + 1;
  const forged = current.slice(0,signatureAt) + (current[signatureAt] === 'A' ? 'B' : 'A') + current.slice(signatureAt+1);
  assert.equal(await authorizedWithdrawalWorker(forged,audience,lookup,now), false);
  assert.equal(await authorizedWithdrawalWorker(null,audience,lookup,now), false);
});
