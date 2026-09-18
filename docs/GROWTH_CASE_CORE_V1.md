# FEYA Growth Case Core v1

Status: database foundation implemented; no automatic production case creation
Architecture: FEYA Growth OS v1.0 CANONICAL

## 1. Purpose

Provide durable workflow state outside any individual AI run.

Growth Case is the parent container for:

question -> investigation -> hypothesis -> initiative -> measurement -> outcome -> learning

The database foundation exists before any autonomous signal routing is activated.

## 2. Physical implementation

Three compact tables:

feya_growth_cases_v1
feya_growth_case_items_v1
feya_growth_case_events_v1

This intentionally avoids one physical table for every logical artifact.

## 3. Case identity

Every case has:

case_id
case_code
case_type
title
business_question
case_fingerprint
idempotency_key

Fingerprint supports deduplication.

Idempotency key supports retry-safe creation.

## 4. Lifecycle

Supported case states:

OPEN
TRIAGED
INVESTIGATING
DECISION_READY
ACTIONING
MEASURING
LEARNING
CLOSED
BLOCKED
DEFERRED
CANCELLED
NOT_OBSERVABLE

## 5. Ownership

Every case has exactly one:

current_accountable_domain

Supported:

HUMAN_OWNER
GROWTH_DIRECTOR
OSPM
CPIM
GMEL
SCO
CQA
TSEO
GDAE
CORE

## 6. Ownership epoch

Every case stores:

ownership_epoch

Initial:

1

Every valid transfer increments it.

Function:

feya_fn_transfer_growth_case_owner_v1

requires:

expected ownership epoch

A stale agent result cannot transfer a case after another domain has already taken ownership.

## 7. Rollback validation

Validated:

case create -> OSPM owner -> transfer to CPIM

Observed:

epoch 1 -> 2

Repeat with same transfer idempotency key:
- same transfer result
- no second ownership mutation

Attempt new transfer using stale epoch 1 after current epoch became 2:
- rejected

All validation was rolled back.

No test Growth Cases remain.

## 8. Case items

feya_growth_case_items_v1 can hold:

INVESTIGATION
HYPOTHESIS
INITIATIVE
TASK
MEASUREMENT
OUTCOME
LEARNING
NOTE

This is intentionally generic in v1.

Split into dedicated physical tables only if future query/scale needs prove it necessary.

## 9. Event history

feya_growth_case_events_v1 stores:

case creation
ownership changes
future lifecycle transitions
future durable handoffs

Events preserve ownership epoch.

## 10. Owner Attention Queue

Separate table:

feya_growth_owner_attention_v1

Canonical attention types:

APPROVAL
STRATEGY_DECISION
HUMAN_ACTION
CRITICAL_INCIDENT
EXPIRING_OPPORTUNITY
POLICY_DECISION

Priority:

P0
P1
P2
P3

Deduplication is enforced for active items.

## 11. Owner Attention validation

Rollback-only test confirmed:

first enqueue -> created_new=true

second enqueue with same dedup key:
- same attention_id
- created_new=false

After rollback:
test attention rows = 0

## 12. Current activation state

GROWTH_CASE_REGISTRY = database foundation available
OWNER_ATTENTION_QUEUE = database foundation available
SIGNAL_ENGINE = not activated
CASE_ROUTER = not activated
GROWTH_DIRECTOR_RUNTIME = not activated
OWNER_ATTENTION_UI = not exposed

No fake production Growth Cases are being generated from absent GA4/GSC signals.

## 13. Next activation prerequisite

Do not create automated business cases until:

- a deterministic signal has real source data;
- materiality definition exists;
- source capability is healthy enough;
- case fingerprint is defined;
- accountable domain is known.

Pre-launch manual/system cases may be added later only for real implementation/incident work, not to manufacture activity.
