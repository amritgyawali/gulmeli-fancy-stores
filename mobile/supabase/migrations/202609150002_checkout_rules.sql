-- Quotes and checkout read the same live shipping, order limits and coupon rules.
create or replace function public.quote_order(p_items jsonb,p_voucher text default '') returns jsonb
language plpgsql security definer set search_path = '' as $$
declare config jsonb; coupon jsonb; line jsonb; p public.products%rowtype; quantity integer;
  subtotal numeric:=0; eligible numeric:=0; discount numeric:=0; shipping numeric:=0;
  code text:=upper(trim(coalesce(p_voucher,''))); eligible_line boolean; used integer; own_used integer;
begin
  if auth.uid() is null then raise exception 'Sign in to calculate your order.'; end if;
  select published into config from public.app_config where id='storefront';
  config:=coalesce(config,'{}');
  if coalesce((config#>>'{features,cashOnDelivery}')::boolean,true)=false then raise exception 'Cash on delivery is currently unavailable.'; end if;
  if coalesce((config#>>'{app,maintenanceMode}')::boolean,false) then raise exception 'The store is temporarily closed for maintenance.'; end if;
  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) not between 1 and 100 then raise exception 'Select items to order.'; end if;
  if code<>'' then
    if coalesce((config#>>'{features,coupons}')::boolean,true)=false then raise exception 'Vouchers are currently disabled.'; end if;
    select document into coupon from public.admin_data where collection='coupons' and upper(trim(document->>'code'))=code order by id limit 1;
    if coupon is null then raise exception 'Voucher is not recognized.'; end if;
    if nullif(coupon->>'deletedAt','') is not null or not coalesce((coupon->>'enabled')::boolean,true)
      or (nullif(coupon->>'startsAt','') is not null and (coupon->>'startsAt')::timestamptz>now())
      or (nullif(coupon->>'endsAt','') is not null and (coupon->>'endsAt')::timestamptz<=now()) then raise exception 'This voucher is not active.'; end if;
    if jsonb_array_length(coalesce(coupon->'customerIds','[]'))>0 and not (coupon->'customerIds' ? auth.uid()::text) then raise exception 'This voucher is not available for your account.'; end if;
    if coalesce((coupon->>'firstOrderOnly')::boolean,false) and exists(select 1 from public.orders where user_id=auth.uid() and document->>'status'<>'Cancelled') then raise exception 'This voucher is for first orders only.'; end if;
    -- These eligibility types require verified customer group/birthday data.
    if coalesce((coupon->>'birthdayOnly')::boolean,false) or jsonb_array_length(coalesce(coupon->'customerGroupIds','[]'))>0 then raise exception 'This voucher requires store verification.'; end if;
    select count(*),count(*) filter(where user_id=auth.uid()) into used,own_used from public.orders where upper(document->>'voucher')=code and document->>'status'<>'Cancelled';
    if (coalesce((coupon->>'usageLimit')::int,0)>0 and used>=(coupon->>'usageLimit')::int)
      or (coalesce((coupon->>'perCustomerLimit')::int,0)>0 and own_used>=(coupon->>'perCustomerLimit')::int)
      or (coalesce((coupon->>'oneTime')::boolean,false) and used>0) then raise exception 'This voucher has reached its usage limit.'; end if;
  end if;
  for line in select value from jsonb_array_elements(p_items) loop
    if jsonb_typeof(line->'quantity') is distinct from 'number' or line->>'quantity' !~ '^[0-9]{1,4}$' then raise exception 'Invalid item quantity.'; end if;
    quantity:=(line->>'quantity')::int;
    select * into p from public.products where id=line->>'productId' and active;
    if not found or quantity<1 then raise exception 'A selected product is unavailable.'; end if;
    subtotal:=subtotal+p.price*quantity;
    eligible_line:=coalesce(coupon->>'appliesTo','all')='all'
      or (coupon->>'appliesTo'='products' and coupon->'productIds' ? p.id)
      or (coupon->>'appliesTo'='categories' and exists(select 1 from public.admin_data where collection='products' and id=p.id and coupon->'categoryIds' ? (document->>'categoryId')))
      or (coupon->>'appliesTo'='collections' and exists(select 1 from public.admin_data where collection='collections' and coupon->'collectionIds' ? id and document->'productIds' ? p.id));
    if eligible_line then
      eligible:=eligible+p.price*quantity;
      if coupon->>'type'='bxgy' then
        discount:=discount + floor(quantity::numeric/(greatest(1,coalesce((coupon->>'buyQuantity')::int,1))+greatest(1,coalesce((coupon->>'getQuantity')::int,1))))
          * greatest(1,coalesce((coupon->>'getQuantity')::int,1))*p.price;
      end if;
    end if;
  end loop;
  if subtotal<coalesce((config#>>'{checkout,minimumOrder}')::numeric,0) then raise exception 'The order is below the store minimum.'; end if;
  if coalesce((config#>>'{checkout,maximumOrder}')::numeric,0)>0 and subtotal>(config#>>'{checkout,maximumOrder}')::numeric then raise exception 'The order exceeds the store maximum.'; end if;
  shipping:=greatest(0,coalesce((config#>>'{checkout,defaultShippingFee}')::numeric,0));
  if coalesce((config#>>'{checkout,freeShippingThreshold}')::numeric,0)>0 and subtotal>=(config#>>'{checkout,freeShippingThreshold}')::numeric then shipping:=0; end if;
  if code<>'' then
    if subtotal<coalesce((coupon->>'minPurchase')::numeric,0) then raise exception 'The order is below this voucher minimum.'; end if;
    if eligible<=0 then raise exception 'This voucher does not apply to the selected products.'; end if;
    if coupon->>'type'='percentage' then discount:=round(eligible*least(100,greatest(0,coalesce((coupon->>'value')::numeric,0)))/100,2);
    elsif coupon->>'type'='fixed' then discount:=greatest(0,coalesce((coupon->>'value')::numeric,0));
    elsif coupon->>'type'='free_shipping' then shipping:=0;
    elsif coupon->>'type'<>'bxgy' then raise exception 'Unsupported voucher type.'; end if;
    if coalesce((coupon->>'maxDiscount')::numeric,0)>0 then discount:=least(discount,(coupon->>'maxDiscount')::numeric); end if;
  end if;
  discount:=least(eligible,discount);
  if coalesce((config#>>'{checkout,codLimit}')::numeric,0)>0 and subtotal-discount+shipping>(config#>>'{checkout,codLimit}')::numeric then raise exception 'The order exceeds the cash-on-delivery limit.'; end if;
  return jsonb_build_object('subtotal',subtotal,'discount',discount,'shipping',shipping,'total',subtotal-discount+shipping,'voucher',code);
end $$;
revoke all on function public.quote_order(jsonb,text) from public,anon;
grant execute on function public.quote_order(jsonb,text) to authenticated;

-- Preserve the existing sample promotion as an editable record.
insert into public.admin_data(collection,id,document)
select 'coupons','coupon-gulmeli10',jsonb_build_object('id','coupon-gulmeli10','code','GULMELI10','title','Welcome discount','enabled',true,
  'type','percentage','value',10,'maxDiscount',100,'minPurchase',500,'appliesTo','all','revision',1,'createdAt',now(),'updatedAt',now(),'deletedAt',null)
where not exists(select 1 from public.admin_data where collection='coupons' and upper(document->>'code')='GULMELI10');

create or replace function public.place_order(p_items jsonb, p_profile jsonb, p_voucher text, p_request_id text)
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
  if (select count(distinct value->>'productId') from jsonb_array_elements(p_items)) <> jsonb_array_length(p_items)
    then raise exception 'Duplicate or missing products in checkout.'; end if;
  -- Serialize voucher redemption with concurrent checkouts using the same code.
  if trim(coalesce(p_voucher,''))<>'' then perform pg_advisory_xact_lock(hashtextextended('voucher:'||upper(trim(p_voucher)),0)); end if;
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

