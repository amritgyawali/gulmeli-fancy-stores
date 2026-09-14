-- Media library, shared admin data and realtime fan-out.
-- Apply after 202609130001_store.sql and 202609140001_admin_config.sql.
-- Run the whole file once in the Supabase SQL Editor.

-- All media in the app (product photos, banners, icons, documents) lives in
-- Cloudinary; this table is the searchable index of what was stored there.
create table public.media (
  id text primary key,
  public_id text unique,
  url text not null check (url like 'https://%'),
  name text not null check (length(name) between 1 and 300),
  folder text not null default 'General',
  kind text not null default 'image'
    check (kind in ('image','video','pdf','document')),
  alt text not null default '',
  tags jsonb not null default '[]'::jsonb check (jsonb_typeof(tags) = 'array'),
  product_id text references public.products(id) on delete set null,
  width integer not null default 0,
  height integer not null default 0,
  bytes integer not null default 0,
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index media_product on public.media(product_id);
create index media_recent on public.media(created_at desc);
alter table public.media enable row level security;
revoke all on public.media from anon, authenticated;
grant select on public.media to anon, authenticated;
grant insert, update, delete on public.media to authenticated;
create policy "Anyone may read media" on public.media
  for select to anon, authenticated using (true);
create policy "Admins add media" on public.media
  for insert to authenticated with check ((select public.is_admin()));
create policy "Admins update media" on public.media
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Admins delete media" on public.media
  for delete to authenticated using ((select public.is_admin()));

-- One row per record of every admin dashboard collection (products, orders,
-- banners, coupons, customers, pages, ...). The dashboard mirrors writes here
-- and every device receives updates through realtime, so admin CRUD in one
-- place is visible everywhere within seconds.
create table public.admin_data (
  collection text not null,
  id text not null,
  document jsonb not null check (
    jsonb_typeof(document) = 'object' and octet_length(document::text) <= 262144
  ),
  actor text not null default '',
  updated_at timestamptz not null default now(),
  primary key (collection, id)
);
create index admin_data_collection on public.admin_data(collection);
alter table public.admin_data enable row level security;
revoke all on public.admin_data from anon;
grant select, insert, update, delete on public.admin_data to authenticated;
create policy "Admins read shared records" on public.admin_data
  for select to authenticated using ((select public.is_admin()));
create policy "Admins write shared records" on public.admin_data
  for insert to authenticated with check ((select public.is_admin()));
create policy "Admins update shared records" on public.admin_data
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Admins delete shared records" on public.admin_data
  for delete to authenticated using ((select public.is_admin()));

-- Media uploads from the dashboard are larger and more frequent than avatar
-- uploads; raise the per-account hour limit.
create or replace function public.reserve_image_upload() returns boolean
language plpgsql security definer set search_path = '' as $$
declare row public.image_upload_limits%rowtype;
begin
  if auth.uid() is null then raise exception 'Sign in first.'; end if;
  insert into public.image_upload_limits values (auth.uid(),now(),0) on conflict do nothing;
  select * into row from public.image_upload_limits where user_id = auth.uid() for update;
  if row.window_start < now() - interval '1 hour' then
    update public.image_upload_limits set window_start = now(), attempts = 1 where user_id = auth.uid();
    return true;
  end if;
  if row.attempts >= 200 then return false; end if;
  update public.image_upload_limits set attempts = attempts + 1 where user_id = auth.uid();
  return true;
end $$;

-- First signed-in user to claim the dashboard becomes super admin; after that
-- membership is fixed by adding rows to admin_members in the Table Editor.
create or replace function public.claim_first_admin() returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then return false; end if;
  if not exists (select 1 from public.admin_members) then
    insert into public.admin_members(user_id, role) values (auth.uid(), 'super_admin');
    return true;
  end if;
  return (select public.is_admin());
end $$;
revoke all on function public.claim_first_admin() from public, anon;
grant execute on function public.claim_first_admin() to authenticated;

-- Push changes to connected clients immediately instead of waiting for a poll.
do $$ begin
  alter publication supabase_realtime add table products;
exception when duplicate_object then null; when undefined_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table media;
exception when duplicate_object then null; when undefined_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table admin_data;
exception when duplicate_object then null; when undefined_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table orders;
exception when duplicate_object then null; when undefined_object then null; end $$;
