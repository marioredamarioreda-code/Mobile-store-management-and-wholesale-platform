-- Replaces all pricing tiers of a product in ONE transaction (all-or-nothing).
-- security invoker => RLS applies, so only admins can run it successfully.
create or replace function public.replace_pricing_rules(p_product uuid, p_rules jsonb)
returns void language plpgsql security invoker set search_path = public as $$
begin
  delete from public.pricing_rules where product_id = p_product;
  insert into public.pricing_rules (product_id, customer_type, min_qty, max_qty, discount_type, value)
  select p_product,
         (r->>'customer_type')::customer_type,
         (r->>'min_qty')::int,
         nullif(r->>'max_qty', '')::int,
         (r->>'discount_type')::discount_type,
         (r->>'value')::numeric
    from jsonb_array_elements(p_rules) as r;
end $$;

revoke all on function public.replace_pricing_rules(uuid, jsonb) from public, anon;
grant execute on function public.replace_pricing_rules(uuid, jsonb) to authenticated;
