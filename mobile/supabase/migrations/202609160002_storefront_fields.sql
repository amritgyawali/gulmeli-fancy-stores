begin;
-- Match the actual enabled-based content models and sale-price fields.
create or replace function public.storefront_product_metadata(d jsonb) returns jsonb
language sql immutable set search_path='' as $$
select jsonb_build_object('createdAt',d->>'createdAt','originalPrice',case
  when d ? 'compareAtPrice' or d ? 'salePrice' then
    coalesce(nullif(d->>'compareAtPrice','')::numeric,
      case when nullif(d->>'salePrice','')::numeric < nullif(d->>'price','')::numeric then nullif(d->>'price','')::numeric end)
  else nullif(d->'details'->>'originalPrice','')::numeric end)
$$;
revoke all on function public.storefront_product_metadata(jsonb) from public;
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
          photo, coalesce(d->'details','{}') || public.storefront_product_metadata(d) || jsonb_build_object('description',d->>'description','brand',d->>'brand','images',coalesce(d->'images','[]')),
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
create or replace function public.storefront_content() returns jsonb
language sql stable security definer set search_path='' as $$
with visible as (
  select collection,id,document from public.admin_data
  where nullif(document->>'deletedAt','') is null and (
    (collection in ('banners','collections','pages','faqs','blog_posts')
      and document->>'status' in ('published','active','scheduled')
      and (nullif(document->>'publishAt','') is null or (document->>'publishAt')::timestamptz<=now())
      and (nullif(document->>'unpublishAt','') is null or (document->>'unpublishAt')::timestamptz>now()))
    or (collection in ('categories','brands','menu_items') and coalesce((document->>'enabled')::boolean,true))
    or (collection='homepage_sections' and coalesce((document->>'enabled')::boolean,false)
      and (nullif(document->>'startsAt','') is null or (document->>'startsAt')::timestamptz<=now())
      and (nullif(document->>'endsAt','') is null or (document->>'endsAt')::timestamptz>now()))
  )
), safe as (
  select collection,id,(select coalesce(jsonb_object_agg(key,value),'{}') from jsonb_each(document)
    where key=any(array['id','name','title','heading','subheading','subtitle','image','mobileImage','featuredImage','logo','icon',
      'backgroundColor','ctaLabel','ctaLink','categoryId','categoryIds','productId','productIds','bannerIds','collectionId',
      'placement','devices','sortOrder','slug','description','body','html','content','question','answer','status','publishAt','unpublishAt',
      'label','menu','target','url','parentId','pageId','newTab','type','layout','itemLimit','enabled','showOnMobile','showOnDesktop','startsAt','endsAt','videoUrl'])) document
  from visible
  union all select 'homepage_config','layout',jsonb_build_object('configured',exists(select 1 from public.admin_data where collection='homepage_sections' and nullif(document->>'deletedAt','') is null))
)
select coalesce(jsonb_agg(jsonb_build_object('collection',collection,'id',id,'document',document)
  order by coalesce((document->>'sortOrder')::numeric,0),id),'[]') from safe;
$$;
revoke all on function public.storefront_content() from public;
grant execute on function public.storefront_content() to anon,authenticated;
create or replace function public.signal_storefront_revision() returns trigger language plpgsql security definer set search_path='' as $$
begin
  if coalesce(new.collection,old.collection) in ('homepage_sections','banners','categories','collections','pages','faqs','menu_items','brands','blog_posts') then
    update public.storefront_revision set updated_at=clock_timestamp() where id=1;
  end if;
  return null;
end $$;

update public.products p set details=p.details || public.storefront_product_metadata(a.document) from public.admin_data a where a.collection='products' and a.id=p.id;
commit;
