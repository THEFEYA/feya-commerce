-- Supabase staging only; applied 2026-10-11 to project ysnizcgzhdwdfdkjkhud.
-- Exclusive owner decisions; no changes to source products/prices/listings.
create table if not exists public.feya_bonanza_owner_review_drafts_v1 (
 canonical_product_id uuid primary key references public.feya_commerce_product_drafts(canonical_product_id) on delete restrict,
 owner_user_id uuid not null default auth.uid() references auth.users(id),
 owner_decision jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint feya_bonanza_owner_review_object check (jsonb_typeof(owner_decision)='object'),
 constraint feya_bonanza_owner_review_size check (octet_length(owner_decision::text)<=10000)
);
alter table public.feya_bonanza_owner_review_drafts_v1 enable row level security;
revoke all on table public.feya_bonanza_owner_review_drafts_v1 from public, anon, authenticated;
grant select, insert, update on public.feya_bonanza_owner_review_drafts_v1 to authenticated;
create or replace function public.feya_bonanza_owner_review_touch_v1() returns trigger
language plpgsql set search_path=pg_catalog,public as $body$
begin
 new.updated_at:=now();
 if tg_op='UPDATE' then
   new.created_at:=old.created_at;
   new.owner_user_id:=old.owner_user_id;
 end if;
 return new;
end;$body$;
drop trigger if exists feya_bonanza_owner_review_touch on public.feya_bonanza_owner_review_drafts_v1;
create trigger feya_bonanza_owner_review_touch
before insert or update on public.feya_bonanza_owner_review_drafts_v1
for each row execute function public.feya_bonanza_owner_review_touch_v1();
create policy "Bonanza owner read only" on public.feya_bonanza_owner_review_drafts_v1
for select to authenticated
using ((select auth.uid())=owner_user_id and (select auth.jwt()->>'email')='manager.feya@gmail.com');
create policy "Bonanza owner create draft" on public.feya_bonanza_owner_review_drafts_v1
for insert to authenticated
with check ((select auth.uid())=owner_user_id and (select auth.jwt()->>'email')='manager.feya@gmail.com');
create policy "Bonanza owner update draft" on public.feya_bonanza_owner_review_drafts_v1
for update to authenticated
using ((select auth.uid())=owner_user_id and (select auth.jwt()->>'email')='manager.feya@gmail.com')
with check ((select auth.uid())=owner_user_id and (select auth.jwt()->>'email')='manager.feya@gmail.com');
