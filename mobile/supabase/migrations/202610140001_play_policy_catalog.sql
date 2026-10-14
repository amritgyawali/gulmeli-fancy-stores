-- Google Play content policy: take two sample products off the storefront.
--   prod_restricted  adult sexual product (Inappropriate Content policy)
--   prod_posters     unlicensed anime merchandise (Intellectual Property policy)
-- Archiving the admin record keeps the dashboard in sync; the products row is
-- also switched off directly in case it has no admin record. Re-publish from
-- the admin dashboard only with stock you are allowed to sell.
update public.admin_data
   set document = document || jsonb_build_object('status', 'archived'),
       updated_at = now()
 where collection = 'products'
   and id in ('prod_restricted', 'prod_posters')
   and document->>'status' is distinct from 'archived';

update public.products
   set active = false
 where id in ('prod_restricted', 'prod_posters', 'restricted', 'posters');
