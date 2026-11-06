import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {isSavedPiece,parseSavedPieces,toggleSavedPiece,productShareUrl} from '../../lib/savedPieces.ts';
import {FEYA_SOCIAL_PROFILES} from '../../config/socialProfiles.ts';

const piece={id:'057fbd51-52f5-4404-b126-e5d75b8599f4',slug:'gold-matching-couple-1765624488',title:'Gold couple set',image:'https://example.test/piece.jpg'};

test('saved shortlist toggles by product identity without prices, orders or buyer details',()=>{
  const saved=toggleSavedPiece([],piece);
  assert.deepEqual(saved,[piece]);
  const read=parseSavedPieces(JSON.stringify([{...piece,price:460.44,email:'never-retain@example.test'},piece]));
  assert.deepEqual(read,[piece]);
  assert.deepEqual(toggleSavedPiece(read,{...piece,title:'newer title'}),[]);
  assert.deepEqual(saved,[piece],'never mutate a caller snapshot');
});

test('invalid saved data cannot create external links, scripts or an unbounded shortlist',()=>{
  for(const raw of [null,'{broken','{}','null','[]','x'.repeat(1_000_001)])assert.deepEqual(parseSavedPieces(raw),[]);
  for(const patch of [{slug:'//evil.test'},{slug:'../admin'},{slug:'piece?token=private'},{slug:'piece#fragment'},
    {id:'fake'},{image:'javascript:alert(1)'},{image:'https://secret@example.test/x'},{title:''}]){
    assert.equal(isSavedPiece({...piece,...patch}),false);
    assert.deepEqual(parseSavedPieces(JSON.stringify([{...piece,...patch}])),[]);
  }
  const many=Array.from({length:300},(_,i)=>({...piece,id:'00000000-0000-4000-8000-'+String(i).padStart(12,'0')}));
  assert.equal(parseSavedPieces(JSON.stringify(many)).length,207);
});

test('shared product link is the bare canonical URL, never current query strings or account information',()=>{
  assert.equal(productShareUrl(piece.slug),'https://thefeya.com/shop/'+piece.slug);
  for(const slug of ['//evil.test','piece?utm_source=x','piece#private','../account'])assert.throws(()=>productShareUrl(slug));
  const share=readFileSync('components/ProductShareButton.tsx','utf8');
  assert.match(share,/await navigator\.clipboard\.writeText\(url\)/);
  assert.match(share,/navigator\.share\(\{title,url\}\)/);
  assert.match(share,/AbortError/);
  assert.doesNotMatch(share,/fetch\(|window\.location\.href|facebook\.com\/sharer/);
});

test('social profiles are the verified brand destinations, and policy actions have real routes',()=>{
  assert.deepEqual(FEYA_SOCIAL_PROFILES.map(p=>p.href),[
    'https://www.instagram.com/feyaportupeya/',
    'https://www.facebook.com/feyaportupeya/',
    'https://www.pinterest.com/TheFEYAshop/',
  ]);
  const links=readFileSync('components/SocialProfileLinks.tsx','utf8');
  assert.match(links,/href=\{href\}/);assert.match(links,/noopener noreferrer/);
  const pdp=readFileSync('components/ProductDetailClient.tsx','utf8');
  assert.doesNotMatch(pdp,/href="#(?:save|share|returns|policies)"/);
  for(const route of ['/shipping','/returns','/terms'])assert.ok(pdp.includes('href="'+route+'"'));
});

test('Collections uses the same approved tile strip and ten unchanged governed destinations',()=>{
  const component=readFileSync('components/CollectionsDirectoryV13.tsx','utf8');
  assert.match(component,/OwnerDiscoveryTileStrip tiles=\{group\.tiles\}/);
  assert.doesNotMatch(component,/xl:grid-cols-5|visual-tile-label-band|tile\.pieceCount/);
  const layout=readFileSync('app/collections/layout.tsx','utf8');
  assert.match(layout,/isApprovedV13Presentation/);
  assert.match(layout,/CollectionsDirectoryV13/);
});
