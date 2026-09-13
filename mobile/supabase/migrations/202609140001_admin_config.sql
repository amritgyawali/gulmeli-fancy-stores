-- Shared storefront configuration and the admin role that may change it.
-- Apply after 202609130001_store.sql.

-- Who is allowed to run the dashboard against this project.
create table public.admin_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'manager'
    check (role in ('super_admin','manager','product_manager','order_manager','support','marketing','accountant','warehouse')),
  created_at timestamptz not null default now()
);
alter table public.admin_members enable row level security;
revoke all on public.admin_members from anon, authenticated;
grant select on public.admin_members to authenticated;
create policy "Read own membership" on public.admin_members
  for select to authenticated using ((select auth.uid()) = user_id);

-- Kept out of the policies below so they never recurse through RLS.
create function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.admin_members where user_id = auth.uid())
$$;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

create function public.is_super_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.admin_members where user_id = auth.uid() and role = 'super_admin'
  )
$$;
revoke all on function public.is_super_admin() from public, anon;
grant execute on function public.is_super_admin() to authenticated;

-- The published storefront configuration. One row, readable by everyone, so
-- colours, wording, menus, feature switches and contact details can change
-- without shipping a new build of the app.
create table public.app_config (
  id text primary key default 'storefront' check (id = 'storefront'),
  published jsonb not null default '{}' check (
    jsonb_typeof(published) = 'object' and octet_length(published::text) <= 400000
  ),
  published_at timestamptz not null default now(),
  published_by uuid references auth.users(id)
);
alter table public.app_config enable row level security;
revoke all on public.app_config from anon, authenticated;
grant select on public.app_config to anon, authenticated;
grant insert, update on public.app_config to authenticated;
create policy "Anyone may read the published configuration" on public.app_config
  for select to anon, authenticated using (true);
create policy "Admins may create the configuration" on public.app_config
  for insert to authenticated with check ((select public.is_admin()));
create policy "Admins may publish the configuration" on public.app_config
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- Every published version, so a bad change can be rolled back.
create table public.app_config_versions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  actor uuid references auth.users(id),
  label text not null default '',
  changed_paths text[] not null default '{}',
  config jsonb not null
);
create index app_config_versions_recent on public.app_config_versions(created_at desc);
alter table public.app_config_versions enable row level security;
revoke all on public.app_config_versions from anon, authenticated;
grant select, insert on public.app_config_versions to authenticated;
create policy "Admins read configuration history" on public.app_config_versions
  for select to authenticated using ((select public.is_admin()));
create policy "Admins record configuration history" on public.app_config_versions
  for insert to authenticated with check ((select public.is_admin()));

-- Keeps a version whenever the published document actually changes.
create function public.record_config_version() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and old.published is not distinct from new.published then
    return new;
  end if;
  insert into public.app_config_versions(actor, label, config)
  values (auth.uid(), 'Published from the admin dashboard', new.published);
  delete from public.app_config_versions
  where id in (
    select id from public.app_config_versions order by created_at desc offset 50
  );
  return new;
end $$;
create trigger app_config_versioned
  after insert or update on public.app_config
  for each row execute function public.record_config_version();

-- Admin writes to the catalogue. Customers keep read-only access to active
-- products through the policy in the first migration.
grant insert, update, delete on public.products to authenticated;
create policy "Admins read every product" on public.products
  for select to authenticated using ((select public.is_admin()));
create policy "Admins create products" on public.products
  for insert to authenticated with check ((select public.is_admin()));
create policy "Admins update products" on public.products
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Admins delete products" on public.products
  for delete to authenticated using ((select public.is_super_admin()));

-- Admins need to see and progress every order, not only their own.
create policy "Admins read every order" on public.orders
  for select to authenticated using ((select public.is_admin()));
grant update on public.orders to authenticated;
create policy "Admins update orders" on public.orders
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- Server-side record of who changed what, so the trail survives a device wipe.
create table public.admin_audit (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  actor uuid references auth.users(id),
  actor_name text not null default '',
  action text not null,
  resource text not null,
  record_id text,
  record_label text not null default '',
  changes jsonb not null default '[]'
);
create index admin_audit_recent on public.admin_audit(created_at desc);
alter table public.admin_audit enable row level security;
revoke all on public.admin_audit from anon, authenticated;
grant select, insert on public.admin_audit to authenticated;
create policy "Admins read the audit trail" on public.admin_audit
  for select to authenticated using ((select public.is_admin()));
create policy "Admins append to the audit trail" on public.admin_audit
  for insert to authenticated with check ((select public.is_admin()) and actor = (select auth.uid()));
