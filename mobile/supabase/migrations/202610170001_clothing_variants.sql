begin;
-- Clothing sizes and colours.
-- Apply after 202610090001_account_deletion.sql.
--
-- 1. Checkout accepts the same product more than once when the lines differ
--    by size or colour (a shirt in M and in L), and keeps the chosen size and
--    colour on each order line. Stock stays per product, shared by its lines.
-- 2. The dashboard's copy of an app order shows size and colour per line.
-- 3. Sizes, colours, care and highlights edited in the dashboard reach the
--    storefront through the product projection.

-- A line's size or colour: trimmed, short, or null.
create or replace function public.order_line_variant(v text, max_length integer) returns text
language sql immutable set search_path = '' as $$
  select case when length(trim(coalesce(v, ''))) between 1 and max_length then trim(v) end
$$;
revoke all on function public.order_line_variant(text, integer) from public;

create or replace function public.place_order(p_items jsonb, p_profile jsonb, p_voucher text, p_request_id text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  customer uuid := auth.uid();
  result jsonb;
  line jsonb;
  product public.products%rowtype;
  quantity integer;
  line_size text;
  line_color text;
  sizes jsonb;
  lines jsonb := '[]';
  subtotal numeric := 0;
  discount numeric := 0;
  quote jsonb;
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
  -- One line per product, size and colour.
  if exists (select 1 from jsonb_array_elements(p_items) where coalesce(value->>'productId', '') = '')
    or (select count(distinct concat_ws('|', value->>'productId',
          public.order_line_variant(value->>'size', 20), public.order_line_variant(value->>'color', 40)))
        from jsonb_array_elements(p_items)) <> jsonb_array_length(p_items)
    then raise exception 'Duplicate or missing products in checkout.'; end if;
  -- Serialize voucher redemption with concurrent checkouts using the same code.
  if trim(coalesce(p_voucher,''))<>'' then perform pg_advisory_xact_lock(hashtextextended('voucher:'||upper(trim(p_voucher)),0)); end if;
  -- Lock products in a consistent order. Any failure rolls the whole transaction back.
  for line in select value from jsonb_array_elements(p_items)
      order by value->>'productId', value->>'size', value->>'color' loop
    if jsonb_typeof(line->'quantity') is distinct from 'number' or (line->>'quantity') !~ '^[0-9]{1,4}$'
      then raise exception 'Invalid item quantity.'; end if;
    quantity := (line->>'quantity')::integer;
    if quantity < 1 then raise exception 'Invalid item quantity.'; end if;
    line_size := public.order_line_variant(line->>'size', 20);
    line_color := public.order_line_variant(line->>'color', 40);
    select * into product from public.products where id = line->>'productId' and active for update;
    if not found then raise exception 'A product is no longer available.'; end if;
    -- A size the product no longer offers would be a size the store cannot send.
    sizes := case when jsonb_typeof(product.details->'sizes') = 'array' then product.details->'sizes' else '[]' end;
    if line_size is not null and jsonb_array_length(sizes) > 0 and not (sizes ? line_size)
      then raise exception 'Size % is no longer available for %. Choose another size.', line_size, product.name; end if;
    -- Lines of the same product share its stock; this row already reflects earlier lines.
    if product.stock < quantity then raise exception 'Not enough stock for %. Refresh your cart.', product.name; end if;
    update public.products set stock = stock - quantity where id = product.id;
    lines := lines || jsonb_build_array(jsonb_strip_nulls(jsonb_build_object('productId',product.id,'name',product.name,
      'quantity',quantity,'price',product.price,'size',line_size,'color',line_color)));
    subtotal := subtotal + product.price * quantity;
  end loop;
  quote:=public.quote_order(p_items,p_voucher);
  discount:=(quote->>'discount')::numeric;
  result := jsonb_build_object('id',order_id,'createdAt',now(),'items',lines,'subtotal',subtotal,'discount',discount,'shipping',quote->'shipping','voucher',quote->>'voucher','total',quote->'total',
    'profile',jsonb_build_object('name',trim(p_profile->>'name'),'phone',trim(p_profile->>'phone'),'address',trim(p_profile->>'address'),'avatar',''),
    'status','Placed');
  insert into public.orders(id,user_id,request_id,document) values (order_id,customer,p_request_id,result);
  return result;
end $$;
revoke all on function public.place_order(jsonb,jsonb,text,text) from public, anon;
grant execute on function public.place_order(jsonb,jsonb,text,text) to authenticated;

-- The dashboard's order record, now with size and colour on every line.
create or replace function public.project_customer_record() returns trigger
language plpgsql security definer set search_path = '' as $$
declare doc jsonb; profile jsonb; rid text;
begin
  if tg_table_name='orders' then
    rid:=new.id::text; profile:=new.document->'profile';
    doc:=jsonb_build_object('id',rid,'source','customer-app','number','APP-'||upper(left(rid,8)),
      'customerId',new.user_id,'customerName',profile->>'name','customerEmail','','guest',false,
      'status',case new.document->>'status' when 'Placed' then 'pending' else lower(new.document->>'status') end,
      'paymentStatus','unpaid','paymentMethod','Cash on delivery','subtotal',new.document->'subtotal',
      'discountTotal',new.document->'discount','shippingTotal',coalesce(new.document->'shipping','0'),
      'taxTotal',0,'refundedTotal',0,'total',new.document->'total','shippingAddress',jsonb_build_object('line1',profile->>'address'),
      'billingAddress','{}'::jsonb,'placedAt',new.created_at,'createdAt',new.created_at,'updatedAt',now(),
      'channel','app','deletedAt',null,'revision',1,'timeline','[]'::jsonb,
      'lines',(select coalesce(jsonb_agg(jsonb_build_object('productId',i->>'productId','name',i->>'name','quantity',i->'quantity',
        'unitPrice',i->'price','costPrice',0,'discount',0,'tax',0,'sku','',
        'size',coalesce(i->>'size',''),'color',coalesce(i->>'color',''),
        'variant',concat_ws(' / ',nullif(i->>'size',''),nullif(i->>'color','')))),'[]')
        from jsonb_array_elements(new.document->'items') i));
    insert into public.admin_data(collection,id,document) values('orders',rid,doc)
      on conflict(collection,id) do update set document=admin_data.document || jsonb_build_object(
        'status',doc->'status','updatedAt',now(),'revision',coalesce((admin_data.document->>'revision')::int,0)+1),updated_at=now();
  else
    rid:=new.user_id::text; profile:=new.data->'profile';
    doc:=jsonb_build_object('id',rid,'source','customer-app','name',coalesce(profile->>'name','Customer'),
      'phone',profile->>'phone','address',profile->>'address','avatar',profile->>'avatar',
      'status','active','createdAt',now(),'updatedAt',now(),'deletedAt',null,'revision',1);
    insert into public.admin_data(collection,id,document) values('customers',rid,doc)
      on conflict(collection,id) do update set document=admin_data.document || doc || jsonb_build_object(
        'createdAt',admin_data.document->'createdAt','revision',coalesce((admin_data.document->>'revision')::int,0)+1),updated_at=now();
  end if;
  return new;
end $$;

-- Storefront fields derived from a dashboard product. Sizes, colours and stock
-- per variant, care instructions and feature highlights edited in the
-- dashboard override the seeded values; empty dashboard fields leave them.
create or replace function public.storefront_product_metadata(d jsonb) returns jsonb
language sql immutable set search_path='' as $$
select jsonb_build_object('createdAt',d->>'createdAt','originalPrice',case
  when d ? 'compareAtPrice' or d ? 'salePrice' then
    coalesce(nullif(d->>'compareAtPrice','')::numeric,
      case when nullif(d->>'salePrice','')::numeric < nullif(d->>'price','')::numeric then nullif(d->>'price','')::numeric end)
  else nullif(d->'details'->>'originalPrice','')::numeric end)
  || jsonb_strip_nulls(jsonb_build_object(
    'variants',(select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
        'title',nullif(v->>'title',''),'size',nullif(v->>'size',''),'color',nullif(v->>'color',''),
        'stock',case when v->>'stock' ~ '^[0-9]{1,6}$' then (v->>'stock')::integer end)))
      from jsonb_array_elements(case when jsonb_typeof(d->'variants')='array' then d->'variants' else '[]' end) v
      where nullif(v->>'size','') is not null or nullif(v->>'color','') is not null),
    'care',case when length(trim(coalesce(d->>'careInstructions',''))) > 0
      then to_jsonb(array(select trim(x) from regexp_split_to_table(trim(d->>'careInstructions'), E'\n') x where trim(x) <> '')) end,
    'highlights',case when jsonb_typeof(d->'features')='array' and jsonb_array_length(d->'features')>0 then d->'features' end))
$$;
revoke all on function public.storefront_product_metadata(jsonb) from public;

update public.products p set details=p.details || public.storefront_product_metadata(a.document)
  from public.admin_data a where a.collection='products' and a.id=p.id;
commit;
