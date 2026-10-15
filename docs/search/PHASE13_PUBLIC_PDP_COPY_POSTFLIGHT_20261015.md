# Phase13 — exact approved 207 PDP public postflight

Status: staged automated CI check. **No activation of Draft PR #127 or Vercel env edits**.

TheFEYA source contains 207 pinned and human-approved four-block descriptions, exact original SHA256 previously verified for all 207. Existing CI protects 18 indexable Search v12 owners, samples 24 noindex PDPs, and fully reads 4 Shop URLs, but does not verify that the public customer PDP actually renders the original approved copy after the two owner-controlled Production flags and Git release lever enable it.

New origin test selects five established owner-review products (unchanged IDs/slugs). On PR or on main while the Git release lever is OFF, the runtime test reports SKIPPED rather than falsely declaring the unpublished content live. Once PR #127 is merged and its *Git authorization is TRUE*, every new main postflight MUST check all five real, anonymous, full-stream Product pages. The test fails if Production flags were missing, if the generic fallback displays instead of the 4 original headings in order, if the owner-approved H1/physical pieces are missing, if the unchanged right panel headings vanish, or if canonical/noindex / server availability regress. It runs after the exact Git SHA proof and before artifact upload.

This is a **runtime buyer-visible confirmation**, NOT an alternative source of original text. No original body text is copied into test fixtures; production runtime `readExactPublicApprovedPdpCopy` already compares SHA256 to the immutable approved manifest. Existing `ProductDetailClient`, right options, prices, media and V13 CSS remain frozen. No payment enablement or PDP indexation occurs.

Owner action remains mandatory: read approved five-product protected Preview, confirm two precise Production flags in Vercel, explicitly approve the governed PR #127 content release, then deploy and inspect anonymous HTML/mobile/desktop. Do not merge #127 just to make a failing postflight visible. This change is only a defensive test.
