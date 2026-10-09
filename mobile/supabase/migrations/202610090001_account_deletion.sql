-- Customer self-service account deletion (Google Play account deletion policy).
-- Apply after 202609160002_storefront_fields.sql.
begin;

-- Completed orders are kept as anonymous sales records, so they must survive
-- the auth user. Audit and config history keep the event without the person.
alter table public.orders alter column user_id drop not null;
alter table public.orders drop constraint if exists orders_user_id_fkey;
alter table public.orders add constraint orders_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete set null;
alter table public.admin_audit drop constraint if exists admin_audit_actor_fkey;
alter table public.admin_audit add constraint admin_audit_actor_fkey
  foreign key (actor) references auth.users(id) on delete set null;
alter table public.app_config drop constraint if exists app_config_published_by_fkey;
alter table public.app_config add constraint app_config_published_by_fkey
  foreign key (published_by) references auth.users(id) on delete set null;
alter table public.app_config_versions drop constraint if exists app_config_versions_actor_fkey;
alter table public.app_config_versions add constraint app_config_versions_actor_fkey
  foreign key (actor) references auth.users(id) on delete set null;

create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'Sign in before deleting your account.'; end if;
  if exists (select 1 from public.admin_members where user_id = uid) then
    raise exception 'Store staff accounts are closed by the store owner. Contact the store to remove this account.';
  end if;
  if exists (select 1 from public.orders where user_id = uid
      and coalesce(document->>'status','Placed') not in ('Delivered','Cancelled')) then
    raise exception 'You have an order in progress. Cancel it or wait until it is delivered, then delete your account.';
  end if;
  -- Strip contact details from kept order records and their dashboard copies.
  update public.orders
    set document = jsonb_set(document, '{profile}', '{"name":"Deleted customer","phone":"","address":""}'::jsonb)
    where user_id = uid;
  update public.admin_data
    set document = document || jsonb_build_object('customerId', null, 'customerName', 'Deleted customer',
        'customerEmail', '', 'shippingAddress', '{}'::jsonb,
        'revision', coalesce((document->>'revision')::int, 0) + 1, 'updatedAt', now()),
      updated_at = now()
    where collection = 'orders' and document->>'customerId' = uid::text;
  delete from public.admin_data where collection = 'customers' and id = uid::text;
  delete from public.admin_data where collection = 'tickets' and document->>'customerId' = uid::text;
  delete from public.device_tokens where user_id = uid;
  -- Cascades to saved profile, cart, wishlist, reviews and upload limits.
  delete from auth.users where id = uid;
end $$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
commit;
