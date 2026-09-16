-- Live database smoke test. Every test record and change is rolled back.
begin;
select set_config('gulmeli.verify_admin',gen_random_uuid()::text,true);
select set_config('gulmeli.verify_customer',gen_random_uuid()::text,true);
select set_config('gulmeli.verify_product','verify-'||gen_random_uuid()::text,true);
insert into auth.users(id) values
  (current_setting('gulmeli.verify_admin')::uuid),
  (current_setting('gulmeli.verify_customer')::uuid);
insert into public.admin_members(user_id,role) values(current_setting('gulmeli.verify_admin')::uuid,'super_admin');
update public.app_config set published='{}' where id='storefront';
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('gulmeli.verify_admin'),true);
do $$ declare p jsonb; begin
  p:=jsonb_build_object('id',current_setting('gulmeli.verify_product'),'name','Verification product',
    'price',100,'stock',3,'status','published','images','[]'::jsonb);
  perform public.save_admin_changes(jsonb_build_array(jsonb_build_object('collection','products','id',p->>'id','before',null,'after',p)));
  if not exists(select 1 from public.products where id=p->>'id' and stock=3 and price=100 and active) then
    raise exception 'Admin product projection failed';
  end if;
end $$;
select set_config('request.jwt.claim.sub',current_setting('gulmeli.verify_customer'),true);
do $$ declare o jsonb; retry_order jsonb; items jsonb; profile jsonb; begin
  begin
    perform public.save_admin_changes('[]');
    raise exception 'Customer unexpectedly received admin access';
  exception when others then
    if sqlerrm not like '%Store admin access required%' then raise; end if;
  end;
  items:=jsonb_build_array(jsonb_build_object('productId',current_setting('gulmeli.verify_product'),'quantity',1));
  profile:='{"name":"Verification customer","phone":"9800000000","address":"Verification address, Kathmandu"}';
  o:=public.place_order(items,profile,'','verification-request');
  retry_order:=public.place_order(items,profile,'','verification-request');
  if o->>'id' is distinct from retry_order->>'id' or (o->>'total')::numeric<>100 then raise exception 'Checkout retry or totals failed'; end if;
  if (select stock from public.products where id=current_setting('gulmeli.verify_product'))<>2 then raise exception 'Checkout inventory failed'; end if;
  perform public.cancel_order((o->>'id')::uuid);
  perform public.cancel_order((o->>'id')::uuid);
  if (select stock from public.products where id=current_setting('gulmeli.verify_product'))<>3 then raise exception 'Cancellation inventory failed'; end if;
  perform public.send_support_message('verification-'||current_setting('gulmeli.verify_customer'),'Verification support message','Verification');
  if jsonb_array_length(public.my_support_tickets())<>1 then raise exception 'Support creation failed'; end if;
end $$;
select set_config('request.jwt.claim.sub',current_setting('gulmeli.verify_admin'),true);
do $$ declare p jsonb; changed jsonb; begin
  if jsonb_array_length(public.my_support_tickets())<>0 then raise exception 'Support account isolation failed'; end if;
  select document into p from public.admin_data where collection='products' and id=current_setting('gulmeli.verify_product');
  if (p->>'stock')::int<>3 then raise exception 'Dashboard inventory sync failed'; end if;
  changed:=p||'{"name":"Updated verification product"}';
  perform public.save_admin_changes(jsonb_build_array(jsonb_build_object('collection','products','id',p->>'id','before',p,'after',changed)));
  begin
    perform public.save_admin_changes(jsonb_build_array(jsonb_build_object('collection','products','id',p->>'id','before',p,'after',p||'{"name":"Stale change"}')));
    raise exception 'Stale admin edit was accepted';
  exception when others then
    if sqlerrm not like '%another device%' then raise; end if;
  end;
  perform public.save_admin_changes(jsonb_build_array(jsonb_build_object('collection','products','id',p->>'id','before',changed,'after',null)));
  if exists(select 1 from public.products where id=p->>'id' and active) then raise exception 'Product deletion failed'; end if;
end $$;
rollback;
select 'PASS: admin CRUD/conflicts, customer isolation, checkout/retry, cancellation/stock, support. All test changes rolled back.' as verification;
