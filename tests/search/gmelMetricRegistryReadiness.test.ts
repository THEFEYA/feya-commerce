import test from 'node:test';
import assert from 'node:assert/strict';
import {projectGmelMetricGate,G2D_HTTP_METRIC_CODE}
  from '../../lib/owner-ui/gmelMetricRegistryReadiness.ts';
const metric={metric_code:G2D_HTTP_METRIC_CODE,metric_state:'AVAILABLE_WITH_LIMITATIONS',
 owner_role:'GMEL',authority_source:'FEYA_GROWTH_G2C_HTTP_OBSERVATION_V1',version_no:1};
test('missing definition is a governance gate, never a result',()=>{
 const v=projectGmelMetricGate({rows:[],readError:false});
 assert.equal(v.state,'METRIC_NOT_REGISTERED');
 assert.match(v.next,/GMEL/);
 assert.equal(v.canLockSpec,false);
 assert.equal(v.canClaimOutcome,false);
});
test('read errors cannot masquerade as absent metric',()=>{
 for(const x of [{rows:null,readError:false},{rows:[],readError:true}]){
  assert.equal(projectGmelMetricGate(x).state,'SOURCE_UNKNOWN');
 }
});
test('registered definition is not independent QA or authority to record Outcome',()=>{
 const a=projectGmelMetricGate({rows:[metric],readError:false});
 assert.equal(a.state,'METRIC_REGISTERED');
 assert.equal(a.version,1);
 assert.equal(a.independentQaPassed,false);
 assert.equal(a.canLockSpec,false);
 assert.equal(a.canClaimOutcome,false);
});
test('duplicates and improper authority fail closed',()=>{
 for(const changed of [{owner_role:'TSEO'},{version_no:0},{version_no:'1'},
 {authority_source:'GOOGLE_ANALYTICS'},{metric_state:'UNAVAILABLE'}, {metric_code:'OTHER'}]){
  const v=projectGmelMetricGate({rows:[{...metric,...changed}],readError:false});
  assert.equal(v.state,'METRIC_NOT_APPROVED',JSON.stringify(changed));
 }
 assert.equal(projectGmelMetricGate({rows:[metric,metric],readError:false}).state,'METRIC_NOT_APPROVED');
});

