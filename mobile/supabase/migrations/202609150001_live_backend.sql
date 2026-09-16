-- Atomic admin writes, server-owned catalog projection, safe admin enrollment.
begin;
create or replace function public.claim_first_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_admin()
$$;

-- Every device submits only changed records with the version it actually read.
create or replace function public.save_admin_changes(p_changes jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare change jsonb; existing jsonb; next_doc jsonb;
begin
  if not public.is_admin() then raise exception 'Store admin access required.'; end if;
  if jsonb_typeof(p_changes) <> 'array' or jsonb_array_length(p_changes) > 2000 then
    raise exception 'Invalid change batch.';
  end if;
  perform pg_advisory_xact_lock(15092026);
  for change in select value from jsonb_array_elements(p_changes) loop
    if coalesce(change->>'collection','') = '' or coalesce(change->>'id','') = '' then
      raise exception 'Collection and record id are required.';
    end if;
    select document into existing from public.admin_data
      where collection = change->>'collection' and id = change->>'id' for update;
    next_doc := nullif(change->'after','null'::jsonb);
    if existing is not distinct from next_doc then continue; end if;
    if existing is distinct from nullif(change->'before','null'::jsonb) then
      raise exception 'This record changed on another device. Reload before editing: % / %', change->>'collection', change->>'id';
    end if;
    if next_doc is null then
      delete from public.admin_data where collection = change->>'collection' and id = change->>'id';
    else
      if next_doc->>'id' is distinct from change->>'id' then raise exception 'Record id mismatch.'; end if;
      insert into public.admin_data(collection,id,document,actor,updated_at)
        values (change->>'collection',change->>'id',next_doc,auth.uid()::text,now())
      on conflict (collection,id) do update set document=excluded.document,actor=excluded.actor,updated_at=now();
    end if;
  end loop;
end $$;
revoke all on function public.save_admin_changes(jsonb) from public, anon;
grant execute on function public.save_admin_changes(jsonb) to authenticated;
-- Force app writes through the atomic RPC. Old builds must not bypass conflict
-- checks, overwrite stock, or edit an order without inventory reconciliation.
revoke insert,update,delete on public.admin_data,public.products,public.media from authenticated;
revoke update on public.orders from authenticated;

create or replace function public.project_admin_record() returns trigger
language plpgsql security definer set search_path = '' as $$
declare d jsonb; prev jsonb; c text; rid text; photo text; cat text; amount numeric; delta integer;
  live_order public.orders%rowtype; target_status text; item jsonb;
begin
  if tg_op = 'DELETE' then d:=old.document; c:=old.collection; rid:=old.id;
  else d:=new.document; c:=new.collection; rid:=new.id; end if;
  if tg_op = 'UPDATE' then prev:=old.document; else prev:='{}'; end if;
  -- Nested product records are inventory acknowledgements from the server.
  if c='products' and pg_trigger_depth()>1 then return new; end if;
  if c = 'products' then
    if tg_op = 'DELETE' or nullif(d->>'deletedAt','') is not null then
      update public.products set active=false where id=rid;
    else
      select value #>> '{}' into photo from jsonb_array_elements(coalesce(d->'images','[]'))
        where value #>> '{}' like 'https://%' limit 1;
      select document->>'name' into cat from public.admin_data where collection='categories' and id=d->>'categoryId';
      amount:=coalesce(nullif(d->>'salePrice','')::numeric,nullif(d->>'price','')::numeric,0);
      delta:=case when coalesce((d->>'unlimitedStock')::boolean,false) then 99 else coalesce((d->>'stock')::integer,0) end;
      insert into public.products(id,name,price,stock,category,product_group,image_url,details,active)
        values(rid,coalesce(nullif(d->>'name',''),'Unnamed product'),amount,greatest(0,delta),
          coalesce(cat,nullif(d->>'categoryName',''),'General'),
          case when d->>'storefrontGroup' in ('home','offer','choice','recommendation','unavailable') then d->>'storefrontGroup' else 'home' end,
          photo, coalesce(d->'details','{}') || jsonb_build_object('description',d->>'description','brand',d->>'brand','images',coalesce(d->'images','[]')),
          d->>'status'='published')
      on conflict (id) do update set name=excluded.name,price=excluded.price,category=excluded.category,
        product_group=excluded.product_group, image_url=case when d ? 'images' then excluded.image_url else products.image_url end,
        details=products.details || excluded.details,active=excluded.active,
        stock=case when tg_op='UPDATE' then greatest(0,products.stock + delta -
          case when coalesce((prev->>'unlimitedStock')::boolean,false) then 99 else coalesce((prev->>'stock')::integer,0) end)
          else products.stock end;
    end if;
  elsif c='categories' and tg_op <> 'DELETE' then
    update public.products p set category=d->>'name' from public.admin_data a
      where a.collection='products' and a.document->>'categoryId'=rid and p.id=a.id;
  elsif c='media' then
    if tg_op='DELETE' or nullif(d->>'deletedAt','') is not null then
      delete from public.media where id=rid;
    elsif d->>'url' like 'https://%' then
      insert into public.media(id,public_id,url,name,folder,kind,alt,tags,width,height,bytes,note)
      values(rid,nullif(d->>'publicId',''),d->>'url',coalesce(nullif(d->>'name',''),'Photo'),coalesce(d->>'folder','General'),
        coalesce(d->>'kind','image'),coalesce(d->>'alt',''),coalesce(d->'tags','[]'),
        coalesce((d->>'width')::integer,0),coalesce((d->>'height')::integer,0),
        coalesce((d->>'sizeKb')::numeric,0)*1024,coalesce(d->>'note',''))
      on conflict(id) do update set public_id=excluded.public_id,url=excluded.url,name=excluded.name,folder=excluded.folder,
        kind=excluded.kind,alt=excluded.alt,tags=excluded.tags,width=excluded.width,height=excluded.height,bytes=excluded.bytes,note=excluded.note,updated_at=now();
    end if;
  elsif c='orders' and tg_op='UPDATE' and d->>'source'='customer-app' and d->>'status' is distinct from prev->>'status' then
    select * into live_order from public.orders where id::text=rid for update;
    if found then
      target_status:=case lower(d->>'status') when 'cancelled' then 'Cancelled' when 'shipped' then 'Shipped'
        when 'delivered' then 'Delivered' when 'pending' then 'Placed' else initcap(d->>'status') end;
      if live_order.document->>'status' in ('Cancelled','Delivered') and target_status<>live_order.document->>'status' then
        raise exception 'A completed or cancelled order cannot be reopened.';
      end if;
      if target_status='Cancelled' and live_order.document->>'status'<>'Cancelled' then
        if live_order.document->>'status' in ('Shipped','Delivered') then raise exception 'Shipped orders require a return.'; end if;
        for item in select value from jsonb_array_elements(live_order.document->'items') order by value->>'productId' loop
          update public.products set stock=stock+(item->>'quantity')::integer where id=item->>'productId';
          update public.admin_data a set document=a.document || jsonb_build_object(
            'stock',p.stock,'updatedAt',now(),'revision',coalesce((a.document->>'revision')::int,0)+1),updated_at=now()
            from public.products p where a.collection='products' and a.id=p.id and p.id=item->>'productId';
        end loop;
      end if;
      update public.orders set document=jsonb_set(document,'{status}',to_jsonb(target_status)) where id=live_order.id;
    end if;
  end if;
  insert into public.admin_audit(actor,action,resource,record_id) values(auth.uid(),lower(tg_op),c,rid);
  if tg_op='DELETE' then return old; end if; return new;
end $$;
create trigger admin_record_projected after insert or update or delete on public.admin_data
  for each row execute function public.project_admin_record();

-- Customer purchases/cancellations acknowledge actual stock in the dashboard.
-- Writes originating in the admin projection are already represented there.
create or replace function public.project_inventory_count() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.admin_data set document=document || jsonb_build_object(
    'stock',new.stock,'updatedAt',now(),'revision',coalesce((document->>'revision')::int,0)+1),updated_at=now()
    where collection='products' and id=new.id and (document->>'stock')::integer is distinct from new.stock;
  return new;
end $$;
create trigger inventory_count_projected after update of stock on public.products
  for each row when (pg_trigger_depth()=0 and old.stock is distinct from new.stock)
  execute function public.project_inventory_count();

-- Durable customer/admin shared records, created on the server even with no dashboard open.
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
        'unitPrice',i->'price','costPrice',0,'discount',0,'tax',0,'sku','')),'[]') from jsonb_array_elements(new.document->'items') i));
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
-- Avoid recursion when the admin projection updates an order.
create trigger customer_order_projected after insert or update on public.orders
  for each row when (pg_trigger_depth() = 0) execute function public.project_customer_record();
create trigger customer_profile_projected after insert or update on public.customer_state
  for each row execute function public.project_customer_record();

-- Enable all streams that clients subscribe to, including settings and accounts.
do $$ declare t text; begin
  foreach t in array array['products','media','admin_data','orders','customer_state','app_config'] loop
    begin execute format('alter publication supabase_realtime add table public.%I',t);
    exception when duplicate_object or undefined_object then null; end;
  end loop;
end $$;
alter table public.admin_data replica identity full;

-- Public presentation fields only. Internal admin notes and private collections
-- must never be exposed through the storefront API.
create or replace function public.storefront_content() returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('collection',collection,'id',id,'document',(
    select coalesce(jsonb_object_agg(key,value),'{}') from jsonb_each(document)
    where key=any(array['id','name','title','heading','subheading','image','mobileImage','featuredImage','logo','icon',
      'backgroundColor','ctaLabel','ctaLink','categoryId','productId','productIds','placement','devices','sortOrder',
      'slug','description','body','content','question','answer','status','publishAt','unpublishAt'])
  )) order by coalesce((document->>'sortOrder')::numeric,0),id),'[]')
  from public.admin_data
  where collection in ('banners','categories','collections','pages','faqs','menus')
    and nullif(document->>'deletedAt','') is null
    and document->>'status' in ('published','active')
    and (nullif(document->>'publishAt','') is null or (document->>'publishAt')::timestamptz<=now())
    and (nullif(document->>'unpublishAt','') is null or (document->>'unpublishAt')::timestamptz>now())
$$;
revoke all on function public.storefront_content() from public;
grant execute on function public.storefront_content() to anon,authenticated;

-- Adopt the existing live catalog without manufacturing demo sales/customers.
insert into public.admin_data(collection,id,document)
select 'products',id,jsonb_build_object('id',id,'name',name,'slug',id,'sku',upper(id),'price',price,'stock',stock,
  'status',case when active then 'published' else 'draft' end,'categoryName',category,
  'storefrontGroup',product_group,'images',case when image_url is null then '[]'::jsonb else jsonb_build_array(image_url) end,
  'details',details,'createdAt',now(),'updatedAt',now(),'revision',1,'deletedAt',null)
from public.products on conflict do nothing;
-- Hydrate the dashboard with historical customer data as well as future events.
update public.orders set document=document;
update public.customer_state set data=data;
commit;
