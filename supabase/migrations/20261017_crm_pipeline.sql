-- CRM pipeline and activities for Gestor Inove.
-- Safe to run more than once.
create table if not exists public.crm_deals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  title text not null,
  company_name text,
  contact_name text,
  contact_phone text,
  value numeric(12,2) not null default 0 check (value >= 0),
  stage text not null default 'lead' check (stage in ('lead','qualified','proposal','negotiation','won','lost')),
  source text,
  next_action text,
  next_action_at timestamptz,
  owner_id uuid references auth.users(id) on delete set null,
  notes text,
  lost_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.crm_activities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete cascade,
  deal_id uuid references public.crm_deals(id) on delete cascade,
  assigned_to uuid references auth.users(id) on delete set null,
  title text not null,
  description text,
  activity_type text not null default 'task' check (activity_type in ('task','call','meeting','follow_up','note')),
  status text not null default 'pending' check (status in ('pending','in_progress','completed','cancelled')),
  priority text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  due_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_crm_deals_org_stage on public.crm_deals(organization_id, stage);
create index if not exists idx_crm_deals_customer on public.crm_deals(customer_id);
create index if not exists idx_crm_activities_org_due on public.crm_activities(organization_id, status, due_at);
create index if not exists idx_crm_activities_deal on public.crm_activities(deal_id);

alter table public.crm_deals enable row level security;
alter table public.crm_activities enable row level security;

drop policy if exists "crm deals org members" on public.crm_deals;
create policy "crm deals org members" on public.crm_deals
  for all to authenticated
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

drop policy if exists "crm activities org members" on public.crm_activities;
create policy "crm activities org members" on public.crm_activities
  for all to authenticated
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

grant select, insert, update, delete on public.crm_deals to authenticated;
grant select, insert, update, delete on public.crm_activities to authenticated;
