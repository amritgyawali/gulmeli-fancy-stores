-- Fill only missing presentation photos using assets already hosted in Cloudinary.
begin;
update public.admin_data a set document=a.document||jsonb_build_object('image',v.url,'mobileImage',coalesce(nullif(a.document->>'mobileImage',''),v.url),'updatedAt',now(),'revision',coalesce((a.document->>'revision')::int,0)+1),updated_at=now()
from (values ('ban_1','https://res.cloudinary.com/pfpnbrtx/image/upload/v1789495036/gulmeli/catalog/daraz_app_home_screen-13.jpg'),('ban_2','https://res.cloudinary.com/pfpnbrtx/image/upload/v1789495045/gulmeli/catalog/daraz_buy_more_save_more_offer_screen-6.jpg'),('ban_3','https://res.cloudinary.com/pfpnbrtx/image/upload/v1789495056/gulmeli/catalog/monitor.jpg')) as v(id,url) where a.collection='banners' and a.id=v.id and nullif(a.document->>'image','') is null;
update public.admin_data a set document=a.document||jsonb_build_object('image',p.image_url,'updatedAt',now(),'revision',coalesce((a.document->>'revision')::int,0)+1),updated_at=now()
from (select distinct on (category) category,image_url from public.products where active and image_url is not null order by category,id) p
where a.collection='categories' and a.document->>'name'=p.category and nullif(a.document->>'image','') is null;
commit;
