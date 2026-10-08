-- Preparação do CloudZap para Z-API.
-- A instância é criada/configurada no painel da Z-API.
-- As credenciais ficam no servidor/Vercel e não no frontend.

alter table if exists public.whatsapp_instances
  add column if not exists provider text;

update public.whatsapp_instances
set provider = coalesce(provider, 'papi')
where provider is null;
