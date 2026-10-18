import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const page=readFileSync('app/admin/data-health/page.tsx','utf8');
const source=readFileSync('lib/gscObservedSourceQuality.ts','utf8');

test('owner data-health reads immutable official GSC receipts through existing admin session boundary',()=>{
 assert.match(page,/getAdminReadClient\(/);
 assert.match(page,/feya_growth_gsc_observation_receipts_v1/);
 assert.match(page,/inspectOfficialGscReceipts\(/);
 assert.match(page,/\.eq\('source_code','ORGANIC_SEARCH_PERFORMANCE'\)/);
 assert.match(page,/reconcileGscSourceReadiness\(gscReceipts/);
 assert.match(page,/gscReadiness\.registryStatus/);
 assert.match(page,/gscReadiness\.evidenceStatus === 'IDENTITY_MISMATCH'/);
 assert.match(page,/Подробные показатели заблокированы/);
 assert.match(page,/Почему вывод ограничен/);
 assert.match(page,/GSC: \{gscReadiness\.evidenceLevel\}/);
 assert.match(page,/\.limit\(35\)/);
 assert.match(page,/Promise\.all\(\[getRows\(\),getGscObservationQuality\(\)\]\)/);
 assert.doesNotMatch(page,/SUPABASE_SERVICE_ROLE_KEY|FEYA_GSC_OAUTH_REFRESH_TOKEN|CRON_SECRET|OPENAI_API_KEY/);
});

test('UI cannot infer commercial uplift or raise canonical source-health from one receipt',()=>{
 assert.match(page,/уровень L0/);
 assert.match(page,/Канонический статус источника не повышен/);
 assert.match(page,/нет.*Google-наблюдени|наблюдений ещё нет/);
 assert.match(page,/Пропущенных дат:/);
 assert.match(page,/GMEL\/AI-бюджет не активированы/);
 assert.doesNotMatch(page,/\.insert\(|\.upsert\(|\.rpc\(|price_override|purchase_success/);
});

test('GSC source contract remains pure and explicitly retains missingness and unknowns',()=>{
 assert.match(source,/state:'NO_FINAL_DATE_ROWS'/);
 assert.match(source,/state:'NO_OFFICIAL_OBSERVATION'/);
 assert.match(source,/canonicalSourceHealthy:false/);
 assert.match(source,/gmElModelEligible:false/);
 assert.match(source,/missingDays/);
 assert.match(source,/evidenceSha256/);
 assert.doesNotMatch(source,/fetch\(|createClient\(|service\.rpc|cron\.schedule/);
});
