# New integration preview — owner access

Owner explicitly requested restoring direct visual access to the NEW integration on 24 September 2026, without a second FEYA registration/login. Old deployment links do not fulfill that request.

## Scope

Use the existing Vercel Deployment Protection boundary for project `prj_ePIymo4sUG33wrRjHBxWrSlaxPID`, preview branch `work/search-architecture-foundation-20260923` only. The project API was checked: SSO protection is `all_except_custom_domains`, and this project currently lists only Vercel domains. Recheck this protection before distributing a new review link; never promote this review deployment or attach a public domain to it.

The scope uses server-provided Vercel/project/branch metadata, not request headers, cookies, a fabricated Supabase user or a public anonymous service client. `FEYA_OWNER_PREVIEW_DISABLED=true` closes this mode. Production, other branches/projects and local development retain existing authentication behavior. This is a read-only review identity, not an operator granted mutation rights.

## Result

- `/admin/company`, Product OS and existing read APIs can render without a second Supabase login behind Vercel protection.
- All admin non-GET/HEAD requests return 423 in this mode; Server Actions are covered too.
- The server data transport only permits GET/HEAD table reads and two exact audited read-only Product Truth RPCs. Unknown RPCs, table writes, non-REST paths and other origins are rejected before transport. Credentials stay server-only; redirects are rejected; caching stays disabled.
- The sealed 207-product release activates automatically on this scoped preview, retains pinned approval/live-source checks and refuses unknown explicit release IDs. Home/Shop/PDP use that release; closed robots/sitemap/noindex and disabled purchasing remain in force.
- Existing Supabase-authenticated review and all mutation actor checks remain intact. No production database migration, write activation, paid generation, payment or indexing change is included.
- UI, approved descriptions, source prices and stable IDs are unchanged by this access correction.

## Validation and rollback

Automated tests cover scoped deployment metadata, kill switch, ordinary auth behavior, release selection, noindex, allowed reads and rejected writes/RPC/origin requests. Hosted browser checks must verify company data, Shop count/pagination and a rendered approved product before calling the owner preview ready.

Rollback: set `FEYA_OWNER_PREVIEW_DISABLED=true` on this preview or revert the access commit and redeploy. No DB rollback is necessary. Hosted variant persistence remains separately disabled pending its DB rollout; visual availability does not claim write readiness.

## Hosted verification follow-up

The first hosted build successfully rendered Company data and the 207-product Shop. Browser navigation exposed a prefetch stampede: the existing ProductCard explicitly prefetched every visible PDP, each checking the entire release, and the next catalog page returned 404 under concurrent load. Disable that single Link prefetch attribute. The hover image/video logic, HTML, styles, copy and media order are byte-for-byte unchanged after normalizing that one attribute; a dedicated test checks the original Git blob hash. The UI freeze baseline advances only for this documented non-visual attribute. Add safe source/error-count diagnostics without product content or credentials; retain all release validation checks.
