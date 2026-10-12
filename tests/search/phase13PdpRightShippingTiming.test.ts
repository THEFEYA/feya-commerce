import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('owner-current Express shipping promise is consistent in PDP right panel and Shipping',()=>{
 const source=readFileSync('lib/thefeyaSeoDoctrine.ts','utf8');
 const shipping=readFileSync('app/shipping-public-v13/page.tsx','utf8');
 const component=readFileSync('components/ProductDetailClient.tsx','utf8');
 assert.ok(source.includes("express: 'Express shipping usually takes 6–9 business days.'"));
 assert.ok(!source.includes("express: 'Express shipping usually takes 7–10 business days.'"));
 assert.ok(shipping.includes('6–9 working days'));
 assert.ok(shipping.includes('10–14 working days'));
 assert.ok(source.includes("rightPanelBlock('shipping_delivery', 'Shipping & delivery'"));
 assert.ok(component.includes('resolveThefeyaRightPdpPanel'));
 assert.ok(component.includes('draftBlocks'));
 assert.ok(component.includes('rightPdpPanel'));
});
