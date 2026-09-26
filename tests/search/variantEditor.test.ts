import test from 'node:test';
import assert from 'node:assert/strict';
import { addEditorAttribute, addEditorConfiguration, addEditorVariant, editorSnapshot, parsePendingVariant,
  parseVariantEditorContext, pendingVariantKey, prepareEditorSave, serializePendingVariant, updateEditorAttribute,
  type VariantEditorContext } from '../../lib/commerceVariantEditor.ts';
import { validateVariantTransition } from '../../lib/commerceVariantContract.ts';
const id=(n:number)=>`20000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const context:VariantEditorContext={contract_version:'product_variant_draft_v1',canonical_product_id:id(1),editor_actor_id:id(2),current_revision:0,snapshot:null,snapshot_sha256:null,
  source_bindings:{product_fingerprint:'a'.repeat(32),configurations:[{configuration_price_id:id(3),sellable_configuration_id:id(4),price_fingerprint:'b'.repeat(32),configuration_fingerprint:'c'.repeat(32)}]},
  configuration_context:[{configuration_price_id:id(3),sellable_configuration_id:id(4),source_label:'Full set',source_amount:100,source_currency:'EUR',public_price_amount:90,manual_override_amount:80,price_status:'draft',review_status:'not_reviewed'}],
  draft_only:true,can_publish:false,can_index:false,can_enable_checkout:false};
const configuration=()=>addEditorConfiguration(editorSnapshot(context),context,id(3),id(5));
function twoColors(){let s=configuration();s=addEditorAttribute(s,'colors','Gold',id(6));s=addEditorAttribute(s,'colors','Silver',id(7));return s;}
test('initial editor neither creates inventory nor chooses a source price precedence',()=>{
  assert.deepEqual(editorSnapshot(context).configurations,[]);const s=configuration();assert.equal(s.configurations[0].base_price.amount_minor,null);
  assert.equal(s.configurations[0].base_price.status,'unverified');assert.equal(s.configurations[0].base_price.currency,'EUR');assert.deepEqual(s.variants,[]);
  assert.throws(()=>addEditorConfiguration(s,context,id(3),id(10)),/уже/);
  const unknown=structuredClone(context);unknown.configuration_context[0].source_currency=null;
  assert.throws(()=>addEditorConfiguration(editorSnapshot(unknown),unknown,id(3),id(10)),/валюты/);
});
test('adding colors never creates a Cartesian product or another price',()=>{
  const s=twoColors();assert.equal(s.configurations.length,1);assert.equal(s.variants.length,0);
  const one=addEditorVariant(s,{configuration_price_id:id(3),color_id:id(6),size_id:null},id(8));
  const two=addEditorVariant(one,{configuration_price_id:id(3),color_id:id(7),size_id:null},id(9));
  assert.deepEqual(two.configurations,configuration().configurations);assert.equal(two.variants.length,2);
  assert.ok(two.variants.every(v=>v.state==='draft'&&v.pricing.mode==='configuration_base'));
  assert.throws(()=>addEditorVariant(two,two.variants[0],id(10)),/уже/);
  assert.throws(()=>addEditorVariant(two,{configuration_price_id:id(3),color_id:id(99),size_id:null},id(10)),/действующий/);
});
test('rename, archive and restoration retain tuple IDs, base quote and explicit exception',()=>{
  let s=addEditorVariant(twoColors(),{configuration_price_id:id(3),color_id:id(7),size_id:null},id(9));
  s.variants[0].pricing={mode:'exception_override',exception_id:id(11),reason:'Existing separate proposal',price:{...s.configurations[0].base_price,quote_id:id(12)}};
  let next=updateEditorAttribute(s,'colors',id(7),{label:'Glossy Silver'});next=updateEditorAttribute(next,'colors',id(7),{state:'retired'});
  assert.equal(next.variants[0].state,'retired');assert.equal(next.variants[0].variant_id,id(9));assert.deepEqual(next.variants[0].pricing,s.variants[0].pricing);
  assert.deepEqual(next.configurations,s.configurations);next=updateEditorAttribute(next,'colors',id(7),{state:'confirmed'});assert.equal(next.variants[0].state,'retired');
  next.product_revision=2;validateVariantTransition(s,next);
});
test('ambiguous repeated labels and invalid new attribute names are held',()=>{
  const s=twoColors();assert.throws(()=>addEditorAttribute(s,'colors',' gold ',id(10)),/уже/);assert.throws(()=>addEditorAttribute(s,'sizes',' ',id(10)),/название/);
  const changed=updateEditorAttribute(s,'colors',id(7),{label:'Gold'});assert.throws(()=>prepareEditorSave(context,changed,id(11)),/различаться/);
});
test('pending request survives a later revision without regenerating IDs or payload',()=>{
  const request=prepareEditorSave(context,twoColors(),id(20)),raw=serializePendingVariant(context,request);
  const later={...context,current_revision:5};assert.deepEqual(parsePendingVariant(raw,later),request);
  assert.equal(parsePendingVariant(raw,later).expected_revision,0);assert.equal(parsePendingVariant(raw,later).snapshot.configurations[0].base_price.quote_id,id(5));
});
test('pending cache is separated by actor/product and rejects altered request scope',()=>{
  const request=prepareEditorSave(context,twoColors(),id(20)),raw=serializePendingVariant(context,request);
  assert.notEqual(pendingVariantKey(id(2),id(1)),pendingVariantKey(id(30),id(1)));
  assert.throws(()=>parsePendingVariant(raw,{...context,editor_actor_id:id(30)}),/пользователю/);
  assert.throws(()=>parsePendingVariant(raw,{...context,canonical_product_id:id(30)}),/товару/);
  const tampered=JSON.parse(raw);tampered.request.actor_user_id=id(2);assert.throws(()=>parsePendingVariant(JSON.stringify(tampered),context),/variant_/);
});
test('editor wire reader rejects actor omission and foreign or duplicate source context',()=>{
  assert.equal(parseVariantEditorContext(context,id(1)).editor_actor_id,id(2));
  assert.throws(()=>parseVariantEditorContext({...context,editor_actor_id:null},id(1)),/пользователя/);
  const foreign=structuredClone(context);foreign.configuration_context[0].sellable_configuration_id=id(40);
  assert.throws(()=>parseVariantEditorContext(foreign,id(1)),/variant_reader_contract_invalid/);
  const duplicate=structuredClone(context);duplicate.configuration_context.push(duplicate.configuration_context[0]);
  assert.throws(()=>parseVariantEditorContext(duplicate,id(1)),/variant_reader_contract_invalid/);
});
