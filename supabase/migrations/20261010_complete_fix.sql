-- ==============================================================================
-- MIGRATION: AJUSTE COMPLETO DO BANCO DE DADOS (SUPABASE)
-- Execute este script no SQL Editor do seu projeto Supabase existente.
-- ==============================================================================

-- 1. PROFILES
alter table public.profiles add column if not exists is_admin boolean default false;

-- 2. ORGANIZATIONS
alter table public.organizations add column if not exists access_status text not null default 'trial';
alter table public.organizations add column if not exists trial_ends_at timestamptz default (now() + interval '7 days');
alter table public.organizations add column if not exists subscription_plan_code text default 'trial';
alter table public.organizations add column if not exists subscription_status text default 'trialing';
alter table public.organizations add column if not exists activated_at timestamptz;

-- Atualiza organizações existentes que estavam com trial_ends_at nulo
update public.organizations
set access_status = 'trial', trial_ends_at = now() + interval '30 days'
where access_status is null or trial_ends_at is null;

-- 3. CUSTOMERS
alter table public.customers add column if not exists status text not null default 'active';
alter table public.customers add column if not exists plan_id uuid references public.plans(id) on delete set null;
alter table public.customers add column if not exists category_id uuid references public.plan_categories(id) on delete set null;
alter table public.customers add column if not exists description text;
alter table public.customers add column if not exists username text;
alter table public.customers add column if not exists due_date date;
alter table public.customers add column if not exists automatic_message boolean not null default true;
alter table public.customers add column if not exists product text;

-- 4. CHARGES
alter table public.charges add column if not exists payment_method text default 'pix';
alter table public.charges add column if not exists paid_at timestamptz;
alter table public.charges add column if not exists pix_code text;
alter table public.charges add column if not exists pix_qr_code text;
alter table public.charges add column if not exists billing_cycle text default 'mensal';
alter table public.charges add column if not exists whatsapp_message_sent boolean not null default false;
alter table public.charges add column if not exists whatsapp_sent_at timestamptz;
alter table public.charges add column if not exists last_reminder_at timestamptz;

-- 5. WHATSAPP_INSTANCES
alter table public.whatsapp_instances add column if not exists name text not null default 'WhatsApp Principal';
alter table public.whatsapp_instances add column if not exists token text;
alter table public.whatsapp_instances add column if not exists client_token text;
alter table public.whatsapp_instances alter column provider set default 'zapi';

-- 6. TABELAS ADICIONAIS
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

create table if not exists public.payment_provider_tokens(
  integration_id uuid primary key references public.payment_integrations(id) on delete cascade,
  access_token text not null,
  refresh_token text,
  token_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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

create table if not exists public.admin_audit_logs(
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  target_type text,
  target_id text,
  details jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- 7. RECRIAÇÃO DO TRIGGER DE NOVO USUÁRIO
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

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 8. POLÍTICA DE LEITURA PARA MEMBROS DA ORGANIZAÇÃO
drop policy if exists "org owner" on public.organizations;
create policy "org owner" on public.organizations
  for all using(owner_id = auth.uid() or public.is_org_member(id))
  with check(owner_id = auth.uid());
