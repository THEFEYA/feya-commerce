# TheFEYA Growth OS — G2c external HTTP evidence adapter (DRAFT)

**Operating canon:** FEYA Growth OS Architecture/Core/8 Role Passports/Decision Map v1.0; [MASTER #145](https://github.com/THEFEYA/feya-commerce/issues/145); [G2 #178](https://github.com/THEFEYA/feya-commerce/issues/178). This is **NOT a new agent, Case FSM, database or autonomous QA**. It is a deterministic, source-bound read-only precursor to independent TSEO technical review and GMEL measurement.

## 1. Confirmed external evidence (18 October 2026)

A real GitHub Actions **Production main push** for commit `56208feed93a7f3f0f4984744203885cc7072a6b` completed successfully as [run #39172621119](https://github.com/THEFEYA/feya-commerce/actions/runs/39172621119). Its existing retained `phase12-production-origin-crawl` ZIP (artifact ID `12152039988`) contains five raw JSON observations.

Observed and separately verified from the downloaded ZIP:
- `phase13-production-revision-gate.json`: `enforced=true`, `matched=true`, exact deployed SHA `56208feed...`, HTTP 200.
- `phase12-production-origin-crawl.json`: ACTIVE Search v12 manifest, 18 index-intended routes checked 18/18, noindex product HTTP sample 24/24 out of the **207-product manifest**, 2 redirects, 3 utility noindex and 1 filter-noindex passed, robots and 18-URL sitemap checked, zero errors.
- `phase13-shop-origin-smoke.json`: 4/4 fully streamed Shop scenarios passed (status 200, cards present, no streamed 404).
- `phase13-collection-origin-smoke.json`: 3/3 collection scenarios passed.
- `phase13-public-pdp-copy-postflight.json`: 5/5 product page smoke checks passed against the published origin.

**Limits:** 207/207 products were listed in the intended manifest, but only 24/207 were sampled by HTTP for noindex. Five PDP text samples ≠ audit of every description. The archived 18 October producer recorded aggregate 24/24 success and sampled paths, not separate successful HTTP results for each path. Future main CI runs now include per-path observations; the verifier reports `AGGREGATE_CI_RECEIPT` for the old artifact and `PER_PATH_CI_RECEIPT` for complete valid new observations. The producer is a deterministic CI job, not an independent human/AI reviewer. These are HTTP/canonical/noindex observations, **not** Google-known indexing, GSC conversions, commercial outcome or causal proof.

## 2. What this change implements

1. Pure contract `lib/growthG2cOriginEvidence.ts` verifies: expected release identity and exact main-push provenance, exact production revision SHA, independent external HTTP observations, time coherence, all 18 intended-index paths, *sampled* product noindex, robots/sitemap/redirects, full-stream Shop/collections and PDP samples.
2. It always emits a bounded evidence summary that distinguishes `PRODUCTION_HTTP_OBSERVED` / `PRODUCTION_HTTP_MISMATCH` / `PR_SNAPSHOT_ONLY` / `UNVERIFIABLE`, with reason codes, content checksum and explicit `183` untested product URLs at today's 207/24 coverage. No raw HTML, customer PII or credentials.
3. Existing production HTTP crawler now persists per-path status/noindex/canonical/pass for its already-fetched sample without another network call. `scripts/verify-growth-g2c-origin-evidence.ts` reads **only** the existing local CI JSON files, no network/provider/model calls, and writes `runtime-results/growth-g2c-origin-observation.json` into the **existing** retained artifact. A PR run against old Production remains `PR_SNAPSHOT_ONLY`, even if all observations pass. A strict main push must prove exact SHA; otherwise the CI step fails.
4. Regression tests cover identity mismatch, clock drift, partial or spoofed coverage, release drift, missing noindex/sitemap, streamed Shop failure, PDP sample failures, and no escalation to QA/Google/order/AI permissions.

## 3. Authority of this envelope

`PRODUCTION_HTTP_OBSERVED` means a consistent **candidate L0 technical observation from CI**, not a complete G2c independent QA verdict. Its SHA-256 is a content checksum, **not a trusted signature**. To consume it for a real Case:

- Fetch artifact using authenticated GitHub API; independently verify repo, commit, protected branch, workflow run and job conclusion SUCCESS. Never accept an untrusted client-provided report object.
- Verify artifact checksum, expiration, evidence timestamps and Production deploy/source ID. Compare the manifest release to *current* single ACTIVE Supabase Search Release and approved Product Truth; if drift exists, mark STALE, do not silently authorize.
- Confirm independent reviewer identity/method and reproducible evidence for the exact Case/ownership epoch using existing Core Handoff/Events. No automatic `QA_PASS` from the deterministic producer.
- Use a source-specific freshness/window rule. Archived evidence cannot remain a live status indefinitely. Google indexed-state stays UNKNOWN until a separately authorized URL Inspection source.
- If source absent, partial, inconsistent or too old, show `REVIEW_REQUIRED` / `NOT_OBSERVABLE`; unknown ≠ zero. No new Case/action from this adapter alone.

**No Supabase migration, new service-role endpoint, paid model, Cron, action grants, payment, SEO text or Production publish is part of this PR.**

## 4. Owner-first UX — future G2c activation

Owner sees a concise technical report: **what was intended → what external HTTP actually showed → what wasn't checked → recommended next step**. Behind one disclosure: commit/release/time/source/artifact ref, checked URLs, sub-test groups, data limitations and age. Graph edge TSEO→GMEL becomes *persisted evidence transfer* only after approved Handoff creation and independent review receipt; never animate a currently running AI without worker lease.

## 5. Next controlled releases

- [Core PR #182](https://github.com/THEFEYA/feya-commerce/pull/182): proposed idempotency and NULL-CAS hardening, draft and **not applied to live Supabase**.
- [G2b PR #180](https://github.com/THEFEYA/feya-commerce/pull/180): gated human OPEN→TRIAGED, draft and OFF.
- **This G2c adapter:** evidence capture/read-only; no execution/approval buttons. Then a separate source-authorized ingestion/read API, reviewer attestation, durable CASE-bound handoff/receipt, and authorized owner screen only when its exact conditions are proven.
- **G2d GMEL:** predeclared locked measurement spec in the *existing* table before site changes. First candidate is HTTP intended-vs-observed mismatch at a versioned technical cohort; results require baseline, elapsed window and contamination checks. Cannot claim traffic/sales uplift, conversion or revenue without validated GSC/GA4/Commerce.

**Explicit owner approval required for each Production merge/SQL change/feature switch. Generic “continue” grants no broader authority.**
