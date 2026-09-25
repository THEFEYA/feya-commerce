import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';

test('macro roadmap defines one finite commerce finish line instead of open-ended E steps',()=>{
  const roadmap=readFileSync('docs/search/FEYA_Execution_Roadmap_v1.md','utf8');
  assert.match(roadmap,/M1 — Commerce Truth → authoritative quote/);
  assert.match(roadmap,/M1 DONE condition:/);
  assert.match(roadmap,/M4 DONE condition:/);
  assert.match(roadmap,/E1–E18 granularity was introduced later/);
});

test('owner checkpoint states recent checks are implementation gates, not the business goal',()=>{
  const doc=readFileSync('docs/search/FEYA_Launch_Critical_Path_20260925.md','utf8');
  assert.match(doc,/That is the finish line/);
  assert.match(doc,/not being built to accumulate checks/);
  assert.match(doc,/I will not report every CI poll/);
});
