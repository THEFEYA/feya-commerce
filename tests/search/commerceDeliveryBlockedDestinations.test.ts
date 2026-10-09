import test from 'node:test';
import assert from 'node:assert/strict';
import { isFeyaBlockedExportDestination, FEYA_BLOCKED_EXPORT_COUNTRY_CODES } from '../../lib/commerceShippingBlockedDestinations.ts';
import { previewDeliveryDraft, parseDeliveryWorkspace } from '../../lib/commerceDeliveryWorkspace.ts';
import { deliveryApprovalReadiness } from '../../lib/commerceDeliveryApproval.ts';
import { syntheticDeliveryWorkspace, syntheticDeliveryRequest, syntheticDeliveryCatalog, deliveryIds } from '../fixtures/commerceDeliveryWorkspace.ts';

test('22 temporarily blocked Ukrposhta countries plus KP cannot become a payable export route',()=>{
  assert.equal(FEYA_BLOCKED_EXPORT_COUNTRY_CODES.length,23);
  for(const code of FEYA_BLOCKED_EXPORT_COUNTRY_CODES) assert.equal(isFeyaBlockedExportDestination(code),true,code);
  for(const code of ['US','GB','JP','AU','MX','NZ','SA']) assert.equal(isFeyaBlockedExportDestination(code),false,code);
});

test('historical draft may be inspected but RU/BY/SY are blocked at shipping preview, not silently treated as served',()=>{
  const d=syntheticDeliveryWorkspace();
  d.shipping_profiles[0].served_countries.push('RU','BY','SY');
  assert.doesNotThrow(()=>parseDeliveryWorkspace(d)); // allow owner to fix older saved draft
  for(const country of ['RU','BY','SY']) {
    assert.throws(()=>previewDeliveryDraft(d,{...syntheticDeliveryRequest(),country},syntheticDeliveryCatalog,deliveryIds.version,'2026-10-09T14:00:00.000Z'),/delivery_country_blocked/);
  }
  assert.equal(previewDeliveryDraft(d,syntheticDeliveryRequest(),syntheticDeliveryCatalog,deliveryIds.version,'2026-10-09T14:00:00.000Z').shipping_amount_minor,1900);
});

test('any prohibited country in an otherwise valid owner country list is an explicit approval blocker',()=>{
  const d=syntheticDeliveryWorkspace();
  d.shipping_profiles[0].served_countries.push('RU','IR','BY');
  const audit=deliveryApprovalReadiness(d,syntheticDeliveryCatalog);
  assert.equal(audit.ready,false);
  assert.deepEqual(audit.issues.filter(x=>x.code==='delivery_country_blocked').length,3);
  assert.equal(audit.payment_enabled,false);
  assert.equal(audit.public_rates_enabled,false);
});
