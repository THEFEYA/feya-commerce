// Read current public selected landings. No Google, database or checkout writes.
import {readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {inspectPublicPage} from './capture-catalog.mjs';

const [capturePath,outputPath]=process.argv.slice(2);
assert.ok(capturePath&&outputPath,'usage: capture-selected-landings.mjs capture.json output.json');
const capture=JSON.parse(readFileSync(capturePath,'utf8'));
const candidates=JSON.parse(readFileSync(new URL('../../docs/merchant/variant-landings-20261106/configuration_photo_candidates.json',import.meta.url),'utf8'));
const pins=JSON.parse(readFileSync(new URL('../../config/approved-content-review-bindings.json',import.meta.url),'utf8')).entries;
const selected=[];
// All14 reviewed bindings are checked. Keep the seven already-published solo
// configurations; add the three remaining true pairs and the unspecified-gender
// full set. Audience mapping is separately governed in the feed builder.
for(const candidate of candidates.bindings){
  const res=await fetch(candidate.landing_url_example,{redirect:'error',signal:AbortSignal.timeout(30000)});
  assert.equal(res.status,200);
  const html=await res.text();
  const pin=pins.find(p=>p.canonical_product_id===candidate.canonical_product_id);
  const p=inspectPublicPage(html,candidate.base_url,pin,capture.deployment_id,candidate.landing_url_example);
  assert.equal(p.selected_configuration.id,candidate.configuration_id);
  assert.equal(p.selected_configuration.unit_minor,candidate.unit_minor);
  assert.equal(p.selected_landing.image_url,candidate.photo_url);
  selected.push(p);
}
const eligible=selected.filter(p=>{
  const c=candidates.bindings.find(c=>c.configuration_id===p.selected_configuration.id);
  return (c.source_gender&&c.role!=='alternative'&&!c.paired_selection)
    ||['4488185754','4489232697','4488971627','1780729637'].includes(c.etsy_tail);
});
assert.equal(eligible.length,11);
assert.equal(new Set(eligible.map(p=>p.canonical_product_id)).size,11);
for(const p of eligible)capture.products[capture.products.findIndex(x=>x.canonical_product_id===p.canonical_product_id)]=p;
capture.selected_landing_readback={observed_at:new Date().toISOString(),checked:14,qualified_products:11,
  configurations:selected.map(p=>({canonical_product_id:p.canonical_product_id,...p.selected_configuration,...p.selected_landing}))};
capture.captured_at=new Date().toISOString();
writeFileSync(outputPath,JSON.stringify(capture,null,2)+'\n');
console.log(JSON.stringify({deployment_id:capture.deployment_id,checked:14,qualified_products:11}));
