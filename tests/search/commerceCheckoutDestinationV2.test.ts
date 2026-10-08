import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
  COMMERCE_CHECKOUT_DESTINATION_V2, normalizeCheckoutDestinationV2,
  verifyCheckoutDestinationV2Binding,
} from '../../lib/commerceCheckoutDestinationV2.ts';

const input = () => ({
  contract_version: COMMERCE_CHECKOUT_DESTINATION_V2,
  country: 'US', postal_code: '10 001',
  recipient_full_name: 'Example  Buyer', contact_email: 'OWNER.Example@Email.com',
  contact_phone: null, region: 'New York', city: 'New York',
  address_line1: '15 West  20th Street', address_line2: null,
});
const digest = (country: string, postal_code: string) => createHash('sha256')
  .update(JSON.stringify({country,postal_code})).digest('hex');
const binding = (country='US', postal='10001') => ({
  destination_country:country, destination_postal_code:postal,
  destination_sha256:digest(country,postal), expires_at:'2026-10-08T20:15:00Z',
  shipping_method:'standard' as const, currency:'EUR' as const,
  payable:false as const, payment_enabled:false as const,
  provider_session_enabled:false as const,
});

test('strict destination stores normalized address and ISO routing fields without browser amounts', () => {
  const original = input(), destination = normalizeCheckoutDestinationV2(original);
  assert.equal(destination.country,'US');
  assert.equal(destination.postal_code,'10001');
  assert.equal(destination.recipient_full_name,'Example Buyer');
  assert.equal(destination.contact_email,'owner.example@email.com');
  assert.equal(destination.address_line1,'15 West 20th Street');
  assert.equal(original.postal_code,'10 001');
  assert.equal(verifyCheckoutDestinationV2Binding(destination,binding(),'2026-10-08T20:00:00Z','standard').payable,false);
});

test('address only accepts exact structured fields and never accepts price, delivery zone, quantity or date from browser', () => {
  const d=input();
  for(const extra of [
    {shipping_amount_minor: 1900}, {currency:'EUR'}, {remote_country:true},
    {postal_sha256:'a'.repeat(64)}, {created_at:'2026-10-08'},
    {production_ready:true}, {quantity:2}, {payment_enabled:true},
    {tax_minor:0}, {discount_minor:0},
  ]) assert.throws(() => normalizeCheckoutDestinationV2({...d,...extra}),/checkout_destination_request_invalid/);
  for(const changed of [
    {postal_code:'!!'}, {country:'ZZ'}, {country:'us'},
    {recipient_full_name:' '}, {city:''}, {contact_email:'broken'},
    {address_line1:'Main\nStreet'}, {region:'Hi\rthere'},
  ]) assert.throws(() => normalizeCheckoutDestinationV2({...d,...changed}),/checkout_destination_.*_invalid/);
});

test('postal variants normalize to identical shipping receipt digest but address never goes into the hash', () => {
  const a=normalizeCheckoutDestinationV2(input());
  const b=normalizeCheckoutDestinationV2({...input(),postal_code:'10-001',address_line1:'Another street'});
  const resultA=verifyCheckoutDestinationV2Binding(a,binding(),'2026-10-08T20:00:00Z','standard');
  const resultB=verifyCheckoutDestinationV2Binding(b,binding(),'2026-10-08T20:00:00Z','standard');
  assert.equal(resultA.destination_sha256,resultB.destination_sha256);
  assert.equal(resultA.destination_sha256,digest('US','10001'));
  assert.equal(resultA.country,'US');
  assert.equal(resultA.postal_code,'10001');
});

test('shipping receipt must be current, exact destination, method and EUR, with all payment flags disabled', () => {
  const d=normalizeCheckoutDestinationV2(input());
  for(const changed of [
    {destination_country:'CA'}, {destination_postal_code:'99999'},
    {destination_sha256:'f'.repeat(64)}, {shipping_method:'express'},
  ]) assert.throws(
    () => verifyCheckoutDestinationV2Binding(d,{...binding(),...changed} as ReturnType<typeof binding>,'2026-10-08T20:00:00Z','standard'),
    /checkout_destination_shipping_mismatch/);
  assert.throws(() => verifyCheckoutDestinationV2Binding(d,binding(),'2026-10-08T20:15:00Z','standard'),/shipping_expired/);
  for(const changed of [
    {currency:'USD'}, {payable:true}, {payment_enabled:true}, {provider_session_enabled:true},
  ]) assert.throws(
    () => verifyCheckoutDestinationV2Binding(d,{...binding(),...changed} as ReturnType<typeof binding>,'2026-10-08T20:00:00Z','standard'),
    /checkout_destination_authority_invalid/);
  assert.throws(() => verifyCheckoutDestinationV2Binding(d,binding(),'not-time','standard'),/checkout_destination_time_invalid/);
});
