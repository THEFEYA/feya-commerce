# C4.3-E17 — protected application flow for manual price lane governance

25 September 2026.

E16 defines the database transition that becomes eligible only after the two-product structural repair succeeds. E17 connects it to the same narrow owner-action step-up boundary.

Protected endpoints:
- `/api/admin/review/prices/manual-price-governance`
- `/api/admin/review/prices/manual-price-governance/approval`

Default switch: `FEYA_COMMERCE_MANUAL_PRICE_GOVERNANCE_ENABLED=false`.

Prepare fails closed until evidence reports exactly six post-repair configurations and six price rows. Approval re-reads current evidence and verifies action code, mutation domain, release, exact two-product set, row counts and current evidence SHA. Browser payloads never carry replacement prices.

Price Review now exposes the manual lane as two governed stages: structural repair, then final price governance to 6/6 strict quote-readiness. Both require independent feature switches and HUMAN_REQUIRED approval. Payment, offers, orders and indexing remain outside this flow.
