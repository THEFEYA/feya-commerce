# Google Ads API Brand Verification Readiness — 2026-10-02

Status: **READY FOR OWNER/GOOGLE CLOUD BRANDING CHECK; BASIC ACCESS NOT YET CLAIMED**

## 1. Verified current Google Ads API access

Authoritative Google Ads email received 2026-09-14:

- Google Ads manager/customer context: `333-242-7758`
- Google Cloud project with transferred API access: `826834264134`
- current Google Ads API access level: `EXPLORER`

Developer-token access was transferred to the Google Cloud project during the 2026 developer-token sunset.
The FEYA runtime already uses OAuth/Cloud-project access and does not require a developer token.

## 2. Why Basic access is the next provider gate

Current official Google Ads API documentation states:

- Explorer can access production accounts but restricts planning services, including KeywordPlanIdeaService;
- Basic allows production access up to 15,000 operations/day;
- successful OAuth Brand verification is a prerequisite before applying for Basic access.

Therefore FEYA's historical Keyword Planner research requirement cannot be treated as fully live-capable under
Explorer alone. CSV evidence remains a valid fallback until the project is upgraded.

## 3. Public-domain prerequisites now satisfied

Current production state:

- canonical store homepage: `https://thefeya.com/`
- dedicated OAuth application homepage: `https://thefeya.com/marketing-tools`
- domain ownership: verified in Search Console as `sc-domain:thefeya.com`
- Privacy Policy: `https://thefeya.com/privacy` — public HTTP 200, `noindex,follow`
- Terms: `https://thefeya.com/terms` — public HTTP 200, `noindex,follow`
- homepage footer links to Privacy and Terms;
- Privacy includes Google API / Google Ads user-data disclosure;
- admin/internal routes remain private.

These pages are trust/OAuth surfaces, not Search Release owners. The dedicated app homepage is preferred for OAuth Branding because it describes the actual internal Google Ads/keyword-planning/reporting functionality without altering the frozen commerce homepage.

## 4. Google Cloud Console actions that still require account UI confirmation

For project `826834264134`:

1. Open Google Cloud Console -> APIs & Services -> OAuth consent screen.
2. Audience:
   - user type External;
   - publishing status In production.
3. Branding:
   - App name: TheFEYA (or the exact existing OAuth app name if already established);
   - User support email: `manager.feya@gmail.com`;
   - App home page: `https://thefeya.com/marketing-tools`;
   - Privacy policy: `https://thefeya.com/privacy`;
   - Terms of service: `https://thefeya.com/terms`;
   - authorized domain: `thefeya.com`.
4. Verify Branding.
5. Publish branding after verification succeeds.
6. Return to Google Ads API Overview for project `826834264134` and confirm the access upgrade path from
   Explorer to Basic no longer shows the brand-verification blocker.
7. Apply for Basic access only after the Branding page reports verified.

Do not claim Basic access until Google shows it.

## 5. Security note

Current Google Ads API security guidance may require passkey authentication for users generating new OAuth
refresh tokens. Existing refresh tokens can continue to work. If reauthorization is required, use the
Google-account security flow rather than disabling FEYA's server-side credential boundaries.

## 6. Not coupled to commerce

Brand verification / Basic access does not:

- activate checkout;
- activate Seller Online;
- activate Merchant Center products;
- authorize Product Truth changes;
- authorize paid campaign spend.

Those remain separate governed lanes.

