# TheFEYA → Bonanza Owner Review Studio v2
Date: 2026-10-11. Status: DEPLOYED, owner-only review DRAFT, NOT a Bonanza listing import.

## Links and infrastructure
- Owner URL: https://thefeya-bonanza-review.vercel.app
- Separate Vercel project: thefeya-bonanza-review (project prj_Jh4O8cHLKTCqGcc3MfxJJ4UHVYyp)
- Deployment: dpl_hUW2MecH792R2DAwujv3piF8cR6V (READY, production alias). No change to main TheFEYA site.
- Review database: Supabase project ysnizcgzhdwdfdkjkhud, public.feya_bonanza_owner_review_drafts_v1.
- Access: Supabase Auth existing confirmed owner account manager.feya@gmail.com. Never request owner password in chat.
- Direct browser requests use **publishable** API key only, with Supabase Auth JWT. No service-role credential and no Bonanza API keys are in page code.
- Database: RLS enabled. Authenticated SELECT/INSERT/UPDATE restricted to matching owner UID + email. No anon privilege, no DELETE privilege.
- Data in these rows are recommendations/owner review, NOT canonical product facts, prices or inventory.

## UI review fields
- Colorways, including 2/3-color combinations: multi-select; one combination is one named colorway; 'only as pictured' is exclusive. Custom colors on request is separately available.
- Materials: multi-select of accurate construction categories; owner confirms.
- Audience: Women / Men / Unisex / Couples.
- Optional free-text comment and Hold.
- Completion = confirmed colors + confirmed materials + confirmed audience (Hold not marked complete).
- Group editing across selected image cards; select visible, all filtered; filters for missing color, materials, audience and completed; group by product type.
- Existing 856 configuration prices and names are read-only. No bulk repricing, no implicit color/size price change. Exact USD numerical parity with source prices remains locked.
- Styles/theme and eventual marketplace categories are assigned from existing Product DNA and Bonanza category traits (separate QA), not required owner input.

## Persistence
- Each edit writes to browser local backup pending queue and asynchronously upserts owner review JSON into new Supabase RLS table.
- The UI only says 'Saved in Supabase' after successful HTTP response. On failure shows error and retains pending local changes.
- Owner can export JSON backup. 'Перенести старый JSON' imports local review v1 backup into cloud.
- Agent can later inspect all owner review decisions from Supabase connector without copy/paste. Canonical changes require separate validation and publication gates.

## QA performed
- 207 products / 856 options and 822 image references extracted from canonical staging catalogue.
- JS syntax PASS, HTML references 55 unique IDs matched to actual controls, 0 missing DOM IDs.
- Supabase grants/RLS confirmed: anon SELECT=false, INSERT=false; authenticated SELECT/INSERT/UPDATE=true, DELETE=false; owner-only policies.
- Vercel deployment READY and production aliases assigned.
- IMPORTANT: an end-to-end browser sign-in with the owner's real password is untested, since the owner must enter their password privately. Owner verifies login/sync by editing one pilot card.

## Next stages
- Owner batch reviews colors/materials/audience from the dashboard.
- Read draft rows via SQL, audit exceptions and apply confirmed facts only through a separately controlled pipeline.
- Continue Bonanza category and variation compatibility research; never auto-publish.
