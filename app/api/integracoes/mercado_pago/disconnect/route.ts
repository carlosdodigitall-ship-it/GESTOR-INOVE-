import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sessão expirada." }, { status: 401 });

  const { data: member } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!member) return NextResponse.json({ error: "Organização não encontrada." }, { status: 400 });

  const admin = createAdminSupabaseClient();
  const { data: integration } = await admin
    .from("payment_integrations")
    .select("id")
    .eq("organization_id", member.organization_id)
    .eq("provider", "mercado_pago")
    .maybeSingle();

  if (integration) {
    await admin.from("payment_integrations").delete().eq("id", integration.id);
  }

  return NextResponse.json({ disconnected: true });
}
