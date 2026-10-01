import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {publicPrimaryNavigation,STOREFRONT_NAVIGATION_PANELS} from '../../config/storefrontNavigation.ts';

test('Phase 8 desktop parents are real links with adjacent disclosure buttons',()=>{
  const header=readFileSync('components/Header.tsx','utf8');
  assert.match(header,/aria-label="Main"/);
  assert.match(header,/submenu/);
  assert.match(header,/aria-controls=\{\`nav-panel-\${panelCode}\`\}/);
  assert.match(header,/aria-expanded=\{expanded\}/);
  assert.match(header,/schedulePanelOpen\(panelCode\)/);
  assert.match(header,/openPanel !== panelCode \? 80 : 320/);
  assert.match(header,/setTimeout\(\(\) => setOpenPanel\(null\), 300\)/);
  assert.match(header,/primary-nav-link/);
  assert.match(header,/panelFocusables\(panelCode\)/);
  assert.match(header,/handlePanelTab\(event,panelCode\)/);
  assert.match(header,/disclosureRefs\.current\[panelCode\]\?\.focus\(\)/);
});

test('mega-menu and mobile drawer links stay in rendered markup while disclosures hide visually',()=>{
  const header=readFileSync('components/Header.tsx','utf8');
  assert.match(header,/primaryNavigation\.map\(\(parentItem\) =>/);
  assert.match(header,/if \(!\('panel' in parentItem\) \|\| !parentItem\.panel\) return null/);
  assert.match(header,/aria-hidden=\{!expanded\}/);
  assert.doesNotMatch(header,/\{panel && groups\.length > 0 \?/);
  assert.match(header,/id="mobile-site-navigation"/);
  assert.match(header,/role="dialog"/);
  assert.match(header,/aria-modal="true"/);
  assert.doesNotMatch(header,/\{mobileOpen && \(/);
});

test('mobile navigation has accordion disclosure, View-all destination and focus trap',()=>{
  const header=readFileSync('components/Header.tsx','utf8');
  assert.match(header,/aria-controls=\{mobilePanelId\}/);
  assert.match(header,/Shop all/);
  assert.match(header,/View all/);
  assert.match(header,/mobileDialogRef/);
  assert.match(header,/event\.key !== 'Tab'/);
  assert.match(header,/mobileMenuButtonRef\.current\?\.focus\(\)/);
});

test('top-level destinations follow the Phase 8 hub contract',()=>{
  const primary=publicPrimaryNavigation();
  assert.equal(primary.find((item)=>item.code==='shop')?.href,'/shop');
  assert.equal(primary.find((item)=>item.code==='events_performance')?.href,'/events-performance');
  assert.equal(primary.find((item)=>item.code==='style')?.href,'/style');
  assert.ok(STOREFRONT_NAVIGATION_PANELS.events_performance.groups.length>0);
  assert.ok(STOREFRONT_NAVIGATION_PANELS.style.groups.length>0);
});


test('chevron hover does not pre-toggle the disclosure before an intentional click',()=>{
  const header=readFileSync('components/Header.tsx','utf8');
  const buttonStart=header.indexOf('aria-label={`${item.label} submenu`}');
  const buttonEnd=header.indexOf('</button>',buttonStart);
  assert.ok(buttonStart>=0&&buttonEnd>buttonStart);
  const button=header.slice(buttonStart,buttonEnd);
  assert.doesNotMatch(button,/onMouseEnter=|onMouseLeave=/);
  assert.match(button,/onClick=\{\(\) => expanded \? setOpenPanel\(null\) : openNavigationPanel\(panelCode\)\}/);
});


test('keyboard focus cancels pending pointer intent so focus never races hover state',()=>{
  const header=readFileSync('components/Header.tsx','utf8');
  assert.match(header,/onFocusCapture=\{\(\) => \{/);
  assert.match(header,/onFocusCapture=\{\(\) => \{[\s\S]{0,180}cancelScheduledOpen\(\)/);
  assert.match(header,/onFocusCapture=\{\(\) => \{[\s\S]{0,180}cancelScheduledClose\(\)/);
});
