import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';
import {getBusinessCaseLandingCandidates} from '../../config/searchLandingCandidates.ts';

function tokens(value:string){
  return new Set(value.toLowerCase().replace(/[^a-z0-9 ]+/g,' ').split(/\s+/).filter((x)=>x.length>2));
}
function jaccard(a:string,b:string){
  const A=tokens(a),B=tokens(b);
  let intersection=0;
  for(const token of A)if(B.has(token))intersection+=1;
  const union=new Set([...A,...B]).size;
  return union?intersection/union:0;
}

test('Phase E content packs cover every and only current business-case collection',async()=>{
  const raw=await readFile(new URL('../../docs/search/phase-e-search-landing-content-packs-draft-20260926.json',import.meta.url),'utf8');
  const pack=JSON.parse(raw);
  const expected=getBusinessCaseLandingCandidates().map((x)=>'/collections/'+x.slug).sort();
  const actual=pack.pages.map((x:any)=>x.path).sort();
  assert.deepEqual(actual,expected);
  assert.equal(pack.status,'DRAFT_CQA_PASS_RELEASE_HOLD');
  assert.equal(pack.rules.index_authorized,false);
});

test('Phase E packs satisfy deterministic content-quality bounds without keyword stuffing',async()=>{
  const raw=await readFile(new URL('../../docs/search/phase-e-search-landing-content-packs-draft-20260926.json',import.meta.url),'utf8');
  const pack=JSON.parse(raw);
  const titles=new Set<string>(),h1s=new Set<string>(),metas=new Set<string>();
  const forbidden=/elevate your look|perfect for any occasion|crafted to perfection|\bbdsm\b|\bfetish\b/i;

  for(const page of pack.pages){
    assert.ok(page.seo_title.length>=25&&page.seo_title.length<=65,page.path+': title length');
    assert.ok(page.meta_description.length>=120&&page.meta_description.length<=170,page.path+': meta length');
    const introWords=String(page.intro).trim().split(/\s+/).length;
    assert.ok(introWords>=40&&introWords<=100,page.path+': intro length');
    assert.ok(page.modules.length>=2,page.path+': useful modules');
    assert.ok(page.related_links.length>=3,page.path+': related links');
    assert.ok(page.faq.length<=4,page.path+': FAQ is selective');
    const prose=[page.seo_title,page.h1,page.meta_description,page.intro,...page.modules.map((x:any)=>x.body),...page.faq.flatMap((x:any)=>[x.q,x.a])].join(' ');
    assert.doesNotMatch(prose,forbidden,page.path+': forbidden filler/risk vocabulary');
    assert.equal(titles.has(page.seo_title),false,page.path+': duplicate title');
    assert.equal(h1s.has(page.h1),false,page.path+': duplicate H1');
    assert.equal(metas.has(page.meta_description),false,page.path+': duplicate meta');
    titles.add(page.seo_title);h1s.add(page.h1);metas.add(page.meta_description);
  }
});

test('Phase E collection prose is differentiated rather than keyword-swapped',async()=>{
  const raw=await readFile(new URL('../../docs/search/phase-e-search-landing-content-packs-draft-20260926.json',import.meta.url),'utf8');
  const pack=JSON.parse(raw);
  for(let i=0;i<pack.pages.length;i++){
    for(let j=i+1;j<pack.pages.length;j++){
      const a=pack.pages[i],b=pack.pages[j];
      const aText=[a.intro,...a.modules.map((x:any)=>x.body)].join(' ');
      const bText=[b.intro,...b.modules.map((x:any)=>x.body)].join(' ');
      assert.ok(jaccard(aText,bText)<0.35,a.path+' vs '+b.path+': excessive prose overlap');
    }
  }
});

test('all proposed collection links stay inside the evidence-backed business-case graph',async()=>{
  const raw=await readFile(new URL('../../docs/search/phase-e-search-landing-content-packs-draft-20260926.json',import.meta.url),'utf8');
  const pack=JSON.parse(raw);
  const allowed=new Set(pack.pages.map((x:any)=>x.path));
  for(const page of pack.pages){
    for(const link of page.related_links){
      assert.ok(allowed.has(link.href),page.path+': unsupported related target '+link.href);
      assert.notEqual(link.href,page.path,page.path+': self-link');
      assert.ok(String(link.anchor).trim().length>2,page.path+': empty anchor');
    }
  }
});
