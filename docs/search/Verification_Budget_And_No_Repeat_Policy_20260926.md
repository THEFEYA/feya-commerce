# FEYA Verification Budget & No-Repeat Policy — 26 Sep 2026

Purpose: prevent safety work from becoming work-for-work's-sake. Verification exists only to unlock a decision, protect an irreversible boundary, or prove a macro milestone. It is not a standalone deliverable.

## 1. Three classes of checks

### A. Mandatory gate — KEEP
Run only at a real boundary:
- immediately before a production mutation that can change canonical truth, price/configuration authority, offer/order/payment/index state;
- immediately after that mutation to prove the exact postcondition and write/verify its receipt;
- exact-head CI/build before treating a code package as deployable;
- final crawl/index/payment verification at the corresponding M2/M3/M4 launch gate.

These are required because the Core contract binds execution to exact scope/version/approval and requires receipts/rollback evidence.

### B. Baseline / structural audit — RUN ONCE, THEN REUSE
Examples:
- catalog-wide price/configuration binding audit;
- release composition/content inventory;
- current production runtime capability audit;
- source-axis distribution audit.

Persist the result in repo/DB with evidence/hash. Do not repeat it in another chat unless a recheck trigger below fires.

### C. Routine reassurance / duplicate polling — STOP
Do not spend work cycles on:
- repeating the same SELECT because a new chat started;
- re-reading the same canonical passports when their version did not change;
- polling CI/deployment repeatedly while it is simply running;
- re-counting variants/offers/quotes when no relevant write occurred;
- re-proving a frozen visual surface after unrelated backend-only work;
- making a new micro-stage solely to report that a previous guard still exists.

## 2. Recheck triggers
A persisted result is reused until at least one trigger is true:
1. relevant source table/version/hash changed;
2. a production mutation in the same domain completed;
3. target release/branch/head changed in a way that can affect the result;
4. a CI/runtime failure points to that assumption;
5. Human Owner changes the governing business rule;
6. an external dependency changed and materially affects the gate.

No trigger = no repeat check.

## 3. Macro reporting
Owner-facing progress is reported only when:
- a macro milestone closes;
- a Human Owner decision is actually required;
- a material defect changes the critical path.

Internal SQL guards, unit tests, CI jobs and postflights are implementation details, not separate project stages.

## 4. Current M1 persisted checkpoint
Authoritative release: 207 products / 856 price rows.

Partition:
- 202 products / 841 ordinary configuration-price rows;
- 2 products / 6 manual-price rows;
- 3 products / 9 exact color-price exception rows.

Structural repair:
- 846 configuration-axis rows;
- 215 already aligned;
- 631 require deterministic rebinding;
- exact production request: bba281fa-c767-4392-bf24-de14634b47d0;
- current state: APPROVAL_REQUIRED;
- downstream variant/offer/quote state was empty when the repair request was prepared.

Do not repeat the catalog-wide structural audit unless one of the recheck triggers fires.

## 5. Next critical-path action
Human Owner approval of the exact 207-product structural repair.

After approval, the system should execute in one forward chain:
structural repair → one postflight → 3 governance lanes → governed variant bootstrap → offer promotion → authoritative server quote.

Do not insert additional audit stages unless a postflight or CI failure produces new evidence that changes the plan.

## 6. Operating principle
Verification budget is proportional to blast radius. Read-only preparation gets lightweight validation. Production authority changes get exact preflight/postflight. Repeated reassurance with unchanged evidence gets zero budget.
