# FEYA SCO / CQA Shadow Mode v1

Status: independent CQA runner implemented in branch; no live CQA run recorded yet
Architecture: FEYA Growth OS v1.0 CANONICAL

## 1. Existing system reused

Current canonical draft/review foundation:

feya_commerce_seo_pack_drafts_v1
feya_commerce_seo_pack_draft_events_v1
feya_commerce_v_seo_pack_review_queue_v1

Observed active drafts at implementation audit:

130 active drafts
129 source_mode=openai_draft
71 human-approved drafts
48 generated/not-reviewed drafts
0 ready_for_publish drafts

Every active draft already contains:
- Product Truth snapshot
- keyword-role snapshot
- validation snapshot
- similarity snapshot
- agent input/output snapshots
- human review state

This system is extended rather than replaced.

## 2. Historical approval is preserved

Existing:
review_status=approved
status=approved_draft

remains unchanged.

Growth OS does not reinterpret historical human approval as independent CQA PASS.

New field default:

cqa_status=not_run

All 130 historical active drafts remain not_run until a real independent CQA run is recorded.

## 3. Shadow classification

Safe deterministic view:

feya_commerce_v_content_qa_shadow_status_safe_v1

Observed state after migration:

55 APPROVED_NEEDS_SIMILARITY_CHECK
47 READY_FOR_HUMAN_AND_CQA_REVIEW
16 READY_FOR_INDEPENDENT_CQA
9 NEEDS_PRECHECKS
2 REVISION_REQUIRED
1 BLOCKED_BY_VALIDATION

No classification mutates the underlying historical draft.

## 4. Independent CQA data

Added fields:

cqa_status
cqa_result_snapshot
cqa_reviewer
cqa_policy_version
cqa_reviewed_at

Allowed statuses:

not_run
pass
pass_with_warnings
revision_required
domain_review_required
reject

## 5. Strengthened publish guard

status=ready_for_publish now requires all of:

- review_status=approved
- reviewed_at exists
- similarity_check_snapshot.status=pass
- qa_self_report.image_alt_truth=pass
- deterministic validation status is valid or warning
- approval blockers count = 0
- Product Truth blockers count = 0
- cqa_status is pass or pass_with_warnings
- cqa_reviewed_at exists

Therefore human approval alone cannot make a draft publish-ready.

## 6. Independent CQA runner

Internal route:

POST /api/internal/content-qa

Protection:

FEYA_INTERNAL_API_TOKEN

Default:

dryRun=true

Default batch:

3 drafts

Maximum batch:

5 drafts

Default selection:

cqa_status=not_run
AND
cqa_shadow_state=READY_FOR_INDEPENDENT_CQA

The runner does not review every draft blindly.

## 7. Independence boundary

CQA receives:

- visible proposal content
- Product Truth essentials
- manual focus facts
- approved keyword roles
- metrics status
- deterministic validation summary
- similarity evidence
- image-alt/precheck evidence
- human review status

CQA does NOT receive as quality evidence:

- agent input prompt
- author reasoning
- generation notes
- author's self-approval as proof

User-visible fields from agent_output_snapshot such as pdp_blocks and visual truth may be reviewed because they are part of the proposal itself.

## 8. CQA decision rights

Runner may return:

pass
pass_with_warnings
revision_required
domain_review_required
reject

It cannot:

- rewrite the page
- change page intent
- choose a new primary keyword
- change page/query ownership
- modify Product Truth
- modify price
- modify technical SEO
- publish content

Intent/portfolio conflict routes to OSPM.

Product Truth conflict routes to Product Truth / Human Owner.

## 9. Atomic persistence

Function:

feya_fn_record_content_cqa_result_v1

Behavior:

- locks the active draft
- checks expected cqa_status
- rejects stale concurrent result
- writes CQA snapshot/reviewer/policy/time
- records cqa_checked event
- commits atomically

Browser roles cannot execute the function.

Service role only.

## 10. Event history

New event type:

cqa_checked

Existing seo_pack draft event journal is reused.

No second QA-history table was created.

## 11. Validation performed

Rollback-only recorder test:

- temporary CQA pass succeeded inside transaction
- cqa_checked event was created inside transaction
- rollback restored cqa_status=not_run
- cqa_reviewer/policy/time returned to NULL
- test events after rollback = 0

No production CQA decision was written by the test.

## 12. OpenAI execution contract

Model override:

OPENAI_CQA_MODEL

Current fallback in branch:

gpt-4.1-mini

OpenAI Responses API is called server-side only.

The response must be JSON and is normalized before persistence.

If the model returns an unsupported status:

domain_review_required

is used rather than silently approving.

## 13. Token discipline

Maximum 5 drafts/run.

Large source payloads are compacted.

Excluded from model context:
- raw agent input
- full author generation notes
- complete giant validation assembled packs
- complete raw Product Truth evidence graphs

Included Product Truth arrays are capped.

This keeps review independent and cost-bounded.

## 14. Current activation state

CQA_SHADOW_CLASSIFICATION = ACTIVE
CQA_RUNNER_CODE = IMPLEMENTED_IN_BRANCH
CQA_LIVE_RUN_COUNT = 0
CQA_AUTO_PUBLISH = FORBIDDEN

The first live CQA run should be dry-run only and inspected before any result persistence is enabled.
