import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://yfssdwvbghxyeqqhofal.supabase.co";

const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "sb_publishable_byunObufi15FArLjOh9-Cg_BLij9JCb";

export function createClient() {
  if (!supabaseUrl || !supabasePublishableKey) {
    throw new Error("Configuração do Supabase ausente.");
  }

  return createBrowserClient(supabaseUrl, supabasePublishableKey);
}
