import assert from 'node:assert/strict';
import test from 'node:test';
import {readWithdrawalReceipt, withdrawalAttempt, withdrawalReceiptText} from '../../lib/withdrawal/browser.ts';
import {WITHDRAWAL_DECLARATION} from '../../lib/withdrawal/contract.ts';

const fields = {name: 'Example Customer', order_number: 'Gold shoulder piece ordered 7 November', email: 'guest@example.test'};
const reference = '7002bec4-c7a1-43a2-b115-b602cfbafeaa';

test('retry and reload reuse the same private attempt without retaining the form contents', async () => {
  const saved = new Map<string, string>();
  const original = Object.getOwnPropertyDescriptor(globalThis, 'window');
  try {
    Object.defineProperty(globalThis, 'window', {configurable: true, value: {sessionStorage: {
      getItem: (key: string) => saved.get(key) ?? null,
      setItem: (key: string, value: string) => saved.set(key, value),
    }}});
    const first = await withdrawalAttempt(fields, null);
    assert.deepEqual(await withdrawalAttempt(fields, null), first);
    assert.notEqual((await withdrawalAttempt(fields, first, 'de')).key, first.key);
    const edited = await withdrawalAttempt({...fields, order_number: 'Another purchase'}, first);
    assert.notEqual(edited.key, first.key);
    assert.deepEqual(await withdrawalAttempt(fields, edited), first);
    const stored = JSON.stringify([...saved]);
    for (const value of Object.values(fields)) assert.ok(!stored.includes(value));
    Object.defineProperty(globalThis, 'window', {configurable: true, value: {}});
    const memory = await withdrawalAttempt(fields, null);
    assert.equal(await withdrawalAttempt(fields, memory), memory);
  } finally {
    if (original) Object.defineProperty(globalThis, 'window', original);
    else Reflect.deleteProperty(globalThis, 'window');
  }
});

test('only a saved notice yields a receipt and only explicit dispatch yields sent', () => {
  const reply = {ok: true, receipt: {reference, submitted_at: '2026-11-23T18:42:00+01:00'}, acknowledgement: 'pending'};
  const receipt = readWithdrawalReceipt(reply)!;
  assert.equal(receipt.acknowledgement, 'pending');
  assert.equal(receipt.submitted_at, '2026-11-23T17:42:00.000Z');
  assert.equal(readWithdrawalReceipt({...reply, acknowledgement: 'sent'})?.acknowledgement, 'sent');
  assert.equal(readWithdrawalReceipt({...reply, acknowledgement: null}), null);
  assert.equal(readWithdrawalReceipt({...reply, ok: false}), null);
  assert.equal(readWithdrawalReceipt({...reply, receipt: {reference, submitted_at: ''}}), null);
  const saved = withdrawalReceiptText(fields, receipt, 'Example Seller');
  for (const value of [reference, receipt.submitted_at, 'Example Seller', WITHDRAWAL_DECLARATION, ...Object.values(fields)]) {
    assert.ok(saved.includes(value));
  }
});
