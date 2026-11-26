-- =====================================================================
-- Mobile Store: schema, RLS, views, triggers, storage, seed
-- Run once in Supabase Dashboard -> SQL Editor
-- =====================================================================
create extension if not exists pg_trgm;
create extension if not exists btree_gist;

-- ---------- Enums ----------
create type user_role         as enum ('admin', 'staff');
create type customer_type     as enum ('retail', 'wholesale');
create type discount_type     as enum ('percent', 'amount_off', 'fixed_price');
create type movement_type     as enum ('purchase', 'sale', 'adjustment', 'return');
create type product_condition as enum ('new', 'used', 'refurbished');

-- ---------- Helpers ----------
create or replace function public.set_updated_at() returns trigger
language plpgsql as $$ begin new.updated_at = now(); return new; end $$;

-- ---------- Profiles ----------
create table public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  full_name  text,
  role       user_role not null default 'staff',
  created_at timestamptz not null default now()
);

-- Admin check. SECURITY DEFINER so RLS on profiles does not recurse.
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- ---------- Categories ----------
create table public.categories (
  id         uuid primary key default gen_random_uuid(),
  parent_id  uuid references public.categories(id) on delete set null,
  name       text not null,
  slug       text not null unique,
  sort_order int  not null default 0,
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.categories (parent_id);
create index on public.categories (sort_order);
create trigger trg_categories_updated before update on public.categories
  for each row execute function public.set_updated_at();

-- ---------- Products (public data only; NO cost here) ----------
create table public.products (
  id              uuid primary key default gen_random_uuid(),
  category_id     uuid references public.categories(id) on delete set null,
  name            text not null,
  slug            text not null unique,
  brand           text,
  model           text,
  description     text,
  specs           jsonb not null default '{}'::jsonb,
  condition       product_condition not null default 'new',
  retail_price    numeric(12,2) not null check (retail_price >= 0),
  wholesale_price numeric(12,2) not null check (wholesale_price >= 0),
  is_featured     boolean not null default false,
  is_offer        boolean not null default false,
  is_active       boolean not null default true,
  search_text     text generated always as (
    lower(coalesce(name,'') || ' ' || coalesce(brand,'') || ' ' || coalesce(model,''))
  ) stored,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index on public.products (category_id);
create index on public.products (brand);
create index on public.products (is_active, created_at desc);
create index products_search_trgm on public.products using gin (search_text gin_trgm_ops);
create trigger trg_products_updated before update on public.products
  for each row execute function public.set_updated_at();

-- ---------- Variants (color / storage / RAM / stock) ----------
create table public.product_variants (
  id                uuid primary key default gen_random_uuid(),
  product_id        uuid not null references public.products(id) on delete cascade,
  color             text,
  storage           text,
  ram               text,
  sku               text unique,
  barcode           text unique,
  stock_quantity    int not null default 0 check (stock_quantity >= 0),
  low_stock_threshold int not null default 3 check (low_stock_threshold >= 0),
  sort_order        int not null default 0,
  is_active         boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index on public.product_variants (product_id);
create trigger trg_variants_updated before update on public.product_variants
  for each row execute function public.set_updated_at();

-- ---------- Costs (ADMIN ONLY) ----------
create table public.product_costs (
  variant_id    uuid primary key references public.product_variants(id) on delete cascade,
  purchase_cost numeric(12,2) not null check (purchase_cost >= 0),
  updated_at    timestamptz not null default now()
);
create trigger trg_costs_updated before update on public.product_costs
  for each row execute function public.set_updated_at();

-- ---------- Images ----------
create table public.product_images (
  id         uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  path       text not null,            -- path inside bucket product-images
  sort_order int  not null default 0,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);
create index on public.product_images (product_id, sort_order);
create unique index one_primary_image_per_product
  on public.product_images (product_id) where is_primary;

-- ---------- Pricing rules (quantity tiers) ----------
create table public.pricing_rules (
  id            uuid primary key default gen_random_uuid(),
  product_id    uuid not null references public.products(id) on delete cascade,
  customer_type customer_type not null,
  min_qty       int not null check (min_qty >= 1),
  max_qty       int check (max_qty is null or max_qty >= min_qty),  -- null = open ended (10+)
  discount_type discount_type not null,
  value         numeric(12,2) not null check (value >= 0),
  created_at    timestamptz not null default now(),
  check (discount_type <> 'percent' or value <= 100),
  -- tiers of the same product + customer type may not overlap
  constraint pricing_rules_no_overlap exclude using gist (
    product_id with =,
    customer_type with =,
    int4range(min_qty, coalesce(max_qty, 2147483646), '[]') with &&
  )
);
create index on public.pricing_rules (product_id, customer_type, min_qty);

-- ---------- Inventory movements (stock changes only via this table) ----------
create table public.inventory_movements (
  id         uuid primary key default gen_random_uuid(),
  variant_id uuid not null references public.product_variants(id) on delete cascade,
  type       movement_type not null,
  quantity   int not null check (quantity <> 0),   -- signed delta
  note       text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create index on public.inventory_movements (variant_id, created_at desc);

create or replace function public.apply_inventory_movement() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.product_variants
     set stock_quantity = stock_quantity + new.quantity
   where id = new.variant_id;   -- CHECK (>= 0) rejects overselling
  return new;
end $$;
create trigger trg_apply_movement after insert on public.inventory_movements
  for each row execute function public.apply_inventory_movement();

-- ---------- Price history (ADMIN ONLY, trigger-maintained) ----------
create table public.price_history (
  id         uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete cascade,
  variant_id uuid references public.product_variants(id) on delete cascade,
  field      text not null check (field in ('retail_price','wholesale_price','purchase_cost')),
  old_value  numeric(12,2),
  new_value  numeric(12,2),
  changed_by uuid references auth.users(id),
  changed_at timestamptz not null default now()
);
create index on public.price_history (product_id, changed_at desc);

create or replace function public.log_product_price_change() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.retail_price is distinct from old.retail_price then
    insert into price_history (product_id, field, old_value, new_value, changed_by)
    values (new.id, 'retail_price', old.retail_price, new.retail_price, auth.uid());
  end if;
  if new.wholesale_price is distinct from old.wholesale_price then
    insert into price_history (product_id, field, old_value, new_value, changed_by)
    values (new.id, 'wholesale_price', old.wholesale_price, new.wholesale_price, auth.uid());
  end if;
  return new;
end $$;
create trigger trg_products_price_history after update on public.products
  for each row execute function public.log_product_price_change();

create or replace function public.log_cost_change() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.purchase_cost is distinct from old.purchase_cost then
    insert into price_history (variant_id, field, old_value, new_value, changed_by)
    values (new.variant_id, 'purchase_cost', old.purchase_cost, new.purchase_cost, auth.uid());
  end if;
  return new;
end $$;
create trigger trg_costs_price_history after update on public.product_costs
  for each row execute function public.log_cost_change();

-- ---------- Store settings (single row) ----------
create table public.store_settings (
  id              boolean primary key default true check (id),
  store_name      text not null default 'متجر الموبايلات',
  logo_path       text,
  description     text,
  phone           text,
  whatsapp        text,   -- digits with country code, e.g. 201001234567
  address         text,
  facebook_url    text,
  instagram_url   text,
  currency        text not null default 'EGP',
  updated_at      timestamptz not null default now()
);
create trigger trg_settings_updated before update on public.store_settings
  for each row execute function public.set_updated_at();

-- ---------- Future-ready: customers / orders (admin only, no UI yet) ----------
create table public.customers (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  phone      text,
  type       customer_type not null default 'retail',
  notes      text,
  created_at timestamptz not null default now()
);
create table public.orders (
  id            uuid primary key default gen_random_uuid(),
  customer_id   uuid references public.customers(id) on delete set null,
  customer_type customer_type not null,
  status        text not null default 'pending' check (status in ('pending','confirmed','delivered','cancelled')),
  total         numeric(12,2) not null default 0,
  created_at    timestamptz not null default now()
);
create table public.order_items (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  variant_id uuid references public.product_variants(id) on delete set null,
  quantity   int not null check (quantity > 0),
  unit_price numeric(12,2) not null,
  unit_cost  numeric(12,2) not null          -- snapshot for profit reports
);
create index on public.orders (customer_id);
create index on public.order_items (order_id);

-- =====================================================================
-- Row Level Security
-- =====================================================================
alter table public.profiles            enable row level security;
alter table public.categories          enable row level security;
alter table public.products            enable row level security;
alter table public.product_variants    enable row level security;
alter table public.product_costs       enable row level security;
alter table public.product_images      enable row level security;
alter table public.pricing_rules       enable row level security;
alter table public.inventory_movements enable row level security;
alter table public.price_history       enable row level security;
alter table public.store_settings      enable row level security;
alter table public.customers           enable row level security;
alter table public.orders              enable row level security;
alter table public.order_items         enable row level security;

-- Profiles: read own row; admins manage all
create policy "own profile"   on public.profiles for select to authenticated using (id = auth.uid());
create policy "admin profiles" on public.profiles for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Admin full access on every business table
do $$
declare t text;
begin
  foreach t in array array['categories','products','product_variants','product_costs','product_images',
    'pricing_rules','inventory_movements','price_history','store_settings','customers','orders','order_items']
  loop
    execute format('create policy "admin all" on public.%I for all to authenticated
                    using (public.is_admin()) with check (public.is_admin())', t);
  end loop;
end $$;

-- Public (anon + authenticated) read access: ONLY non-financial tables
create policy "public read categories" on public.categories for select to anon, authenticated
  using (is_active);
create policy "public read products" on public.products for select to anon, authenticated
  using (is_active);
create policy "public read images" on public.product_images for select to anon, authenticated
  using (exists (select 1 from public.products p where p.id = product_id and p.is_active));
create policy "public read pricing rules" on public.pricing_rules for select to anon, authenticated
  using (exists (select 1 from public.products p where p.id = product_id and p.is_active));
create policy "public read settings" on public.store_settings for select to anon, authenticated
  using (true);

-- product_variants, product_costs, inventory_movements, price_history, orders...
-- have NO public policy => invisible to the public.

-- Public view of variants: hides SKU, barcode and exact stock numbers
create view public.public_variants as
  select v.id, v.product_id, v.color, v.storage, v.ram, v.sort_order,
         (v.stock_quantity > 0) as in_stock,
         (v.stock_quantity > 0 and v.stock_quantity <= v.low_stock_threshold) as low_stock
    from public.product_variants v
    join public.products p on p.id = v.product_id
   where p.is_active and v.is_active;
grant select on public.public_variants to anon, authenticated;

-- =====================================================================
-- Storage buckets (public read, admin-only write)
-- =====================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('product-images', 'product-images', true, 5242880, array['image/webp','image/jpeg','image/png','image/avif']),
  ('store-assets',   'store-assets',   true, 2097152, array['image/webp','image/jpeg','image/png','image/svg+xml'])
on conflict (id) do nothing;

create policy "public read store images" on storage.objects for select to anon, authenticated
  using (bucket_id in ('product-images','store-assets'));
create policy "admin write store images" on storage.objects for insert to authenticated
  with check (bucket_id in ('product-images','store-assets') and public.is_admin());
create policy "admin update store images" on storage.objects for update to authenticated
  using (bucket_id in ('product-images','store-assets') and public.is_admin());
create policy "admin delete store images" on storage.objects for delete to authenticated
  using (bucket_id in ('product-images','store-assets') and public.is_admin());

-- =====================================================================
-- Seed
-- =====================================================================
insert into public.store_settings (id) values (true) on conflict do nothing;

insert into public.categories (name, slug, sort_order) values
  ('موبايلات','mobile-phones',1), ('تابلت','tablets',2), ('ساعات ذكية','smartwatches',3),
  ('سماعات','headphones',4), ('شواحن','chargers',5), ('باور بانك','power-banks',6),
  ('كابلات','cables',7), ('إكسسوارات','accessories',8);

insert into public.categories (name, slug, parent_id, sort_order)
select v.name, v.slug, c.id, v.ord from (values
  ('آيفون','iphones','mobile-phones',1), ('سامسونج','samsung','mobile-phones',2),
  ('أندرويد','android-phones','mobile-phones',3),
  ('أغطية وجرابات','covers','accessories',1), ('اسكرينات حماية','screen-protectors','accessories',2)
) as v(name, slug, parent, ord) join public.categories c on c.slug = v.parent;

-- =====================================================================
-- After creating your admin user in Authentication -> Users, run:
--   insert into public.profiles (id, full_name, role)
--   values ('<USER-UUID>', 'Admin', 'admin');
-- =====================================================================
