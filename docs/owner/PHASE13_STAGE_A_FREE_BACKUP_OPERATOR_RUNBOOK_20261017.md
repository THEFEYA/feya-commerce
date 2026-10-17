# TheFEYA — Stage A private database export runbook

**Status: code prepared; no live database export or verified restore has occurred.**
Canonical authority: Growth OS Stage A, MASTER Phase 13, GitHub #145 and scoped security review #166.

## Why this is separate

The connected Supabase organization uses the Free plan. Supabase does not promise downloadable, automated daily backups on Free; it recommends a regularly maintained logical export and encrypted offsite storage. The shared FEYA database contains active TheFEYA Commerce records plus paused historical sales, realty and warehouse data, which must not be removed to save storage.

Official references:
- https://supabase.com/docs/guides/platform/backups
- https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore

## Operator prerequisites — private computer only

1. PostgreSQL 17+ pg_dump and pg_restore tools installed. Use the exact authorized database connection configuration from Supabase Dashboard > Database > Connect, approved by the Owner.
2. Set libpq environment variables PGHOST, PGDATABASE, PGUSER, optionally PGPORT, and either PGPASSWORD or PGPASSFILE in the private operator environment. Use PGSSLMODE=verify-full with verified CA where possible; otherwise PGSSLMODE=require provides encryption without fully verified peer identity. Never send access tokens, connection strings or passwords in ChatGPT, email, GitHub issues or Actions.
3. Set FEYA_BACKUP_DIR to a private absolute folder OUTSIDE the Git repository, temporary folders, CI runners and ChatGPT download areas. The directory must be accessible only by the operator (0700). Have private disk capacity and approved secure/encrypted offsite storage.
4. The harmless inspection command is:
   node scripts/operator-db-archive.mjs --preflight
   It only checks local tools, destination and presence of required settings. It never connects to the database, dumps data or writes files.
5. Only after the Owner authorizes the source and low-traffic export window, set FEYA_BACKUP_CONFIRM=OWNER_APPROVED_READ_ONLY_EXPORT locally and run:
   node scripts/operator-db-archive.mjs --run
   This performs a bounded, read-only pg_dump against the configured database. It does not execute SQL changes but can add read load; do not schedule it without a separate operational decision.

## Actual acceptance levels

- PREFLIGHT_ONLY: configuration inspected, no archive.
- LOCAL_ARCHIVE_TOC_VERIFIED: private custom archive, size and SHA-256 manifest saved with restrictive permissions; pg_restore successfully listed the archive's table of contents. **This is NOT a tested restore or proof of full disaster recovery.**
- RESTORE_VERIFIED: only after a separate authorized restore into a fresh, isolated PostgreSQL 17+ environment, full exit-status review, representative schema/row verification and access-control tests. No tool or CI in this PR can award this state.
- OFFSITE_COPY_VERIFIED: only after a separately approved encrypted offsite copy and integrity check.

Database logical export does not include Supabase Storage object bytes, cloud configuration, external secrets or PostgreSQL global role definitions. Supabase-managed schemas may need a provider-specific recovery plan. Preserve a separate source/roles/configuration record via an authorized secure mechanism; never publish it to the repository.

## Forbidden

Do not enable any of the 12 paused old Cron jobs, invoke old collectors, open Growth OS to public SQL roles, delete/rewrite source records, mass-enable RLS, deploy legacy Edge auth changes or purchase PITR solely to claim a security task is complete. Exact backward-compatible permission hardening is gated separately in #166.

This script is intentionally NOT wired to CI, Vercel, GitHub Scheduled Actions or Supabase Cron: putting private database content into hosted CI artifacts would breach the intended data-handling boundary.

The existing 207 approved product descriptions, Product DNA, V13 visuals, Search Release v12, website pricing and disabled payment/analytics switches remain unchanged.
