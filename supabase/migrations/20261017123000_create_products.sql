-- Produtos independentes para o Gestor Inove
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  category_id uuid references public.plan_categories(id) on delete set null,
  name text not null,
  sku text,
  description text,
  price numeric(12,2) not null default 0 check (price >= 0),
  cost numeric(12,2) not null default 0 check (cost >= 0),
  status text not null default 'active' check (status in ('active','inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, sku)
);

create index if not exists idx_products_org on public.products(organization_id);
create index if not exists idx_products_category on public.products(category_id);

alter table public.products enable row level security;
drop policy if exists "products org members" on public.products;
create policy "products org members"
  on public.products for all to authenticated
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

grant select, insert, update, delete on public.products to authenticated;
