import assert from 'node:assert/strict';
import test from 'node:test';
import {ORDER_HELP_PATH, STUDIO_TOPICS, saveSupportOrderNumber, studioEnquiryMailto, takeSupportOrderNumber} from '../../lib/studioEnquiry.ts';

test('the studio email draft keeps user text in the body and only attaches order references to order topics',()=>{
  const topic=STUDIO_TOPICS.find(option=>option.label==='Damaged or faulty item')!;
  const text='Photo optional & follow-up?\nTaille / колір';
  const draft=new URL(studioEnquiryMailto(topic,' feya-123456 ',text));
  assert.equal(draft.pathname,'manager.feya@gmail.com');
  assert.equal(draft.searchParams.get('subject'),'TheFEYA · Damaged or faulty item');
  assert.equal(draft.searchParams.get('body'),'Order number: feya-123456\n\n'+text);
  assert.deepEqual([...draft.searchParams.keys()],['subject','body']);
  const general=new URL(studioEnquiryMailto(STUDIO_TOPICS[0],'FEYA-123456',text));
  assert.equal(general.searchParams.get('body'),text);
  assert.doesNotMatch(general.searchParams.get('subject')!,/FEYA-123456/);
  const freeform=new URL(studioEnquiryMailto(topic,'custom\n&cc=x','Please check'));
  assert.equal(freeform.searchParams.get('subject'),'TheFEYA · Damaged or faulty item');
  assert.equal(freeform.searchParams.get('body'),'Order number: custom\n&cc=x\n\nPlease check');
  assert.equal(freeform.searchParams.has('cc'),false);
  assert.equal(new URL(studioEnquiryMailto(topic,'','')).searchParams.get('body'),'');
});

test('a guest receipt hands off only a recognised public display number within the tab', t=>{
  const store=new Map<string,string>();
  const sessionStorage={
    getItem:(key:string)=>store.get(key)||null,
    setItem:(key:string,value:string)=>{store.set(key,value);},
    removeItem:(key:string)=>{store.delete(key);},
  };
  const original=Object.getOwnPropertyDescriptor(globalThis,'window');
  Object.defineProperty(globalThis,'window',{configurable:true,value:{sessionStorage}});
  t.after(()=>{if(original)Object.defineProperty(globalThis,'window',original);else Reflect.deleteProperty(globalThis,'window');});
  assert.equal(ORDER_HELP_PATH,'/contact#order-help');
  saveSupportOrderNumber('FEYA-123456');
  assert.deepEqual([...store.values()],['FEYA-123456']);
  assert.equal(takeSupportOrderNumber(),'FEYA-123456');
  assert.equal(takeSupportOrderNumber(),'');
  saveSupportOrderNumber('FEYA-123456789');
  saveSupportOrderNumber('#t=private-receipt-token');
  assert.equal(store.size,0); assert.equal(takeSupportOrderNumber(),'');
  Object.defineProperty(globalThis,'window',{configurable:true,value:{get sessionStorage(){throw new Error('disabled');}}});
  assert.doesNotThrow(()=>saveSupportOrderNumber('FEYA-123456'));
  assert.equal(takeSupportOrderNumber(),'');
});
