-- FEYA Commerce — Customer Account RLS Policy Foundation
-- Additive migration. Keeps admin/payment/internal tables closed while allowing future authenticated customers to read their own account data.

-- Customers: authenticated user can see and update only their own customer profile.
drop policy if exists feya_customers_select_own on public.feya_commerce_customers;
create policy feya_customers_select_own
  on public.feya_commerce_customers
  for select
  to authenticated
  using (auth.uid() = auth_user_id);

drop policy if exists feya_customers_update_own on public.feya_commerce_customers;
create policy feya_customers_update_own
  on public.feya_commerce_customers
  for update
  to authenticated
  using (auth.uid() = auth_user_id)
  with check (auth.uid() = auth_user_id);

drop policy if exists feya_customers_insert_own on public.feya_commerce_customers;
create policy feya_customers_insert_own
  on public.feya_commerce_customers
  for insert
  to authenticated
  with check (auth.uid() = auth_user_id);

-- Addresses: customer can access addresses linked to their own profile.
drop policy if exists feya_customer_addresses_select_own on public.feya_commerce_customer_addresses;
create policy feya_customer_addresses_select_own
  on public.feya_commerce_customer_addresses
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.feya_commerce_customers c
      where c.customer_id = feya_commerce_customer_addresses.customer_id
        and c.auth_user_id = auth.uid()
    )
  );

drop policy if exists feya_customer_addresses_write_own on public.feya_commerce_customer_addresses;
create policy feya_customer_addresses_write_own
  on public.feya_commerce_customer_addresses
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.feya_commerce_customers c
      where c.customer_id = feya_commerce_customer_addresses.customer_id
        and c.auth_user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.feya_commerce_customers c
      where c.customer_id = feya_commerce_customer_addresses.customer_id
        and c.auth_user_id = auth.uid()
    )
  );

-- Measurements: customer can access measurement profiles linked to their own profile.
drop policy if exists feya_measurement_profiles_select_own on public.feya_commerce_measurement_profiles;
create policy feya_measurement_profiles_select_own
  on public.feya_commerce_measurement_profiles
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.feya_commerce_customers c
      where c.customer_id = feya_commerce_measurement_profiles.customer_id
        and c.auth_user_id = auth.uid()
    )
  );

drop policy if exists feya_measurement_profiles_write_own on public.feya_commerce_measurement_profiles;
create policy feya_measurement_profiles_write_own
  on public.feya_commerce_measurement_profiles
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.feya_commerce_customers c
      where c.customer_id = feya_commerce_measurement_profiles.customer_id
        and c.auth_user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.feya_commerce_customers c
      where c.customer_id = feya_commerce_measurement_profiles.customer_id
        and c.auth_user_id = auth.uid()
    )
  );

-- Checkout drafts: authenticated user can see drafts linked to their own customer profile.
-- Guest drafts remain accessible only through server-side service routes until linked to an account.
drop policy if exists feya_order_drafts_select_own on public.feya_commerce_order_drafts;
create policy feya_order_drafts_select_own
  on public.feya_commerce_order_drafts
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.feya_commerce_customers c
      where c.customer_id = feya_commerce_order_drafts.customer_id
        and c.auth_user_id = auth.uid()
    )
  );

-- Checkout draft items: visible only when parent draft belongs to the authenticated customer.
drop policy if exists feya_order_draft_items_select_own on public.feya_commerce_order_draft_items;
create policy feya_order_draft_items_select_own
  on public.feya_commerce_order_draft_items
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.feya_commerce_order_drafts d
      join public.feya_commerce_customers c on c.customer_id = d.customer_id
      where d.order_draft_id = feya_commerce_order_draft_items.order_draft_id
        and c.auth_user_id = auth.uid()
    )
  );

-- Paid orders: authenticated customer can see their own orders.
drop policy if exists feya_orders_select_own on public.feya_commerce_orders;
create policy feya_orders_select_own
  on public.feya_commerce_orders
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.feya_commerce_customers c
      where c.customer_id = feya_commerce_orders.customer_id
        and c.auth_user_id = auth.uid()
    )
  );

-- Paid order items: visible only when parent order belongs to the authenticated customer.
drop policy if exists feya_order_items_select_own on public.feya_commerce_order_items;
create policy feya_order_items_select_own
  on public.feya_commerce_order_items
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.feya_commerce_orders o
      join public.feya_commerce_customers c on c.customer_id = o.customer_id
      where o.order_id = feya_commerce_order_items.order_id
        and c.auth_user_id = auth.uid()
    )
  );

-- Internal tables intentionally receive no anon/authenticated public policies here:
-- feya_commerce_order_status_events
-- feya_commerce_order_review_tasks
-- feya_commerce_payment_sessions
-- feya_commerce_payment_webhook_events
-- feya_commerce_order_payments
-- Admin access must be implemented via server routes, service role, or explicit admin role policies later.

comment on policy feya_customers_select_own on public.feya_commerce_customers is 'Customer account can read only its own customer profile.';
comment on policy feya_orders_select_own on public.feya_commerce_orders is 'Customer account can read only its own paid orders.';
comment on policy feya_order_drafts_select_own on public.feya_commerce_order_drafts is 'Customer account can read only drafts linked to its customer profile; guest drafts stay server-only.';
