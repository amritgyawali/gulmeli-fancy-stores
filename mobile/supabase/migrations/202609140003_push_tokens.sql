-- Push device tokens registered by the mobile app (expo-notifications).
create table if not exists public.device_tokens (
  token text primary key,
  user_id uuid references auth.users(id) on delete set null,
  platform text not null default 'android',
  install_id text,
  created_at timestamptz not null default now()
);
alter table public.device_tokens enable row level security;
create policy "Register own device" on public.device_tokens for insert to authenticated with check ((select auth.uid()) = user_id or user_id is null);
create policy "Update own device" on public.device_tokens for update to authenticated using (user_id = (select auth.uid()) or user_id is null) with check (user_id = (select auth.uid()) or user_id is null);
create policy "Read own devices" on public.device_tokens for select to authenticated using ((select auth.uid()) = user_id);
grant select, insert, update on public.device_tokens to authenticated;
