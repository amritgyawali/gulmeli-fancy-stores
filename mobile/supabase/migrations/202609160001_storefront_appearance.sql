begin;
-- Public revision signal contains no private dashboard data. It allows shoppers
-- to refresh a published layout immediately without access to admin_data.
create table if not exists public.storefront_revision(id integer primary key check(id=1),updated_at timestamptz not null default now());
alter table public.storefront_revision enable row level security;
grant select on public.storefront_revision to anon,authenticated;
create policy "Read storefront revision" on public.storefront_revision for select to anon,authenticated using(true);
insert into public.storefront_revision(id) values(1) on conflict do nothing;
create or replace function public.signal_storefront_revision() returns trigger language plpgsql security definer set search_path='' as $$
begin
  if coalesce(new.collection,old.collection) in ('homepage_sections','banners','categories','collections','pages','faqs','menus','brands','blog_posts') then
    update public.storefront_revision set updated_at=clock_timestamp() where id=1;
  end if;
  return null;
end $$;
create trigger storefront_content_changed after insert or update or delete on public.admin_data
  for each row execute function public.signal_storefront_revision();
do $$ begin alter publication supabase_realtime add table public.storefront_revision; exception when duplicate_object or undefined_object then null; end $$;

create or replace function public.storefront_content() returns jsonb
language sql stable security definer set search_path='' as $$
with visible as (
  select collection,id,document from public.admin_data
  where nullif(document->>'deletedAt','') is null and (
    (collection in ('banners','categories','collections','pages','faqs','menus','brands','blog_posts')
      and document->>'status' in ('published','active')
      and (nullif(document->>'publishAt','') is null or (document->>'publishAt')::timestamptz<=now())
      and (nullif(document->>'unpublishAt','') is null or (document->>'unpublishAt')::timestamptz>now()))
    or (collection='homepage_sections' and coalesce((document->>'enabled')::boolean,false)
      and (nullif(document->>'startsAt','') is null or (document->>'startsAt')::timestamptz<=now())
      and (nullif(document->>'endsAt','') is null or (document->>'endsAt')::timestamptz>now()))
  )
), safe as (
  select collection,id,(select coalesce(jsonb_object_agg(key,value),'{}') from jsonb_each(document)
    where key=any(array['id','name','title','heading','subheading','subtitle','image','mobileImage','featuredImage','logo','icon',
      'backgroundColor','ctaLabel','ctaLink','categoryId','categoryIds','productId','productIds','bannerIds','collectionId',
      'placement','devices','sortOrder','slug','description','body','html','content','question','answer','status','publishAt','unpublishAt',
      'type','layout','itemLimit','enabled','showOnMobile','showOnDesktop','startsAt','endsAt','videoUrl'])) document
  from visible
  union all select 'homepage_config','layout',jsonb_build_object('configured',exists(select 1 from public.admin_data where collection='homepage_sections' and nullif(document->>'deletedAt','') is null))
)
select coalesce(jsonb_agg(jsonb_build_object('collection',collection,'id',id,'document',document)
  order by coalesce((document->>'sortOrder')::numeric,0),id),'[]') from safe;
$$;
revoke all on function public.storefront_content() from public;
grant execute on function public.storefront_content() to anon,authenticated;
commit;
