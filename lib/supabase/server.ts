import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://yfssdwvbghxyeqqhofal.supabase.co";

const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "sb_publishable_byunObufi15FArLjOh9-Cg_BLij9JCb";

export async function createClient() {
  if (!supabaseUrl || !supabasePublishableKey) {
    throw new Error("Configuração pública do Supabase ausente.");
  }

  const store = await cookies();

  return createServerClient(supabaseUrl, supabasePublishableKey, {
    cookies: {
      getAll() {
        return store.getAll();
      },
      setAll(values) {
        try {
          values.forEach(({ name, value, options }) => {
            store.set(name, value, options);
          });
        } catch {
          // Server Components podem não permitir escrita de cookies.
        }
      },
    },
  });
}
