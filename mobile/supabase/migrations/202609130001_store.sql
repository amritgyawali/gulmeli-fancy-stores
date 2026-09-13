-- Run once in the Supabase SQL editor, or deploy with `supabase db push`.
create table public.products (
  id text primary key,
  name text not null check (length(name) between 1 and 300),
  price numeric(12,2) not null check (price >= 0),
  stock integer not null default 0 check (stock >= 0),
  category text not null,
  product_group text not null default 'home' check (product_group in ('home','offer','choice','recommendation','unavailable')),
  image_url text check (image_url is null or image_url like 'https://res.cloudinary.com/%'),
  details jsonb not null default '{}' check (jsonb_typeof(details) = 'object'),
  sort_order integer not null default 0,
  active boolean not null default true
);
alter table public.products enable row level security;
create policy "Public active catalog" on public.products for select to anon, authenticated using (active);
revoke all on public.products from anon, authenticated;
grant select on public.products to anon, authenticated;

create table public.customer_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}' check (
    jsonb_typeof(data) = 'object' and not (data ? 'orders') and octet_length(data::text) <= 150000
  )
);
alter table public.customer_state enable row level security;
create policy "Read own state" on public.customer_state for select to authenticated using ((select auth.uid()) = user_id);
create policy "Create own state" on public.customer_state for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Update own state" on public.customer_state for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
revoke all on public.customer_state from anon, authenticated;
grant select, insert, update on public.customer_state to authenticated;

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  request_id text not null,
  created_at timestamptz not null default now(),
  document jsonb not null,
  unique(user_id, request_id)
);
create index orders_customer_date on public.orders(user_id, created_at desc);
alter table public.orders enable row level security;
create policy "Read own orders" on public.orders for select to authenticated using ((select auth.uid()) = user_id);
revoke all on public.orders from anon, authenticated;
grant select on public.orders to authenticated;

create function public.place_order(p_items jsonb, p_profile jsonb, p_voucher text, p_request_id text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  customer uuid := auth.uid();
  result jsonb;
  line jsonb;
  product public.products%rowtype;
  quantity integer;
  lines jsonb := '[]';
  subtotal numeric := 0;
  discount numeric := 0;
  order_id uuid := gen_random_uuid();
begin
  if customer is null then raise exception 'Sign in before placing an order.'; end if;
  if p_request_id is null or length(p_request_id) not between 8 and 150 then raise exception 'Invalid checkout request.'; end if;
  -- Same request after a timeout returns the existing order, without charging stock twice.
  perform pg_advisory_xact_lock(hashtextextended(customer::text || ':' || p_request_id, 0));
  select document into result from public.orders where user_id = customer and request_id = p_request_id;
  if found then return result; end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' then raise exception 'Select items to order.'; end if;
  if jsonb_array_length(p_items) not between 1 and 100 then raise exception 'Choose between 1 and 100 products.'; end if;
  if p_profile is null or jsonb_typeof(p_profile) <> 'object'
    or coalesce(length(trim(p_profile->>'name')), 0) not between 2 and 150
    or coalesce(length(trim(p_profile->>'address')), 0) not between 8 and 1000
    or coalesce(p_profile->>'phone', '') !~ '^\+?[0-9 -]+$'
    or length(regexp_replace(coalesce(p_profile->>'phone',''), '[^0-9]', '', 'g')) not between 7 and 15
    then raise exception 'Enter a valid name, phone number and delivery address.'; end if;
  if (select count(distinct value->>'productId') from jsonb_array_elements(p_items)) <> jsonb_array_length(p_items)
    then raise exception 'Duplicate or missing products in checkout.'; end if;
  if trim(coalesce(p_voucher, '')) <> '' and upper(trim(p_voucher)) <> 'GULMELI10'
    then raise exception 'Voucher is not recognized.'; end if;
  -- Lock products in a consistent order. Any failure rolls the whole transaction back.
  for line in select value from jsonb_array_elements(p_items) order by value->>'productId' loop
    if jsonb_typeof(line->'quantity') is distinct from 'number' or (line->>'quantity') !~ '^[0-9]{1,4}$'
      then raise exception 'Invalid item quantity.'; end if;
    quantity := (line->>'quantity')::integer;
    if quantity < 1 then raise exception 'Invalid item quantity.'; end if;
    select * into product from public.products where id = line->>'productId' and active for update;
    if not found then raise exception 'A product is no longer available.'; end if;
    if product.stock < quantity then raise exception 'Not enough stock for %. Refresh your cart.', product.name; end if;
    update public.products set stock = stock - quantity where id = product.id;
    lines := lines || jsonb_build_array(jsonb_build_object('productId',product.id,'name',product.name,'quantity',quantity,'price',product.price));
    subtotal := subtotal + product.price * quantity;
  end loop;
  if upper(trim(p_voucher)) = 'GULMELI10' and subtotal >= 500 then discount := least(100, round(subtotal * 0.1)); end if;
  result := jsonb_build_object('id',order_id,'createdAt',now(),'items',lines,'subtotal',subtotal,'discount',discount,'total',subtotal-discount,
    'profile',jsonb_build_object('name',trim(p_profile->>'name'),'phone',trim(p_profile->>'phone'),'address',trim(p_profile->>'address'),'avatar',''),
    'status','Placed');
  insert into public.orders(id,user_id,request_id,document) values (order_id,customer,p_request_id,result);
  return result;
end $$;
revoke all on function public.place_order(jsonb,jsonb,text,text) from public, anon;
grant execute on function public.place_order(jsonb,jsonb,text,text) to authenticated;

create function public.cancel_order(p_order_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare result jsonb; line jsonb;
begin
  if auth.uid() is null then raise exception 'Sign in first.'; end if;
  select document into result from public.orders where id = p_order_id and user_id = auth.uid() for update;
  if not found then raise exception 'Order not found.'; end if;
  if result->>'status' = 'Cancelled' then return result; end if;
  if result->>'status' <> 'Placed' then raise exception 'This order can no longer be cancelled. Contact the store.'; end if;
  for line in select value from jsonb_array_elements(result->'items') order by value->>'productId' loop
    update public.products set stock = stock + (line->>'quantity')::integer where id = line->>'productId';
  end loop;
  result := jsonb_set(result, '{status}', '"Cancelled"');
  update public.orders set document = result where id = p_order_id;
  return result;
end $$;
revoke all on function public.cancel_order(uuid) from public, anon;
grant execute on function public.cancel_order(uuid) to authenticated;

-- Durable per-account rate limit for the authenticated image proxy.
create table public.image_upload_limits (
  user_id uuid primary key references auth.users(id) on delete cascade,
  window_start timestamptz not null,
  attempts integer not null
);
alter table public.image_upload_limits enable row level security;
revoke all on public.image_upload_limits from anon, authenticated;
create function public.reserve_image_upload() returns boolean
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
  if row.attempts >= 10 then return false; end if;
  update public.image_upload_limits set attempts = attempts + 1 where user_id = auth.uid();
  return true;
end $$;
revoke all on function public.reserve_image_upload() from public, anon;
grant execute on function public.reserve_image_upload() to authenticated;
