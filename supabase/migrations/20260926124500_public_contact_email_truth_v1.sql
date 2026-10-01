-- Human Owner contact truth confirmed 26 Sep 2026.
begin;

insert into public.feya_commerce_business_truth_v1(
  truth_code,truth_type,scope_type,scope_key,locale,value_json,public_copy,status,version_no,authority_type,source_note
) values(
  'PUBLIC_CONTACT_EMAIL','BRAND','GLOBAL','GLOBAL','en',
  '{"email":"manager.feya@gmail.com"}'::jsonb,
  'manager.feya@gmail.com',
  'ACTIVE',1,'HUMAN_OWNER',
  'Owner confirmed public store contact email on 2026-09-26.'
)
on conflict (truth_code,scope_type,scope_key,locale,version_no) do nothing;

notify pgrst,'reload schema';
commit;
