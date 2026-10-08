import { createClient as supabaseCreateClient } from "@supabase/supabase-js";

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL não configurada");
  }

  if (!key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY não configurada");
  }

  return supabaseCreateClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// Aliases mantidos para compatibilidade com rotas administrativas existentes.
export const createAdminSupabaseClient = createAdminClient;
export const createClient = createAdminClient;
