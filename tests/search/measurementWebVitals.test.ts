import assert from 'node:assert/strict';
import test from 'node:test';
import type {Metric} from 'web-vitals';
import {createWebVitalsCollector,resolveWebVitalContext} from '../../lib/measurementWebVitals.ts';
import type {FeyaMeasurementPageContext} from '../../lib/measurementContract.ts';

function metric(overrides:Partial<Metric>={}):Metric{
  return{name:'LCP',id:'v6-document-1',value:1800,delta:1800,rating:'good',
    entries:[],navigationType:'navigate',navigationId:0,
    navigationURL:'https://thefeya.com/collections/bodysuits',...overrides};
}

function fixture(){
  let allowed=false;
  let loads=0;
  const callbacks:Array<(sample:Metric)=>void>=[];
  const sent:Metric[]=[];
  const library={
    onCLS:(callback:(sample:Metric)=>void)=>{callbacks.push(callback);},
    onINP:(callback:(sample:Metric)=>void)=>{callbacks.push(callback);},
    onLCP:(callback:(sample:Metric)=>void)=>{callbacks.push(callback);},
  };
  const collector=createWebVitalsCollector({
    load:async()=>{loads++;return library;},
    allowed:()=>allowed,
    send:(sample)=>{sent.push(sample);return true;},
  });
  return{collector,library,callbacks,sent,get loads(){return loads;},allow:(value:boolean)=>{allowed=value;}};
}

test('disabled production analytics or absent consent never downloads the Web Vitals SDK',async()=>{
  const f=fixture();
  await f.collector.start();
  assert.equal(f.loads,0);
  assert.equal(f.callbacks.length,0);
});

test('concurrent starts and subsequent SPA context changes register one observer per metric',async()=>{
  const f=fixture();f.allow(true);
  await Promise.all([f.collector.start(),f.collector.start()]);
  await f.collector.start();
  assert.equal(f.loads,1);
  assert.equal(f.callbacks.length,3);
  f.callbacks[2](metric());
  assert.equal(f.sent.length,1);
});

test('consent withdrawal during SDK loading prevents observer registration',async()=>{
  const f=fixture();let allowed=true;
  let resolveLoad!:(value:typeof f.library)=>void;
  const collector=createWebVitalsCollector({
    load:()=>new Promise((resolve)=>{resolveLoad=resolve;}),
    allowed:()=>allowed,send:()=>true,
  });
  const loading=collector.start();
  allowed=false;collector.disable();resolveLoad(f.library);
  await loading;
  allowed=true;await collector.start();
  assert.equal(f.callbacks.length,0);
});

test('late reports stop on a closed gate and cannot resume after document exclusion',async()=>{
  const f=fixture();f.allow(true);await f.collector.start();
  f.allow(false);f.callbacks[2](metric());
  assert.equal(f.sent.length,0);
  f.collector.disable();f.allow(true);
  f.callbacks[2](metric());await f.collector.start();
  assert.equal(f.sent.length,0);
  assert.equal(f.loads,1);
});

test('reports retain IDs and signed deltas; unchanged callbacks do not duplicate the sample',async()=>{
  const f=fixture();f.allow(true);await f.collector.start();
  const emit=f.callbacks[1];
  emit(metric({name:'INP',value:200,delta:200}));
  emit(metric({name:'INP',value:200,delta:0}));
  emit(metric({name:'INP',value:150,delta:-50}));
  emit(metric({name:'INP',value:200,delta:50}));
  emit(metric({id:'v6-bfcache-2',name:'INP',value:100,delta:100,navigationType:'back-forward-cache'}));
  emit(metric({value:Number.NaN}));emit(metric({delta:Number.POSITIVE_INFINITY}));
  assert.deepEqual(f.sent.map(({id,value,delta})=>({id,value,delta})),[
    {id:'v6-document-1',value:200,delta:200},
    {id:'v6-document-1',value:150,delta:-50},
    {id:'v6-document-1',value:200,delta:50},
    {id:'v6-bfcache-2',value:100,delta:100},
  ]);
});

test('delayed metrics use their navigation page IDs, discard query data and reject private/unknown origins',()=>{
  const initial:FeyaMeasurementPageContext={
    page_id:'11111111-1111-4111-8111-111111111111',page_version_id:'22222222-2222-4222-8222-222222222222',
    release_id:'33333333-3333-4333-8333-333333333333',canonical_product_id:null,
    path:'/collections/bodysuits',environment:'production',measurement_enabled:true,ga4_measurement_id:'G-TEST123',
  };
  const next={...initial,page_id:'44444444-4444-4444-8444-444444444444',path:'/collections/costume-belts'};
  const contexts=new Map([[initial.path,initial],[next.path,next],['/admin',initial]]);
  const resolve=(url:string|undefined)=>resolveWebVitalContext(url,initial.path,'https://thefeya.com',contexts);
  assert.equal(resolve('https://thefeya.com/collections/bodysuits/?private=query#anchor')?.page_id,initial.page_id);
  assert.equal(resolve('https://thefeya.com/collections/costume-belts')?.page_id,next.page_id);
  assert.equal(resolve(undefined)?.page_version_id,initial.page_version_id);
  assert.equal(resolve('https://other.example/collections/bodysuits'),null);
  assert.equal(resolve('https://thefeya.com/admin'),null);
  assert.equal(resolve('https://thefeya.com/api/measurement'),null);
  assert.equal(resolve('https://thefeya.com/unknown'),null);
});
