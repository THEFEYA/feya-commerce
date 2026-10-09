import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { prepareUniversalBuyerShippingDraft, summarizeDeliveryApprovalIssues } from '../../lib/commerceUniversalBuyerShippingDraft.ts';
import { parseDeliveryWorkspace, previewDeliveryDraft } from '../../lib/commerceDeliveryWorkspace.ts';
import { syntheticDeliveryWorkspace, syntheticDeliveryCatalog, deliveryIds } from '../fixtures/commerceDeliveryWorkspace.ts';

test('real owner v15-style unpriced Standart draft is reused, no duplicate default, and all manufacturing assignments survive', () => {
  const src = syntheticDeliveryWorkspace();
  src.shipping_profiles[0] = { ...src.shipping_profiles[0], name: 'Standart', served_countries: [],
    max_units_per_parcel: null, rules: [{...src.shipping_profiles[0].rules[0],
      standard: {amount_minor:null,transit:null,calendar: {working_weekdays:[1,2,3,4,5],holidays:[]}},
      express: null}] };
  src.default_shipping_profile_id = null;
  src.default_production_profile_id = null;
  src.assignments = syntheticDeliveryCatalog.map(p => ({
    canonical_product_id:p.canonical_product_id, configuration_price_id:null, shipping_profile_id:null,
    production_profile_id:src.production_profiles[0].id,
  }));
  const id = src.shipping_profiles[0].id, ruleId = src.shipping_profiles[0].rules[0].id;
  const before = structuredClone(src);
  const d = prepareUniversalBuyerShippingDraft(src, randomUUID);
  assert.equal(d.shipping_profiles.length,1);
  assert.equal(d.shipping_profiles[0].id,id);
  assert.equal(d.shipping_profiles[0].rules[0].id,ruleId);
  assert.equal(d.default_shipping_profile_id,id);
  assert.equal(d.shipping_profiles[0].currency,'EUR');
  assert.equal(d.shipping_profiles[0].rules[0].standard?.amount_minor,1900);
  assert.equal(d.shipping_profiles[0].rules[0].express?.amount_minor,3500);
  const zone=d.shipping_profiles[0].rules.find(r => r.scope === 'zone');
  assert.deepEqual(zone?.countries,['AU','MX','NZ']);
  assert.equal(zone?.standard?.amount_minor,3900);
  assert.equal(zone?.express?.amount_minor,5500);
  assert.equal(d.shipping_profiles[0].max_units_per_parcel,null); // Never invent packaging
  assert.deepEqual(d.assignments,before.assignments);
  assert.deepEqual(d.production_profiles,before.production_profiles);
  assert.deepEqual(src,before);
  assert.equal(prepareUniversalBuyerShippingDraft(d,randomUUID).shipping_profiles.length,1);
  assert.doesNotThrow(() => parseDeliveryWorkspace(d));
});

test('buyer selects ONE cart-wide standard/express method; parcel price and date use slowest product manufacturing', () => {
  const d=prepareUniversalBuyerShippingDraft(syntheticDeliveryWorkspace(),randomUUID);
  const sp=d.shipping_profiles.find(p => p.name.startsWith('TheFEYA — Standard'))!;
  d.shipping_profiles = d.shipping_profiles.filter(p => p.id === sp.id);
  d.default_shipping_profile_id=sp.id;
  sp.served_countries.push('US','SA');
  sp.max_units_per_parcel=5;
  const longId=randomUUID();
  d.production_profiles.push({...structuredClone(d.production_profiles[0]),id:longId,
    name:'Complex item 7–10 weekdays',duration:{min:7,max:10,unit:'business_days'}});
  d.assignments.push({
    canonical_product_id:deliveryIds.other,configuration_price_id:null,
    shipping_profile_id:null,production_profile_id:longId,
  });
  const lines=[
    {canonical_product_id:deliveryIds.product,configuration_price_id:deliveryIds.configuration,quantity:1,specifications_ready:true},
    {canonical_product_id:deliveryIds.other,configuration_price_id:deliveryIds.otherConfiguration,quantity:1,specifications_ready:true},
  ];
  const mk=(country:string, method:'standard'|'express') => previewDeliveryDraft(d,{
    country,postal_code:country==='US'?'10001':'',shipping_method:method,lines,
  },syntheticDeliveryCatalog,deliveryIds.version,'2026-10-09T10:00:00.000Z');
  const standard=mk('US','standard'),express=mk('US','express');
  assert.equal(standard.parcel_count,1);
  assert.equal(express.parcel_count,1);
  assert.equal(standard.shipping_amount_minor,1900);
  assert.equal(express.shipping_amount_minor,3500);
  assert.ok(standard.estimated_arrival.to > express.estimated_arrival.to);
  assert.ok(standard.parcels[0].estimate.production_ready.to >= express.parcels[0].estimate.production_ready.to);
  assert.equal(mk('AU','standard').shipping_amount_minor,3900); // Per PARCEL, not per item
  assert.equal(mk('MX','express').shipping_amount_minor,5500);
  assert.equal(mk('NZ','standard').shipping_amount_minor,3900);
  assert.equal(mk('SA','standard').shipping_amount_minor,1900);
  assert.equal(mk('SA','express').shipping_amount_minor,3500);
  assert.equal(standard.payment_enabled,false);
  assert.equal(express.payable,false);
});

test('configured owner shipping overrides and variant parcel exceptions remain unchanged', () => {
  const d=syntheticDeliveryWorkspace();
  d.assignments.push({canonical_product_id:deliveryIds.product,
    configuration_price_id:deliveryIds.configuration,shipping_profile_id:deliveryIds.shipping,production_profile_id:null});
  const before=structuredClone(d.assignments);
  const updated=prepareUniversalBuyerShippingDraft(d,randomUUID);
  assert.deepEqual(updated.assignments,before);
  assert.equal(updated.default_shipping_profile_id,deliveryIds.shipping);
  assert.equal(updated.shipping_profiles.length,2);
  assert.doesNotThrow(() => parseDeliveryWorkspace(updated));
});

test('group approval errors, do not repeat 207 identical messages to owner', () => {
  const many=Array.from({length:207},(_,i)=>({code:'delivery_profile_required',subject:'Product '+i}));
  many.push({code:'delivery_rate_missing',subject:'Base profile'});
  const groups=summarizeDeliveryApprovalIssues(many);
  assert.equal(groups.length,2);
  assert.equal(groups[0].count,207);
  assert.equal(groups[0].examples.length,2);
  assert.equal(groups[1].count,1);
});

test('saved owner revision 16 preserves EUR 19/35, 6–9 express and profile ID; blank countries are not worldwide', () => {
  const owner = syntheticDeliveryWorkspace();
  const profile = owner.shipping_profiles[0];
  profile.name = 'Standart/Express';
  profile.served_countries = [];
  profile.max_units_per_parcel = null;
  profile.rules[0].standard!.transit = { min: 10, max: 14, unit: 'business_days' };
  profile.rules[0].express!.transit = { min: 6, max: 9, unit: 'business_days' };
  owner.default_shipping_profile_id = null;
  owner.scheduling_time_zone = null;
  owner.cutoff_local = null;
  owner.production_profiles[0].max_units_per_order = null;
  owner.assignments = syntheticDeliveryCatalog.map(p => ({
    canonical_product_id: p.canonical_product_id, configuration_price_id: null,
    shipping_profile_id: null, production_profile_id: owner.production_profiles[0].id,
  }));

  const before = structuredClone(owner);
  const applied = prepareUniversalBuyerShippingDraft(owner, randomUUID);
  assert.equal(applied.shipping_profiles.length, 1);
  assert.equal(applied.shipping_profiles[0].id, profile.id);
  assert.equal(applied.shipping_profiles[0].name, profile.name);
  assert.equal(applied.shipping_profiles[0].rules[0].id, profile.rules[0].id);
  assert.equal(applied.default_shipping_profile_id, profile.id);
  assert.equal(applied.shipping_profiles[0].rules[0].standard?.amount_minor, 1900);
  assert.equal(applied.shipping_profiles[0].rules[0].express?.amount_minor, 3500);
  assert.deepEqual(applied.shipping_profiles[0].rules[0].express?.transit, { min: 6, max: 9, unit: 'business_days' });
  assert.deepEqual(applied.shipping_profiles[0].served_countries, ['AU', 'MX', 'NZ']);
  assert.deepEqual(applied.shipping_profiles[0].rules[1].countries, ['AU', 'MX', 'NZ']);
  assert.equal(applied.shipping_profiles[0].rules[1].standard?.amount_minor, 3900);
  assert.equal(applied.shipping_profiles[0].rules[1].express?.amount_minor, 5500);
  assert.deepEqual(applied.shipping_profiles[0].rules[1].express?.transit, { min: 6, max: 9, unit: 'business_days' });
  assert.deepEqual(applied.assignments, owner.assignments);
  assert.deepEqual(applied.production_profiles, owner.production_profiles);
  assert.equal(applied.scheduling_time_zone, null);
  assert.equal(applied.cutoff_local, null);
  assert.equal(applied.shipping_profiles[0].max_units_per_parcel, null);
  assert.equal(applied.shipping_profiles[0].served_countries.includes('US'), false);
  const again = prepareUniversalBuyerShippingDraft(applied, randomUUID);
  assert.deepEqual(again, applied); // owner can retry without extra profile/rule
  assert.deepEqual(owner, before);
  assert.doesNotThrow(() => parseDeliveryWorkspace(again));
});

test('saved custom country rule is not silently replaced by a second default profile', () => {
  const w = syntheticDeliveryWorkspace(), p = w.shipping_profiles[0];
  p.name = 'Standart/Express';
  p.rules.push({ id: randomUUID(), scope: 'country', countries: ['US'], postal_prefix: null,
    standard: p.rules[0].standard, express: p.rules[0].express });
  const updated = prepareUniversalBuyerShippingDraft(w, randomUUID);
  assert.equal(updated.shipping_profiles.length, 1);
  assert.equal(updated.shipping_profiles[0].rules.length, 2);
  assert.deepEqual(updated.shipping_profiles[0].rules[1].countries, ['US']);
});
