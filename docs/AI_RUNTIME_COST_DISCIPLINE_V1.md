# FEYA AI Runtime Usage & Cost Discipline v1

Status: IMPLEMENTATION FOUNDATION  
Scope: internal Growth OS model calls only  
Date: 2026-09-18

## 1. Purpose

FEYA must not spend model tokens merely because an agent can run.

The runtime rule is:

> deterministic eligibility first → smallest useful evidence packet → model call only for semantic work → persist usage → measure business usefulness before changing model/budget policy.

This document does **not** define a monetary budget and does not authorize autonomous spend. Human Owner remains the budget authority.

## 2. Current implementation

Private operational ledger:

- `public.feya_growth_ai_invocations_v1`
- recorder: `feya_fn_record_ai_invocation_v1`
- service-role aggregate: `feya_commerce_v_ai_usage_daily_v1`

The ledger stores operational metadata only:

- action code / domain;
- endpoint and run id;
- dry-run flag and item count;
- requested/resolved model;
- prompt version;
- OpenAI response id;
- input tokens;
- cached input tokens;
- output tokens;
- reasoning output tokens when reported;
- total tokens;
- request latency;
- HTTP/status metadata.

It intentionally stores **no prompt text and no model response text**.

## 3. Instrumented internal runners

Current metering is wired into:

- `/api/internal/seo-keyword-cleanup`
- `/api/internal/content-qa`
- `/api/internal/sco-shadow`
- `/api/internal/seo-keyword-review`
- `/api/internal/query-cluster-proposals`
- `/api/internal/page-ownership-proposals`

All of these continue to keep their existing small batch limits and dry-run defaults. Metering failure is non-fatal: a successful model result is not repeated merely because the usage ledger failed, because retrying the model would itself waste tokens.

The OpenAI Responses requests use `store: false` for these internal jobs.

## 4. What is intentionally NOT implemented

### No invented dollar cost

The ledger records provider-reported token usage. It does not calculate `cost_usd` yet.

Reason: monetary cost must come from a versioned pricing contract with model, effective date and pricing units. Hard-coding today's price into business data would turn a changing external price into false canonical truth.

### No automatic budget gate

Capability `AI_BUDGET_GATE` is intentionally `UNAVAILABLE / owner_policy_not_defined`.

No agent may invent:

- daily/monthly spend limits;
- “worth it” thresholds;
- model downgrade rules;
- business-value scores.

Those become policy only after the Human Owner chooses them using real usage and outcome evidence.

### No token-minimization target by itself

Lower token count is not a business KPI. The objective is the lowest reasonable cost **for an acceptable business result**, not the smallest prompt regardless of quality.

## 5. Cost-control order of operations

Before an LLM call:

1. deterministic queue eligibility;
2. existing-result / already-reviewed exclusion;
3. capability and lock checks;
4. compact rows only, not raw warehouse/history;
5. bounded batch size;
6. semantic model call only where deterministic code cannot do the job correctly.

After an LLM call:

1. persist usage/latency;
2. persist business outcome separately;
3. later compare usage with useful outcome;
4. change model/prompt/batch policy only from measured evidence.

## 6. Future optimization metrics

When enough real executions exist, compare by `action_code + model + prompt_version`:

- tokens per processed item;
- tokens per human-approved result;
- tokens per CQA first-pass acceptance;
- tokens per accepted query-cluster proposal;
- tokens per accepted page-ownership proposal;
- cached-input share;
- latency per item;
- retry/error rate.

For commercial workflows, model cost may later be compared with validated business outcomes, but only after trusted commerce/measurement data exists.

## 7. Promotion rule

Do not optimize model selection from one successful or failed run.

A model/prompt/batch change should require:

- enough comparable runs;
- quality outcome available;
- no material regression in factual/QA safety;
- measured reduction in cost or latency;
- controlled rollout/regression check where material.

## 8. Current state

As of this foundation:

- usage ledger: installed;
- six current OpenAI internal runners: instrumented;
- live metered invocations: 0 at activation;
- monetary cost policy: not defined;
- autonomous budget enforcement: disabled;
- Human Owner budget decision: required before any hard monetary guard is activated.
