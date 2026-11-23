import assert from 'node:assert/strict';
import test from 'node:test';
import {cartQuoteEvent, type CartFunnelEvent, type FeyaMeasurementPageContext} from '../../lib/measurementContract.ts';
import {setAnalyticsConsent,setMeasurementPageContext,trackCartStageOnce} from '../../lib/measurementClient.ts';

test('only a settled destination quote counts as a total; actual recovery and other failures are distinct',()=>{
  assert.equal(cartQuoteEvent(null),null);
  assert.equal(cartQuoteEvent({ok:true,country_selected:false,amounts:{total_minor:19854}}),null);
  assert.equal(cartQuoteEvent({ok:true,country_selected:true}),null);
  assert.equal(cartQuoteEvent({ok:true,country_selected:true,amounts:{total_minor:NaN}}),null);
  assert.equal(cartQuoteEvent({ok:true,country_selected:true,amounts:{total_minor:19854}}),'cart_quote_ready');
  assert.equal(cartQuoteEvent({ok:false,colour_recovery:{choices:[]}}),'cart_colour_blocked');
  assert.equal(cartQuoteEvent({ok:false}),'cart_quote_failed');
});

test('cart stages respect explicit consent and live route, retry independently, and contain no private inputs',t=>{
  const events:{name:string;parameters:Record<string,unknown>}[]=[];
  let unavailable=false;
  function storage(){
    const values=new Map<string,string>();
    return {getItem:(key:string)=>values.get(key)??null,
      setItem:(key:string,value:string)=>values.set(key,value),removeItem:(key:string)=>values.delete(key)};
  }
  const location=new URL('https://shop.invalid/cart?contact=private#order-private');
  const fakeWindow=Object.assign(new EventTarget(),{location,localStorage:storage(),sessionStorage:storage(),crypto,
    gtag(command:string,name:string,parameters:Record<string,unknown>){
      if(command!=='event')return;
      if(unavailable)throw new Error('analytics unavailable');
      events.push({name,parameters});
    }});
  Object.defineProperty(globalThis,'window',{value:fakeWindow,configurable:true});
  Object.defineProperty(globalThis,'document',{value:{getElementById:()=>({})},configurable:true});
  t.after(()=>{
    setMeasurementPageContext(null);
    Reflect.deleteProperty(globalThis,'window');
    Reflect.deleteProperty(globalThis,'document');
  });
  const page:FeyaMeasurementPageContext={page_id:'11111111-1111-4111-8111-111111111111',
    page_version_id:null,release_id:null,canonical_product_id:null,path:'/cart',environment:'production',
    measurement_enabled:true,ga4_measurement_id:'G-TEST123'};
  const reported=new Set<CartFunnelEvent>();
  const observe=(event:CartFunnelEvent)=>trackCartStageOnce(event,reported);
  setMeasurementPageContext(page);
  observe('cart_colour_blocked');
  setAnalyticsConsent('denied');
  observe('cart_colour_blocked');
  assert.deepEqual([...reported],[]);
  assert.equal(events.length,0);
  setMeasurementPageContext({...page,path:'/shop'});
  setAnalyticsConsent('granted');
  observe('cart_quote_ready');
  assert.equal(events.length,0,'the pending SPA route must not label this stage with a product page');
  setMeasurementPageContext({...page,environment:'preview',measurement_enabled:false});
  observe('cart_quote_ready');
  assert.equal(events.length,0);
  setMeasurementPageContext(page);
  observe('cart_quote_ready');
  observe('cart_quote_ready');
  assert.deepEqual(events.map(e=>e.name),['cart_quote_ready'],'historic pre-consent colour issue is not replayed');
  observe('cart_payment_ready');
  observe('cart_start_failed');
  observe('cart_payment_ready');
  observe('cart_start_failed');
  unavailable=true;
  assert.doesNotThrow(()=>observe('cart_provider_handoff'));
  assert.ok(!reported.has('cart_provider_handoff'));
  unavailable=false;
  observe('cart_provider_handoff');
  observe('cart_provider_handoff');
  assert.deepEqual(events.map(e=>e.name),['cart_quote_ready','cart_payment_ready','cart_start_failed','cart_provider_handoff']);
  for(const {parameters} of events){
    assert.equal(parameters.page_location,'https://shop.invalid/cart');
    assert.equal(parameters.page_referrer,'');
    assert.equal(parameters.transaction_id,undefined);
    assert.equal(parameters.items,undefined);
    assert.doesNotMatch(JSON.stringify(parameters),/private/);
  }
  location.pathname='/order';
  observe('cart_total_changed');
  assert.ok(!reported.has('cart_total_changed'),'late responses after the buyer leaves cannot be attributed to the cart');
  location.pathname='/cart';
  setAnalyticsConsent('denied');
  observe('cart_total_changed');
  assert.ok(!reported.has('cart_total_changed'));
});
