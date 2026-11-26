-- Public catalog view: ONLY non-sensitive columns. No costs, no exact stock, no SKU/barcode.
-- Runs with owner rights (bypasses RLS) but filters is_active itself.
create or replace view public.public_products as
select
  p.id, p.slug, p.name, p.brand, p.model, p.description, p.specs, p.condition,
  p.retail_price, p.wholesale_price, p.is_featured, p.is_offer, p.created_at,
  p.category_id, c.slug as category_slug, c.name as category_name, pc.slug as parent_slug,
  lower(coalesce(p.name,'') || ' ' || coalesce(p.brand,'') || ' ' || coalesce(p.model,'') || ' ' ||
        coalesce(c.name,'') || ' ' || coalesce(p.specs::text,'')) as search_text,
  exists (select 1 from public.product_variants v
           where v.product_id = p.id and v.is_active and v.stock_quantity > 0) as in_stock,
  (select i.path from public.product_images i where i.product_id = p.id
    order by i.is_primary desc, i.sort_order limit 1) as image_path,
  (select array_agg(distinct v.color) filter (where v.color is not null)
     from public.product_variants v where v.product_id = p.id and v.is_active) as colors
from public.products p
left join public.categories c  on c.id  = p.category_id
left join public.categories pc on pc.id = c.parent_id
where p.is_active;

grant select on public.public_products to anon, authenticated;
