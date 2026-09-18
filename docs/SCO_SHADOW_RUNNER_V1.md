# FEYA SCO Shadow Runner v1

Status: implemented; first authenticated dry-run pending
Owner: SCO
Architecture: FEYA Growth OS v1.0 CANONICAL

## Purpose

Generate structured product-page SEO content proposals from the deterministic Growth OS Content Brief Compiler without publishing or changing strategy.

## Input authority

Runner reads:

- compiled seo_content_brief.v1-shadow
- Product Truth v4
- scoped ACTIVE Business Truth
- canonical Content Policy
- existing page/strategy/keyword-plan shadow evidence

It does not reconstruct context from chat history.

## Selection

Eligible only when:

- compiler can_generate_shadow=true
- no active SEO pack draft exists for the product
- Product Truth v4 exists

Current implementation audit:

133 shadow-ready briefs
42 already have active SEO pack drafts
91 candidates without active draft
0 canonical-ready briefs

## API

POST /api/internal/sco-shadow

Requires FEYA_INTERNAL_API_TOKEN.

Defaults:

dryRun=true
limit=2
maximum limit=3

Model override:

OPENAI_SCO_MODEL

Fallback:

gpt-4.1-mini

## Output contract

sco_content_proposal_v1

Core fields:

- seo_title
- h1
- meta_description
- intro
- bullet_highlights
- faq
- image_alt_candidates
- internal_linking_hints
- pdp_blocks
- visual_truth
- suppressed_sections

## Prohibitions

SCO may not:

- change page intent
- change query ownership
- invent material/color/components/fit
- infer comfort/durability/adjustability without truth
- invent returns/shipping/production policy
- claim official festival affiliation
- promise guaranteed delivery
- publish
- approve itself
- claim CQA PASS

## Persistence

Database RPC:

feya_fn_create_sco_shadow_draft_v1

New source mode:

growth_os_sco_shadow

New provenance fields:

generation_run_id
proposal_hash
compiler_version
source_brief_queue_id

The RPC:
- locks product row
- refuses creation if any active SEO pack draft exists
- is retry-safe by generation_run_id/proposal hash
- creates draft and draft_created event atomically

## New draft state

status=draft_generated
review_status=not_reviewed
cqa_status=not_run

Prechecks are deliberately not faked:

similarity_cannibalization=not_checked
image_alt_truth=not_checked
validated_metrics=not_checked

Therefore new SCO drafts cannot jump directly to publish or CQA PASS.

## Validation

Deterministic pre-persistence validation checks:

- core fields exist
- basic field lengths
- legacy blocked claims
- proposal shape

A proposal with deterministic blockers is returned in dry-run output but is not persisted when dryRun=false.

## Tests

Rollback create PASS.
Rollback cleanup PASS.
Generation-run idempotency PASS.
Typecheck PASS after two compile-time fixes.
Next.js build PASS.
Vercel PASS.

No live OpenAI SCO call has been recorded yet.
