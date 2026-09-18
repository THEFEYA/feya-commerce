# FEYA Durable Handoff Registry v1

Status: database foundation implemented; automatic orchestration disabled
Architecture: FEYA Growth OS v1.0 CANONICAL

## Purpose

Move cross-domain work through durable structured handoffs instead of relying on one LLM run or free-form agent conversations.

## Handoff object

feya_growth_handoffs_v1

Stores:

- Growth Case
- ownership epoch
- source domain
- target domain
- SERVICE / COLLABORATION / FACILITATION mode
- question
- evidence
- known facts
- known unknowns
- expected output contract
- expiry
- result
- idempotency
- timestamps

## Ownership safety

A handoff can be created only when:

- case exists and is not closed/cancelled
- expected ownership epoch matches current epoch
- source domain is the current accountable domain
- source != target

If case ownership changes before the result returns:

the result is recorded as STALE.

A stale result cannot silently become current evidence.

## Loop protection

Handoff fingerprint is based on:

normalized question + evidence JSON

Same direction + same fingerprint:

returns existing handoff.

Reverse direction + same fingerprint:

HANDOFF_LOOP_DETECTED

This blocks OSPM -> CPIM -> OSPM loops when the question/evidence did not change.

## Handoff budget

Default budget:

8 meaningful handoffs per case

Budget is enforced before a new handoff is inserted.

Cancelled/dead-letter handoffs do not count toward the budget.

## Output contract validation

expected_output_schema_json supports a deliberately small v1 validator:

- top-level object type
- required fields
- simple property types:
  string
  number
  integer
  boolean
  object
  array
  null

Full JSON Schema is intentionally not implemented.

A COMPLETED result that violates the declared contract is rejected with:

HANDOFF_SCHEMA_INCOMPATIBLE

A REJECTED handoff may still return diagnostic result JSON without satisfying the success contract.

## Tested under ROLLBACK

PASS:
- duplicate same-direction handoff returns same ID
- reverse unchanged handoff blocked
- handoff budget enforced
- stale completion after ownership epoch change becomes STALE
- invalid output contract rejected
- valid output contract completed
- test rows after rollback = 0

## Current activation

DURABLE_HANDOFF_REGISTRY = AVAILABLE_WITH_LIMITATIONS

CREATE_GROWTH_HANDOFF = DB primitive available
COMPLETE_GROWTH_HANDOFF = DB primitive available

AUTOMATIC_MULTI_AGENT_ORCHESTRATION = OFF

No agent is allowed to create conversational ping-pong merely because handoff storage exists.
