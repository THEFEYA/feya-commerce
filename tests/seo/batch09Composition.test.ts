import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import { applyOwnerReviewedStorefrontCorrections as correct } from '../../lib/storefrontOwnerReviewedCorrections.ts';
import { resolveStorefrontSellableOffer as offer } from '../../lib/storefrontSellableOffer.ts';
import { partitionListingMasterComponentAxes } from '../../lib/listingMasterSearchAxisContract.ts';
import { resolveThefeyaRightPdpPanel } from '../../lib/thefeyaSeoDoctrine.ts';
const products=JSON.parse(fs.readFileSync(new URL('./fixtures/batch09Offers.json',import.meta.url),'utf8'));

test('Batch09 source options resolve without changing prices, identities or owner axes',()=>{
 for(const p of products){
  const original=JSON.stringify(p),fixed=correct(p),truth=offer(fixed);
  assert.equal(truth.status,'ready',JSON.stringify(truth.blockers));
  assert.equal(JSON.stringify(p),original);
  assert.deepEqual(fixed.configurations.map(r=>[r.configuration_id,r.display_price_amount]),p.configurations.map(r=>[r.configuration_id,r.display_price_amount]));
  assert.deepEqual(correct(fixed),fixed);
 }
 for(const p of products.slice(0,2)){
  const truth=offer(p),selected=['bodysuit','spine'];
  assert.ok(truth.component_codes.includes('tail'));
  assert.deepEqual(partitionListingMasterComponentAxes(selected,truth).selected,selected);
 }
 assert.equal(correct(products[0]).configurations.find(r=>r.component_code==='arms').public_label,'Glove');
 assert.ok(offer(products[3]).component_codes.includes('top'));
 assert.equal(correct({...products[3],canonical_product_id:'unreviewed'}).configurations,products[3].configurations);
});

test('mixed material panels keep fabric, acrylic and uncertain substrates distinct',()=>{
 const panel=(i,key)=>resolveThefeyaRightPdpPanel({canonical_product_id:products[i].canonical_product_id}).find(b=>b.block_key===key)!.body;
 assert.match(panel(1,'material'),/black fabric.*vegan-leather/);
 assert.match(panel(2,'material'),/fabric base.*acrylic.*plastic/);
 assert.doesNotMatch(panel(2,'material'),/vegan leather|reflective/i);
 assert.match(panel(2,'care'),/Avoid.*alcohol wipes/);
 assert.doesNotMatch(panel(4,'material'),/leather|acrylic|plastic/i);
});
