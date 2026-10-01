# C4.3-E10 — exact approval set + agent-prepared request support

25 September 2026.

The price-baseline approval route now validates the **exact 205-product identity set**, not merely an array length of 205. A same-size substituted or duplicate product list is rejected.

The route also aligns the request/approval model with the Growth OS canon:

- a human owner may prepare their own request and later approve it;
- an `agent` or `system` may prepare the exact evidence-bound request with no human user ID;
- only the authenticated allowlisted human performs the approval;
- an agent/system request carrying a human user ID is rejected;
- a human-prepared request from a different user is rejected.

This permits deterministic preparation to be automated without pretending that an agent performed the human approval.

All other controls remain: exact action code, mutation domain, release, row count, evidence SHA, status and dedicated approval endpoint.
