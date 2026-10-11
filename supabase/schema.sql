-- ==============================================================================
-- SCHEMA COMPLETO DO SUPABASE (GESTOR-INOVE / CLOUDZAP)
-- ==============================================================================
create extension if not exists pgcrypto;

-- 1. PROFILES (Perfil do Usuário)
create table if not exists public.profiles(
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  is_admin boolean default false,
  created_at timestamptz default now()
);

-- 2. ORGANIZATIONS (Empresas / Organizações)
create table if not exists public.organizations(
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  access_status text not null default 'trial',
  trial_ends_at timestamptz default (now() + interval '7 days'),
  subscription_plan_code text default 'trial',
  subscription_status text default 'trialing',
  activated_at timestamptz,
  created_at timestamptz default now()
);

-- 3. ORGANIZATION_MEMBERS (Vínculo de Usuários com Organizações)
create table if not exists public.organization_members(
  organization_id uuid references public.organizations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  role text not null default 'operator',
  created_at timestamptz default now(),
  primary key(organization_id, user_id)
);

-- 4. PLAN_CATEGORIES (Categorias de Planos)
create table if not exists public.plan_categories(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  description text,
  color text default '#2563eb',
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(organization_id, name)
);

-- 5. PLANS (Planos de Assinatura)
create table if not exists public.plans(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  category_id uuid references public.plan_categories(id) on delete set null,
  name text not null,
  whatsapp text not null,
  description text not null,
  price numeric(12,2) not null default 0 check(price>=0),
  unit text not null default '1 acesso',
  duration_value integer not null default 30 check(duration_value>0),
  duration_unit text not null default 'dias' check(duration_unit in('dias','meses')),
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 6. CUSTOMERS (Clientes)
create table if not exists public.customers(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  document text,
  notes text,
  status text not null default 'active',
  plan_id uuid references public.plans(id) on delete set null,
  category_id uuid references public.plan_categories(id) on delete set null,
  description text,
  username text,
  due_date date,
  automatic_message boolean not null default true,
  product text,
  created_at timestamptz default now()
);

-- 7. CHARGES (Cobranças / Faturas)
create table if not exists public.charges(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  description text not null,
  amount numeric(12,2) not null,
  due_date date not null,
  status text not null default 'pending', -- 'pending', 'paid', 'overdue', 'cancelled'
  payment_method text default 'pix',
  paid_at timestamptz,
  pix_code text,
  pix_qr_code text,
  billing_cycle text default 'mensal',
  whatsapp_message_sent boolean not null default false,
  whatsapp_sent_at timestamptz,
  last_reminder_at timestamptz,
  stripe_checkout_session_id text,
  created_at timestamptz default now()
);

-- 8. TRANSACTIONS (Histórico de Transações)
create table if not exists public.transactions(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  charge_id uuid references public.charges(id) on delete set null,
  amount numeric(12,2) not null,
  type text not null,
  status text not null,
  provider text,
  provider_id text,
  created_at timestamptz default now()
);

-- 9. WHATSAPP_INSTANCES (Instâncias Z-API)
create table if not exists public.whatsapp_instances(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null default 'WhatsApp Principal',
  provider text not null default 'zapi',
  instance_id text not null,
  token text,
  client_token text,
  status text not null default 'disconnected',
  phone text,
  qr_code text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(organization_id),
  unique(instance_id)
);

-- 10. PAYMENT_INTEGRATIONS (Integrações com Gateways)
create table if not exists public.payment_integrations(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  provider text not null,
  account_id text,
  publishable_key text,
  status text not null default 'inactive',
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(organization_id, provider)
);

-- 11. PAYMENT_PROVIDER_TOKENS (Tokens seguros de gateways)
create table if not exists public.payment_provider_tokens(
  integration_id uuid primary key references public.payment_integrations(id) on delete cascade,
  access_token text not null,
  refresh_token text,
  token_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 12. OAUTH_STATES
create table if not exists public.oauth_states(
  state text primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  code_verifier text,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

-- 13. BILLING_SUBSCRIPTIONS (Assinaturas da plataforma)
create table if not exists public.billing_subscriptions(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  plan_code text default 'trial',
  status text default 'trialing',
  current_period_end timestamptz,
  cancel_at_period_end boolean default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 14. SUGGESTIONS
create table if not exists public.suggestions(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  category text default 'geral',
  status text not null default 'pending',
  admin_response text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 15. ADMIN_AUDIT_LOGS
create table if not exists public.admin_audit_logs(
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  target_type text,
  target_id text,
  details jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- ==============================================================================
-- ÍNDICES DE PERFORMANCE
-- ==============================================================================
create index if not exists idx_organization_members_user on public.organization_members(user_id);
create index if not exists idx_customers_org on public.customers(organization_id);
create index if not exists idx_charges_org on public.charges(organization_id);
create index if not exists idx_charges_customer on public.charges(customer_id);
create index if not exists idx_charges_status on public.charges(status, due_date);
create index if not exists idx_transactions_org on public.transactions(organization_id);
create index if not exists idx_plan_categories_org on public.plan_categories(organization_id);
create index if not exists idx_plans_org on public.plans(organization_id);
create index if not exists idx_plans_category on public.plans(category_id);
create index if not exists idx_whatsapp_instances_org on public.whatsapp_instances(organization_id);

-- ==============================================================================
-- FUNÇÕES DE SEGURANÇA E AUXILIARES
-- ==============================================================================
create or replace function public.is_org_member(target_org uuid) returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.organization_members where organization_id=target_org and user_id=auth.uid());
$$;

revoke all on function public.is_org_member(uuid) from public;
grant execute on function public.is_org_member(uuid) to authenticated, service_role;

-- TRIGGER DE NOVO USUÁRIO (Cria perfil, organização com trial e membro proprietário)
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
declare
  new_org uuid;
begin
  insert into public.profiles(id, full_name, phone, is_admin)
  values(
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'phone',
    false
  )
  on conflict(id) do update set
    full_name = excluded.full_name,
    phone = excluded.phone;

  insert into public.organizations(
    name,
    owner_id,
    access_status,
    trial_ends_at,
    subscription_plan_code,
    subscription_status
  )
  values(
    coalesce(nullif(new.raw_user_meta_data->>'organization_name',''),'Minha empresa'),
    new.id,
    'trial',
    now() + interval '7 days',
    'trial',
    'trialing'
  )
  returning id into new_org;

  insert into public.organization_members(organization_id, user_id, role)
  values(new_org, new.id, 'owner')
  on conflict do nothing;

  return new;
end;
$$;

revoke all on function public.handle_new_user() from public;
grant execute on function public.handle_new_user() to service_role;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) E POLICIES
-- ==============================================================================
alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.customers enable row level security;
alter table public.charges enable row level security;
alter table public.transactions enable row level security;
alter table public.whatsapp_instances enable row level security;
alter table public.plan_categories enable row level security;
alter table public.plans enable row level security;
alter table public.payment_integrations enable row level security;
alter table public.payment_provider_tokens enable row level security;
alter table public.oauth_states enable row level security;
alter table public.billing_subscriptions enable row level security;
alter table public.suggestions enable row level security;
alter table public.admin_audit_logs enable row level security;

-- Profiles
drop policy if exists "profile own" on public.profiles;
create policy "profile own" on public.profiles for all using(auth.uid()=id) with check(auth.uid()=id);

-- Organizations
drop policy if exists "org owner" on public.organizations;
create policy "org owner" on public.organizations for all using(owner_id=auth.uid() or public.is_org_member(id)) with check(owner_id=auth.uid());

-- Organization Members
drop policy if exists "member own organizations" on public.organization_members;
create policy "member own organizations" on public.organization_members for select to authenticated using(user_id=auth.uid());

-- Customers
drop policy if exists "customers org members" on public.customers;
create policy "customers org members" on public.customers for all to authenticated using(public.is_org_member(organization_id)) with check(public.is_org_member(organization_id));

-- Charges
drop policy if exists "charges org members" on public.charges;
create policy "charges org members" on public.charges for all to authenticated using(public.is_org_member(organization_id)) with check(public.is_org_member(organization_id));

-- Transactions
drop policy if exists "transactions org members" on public.transactions;
create policy "transactions org members" on public.transactions for all to authenticated using(public.is_org_member(organization_id)) with check(public.is_org_member(organization_id));

-- WhatsApp Instances
drop policy if exists "whatsapp org members" on public.whatsapp_instances;
create policy "whatsapp org members" on public.whatsapp_instances for all to authenticated using(public.is_org_member(organization_id)) with check(public.is_org_member(organization_id));

-- Plan Categories
drop policy if exists "plan categories org members" on public.plan_categories;
create policy "plan categories org members" on public.plan_categories for all to authenticated using(public.is_org_member(organization_id)) with check(public.is_org_member(organization_id));

-- Plans
drop policy if exists "plans org members" on public.plans;
create policy "plans org members" on public.plans for all to authenticated using(public.is_org_member(organization_id)) with check(public.is_org_member(organization_id));

-- Payment Integrations
drop policy if exists "payment integrations org members" on public.payment_integrations;
create policy "payment integrations org members" on public.payment_integrations for all to authenticated using(public.is_org_member(organization_id)) with check(public.is_org_member(organization_id));

-- Suggestions
drop policy if exists "suggestions org members" on public.suggestions;
create policy "suggestions org members" on public.suggestions for all to authenticated using(public.is_org_member(organization_id)) with check(public.is_org_member(organization_id));

-- Admin and service role tables
revoke all on public.payment_provider_tokens from anon, authenticated;
grant select, insert, update, delete on public.payment_provider_tokens to service_role;

revoke all on public.oauth_states from anon, authenticated;
grant select, insert, update, delete on public.oauth_states to service_role;

revoke all on public.admin_audit_logs from anon, authenticated;
grant select, insert, update, delete on public.admin_audit_logs to service_role;
