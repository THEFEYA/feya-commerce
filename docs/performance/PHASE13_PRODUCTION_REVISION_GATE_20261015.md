# Phase 13: exact Production commit provenance before SEO/Shop CI (2026-10-15)

Status: Draft / bounded platform-readiness change. No product, price, payment, V13 design, Search Release v12, SEO approved 207 drafts or storage change.

## Root defect
Twice in Phase 13 the GitHub post-merge strict origin crawl returned green **before** Vercel assigned READY and the public alias to the corresponding merge SHA. The automated origin tests can therefore pass against the previous Production. Manual single-job reruns were required. This is a release governance blind spot even though the full-stream Shop test correctly detects hidden 404 and the Search v12 18+24 checks are valuable.

## Contract
- Add unprivileged `GET /api/production-revision` returning only non-secret Git SHA of the currently executing Vercel **Production** deployment, guarded by exact project, `VERCEL=1`, branch `main` and full 40-hex SHA. If unavailable, return HTTP 503. No environment listings, access tokens, cookies, business/customer data, feature flags or request details. Cache-Control: private,no-store; X-Robots-Tag: noindex.
- Before origin crawl in GitHub `push main`, block on a **read-only** public HTTP match of returned SHA to `github.sha`. Bounded maximum 240 seconds, 10-second retry, 8-second per-attempt timeout. A mismatch is explicitly an older deployment, not a success. No arbitrary "wait for Vercel a few seconds" assumption.
- On PRs, record an advisory SKIP of the deployment-identity wait; origin SEO/Shop crawl still runs against active Production but cannot prove PR's preview. The native unit + integration + protected Preview CI continues separately.
- Evidence artifact `runtime-results/phase13-production-revision-gate.json` stores only expected/observed public SHA, outcome and attempt count, no customer data. Strict origin crawl immediately follows a **matching** SHA, with existing 18 Search v12 routes, PDP noindex sample and four full-stream Shop tests. 
- If Vercel automatic `VERCEL_GIT_COMMIT_SHA` is absent/invalid, the new route fails closed and the main postflight is RED: diagnose project automatic system variables, do not fabricate a SHA or bypass the gate. Rollback is reverting this standalone change.
- Expected outcome: eliminate routine manual reruns/false "new release verified" claims with no additional paid tools. Max 24 HTTP checks only on the delayed release path.
